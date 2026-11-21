"""Bounded, seeded geometry checks on the real SDK placement fixture.

Reads geometry and Layout Instability entries without a second application
mutation API. Fixture changes and audits use the public SDK controls.
"""

import json
import random
from pathlib import Path
from time import perf_counter
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from glass_developer_contract import _select
from glass_optics_contract import _act, _call, _entry, browser_stage, SCREENSHOT_TIMEOUT_MS


SEED = 0x51A7
GEOMETRY_TOLERANCE = 1.5
SIDE_GAP = 8
COLLISION_PADDING = 8
FIXTURE = "[data-layout-quality-fixture]"
ANCHOR = "[data-quality-anchor]"
PEER = "[data-quality-peer]"
POPUP = "[data-quality-popup]"
REPORT = "[data-layout-quality-report]"


def _cases():
    rng = random.Random(SEED)
    corners = ["top-start", "top-end", "bottom-start", "bottom-end"]
    cases = [
        {
            "width": width,
            "height": 844 if width < 768 else 900,
            "direction": direction,
            "anchor": corners[(width_index * 2 + direction_index) % len(corners)],
            "content": rng.choice(["short", "long"]),
            "fault": "none",
        }
        for width_index, width in enumerate([320, 390, 768, 1440])
        for direction_index, direction in enumerate(["ltr", "rtl"])
    ]
    rng.shuffle(cases)
    return cases


def _max_drift(before, after):
    return max(abs(before[key] - after[key]) for key in ["x", "y", "width", "height"])


def _assert_stationary(before, after, context, names=("anchor", "peer")):
    for name in names:
        assert _max_drift(before[name], after[name]) <= GEOMETRY_TOLERANCE, {
            "reason": f"{name} moved during popup interaction", "case": context,
            "before": before[name], "after": after[name],
        }


def _assert_popup_geometry(boxes, context):
    anchor, popup = boxes["anchor"], boxes["popup"]
    width, height = boxes["viewport"]["width"], boxes["viewport"]["height"]
    tolerance = GEOMETRY_TOLERANCE
    assert popup and popup["width"] > 0 and popup["height"] > 0, boxes
    assert popup["x"] >= COLLISION_PADDING - tolerance, (context, boxes)
    assert popup["y"] >= COLLISION_PADDING - tolerance, (context, boxes)
    assert popup["x"] + popup["width"] <= width - COLLISION_PADDING + tolerance, (context, boxes)
    assert popup["y"] + popup["height"] <= height - COLLISION_PADDING + tolerance, (context, boxes)
    preferred_side = context.get("preferredSide", "bottom")
    side_fits = {
        "bottom": anchor["y"] + anchor["height"] + SIDE_GAP + popup["height"] <= height - COLLISION_PADDING + tolerance,
        "top": anchor["y"] - SIDE_GAP - popup["height"] >= COLLISION_PADDING - tolerance,
    }
    opposite_side = "top" if preferred_side == "bottom" else "bottom"
    expected_side = preferred_side if side_fits[preferred_side] else opposite_side
    assert side_fits[expected_side], {"reason": "Neither popup side fits this fixture", "case": context, "actual": boxes}
    if "anchor" in context:
        assert expected_side == ("top" if context["anchor"].startswith("bottom") else "bottom"), (context, boxes)
    assert boxes["side"] == expected_side, {
        "reason": "Menu did not resolve its preferred side against the viewport",
        "case": context, "expectedSide": expected_side, "actual": boxes,
    }
    gap = popup["y"] - anchor["y"] - anchor["height"] if expected_side == "bottom" else anchor["y"] - popup["y"] - popup["height"]
    assert abs(gap - SIDE_GAP) <= tolerance, (context, gap, boxes)
    preferred_align = context.get("preferredAlign") or context["anchor"].split("-")[1]
    def aligned_x(alignment):
        physical_start = (alignment == "start") == (context["direction"] == "ltr")
        return anchor["x"] if physical_start else anchor["x"] + anchor["width"] - popup["width"]
    def fits(value):
        return COLLISION_PADDING - tolerance <= value <= width - COLLISION_PADDING - popup["width"] + tolerance
    allowed_alignments = {preferred_align}
    opposite_align = "end" if preferred_align == "start" else "start"
    if not fits(aligned_x(preferred_align)) and fits(aligned_x(opposite_align)):
        allowed_alignments.add(opposite_align)
    assert boxes["align"] in allowed_alignments, (context, allowed_alignments, boxes)
    ideal_x = aligned_x(boxes["align"])
    expected_x = max(COLLISION_PADDING, min(ideal_x, width - COLLISION_PADDING - popup["width"]))
    assert abs(popup["x"] - expected_x) <= tolerance, {
        "reason": "Popup lost logical start/end alignment", "case": context,
        "expectedX": expected_x, "actual": boxes,
    }


async def _boxes(page, *, popup=False):
    return await page.evaluate("""({fixture, anchor, peer, popup, requirePopup}) => {
        const root = document.querySelector(fixture);
        const rect = node => {
            if (!node) return null;
            const r = node.getBoundingClientRect();
            return {x: r.x, y: r.y, width: r.width, height: r.height};
        };
        const menu = document.querySelector(popup);
        if (!root) throw new Error('Placement fixture is missing');
        if (requirePopup && (!menu || !menu.matches('[data-open]'))) throw new Error('SDK menu is not open');
        return {
            anchor: rect(root.querySelector(anchor)), peer: rect(root.querySelector(peer)),
            popup: menu?.matches('[data-open]') ? rect(menu) : null,
            side: menu?.getAttribute('data-side'), align: menu?.getAttribute('data-align'),
            direction: getComputedStyle(root).direction,
            viewport: {width: innerWidth, height: innerHeight},
        };
    }""", {"fixture": FIXTURE, "anchor": ANCHOR, "peer": PEER, "popup": POPUP, "requirePopup": popup})


async def _settled_boxes(page, expect, *, popup=False):
    if popup:
        await _settle_popup(page, expect, POPUP)
    samples = []
    for _ in range(3):
        await page.evaluate("() => new Promise(resolve => requestAnimationFrame(resolve))")
        samples.append(await _boxes(page, popup=popup))
    names = ["anchor", "peer", "popup"] if popup else ["anchor", "peer"]
    for name in names:
        drift = max(_max_drift(samples[0][name], sample[name]) for sample in samples[1:])
        assert drift <= GEOMETRY_TOLERANCE, {"reason": "UI did not settle", "target": name, "samples": samples}
    return samples[-1]


async def _settle_popup(page, expect, selector):
    await expect(page.locator(selector)).to_be_visible()
    await page.wait_for_function("""selector => {
        const node = document.querySelector(selector);
        return node && node.hasAttribute('data-open') &&
            !node.hasAttribute('data-starting-style') && !node.hasAttribute('data-ending-style') &&
            node.getAnimations().every(animation => animation.playState !== 'running');
    }""", arg=selector, timeout=3000)


async def _application_boxes(page, expect, selectors, *, popup=False):
    popup_selector = '[data-slot="menu-content"][data-open]'
    if popup:
        await _settle_popup(page, expect, popup_selector)
    samples = []
    for _ in range(3):
        await page.evaluate("() => new Promise(resolve => requestAnimationFrame(resolve))")
        samples.append(await page.evaluate("""({selectors, popupSelector, requirePopup}) => {
            const rect = node => {
                if (!node) throw new Error('Application control is missing');
                const r = node.getBoundingClientRect();
                return {x: r.x, y: r.y, width: r.width, height: r.height};
            };
            const menu = document.querySelector(popupSelector);
            if (requirePopup && !menu) throw new Error('Application menu is not open');
            return {
                ...Object.fromEntries(Object.entries(selectors).map(([name, selector]) => [name, rect(document.querySelector(selector))])),
                popup: menu ? rect(menu) : null,
                side: menu?.getAttribute('data-side'), align: menu?.getAttribute('data-align'),
                direction: getComputedStyle(document.querySelector(selectors.anchor)).direction,
                viewport: {width: innerWidth, height: innerHeight},
            };
        }""", {"selectors": selectors, "popupSelector": popup_selector, "requirePopup": popup}))
    for name in [*selectors, *(["popup"] if popup else [])]:
        assert max(_max_drift(samples[0][name], sample[name]) for sample in samples[1:]) <= GEOMETRY_TOLERANCE, {
            "reason": "Application controls did not settle", "target": name, "samples": samples,
        }
    return samples[-1]


async def _verify_application_menus(page, expect):
    header = '.qg-app-header '
    workspace = header + '.qg-app-space-menu'
    account = header + '[aria-label="Open account menu"]'
    search = header + '[aria-label="Search application pages"]'
    notifications = header + '[aria-label="Notifications"]'
    dock = '.qg-app-bottom-nav '
    cases = [
        {"label": "Current workspace: Northstar Lab. Switch workspace", "width": 1440, "height": 1000,
         "preferredSide": "bottom", "preferredAlign": "start",
         "selectors": {"anchor": workspace, "search": search, "notifications": notifications, "account": account}},
        {"label": "Open account menu", "width": 1440, "height": 1000,
         "preferredSide": "bottom", "preferredAlign": "end",
         "selectors": {"anchor": account, "workspace": workspace, "search": search, "notifications": notifications}},
        {"label": "More pages", "width": 320, "height": 844,
         "preferredSide": "top", "preferredAlign": "end",
         "selectors": {"anchor": dock + '[aria-label="More pages"]',
                       "reviews": dock + '> [data-slot="button"]:nth-of-type(1)',
                       "projects": dock + '> [data-slot="button"]:nth-of-type(2)'}},
    ]
    evidence = []
    for case in cases:
        browser_stage("layout quality: application menu placement", label=case["label"], width=case["width"])
        await page.set_viewport_size({"width": case["width"], "height": case["height"]})
        trigger = page.locator(case["selectors"]["anchor"])
        await expect(trigger).to_be_visible()
        await trigger.scroll_into_view_if_needed()
        await trigger.focus()
        await page.wait_for_function("""() => document.querySelector('.qg-layout-canvas')
            .getAnimations().every(animation => animation.playState !== 'running')""", timeout=3000)
        before = await _application_boxes(page, expect, case["selectors"])
        context = {**case, "direction": before["direction"]}
        action = await _act(page, await _entry(page, "menu", case["label"]), "setOpen", [True])
        await expect(trigger).to_have_attribute("aria-expanded", "true")
        opened = await _application_boxes(page, expect, case["selectors"], popup=True)
        _assert_stationary(before, opened, context, names=case["selectors"])
        _assert_popup_geometry(opened, context)
        await page.keyboard.press("Escape")
        await expect(page.locator('[data-slot="menu-content"][data-open]')).to_have_count(0)
        await expect(trigger).to_be_focused()
        await expect(trigger).to_have_attribute("aria-expanded", "false")
        closed = await _application_boxes(page, expect, case["selectors"])
        _assert_stationary(before, closed, context, names=case["selectors"])
        evidence.append({"input": context, "openAction": action, "before": before, "opened": opened, "closed": closed, "passed": True})
    return evidence


async def _verify_diagnostics(page, expect):
    browser_stage("layout quality: diagnostics SDK actions and accepted reports")
    await page.set_viewport_size({"width": 1440, "height": 1000})
    diagnostics = page.locator('.qg-layout-diagnostics')
    trigger = diagnostics.locator('[data-slot="collapsible-trigger"]')
    await trigger.scroll_into_view_if_needed()
    control = await _entry(page, "collapsible", "Layout diagnostics")
    await _act(page, control, "setOpen", [False])
    await expect(trigger).to_have_attribute("aria-expanded", "false")
    await _act(page, control, "setOpen", [True])
    await expect(trigger).to_have_attribute("aria-expanded", "true")
    await _settle_popup(page, expect, '.qg-layout-diagnostics [data-slot="collapsible-panel"]')
    await page.wait_for_function("""() => document.querySelector('.qg-layout-canvas')
        .getAnimations().every(animation => animation.playState !== 'running')""", timeout=3000)

    async def press(label):
        await _act(page, await _entry(page, "button", label), "press", [])

    async def report():
        return json.loads(await diagnostics.locator('.qg-layout-diagnostics-report').text_content())

    await press("Capture baseline")
    captured = await report()
    assert captured["baseline"]["status"] == "captured" and captured["baseline"]["targets"], captured
    await expect(diagnostics.get_by_role("button", name="Check layout changes", exact=True)).to_be_enabled()
    await press("Check layout changes")
    checked = await report()
    assert checked["comparison"]["passed"] is True and not checked["comparison"]["findings"], checked
    await press("Start shift recording")
    recording = await report()
    assert recording["shifts"]["supported"] and recording["shifts"]["observation"]["stopped"] is False, recording
    await expect(diagnostics.get_by_role("button", name="Start shift recording", exact=True)).to_be_disabled()
    await expect(diagnostics.get_by_role("button", name="Stop shift recording", exact=True)).to_be_enabled()
    await press("Stop shift recording")
    stopped = await report()
    assert stopped["shifts"]["observation"]["stopped"] is True, stopped
    assert stopped["shifts"]["observation"]["stopReason"] == "manual", stopped
    await expect(diagnostics.get_by_role("button", name="Stop shift recording", exact=True)).to_be_disabled()
    await expect(diagnostics.get_by_role("button", name="Start shift recording", exact=True)).to_be_enabled()
    return {"captured": captured, "checked": checked, "recording": recording, "stopped": stopped}


async def _start_shift_observer(page):
    return await page.evaluate("""fixture => {
        const supported = typeof PerformanceObserver !== 'undefined' &&
            PerformanceObserver.supportedEntryTypes.includes('layout-shift');
        const evidence = {supported, entries: []};
        const rect = value => ({x: value.x, y: value.y, width: value.width, height: value.height});
        window.__layoutQualityTestEvidence = evidence;
        if (supported) {
            evidence.observer = new PerformanceObserver(list => {
                for (const entry of list.getEntries()) {
                    evidence.entries.push({
                        value: entry.value, startTime: entry.startTime,
                        hadRecentInput: entry.hadRecentInput,
                        sources: (entry.sources ?? []).map(source => {
                            const node = source.node?.nodeType === 1 ? source.node : source.node?.parentElement;
                            return {
                                inFixture: !!node?.closest(fixture),
                                target: node?.closest('[data-quality-popup]') ? 'popup' :
                                    node?.closest('[data-quality-anchor]') ? 'anchor' :
                                    node?.closest('[data-quality-peer]') ? 'peer' : node?.tagName,
                                previousRect: rect(source.previousRect), currentRect: rect(source.currentRect),
                            };
                        }),
                    });
                    if (evidence.entries.length > 200) evidence.entries.shift();
                }
            });
            evidence.observer.observe({type: 'layout-shift', buffered: false});
        }
        return supported;
    }""", FIXTURE)


async def _shift_entries(page, since):
    await page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")
    return await page.evaluate("""since => window.__layoutQualityTestEvidence.entries
        .filter(entry => entry.startTime >= since)""", since)


async def verify_layout_quality_contract(page, expect, *, base_url, output_dir):
    started = perf_counter()
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    original_viewport = page.viewport_size
    url = urlsplit(base_url)
    query = dict(parse_qsl(url.query))
    query.update({"collection": "layouts", "quality": "1"})
    target_url = urlunsplit((url.scheme, url.netloc, url.path, urlencode(query), url.fragment))
    evidence = {"seed": SEED, "cases": [], "screenshots": [], "scope": "Real SDK geometry and fault detection; no human review or screenshot-baseline approval."}
    evidence_path = output / "layout-quality-seeded.json"

    async def press(label):
        return await _act(page, await _entry(page, "button", label), "press", [])

    async def open_menu():
        await expect(page.locator(POPUP)).not_to_be_visible()
        control = await _entry(page, "menu", "Quality actions")
        assert "press" in control.get("actions", []), control
        return await _act(page, control, "press", [])

    async def read_report():
        text = await page.locator(REPORT).text_content()
        return json.loads(text) if text and text.strip() else None

    async def audit(*, via_menu=False):
        previous = await read_report()
        if via_menu:
            control = await _entry(page, "menu", "Quality actions")
            queried = await _call(page, "query", {"within": control["ref"]})
            assert isinstance(queried, list), queried
            available = next(item for item in queried if item["ref"] == control["ref"])
            names = {item["label"] for item in available.get("items", [])} | set(available.get("buttons", []))
            assert "Check placement" in names, available
            await _act(page, control, "press", ["Check placement"])
        else:
            await press("Run layout check")
        await page.wait_for_function("""({selector, revision}) => {
            const text = document.querySelector(selector)?.textContent;
            if (!text?.trim()) return false;
            try { return JSON.parse(text).revision > revision; } catch { return false; }
        }""", arg={"selector": REPORT, "revision": previous["revision"] if previous else 0}, timeout=4000)
        result = await read_report()
        assert result and isinstance(result.get("pass"), bool) and isinstance(result.get("findings"), list), result
        return result

    async def configure(case):
        await page.set_viewport_size({"width": case["width"], "height": case["height"]})
        choices = []
        for label, key in [("Fixture direction", "direction"), ("Fixture anchor", "anchor"), ("Fixture content", "content")]:
            choices.append({"control": label, "choice": await _select(page, "select", label, value=case[key])})
        await press("Reset quality fixture")
        await expect(page.locator(FIXTURE)).to_have_attribute("data-quality-baseline", "ready", timeout=3000)
        await expect(page.locator(FIXTURE)).to_have_attribute("dir", case["direction"])
        for choice in choices:
            accepted = await _entry(page, "select", choice["control"])
            assert accepted.get("value") == choice["choice"]["value"], {"choice": choice, "accepted": accepted}
        return choices

    def save():
        evidence_path.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")

    try:
        browser_stage("layout quality: open SDK placement fixture", seed=SEED, url=target_url)
        await page.goto(target_url, wait_until="networkidle")
        await page.wait_for_function("() => typeof window.quantitativeHciAgent?.snapshot === 'function'")
        evidence["applicationMenus"] = await _verify_application_menus(page, expect)
        evidence["diagnostics"] = await _verify_diagnostics(page, expect)
        save()
        await _act(page, await _entry(page, "dialog", "Open placement lab"), "setOpen", [True])
        fixture_dialog = page.get_by_role("dialog", name="Layout quality fixtures", exact=True)
        await expect(fixture_dialog).to_be_visible()
        await expect(page.locator(FIXTURE)).to_have_attribute("data-quality-baseline", "ready", timeout=3000)

        # SDK controller-opened popups return to prior focus; trigger-opened ones return to the trigger.
        browser_stage("layout quality: imperative popup focus restoration")
        dialog_close = fixture_dialog.get_by_role("button", name="Close placement lab", exact=True)
        await expect(dialog_close).to_be_focused()
        control = await _entry(page, "menu", "Quality actions")
        assert "setOpen" in control.get("actions", []), control
        imperative_open = await _act(page, control, "setOpen", [True])
        await expect(page.locator(POPUP)).to_be_visible()
        await expect(page.locator(POPUP).get_by_role("menuitem", name="Check placement", exact=True)).to_be_focused()
        await page.keyboard.press("Escape")
        await expect(page.locator(POPUP)).not_to_be_visible()
        await expect(fixture_dialog).to_be_visible()
        await expect(dialog_close).to_be_focused()
        evidence["imperativeFocus"] = {
            "openAction": imperative_open, "priorFocus": "Close placement lab",
            "returnedFocus": "Close placement lab", "dialogRetained": True, "passed": True,
        }
        save()
        assert await _start_shift_observer(page), "This Chromium contract requires Layout Instability observations"

        for index, case in enumerate(_cases()):
            browser_stage("layout quality: seeded healthy case", seed=SEED, index=index, case=case)
            print(f"LAYOUT_QUALITY seed={SEED} case={index} input={json.dumps(case, sort_keys=True)}", flush=True)
            current = {"index": index, "input": case}
            evidence["cases"].append(current)
            save()
            current["configuredChoices"] = await configure(case)
            before = await _settled_boxes(page, expect)
            if index == 0:
                # Establish the input target before a genuine keyboard activation, never after dismissal.
                await page.locator(ANCHOR).focus()
                await page.locator(ANCHOR).press("Enter")
                current["openRoute"] = "keyboard"
            else:
                current["openAction"] = await open_menu()
                current["openRoute"] = "agent-trigger-press"
            opened = await _settled_boxes(page, expect, popup=True)
            _assert_stationary(before, opened, case)
            _assert_popup_geometry(opened, case)
            current.update({"before": before, "opened": opened, "auditRoute": "menu" if index == 1 else "button",
                            "report": await audit(via_menu=index == 1)})
            assert current["report"]["pass"], {"case": case, "report": current["report"]}
            assert not current["report"]["findings"], {"case": case, "report": current["report"]}
            if index == 0:
                filename = "layout-quality-healthy.png"
                await page.screenshot(path=str(output / filename), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
                evidence["screenshots"].append(filename)
            await page.keyboard.press("Escape")
            await expect(page.locator(POPUP)).not_to_be_visible()
            await expect(fixture_dialog).to_be_visible()
            await expect(page.locator(ANCHOR)).to_be_focused()
            closed = await _settled_boxes(page, expect)
            _assert_stationary(before, closed, case)
            current.update({"closed": closed, "passed": True})
            save()

        fault_case = {"width": 768, "height": 900, "direction": "rtl", "anchor": "top-end", "content": "long"}
        fault_codes = {
            "anchor-offset": "popup-anchor-drift",
            "overflow": "popup-overflow",
            "overlap": "popup-overlap",
        }
        for fault, expected_code in fault_codes.items():
            case = {**fault_case, "fault": fault}
            browser_stage("layout quality: intentional fault", seed=SEED, case=case, expectedCode=expected_code)
            current = {"index": len(evidence["cases"]), "input": case, "expectedCode": expected_code}
            print(f"LAYOUT_QUALITY seed={SEED} case={current['index']} input={json.dumps(case, sort_keys=True)}", flush=True)
            evidence["cases"].append(current)
            current["configuredChoices"] = await configure(case)
            before = await _settled_boxes(page, expect)
            if fault == "overlap":
                # Real keyboard input establishes the browser's recent-input window.
                await page.locator(ANCHOR).focus()
                await page.locator(ANCHOR).press("Enter")
            else:
                await open_menu()
            healthy = await _settled_boxes(page, expect, popup=True)
            _assert_stationary(before, healthy, case)
            _assert_popup_geometry(healthy, case)
            if fault == "overlap":
                await page.keyboard.press("ArrowDown")
            start = await page.evaluate("performance.now()")
            choice = await _select(page, "select", "Fixture fault", value=fault)
            broken = await _settled_boxes(page, expect, popup=True)
            shifts = await _shift_entries(page, start)
            report = await audit()
            codes = [finding["code"] for finding in report["findings"]]
            current.update({"faultChoice": choice, "before": healthy, "after": broken,
                            "report": report, "observedShifts": shifts})
            save()
            assert not report["pass"] and expected_code in codes, {
                "reason": "Intentional geometry fault escaped the detector",
                "seed": SEED, "case": case, "expectedCode": expected_code, "report": report,
            }
            if fault == "overlap":
                recent = [entry for entry in shifts if entry["hadRecentInput"] and entry["value"] > 0 and
                          any(source.get("target") == "popup" for source in entry["sources"])]
                assert recent, {
                    "reason": "Recent-input layout movement was not observed", "case": case, "shifts": shifts,
                }
                observed = report["shifts"]
                assert observed["supported"] and observed["scoreComplete"], observed
                assert observed["counts"]["recentInput"] > 0 and observed["recentInputShiftValue"] > 0, observed
                assert observed["cls"] is not None and observed["cls"] <= observed["unexpectedShiftValue"], observed
                assert any(sample["hadRecentInput"] and sample["value"] > 0 and
                           abs(sample["startTime"] - entry["startTime"]) < .1 and
                           abs(sample["value"] - entry["value"]) < 1e-8
                           for sample in observed["samples"] for entry in recent), {
                    "reason": "Published diagnostics omitted the independently observed recent-input popup shift",
                    "independent": recent, "published": observed,
                }
                filename = "layout-quality-detected-overlap.png"
                await page.screenshot(path=str(output / filename), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
                evidence["screenshots"].append(filename)
            # A human choosing a fixture Select closes the menu. Its defect must
            # survive the SDK's fresh positioning calculation on the next open.
            await page.keyboard.press("Escape")
            await expect(page.locator(POPUP)).not_to_be_visible()
            await expect(fixture_dialog).to_be_visible()
            await expect(page.locator(ANCHOR)).to_be_focused()
            await page.locator(ANCHOR).press("Enter")
            reopened = await _settled_boxes(page, expect, popup=True)
            _assert_stationary(before, reopened, case)
            await expect(page.locator(POPUP)).to_have_attribute("data-fault", fault)
            reopened_report = await audit(via_menu=True)
            current.update({"reopened": reopened, "reopenedReport": reopened_report})
            save()
            assert not reopened_report["pass"] and expected_code in [
                finding["code"] for finding in reopened_report["findings"]
            ], {"reason": "Intentional fault disappeared after reopening the menu", "case": case,
                "expectedCode": expected_code, "report": reopened_report}
            current["passed"] = True
            await press("Reset quality fixture")
            await expect(page.locator(FIXTURE)).to_have_attribute("data-quality-baseline", "ready", timeout=3000)
            await expect(page.locator(POPUP)).not_to_be_visible()
            save()

        case = {**fault_case, "fault": "none"}
        browser_stage("layout quality: reset clears faults", seed=SEED, case=case)
        print(f"LAYOUT_QUALITY seed={SEED} case=11 input={json.dumps(case, sort_keys=True)}", flush=True)
        before = await _settled_boxes(page, expect)
        await open_menu()
        opened = await _settled_boxes(page, expect, popup=True)
        _assert_stationary(before, opened, case)
        _assert_popup_geometry(opened, case)
        recovered = await audit()
        assert recovered["pass"] and not recovered["findings"], recovered
        evidence["cases"].append({"index": len(evidence["cases"]), "input": case,
                                  "report": recovered, "opened": opened, "passed": True})
        assert len(evidence["cases"]) == 12, evidence
        await page.keyboard.press("Escape")
        await expect(page.locator(POPUP)).not_to_be_visible()
        await expect(fixture_dialog).to_be_visible()
        await expect(page.locator(ANCHOR)).to_be_focused()
        refusal = await audit()
        assert not refusal["pass"] and "missing-popup" in [finding["code"] for finding in refusal["findings"]], refusal
        evidence["closedPopupRefusal"] = refusal
        evidence["caseCount"] = len(evidence["cases"])
        evidence["durationSeconds"] = round(perf_counter() - started, 3)
        return {**evidence, "evidence": evidence_path.name}
    finally:
        evidence["durationSeconds"] = round(perf_counter() - started, 3)
        save()
        if not page.is_closed():
            await page.evaluate("() => window.__layoutQualityTestEvidence?.observer?.disconnect()")
        if original_viewport and not page.is_closed():
            await page.set_viewport_size(original_viewport)
