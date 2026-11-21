"""Rendered review evidence and selection boundaries through the real SDK bridge."""

import json
from pathlib import Path
import re
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from glass_developer_contract import _choices, _page_fits
from glass_optics_contract import SCREENSHOT_TIMEOUT_MS, _act, _call, _entry, browser_stage


def _review_url(base_url, **query):
    parsed = urlsplit(base_url)
    parameters = dict(parse_qsl(parsed.query))
    parameters.update(query)
    return urlunsplit(parsed._replace(query=urlencode(parameters)))


async def verify_review_contract(page, expect, *, base_url, output_dir):
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    original_viewport = page.viewport_size
    screenshots = []
    completed = False
    await page.goto(base_url, wait_until="networkidle")
    await page.wait_for_function("() => typeof window.quantitativeHciAgent?.snapshot === 'function'")
    trigger = page.get_by_role("button", name="Review UI", exact=True)
    panel = page.get_by_role("dialog", name="Review UI", exact=True)

    async def press(label):
        return await _act(page, await _entry(page, "button", label), "press", [])

    async def capture(filename):
        await page.screenshot(path=str(output / filename), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
        screenshots.append(filename)

    async def expect_current():
        await expect(panel).to_have_attribute("data-review-fingerprint", re.compile(r"^qgr-"))
        await expect(panel).to_have_attribute("data-review-stale", "false")

    try:
        browser_stage("review: visible entry and actual SDK opening")
        await expect(trigger).to_be_visible()
        await expect(panel).not_to_be_visible()
        dialog = await _entry(page, "dialog", "Review UI")
        await _act(page, dialog, "setOpen", [True])
        await expect(panel).to_be_visible()
        await expect_current()
        await expect(panel).to_have_attribute("data-review-source", "page")
        await expect(panel).to_have_attribute("data-validation", "unvalidated")
        assert int(await panel.get_attribute("data-review-element-count")) > 0
        initial_fingerprint = await panel.get_attribute("data-review-fingerprint")
        assert dict(parse_qsl(urlsplit(page.url).query)).get("review") == "1"
        await expect(panel.get_by_role("button", name="Copy decisions JSON", exact=True)).to_be_disabled()
        await press("Refresh checks")
        await expect_current()

        browser_stage("review: separate deliberate fixture produces anchored real findings")
        await press("Show lint example")
        fixture = page.locator("[data-review-example-surface]")
        await expect(fixture).to_be_visible()
        await expect(panel).to_have_attribute("data-review-source", "fixture")
        await expect_current()
        await expect(panel).to_have_attribute("data-review-scope", "lint-example")
        repeated = panel.locator('[data-review-rule="repeated-subtitle"]')
        generic = panel.locator('[data-review-rule="generic-action"]')
        unnamed = panel.locator('[data-review-rule="control-name"]')
        await expect(repeated).to_have_count(1)
        await expect(generic).to_have_count(1)
        await expect(unnamed).to_have_count(1)
        await expect(repeated).to_contain_text('"Account"')
        await expect(unnamed).to_have_attribute("data-review-severity", "error")
        assert await panel.get_attribute("data-review-fingerprint") != initial_fingerprint
        base_finding_count = await panel.locator("[data-review-finding]").count()

        browser_stage("review: hidden, protected, tool and editable values stay outside evidence")
        await fixture.evaluate("""node => {
            const probe = document.createElement('div');
            probe.id = 'review-exclusion-probe';
            probe.innerHTML = `
              <div hidden><button style="width:48px;height:40px"></button><p>HIDDEN_REVIEW_SENTINEL</p></div>
              <div data-agent-secret><button style="width:48px;height:40px"></button><p>SECRET_REVIEW_SENTINEL</p></div>
              <div data-agent-hidden><button style="width:48px;height:40px"></button><p>AGENT_HIDDEN_SENTINEL</p></div>
              <div data-quantive-review-root><button style="width:48px;height:40px"></button><p>TOOL_REVIEW_SENTINEL</p></div>
              <p id="review-visible-text">Preview content<span style="display:none">CSS_HIDDEN_REVIEW_SENTINEL</span></p>
              <label for="review-radio-probe">Balanced</label><button id="review-radio-probe" role="radio" style="width:40px;height:40px"></button>
              <input aria-label="Fixture value" value="EDITABLE_REVIEW_SENTINEL" style="width:150px;height:40px" />`;
            node.append(probe);
        }""")
        await press("Refresh checks")
        await expect_current()
        await expect(panel.locator("[data-review-finding]")).to_have_count(base_finding_count)
        evidence = await panel.inner_text()
        for sentinel in ["HIDDEN_REVIEW_SENTINEL", "SECRET_REVIEW_SENTINEL", "AGENT_HIDDEN_SENTINEL", "TOOL_REVIEW_SENTINEL", "CSS_HIDDEN_REVIEW_SENTINEL", "EDITABLE_REVIEW_SENTINEL"]:
            assert sentinel not in evidence, f"Excluded content appeared in review UI: {sentinel}"

        browser_stage("review: keyboard choice exports stable decision identity")
        await repeated.scroll_into_view_if_needed()
        group = repeated.get_by_role("radiogroup")
        group_name = await group.get_attribute("aria-label")
        first_option = group.locator('[data-slot="radio"]').first
        await first_option.focus()
        await first_option.press("Space")
        await expect(first_option).to_have_attribute("aria-checked", "true")
        exported = panel.get_by_role("textbox", name="Review decisions JSON", exact=True)
        await expect(exported).to_be_visible()
        packet = json.loads(await exported.input_value())
        fingerprint = await panel.get_attribute("data-review-fingerprint")
        assert packet["schemaVersion"] == 1 and packet["status"] == "selection-only", packet
        assert packet["fingerprint"] == fingerprint and packet["scope"] == "lint-example", packet
        assert packet["OPTIONS"] == [1] and len(packet["decisions"]) == 1, packet
        assert packet["decisions"][0]["ruleId"] == "repeated-subtitle", packet
        assert packet["decisions"][0]["findingId"] == await repeated.get_attribute("data-review-finding"), packet
        assert packet["unresolved"] == base_finding_count - 1, packet
        await expect(fixture.locator(":scope > p")).to_have_text("Account")

        browser_stage("review: agents discover choices but cannot invent human decisions")
        await repeated.scroll_into_view_if_needed()
        choice_control = await _entry(page, "radio", group_name)
        choices = await _choices(page, choice_control)
        assert {str(item["value"]) for item in choices} == {"1", "2"}, choices
        assert choice_control.get("confirm"), choice_control
        refused = await _call(page, "act", {"steps": [{"ref": choice_control["ref"], "action": "setValue", "args": ["2"]}]})
        await expect(first_option).to_have_attribute("aria-checked", "true")
        assert json.loads(await exported.input_value()) == packet
        await panel.get_by_role("button", name="Copy decisions JSON", exact=True).click()
        await expect(panel.locator(".qgr-notice")).to_contain_text(re.compile(r"Decisions copied|Clipboard unavailable"))

        browser_stage("review: ignored content changes preserve current choices")
        await fixture.evaluate("""node => {
            node.querySelector('[hidden] p').textContent = 'CHANGED_HIDDEN_SENTINEL';
            node.querySelector('[data-agent-secret] p').textContent = 'CHANGED_SECRET_SENTINEL';
            node.querySelector('[data-agent-hidden] p').textContent = 'CHANGED_AGENT_HIDDEN_SENTINEL';
            node.querySelector('[data-quantive-review-root] p').textContent = 'CHANGED_TOOL_SENTINEL';
            node.querySelector('#review-visible-text span').textContent = 'CHANGED_CSS_HIDDEN_SENTINEL';
            node.querySelector('input').value = 'CHANGED_EDITABLE_SENTINEL';
        }""")
        await press("Refresh checks")
        await expect_current()
        await expect(panel).to_have_attribute("data-review-fingerprint", fingerprint)
        assert json.loads(await exported.input_value()) == packet
        await repeated.scroll_into_view_if_needed()
        await capture("review-overlay-desktop.png")

        browser_stage("review: finding location decorates without rewriting")
        await repeated.get_by_role("button", name=re.compile(r"^Locate finding \d+$")).click()
        await expect(panel).to_have_attribute("data-review-peek", "true")
        await expect(page.locator("[data-review-highlight]")).to_be_visible()
        await expect(fixture.locator(":scope > p")).to_have_text("Account")
        await panel.get_by_role("button", name="Back to findings", exact=True).click()
        await expect(page.locator("[data-review-highlight]")).to_have_count(0)

        browser_stage("review: changed visible content invalidates selection export")
        await fixture.locator(":scope > p").evaluate("node => { node.textContent = 'Manage your profile details.'; }")
        await expect(panel).to_have_attribute("data-review-stale", "true")
        await expect(panel.get_by_role("button", name="Copy decisions JSON", exact=True)).to_be_disabled()
        await expect(exported).to_have_count(0)
        await press("Refresh checks")
        await expect_current()
        assert await panel.get_attribute("data-review-fingerprint") != fingerprint
        await expect(repeated).to_have_count(0)
        await expect(panel.get_by_role("button", name="Clear choices", exact=True)).to_be_disabled()

        browser_stage("review: Escape closes and restores focus to visible entry")
        await panel.get_by_role("button", name="Close review", exact=True).focus()
        await page.keyboard.press("Escape")
        await expect(panel).not_to_be_visible()
        await expect(trigger).to_be_focused()
        await expect(page.locator("[data-review-highlight]")).to_have_count(0)
        await expect(page.locator("[data-review-example]")).to_have_count(0)
        assert "review" not in dict(parse_qsl(urlsplit(page.url).query))

        browser_stage("review: direct URL keeps the active layout and fits narrow screens")
        viewports = []
        for width in [390, 320]:
            await page.set_viewport_size({"width": width, "height": 844})
            await page.goto(_review_url(base_url, collection="layouts", review="1"), wait_until="networkidle")
            await expect(panel).to_be_visible()
            await expect_current()
            await expect(page.get_by_role("region", name="Responsive application layout study", exact=True)).to_be_visible()
            await expect(panel).to_have_attribute("data-review-source", "page")
            bounds = await panel.bounding_box()
            assert bounds and bounds["x"] >= 0 and bounds["x"] + bounds["width"] <= width + 1, bounds
            fit = await _page_fits(page)
            viewports.append({"width": width, "panel": bounds, "page": fit})
            if width == 390:
                await capture("review-overlay-phone.png")
        await page.emulate_media(reduced_motion="reduce", forced_colors="active")
        await expect(panel.get_by_role("button", name="Refresh checks", exact=True)).to_be_visible()
        await press("Refresh checks")
        await expect_current()
        forced_fit = await _page_fits(page)
        await panel.get_by_role("button", name="Close review", exact=True).click()
        await expect(panel).not_to_be_visible()
        completed = True
        return {
            "fixtureRules": ["repeated-subtitle", "generic-action", "control-name"],
            "excludedContent": ["hidden", "CSS-hidden", "agent-hidden", "secret", "review UI", "editable values"],
            "packet": packet,
            "agentSelectionRefusal": refused,
            "staleExportRefused": True,
            "temporaryHighlightRemoved": True,
            "viewports": viewports,
            "forcedColoursMobile": forced_fit,
            "screenshots": screenshots,
            "limits": "Scripted checks and explicit selections only; no automatic rewriting, semantic certification or human usability approval.",
        }
    finally:
        if completed:
            await page.emulate_media(reduced_motion="no-preference", forced_colors="none")
            if original_viewport:
                await page.set_viewport_size(original_viewport)
