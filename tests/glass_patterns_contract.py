"""Accepted state, focus and responsive checks for established SDK compositions."""

from pathlib import Path

from glass_developer_contract import _choices, _named_controls, _page_fits, _select
from glass_optics_contract import SCREENSHOT_TIMEOUT_MS, _act, _call, _entry, browser_stage


async def verify_patterns_contract(page, expect, *, base_url, output_dir):
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    original_viewport = page.viewport_size
    completed = False
    screenshots = []
    await page.goto(base_url, wait_until="networkidle")
    await page.wait_for_function("() => typeof window.quantitativeHciAgent?.snapshot === 'function'")
    await _select(page, "listbox", "Component catalogue", value="patterns")
    stage = page.locator('[data-kit-view="patterns"]')
    result = stage.get_by_label("Library result", exact=True)
    rows = stage.locator(".patterns-work-row")
    search = stage.get_by_label("Search saved work", exact=True)
    palette = page.locator(".qgp-command-dialog")
    trigger = stage.get_by_role("button", name="Search library commands", exact=True)
    await expect(stage).to_be_visible()
    await expect(stage).to_have_attribute("data-validation", "unvalidated")
    named = await _named_controls(page)

    async def capture(name):
        await page.screenshot(path=str(output / name), timeout=SCREENSHOT_TIMEOUT_MS, animations="allow")
        screenshots.append(name)

    async def press_button(label):
        control = await _entry(page, "button", label)
        return await _act(page, control, "press", [])

    async def run_command(label):
        dialog = await _entry(page, "dialog", "Library commands")
        await _act(page, dialog, "setOpen", [True])
        await expect(palette).to_be_visible()
        control = await _entry(page, "command", "Find a library command")
        choices = await _choices(page, control)
        found = [item for item in choices if item.get("label") == label]
        assert len(found) == 1, (label, choices)
        action = "run" if "run" in control["actions"] else "press"
        argument = found[0]["value"] if action == "run" else label
        await _act(page, control, action, [argument])
        return {"label": label, "action": action, "choices": [item.get("label") for item in choices]}

    try:
        browser_stage("patterns: keyboard palette uses SDK search and restores focus")
        await trigger.focus()
        await trigger.press("Enter")
        await expect(palette).to_be_visible()
        palette_search = palette.get_by_label("Find a library command", exact=True)
        await expect(palette_search).to_be_focused()
        await palette_search.fill("Show draft work")
        await palette_search.press("Enter")
        await expect(palette).not_to_be_visible()
        await expect(rows).to_have_count(2)
        await expect(trigger).to_be_focused()
        await trigger.press("Enter")
        await expect(palette).to_be_visible()
        await palette_search.fill("")
        await page.keyboard.press("Escape")
        await expect(palette).not_to_be_visible()
        await expect(trigger).to_be_focused()

        browser_stage("patterns: command agent discovers choices and changes host filters")
        command = await run_command("Show ready work")
        await expect(palette).not_to_be_visible()
        await expect(rows).to_have_count(3)
        assert await rows.evaluate_all("nodes => nodes.every(node => node.dataset.workStatus === 'ready')")
        dialog = await _entry(page, "dialog", "Library commands")
        await _act(page, dialog, "setOpen", [True])
        control = await _entry(page, "command", "Find a library command")
        choices = await _choices(page, control)
        disabled = next(item for item in choices if item.get("label") == "Publish library online")
        action = "run" if "run" in control["actions"] else "press"
        argument = disabled["value"] if action == "run" else disabled["label"]
        before_disabled = await result.inner_text()
        refusal = await _call(page, "act", {"steps": [{"ref": control["ref"], "action": action, "args": [argument]}]})
        await expect(result).to_have_text(before_disabled)
        await expect(palette).to_be_visible()
        await page.keyboard.press("Escape")

        browser_stage("patterns: query and multi-facet filters share cancellable state")
        await press_button("Clear work filters")
        await expect(rows).to_have_count(6)
        query_control = await _entry(page, "input", "Search saved work")
        await _act(page, query_control, "setValue", ["Coastal"])
        await expect(search).to_have_value("Coastal")
        await expect(rows).to_have_count(1)
        await expect(result).to_have_attribute("data-last-source", "agent")
        query_control = await _entry(page, "input", "Search saved work")
        cancelled = await _act(page, query_control, "setValue", ["x" * 81])
        await expect(search).to_have_value("Coastal")
        await expect(rows).to_have_count(1)
        await expect(result).to_contain_text("Search was not changed")
        await press_button("Clear work filters")
        facet = await _entry(page, "select", "Work status")
        facet_choices = await _choices(page, facet)
        assert {item["value"] for item in facet_choices} == {"draft", "ready", "archived"}, facet_choices
        await _act(page, facet, "setValue", [["draft", "ready"]])
        await expect(rows).to_have_count(5)
        await _act(page, await _entry(page, "select", "Work status"), "setValue", [["archived"]])
        await expect(rows).to_have_count(1)
        await expect(rows.first).to_have_attribute("data-work-id", "motion")
        await press_button("Clear work filters")

        browser_stage("patterns: keyboard and agent selection invoke one shared bulk action")
        first = stage.get_by_role("checkbox", name="Select Coastal study", exact=True)
        await first.focus()
        await first.press("Space")
        await expect(first).to_be_checked()
        second = await _entry(page, "checkbox", "Select Pavilion notes")
        await _act(page, second, "setChecked", [True])
        await expect(stage.locator('[data-work-id="pavilion"]')).to_have_attribute("data-selected", "true")
        await expect(stage.locator(".qgp-selection-bar > output")).to_have_text("2 selected")
        selection = stage.get_by_role("toolbar", name="Selected work actions", exact=True)
        archive = selection.get_by_role("button", name="Archive selected work", exact=True)
        await archive.focus()
        await archive.press("ArrowRight")
        await expect(selection.get_by_role("button", name="Publish selected work", exact=True)).to_be_focused()
        await page.keyboard.press("ArrowLeft")
        await expect(archive).to_be_focused()
        publish = await _entry(page, "button", "Publish selected work")
        publish_refusal = await _call(page, "act", {"steps": [{"ref": publish["ref"], "action": "press", "args": []}]})
        await expect(result).to_have_attribute("data-archive-operations", "0")
        await press_button("Archive selected work")
        await expect(result).to_have_attribute("data-archive-operations", "1")
        await expect(result).to_have_attribute("data-last-source", "agent")
        await expect(result).to_have_text("2 works archived in this sample.")
        await expect(stage.locator('[data-work-id="coast"]')).to_have_attribute("data-work-status", "archived")
        await expect(stage.locator('[data-work-id="pavilion"]')).to_have_attribute("data-work-status", "archived")
        await expect(stage.locator(".qgp-selection-bar")).to_have_count(0)

        browser_stage("patterns: detail sheet editing, rejection and focus return")
        open_detail = stage.get_by_role("button", name="Open Coastal study", exact=True)
        await open_detail.focus()
        await open_detail.press("Enter")
        sheet = page.get_by_role("dialog", name="Coastal study details", exact=True)
        await expect(sheet).to_be_visible()
        focus_inside = await sheet.evaluate("node => node.contains(document.activeElement)")
        assert focus_inside, "The SDK drawer did not contain focus after keyboard opening"
        await capture("patterns-desktop-detail.png")
        title_control = await _entry(page, "input", "Title for coast")
        await _act(page, title_control, "setValue", ["Coastal reference"])
        await expect(page.get_by_label("Title for coast", exact=True)).to_have_value("Coastal reference")
        title_control = await _entry(page, "input", "Title for coast")
        await _act(page, title_control, "setValue", [""])
        await expect(page.get_by_label("Title for coast", exact=True)).to_have_value("Coastal reference")
        await page.keyboard.press("Escape")
        await expect(page.locator('.qgp-detail-sheet:visible')).to_have_count(0)
        await expect(stage.get_by_role("button", name="Open Coastal reference", exact=True)).to_be_focused()
        await expect(stage.locator('[data-work-id="coast"] .patterns-work-name strong')).to_have_text("Coastal reference")

        browser_stage("patterns: empty result action restores the accepted list")
        await _act(page, await _entry(page, "input", "Search saved work"), "setValue", ["no-such-local-work"])
        await expect(stage.locator(".qgp-empty-state")).to_be_visible()
        await press_button("Show the full library")
        await expect(rows).to_have_count(6)
        await expect(search).to_have_value("")

        browser_stage("patterns: hidden collection does not retain the global shortcut")
        await _select(page, "listbox", "Component catalogue", value="interactions")
        await expect(stage).not_to_be_visible()
        await page.keyboard.press("Control+k")
        await expect(palette).not_to_be_visible()
        await _select(page, "listbox", "Component catalogue", value="patterns")
        await expect(stage).to_be_visible()
        await expect(stage.locator('[data-work-id="coast"] .patterns-work-name strong')).to_have_text("Coastal reference")

        browser_stage("patterns: narrow layout and material fallbacks")
        await page.set_viewport_size({"width": 390, "height": 844})
        mobile = await _page_fits(page)
        await stage.scroll_into_view_if_needed()
        await capture("patterns-mobile.png")
        await page.emulate_media(reduced_motion="reduce", forced_colors="active")
        await expect(search).to_be_visible()
        await stage.get_by_role("button", name="Restore sample", exact=True).click()
        await expect(stage.locator('[data-work-id="coast"] .patterns-work-name strong')).to_have_text("Coastal study")
        await stage.get_by_role("button", name="Open Coastal study", exact=True).click()
        await expect(page.get_by_role("dialog", name="Coastal study details", exact=True)).to_be_visible()
        forced_mobile = await _page_fits(page)
        await page.get_by_role("dialog", name="Coastal study details", exact=True).get_by_role("button", name="Done", exact=True).click()
        await expect(page.locator('.qgp-detail-sheet:visible')).to_have_count(0)
        completed = True
        return {"namedControls": named, "command": command, "disabledCommand": refusal, "cancelledQuery": cancelled,
                "disabledSelectionAction": publish_refusal, "bulkArchiveOperations": 1,
                "mobile": mobile, "forcedColoursMobile": forced_mobile, "screenshots": screenshots,
                "validation": "unvalidated"}
    finally:
        if completed:
            await page.emulate_media(reduced_motion="no-preference", forced_colors="none")
            if original_viewport:
                await page.set_viewport_size(original_viewport)
