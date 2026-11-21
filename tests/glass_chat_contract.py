"""Shared human/agent chat outcomes, local thread isolation and cancellation."""

from pathlib import Path

from glass_developer_contract import _choices, _named_controls, _page_fits, _select
from glass_optics_contract import SCREENSHOT_TIMEOUT_MS, _act, _call, _entry, browser_stage


async def verify_chat_contract(page, expect, *, base_url, output_dir):
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    original_viewport = page.viewport_size
    screenshots = []
    completed = False
    await page.emulate_media(reduced_motion="no-preference", forced_colors="none")
    await page.goto(base_url, wait_until="networkidle")
    await page.wait_for_function("() => typeof window.quantitativeHciAgent?.snapshot === 'function'")
    await _select(page, "listbox", "Component catalogue", value="chat")
    stage = page.locator('[data-kit-view="chat"]')
    prompt = stage.get_by_role("textbox", name="Chat prompt", exact=True)
    status = stage.get_by_label("Chat status", exact=True)
    await expect(stage).to_be_visible()
    await expect(stage.get_by_text("Local demo · No model connected", exact=True)).to_be_visible()
    named = await _named_controls(page)

    async def press(label):
        return await _act(page, await _entry(page, "button", label), "press", [])

    async def set_prompt(text):
        await _act(page, await _entry(page, "textarea", "Chat prompt"), "setValue", [text])
        await expect(prompt).to_have_value(text)

    async def start_request():
        control = await _entry(page, "button", "Send demo message")
        await page.evaluate("""ref => {
          window.__chatRequest = window.quantitativeHciAgent.act({steps: [{ref, action:'press'}]});
        }""", control["ref"])
        await expect(stage).to_have_attribute("data-chat-state", "submitted")

    async def capture(name):
        await page.screenshot(path=str(output / name), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
        screenshots.append(name)

    try:
        browser_stage("chat: templates are real SDK choices and drafts have shared limits")
        menu = await _entry(page, "menu", "Prompt templates")
        await _act(page, menu, "setOpen", [True])
        choices = await _choices(page, await _entry(page, "menu", "Prompt templates"))
        await _act(page, await _entry(page, "menu", "Prompt templates"), "press", ["Write a project brief"])
        suggested = "Write a short project brief for a coastal studio website."
        await expect(prompt).to_have_value(suggested)
        await expect(prompt).to_be_focused()
        before_limit = await _entry(page, "textarea", "Chat prompt")
        refused = await _call(page, "act", {"steps": [{"ref": before_limit["ref"], "action": "setValue", "args": ["x" * 2001]}]})
        await expect(prompt).to_have_value(suggested)
        await _act(page, await _entry(page, "menu", "Prompt templates"), "setOpen", [True])
        unavailable = await _call(page, "act", {"steps": [{"ref": (await _entry(page, "menu", "Prompt templates"))["ref"], "action": "press", "args": ["Publish automatically · Unavailable"]}]})
        await expect(prompt).to_have_value(suggested)
        await page.keyboard.press("Escape")

        browser_stage("chat: actual thread choices preserve separate drafts and display host tool output")
        await press("New chat")
        thread_id = await stage.get_attribute("data-thread-id")
        assert thread_id and thread_id not in {"coastal", "release"}
        await expect(prompt).to_have_value("")
        draft = "Keep my new conversation draft."
        await set_prompt(draft)
        await _select(page, "listbox", "Chat threads", value="release")
        await expect(stage.locator('[data-chat-tool-id="fixture-check"]')).to_have_attribute("data-chat-tool-status", "complete")
        tool = await _entry(page, "collapsible", "Tool Example release check fixture-check")
        await _act(page, tool, "setOpen", [True])
        await expect(stage.get_by_text('"executed": false', exact=False)).to_be_visible()
        await _select(page, "listbox", "Chat threads", value=thread_id)
        await expect(prompt).to_have_value(draft)
        await expect(stage).to_have_attribute("data-last-source", "agent")
        threads = await _choices(page, await _entry(page, "listbox", "Chat threads"))
        assert {item["value"] for item in threads} >= {"coastal", "release", thread_id}, threads

        browser_stage("chat: local attachment and accepted agent submission produce visible output")
        await stage.locator('input[type="file"]').set_input_files({"name": "chat-notes.txt", "mimeType": "text/plain", "buffer": b"A local fixture file.\n"})
        await expect(stage.get_by_role("button", name="Remove chat-notes.txt", exact=True)).to_be_visible()
        await expect(stage.get_by_text("Not uploaded", exact=False)).to_be_visible()
        await set_prompt("Create a practical release checklist for this interface.")
        accepted = await press("Send demo message")
        await expect(stage).to_have_attribute("data-chat-state", "ready")
        await expect(stage).to_have_attribute("data-last-source", "agent")
        await expect(prompt).to_have_value("")
        await expect(stage.locator('[data-message-role="user"]')).to_have_count(1)
        await expect(stage.locator('[data-message-role="assistant"]')).to_have_count(1)
        await expect(stage.locator('[data-message-role="user"]').get_by_text("chat-notes.txt", exact=True)).to_be_visible()
        await expect(status).to_have_text("Local response complete. No model was called.")
        await press("Remove chat-notes.txt")
        await expect(stage.get_by_role("button", name="Remove chat-notes.txt", exact=True)).to_have_count(0)
        await stage.locator(".qg-conversation").scroll_into_view_if_needed()
        await capture("chat-workspace-desktop.png")

        browser_stage("chat: simulated failure retries the same accepted prompt without another user message")
        await _act(page, await _entry(page, "collapsible", "Chat demo controls"), "setOpen", [True])
        await _act(page, await _entry(page, "toggle", "Fail next response"), "setPressed", [True])
        await set_prompt("Review the keyboard behavior.")
        await press("Send demo message")
        await expect(stage).to_have_attribute("data-chat-state", "error")
        await expect(prompt).to_have_value("Review the keyboard behavior.")
        await expect(stage.get_by_text("Simulated connection failure.", exact=False)).to_be_visible()
        user_count = await stage.locator('[data-message-role="user"]').count()
        await press("Retry response")
        await expect(stage).to_have_attribute("data-chat-state", "ready")
        await expect(stage.locator('[data-message-role="user"]')).to_have_count(user_count)
        await expect(stage.locator('[data-message-role="assistant"]')).to_have_count(2)
        await expect(prompt).to_have_value("")
        await _act(page, await _entry(page, "collapsible", "Chat demo controls"), "setOpen", [False])

        browser_stage("chat: Stop and hidden-view cancellation prevent stale output")
        canceled_draft = "Keep this prompt when I stop the response."
        await set_prompt(canceled_draft)
        await start_request()
        await press("Stop demo response")
        await expect(stage).to_have_attribute("data-chat-state", "ready")
        await expect(prompt).to_have_value(canceled_draft)
        await expect(status).to_contain_text("Response stopped.")
        stopped = await stage.locator(".qg-conversation-transcript").inner_text()
        assert (await page.evaluate("window.__chatRequest")).get("ok")
        await page.wait_for_timeout(1750)
        assert await stage.locator(".qg-conversation-transcript").inner_text() == stopped
        await set_prompt("Keep the draft when I leave this example.")
        await start_request()
        await _select(page, "listbox", "Component catalogue", value="patterns")
        await expect(stage).not_to_be_visible()
        hidden = await stage.locator(".qg-conversation-transcript").inner_text()
        await page.wait_for_timeout(1750)
        await _select(page, "listbox", "Component catalogue", value="chat")
        await expect(stage).to_have_attribute("data-chat-state", "ready")
        await expect(prompt).to_have_value("Keep the draft when I leave this example.")
        assert await stage.locator(".qg-conversation-transcript").inner_text() == hidden

        browser_stage("chat: keyboard submission is bounded and layout changes retain the thread")
        user_count = await stage.locator('[data-message-role="user"]').count()
        await prompt.fill("A keyboard request for the studio.")
        await prompt.press("Control+Enter")
        await page.keyboard.press("Control+Enter")
        await expect(stage).to_have_attribute("data-chat-state", "ready", timeout=5000)
        await expect(stage.locator('[data-message-role="user"]')).to_have_count(user_count + 1)
        await expect(stage).to_have_attribute("data-last-source", "keyboard")
        await _select(page, "segmented-control", "Chat example layout", value="sidepanel")
        await expect(stage).to_have_attribute("data-chat-layout", "sidepanel")
        await expect(stage).to_have_attribute("data-thread-id", thread_id)
        await expect(stage.locator(".chat-context-document")).to_be_visible()
        await stage.locator(".chat-showcase-context").scroll_into_view_if_needed()
        await capture("chat-sidepanel-desktop.png")

        browser_stage("chat: all three layouts fit mobile and forced colours")
        await page.set_viewport_size({"width": 390, "height": 844})
        mobile = {}
        for layout in ["workspace", "sidepanel", "playground"]:
            await _select(page, "segmented-control", "Chat example layout", value=layout)
            mobile[layout] = await _page_fits(page)
            await expect(stage).to_have_attribute("data-thread-id", thread_id)
        await prompt.scroll_into_view_if_needed()
        await capture("chat-playground-mobile.png")
        await page.emulate_media(reduced_motion="reduce", forced_colors="active")
        forced = await _page_fits(page)
        await set_prompt("A forced-colour draft.")
        await expect(stage.get_by_role("button", name="Send demo message", exact=True)).to_be_enabled()
        completed = True
        return {
            "namedControls": named, "templates": choices, "threads": threads,
            "refusals": {"overLimit": refused, "disabledTemplate": unavailable},
            "accepted": {"result": accepted, "source": "agent", "attachmentMetadata": True},
            "retry": {"sameUserMessage": True}, "stop": {"draftKept": canceled_draft, "noLateOutput": True},
            "hidden": {"draftKept": True, "noLateOutput": True}, "keyboard": {"oneSubmission": True, "source": "keyboard"},
            "mobile": mobile, "forcedColours": forced, "screenshots": screenshots,
        }
    finally:
        if not completed:
            await page.screenshot(path=str(output / "chat-failure.png"), timeout=SCREENSHOT_TIMEOUT_MS)
        await page.emulate_media(reduced_motion="no-preference", forced_colors="none")
        if original_viewport:
            await page.set_viewport_size(original_viewport)
