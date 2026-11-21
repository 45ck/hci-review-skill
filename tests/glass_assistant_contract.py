"""Accepted local conversation state through actual SDK controls and human input."""

from pathlib import Path

from glass_developer_contract import _choices, _named_controls, _page_fits, _select
from glass_optics_contract import SCREENSHOT_TIMEOUT_MS, _act, _call, _entry, browser_stage


async def verify_assistant_contract(page, expect, *, base_url, output_dir):
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    original_viewport = page.viewport_size
    screenshots = []
    completed = False
    await page.emulate_media(reduced_motion="no-preference", forced_colors="none")
    await page.goto(base_url, wait_until="networkidle")
    await page.wait_for_function("() => typeof window.quantitativeHciAgent?.snapshot === 'function'")
    await _select(page, "listbox", "Component catalogue", value="assistant")
    stage = page.locator('[data-kit-view="assistant"]')
    prompt = stage.get_by_role("textbox", name="Design prompt", exact=True)
    status = stage.get_by_label("Conversation status", exact=True)
    await expect(stage).to_be_visible()
    await expect(stage).to_have_attribute("data-validation", "unvalidated")
    await expect(stage.get_by_text("Local preview · No model connected", exact=True)).to_be_visible()
    named = await _named_controls(page)

    async def set_prompt(text):
        field = await _entry(page, "textarea", "Design prompt")
        await _act(page, field, "setValue", [text])
        await expect(prompt).to_have_value(text)
        return field

    async def response_count():
        return await stage.locator('[data-message-role="assistant"]').count()

    async def start_agent_request():
        button = await _entry(page, "button", "Preview response")
        assert "press" in button["actions"], button
        await page.evaluate("""ref => {
            window.__assistantRequest = window.quantitativeHciAgent.act({steps: [{ref, action: 'press'}]});
        }""", button["ref"])
        await expect(stage).to_have_attribute("data-response-state", "running")
        return button

    async def capture(name):
        await page.screenshot(path=str(output / name), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
        screenshots.append(name)

    try:
        browser_stage("assistant: discover real choices and source controls")
        await expect(stage.get_by_role("button", name="Preview response", exact=True)).to_be_disabled()
        initial_count = await response_count()
        style = await _entry(page, "select", "Response style")
        choices = await _choices(page, style)
        assert {item["value"] for item in choices} >= {"brief", "checklist", "live"}, choices
        unavailable = await _call(page, "act", {"steps": [{"ref": style["ref"], "action": "setValue", "args": ["live"]}]})
        assert (await _entry(page, "select", "Response style"))["value"] == "brief", unavailable
        disclosure = await _entry(page, "collapsible", "Sources for welcome")
        await _act(page, disclosure, "setOpen", [True])
        links = stage.locator('[data-message-id="welcome"] .qg-chat-sources a')
        await expect(links).to_have_count(3)
        link_details = await links.evaluate_all("""nodes => nodes.map(node => ({
            label: node.getAttribute('aria-label'), href: node.href,
            target: node.target, rel: node.rel, role: node.getAttribute('role')
        }))""")
        for link in link_details:
            assert link["href"].startswith("https://") and link["target"] == "_blank", link
            assert "noopener" in link["rel"] and "noreferrer" in link["rel"], link
            await _entry(page, "button", link["label"])
        await stage.locator(".assistant-thread").scroll_into_view_if_needed()
        await capture("assistant-desktop-sources.png")
        await _act(page, await _entry(page, "collapsible", "Sources for welcome"), "setOpen", [False])

        browser_stage("assistant: suggestion and over-limit input share the accepted field")
        suggestion = await _entry(page, "button", "Plan a quiet landing page")
        await _act(page, suggestion, "press", [])
        suggested = "Plan a quiet landing page for a coastal studio."
        await expect(prompt).to_have_value(suggested)
        await expect(stage).to_have_attribute("data-last-source", "agent")
        current_input = await _entry(page, "textarea", "Design prompt")
        over_limit = await _call(page, "act", {"steps": [{"ref": current_input["ref"], "action": "setValue", "args": ["x" * 2001]}]})
        await expect(prompt).to_have_value(suggested)
        assert (await _entry(page, "textarea", "Design prompt"))["value"] == suggested, over_limit
        await _act(page, await _entry(page, "button", "Remove project-brief.md"), "press", [])
        await expect(stage.locator('[data-attachment-id="project-brief"]')).to_have_count(0)
        await expect(stage).to_have_attribute("data-last-source", "agent")

        browser_stage("assistant: native selected files use the SDK validation and remove path")
        picker = stage.locator('input[type="file"]')
        await picker.set_input_files({"name": "local-notes.txt", "mimeType": "text/plain", "buffer": b"Local fixture notes.\n"})
        await expect(stage.get_by_role("button", name="Remove local-notes.txt", exact=True)).to_be_visible()
        await expect(stage.get_by_text("Local file, not uploaded", exact=False)).to_be_visible()
        await _act(page, await _entry(page, "button", "Remove local-notes.txt"), "press", [])
        await expect(stage.locator("[data-attachment-id]")).to_have_count(0)
        await picker.set_input_files({"name": "unsupported.exe", "mimeType": "application/octet-stream", "buffer": b"Rejected fixture"})
        await expect(stage.get_by_text("unsupported.exe was not attached.", exact=False)).to_be_visible()
        await expect(stage.locator("[data-attachment-id]")).to_have_count(0)

        browser_stage("assistant: agent submission produces one accepted response")
        await _select(page, "select", "Response style", value="checklist")
        await set_prompt("Make a component checklist for a coastal studio.")
        accepted = await _act(page, await _entry(page, "button", "Preview response"), "press", [])
        await expect(stage).to_have_attribute("data-response-state", "ready")
        await expect(stage).to_have_attribute("data-last-source", "agent")
        await expect(prompt).to_have_value("")
        await expect(stage.locator('[data-message-role="assistant"]')).to_have_count(initial_count + 1)
        await expect(stage.get_by_role("heading", name="A small, useful component set.", exact=True)).to_be_visible()
        await expect(status).to_contain_text("Local checklist ready.")

        browser_stage("assistant: stop is independent from the pending submit action")
        cancelled_draft = "Keep this draft if the preview is stopped."
        await set_prompt(cancelled_draft)
        before_cancel = await response_count()
        await start_agent_request()
        stop = await _entry(page, "button", "Stop preview")
        await _act(page, stop, "press", [])
        await expect(stage).to_have_attribute("data-response-state", "ready")
        await expect(prompt).to_have_value(cancelled_draft)
        await expect(status).to_have_text("Preview stopped. Your draft is kept.")
        cancelled_dispatch = await page.evaluate("window.__assistantRequest")
        assert cancelled_dispatch.get("ok"), cancelled_dispatch
        await page.wait_for_timeout(1950)
        assert await response_count() == before_cancel, "A canceled preview appended a late response"

        browser_stage("assistant: duplicate keyboard submission is bounded")
        await _select(page, "select", "Response style", value="brief")
        await prompt.fill("A keyboard request for the coastal studio.")
        before_keyboard = await response_count()
        user_count = await stage.locator('[data-message-role="user"]').count()
        await prompt.press("Control+Enter")
        await page.keyboard.press("Control+Enter")
        await expect(stage).to_have_attribute("data-response-state", "running")
        await expect(stage).to_have_attribute("data-last-source", "keyboard")
        await expect(stage).to_have_attribute("data-response-state", "ready", timeout=5000)
        await expect(stage.locator('[data-message-role="assistant"]')).to_have_count(before_keyboard + 1)
        await expect(stage.locator('[data-message-role="user"]')).to_have_count(user_count + 1)
        await expect(prompt).to_have_value("")

        browser_stage("assistant: hiding the collection cancels its pending work")
        hidden_draft = "Keep the draft while I inspect another collection."
        await set_prompt(hidden_draft)
        await start_agent_request()
        pending_count = await response_count()
        await _select(page, "listbox", "Component catalogue", value="sections")
        await expect(stage).not_to_be_visible()
        await page.wait_for_timeout(1950)
        await _select(page, "listbox", "Component catalogue", value="assistant")
        await expect(stage).to_be_visible()
        await expect(stage).to_have_attribute("data-response-state", "ready")
        await expect(prompt).to_have_value(hidden_draft)
        assert await response_count() == pending_count, "Hidden preview produced a late response"

        browser_stage("assistant: narrow and forced-colour controls retain the accepted state")
        await page.set_viewport_size({"width": 390, "height": 844})
        mobile_fit = await _page_fits(page)
        await prompt.scroll_into_view_if_needed()
        await expect(prompt).to_have_value(hidden_draft)
        await capture("assistant-mobile-composer.png")
        await page.emulate_media(reduced_motion="reduce", forced_colors="active")
        forced_fit = await _page_fits(page)
        await expect(prompt).to_have_value(hidden_draft)
        await expect(stage.get_by_role("button", name="Preview response", exact=True)).to_be_enabled()
        controls = await stage.locator('[data-slot="textarea"],.qg-chat-submit').evaluate_all("""nodes => nodes.map(node => ({
            name: node.getAttribute('aria-label') || node.textContent.trim(),
            width: node.getBoundingClientRect().width,
            color: getComputedStyle(node).color,
            background: getComputedStyle(node).backgroundColor
        }))""")
        assert controls and all(item["width"] > 0 for item in controls), controls
        completed = True
        return {
            "namedControls": named, "modes": choices, "sources": link_details,
            "accepted": {"result": accepted, "source": "agent", "response": "checklist"},
            "rejected": {"disabledModePreserved": "brief", "overLimitPreserved": suggested, "unsupportedFile": True},
            "cancelled": {"draftPreserved": cancelled_draft, "noLateResponse": True, "dispatch": cancelled_dispatch},
            "keyboard": {"oneResponse": True, "source": "keyboard"},
            "hidden": {"draftPreserved": hidden_draft, "noLateResponse": True},
            "mobile": {"viewport": {"width": 390, "height": 844}, "fit": mobile_fit},
            "forcedColours": {"fit": forced_fit, "controls": controls}, "screenshots": screenshots,
        }
    finally:
        await page.evaluate("delete window.__assistantRequest")
        if completed:
            await page.emulate_media(reduced_motion="no-preference", forced_colors="none")
            if original_viewport:
                await page.set_viewport_size(original_viewport)
