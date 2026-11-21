"""Human and SDK-agent evidence for reusable sections, not human UX validation."""

from pathlib import Path

from glass_developer_contract import _choices, _named_controls, _page_fits, _select
from glass_optics_contract import SCREENSHOT_TIMEOUT_MS, _act, _entry, browser_stage


async def verify_sections_contract(page, expect, *, base_url, output_dir):
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    original_viewport = page.viewport_size
    screenshots = []
    await page.emulate_media(reduced_motion="no-preference", forced_colors="none")
    await page.goto(base_url, wait_until="networkidle")
    await page.wait_for_function("() => typeof window.quantitativeHciAgent?.snapshot === 'function'")
    await _select(page, "listbox", "Component catalogue", value="sections")
    stage = page.locator('[data-showcase="sections"]')
    chapters = stage.locator(".qgs-chapters")
    navigation = chapters.locator(".qgs-chapter-navigation")
    await expect(stage).to_be_visible()
    await expect(chapters).to_have_attribute("data-validation", "unvalidated")
    named = await _named_controls(page)

    browser_stage("sections: discover actual SDK controls and choices")
    follow = await _entry(page, "switch", "Follow story scroll")
    chapter_control = await _entry(page, "segmented-control", "Story chapter")
    choices = await _choices(page, chapter_control)
    assert len(choices) >= 3 and len({item["value"] for item in choices}) == len(choices), choices
    initial_ids = await chapters.locator("[data-chapter-id]").evaluate_all(
        "items => items.map(item => item.dataset.chapterId)"
    )
    assert initial_ids == [item["value"] for item in choices], (initial_ids, choices)
    browser_stage("sections: natural scrolling selects the chapter beside the media")
    await expect(stage.get_by_role("switch", name="Follow story scroll", exact=True)).to_have_attribute("aria-checked", "true")
    await chapters.locator("[data-chapter-id]").last.evaluate(
        "node => node.scrollIntoView({behavior: 'instant', block: 'center'})"
    )
    await expect(chapters).to_have_attribute("data-active-chapter", choices[-1]["value"])
    scroll_selected = (await _entry(page, "segmented-control", "Story chapter"))["value"]
    assert scroll_selected == choices[-1]["value"], scroll_selected
    await _act(page, follow, "setChecked", [False])
    await expect(stage.get_by_role("switch", name="Follow story scroll", exact=True)).to_have_attribute("aria-checked", "false")
    original_text = await chapters.locator(".qgs-chapter-copy").inner_text()
    assert original_text.strip(), "Section copy is missing"
    await page.evaluate("""() => {
        const probe = window.__sectionsContract = {events: []};
        probe.stop = window.quantitativeHciAgent.subscribe(change => {
            probe.events.push(change);
            if (probe.events.length > 80) probe.events.shift();
        });
    }""")

    async def chapter_state(expected):
        await expect(chapters).to_have_attribute("data-active-chapter", expected["value"])
        radio = navigation.get_by_role("radio", name=expected["label"], exact=True)
        await expect(radio).to_have_attribute("aria-checked", "true")
        await expect(navigation.locator('[role="radio"][aria-checked="true"]')).to_have_count(1)
        await expect(navigation.locator('[role="radio"][tabindex="0"]')).to_have_count(1)
        snapshot = await _entry(page, "segmented-control", "Story chapter")
        assert snapshot["value"] == expected["value"], snapshot
        figure = chapters.locator(".qgs-chapter-figure")
        await expect(figure.locator("img")).to_have_count(1)
        await page.wait_for_function("""() => {
            const image = document.querySelector('[data-showcase="sections"] .qgs-chapter-figure img');
            return image?.complete && image.naturalWidth > 0;
        }""")
        media = await figure.evaluate("""figure => {
            const image = figure.querySelector('img');
            return {src: image.currentSrc || image.src, alt: image.alt,
                caption: figure.querySelector('figcaption')?.textContent?.trim(),
                loaded: image.complete && image.naturalWidth > 0};
        }""")
        assert media["alt"] and media["caption"] and media["loaded"], media
        return {"value": snapshot["value"], "label": expected["label"], **media}

    async def assert_copy_retained():
        assert await chapters.locator(".qgs-chapter-copy").inner_text() == original_text
        articles = await chapters.locator("[data-chapter-id]").evaluate_all("""items => items.map(item => {
            const style = getComputedStyle(item), rect = item.getBoundingClientRect();
            return {id: item.dataset.chapterId, display: style.display, visibility: style.visibility,
                opacity: Number(style.opacity), width: rect.width, height: rect.height,
                hiddenAncestor: Boolean(item.closest('[hidden],[aria-hidden="true"],[inert]'))};
        })""")
        assert [item["id"] for item in articles] == initial_ids, articles
        assert all(item["display"] != "none" and item["visibility"] == "visible"
                   and item["opacity"] > 0 and item["width"] > 0 and item["height"] > 0
                   and not item["hiddenAncestor"] for item in articles), articles
        return articles

    async def capture(name):
        await page.mouse.move(1, 1)
        await page.screenshot(path=str(output / name), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
        screenshots.append(name)

    completed = False
    try:
        await _act(page, chapter_control, "setValue", [choices[0]["value"]])
        first = await chapter_state(choices[0])
        browser_stage("sections: keyboard selection updates the actual media")
        first_radio = navigation.get_by_role("radio", name=choices[0]["label"], exact=True)
        await first_radio.focus()
        await first_radio.press("ArrowRight")
        keyboard = await chapter_state(choices[1])
        await expect(navigation.get_by_role("radio", name=choices[1]["label"], exact=True)).to_be_focused()
        assert keyboard["src"] != first["src"] and keyboard["caption"] != first["caption"], (first, keyboard)
        await assert_copy_retained()

        browser_stage("sections: SDK agent selection uses discoverable values")
        fresh = await _entry(page, "segmented-control", "Story chapter")
        fresh_choices = await _choices(page, fresh)
        selected = fresh_choices[-1]
        await _act(page, fresh, "setValue", [selected["value"]])
        agent = await chapter_state(selected)
        assert agent["src"] != keyboard["src"] and agent["caption"] != keyboard["caption"], (keyboard, agent)
        events = await page.evaluate("window.__sectionsContract.events")
        assert any(event.get("ref") == fresh["ref"] and event.get("key") == "value"
                   and event.get("value") == selected["value"] and event.get("source") == "agent"
                   for event in events), events
        await chapters.locator(".qgs-chapter-stage").scroll_into_view_if_needed()
        await capture("sections-desktop-chapter.png")

        browser_stage("sections: composition controls keep chapter content and selection")
        layouts = []
        for choice in ("Immersive", "Split"):
            option = await _select(page, "segmented-control", "Section layout", choice=choice)
            await expect(stage.locator(".qgs-demo-hero")).to_have_attribute("data-section-layout", option["value"])
            layouts.append(option)
            await chapter_state(selected)
        contour = await _select(page, "segmented-control", "Section contour", choice="Orbit")
        contour_svg = stage.locator(".qgs-demo-contour-preview svg[data-contour]")
        await expect(contour_svg).to_have_attribute("data-contour", contour["value"])
        await expect(contour_svg).to_have_attribute("aria-hidden", "true")
        assert await contour_svg.evaluate("node => getComputedStyle(node).pointerEvents") == "none"

        browser_stage("sections: narrow view fits without moving a keyboard user off the control")
        await page.set_viewport_size({"width": 390, "height": 844})
        mobile_fit = await _page_fits(page)
        await chapter_state(selected)
        await assert_copy_retained()
        current_radio = navigation.get_by_role("radio", name=selected["label"], exact=True)
        await current_radio.scroll_into_view_if_needed()
        await current_radio.focus()
        await current_radio.press("ArrowLeft")
        previous = fresh_choices[-2]
        mobile = await chapter_state(previous)
        mobile_radio = navigation.get_by_role("radio", name=previous["label"], exact=True)
        await expect(mobile_radio).to_be_focused()
        box = await mobile_radio.bounding_box()
        assert box and box["x"] >= -1 and box["x"] + box["width"] <= 391, box
        assert box["y"] >= -1 and box["y"] + box["height"] <= 845, f"Mobile chapter choice scrolled the focused control out of view: {box}"
        await capture("sections-mobile-chapter.png")

        browser_stage("sections: preferences preserve readable content and selected media")
        await page.emulate_media(reduced_motion="reduce")
        reduced = await chapter_state(previous)
        assert reduced == mobile, (mobile, reduced)
        reduced_copy = await assert_copy_retained()
        reveal = await stage.locator(".qgs-reveal").evaluate_all("""nodes => nodes.map(node => ({
            opacity: Number(getComputedStyle(node).opacity),
            running: node.getAnimations({subtree: true}).filter(animation => animation.playState === 'running').length,
            hidden: Boolean(node.closest('[hidden],[aria-hidden="true"],[inert]'))
        }))""")
        assert reveal and all(item["opacity"] == 1 and not item["hidden"] and not item["running"] for item in reveal), reveal
        await page.emulate_media(forced_colors="active", reduced_motion="reduce")
        await expect(contour_svg).not_to_be_visible()
        await chapter_state(previous)
        await assert_copy_retained()
        forced_fit = await _page_fits(page)

        completed = True
        return {
            "namedControls": named,
            "discoveredChapters": choices,
            "scrollSelected": scroll_selected,
            "keyboard": keyboard,
            "agent": agent,
            "layouts": layouts,
            "contour": contour,
            "mobile": {"viewport": {"width": 390, "height": 844}, "fit": mobile_fit,
                       "focusInView": box, "selected": mobile},
            "reducedMotion": {"contentRetained": len(reduced_copy), "reveal": reveal},
            "forcedColours": {"fit": forced_fit, "contourSuppressed": True},
            "screenshots": screenshots,
        }
    finally:
        await page.evaluate("""() => {
            window.__sectionsContract?.stop();
            delete window.__sectionsContract;
        }""")
        # Keep failed visual state intact until the runner captures its fresh context.
        if completed:
            await page.emulate_media(reduced_motion="no-preference", forced_colors="none")
            if original_viewport:
                await page.set_viewport_size(original_viewport)
