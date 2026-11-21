"""Discover and choose actual integration source through the existing SDK bridge."""

from pathlib import Path

from glass_developer_contract import _choices, _page_fits, _select
from glass_optics_contract import SCREENSHOT_TIMEOUT_MS, _act, _call, _entry, browser_stage


async def _copy_source(page, stage, expect, *, filename, source_label):
    selected = stage.locator('[data-slot="tabs-panel"][data-selected]')
    await expect(selected).to_have_count(1)
    source = selected.get_by_label(source_label, exact=True)
    await expect(source).to_be_visible()
    control = selected.get_by_role("button", name=f"Copy {filename}", exact=True)
    await expect(control).to_be_visible()
    await expect(control).to_be_enabled()
    entry = await _entry(page, "button", f"Copy {filename}")
    assert not entry.get("disabled"), entry
    await _act(page, entry, "press", [])
    await expect(stage.locator(".integration-copy-result")).to_have_text(f"{filename} copied")
    copied = await page.evaluate("() => navigator.clipboard.readText()")
    assert copied == await source.text_content(), "Copied source differs from the selected compiled recipe"
    return entry, copied


async def _previous_source_unavailable(page, stage, expect, entry, copied):
    # SDK panels can remain mounted and inert during exit, then become hidden or
    # offPage. Neither lifecycle state may expose the previous file's action.
    entries = await _call(page, "query", {"kind": "button", "text": entry["label"]})
    assert isinstance(entries, list), entries
    previous = [item for item in entries if item["ref"] == entry["ref"]]
    assert all((item.get("disabled") or item.get("offPage")) and not item["actions"] for item in previous), previous
    panels = await stage.locator('[data-slot="tabs-panel"]').evaluate_all("""nodes => nodes.map(panel => ({
        selected: panel.hasAttribute('data-selected'), ending: panel.hasAttribute('data-ending-style'),
        hidden: panel.hidden, inert: panel.inert,
        buttons: [...panel.querySelectorAll('[data-slot="button"]')].map(button => button.textContent)
    }))""")
    browser_stage("integrations: previous source unavailable", label=entry["label"], entries=previous, panels=panels)
    refused = await _call(page, "act", {"steps": [{"ref": entry["ref"], "action": "press", "args": []}]})
    assert refused.get("ok") is False, f"The previous source remained actionable: {refused}"
    assert await page.evaluate("() => navigator.clipboard.readText()") == copied
    await expect(stage.locator(".integration-copy-result")).to_have_text("")


async def verify_integrations_contract(page, expect, *, base_url, output_dir):
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    await page.goto(base_url + "?collection=integrations", wait_until="networkidle")
    stage = page.locator(".integration-showcase")
    await expect(stage).to_be_visible()
    await expect(stage).to_have_attribute("data-integration-view", "vercel")
    await expect(stage.get_by_text("These are integration recipes.", exact=False)).to_be_visible()
    selection = await _entry(page, "select", "Integration")
    choices = await _choices(page, selection)
    expected = {"vercel", "copilotkit", "ag-ui", "custom", "openai", "anthropic"}
    assert {item["value"] for item in choices} == expected, choices

    browser_stage("integrations: copy the selected client source")
    await page.context.grant_permissions(["clipboard-read", "clipboard-write"])
    client_copy, client_text = await _copy_source(page, stage, expect,
        filename="vercel-chat.tsx", source_label="Vercel AI SDK React UI source")

    browser_stage("integrations: select provider through actual SDK")
    await _select(page, "select", "Server provider", value="openrouter")
    await expect(stage.locator("[data-integration-provider]")).to_have_attribute("data-integration-provider", "openrouter")
    await expect(stage.locator(".integration-provider")).to_contain_text("OPENROUTER_API_KEY")
    await _select(page, "tabs", "Integration source files", value="server")
    server_source = stage.get_by_label("Vercel AI SDK Server route source", exact=True)
    await expect(server_source).to_contain_text("@openrouter/ai-sdk-provider")
    await expect(server_source).to_contain_text("toUIMessageStreamResponse")
    await _previous_source_unavailable(page, stage, expect, client_copy, client_text)

    browser_stage("integrations: copy the exact compiled source")
    server_copy, server_text = await _copy_source(page, stage, expect,
        filename="provider.server.ts", source_label="Vercel AI SDK Server route source")
    await _select(page, "tabs", "Integration source files", value="client")
    await expect(stage.locator('[data-slot="tabs-panel"][data-selected]').get_by_label(
        "Vercel AI SDK React UI source", exact=True)).to_be_visible()
    await _previous_source_unavailable(page, stage, expect, server_copy, server_text)
    _, returned_client_text = await _copy_source(page, stage, expect,
        filename="vercel-chat.tsx", source_label="Vercel AI SDK React UI source")
    assert returned_client_text == client_text

    snippets = {
        "copilotkit": "useAgent",
        "ag-ui": "subscribe",
        "custom": "LiquidChat",
        "openai": "responses",
        "anthropic": "messages",
    }
    for runtime, fragment in snippets.items():
        await _select(page, "select", "Integration", value=runtime)
        await expect(stage).to_have_attribute("data-integration-view", runtime)
        await expect(stage.locator("pre:visible")).to_contain_text(fragment)
        await expect(stage.locator("[data-integration-provider]")).to_have_count(0)
        links = await stage.locator("a[target='_blank']").evaluate_all("nodes => nodes.map(n => ({href:n.href,rel:n.rel}))")
        assert all(item["href"].startswith("https://") and "noopener" in item["rel"] for item in links), links

    await _select(page, "select", "Integration", value="vercel")
    await expect(stage.locator("[data-integration-provider]")).to_have_attribute("data-integration-provider", "openrouter")
    await page.screenshot(path=str(output / "integrations-desktop.png"), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
    await page.set_viewport_size({"width": 390, "height": 844})
    await stage.scroll_into_view_if_needed()
    mobile = await _page_fits(page)
    await page.screenshot(path=str(output / "integrations-mobile.png"), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
    await page.emulate_media(forced_colors="active", reduced_motion="reduce")
    await _select(page, "select", "Integration", value="custom")
    await expect(stage).to_have_attribute("data-integration-view", "custom")
    forced = await _page_fits(page)
    return {"integrations": sorted(expected), "serverProviders": ["openai", "anthropic", "openrouter"],
            "acceptedProvider": "openrouter", "copiedExactCompiledSource": True,
            "copiedFiles": ["vercel-chat.tsx", "provider.server.ts"], "inactiveSourceActionsRefused": True,
            "returnedClientSourceUnchanged": True,
            "mobile": mobile, "forcedColours": forced,
            "scope": "SDK navigation, exact source copying and layout; no live provider call."}
