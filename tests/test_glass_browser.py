"""Exercise the production Liquid Glass gallery; run explicitly, not via unittest.

Start the production preview on port 4185. This suite tests observable outcomes
against the component manifest and writes a bounded machine-readable report.
It does not establish WCAG conformance or human usability gains.
"""

import argparse
import asyncio
from datetime import datetime, timezone
import json
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "packages/liquid-glass/component-manifest.json"


async def run(args):
    from playwright.async_api import async_playwright, expect

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    expected_ids = sorted(item["id"] for item in manifest["components"])
    report = {
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "baseUrl": args.base_url,
        "sdkVersion": manifest["sdkVersion"],
        "upstreamCommit": manifest["upstreamCommit"],
        "scope": "Scripted functional and preference checks; not a human study or conformance audit.",
        "checks": [],
    }
    page_errors = []
    console_errors = []

    async with async_playwright() as playwright:
        launch = {"headless": True}
        if args.executable:
            launch["executable_path"] = args.executable
        browser = await playwright.chromium.launch(**launch)
        report["browser"] = browser.version
        context = await browser.new_context(viewport={"width": 1440, "height": 1000})
        page = await context.new_page()
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
        page.set_default_timeout(7000)

        async def record(name, operation):
            try:
                detail = await operation()
                report["checks"].append({"name": name, "passed": True, "detail": detail})
            except Exception as error:
                report["checks"].append({"name": name, "passed": False, "error": str(error)})

        async def open_gallery():
            response = await page.goto(args.base_url, wait_until="networkidle")
            assert response and response.ok, "Gallery returned an unsuccessful response"
            await expect(page.locator("[data-component-id]")).to_have_count(len(expected_ids))
            actual = sorted(await page.locator("[data-component-id]").evaluate_all(
                "nodes => nodes.map(node => node.dataset.componentId)"
            ))
            assert actual == expected_ids, f"Rendered IDs differ from manifest: {actual}"
            await expect(page.locator(".demo-error")).to_have_count(0)
            await expect(page.get_by_text("Missing component:", exact=False)).to_have_count(0)
            return {"components": len(actual), "viewport": {"width": 1440, "height": 1000}}

        await record("all_manifest_components_render", open_gallery)

        async def search_and_filter():
            search = page.get_by_label("Search components", exact=True)
            await search.fill("password")
            await expect(page.locator("[data-component-id]")).to_have_count(1)
            await expect(page.locator("[data-component-id='password-input']")).to_be_visible()
            await search.fill("no-component-matches-this-query")
            await expect(page.locator("[data-component-id]")).to_have_count(0)
            await expect(page.get_by_role("heading", name="No matching components", exact=True)).to_be_visible()
            await search.fill("")
            await expect(page.locator("[data-component-id]")).to_have_count(len(expected_ids))
            category = page.locator("button[data-category]:not([data-category='all'])").first
            category_name = await category.get_attribute("data-category")
            await category.click()
            category_ids = sorted(item["id"] for item in manifest["components"] if item["category"] == category_name)
            assert 0 < len(category_ids) < len(expected_ids), "Category must contain a proper subset of the catalogue"
            await expect(page.locator("[data-component-id]")).to_have_count(len(category_ids))
            filtered_ids = sorted(await page.locator("[data-component-id]").evaluate_all(
                "nodes => nodes.map(node => node.dataset.componentId)"
            ))
            assert filtered_ids == category_ids, f"Category rendered incorrect components: {filtered_ids}"
            await page.locator("button[data-category='all']").click()
            await expect(page.locator("[data-component-id]")).to_have_count(len(expected_ids))
            return {"searched": "password-input", "category": category_name, "categoryCount": len(filtered_ids)}

        await record("catalogue_search_empty_and_category", search_and_filter)

        async def switch_changes():
            specimen = page.locator("[data-component-id='switch'] .component-stage")
            control = specimen.get_by_role("switch", name="Ambient light", exact=True)
            before = await control.get_attribute("aria-checked")
            assert before in ("true", "false"), f"Switch is missing a valid checked state: {before}"
            await control.click()
            await expect(control).to_have_attribute("aria-checked", "false" if before == "true" else "true")
            await expect(specimen.get_by_role("switch", name="Locked setting", exact=True)).to_be_disabled()
            return {"before": before, "after": await control.get_attribute("aria-checked")}

        await record("switch_updates_checked_state", switch_changes)

        async def slider_keyboard():
            slider = page.locator("[data-component-id='slider'] .component-stage").get_by_role("slider")
            await slider.focus()
            native_range = await slider.evaluate("node => node instanceof HTMLInputElement && node.type === 'range'")
            before = await slider.input_value() if native_range else await slider.get_attribute("aria-valuenow")
            assert before is not None, "Slider is missing its native value or aria-valuenow"
            await slider.press("ArrowRight")
            if native_range:
                await expect(slider).not_to_have_value(before)
            else:
                await expect(slider).not_to_have_attribute("aria-valuenow", before)
            after = await slider.input_value() if native_range else await slider.get_attribute("aria-valuenow")
            assert after is not None and float(after) > float(before), "Right arrow did not increase the slider value"
            return {"semantics": "native-range" if native_range else "aria-slider", "before": before, "after": after}

        await record("slider_keyboard_changes_value", slider_keyboard)

        async def select_keyboard():
            specimen = page.locator("[data-component-id='select'] .component-stage")
            trigger = specimen.locator("[data-slot='select-trigger']")
            before = await trigger.inner_text()
            await trigger.focus()
            await trigger.press("ArrowDown")
            await expect(trigger).to_have_attribute("aria-expanded", "true")
            popup_id = await trigger.get_attribute("aria-controls")
            assert popup_id, "Select does not identify its controlled popup"
            popup = page.locator(f"[id={json.dumps(popup_id)}]")
            await expect(popup.get_by_role("option", name="Solid surface", exact=True)).to_be_visible()
            await page.keyboard.press("End")
            await page.keyboard.press("Enter")
            await expect(trigger).to_have_attribute("aria-expanded", "false")
            await expect(trigger).to_contain_text("Solid surface")
            return {"before": before, "after": await trigger.inner_text()}

        await record("select_keyboard_commits_selection", select_keyboard)

        async def dialog_keyboard():
            trigger = page.locator("[data-component-id='dialog'] .component-stage [data-slot='dialog-trigger']")
            await expect(trigger).to_have_accessible_name("Save a preset")
            await trigger.click()
            dialog = page.get_by_role("dialog", name="Save your material", exact=True)
            await expect(dialog).to_be_visible()
            assert await dialog.evaluate("node => node.contains(document.activeElement)"), "Focus did not enter dialog"
            await page.keyboard.press("Escape")
            await expect(dialog).not_to_be_visible()
            await expect(trigger).to_be_focused()
            return {"dismissedWithEscape": True, "focusRestored": True}

        await record("dialog_escape_and_focus_restoration", dialog_keyboard)

        async def preferences_persist():
            await page.get_by_role("button", name="Material settings", exact=True).click()
            settings = page.get_by_role("dialog", name="Material settings", exact=True)
            await settings.get_by_label("Appearance", exact=True).select_option("dark")
            await settings.get_by_label("Material", exact=True).select_option("solid")
            for name in ["Reduce motion", "Increase contrast"]:
                control = settings.get_by_role("switch", name=name, exact=True)
                if await control.get_attribute("aria-checked") != "true":
                    await control.click()
            root = page.locator("html")
            for name, value in [("theme", "dark"), ("material", "solid"), ("motion", "reduced"), ("contrast", "more")]:
                await expect(root).to_have_attribute(f"data-qg-{name}", value)
            stored = await page.evaluate("localStorage.getItem('qg.preferences.v1')")
            assert stored, "Preferences were not persisted"
            preferences = json.loads(stored)
            for name, value in [("theme", "dark"), ("material", "solid"), ("reduceMotion", True), ("increaseContrast", True)]:
                assert preferences.get(name) == value, f"Requested {name} was not persisted: {preferences}"
            await page.reload(wait_until="networkidle")
            for name, value in [("theme", "dark"), ("material", "solid"), ("motion", "reduced"), ("contrast", "more")]:
                await expect(root).to_have_attribute(f"data-qg-{name}", value)
            control = page.locator("[data-component-id='button'] [data-slot='button']").first
            await control.scroll_into_view_if_needed()
            blur = await control.evaluate("node => getComputedStyle(node).backdropFilter")
            assert blur in ("none", "blur(0px)"), f"Solid mode retained backdrop filtering: {blur}"
            return {"storedPreferences": preferences, "solidBackdropFilter": blur}

        await record("display_preferences_persist_and_solid_removes_blur", preferences_persist)

        async def narrow_viewport():
            await page.set_viewport_size({"width": 390, "height": 844})
            await page.evaluate("window.scrollTo(0, 0)")
            await expect(page.get_by_label("Search components", exact=True)).to_be_visible()
            dimensions = await page.evaluate("({width: innerWidth, scroll: document.documentElement.scrollWidth})")
            assert dimensions["scroll"] <= dimensions["width"] + 1, f"Horizontal overflow: {dimensions}"
            search = page.get_by_label("Search components", exact=True)
            await search.fill("dialog")
            await expect(page.locator("[data-component-id='dialog']")).to_be_visible()
            await search.fill("")
            await expect(page.locator("[data-component-id]")).to_have_count(len(expected_ids))
            return dimensions

        await record("mobile_layout_and_search", narrow_viewport)

        async def system_preferences():
            system_context = await browser.new_context(
                viewport={"width": 1024, "height": 900}, reduced_motion="reduce", color_scheme="dark"
            )
            system_page = await system_context.new_page()
            system_page.on("pageerror", lambda error: page_errors.append(str(error)))
            system_page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
            await system_page.goto(args.base_url, wait_until="networkidle")
            await expect(system_page.locator("html")).to_have_attribute("data-qg-motion", "reduced")
            await system_page.get_by_role("button", name="Material settings", exact=True).click()
            settings = system_page.get_by_role("dialog", name="Material settings", exact=True)
            await settings.get_by_label("Appearance", exact=True).select_option("system")
            await expect(system_page.locator("html")).to_have_attribute("data-qg-theme", "dark")
            await system_page.keyboard.press("Escape")
            await system_page.emulate_media(forced_colors="active")
            await expect(system_page.locator("html")).to_have_attribute("data-qg-material", "solid")
            await expect(system_page.locator("html")).to_have_attribute("data-qg-contrast", "more")
            button = system_page.locator("[data-component-id='button'] [data-slot='button']").first
            await button.scroll_into_view_if_needed()
            await button.focus()
            await expect(button).to_be_focused()
            rendered = await button.evaluate("node => ({filter:getComputedStyle(node).backdropFilter, outline:getComputedStyle(node).outlineStyle, color:getComputedStyle(node).color})")
            assert rendered["filter"] in ("none", "blur(0px)"), f"Forced colours retained blur: {rendered}"
            assert rendered["outline"] != "none", f"Forced colours hid keyboard focus: {rendered}"
            await system_context.close()
            return rendered

        await record("system_reduced_motion_dark_and_forced_colours", system_preferences)
        report["checks"].append({"name": "uncaught_page_errors", "passed": not page_errors, "errors": page_errors})
        report["checks"].append({"name": "console_errors_including_caught_render_failures", "passed": not console_errors, "errors": console_errors})
        await context.close()
        await browser.close()

    report["passed"] = all(item["passed"] for item in report["checks"])
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
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
    return asyncio.run(run(parser.parse_args()))


if __name__ == "__main__":
    sys.exit(main())
