"""Verify the UI SDK workbench, agent contract and optional refraction renderer.

Run against a production preview. This is scripted evidence, not a human study.
"""

import argparse
import asyncio
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from urllib.parse import urlparse

from glass_agent_contract import verify_agent_contract
from glass_optics_contract import verify_optics_contract

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "packages/liquid-glass/component-manifest.json"


async def run(args):
    from playwright.async_api import async_playwright, expect

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    components = manifest["components"]
    expected_ids = sorted(item["id"] for item in components)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    report = {
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "baseUrl": args.base_url,
        "sdkVersion": manifest["sdkVersion"],
        "upstreamCommit": manifest["upstreamCommit"],
        "scope": "Scripted component, agent, keyboard, preference and rendering checks; not human usability or conformance evidence.",
        "checks": [],
    }
    page_errors, console_errors = [], []
    async with async_playwright() as playwright:
        launch = {"headless": True}
        if args.executable:
            launch["executable_path"] = args.executable
        if args.software_gpu:
            assert urlparse(args.base_url).hostname in {"127.0.0.1", "localhost", "::1"}, "Software GPU verification is limited to the local reviewed build"
            launch["args"] = ["--enable-unsafe-webgpu", "--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--use-vulkan=swiftshader", "--enable-features=Vulkan"]
        browser = await playwright.chromium.launch(**launch)
        report["browser"] = browser.version
        report["softwareGpuRequested"] = args.software_gpu
        context = await browser.new_context(viewport={"width": 1440, "height": 1000})
        if args.software_gpu:
            origin = urlparse(args.base_url).netloc
            await context.route("**/*", lambda route: route.continue_() if urlparse(route.request.url).netloc == origin else route.abort())
        page = await context.new_page()
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
        page.set_default_timeout(8000)

        async def record(name, operation):
            try:
                detail = await operation()
                report["checks"].append({"name": name, "passed": True, "detail": detail})
            except Exception as error:
                report["checks"].append({"name": name, "passed": False, "error": str(error)})

        async def choose(component_id):
            await page.locator(f"[data-catalogue-id='{component_id}']").click()
            await expect(page.locator("[data-component-id]")).to_have_count(1)
            await expect(page.locator(f"[data-component-id='{component_id}']")).to_be_visible()

        async def initial():
            response = await page.goto(args.base_url, wait_until="networkidle")
            assert response and response.ok
            await expect(page.locator("[data-catalogue-id]")).to_have_count(55)
            await expect(page.locator("[data-component-id]")).to_have_count(1)
            await expect(page.get_by_role("radio", name="UI SDK default", exact=True)).to_be_checked()
            assert await page.locator("html").get_attribute("data-qg-material-enabled") != "true"
            await expect(page.locator(".agent-inspector-stats")).to_contain_text("Named")
            return {"catalogue": 55, "mountedSpecimens": 1, "default": "UI SDK"}

        await record("upstream_default_and_single_specimen", initial)
        await record("real_sdk_agent_contract", lambda: verify_agent_contract(page, expect))

        async def all_components():
            await page.goto(args.base_url, wait_until="networkidle")
            actual = sorted(await page.locator("[data-catalogue-id]").evaluate_all("nodes => nodes.map(node => node.dataset.catalogueId)"))
            assert actual == expected_ids
            unnamed = []
            for item in components:
                await choose(item["id"])
                await expect(page.locator(".demo-error")).to_have_count(0)
                entries = await page.evaluate("window.quantitativeHciAgent.snapshot().filter(entry => !entry.offPage && entry.component !== 'more')")
                unnamed.extend({"specimen": item["id"], "component": entry["component"], "ref": entry["ref"]} for entry in entries if not entry.get("label", "").strip())
            assert not unnamed, f"SDK components lack names: {json.dumps(unnamed)}"
            return {"familiesOpened": len(components), "unnamed": unnamed}

        await record("all_55_families_render_and_have_agent_names", all_components)

        async def filtering():
            search = page.get_by_label("Search components", exact=True)
            await search.fill("password")
            await expect(page.locator("[data-catalogue-id]")).to_have_count(1)
            await expect(page.locator("[data-component-id='password-input']")).to_be_visible()
            await search.fill("no-component-matches-this-query")
            await expect(page.locator("[data-component-id]")).to_have_count(0)
            await expect(page.get_by_role("heading", name="No matching components", exact=True)).to_be_visible()
            await search.fill("")
            await page.get_by_role("combobox", name="Component category", exact=True).click()
            await page.get_by_role("option", name="Overlays", exact=True).click()
            await expect(page.locator("[data-catalogue-id]")).to_have_count(sum(item["category"] == "Overlays" for item in components))
            await page.get_by_role("combobox", name="Component category", exact=True).click()
            await page.get_by_role("option", name="All categories", exact=True).click()
            return {"search": "password", "category": "Overlays", "emptyState": True}

        await record("search_category_and_empty_state", filtering)

        async def keyboard():
            await choose("slider")
            slider = page.locator(".component-stage").get_by_role("slider")
            before = float(await slider.input_value())
            await slider.focus()
            await slider.press("ArrowRight")
            assert float(await slider.input_value()) > before
            await choose("select")
            trigger = page.locator(".component-stage [data-slot='select-trigger']")
            await trigger.focus()
            await trigger.press("ArrowDown")
            await expect(trigger).to_have_attribute("aria-expanded", "true")
            await page.keyboard.press("End")
            await page.keyboard.press("Enter")
            await expect(trigger).to_contain_text("Solid surface")
            await choose("dialog")
            trigger = page.locator(".component-stage [data-slot='dialog-trigger']")
            await trigger.click()
            dialog = page.get_by_role("dialog", name="Save your material", exact=True)
            await expect(dialog).to_be_visible()
            assert await dialog.evaluate("node => node.contains(document.activeElement)")
            await page.keyboard.press("Escape")
            await expect(dialog).not_to_be_visible()
            await expect(trigger).to_be_focused()
            return {"sliderArrow": True, "selectKeyboard": True, "dialogEscapeAndFocus": True}

        await record("keyboard_selection_and_dialog_focus", keyboard)

        async def material():
            await choose("button")
            await page.get_by_role("radio", name="Frosted CSS", exact=True).check()
            root = page.locator("html")
            await expect(root).to_have_attribute("data-qg-material-enabled", "true")
            primary = page.locator(".component-stage [data-variant='solid']")
            primary_colours = await primary.evaluate("node => ({background: getComputedStyle(node).backgroundColor, color: getComputedStyle(node).color})")
            assert primary_colours["background"] != "rgba(0, 0, 0, 0)"
            assert primary_colours["background"] != primary_colours["color"]
            await page.get_by_role("button", name="Appearance settings", exact=True).click()
            settings = page.get_by_role("dialog", name="Frosted appearance settings", exact=True)
            await settings.get_by_role("combobox", name="Appearance", exact=True).click()
            await page.get_by_role("option", name="Dark", exact=True).click()
            await settings.get_by_role("combobox", name="Frosted material", exact=True).click()
            await page.get_by_role("option", name="Solid", exact=True).click()
            await settings.get_by_role("switch", name="Reduce motion", exact=True).check()
            await settings.get_by_role("switch", name="Increase contrast", exact=True).check()
            for name, value in [("theme", "dark"), ("material", "solid"), ("motion", "reduced"), ("contrast", "more")]:
                await expect(root).to_have_attribute(f"data-qg-{name}", value)
            await page.keyboard.press("Escape")
            blur = await primary.evaluate("node => getComputedStyle(node).backdropFilter")
            assert blur in ("none", "blur(0px)")
            await page.reload(wait_until="networkidle")
            assert await root.get_attribute("data-qg-material-enabled") != "true", "Optional material must not become the next session's default"
            await page.get_by_role("radio", name="Frosted CSS", exact=True).check()
            await expect(root).to_have_attribute("data-qg-material", "solid")
            await expect(root).to_have_attribute("data-qg-theme", "dark")
            await page.get_by_role("radio", name="UI SDK default", exact=True).check()
            assert await root.get_attribute("data-qg-material-enabled") != "true"
            return {"primaryColours": primary_colours, "solidBlur": blur, "preferencesPersist": True, "themeOptIn": True}

        await record("optional_material_semantics_preferences_and_cleanup", material)

        async def mobile():
            await page.set_viewport_size({"width": 390, "height": 844})
            await page.get_by_label("Search components", exact=True).fill("dialog")
            await choose("dialog")
            dimensions = await page.evaluate("({width: innerWidth, scroll: document.documentElement.scrollWidth})")
            assert dimensions["scroll"] <= dimensions["width"] + 1, dimensions
            await page.screenshot(path=str(output.parent / "workbench-mobile.png"), full_page=True)
            await page.get_by_label("Search components", exact=True).fill("")
            await page.set_viewport_size({"width": 1440, "height": 1000})
            return dimensions

        await record("mobile_workbench_layout", mobile)

        async def preferences():
            await page.emulate_media(reduced_motion="reduce", forced_colors="active")
            await page.get_by_role("radio", name="Frosted CSS", exact=True).check()
            root = page.locator("html")
            await expect(root).to_have_attribute("data-qg-material", "solid")
            await expect(root).to_have_attribute("data-qg-contrast", "more")
            await expect(root).to_have_attribute("data-qg-motion", "reduced")
            await choose("button")
            button = page.locator(".component-stage [data-variant='solid']")
            await button.focus()
            style = await button.evaluate("node => ({filter: getComputedStyle(node).backdropFilter, outline: getComputedStyle(node).outlineStyle})")
            assert style["filter"] in ("none", "blur(0px)") and style["outline"] != "none"
            await page.emulate_media(reduced_motion="no-preference", forced_colors="none")
            await page.get_by_role("radio", name="UI SDK default", exact=True).check()
            return style

        await record("forced_colours_and_reduced_motion", preferences)

        async def optics():
            result = await verify_optics_contract(page, expect, output_dir=output.parent, require_gpu=args.software_gpu)
            return result

        await record("reference_refraction_and_live_sdk_controls", optics)
        await page.get_by_role("radio", name="Components", exact=True).check()
        await choose("select")
        await page.screenshot(path=str(output.parent / "workbench-desktop.png"), full_page=True)
        report["checks"].append({"name": "uncaught_page_errors", "passed": not page_errors, "errors": page_errors})
        report["checks"].append({"name": "console_errors", "passed": not console_errors, "errors": console_errors})
        await context.close()
        await browser.close()

    report["passed"] = all(item["passed"] for item in report["checks"])
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    for item in report["checks"]:
        print(f"{'PASS' if item['passed'] else 'FAIL'} {item['name']}")
        if not item["passed"]:
            print(item.get("error", item.get("errors")))
    print(f"Browser: {report['browser']}; report: {output}")
    return 0 if report["passed"] else 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:4185/")
    parser.add_argument("--output", default="test-results/liquid-glass.json")
    parser.add_argument("--executable", default=None)
    parser.add_argument("--software-gpu", action="store_true", help="Opt in to software WebGPU for a reviewed loopback build only")
    return asyncio.run(run(parser.parse_args()))


if __name__ == "__main__":
    sys.exit(main())
