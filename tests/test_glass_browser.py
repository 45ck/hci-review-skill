"""Verify real Liquid Glass kit controls, SDK actions and WebGPU pixels.

Run against a production preview. Scripted checks are not human-study or
optical-equivalence evidence. Software GPU is limited to a reviewed local build.
"""

import argparse
import asyncio
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import sys
from time import perf_counter
from urllib.parse import urlparse

from glass_agent_contract import verify_agent_contract
from glass_optics_contract import SCREENSHOT_TIMEOUT_MS, verify_optics_contract

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "packages/liquid-glass/component-manifest.json"


async def run(args):
    from playwright.async_api import async_playwright, expect

    started = perf_counter()
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    components = manifest["components"]
    expected_ids = sorted(item["id"] for item in components)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    report = {
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "baseUrl": args.base_url,
        "commit": os.environ.get("GITHUB_SHA"),
        "sdkVersion": manifest["sdkVersion"],
        "upstreamCommit": manifest["upstreamCommit"],
        "scope": "Scripted real-control, agent, keyboard, preference, responsive-layout and GPU pixel evidence; not a human study or optical-equivalence claim.",
        "checks": [],
    }
    page_errors, console_errors = [], []
    async with async_playwright() as playwright:
        launch = {"headless": True}
        if args.executable:
            launch["executable_path"] = args.executable
        if args.software_gpu:
            assert urlparse(args.base_url).hostname in {"127.0.0.1", "localhost", "::1"}, "Software GPU verification requires the reviewed loopback build"
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
        page.set_default_timeout(5000)
        root = page.locator("html")
        response = await page.goto(args.base_url, wait_until="networkidle")
        assert response and response.ok, "Production preview did not return successfully"

        async def choose(component_id):
            await page.locator(f"[data-catalogue-id='{component_id}']").click()
            if component_id == "overview":
                await expect(page.locator("[data-kit-view='overview']")).to_be_visible()
                await expect(page.locator("[data-component-id]")).to_have_count(0)
            else:
                await expect(page.locator("[data-component-id]")).to_have_count(1)
                await expect(page.locator(f"[data-component-id='{component_id}']")).to_be_visible()

        async def reset_overview():
            await page.keyboard.press("Escape")
            await page.keyboard.press("Escape")
            await page.get_by_label("Search components", exact=True).fill("")
            await choose("button")
            await choose("overview")
            await page.evaluate("window.scrollTo(0, 0)")

        async def record(name, operation, *, reset=True, timeout=20):
            check_started = perf_counter()
            try:
                if reset:
                    await reset_overview()
                detail = await asyncio.wait_for(operation(), timeout=timeout)
                result = {"name": name, "passed": True, "detail": detail}
            except Exception as error:
                result = {"name": name, "passed": False, "error": str(error) or type(error).__name__}
            result["durationSeconds"] = round(perf_counter() - check_started, 3)
            report["checks"].append(result)
            output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
            print(f"{'PASS' if result['passed'] else 'FAIL'} {name} ({result['durationSeconds']}s)", flush=True)
            if not result["passed"]:
                print(result["error"], flush=True)

        async def initial():
            await expect(root).to_have_attribute("data-liquid-glass-kit", "true")
            await expect(page.locator("[data-kit-view='overview']")).to_be_visible()
            await expect(page.locator("[data-catalogue-id]")).to_have_count(56)
            await expect(page.locator("[data-component-id]")).to_have_count(0)
            await expect(page.locator(".agent-inspector, .agent-command-console, .reference-lens-stage")).to_have_count(0)
            await expect(page.get_by_role("button", name="Create project", exact=True)).to_be_enabled()
            await expect(page.get_by_label("Project name", exact=True)).to_have_value("Coastal studio")
            await expect(root).to_have_attribute("data-liquid-status", re.compile(r"^(ready|unavailable|error|reduced)$"), timeout=25000)
            status = await root.get_attribute("data-liquid-status")
            assert status != "error", await root.get_attribute("data-liquid-error")
            await page.screenshot(path=str(output.parent / "overview-desktop.png"), animations="disabled", timeout=SCREENSHOT_TIMEOUT_MS)
            return {"catalogueChoices": 56, "families": 55, "default": "Liquid Glass overview", "rendererStatus": status, "screenshot": "overview-desktop.png", "viewport": {"width": 1440, "height": 1000}}

        await record("default_glass_kit_overview", initial, reset=False, timeout=45)
        await record("gpu_on_actual_controls_strength_and_backdrop", lambda: verify_optics_contract(page, expect, output_dir=output.parent, require_gpu=args.software_gpu), reset=False, timeout=45)
        await record("real_sdk_agent_contract", lambda: verify_agent_contract(page, expect), timeout=20)

        async def all_components():
            actual = sorted(await page.locator("[data-catalogue-id]").evaluate_all("nodes => nodes.map(node => node.dataset.catalogueId).filter(id => id !== 'overview')"))
            assert actual == expected_ids, actual
            unnamed = []
            for item in components:
                await choose(item["id"])
                await expect(page.locator(".demo-error")).to_have_count(0)
                entries = await page.evaluate("window.quantitativeHciAgent.snapshot().filter(entry => !entry.offPage && entry.component !== 'more')")
                unnamed.extend({"specimen": item["id"], "component": entry["component"], "ref": entry["ref"]} for entry in entries if not entry.get("label", "").strip())
            assert not unnamed, f"Unnamed SDK entries: {json.dumps(unnamed)}"
            return {"familiesOpened": len(components), "unnamed": unnamed, "oneFamilyMountedAtATime": True}

        await record("all_55_families_render_and_have_agent_names", all_components, timeout=20)

        async def keyboard_and_popup():
            search = page.get_by_label("Search components", exact=True)
            await search.fill("password")
            await expect(page.locator("[data-catalogue-id]")).to_have_count(1)
            await expect(page.locator("[data-component-id='password-input']")).to_be_visible()
            await search.fill("no-component-matches-this-query")
            await expect(page.locator("[data-component-id]")).to_have_count(0)
            await expect(page.get_by_role("heading", name="No matching components", exact=True)).to_be_visible()
            await search.fill("")
            await choose("overview")
            slider = page.get_by_role("slider", name="Volume", exact=True)
            native = await slider.evaluate("node => node instanceof HTMLInputElement")
            before = float(await slider.input_value() if native else await slider.get_attribute("aria-valuenow"))
            await slider.focus()
            await slider.press("ArrowRight")
            after = float(await slider.input_value() if native else await slider.get_attribute("aria-valuenow"))
            assert after > before, "Keyboard arrow did not change Volume"
            trigger = page.get_by_role("combobox", name="Project access", exact=True)
            await trigger.focus()
            await trigger.press("ArrowDown")
            await expect(trigger).to_have_attribute("aria-expanded", "true")
            await page.keyboard.press("End")
            await page.keyboard.press("Enter")
            await expect(trigger).to_contain_text("Public")
            collection = page.get_by_role("button", name="New collection", exact=True)
            await collection.focus()
            await collection.press("Enter")
            dialog = page.get_by_role("dialog", name="Create a collection", exact=True)
            await expect(dialog).to_be_visible()
            assert await dialog.evaluate("node => node.contains(document.activeElement)"), "Focus did not enter the collection dialog"
            gpu = await root.get_attribute("data-liquid-status") == "ready"
            popup_evidence = {"gpuExpected": gpu}
            if gpu:
                await expect(dialog.locator("canvas[data-liquid-canvas='popup']")).to_have_count(1, timeout=5000)
                popup_canvas = dialog.locator("canvas[data-liquid-canvas='popup']")
                await expect(popup_canvas).to_be_visible()
                popup_evidence.update(await popup_canvas.evaluate("""node => ({
                    topLayerHost: Boolean(node.closest(':popover-open,dialog:modal')),
                    pointerEvents: getComputedStyle(node).pointerEvents,
                    ariaHidden: node.getAttribute('aria-hidden')
                })"""))
                assert popup_evidence["topLayerHost"] and popup_evidence["pointerEvents"] == "none" and popup_evidence["ariaHidden"] == "true", popup_evidence
            field = dialog.get_by_label("Collection name", exact=True)
            assert await field.evaluate("""node => {
                const box = node.getBoundingClientRect();
                const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
                return hit === node || node.contains(hit);
            }"""), "The popup renderer covers its live input"
            await page.screenshot(path=str(output.parent / "dialog-desktop.png"), animations="disabled", timeout=SCREENSHOT_TIMEOUT_MS)
            await page.keyboard.press("Escape")
            await expect(dialog).not_to_be_visible()
            await expect(collection).to_be_focused()
            await collection.press("Enter")
            await expect(dialog).to_be_visible()
            await field.fill("Keyboard collection")
            await dialog.get_by_role("button", name="Create collection", exact=True).press("Enter")
            await expect(dialog).not_to_be_visible()
            await expect(page.get_by_label("Collection result", exact=True)).to_have_text("Created Keyboard collection")
            return {"searchAndEmptyState": True, "sliderBefore": before, "sliderAfter": after, "selectKeyboard": True, "dialogEscapeAndFocus": True, "keyboardCreate": True, "popup": popup_evidence, "screenshot": "dialog-desktop.png"}

        await record("keyboard_selection_and_real_popup", keyboard_and_popup, timeout=25)

        async def mobile():
            await page.set_viewport_size({"width": 390, "height": 844})
            await page.evaluate("window.scrollTo(0, 0)")
            await expect(page.locator("[data-kit-view='overview']")).to_be_visible()
            await expect(page.get_by_label("Search components", exact=True)).to_be_visible()
            await expect(page.get_by_role("button", name="Material settings", exact=True)).to_be_visible()
            dimensions = await page.evaluate("({width: innerWidth, scroll: document.documentElement.scrollWidth})")
            assert dimensions["scroll"] <= dimensions["width"] + 1, f"Mobile overview overflows: {dimensions}"
            await page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")
            await page.screenshot(path=str(output.parent / "overview-mobile.png"), animations="disabled", timeout=SCREENSHOT_TIMEOUT_MS)
            catalogue = page.get_by_role("listbox", name="Component catalogue", exact=True)
            assert await catalogue.evaluate("node => node.scrollHeight > node.clientHeight"), "Mobile catalogue should remain scrollable"
            await choose("preferences")
            await choose("overview")
            control = page.get_by_role("switch", name="Notifications", exact=True)
            before = await control.get_attribute("aria-checked")
            await control.click()
            await expect(control).to_have_attribute("aria-checked", "false" if before == "true" else "true")
            await page.set_viewport_size({"width": 1440, "height": 1000})
            await page.evaluate("window.scrollTo(0, 0)")
            return {**dimensions, "viewport": {"width": 390, "height": 844}, "switchUsable": True, "screenshot": "overview-mobile.png"}

        await record("mobile_overview_fits_and_remains_usable", mobile, timeout=20)

        async def preferences():
            status_before = await root.get_attribute("data-liquid-status")
            await page.emulate_media(reduced_motion="reduce", forced_colors="none")
            await page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")
            status_motion = await root.get_attribute("data-liquid-status")
            if status_before == "ready":
                assert status_motion == "ready", "Reduced motion should retain static refraction"
            await page.emulate_media(reduced_motion="reduce", forced_colors="active")
            await expect(root).to_have_attribute("data-liquid-status", "reduced", timeout=5000)
            await expect(page.locator("canvas[data-liquid-canvas='viewport']")).not_to_be_visible()
            button = page.get_by_role("button", name="Create project", exact=True)
            await button.focus()
            await page.keyboard.press("Tab")
            await page.keyboard.press("Shift+Tab")
            await expect(button).to_be_focused()
            style = await button.evaluate("node => ({filter: getComputedStyle(node).backdropFilter, outline: getComputedStyle(node).outlineStyle, focusVisible: node.matches(':focus-visible')})")
            assert style["filter"] in ("none", "blur(0px)") and style["outline"] != "none" and style["focusVisible"], style
            await button.press("Enter")
            await expect(page.get_by_label("Project result", exact=True)).to_have_text("Created Coastal studio")
            return {"reducedMotionStatus": status_motion, "forcedColoursStatus": "reduced", "gpuHidden": True, "keyboardActionPreserved": True, "focus": style}

        await record("static_reduced_motion_and_forced_colour_fallback", preferences, timeout=8)
        report["checks"].append({"name": "uncaught_page_errors", "passed": not page_errors, "errors": page_errors})
        report["checks"].append({"name": "console_errors", "passed": not console_errors, "errors": console_errors})
        await context.close()
        await browser.close()

    report["durationSeconds"] = round(perf_counter() - started, 3)
    report["passed"] = all(item["passed"] for item in report["checks"])
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Browser: {report['browser']}; total: {report['durationSeconds']}s; report: {output}")
    return 0 if report["passed"] else 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:4185/")
    parser.add_argument("--output", default="test-results/liquid-glass.json")
    parser.add_argument("--executable", default=None)
    parser.add_argument("--software-gpu", action="store_true", help="Require software WebGPU for a reviewed loopback build only")
    return asyncio.run(run(parser.parse_args()))


if __name__ == "__main__":
    sys.exit(main())
