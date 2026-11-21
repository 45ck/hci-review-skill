"""Motion collection contracts through the existing SDK agent and real input.

This module uses the caller's browser page. Motion proves accepted host state;
an agent dispatch result alone is never treated as evidence of a state change.
"""

import json
from pathlib import Path
from urllib.parse import parse_qsl, unquote, urlencode, urlsplit, urlunsplit

from glass_developer_contract import _choices, _named_controls, _page_fits, _select
from glass_optics_contract import SCREENSHOT_TIMEOUT_MS, _act, _call, _entry, browser_stage


async def verify_motion_collection_contract(page, expect, *, base_url, output_dir):
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    original_viewport = page.viewport_size
    screenshots = []
    completed = False
    location = urlsplit(base_url)
    query = dict(parse_qsl(location.query))
    query["collection"] = "motion"
    motion_url = urlunsplit(location._replace(query=urlencode(query)))
    await page.emulate_media(reduced_motion="no-preference", forced_colors="none")
    await page.goto(motion_url, wait_until="networkidle")
    await page.wait_for_function("() => typeof window.quantitativeHciAgent?.snapshot === 'function'")
    stage = page.locator('[data-kit-view="motion"]')
    await expect(stage).to_be_visible()
    await expect(stage).to_have_attribute("data-validation", "unvalidated")
    assert (await _entry(page, "listbox", "Component catalogue"))["value"] == "motion"
    await expect(stage.locator("[data-motion-effective]")).to_have_attribute("data-motion-effective", "enabled")
    named = {"icons": await _named_controls(page)}

    async def press(label):
        return await _act(page, await _entry(page, "button", label), "press", [])

    async def toggle(label, value):
        return await _act(page, await _entry(page, "toggle", label), "setPressed", [value])

    async def category(value):
        await _select(page, "segmented-control", "Motion study category", value=value)
        await expect(stage).to_have_attribute("data-motion-section", value)

    async def capture(name, target=None):
        if target is not None:
            await target.scroll_into_view_if_needed()
        await page.screenshot(path=str(output / name), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
        screenshots.append(name)

    async def geometry(icon):
        return await icon.locator('[data-qgm-variant="line"] [data-qgm-part]').evaluate_all(
            "nodes => nodes.map(node => ({d: node.getAttribute('d'), opacity: node.getAttribute('opacity')}))")

    async def refused(entry, action, args):
        return await _call(page, "act", {"steps": [{"ref": entry["ref"], "action": action, "args": args}]})

    try:
        browser_stage("motion: deep link, discoverable controls and persistent accepted morph")
        sections = await _choices(page, await _entry(page, "segmented-control", "Motion study category"))
        assert {item["value"] for item in sections} == {"icons", "interface", "work", "recipes"}, sections
        playback = stage.get_by_role("button", name="Preview playback", exact=True)
        morph = playback.locator('[data-liquid-morph="play-pause"]')
        playback_state = stage.locator("[data-playback-state]")
        await playback.scroll_into_view_if_needed()
        await expect(playback).to_have_attribute("aria-pressed", "false")
        await expect(morph).to_have_attribute("data-motion-progress", "0.0000")
        initial_geometry = await geometry(morph)
        accepted = await toggle("Preview playback", True)
        await expect(playback).to_have_attribute("aria-pressed", "true")
        await expect(playback_state).to_have_attribute("data-playback-state", "playing")
        await expect(morph).to_have_attribute("data-motion-progress", "1.0000")
        await expect(morph).to_have_attribute("data-motion-status", "idle")
        playing_geometry = await geometry(morph)
        assert initial_geometry != playing_geometry, "The accepted playback state did not change the SVG geometry"
        assert (await _entry(page, "toggle", "Preview playback"))["pressed"] is True

        browser_stage("motion: keyboard parity and reversal settle at the latest host value")
        await playback.focus()
        await playback.press("Space")
        await expect(playback).to_have_attribute("aria-pressed", "false")
        await expect(playback_state).to_have_attribute("data-playback-state", "paused")
        await expect(morph).to_have_attribute("data-motion-progress", "0.0000")
        await playback.press("Enter")
        await expect(playback).to_have_attribute("aria-pressed", "true")
        await expect(morph).to_have_attribute("data-motion-progress", "1.0000")
        await toggle("Preview playback", False)
        await expect(morph).to_have_attribute("data-motion-progress", "0.0000")
        await morph.evaluate("""node => {
            const probe = window.__motionMorphProbe = {samples: []};
            probe.observer = new MutationObserver(() => {
                probe.samples.push(Number(node.dataset.motionProgress));
            });
            probe.observer.observe(node, {attributes: true, attributeFilter: ['data-motion-progress']});
        }""")
        await toggle("Preview playback", True)
        await page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")
        await toggle("Preview playback", False)
        await expect(playback).to_have_attribute("aria-pressed", "false")
        await expect(morph).to_have_attribute("data-motion-progress", "0.0000")
        await expect(morph).to_have_attribute("data-motion-status", "idle")
        reversal = await page.evaluate("""() => {
            const probe = window.__motionMorphProbe;
            probe.observer.disconnect();
            return {samples: probe.samples};
        }""")
        assert any(0 < value < 1 for value in reversal["samples"]), reversal
        assert await geometry(morph) == initial_geometry, "Rapid reversal retained obsolete playback geometry"
        await capture("motion-icons-desktop.png", playback)

        browser_stage("motion: all ten named morph pairs expose both stable endpoints")
        morph_pairs = [
            ("play-pause", "playback"), ("menu-close", "menu"), ("plus-minus", "disclosure"),
            ("chevron", "direction"), ("volume-mute", "sound"), ("lock-unlock", "access"),
            ("bookmark-saved", "bookmark"), ("eye-hidden", "visibility"),
            ("expand-restore", "view size"), ("heart-saved", "favourite"),
        ]
        await _select(page, "select", "Motion preference", value="reduced")
        await expect(stage.locator("[data-motion-effective]")).to_have_attribute("data-motion-effective", "reduced")
        pair_evidence = []
        for pair, name in morph_pairs:
            label = f"Preview {name} morph"
            control = stage.get_by_role("button", name=label, exact=True)
            icon = control.locator(f'[data-liquid-morph="{pair}"]')
            before = await geometry(icon)
            await toggle(label, True)
            await expect(control).to_have_attribute("aria-pressed", "true")
            immediate = await icon.evaluate("node => ({progress: node.dataset.motionProgress, status: node.dataset.motionStatus})")
            assert immediate == {"progress": "1.0000", "status": "idle"}, (pair, immediate)
            assert await geometry(icon) != before, f"{pair} has identical endpoint geometry"
            await toggle(label, False)
            assert await icon.get_attribute("data-motion-progress") == "0.0000", pair
            assert await geometry(icon) == before, f"{pair} did not reverse to its original geometry"
            pair_evidence.append(pair)

        browser_stage("motion: scoped off and device reduction preserve final values")
        await _select(page, "select", "Motion preference", value="off")
        await expect(stage.locator("[data-motion-effective]")).to_have_attribute("data-motion-effective", "off")
        await toggle("Preview playback", True)
        assert await morph.get_attribute("data-motion-progress") == "1.0000"
        assert await morph.get_attribute("data-motion-status") == "idle"
        await _select(page, "select", "Motion preference", value="system")
        await page.emulate_media(reduced_motion="reduce", forced_colors="none")
        await expect(stage.locator("[data-motion-effective]")).to_have_attribute("data-motion-effective", "reduced")
        await toggle("Preview playback", False)
        assert await morph.get_attribute("data-motion-progress") == "0.0000"
        assert await morph.get_attribute("data-motion-status") == "idle"
        await page.emulate_media(reduced_motion="no-preference", forced_colors="none")
        await expect(stage.locator("[data-motion-effective]")).to_have_attribute("data-motion-effective", "enabled")

        browser_stage("motion: shared selection follows acceptance and respects cancellation")
        await category("interface")
        named["interface"] = await _named_controls(page)
        selection = stage.locator(".qgm-shared-selection")
        layout = stage.locator(".mg-layout-preview")
        choices = await _choices(page, await _entry(page, "segmented-control", "Motion layout selection"))
        assert {item["value"] for item in choices} == {"list", "grid", "board"}, choices
        await _select(page, "segmented-control", "Motion layout selection", value="grid")
        await expect(layout).to_have_attribute("data-view", "grid")
        assert (await _entry(page, "segmented-control", "Motion layout selection"))["value"] == "grid"
        await expect(selection.locator(".qgm-shared-indicator")).to_be_visible()
        assert await selection.locator(".qgm-shared-indicator").evaluate("node => getComputedStyle(node).pointerEvents") == "none"
        await toggle("Lock motion layout selection", True)
        cancelled_selection = await refused(await _entry(page, "segmented-control", "Motion layout selection"), "setValue", ["board"])
        await expect(layout).to_have_attribute("data-view", "grid")
        assert (await _entry(page, "segmented-control", "Motion layout selection"))["value"] == "grid", cancelled_selection
        await expect(stage.get_by_text("Selection held. Unlock to change the layout.", exact=True)).to_be_visible()
        await toggle("Lock motion layout selection", False)
        await _select(page, "segmented-control", "Motion layout selection", value="board")
        await expect(layout).to_have_attribute("data-view", "board")

        browser_stage("motion: keyed add, reorder and remove keep surviving DOM identity")
        collection = stage.get_by_role("list", name="Motion study collection", exact=True)
        await collection.evaluate("""node => {
            window.__motionRows = new Map([...node.children].map(row => [row.dataset.motionItem, row]));
        }""")
        await press("Add study")
        await expect(stage.locator("[data-motion-row-count]")).to_have_attribute("data-motion-row-count", "4")
        await press("Reverse studies")
        order = await collection.locator("[data-motion-item]").evaluate_all("nodes => nodes.map(node => node.dataset.motionItem)")
        assert order == ["new-1", "review", "material", "coast"], order
        identity = await collection.evaluate("""node => [...node.children]
            .filter(row => window.__motionRows.has(row.dataset.motionItem))
            .every(row => window.__motionRows.get(row.dataset.motionItem) === row)""")
        assert identity, "Reordering replaced stable list items"
        await press("Remove last study")
        await expect(stage.locator("[data-motion-row-count]")).to_have_attribute("data-motion-row-count", "3")
        await expect(collection.locator('[data-motion-item="coast"]')).to_have_count(0)
        await expect(collection.locator("[data-motion-item]")).to_have_count(3)
        await expect(collection.locator('[data-motion-running="true"]')).to_have_count(0)

        browser_stage("motion: presence removal and accessible numbers follow accepted props")
        await toggle("Show motion notice", False)
        presence = stage.locator(".mg-presence-stage .qgm-presence")
        exiting = await stage.evaluate("""node => {
            const presence = node.querySelector('.mg-presence-stage .qgm-presence');
            return presence ? {hidden: presence.getAttribute('aria-hidden'), inert: presence.inert} : null;
        }""")
        if exiting is not None:
            assert exiting == {"hidden": "true", "inert": True}, f"Exiting presence remained interactive: {exiting}"
        await expect(presence).to_have_count(0)
        await toggle("Show motion notice", True)
        await expect(presence).to_have_attribute("data-presence", "present")
        await expect(stage.get_by_text("Your study is ready", exact=True)).to_be_visible()
        await press("Advance sample batch")
        number = stage.get_by_label("Processed records", exact=True)
        await expect(number).to_have_attribute("data-motion-value", "160")
        await expect(number.locator(".qgm-visually-hidden")).to_have_text("160")
        await expect(number.locator('[aria-hidden="true"]')).to_have_text("160")
        await expect(number).not_to_have_attribute("data-motion-running", "true")

        browser_stage("motion: dialog keyboard dismissal restores the original trigger")
        trigger = stage.get_by_role("button", name="Open material study details", exact=True)
        await trigger.focus()
        await trigger.press("Enter")
        dialog = page.get_by_role("dialog", name="Material study details", exact=True)
        await expect(dialog).to_be_visible()
        await page.wait_for_function("() => document.querySelector('.mg-detail-dialog')?.contains(document.activeElement)")
        await page.keyboard.press("Escape")
        await expect(dialog).not_to_be_visible()
        await expect(trigger).to_be_focused()
        await capture("motion-interface-desktop.png", selection)

        browser_stage("motion: asynchronous SDK pending, duplicate suppression and cancel")
        await category("work")
        named["work"] = await _named_controls(page)
        status = stage.locator("[data-sample-phase]")
        run_button = stage.get_by_role("button", name="Run local sample", exact=True)
        artifact_link = stage.locator('a[data-motion-artifact="material-study"]')
        await expect(artifact_link).to_have_count(0)

        async def start_sample():
            button = await _entry(page, "button", "Run local sample")
            assert "press" in button["actions"], button
            await page.evaluate("""ref => {
                window.__motionRequest = window.quantitativeHciAgent.act({steps: [{ref, action: 'press', args: []}]});
            }""", button["ref"])
            await expect(status).to_have_attribute("data-sample-phase", "pending")
            await expect(run_button).to_have_attribute("aria-busy", "true")
            await expect(artifact_link).to_have_count(0)

        await start_sample()
        first_id = await stage.locator('.mg-work-events [data-motion-item]').first.get_attribute("data-motion-item")
        duplicate = await refused(await _entry(page, "button", "Run local sample"), "press", [])
        await expect(status).to_have_attribute("data-sample-phase", "pending")
        assert await stage.locator('.mg-work-events [data-motion-item]').first.get_attribute("data-motion-item") == first_id, duplicate
        outcome_refusal = await refused(await _entry(page, "segmented-control", "Local sample outcome"), "setValue", ["error"])
        assert (await _entry(page, "segmented-control", "Local sample outcome"))["value"] == "success", outcome_refusal
        await press("Cancel local sample")
        await expect(status).to_have_attribute("data-sample-phase", "cancelled")
        await expect(run_button).not_to_have_attribute("aria-busy", "true")
        await expect(artifact_link).to_have_count(0)
        cancelled_run = await page.evaluate("window.__motionRequest")
        assert cancelled_run.get("ok"), cancelled_run
        cancelled_events = await stage.locator(".mg-work-events").inner_text()
        await page.wait_for_timeout(1950)
        await expect(status).to_have_attribute("data-sample-phase", "cancelled")
        await expect(artifact_link).to_have_count(0)
        assert await stage.locator(".mg-work-events").inner_text() == cancelled_events, "Cancelled work committed a late result"

        browser_stage("motion: explicit fixture error and retry expose actual accepted result")
        await _select(page, "segmented-control", "Local sample outcome", value="error")
        failed_run = await refused(await _entry(page, "button", "Run local sample"), "press", [])
        assert not failed_run.get("ok"), failed_run
        await expect(status).to_have_attribute("data-sample-phase", "error")
        await expect(artifact_link).to_have_count(0)
        await expect(stage.get_by_role("button", name="Retry local sample", exact=True)).to_be_visible()
        await expect(stage.locator(".qgm-feedback")).to_have_attribute("data-motion-status", "error")
        retry = await press("Retry local sample")
        await expect(status).to_have_attribute("data-sample-phase", "success")
        await expect(status).to_contain_text("material-study.json")
        await expect(stage.locator(".qgm-feedback")).to_have_attribute("data-motion-status", "success")
        await expect(stage.locator('.mg-work-events [data-event-state="working"]')).to_have_count(0)
        await expect(stage.locator('.mg-work-events [data-event-state="complete"]')).to_have_count(3)
        await expect(artifact_link).to_be_visible()
        await _entry(page, "button", "Download sample artifact")
        artifact_href = await artifact_link.get_attribute("href")
        prefix = "data:application/json;charset=utf-8,"
        assert artifact_href and artifact_href.startswith(prefix), "Accepted work did not expose a JSON artifact"
        assert await artifact_link.get_attribute("download") == "material-study.json"
        artifact = json.loads(unquote(artifact_href[len(prefix):]))
        registry = json.loads((Path(__file__).resolve().parents[1] / "packages/liquid-glass/motion-recipes.json").read_text(encoding="utf-8"))
        registered = {recipe["id"]: recipe for recipe in registry["recipes"]}
        assert artifact["schemaVersion"] == 1 and artifact["kind"] == "quantive-motion-plan", artifact
        assert artifact["source"] == "local-motion-fixture", artifact
        assert artifact["registry"] == {"schemaVersion": registry["schemaVersion"], "recipeCount": len(registered)}, artifact["registry"]
        assert artifact["policyAtRunStart"] == {"preset": "responsive", "mode": "system", "effective": "enabled"}, artifact["policyAtRunStart"]
        assert [step["target"] for step in artifact["steps"]] == ["playback", "list", "dialog", "number", "async-action"]
        for step in artifact["steps"]:
            recipe = step["recipe"]
            assert recipe == registered.get(recipe["id"]), f"Artifact recipe differs from the registered specification: {recipe}"
            assert recipe["intent"] == step["intent"] and step["target"] in recipe["targets"], step
            assert step["presentation"] == "animate" and str(step["reason"]).strip(), step
        artifact_evidence = {"filename": "material-study.json", "kind": artifact["kind"],
                             "policyAtRunStart": artifact["policyAtRunStart"],
                             "recipeIds": [step["recipe"]["id"] for step in artifact["steps"]]}

        browser_stage("motion: graph commands reject stale context and host-cancelled changes")
        workflow = stage.get_by_role("region", name="Motion workflow", exact=True)
        scene = stage.locator('[data-motion-scene="workflow-scene"]')
        await expect(workflow).to_have_attribute("data-motion-state", "idle")
        workflow_control = await _entry(page, "liquid-motion-state", "Motion workflow")
        assert "send" in workflow_control["actions"], workflow_control
        events = await _choices(page, workflow_control)
        assert {item["value"] for item in events} == {"start"}, events
        started_workflow = await _act(page, workflow_control, "send", ["start", "idle"])
        await expect(workflow).to_have_attribute("data-motion-state", "running")
        await expect(scene).to_have_attribute("data-scene-state", "running")
        stale = await refused(await _entry(page, "liquid-motion-state", "Motion workflow"), "send", ["pause", "idle"])
        await expect(workflow).to_have_attribute("data-motion-state", "running")
        await toggle("Allow workflow changes", False)
        denied = await refused(await _entry(page, "liquid-motion-state", "Motion workflow"), "send", ["pause", "running"])
        await expect(workflow).to_have_attribute("data-motion-state", "running")
        await expect(scene).to_have_attribute("data-scene-state", "running")
        await expect(stage.get_by_label("Workflow acceptance", exact=True)).to_contain_text("Change refused.")
        acceptance = await stage.get_by_label("Workflow acceptance", exact=True).inner_text()
        await toggle("Allow workflow changes", True)
        await _act(page, await _entry(page, "liquid-motion-state", "Motion workflow"), "send", ["pause", "running"])
        await expect(workflow).to_have_attribute("data-motion-state", "paused")
        resume = workflow.get_by_role("button", name="Resume workflow", exact=True)
        await resume.focus()
        await resume.press("Enter")
        await expect(workflow).to_have_attribute("data-motion-state", "running")
        await _act(page, await _entry(page, "liquid-motion-state", "Motion workflow"), "send", ["complete", "running"])
        await expect(workflow).to_have_attribute("data-motion-state", "complete")
        await expect(scene).to_have_attribute("data-scene-state", "complete")
        await _act(page, await _entry(page, "liquid-motion-state", "Motion workflow"), "send", ["reset", "complete"])
        await expect(workflow).to_have_attribute("data-motion-state", "idle")
        await expect(scene).to_have_attribute("data-scene-state", "idle")
        await capture("motion-work-desktop.png", status)

        browser_stage("motion: responsive and forced-colour controls retain real state")
        await page.set_viewport_size({"width": 390, "height": 844})
        mobile_fit = await _page_fits(page)
        await expect(status).to_have_attribute("data-sample-phase", "success")
        await capture("motion-work-mobile.png", workflow)
        await page.emulate_media(reduced_motion="reduce", forced_colors="active")
        await expect(stage.locator("[data-motion-effective]")).to_have_attribute("data-motion-effective", "off")
        forced_fit = await _page_fits(page)
        await _act(page, await _entry(page, "liquid-motion-state", "Motion workflow"), "send", ["start", "idle"])
        await expect(workflow).to_have_attribute("data-motion-state", "running")
        await expect(scene).to_have_attribute("data-scene-state", "running")
        assert await scene.evaluate("node => node.getAnimations({subtree: true}).filter(animation => animation.playState === 'running').length") == 0

        browser_stage("motion: recipe chooser explains accepted change and suppresses repeated decoration")
        await category("recipes")
        named["recipes"] = await _named_controls(page)
        recipe = stage.locator("[data-recipe-presentation]")
        await expect(recipe).to_have_attribute("data-recipe-id", "icon.play-pause")
        await expect(recipe).to_have_attribute("data-recipe-presentation", "instant")
        await toggle("Explain accepted change", False)
        await expect(recipe).to_have_attribute("data-recipe-presentation", "none")
        await expect(recipe).to_have_attribute("data-recipe-id", "none")
        await toggle("Explain accepted change", True)
        await _select(page, "select", "Motion purpose", value="attention")
        await toggle("Frequent motion", True)
        await expect(recipe).to_have_attribute("data-recipe-presentation", "none")
        await toggle("Frequent motion", False)
        await expect(recipe).to_have_attribute("data-recipe-presentation", "instant")
        await page.emulate_media(reduced_motion="no-preference", forced_colors="none")
        await expect(stage.locator("[data-motion-effective]")).to_have_attribute("data-motion-effective", "enabled")
        await expect(recipe).to_have_attribute("data-recipe-presentation", "animate")
        source_links = await stage.locator(".mg-source-links a").evaluate_all(
            "nodes => nodes.map(node => ({label: node.textContent.trim(), href: node.href}))")
        assert len(source_links) == 11 and all(link["href"].startswith("https://") for link in source_links), source_links
        completed = True
        return {
            "namedControls": named, "categories": sections,
            "morph": {"accepted": accepted, "keyboardParity": True, "rapidReverse": reversal,
                      "endpointPairs": pair_evidence, "scopedOff": True, "deviceReduction": True},
            "selection": {"choices": choices, "cancelledDispatch": cancelled_selection, "acceptedValue": "board"},
            "collection": {"reversedIds": order, "survivingDomIdentity": identity, "removedImmediately": "coast"},
            "presence": {"boundedRemoval": True, "restored": True},
            "number": {"accessibleFinalValue": 160}, "dialog": {"keyboardFocusReturned": True},
            "async": {"cancelled": cancelled_run, "duplicate": duplicate, "noLateCompletion": True,
                      "failure": failed_run, "retry": retry, "acceptedPhase": "success", "artifact": artifact_evidence},
            "workflow": {"initialEvents": events, "acceptedStart": started_workflow, "staleDispatch": stale,
                         "cancelledDispatch": denied, "visibleAcceptance": acceptance, "keyboardResume": True},
            "recipes": {"reducedEndpoint": True, "noChangeSuppressed": True, "frequentAttentionSuppressed": True,
                        "sources": source_links},
            "mobile": {"viewport": {"width": 390, "height": 844}, "fit": mobile_fit},
            "forcedColours": {"fit": forced_fit, "immediateSceneEndpoint": True}, "screenshots": screenshots,
        }
    finally:
        await page.evaluate("""() => {
            window.__motionMorphProbe?.observer.disconnect();
            delete window.__motionMorphProbe;
            delete window.__motionRows;
            delete window.__motionRequest;
        }""")
        if completed:
            await page.emulate_media(reduced_motion="no-preference", forced_colors="none")
            if original_viewport:
                await page.set_viewport_size(original_viewport)
