"""Production-gallery contract for the Quantive application layout composition.

Uses the real mounted UI SDK controls, the shared Liquid Glass provider and
fictional, in-page records. It does not establish backend tenant isolation.
"""
from pathlib import Path

from glass_developer_contract import _named_controls, _page_fits, _select
from glass_optics_contract import _act, _call, _entry, browser_stage, SCREENSHOT_TIMEOUT_MS


async def verify_layouts_contract(page, expect, *, base_url, output_dir):
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    original_viewport = page.viewport_size
    screenshots = []
    await page.goto(base_url, wait_until="networkidle")
    await page.wait_for_function("() => typeof window.quantitativeHciAgent?.snapshot === 'function'")
    await _select(page, "listbox", "Component catalogue", value="layouts")

    stage = page.locator(".qg-layout-study")
    app = stage.locator(".qg-app")
    await expect(stage).to_be_visible()
    await expect(stage).to_have_attribute("data-validation", "unvalidated")
    await expect(app).to_have_attribute("data-app-screen", "reviews")
    await expect(stage.locator(".qg-app-header")).to_have_attribute("data-liquid-glass", "")
    await expect(stage.locator(".qg-app-workspace-avatar")).to_have_text("NL")
    assert await page.locator("html").get_attribute("data-liquid-glass-kit") == "true"
    named = await _named_controls(page)

    async def press(label):
        return await _act(page, await _entry(page, "button", label), "press", [])

    async def menu_action(label, choice):
        control = await _entry(page, "menu", label)
        await _act(page, control, "setOpen", [True])
        queried = await _call(page, "query", {"within": control["ref"]})
        assert isinstance(queried, list), queried
        available = next(item for item in queried if item["ref"] == control["ref"])
        names = set([item["label"] for item in available.get("items", [])] + available.get("buttons", []))
        selected = [label for label in names if label.startswith(choice)]
        assert len(selected) == 1, (choice, names)
        await _act(page, control, "press", [selected[0]])
        return selected[0]

    async def capture(filename):
        await stage.scroll_into_view_if_needed()
        await stage.screenshot(path=str(output / filename), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
        screenshots.append(filename)

    browser_stage("layouts: real review list, inspector, accepted change and undo")
    await expect(app.get_by_role("button", name="Inspect Payment retry")).to_be_visible()
    inspect = app.get_by_role("button", name="Inspect Payment retry")
    await inspect.focus()
    await inspect.press("Enter")
    detail = app.locator(".qg-app-detail")
    await expect(detail.get_by_role("heading", name="Payment retry")).to_be_visible()
    await press("Mark reviewed")
    await expect(app.get_by_role("button", name="Inspect Payment retry")).to_have_count(0)
    await expect(app.get_by_role("button", name="Undo")).to_be_visible()
    await press("Undo")
    await expect(app.get_by_role("button", name="Inspect Payment retry")).to_be_visible()
    await capture("layouts-quantive-desktop.png")

    browser_stage("layouts: workspace transition revokes editing and resets task context")
    workspace_choice = await menu_action("Current workspace: Northstar Lab. Switch workspace", "Fieldworks")
    await expect(stage.locator(".qg-app-workspace-avatar")).to_have_text("FW")
    await expect(app.get_by_role("button", name="Inspect Payment retry")).to_have_count(0)
    await expect(app.get_by_role("button", name="Inspect Offline upload")).to_be_visible()
    await app.get_by_role("button", name="Inspect Offline upload").click()
    await expect(detail.get_by_role("button", name="Mark reviewed")).to_be_disabled()
    await expect(detail.get_by_text("You have view-only access")).to_be_visible()
    denied = await _entry(page, "button", "Mark reviewed")
    refusal = await _call(page, "act", {"steps": [{"ref": denied["ref"], "action": "press", "args": []}]})
    await expect(app.get_by_role("button", name="Inspect Offline upload")).to_be_visible()
    await expect(app.get_by_role("button", name="Undo")).to_have_count(0)

    browser_stage("layouts: same controls on phone, detail becomes a navigable task")
    await _select(page, "segmented-control", "Preview width", choice="Phone")
    await expect(app).to_have_attribute("data-preview-size", "phone")
    await expect(app.locator(".qg-app-bottom-nav")).to_be_visible()
    await expect(detail).not_to_be_visible()
    await app.get_by_role("button", name="Inspect Offline upload").click()
    await expect(detail).to_be_visible()
    await expect(detail.get_by_role("heading", name="Offline upload")).to_be_focused()
    await expect(detail.get_by_role("button", name="Mark reviewed")).to_be_disabled()
    await detail.get_by_role("button", name="Reviews").click()
    await expect(detail).not_to_be_visible()
    await expect(app.get_by_role("button", name="Inspect Offline upload")).to_be_focused()
    frame = await app.bounding_box()
    assert frame and frame["width"] <= 410, frame
    await capture("layouts-quantive-phone.png")

    browser_stage("layouts: account menu and preferences are principal-scoped")
    await menu_action("Open account menu", "Your account")
    await expect(app).to_have_attribute("data-app-screen", "account")
    name = app.get_by_role("textbox", name="Account name")
    await name.fill("Alex Morgan updated")
    await app.get_by_role("button", name="Save name").click()
    await expect(name).to_have_value("Alex Morgan updated")
    await app.get_by_role("tab", name="Notifications").click()
    pref = app.get_by_role("switch", name="Weekly email summary")
    before = await pref.get_attribute("aria-checked")
    await pref.click()
    assert await pref.get_attribute("aria-checked") != before

    browser_stage("layouts: error, loading and empty fixtures have explicit recovery")
    await app.get_by_role("button", name="Open account menu").click()
    await page.get_by_role("menuitem", name="Workspace settings").click()
    await expect(app.get_by_role("heading", name="Workspace settings")).to_be_visible()
    await app.locator(".qg-app-bottom-nav").get_by_role("button", name="Reviews").click()
    for label, recovery in [("Unavailable", "Retry"), ("Loading", "Show example data"), ("Empty", "Show all reviews")]:
        await stage.get_by_role("button", name="Preview application state").click()
        await page.get_by_role("menuitem", name=label, exact=True).click()
        await expect(app.get_by_role("button", name=recovery)).to_be_visible()
        await app.get_by_role("button", name=recovery).click()
        await expect(app.get_by_role("button", name="Inspect Offline upload")).to_be_visible()

    browser_stage("layouts: command-search opens actual pages without duplicate navigation")
    await app.get_by_role("button", name="Search application pages").click()
    dialog = page.get_by_role("dialog", name="Find a page")
    await expect(dialog).to_be_visible()
    await dialog.get_by_role("textbox", name="Search pages").fill("People")
    await dialog.get_by_role("button", name="People").click()
    await expect(app.get_by_role("heading", name="People")).to_be_visible()

    browser_stage("layouts: keyboard search dismisses to its trigger")
    search_trigger = app.get_by_role("button", name="Search application pages")
    await search_trigger.focus()
    await search_trigger.press("Enter")
    await expect(dialog).to_be_visible()
    await page.keyboard.press("Escape")
    await expect(dialog).not_to_be_visible()
    await expect(search_trigger).to_be_focused()

    browser_stage("layouts: actual viewports fit and compact details restore focus")
    viewports = []
    for width in [1440, 1024, 768, 390, 320]:
        await page.set_viewport_size({"width": width, "height": 1000 if width >= 768 else 844})
        # Each viewport must start with its own closed compact detail state;
        # desktop selection otherwise carries an open inspector into mobile.
        await page.goto(base_url + ("&" if "?" in base_url else "?") + "collection=layouts", wait_until="networkidle")
        await expect(stage).to_be_visible()
        await expect(app).to_have_attribute("data-details-open", "false")
        await stage.scroll_into_view_if_needed()
        await expect(app.get_by_role("button", name="Inspect Payment retry")).to_be_visible()
        fit = await _page_fits(page)
        bounds = await app.bounding_box()
        assert bounds and bounds["width"] <= width, (width, bounds)
        compact = not await detail.is_visible()
        row = app.get_by_role("button", name="Inspect Payment retry")
        await row.focus()
        await row.press("Enter")
        await expect(detail).to_be_visible()
        if compact:
            await expect(detail.get_by_role("heading", name="Payment retry")).to_be_focused()
            await page.keyboard.press("Escape")
            await expect(detail).not_to_be_visible()
            await expect(row).to_be_focused()
        viewports.append({"width": width, "page": fit, "app": bounds, "compact": compact})
    await capture("layouts-quantive-320.png")

    browser_stage("layouts: a hidden collection cannot open its search dialog")
    await _select(page, "listbox", "Component catalogue", value="overview")
    await page.keyboard.press("Control+k")
    await expect(dialog).not_to_be_visible()

    if original_viewport:
        await page.set_viewport_size(original_viewport)
    return {
        "controls": ["menu", "dialog", "input", "segmented-control", "tabs", "switch", "button"],
        "invariants": ["tenant reset", "viewer denial", "undo", "account separated", "mobile detail recovery"],
        "viewport": frame, "actualViewports": viewports, "screenshots": screenshots,
        "namedControls": len(named), "workspaceChoice": workspace_choice,
        "viewerAction": refusal,
        "limits": "Fictional local state; not authentication, server authorisation or human validation"
    }
