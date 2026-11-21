"""Production-gallery contract for the Quantive application layout composition.

Uses the real mounted UI SDK controls, the shared Liquid Glass provider and
fictional, in-page records. It does not establish backend tenant isolation.
"""
import re
from pathlib import Path

from glass_developer_contract import _select
from glass_optics_contract import browser_stage, SCREENSHOT_TIMEOUT_MS


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

    async def capture(filename):
        await stage.scroll_into_view_if_needed()
        await stage.screenshot(path=str(output / filename), animations="disabled", timeout=SCREENSHOT_TIMEOUT_MS)
        screenshots.append(filename)

    browser_stage("layouts: real review list, inspector, accepted change and undo")
    await expect(app.get_by_role("button", name="Inspect Payment retry")).to_be_visible()
    await app.get_by_role("button", name="Inspect Payment retry").click()
    detail = app.locator(".qg-app-detail")
    await expect(detail.get_by_role("heading", name="Payment retry")).to_be_visible()
    await detail.get_by_role("button", name="Mark reviewed").click()
    await expect(app.get_by_role("button", name="Inspect Payment retry")).to_have_count(0)
    await expect(app.get_by_role("button", name="Undo")).to_be_visible()
    await app.get_by_role("button", name="Undo").click()
    await expect(app.get_by_role("button", name="Inspect Payment retry")).to_be_visible()
    await capture("layouts-quantive-desktop.png")

    browser_stage("layouts: workspace transition revokes editing and resets task context")
    await app.get_by_role("button", name=re.compile(r"Current workspace: Northstar Lab")).click()
    await page.get_by_role("menuitem", name=re.compile("Fieldworks")).click()
    await expect(stage.locator(".qg-app-workspace-avatar")).to_have_text("FW")
    await expect(app.get_by_role("button", name="Inspect Payment retry")).to_have_count(0)
    await expect(app.get_by_role("button", name="Inspect Offline upload")).to_be_visible()
    await app.get_by_role("button", name="Inspect Offline upload").click()
    await expect(detail.get_by_role("button", name="Mark reviewed")).to_be_disabled()
    await expect(detail.get_by_text("You have view-only access")).to_be_visible()

    browser_stage("layouts: same controls on phone, detail becomes a navigable task")
    await _select(page, "segmented-control", "Preview width", choice="Phone")
    await expect(app).to_have_attribute("data-preview-size", "phone")
    await expect(app.locator(".qg-app-bottom-nav")).to_be_visible()
    await expect(detail).not_to_be_visible()
    await app.get_by_role("button", name="Inspect Offline upload").click()
    await expect(detail).to_be_visible()
    await expect(detail.get_by_role("button", name="Mark reviewed")).to_be_disabled()
    await detail.get_by_role("button", name="Reviews").click()
    await expect(detail).not_to_be_visible()
    frame = await app.bounding_box()
    assert frame and frame["width"] <= 410, frame
    await capture("layouts-quantive-phone.png")

    browser_stage("layouts: account menu and preferences are principal-scoped")
    await app.get_by_role("button", name="Open account menu").click()
    await page.get_by_role("menuitem", name="Your account").click()
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
    for label, recovery in [("Unavailable", "Retry"), ("Loading", "Show example data"), ("No results", "Show all reviews")]:
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

    if original_viewport:
        await page.set_viewport_size(original_viewport)
    return {
        "controls": ["menu", "dialog", "input", "segmented-control", "tabs", "switch", "button"],
        "invariants": ["tenant reset", "viewer denial", "undo", "account separated", "mobile detail recovery"],
        "viewport": frame, "screenshots": screenshots,
        "limits": "Fictional local state; not authentication, server authorisation or human validation"
    }
