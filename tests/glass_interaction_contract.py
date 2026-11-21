"""Real input, cursor geometry and SDK-agent checks for custom interactions."""

from pathlib import Path

from glass_developer_contract import _named_controls, _page_fits, _select
from glass_optics_contract import SCREENSHOT_TIMEOUT_MS, _act, _call, _entry, browser_stage


async def verify_interactions_contract(page, expect, *, base_url, output_dir):
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    original_viewport = page.viewport_size
    screenshots = []
    await page.emulate_media(reduced_motion="no-preference", forced_colors="none")
    await page.goto(base_url, wait_until="networkidle")
    await page.wait_for_function("() => typeof window.quantitativeHciAgent?.snapshot === 'function'")
    await _select(page, "listbox", "Component catalogue", value="interactions")
    stage = page.locator('[data-kit-view="interactions"]')
    scope = stage.locator(".qgi-cursor-scope")
    layer = page.locator(".qgi-cursor")
    scene = stage.locator(".interaction-scene")
    area = stage.locator(".qgi-context-area")
    menu = page.locator(".qgi-context-menu")
    changes = stage.get_by_label("Scene changes", exact=True)
    switch_light = stage.get_by_role("button", name="Switch light", exact=True)
    await expect(stage).to_be_visible()
    await expect(stage).to_have_attribute("data-validation", "unvalidated")
    named = await _named_controls(page)
    await _select(page, "segmented-control", "Cursor style", choice="Glass")
    await _select(page, "segmented-control", "Click response", choice="Ripple")

    async def state():
        return {"palette": await scene.get_attribute("data-palette"),
                "count": int(await changes.get_attribute("data-scene-count")),
                "saved": await changes.get_attribute("data-scene-saved"),
                "drafts": await stage.get_by_label("Saved draft count", exact=True).inner_text()}

    async def pointer_on(target, *, inset=12):
        await target.scroll_into_view_if_needed()
        box = await target.bounding_box()
        assert box and box["width"] > inset * 2 and box["height"] > 10, box
        x = box["x"] + inset
        y = box["y"] + box["height"] / 2
        await page.mouse.move(x, y)
        await expect(scope).to_have_attribute("data-qg-cursor-state", "idle")
        await expect(layer).to_be_visible()
        return box, x, y

    async def cursor_geometry(x, y):
        result = await layer.evaluate("""root => {
            const dot = root.querySelector('.qgi-cursor-dot').getBoundingClientRect();
            return {x: dot.x + dot.width / 2, y: dot.y + dot.height / 2,
                ariaHidden: root.getAttribute('aria-hidden'), pointerEvents: getComputedStyle(root).pointerEvents,
                focusable: root.querySelectorAll('button,a,input,[tabindex]').length};
        }""")
        assert abs(result["x"] - x) <= 1 and abs(result["y"] - y) <= 1, (result, {"x": x, "y": y})
        assert result["ariaHidden"] == "true" and result["pointerEvents"] == "none" and result["focusable"] == 0, result
        return result

    async def assert_native(target):
        await target.scroll_into_view_if_needed()
        box = await target.bounding_box()
        assert box, "Native-cursor target has no rendered rectangle"
        await page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        await expect(layer).not_to_be_visible()
        await expect(scope).to_have_attribute("data-qg-cursor-state", "native")
        assert await target.evaluate("node => getComputedStyle(node).cursor") != "none"

    async def menu_control():
        return await _entry(page, "menu", ["Scene actions", await area.get_attribute("aria-label"),
                                          await scene.locator("h3").inner_text()])

    async def menu_choice(label):
        control = await menu_control()
        await _act(page, control, "setOpen", [True])
        await expect(menu).to_be_visible()
        control = await menu_control()
        queried = await _call(page, "query", {"within": control["ref"]})
        assert isinstance(queried, list), queried
        matches = [item for item in queried if item.get("ref") == control["ref"]]
        assert len(matches) == 1, queried
        available = matches[0]
        item_names = [item["label"] for item in available.get("items", [])]
        names = set(item_names + available.get("buttons", []))
        assert label in names, f"Context action is not discoverable: {label}: {available}"
        result = await _act(page, control, "press", [label])
        return {"choice": label, "discoveredActions": sorted(names), "result": result}

    async def capture(name):
        await page.screenshot(path=str(output / name), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
        screenshots.append(name)

    completed = False
    try:
        browser_stage("interactions: exact pointer and fixed magnetic hit area")
        before, x, y = await pointer_on(switch_light)
        geometry = await cursor_geometry(x, y)
        after = await switch_light.bounding_box()
        assert all(abs(before[key] - after[key]) <= .75 for key in ("x", "y", "width", "height")), (before, after)
        hit = await switch_light.evaluate("""(target, point) => {
            const hit = document.elementFromPoint(point.x, point.y);
            return {sameTarget: hit === target || target.contains(hit),
                decorationTransform: getComputedStyle(target.querySelector('.qgi-magnetic-art')).transform};
        }""", {"x": x, "y": y})
        assert hit["sameTarget"], hit
        assert hit["decorationTransform"] not in ("none", "matrix(1, 0, 0, 1, 0, 0)"), hit
        quiescent = await layer.evaluate("""root => new Promise(resolve => {
            let mutations = 0, frames = 0;
            const observer = new MutationObserver(records => { mutations += records.length; });
            observer.observe(root, {attributes: true, subtree: true});
            const next = () => {
                if (++frames < 4) requestAnimationFrame(next);
                else { observer.disconnect(); resolve({mutations, frames}); }
            };
            requestAnimationFrame(next);
        })""")
        assert quiescent["mutations"] == 0, f"The cursor kept writing after it reported idle: {quiescent}"

        browser_stage("interactions: stationary pointer stays aligned during scrolling")
        await scene.scroll_into_view_if_needed()
        bounds = await scene.bounding_box()
        assert bounds, "Scene is not rendered"
        viewport = page.viewport_size
        sx = bounds["x"] + min(90, bounds["width"] / 3)
        sy = max(30, min(viewport["height"] - 40, bounds["y"] + bounds["height"] / 2))
        await page.mouse.move(sx, sy)
        await expect(scope).to_have_attribute("data-qg-cursor-state", "idle")
        scroll = await page.evaluate("""() => {
            const before = scrollY, maximum = document.documentElement.scrollHeight - innerHeight;
            scrollBy(0, before + 35 < maximum ? 35 : -35);
            return {before, after: scrollY};
        }""")
        assert abs(scroll["after"] - scroll["before"]) >= 10, scroll
        await expect(scope).to_have_attribute("data-qg-cursor-state", "idle")
        scroll_geometry = await cursor_geometry(sx, sy)
        await capture("interactions-desktop-cursor.png")

        browser_stage("interactions: text fields and outside right-click stay native")
        field = stage.get_by_role("textbox", name="Study name", exact=True)
        await field.scroll_into_view_if_needed()
        await assert_native(field)
        await field.fill("Coastal study contract")
        outside = await stage.locator(".interaction-footnote p").first.evaluate("""node => {
            const event = new MouseEvent('contextmenu', {bubbles: true, cancelable: true, button: 2});
            const allowed = node.dispatchEvent(event);
            return {allowed, prevented: event.defaultPrevented};
        }""")
        assert outside == {"allowed": True, "prevented": False}, outside
        await expect(menu).not_to_be_visible()

        browser_stage("interactions: pointer context action changes the same scene")
        palette_before = await scene.get_attribute("data-palette")
        await area.click(button="right", position={"x": 40, "y": 40})
        await expect(menu).to_be_visible()
        await expect(layer).not_to_be_visible()
        await capture("interactions-desktop-menu.png")
        await menu.get_by_role("menuitem", name="Change scene palette", exact=True).click()
        await expect(scene).to_have_attribute("data-palette", "warm" if palette_before == "cool" else "cool")
        await expect(menu).not_to_be_visible()

        browser_stage("interactions: keyboard context action and Escape restore focus")
        await area.focus()
        await area.press("Shift+F10")
        await expect(menu).to_be_visible()
        await page.keyboard.press("Escape")
        await expect(menu).not_to_be_visible()
        await expect(area).to_be_focused()
        trigger = stage.get_by_role("button", name="Scene actions", exact=True)
        await trigger.click()
        await expect(menu).to_be_visible()
        await page.keyboard.press("Escape")
        await expect(menu).not_to_be_visible()
        await expect(trigger).to_be_focused()
        await area.focus()
        await area.press("Shift+F10")
        save_item = menu.get_by_role("menuitem", name="Save scene to collection", exact=True)
        await save_item.focus()
        await save_item.press("Enter")
        await expect(changes).to_have_attribute("data-scene-saved", "true")
        await expect(stage.get_by_role("button", name="Save study", exact=True)).to_be_disabled()

        browser_stage("interactions: agent context action uses fresh menu choices")
        count_before = int(await changes.get_attribute("data-scene-count"))
        agent_action = await menu_choice("Duplicate scene")
        await expect(changes).to_have_attribute("data-scene-count", str(count_before + 1))
        await expect(scene).to_have_attribute("data-scene-count", str(count_before + 1))
        await page.keyboard.press("Escape")

        browser_stage("interactions: disabled and pending actions do not dispatch twice")
        disabled = stage.get_by_role("button", name="Publish study", exact=True)
        await expect(disabled).to_be_disabled()
        before_disabled = await state()
        await disabled.scroll_into_view_if_needed()
        box = await disabled.bounding_box()
        await page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        locked = await _entry(page, "button", "Publish study")
        refusal = await _call(page, "act", {"steps": [{"ref": locked["ref"], "action": "press", "args": []}]})
        assert await state() == before_disabled, f"Disabled activation changed scene state: {refusal}"
        await expect(stage.locator(".qgi-click-burst")).to_have_count(0)
        draft = stage.locator('button:has([data-show="pending"])')
        await draft.click()
        await expect(draft).to_have_attribute("aria-busy", "true")
        draft_box = await draft.bounding_box()
        for _ in range(2):
            await page.mouse.click(draft_box["x"] + draft_box["width"] / 2, draft_box["y"] + draft_box["height"] / 2)
        await expect(stage.get_by_label("Saved draft count", exact=True)).to_have_text("1 local draft saved")
        await expect(draft).not_to_have_attribute("aria-busy", "true")

        browser_stage("interactions: click feedback is bounded and keyboard activation is centred")
        await page.evaluate("""() => {
            const root = document.querySelector('[data-kit-view="interactions"] .qgi-click-layer');
            const probe = window.__interactionFeedback = {max: 0, bursts: []};
            probe.observer = new MutationObserver(records => {
                probe.max = Math.max(probe.max, root.childElementCount);
                for (const record of records) for (const node of record.addedNodes) {
                    if (!(node instanceof HTMLElement)) continue;
                    probe.bursts.push({effect: node.dataset.effect,
                        x: parseFloat(node.style.getPropertyValue('--qgi-click-x')),
                        y: parseFloat(node.style.getPropertyValue('--qgi-click-y')),
                        width: parseFloat(node.style.width), height: parseFloat(node.style.height)});
                }
            });
            probe.observer.observe(root, {childList: true});
        }""")
        await switch_light.scroll_into_view_if_needed()
        box = await switch_light.bounding_box()
        for _ in range(9):
            await page.mouse.click(box["x"] + 12, box["y"] + box["height"] / 2)
        await expect(stage.locator(".qgi-click-burst")).to_have_count(0)
        pointer_feedback = await page.evaluate("({max: window.__interactionFeedback.max, bursts: window.__interactionFeedback.bursts})")
        assert 0 < pointer_feedback["max"] <= 6 and pointer_feedback["bursts"], pointer_feedback
        assert all(item["effect"] == "ripple" for item in pointer_feedback["bursts"]), pointer_feedback
        await _select(page, "segmented-control", "Click response", choice="Spark")
        previous_bursts = len(pointer_feedback["bursts"])
        before_keyboard = await scene.get_attribute("data-palette")
        await switch_light.focus()
        await switch_light.press("Enter")
        await expect(scene).to_have_attribute("data-palette", "warm" if before_keyboard == "cool" else "cool")
        await page.wait_for_function("count => window.__interactionFeedback.bursts.length > count", arg=previous_bursts)
        keyboard_feedback = await page.evaluate("window.__interactionFeedback.bursts.at(-1)")
        assert keyboard_feedback["effect"] == "spark", keyboard_feedback
        assert abs(keyboard_feedback["x"] - keyboard_feedback["width"] / 2) < 1 and abs(keyboard_feedback["y"] - keyboard_feedback["height"] / 2) < 1, keyboard_feedback
        await expect(stage.locator(".qgi-click-burst")).to_have_count(0)

        browser_stage("interactions: variants and preference fallbacks preserve working actions")
        await _select(page, "segmented-control", "Cursor style", choice="Precision")
        _, x, y = await pointer_on(switch_light)
        precision = await cursor_geometry(x, y)
        await expect(layer).to_have_attribute("data-cursor-variant", "precision")
        await _select(page, "segmented-control", "Cursor style", choice="Native")
        await assert_native(switch_light)
        await _select(page, "segmented-control", "Cursor style", choice="Glass")
        await page.emulate_media(reduced_motion="reduce")
        await assert_native(switch_light)
        reduced_before = await scene.get_attribute("data-palette")
        await switch_light.click()
        await expect(scene).to_have_attribute("data-palette", "warm" if reduced_before == "cool" else "cool")
        await expect(stage.locator(".qgi-click-burst")).to_have_count(0)
        await expect(field).to_have_value("Coastal study contract")
        await page.emulate_media(reduced_motion="no-preference", forced_colors="active")
        await assert_native(switch_light)
        await switch_light.click()
        await expect(stage.locator(".qgi-click-burst")).to_have_count(0)
        await page.emulate_media(reduced_motion="no-preference", forced_colors="none")

        browser_stage("interactions: agent navigation cannot leave a floating cursor behind")
        await pointer_on(switch_light)
        await _select(page, "listbox", "Component catalogue", value="sections")
        await expect(layer).not_to_be_visible()
        await expect(scope).to_have_attribute("data-qg-cursor-state", "native")
        await _select(page, "listbox", "Component catalogue", value="interactions")
        await expect(field).to_have_value("Coastal study contract")

        browser_stage("interactions: narrow layout and visible context-menu trigger")
        await page.set_viewport_size({"width": 390, "height": 844})
        mobile_fit = await _page_fits(page)
        await trigger.click()
        await expect(menu).to_be_visible()
        menu_bounds = await menu.bounding_box()
        assert menu_bounds and menu_bounds["x"] >= -1 and menu_bounds["x"] + menu_bounds["width"] <= 391, menu_bounds
        assert menu_bounds["y"] >= -1 and menu_bounds["y"] + menu_bounds["height"] <= 845, menu_bounds
        await capture("interactions-mobile-menu.png")
        await page.keyboard.press("Escape")
        await expect(trigger).to_be_focused()

        completed = True
        return {"namedControls": named, "cursor": geometry, "precision": precision,
                "fixedTarget": {"before": before, "after": after, **hit}, "idle": quiescent,
                "scroll": {**scroll, "cursor": scroll_geometry}, "nativeContextMenu": outside,
                "agentAction": agent_action, "disabledAction": refusal, "pendingDispatches": 1,
                "pointerFeedback": {"maximumConcurrent": pointer_feedback["max"], "observed": len(pointer_feedback["bursts"])},
                "keyboardFeedback": keyboard_feedback, "hiddenCollectionCursorSuppressed": True,
                "preferences": ["reduced-motion", "forced-colours", "native-cursor"],
                "mobile": {"fit": mobile_fit, "menu": menu_bounds}, "screenshots": screenshots}
    finally:
        await page.evaluate("""() => {
            window.__interactionFeedback?.observer.disconnect();
            delete window.__interactionFeedback;
        }""")
        # Keep failed visual state intact until the runner captures its fresh context.
        if completed:
            await page.keyboard.press("Escape")
            await page.emulate_media(reduced_motion="no-preference", forced_colors="none")
            if original_viewport:
                await page.set_viewport_size(original_viewport)
