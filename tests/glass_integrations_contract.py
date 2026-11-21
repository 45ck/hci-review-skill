"""Discover and choose actual integration source through the existing SDK bridge."""

from pathlib import Path

from glass_developer_contract import _choices, _page_fits, _select
from glass_optics_contract import SCREENSHOT_TIMEOUT_MS, _act, _entry, browser_stage


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

    browser_stage("integrations: select provider through actual SDK")
    await _select(page, "select", "Server provider", value="openrouter")
    await expect(stage.locator("[data-integration-provider]")).to_have_attribute("data-integration-provider", "openrouter")
    await expect(stage.locator(".integration-provider")).to_contain_text("OPENROUTER_API_KEY")
    await _select(page, "tabs", "Integration source files", value="server")
    server_source = stage.get_by_label("Vercel AI SDK Server route source", exact=True)
    browser_stage("integrations: wait for the outgoing source panel to unmount")
    # SDK Tabs retains the inactive panel through its exit animation. Wait for
    # that lifecycle before requiring the Copy button to be globally unique.
    await expect(stage.locator('.integration-code [data-slot="tabs-panel"]')).to_have_count(1)
    await expect(server_source).to_be_visible()
    await expect(server_source).to_contain_text("@openrouter/ai-sdk-provider")
    await expect(server_source).to_contain_text("toUIMessageStreamResponse")

    browser_stage("integrations: copy the exact compiled source")
    await page.context.grant_permissions(["clipboard-read", "clipboard-write"])
    copy = await _entry(page, "button", "Copy integration code")
    await _act(page, copy, "press", [])
    await expect(stage.locator(".integration-copy-result")).to_have_text("provider.server.ts copied")
    copied = await page.evaluate("() => navigator.clipboard.readText()")
    assert copied == await server_source.text_content(), "Copied source differs from the displayed compiled recipe"

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
            "mobile": mobile, "forcedColours": forced,
            "scope": "SDK navigation, exact source copying and layout; no live provider call."}
