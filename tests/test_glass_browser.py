"""Verify real Liquid Glass kit controls, SDK actions and WebGPU pixels.

Run against a production preview. Scripted checks are not human-study or
optical-equivalence evidence. Software GPU is limited to a reviewed local build.
"""

import argparse
import asyncio
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import sys
import traceback
from time import perf_counter
from urllib.parse import urlparse

from glass_agent_contract import verify_agent_contract, verify_agent_tasks_contract
from glass_appearance_contract import verify_appearance_contract
from glass_browser_diagnostics import start_browser_profile
from glass_developer_contract import verify_developer_contract, verify_visual_contract
from glass_graphics_contract import verify_graphics_contract
from glass_model_document_contract import verify_model_document_contract
from glass_standards_contract import verify_standards_contract
from glass_optics_contract import (
    SCREENSHOT_TIMEOUT_MS,
    _assert_rect_alignment,
    _difference,
    arm_popup_render_timeline,
    begin_browser_check,
    browser_check_trace,
    browser_stage,
    configure_material,
    finish_popup_render_timeline,
    motion_diagnostics,
    settled_motion,
    verify_drawer_motion_contract,
    verify_motion_contract,
    verify_optics_contract,
    verify_pointer_motion,
    verify_suppressed_motion,
)

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "packages/liquid-glass/component-manifest.json"
BROWSER_CHECK_NAMES = (
    "default_glass_kit_overview",
    "gpu_on_actual_controls_strength_and_backdrop",
    "visible_pointer_ripple_selection_and_idle",
    "native_drawer_settle_tracks_gpu_with_motion_on_and_off",
    "real_sdk_agent_contract",
    "all_55_families_render_and_have_agent_names",
    "keyboard_selection_and_real_popup",
    "mobile_overview_fits_and_remains_usable",
    "font_icon_presets_state_and_export",
    "uml_uwe_selection_editing_exports_and_access",
    "standards_catalogue_46_views_and_model_editing",
    "model_document_atomic_agent_commands_and_human_history",
    "agent_tasks_review_and_artifacts",
    "graphics_agent_human_edits_history_and_exports",
    "visual_media_gallery_comparison_and_dialogs",
    "system_preferences_explicit_opt_in_and_forced_colours",
    "unavailable_gpu_css_motion_and_popup",
    "short_overview_motion_video",
)


async def run(args):
    from playwright.async_api import async_playwright, expect

    started = perf_counter()
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    components = manifest["components"]
    expected_ids = sorted(item["id"] for item in components)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    report = {
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "baseUrl": args.base_url,
        "commit": os.environ.get("GITHUB_SHA"),
        "sdkVersion": manifest["sdkVersion"],
        "upstreamCommit": manifest["upstreamCommit"],
        "popupTimelineRequested": args.popup_timeline,
        "fullSuite": args.check is None,
        "selectedChecks": [args.check] if args.check is not None else list(BROWSER_CHECK_NAMES),
        "releaseGatePassed": False,
        "scope": "Scripted real-control, agent, keyboard, preference, responsive-layout and GPU pixel evidence; not a human study or optical-equivalence claim.",
        "checks": [],
    }
    page_errors, console_errors = [], []
    async with async_playwright() as playwright:
        launch = {"headless": True}
        if args.executable:
            launch["executable_path"] = args.executable
        else:
            # Use regular Chromium's headless mode, matching the live Chrome path.
            launch["channel"] = "chromium"
        if args.software_gpu:
            assert urlparse(args.base_url).hostname in {"127.0.0.1", "localhost", "::1"}, "Software GPU verification requires the reviewed loopback build"
            launch["args"] = ["--enable-unsafe-webgpu", "--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--use-vulkan=swiftshader", "--enable-features=Vulkan"]
        browser = await playwright.chromium.launch(**launch)
        report["browser"] = browser.version
        report["browserChannel"] = launch.get("channel", "explicit-executable")
        report["softwareGpuRequested"] = args.software_gpu
        async def new_context(**options):
            result = await browser.new_context(**options)
            if args.software_gpu:
                origin = urlparse(args.base_url).netloc
                await result.route("**/*", lambda route: route.continue_() if urlparse(route.request.url).netloc == origin else route.abort())
            return result

        async def observe_errors(target):
            target.on("pageerror", lambda error: page_errors.append(str(error)))
            target.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
            target.set_default_timeout(5000)
            await target.bring_to_front()

        context = await new_context(viewport={"width": 1440, "height": 1000})
        initial_storage = await context.storage_state()
        initial_appearance_keys = [item["name"] for origin in initial_storage["origins"]
                                   for item in origin["localStorage"]
                                   if item["name"] in {"qg-kit-font", "qg-kit-icons"}]
        page = await context.new_page()
        await observe_errors(page)
        root = page.locator("html")
        response = await page.goto(args.base_url, wait_until="networkidle")
        assert response and response.ok, "Production preview did not return successfully"
        current_check = "initialization"
        failure_artifacts = {}
        check_profiles = []

        async def finish_profile(profile):
            metadata = await profile.finish()
            check_profiles.append({key: metadata[key] for key in
                ["name", "status", "profile", "metadata", "wallDurationSeconds", "errors"] if key in metadata})

        async def failure_evidence(target):
            evidence = {"pageClosed": target.is_closed()}
            if target.is_closed():
                failure_artifacts.update(evidence)
                return
            try:
                evidence["state"] = await asyncio.wait_for(target.evaluate("""() => {
                    const rect = node => {const box = node.getBoundingClientRect();
                        return {x: box.x, y: box.y, width: box.width, height: box.height};};
                    const presentation = node => {const style = getComputedStyle(node);
                        return {tag: node.tagName, slot: node.getAttribute('data-slot'),
                            opacity: style.opacity, display: style.display, visibility: style.visibility,
                            overflow: style.overflow, overflowX: style.overflowX, overflowY: style.overflowY};};
                    const ancestors = node => {
                        const result = [];
                        for (let parent = node.parentElement; parent && result.length < 4; parent = parent.parentElement)
                            result.push(presentation(parent));
                        return result;
                    };
                    return {
                        url: location.href,
                        visibility: document.visibilityState, hasFocus: document.hasFocus(),
                        renderer: Object.fromEntries([...document.documentElement.attributes]
                            .filter(attribute => attribute.name.startsWith('data-liquid-'))
                            .map(attribute => [attribute.name, attribute.value])),
                        activeElement: {tag: document.activeElement?.tagName,
                            slot: document.activeElement?.getAttribute('data-slot'),
                            name: document.activeElement?.getAttribute('aria-label')},
                        openLayers: [...document.querySelectorAll(':popover-open,dialog:modal,[role="dialog"][data-open]')]
                            .slice(0, 12).map(node => ({...presentation(node),
                                role: node.getAttribute('role'), bounds: rect(node),
                                popoverOpen: node.matches(':popover-open'), modal: node.matches('dialog:modal'),
                                liquidSurface: node.getAttribute('data-liquid-surface'),
                                checkVisibility: node.checkVisibility?.() ?? null,
                                ancestors: ancestors(node),
                                canvases: [...node.querySelectorAll('canvas[data-liquid-canvas]')]
                                    .slice(0, 8).map(canvas => ({connected: canvas.isConnected,
                                        kind: canvas.getAttribute('data-liquid-canvas'), bounds: rect(canvas),
                                        rendered: canvas.getAttribute('data-liquid-render-rect'), ...presentation(canvas)}))})),
                        runningAnimations: document.getAnimations().filter(animation => animation.playState === 'running')
                            .slice(0, 16).map(animation => ({type: animation.constructor.name,
                                slot: animation.effect?.target?.getAttribute?.('data-slot'),
                                timing: animation.effect?.getComputedTiming()})),
                        activeMarkers: document.querySelectorAll('[data-liquid-active]').length,
                        pressedMarkers: document.querySelectorAll('[data-liquid-pressed]').length,
                        rippleMarkers: document.querySelectorAll('[data-liquid-ripple]').length,
                        travellingMarkers: document.querySelectorAll('[data-liquid-travelling]').length,
                        motionProbe: window.__glassMotionFrames?.probe ?? null
                    };
                }"""), timeout=2)
            except Exception as error:
                evidence["stateError"] = str(error) or type(error).__name__
            filename = f"failure-{current_check}.png"
            try:
                await asyncio.wait_for(target.screenshot(path=str(output.parent / filename), animations="allow", timeout=4000), timeout=5)
                evidence["screenshot"] = filename
            except Exception as error:
                evidence["screenshotError"] = str(error) or type(error).__name__
            failure_artifacts.update(evidence)

        async def choose(component_id):
            await page.locator(f"[data-catalogue-id='{component_id}']").click()
            if component_id == "overview":
                await expect(page.locator("[data-kit-view='overview']")).to_be_visible()
                await expect(page.locator("[data-component-id]")).to_have_count(0)
            else:
                await expect(page.locator("[data-component-id]")).to_have_count(1)
                await expect(page.locator(f"[data-component-id='{component_id}']")).to_be_visible()

        async def reset_overview():
            await page.bring_to_front()
            await page.mouse.move(1, 1)
            await page.keyboard.press("Escape")
            await page.keyboard.press("Escape")
            await expect(page.locator(":is([role='dialog'],[role='alertdialog'])[aria-modal='true']:visible,dialog:modal")).to_have_count(0)
            await page.wait_for_function("""() => {
                const search = document.querySelector('[aria-label="Search components"]');
                return search && !search.closest('[inert]');
            }""", polling=25, timeout=5000)
            await page.get_by_label("Search components", exact=True).fill("")
            await choose("button")
            await choose("overview")
            await page.evaluate("window.scrollTo(0, 0)")

        async def record(name, operation, *, reset=True, timeout=20):
            nonlocal current_check, failure_artifacts, check_profiles
            if args.check is not None and args.check != name:
                return
            current_check = name
            failure_artifacts = {}
            check_profiles = []
            begin_browser_check(name)
            check_started = perf_counter()
            try:
                if reset:
                    browser_stage("reset overview")
                    await reset_overview()
                browser_stage("run check", timeoutSeconds=timeout)
                detail = await asyncio.wait_for(operation(), timeout=timeout)
                result = {"name": name, "passed": True, "detail": detail}
            except Exception as error:
                stages = browser_check_trace()
                if not failure_artifacts:
                    await failure_evidence(page)
                result = {"name": name, "passed": False, "error": str(error) or type(error).__name__,
                    "exceptionType": type(error).__name__, "lastStage": stages[-1] if stages else None,
                    "stages": stages, "traceback": "".join(traceback.format_exception(error))[-7000:],
                    "failureEvidence": failure_artifacts}
            finally:
                try:
                    await asyncio.wait_for(page.evaluate("""() => {
                        window.__glassMotionFrames?.cancel(); delete window.__glassMotionFrames;
                        window.__glassDrawerFrames?.cancel(); delete window.__glassDrawerFrames;
                        window.__glassSelectionEvidence?.stop(); delete window.__glassSelectionEvidence;
                        window.__glassPopupTimeline?.stop('check fallback cleanup'); delete window.__glassPopupTimeline;
                    }"""), timeout=2)
                except Exception:
                    pass
            result["durationSeconds"] = round(perf_counter() - check_started, 3)
            if check_profiles:
                result["profiles"] = check_profiles
            report["checks"].append(result)
            output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
            print(f"{'PASS' if result['passed'] else 'FAIL'} {name} ({result['durationSeconds']}s)", flush=True)
            if not result["passed"]:
                print(result["error"], flush=True)
                print(f"Last stage: {result['lastStage']}", flush=True)
                print(result["traceback"], flush=True)

        async def initial():
            await expect(root).to_have_attribute("data-liquid-glass-kit", "true")
            assert not initial_appearance_keys, f"Initial overview should start without saved appearance: {initial_appearance_keys}"
            await expect(root).to_have_attribute("data-liquid-font", "studio")
            await expect(root).to_have_attribute("data-liquid-icons", "isometric")
            await expect(page.locator("[data-kit-view='overview']")).to_be_visible()
            await expect(page.locator("[data-catalogue-id]")).to_have_count(59)
            await expect(page.locator("[data-component-id]")).to_have_count(0)
            await expect(page.locator(".agent-inspector, .agent-command-console, .reference-lens-stage")).to_have_count(0)
            await expect(page.get_by_role("button", name="Create project", exact=True)).to_be_enabled()
            await expect(page.get_by_label("Project name", exact=True)).to_have_value("Coastal studio")
            await expect(root).to_have_attribute("data-liquid-status", re.compile(r"^(ready|unavailable|error|reduced)$"), timeout=25000)
            status = await root.get_attribute("data-liquid-status")
            assert status != "error", await root.get_attribute("data-liquid-error")
            await settled_motion(page)
            await page.screenshot(path=str(output.parent / "overview-desktop.png"), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
            return {"catalogueChoices": 59, "families": 55, "default": "Liquid Glass overview", "appearance": {"font": "studio", "icons": "isometric", "initialStorageAbsent": True}, "rendererStatus": status, "screenshot": "overview-desktop.png", "viewport": {"width": 1440, "height": 1000}}

        await record("default_glass_kit_overview", initial, reset=False, timeout=45)
        await record("gpu_on_actual_controls_strength_and_backdrop", lambda: verify_optics_contract(page, expect, output_dir=output.parent, require_gpu=args.software_gpu), reset=False, timeout=60)
        await record("visible_pointer_ripple_selection_and_idle", lambda: verify_motion_contract(page, expect, output_dir=output.parent, require_gpu=args.software_gpu), timeout=60)

        async def drawer_motion():
            await choose("drawer")
            return await verify_drawer_motion_contract(page, expect, output_dir=output.parent, require_gpu=args.software_gpu)

        await record("native_drawer_settle_tracks_gpu_with_motion_on_and_off", drawer_motion, timeout=40)
        await record("real_sdk_agent_contract", lambda: verify_agent_contract(page, expect), timeout=30)

        async def all_components():
            catalogue = await page.locator("[data-catalogue-id]").evaluate_all("nodes => nodes.map(node => node.dataset.catalogueId)")
            custom_collections = ["standards", "visual", "agents"]
            assert all(catalogue.count(item) == 1 for item in custom_collections), f"Expected each custom collection exactly once: {catalogue}"
            actual = sorted(item for item in catalogue if item not in ["overview", *custom_collections])
            assert actual == expected_ids, actual
            unnamed = []
            for item in components:
                browser_stage("catalogue: open specimen", component=item["id"])
                await choose(item["id"])
                await expect(page.locator(".demo-error")).to_have_count(0)
                entries = await page.evaluate("window.quantitativeHciAgent.snapshot().filter(entry => !entry.offPage && entry.component !== 'more')")
                unnamed.extend({"specimen": item["id"], "component": entry["component"], "ref": entry["ref"]} for entry in entries if not entry.get("label", "").strip())
            assert not unnamed, f"Unnamed SDK entries: {json.dumps(unnamed)}"
            return {"familiesOpened": len(components), "customCollectionsPresent": custom_collections, "unnamed": unnamed, "oneFamilyMountedAtATime": True}

        await record("all_55_families_render_and_have_agent_names", all_components, timeout=35)

        async def keyboard_and_popup():
            search = page.get_by_label("Search components", exact=True)
            await search.fill("password")
            await expect(page.locator("[data-catalogue-id]")).to_have_count(1)
            await expect(page.locator("[data-component-id='password-input']")).to_be_visible()
            await search.fill("no-component-matches-this-query")
            await expect(page.locator("[data-component-id]")).to_have_count(0)
            await expect(page.get_by_role("heading", name="No matching components", exact=True)).to_be_visible()
            await search.fill("")
            await choose("overview")
            slider = page.get_by_role("slider", name="Volume", exact=True)
            native = await slider.evaluate("node => node instanceof HTMLInputElement")
            before = float(await slider.input_value() if native else await slider.get_attribute("aria-valuenow"))
            await slider.focus()
            await slider.press("ArrowRight")
            after = float(await slider.input_value() if native else await slider.get_attribute("aria-valuenow"))
            assert after > before, "Keyboard arrow did not change Volume"
            trigger = page.get_by_role("combobox", name="Project access", exact=True)
            await trigger.focus()
            await trigger.press("ArrowDown")
            await expect(trigger).to_have_attribute("aria-expanded", "true")
            await page.keyboard.press("End")
            await page.keyboard.press("Enter")
            await expect(trigger).to_contain_text("Public")
            collection = page.get_by_role("button", name="New collection", exact=True)
            browser_stage("keyboard: open collection dialog and inspect popup canvas")
            await collection.focus()
            if args.popup_timeline:
                await arm_popup_render_timeline(page)
            await collection.press("Enter")
            dialog = page.get_by_role("dialog", name="Create a collection", exact=True)
            await expect(dialog).to_be_visible()
            browser_stage("keyboard: wait for the dialog's visual entry")
            await expect(dialog).not_to_have_attribute("data-starting-style", re.compile(r".*"))
            await expect(dialog).to_have_css("opacity", "1")
            await settled_motion(page)
            assert await dialog.evaluate("node => node.contains(document.activeElement)"), "Focus did not enter the collection dialog"
            gpu = await root.get_attribute("data-liquid-status") == "ready"
            popup_evidence = {"gpuExpected": gpu}
            popup_evidence["scrolling"] = await dialog.evaluate("""node => ({
                clientWidth: node.clientWidth, clientHeight: node.clientHeight,
                scrollWidth: node.scrollWidth, scrollHeight: node.scrollHeight,
                overflowX: getComputedStyle(node).overflowX,
                overflowY: getComputedStyle(node).overflowY
            })""")
            scrolling = popup_evidence["scrolling"]
            assert scrolling["scrollWidth"] <= scrolling["clientWidth"], f"Collection dialog has horizontal overflow: {scrolling}"
            assert scrolling["scrollHeight"] <= scrolling["clientHeight"], f"The short collection dialog acquired vertical overflow: {scrolling}"
            assert scrolling["overflowY"] in {"auto", "scroll"}, f"Native popup scrolling was suppressed: {scrolling}"
            if gpu:
                await expect(dialog.locator("canvas[data-liquid-canvas='popup']")).to_have_count(1, timeout=5000)
                popup_canvas = dialog.locator("canvas[data-liquid-canvas='popup']")
                await expect(popup_canvas).to_be_visible()
                popup_evidence.update(await popup_canvas.evaluate("""node => {
                    const host = node.closest(':popover-open,dialog:modal');
                    if (!(host instanceof HTMLElement)) throw new Error('Popup canvas has no top-layer host');
                    const bounds = node.getBoundingClientRect();
                    const outer = host.getBoundingClientRect();
                    const scaleX = outer.width / host.offsetWidth;
                    const scaleY = outer.height / host.offsetHeight;
                    const client = {
                        x: outer.x + host.clientLeft * scaleX, y: outer.y + host.clientTop * scaleY,
                        width: host.clientWidth * scaleX, height: host.clientHeight * scaleY
                    };
                    return {
                        topLayerHost: true,
                        pointerEvents: getComputedStyle(node).pointerEvents,
                        ariaHidden: node.getAttribute('aria-hidden'),
                        canvas: [bounds.x, bounds.y, bounds.width, bounds.height],
                        renderedLayer: JSON.parse(node.getAttribute('data-liquid-render-rect') || 'null'),
                        clientViewport: client,
                        canvasOverflowPx: Math.max(0, client.x - bounds.left, client.y - bounds.top,
                            bounds.right - client.x - client.width, bounds.bottom - client.y - client.height)
                    };
                }"""))
                assert popup_evidence["topLayerHost"] and popup_evidence["pointerEvents"] == "none" and popup_evidence["ariaHidden"] == "true", popup_evidence
                assert popup_evidence["canvasOverflowPx"] <= 0.5, f"Material canvas extends outside the popup client viewport: {popup_evidence}"
                popup_evidence["canvasAlignmentErrorPx"] = _assert_rect_alignment(popup_evidence["canvas"], popup_evidence["renderedLayer"], "collection popup canvas")
            field = dialog.get_by_label("Collection name", exact=True)
            assert await field.evaluate("""node => {
                const box = node.getBoundingClientRect();
                const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
                return hit === node || node.contains(hit);
            }"""), "The popup renderer covers its live input"
            if args.popup_timeline:
                await page.evaluate("window.__glassPopupTimeline?.stop('popup inspected')")
            await page.screenshot(path=str(output.parent / "dialog-desktop.png"), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
            await page.keyboard.press("Escape")
            await expect(dialog).not_to_be_visible()
            await expect(collection).to_be_focused()
            await collection.press("Enter")
            await expect(dialog).to_be_visible()
            await field.fill("Keyboard collection")
            await dialog.get_by_role("button", name="Create collection", exact=True).press("Enter")
            await expect(dialog).not_to_be_visible()
            await expect(page.get_by_label("Collection result", exact=True)).to_have_text("Created Keyboard collection")
            return {"searchAndEmptyState": True, "sliderBefore": before, "sliderAfter": after, "selectKeyboard": True, "dialogEscapeAndFocus": True, "keyboardCreate": True, "popup": popup_evidence, "screenshot": "dialog-desktop.png"}

        async def profiled_keyboard_popup():
            profile = await start_browser_profile(page, output_dir=output.parent, name="keyboard-popup")
            try:
                return await keyboard_and_popup()
            finally:
                if args.popup_timeline:
                    report["popupRenderTimeline"] = await finish_popup_render_timeline(page, output.parent)
                await finish_profile(profile)

        await record("keyboard_selection_and_real_popup", profiled_keyboard_popup, timeout=25)

        async def mobile():
            await page.set_viewport_size({"width": 390, "height": 844})
            await page.evaluate("window.scrollTo(0, 0)")
            await expect(page.locator("[data-kit-view='overview']")).to_be_visible()
            await expect(page.get_by_label("Search components", exact=True)).to_be_visible()
            material_trigger = page.get_by_role("button", name="Material settings", exact=True)
            await expect(material_trigger).to_be_visible()
            await expect(material_trigger.locator("[data-liquid-icon='settings']")).to_be_visible()
            dimensions = await page.evaluate("({width: innerWidth, scroll: document.documentElement.scrollWidth})")
            assert dimensions["scroll"] <= dimensions["width"] + 1, f"Mobile overview overflows: {dimensions}"
            await settled_motion(page)
            await page.screenshot(path=str(output.parent / "overview-mobile.png"), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
            appearance_state = """() => ({
                font: document.documentElement.dataset.liquidFont,
                icons: document.documentElement.dataset.liquidIcons,
                storedFont: localStorage.getItem('qg-kit-font'),
                storedIcons: localStorage.getItem('qg-kit-icons')
            })"""
            appearance_before = await page.evaluate(appearance_state)
            await material_trigger.click()
            material_popover = page.locator(".kit-material-popover")
            await expect(material_popover).to_be_visible()
            for label, options in (
                ("Font set", ("Studio — Manrope", "Editorial — Fraunces", "System")),
                ("Icon style", ("Isometric", "Line")),
            ):
                choice = material_popover.get_by_role("combobox", name=label, exact=True)
                await choice.scroll_into_view_if_needed()
                await choice.click()
                for option in options:
                    item = page.get_by_role("option", name=option, exact=True)
                    await expect(item).to_be_visible()
                    await expect(item).to_be_in_viewport()
                await page.keyboard.press("Escape")
                await expect(choice).to_have_attribute("aria-expanded", "false")
                await expect(material_popover).to_be_visible()
            await page.screenshot(path=str(output.parent / "material-settings-mobile.png"), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
            await material_popover.get_by_role("button", name="Done", exact=True).click()
            await expect(material_popover).to_be_hidden()
            await expect(material_trigger).to_be_focused()
            assert await page.evaluate(appearance_state) == appearance_before, "Inspecting mobile choices changed appearance preferences"
            catalogue = page.get_by_role("listbox", name="Component catalogue", exact=True)
            assert await catalogue.evaluate("node => node.scrollHeight > node.clientHeight"), "Mobile catalogue should remain scrollable"
            await choose("preferences")
            await choose("overview")
            control = page.get_by_role("switch", name="Notifications", exact=True)
            before = await control.get_attribute("aria-checked")
            await control.click()
            await expect(control).to_have_attribute("aria-checked", "false" if before == "true" else "true")
            await page.set_viewport_size({"width": 1440, "height": 1000})
            await page.evaluate("window.scrollTo(0, 0)")
            return {
                **dimensions, "viewport": {"width": 390, "height": 844},
                "switchUsable": True, "screenshot": "overview-mobile.png",
                "materialSettings": {
                    "iconVisible": True, "choicesReachable": ["Font set", "Icon style"],
                    "appearanceUnchanged": True, "focusRestored": True,
                    "screenshot": "material-settings-mobile.png",
                },
            }

        await record("mobile_overview_fits_and_remains_usable", mobile, timeout=20)

        async def appearance():
            location = urlparse(args.base_url)
            appearance_context = await new_context(viewport={"width": 1440, "height": 1000}, storage_state={
                "cookies": [],
                "origins": [{"origin": f"{location.scheme}://{location.netloc}", "localStorage": [
                    {"name": "qg-kit-font", "value": "__unsupported_font__"},
                    {"name": "qg-kit-icons", "value": "__unsupported_icons__"},
                ]}],
            })
            appearance_page = await appearance_context.new_page()
            await observe_errors(appearance_page)
            try:
                return await verify_appearance_contract(
                    appearance_page, expect, base_url=args.base_url,
                    output_dir=output.parent, require_gpu=args.software_gpu,
                )
            except (Exception, asyncio.CancelledError):
                await failure_evidence(appearance_page)
                raise
            finally:
                await appearance_context.close()

        await record("font_icon_presets_state_and_export", appearance, reset=False, timeout=45)

        async def custom_components(operation):
            custom_context = await new_context(viewport={"width": 1440, "height": 1000})
            custom_page = await custom_context.new_page()
            await observe_errors(custom_page)
            try:
                return await operation(custom_page, expect, base_url=args.base_url, output_dir=output.parent)
            except Exception:
                await failure_evidence(custom_page)
                raise
            finally:
                await custom_context.close()

        await record("uml_uwe_selection_editing_exports_and_access", lambda: custom_components(verify_developer_contract), reset=False, timeout=100)
        await record("standards_catalogue_46_views_and_model_editing", lambda: custom_components(verify_standards_contract), reset=False, timeout=240)
        await record("model_document_atomic_agent_commands_and_human_history", lambda: custom_components(verify_model_document_contract), reset=False, timeout=90)
        await record("agent_tasks_review_and_artifacts", lambda: custom_components(verify_agent_tasks_contract), reset=False, timeout=90)
        await record("graphics_agent_human_edits_history_and_exports", lambda: custom_components(verify_graphics_contract), reset=False, timeout=90)
        await record("visual_media_gallery_comparison_and_dialogs", lambda: custom_components(verify_visual_contract), reset=False, timeout=40)

        async def preferences():
            preference_context = await new_context(viewport={"width": 1440, "height": 1000})
            preference_page = await preference_context.new_page()
            await observe_errors(preference_page)
            session = await preference_context.new_cdp_session(preference_page)
            features = [
                {"name": "prefers-reduced-motion", "value": "reduce"},
                {"name": "prefers-reduced-transparency", "value": "reduce"},
                {"name": "forced-colors", "value": "none"},
            ]
            await session.send("Emulation.setEmulatedMedia", {"features": features})
            try:
                await preference_page.goto(args.base_url, wait_until="networkidle")
                media = await preference_page.evaluate("({motion: matchMedia('(prefers-reduced-motion: reduce)').matches, transparency: matchMedia('(prefers-reduced-transparency: reduce)').matches})")
                assert media == {"motion": True, "transparency": True}, f"Chromium did not apply the requested media emulation: {media}"
                preference_root = preference_page.locator("html")
                await expect(preference_root).to_have_attribute("data-liquid-transparency", "system")
                await expect(preference_root).to_have_attribute("data-liquid-status", "reduced")
                await expect(preference_root).to_have_attribute("data-liquid-motion", "reduced")
                await expect(preference_page.locator("canvas[data-liquid-canvas='viewport']")).not_to_be_visible()
                system_reason = await preference_root.get_attribute("data-liquid-reduced-reason")
                await configure_material(preference_page, appearance="Glass")
                await expect(preference_root).to_have_attribute("data-liquid-status", re.compile(r"^(ready|unavailable)$"), timeout=25000)
                glass_status = await preference_root.get_attribute("data-liquid-status")
                if args.software_gpu:
                    assert glass_status == "ready", f"Explicit Glass did not restore WebGPU: {glass_status}"
                reduced = await verify_suppressed_motion(preference_page, expect, policy="reduced")
                if glass_status == "ready":
                    await expect(preference_page.locator("canvas[data-liquid-canvas='viewport']")).to_be_visible()
                await configure_material(preference_page, motion=False)
                off = await verify_suppressed_motion(preference_page, expect, policy="off")
                await configure_material(preference_page, motion=True)
                await expect(preference_root).to_have_attribute("data-liquid-motion", "enabled")
                override = await verify_pointer_motion(preference_page, expect, output_dir=output.parent, label="explicit-opt-in") if glass_status == "ready" else {"gpuPixelsUnavailable": True}
                stored = await preference_page.evaluate("({motion: localStorage.getItem('qg-kit-motion'), transparency: localStorage.getItem('qg-kit-transparency')})")
                assert json.loads(stored["motion"]) is True and stored["transparency"] == "glass", stored
                await preference_page.reload(wait_until="networkidle")
                await expect(preference_root).to_have_attribute("data-liquid-motion", "enabled")
                await expect(preference_root).to_have_attribute("data-liquid-transparency", "glass")
                await expect(preference_root).to_have_attribute("data-liquid-status", glass_status, timeout=25000)
                await configure_material(preference_page, appearance="Solid")
                await expect(preference_root).to_have_attribute("data-liquid-status", "reduced")
                solid_reason = await preference_root.get_attribute("data-liquid-reduced-reason")
                await configure_material(preference_page, appearance="Glass")
                features[-1]["value"] = "active"
                await session.send("Emulation.setEmulatedMedia", {"features": features})
                await expect(preference_root).to_have_attribute("data-liquid-status", "reduced")
                forced_reason = await preference_root.get_attribute("data-liquid-reduced-reason")
                await expect(preference_page.locator("canvas[data-liquid-canvas='viewport']")).not_to_be_visible()
                button = preference_page.get_by_role("button", name="Create project", exact=True)
                await button.focus()
                await preference_page.keyboard.press("Tab")
                await preference_page.keyboard.press("Shift+Tab")
                await expect(button).to_be_focused()
                style = await button.evaluate("node => ({filter: getComputedStyle(node).backdropFilter, outline: getComputedStyle(node).outlineStyle, focusVisible: node.matches(':focus-visible')})")
                assert style["filter"] in ("none", "blur(0px)") and style["outline"] != "none" and style["focusVisible"], style
                await button.press("Enter")
                await expect(preference_page.get_by_label("Project result", exact=True)).to_have_text("Created Coastal studio")
                return {"emulatedSystemPreferences": media, "systemReducedReason": system_reason, "explicitGlassStatus": glass_status, "systemReducedMotion": reduced, "userMotionOff": off, "explicitMotionOptIn": override, "persisted": stored, "solidReason": solid_reason, "forcedColoursReason": forced_reason, "forcedColoursOverrideGlass": True, "keyboardActionPreserved": True, "focus": style}
            except Exception:
                await failure_evidence(preference_page)
                raise
            finally:
                await preference_context.close()

        await record("system_preferences_explicit_opt_in_and_forced_colours", preferences, reset=False, timeout=60)

        async def unavailable_fallback():
            fallback_context = await new_context(viewport={"width": 1440, "height": 1000}, reduced_motion="no-preference")
            await fallback_context.add_init_script("Object.defineProperty(navigator, 'gpu', {configurable: true, get: () => undefined})")
            fallback = await fallback_context.new_page()
            await observe_errors(fallback)
            profile = None
            try:
                await fallback.goto(args.base_url, wait_until="networkidle")
                profile = await start_browser_profile(fallback, output_dir=output.parent, name="unavailable-fallback")
                fallback_root = fallback.locator("html")
                await expect(fallback_root).to_have_attribute("data-liquid-status", "unavailable")
                await expect(fallback_root).to_have_attribute("data-liquid-motion", "enabled")
                await expect(fallback.locator("canvas[data-liquid-canvas='viewport']")).not_to_be_visible()
                button = fallback.get_by_role("button", name="Create project", exact=True)
                await button.hover()
                await settled_motion(fallback)
                box = await button.bounding_box()
                assert box, "Fallback button has no bounds"
                before = await fallback.screenshot(path=str(output.parent / "fallback-rest.png"), clip=box, animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
                diagnostics_before = await motion_diagnostics(fallback)
                await fallback.mouse.down()
                try:
                    await expect(button).to_have_attribute("data-liquid-pressed", re.compile(r".*"))
                    await expect(button).to_have_attribute("data-liquid-ripple", re.compile(r"^[ab]$"))
                    await fallback.wait_for_timeout(120)
                    pressed = await fallback.screenshot(path=str(output.parent / "fallback-press.png"), clip=box, animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
                    pixel_change = _difference(before, pressed)
                    assert pixel_change["changedFraction"] > 0.001, f"Fallback press did not change actual control pixels: {pixel_change}"
                finally:
                    await fallback.mouse.up()
                await expect(fallback.get_by_label("Project result", exact=True)).to_have_text("Created Coastal studio")
                trigger = fallback.get_by_role("button", name="New collection", exact=True)
                await trigger.focus()
                await trigger.press("Enter")
                dialog = fallback.get_by_role("dialog", name="Create a collection", exact=True)
                await expect(dialog).to_be_visible()
                assert await dialog.evaluate("node => node.contains(document.activeElement)"), "Fallback popup did not receive focus"
                await fallback.screenshot(path=str(output.parent / "fallback-dialog.png"), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
                await fallback.keyboard.press("Escape")
                await expect(dialog).not_to_be_visible()
                await expect(trigger).to_be_focused()
                await fallback.mouse.move(1, 1)
                diagnostics_after = await settled_motion(fallback)
                assert diagnostics_after["motion"] > diagnostics_before["motion"], "Fallback did not animate its feedback"
                assert diagnostics_after["capture"] == diagnostics_before["capture"] == 0, "Unavailable GPU captured a backdrop"
                return {"simulatedCondition": "navigator.gpu unavailable", "rendererStatus": "unavailable", "pressPixels": pixel_change, "keyboardAction": True, "popupFocusRestored": True, "idle": diagnostics_after, "screenshots": ["fallback-rest.png", "fallback-press.png", "fallback-dialog.png"]}
            except Exception:
                await failure_evidence(fallback)
                raise
            finally:
                if profile is not None:
                    await finish_profile(profile)
                await fallback_context.close()

        await record("unavailable_gpu_css_motion_and_popup", unavailable_fallback, reset=False, timeout=35)

        async def record_motion_demo():
            video_context = await new_context(
                viewport={"width": 1440, "height": 1000}, reduced_motion="no-preference",
                record_video_dir=str(output.parent / "motion-recording"),
                record_video_size={"width": 1440, "height": 1000},
            )
            demo = await video_context.new_page()
            await observe_errors(demo)
            clip_started = perf_counter()
            try:
                await demo.goto(args.base_url, wait_until="networkidle")
                await expect(demo.locator("html")).to_have_attribute("data-liquid-status", re.compile(r"^(ready|unavailable)$"), timeout=25000)
                await settled_motion(demo)
                button = demo.get_by_role("button", name="Create project", exact=True)
                box = await button.bounding_box()
                assert box, "Motion video target has no bounds"
                await demo.mouse.move(box["x"] + 12, box["y"] + box["height"] / 2)
                await demo.wait_for_timeout(250)
                await demo.mouse.move(box["x"] + box["width"] - 12, box["y"] + box["height"] / 2, steps=12)
                await demo.mouse.down()
                await demo.wait_for_timeout(220)
                await demo.mouse.up()
                await demo.wait_for_timeout(700)
                workspace = demo.get_by_role("radiogroup", name="Workspace view", exact=True)
                await workspace.get_by_role("radio", name="Files", exact=True).press("ArrowRight")
                await demo.wait_for_timeout(500)
                await workspace.get_by_role("radio", name="Settings", exact=True).click()
                await demo.wait_for_timeout(500)
                await demo.get_by_role("switch", name="Notifications", exact=True).click()
                await demo.wait_for_timeout(450)
                collection = demo.get_by_role("button", name="New collection", exact=True)
                await collection.click()
                dialog = demo.get_by_role("dialog", name="Create a collection", exact=True)
                await expect(dialog).to_be_visible()
                await expect(dialog).not_to_have_attribute("data-starting-style", re.compile(r".*"))
                await expect(dialog).to_have_css("opacity", "1")
                await demo.wait_for_timeout(700)
                await demo.keyboard.press("Escape")
                await expect(dialog).to_be_hidden()
                await expect(collection).to_be_focused()
                await demo.mouse.move(1, 1)
                await settled_motion(demo)
                await demo.screenshot(path=str(output.parent / "motion-demo-overview.png"), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
            except Exception:
                await failure_evidence(demo)
                raise
            finally:
                await video_context.close()
            video = Path(await demo.video.path())
            destination = output.parent / "motion-demo.webm"
            video.replace(destination)
            assert destination.stat().st_size > 0, "Motion demo video is empty"
            return {"video": destination.name, "durationSeconds": round(perf_counter() - clip_started, 2), "viewport": {"width": 1440, "height": 1000}, "interactions": ["pointer highlight", "press and ripple", "keyboard and pointer selection", "switch", "dialog and Escape"], "animationsDisabled": False}

        await record("short_overview_motion_video", record_motion_demo, reset=False, timeout=45)
        report["checks"].append({"name": "uncaught_page_errors", "passed": not page_errors, "errors": page_errors})
        report["checks"].append({"name": "console_errors", "passed": not console_errors, "errors": console_errors})
        await context.close()
        await browser.close()

    report["durationSeconds"] = round(perf_counter() - started, 3)
    report["selectionComplete"] = [item["name"] for item in report["checks"]] == [
        *report["selectedChecks"], "uncaught_page_errors", "console_errors",
    ]
    report["passed"] = report["selectionComplete"] and all(item["passed"] for item in report["checks"])
    report["releaseGatePassed"] = report["fullSuite"] and report["passed"]
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Browser: {report['browser']}; total: {report['durationSeconds']}s; report: {output}")
    return 0 if report["passed"] else 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:4185/")
    parser.add_argument("--output", default="test-results/liquid-glass.json")
    parser.add_argument("--executable", default=None)
    parser.add_argument("--software-gpu", action="store_true", help="Require software WebGPU for a reviewed loopback build only")
    parser.add_argument("--popup-timeline", action="store_true", help="Collect bounded popup geometry diagnostics; extra layout reads can affect animation timing")
    parser.add_argument("--check", choices=BROWSER_CHECK_NAMES, default=None,
                        help="Run one exact scenario for diagnostics; page/console error checks still run. Omit for the full release suite.")
    return asyncio.run(run(parser.parse_args()))


if __name__ == "__main__":
    sys.exit(main())
