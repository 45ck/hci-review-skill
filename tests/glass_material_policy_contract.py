"""Scoped theme, reading-surface and wrapped-control evidence on the built gallery."""

import asyncio
from pathlib import Path

from glass_developer_contract import _choices, _page_fits, _select
from glass_optics_contract import SCREENSHOT_TIMEOUT_MS, _act, _entry, _settings, browser_stage


READING_STYLES = """surface => {
    const rgba = value => {
        if (!/^rgba?\\(/.test(value)) throw new Error(`Expected resolved sRGB, received ${value}`);
        const values = value.match(/[\\d.]+/g).map(Number);
        return [...values.slice(0, 3), values[3] ?? 1];
    };
    const luminance = channels => channels.slice(0, 3).map(channel => channel / 255)
        .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
        .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    const style = getComputedStyle(surface), background = rgba(style.backgroundColor);
    const samples = [...surface.querySelectorAll(
        '[data-slot="popover-title"], [data-slot="select-label"], .kit-setting-row > span, #kit-motion-description'
    )].map(node => {
        const computed = getComputedStyle(node), foreground = rgba(computed.color);
        const light = luminance(foreground), dark = luminance(background);
        return {text: node.textContent.trim(), foreground: computed.color, alpha: foreground[3],
            fontSize: computed.fontSize, ratio: (Math.max(light, dark) + .05) / (Math.min(light, dark) + .05)};
    });
    return {intent: surface.dataset.liquidIntent, background: style.backgroundColor,
        backgroundAlpha: background[3], opacity: Number(style.opacity),
        backgroundImage: style.backgroundImage, backdropFilter: style.backdropFilter, samples};
}"""


GROUP_GEOMETRY = """group => {
    const bounds = node => {
        const rect = node.getBoundingClientRect();
        return {x: rect.x, y: rect.y, width: rect.width, height: rect.height,
            right: rect.right, bottom: rect.bottom};
    };
    const items = [...group.querySelectorAll('[data-slot="segmented-control-item"]')].map(node => {
        const range = document.createRange();
        range.selectNodeContents(node);
        const lines = new Set([...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0)
            .map(rect => Math.round(rect.top)));
        return {label: node.textContent.trim(), checked: node.getAttribute('aria-checked') === 'true',
            rect: bounds(node), lineCount: lines.size, whiteSpace: getComputedStyle(node).whiteSpace,
            clientWidth: node.clientWidth, scrollWidth: node.scrollWidth};
    });
    const indicator = group.querySelector('[data-slot="segmented-control-indicator"]');
    return {layout: group.dataset.liquidLayout, rect: bounds(group), items,
        indicator: indicator ? bounds(indicator) : null,
        viewport: {width: innerWidth, height: innerHeight}};
}"""


def _assert_group_bounds(geometry):
    group = geometry["rect"]
    assert geometry["layout"] == "wrap", geometry
    assert group["width"] > 0 and group["height"] > 0, geometry
    assert group["x"] >= -1 and group["right"] <= geometry["viewport"]["width"] + 1, geometry
    assert group["y"] >= -1 and group["bottom"] <= geometry["viewport"]["height"] + 1, geometry
    assert len({round(item["rect"]["y"]) for item in geometry["items"]}) >= 2, geometry
    assert any(item["lineCount"] >= 2 for item in geometry["items"]), geometry
    for item in geometry["items"]:
        rect = item["rect"]
        assert rect["x"] >= group["x"] - 1 and rect["right"] <= group["right"] + 1, geometry
        assert rect["y"] >= group["y"] - 1 and rect["bottom"] <= group["bottom"] + 1, geometry
        assert item["scrollWidth"] <= item["clientWidth"] + 1, item
        assert item["whiteSpace"] in ("normal", "pre-wrap", "break-spaces"), item
    checked = [item for item in geometry["items"] if item["checked"]]
    assert len(checked) == 1 and geometry["indicator"], geometry
    indicator = geometry["indicator"]
    assert indicator["width"] > 0 and indicator["height"] > 0, geometry
    assert indicator["x"] >= group["x"] - 2 and indicator["right"] <= group["right"] + 2, geometry
    assert indicator["y"] >= group["y"] - 2 and indicator["bottom"] <= group["bottom"] + 2, geometry
    assert all(abs(indicator[key] - checked[0]["rect"][key]) <= 2
               for key in ("x", "y", "width", "height")), geometry


async def verify_material_policy_contract(page, expect, *, base_url, output_dir):
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    original_viewport = page.viewport_size
    original_navigation = original_prompt = original_settings = original_sections = original_media = None
    original_labels = None
    failure = None
    screenshots = []
    report = {"validation": "unvalidated", "screenshots": screenshots,
              "contrastScope": "Computed sRGB text over the opaque reading surface only; not sampled glass pixels or a WCAG conformance assessment."}

    async def choose(label, value):
        selected = await _select(page, "select", label, value=value)
        accepted = await _entry(page, "select", label)
        assert accepted["value"] == selected["value"], accepted
        return accepted["value"]

    async def policy(material, contrast, reason):
        await expect(page.locator("html")).to_have_attribute("data-liquid-material", material)
        await expect(page.locator("html")).to_have_attribute("data-liquid-contrast", contrast)
        await page.wait_for_function("""reason =>
            (document.documentElement.dataset.liquidReducedReason ?? null) === reason
        """, arg=reason, timeout=5000)
        return await page.evaluate("""() => {
            const state = document.documentElement.dataset;
            return {theme: state.liquidTheme, material: state.liquidMaterial,
                contrast: state.liquidContrast, reducedReason: state.liquidReducedReason ?? null};
        }""")

    async def capture(locator, name):
        await locator.screenshot(path=str(output / name), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
        screenshots.append(name)

    async def restore():
        if original_labels is not None:
            await page.locator('[data-showcase="sections"] .qgs-chapter-navigation [role="radio"]').evaluate_all(
                "(nodes, labels) => nodes.forEach((node, index) => { node.textContent = labels[index]; })", original_labels)
        if original_sections is not None:
            await _act(page, await _entry(page, "segmented-control", "Story chapter"), "setValue", [original_sections["value"]])
            await _act(page, await _entry(page, "switch", "Follow story scroll"), "setChecked", [original_sections["follow"]])
        if original_settings is not None:
            await _settings(page)
            for label in ("Theme", "Glass finish", "Appearance"):
                await choose(label, original_settings[label])
            await _act(page, await _entry(page, "switch", "Increase contrast"), "setChecked", [original_settings["contrast"]])
            await _act(page, await _entry(page, "popover", "Glass material"), "setOpen", [False])
        if original_prompt is not None:
            await _select(page, "listbox", "Component catalogue", value="assistant")
            await _act(page, await _entry(page, "textarea", "Design prompt"), "setValue", [original_prompt])
        if original_navigation is not None:
            await _select(page, "listbox", "Component catalogue", value=original_navigation)

    try:
        await page.goto(base_url, wait_until="networkidle")
        await page.wait_for_function("() => typeof window.quantitativeHciAgent?.snapshot === 'function'")
        original_navigation = (await _entry(page, "listbox", "Component catalogue"))["value"]
        original_media = await page.evaluate("""() => ({
            color_scheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
            reduced_motion: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'no-preference',
            forced_colors: matchMedia('(forced-colors: active)').matches ? 'active' : 'none'
        })""")
        await page.emulate_media(color_scheme="light", reduced_motion="reduce", forced_colors="none")
        await _select(page, "listbox", "Component catalogue", value="assistant")
        prompt = page.locator('[data-kit-view="assistant"]').get_by_role("textbox", name="Design prompt", exact=True)
        original_prompt = await prompt.input_value()
        draft = "Keep this draft while I change the theme."
        await _act(page, await _entry(page, "textarea", "Design prompt"), "setValue", [draft])
        await expect(prompt).to_have_value(draft)
        draft_node = await prompt.element_handle()
        assert draft_node is not None

        browser_stage("material policy: open settings from its keyboard trigger")
        trigger = page.get_by_role("button", name="Material settings", exact=True)
        await trigger.focus()
        await trigger.press("Enter")
        await _settings(page)
        settings = page.locator(".kit-material-popover")
        await expect(settings).to_be_visible()
        await expect(settings).to_have_attribute("data-liquid-intent", "reading")
        original_settings = {label: (await _entry(page, "select", label))["value"]
                             for label in ("Theme", "Glass finish", "Appearance")}
        original_settings["contrast"] = (await _entry(page, "switch", "Increase contrast"))["checked"]
        await choose("Appearance", "glass")
        await choose("Glass finish", "regular")
        await _act(page, await _entry(page, "switch", "Increase contrast"), "setChecked", [False])

        themes = []
        for theme in ("light", "dark"):
            browser_stage("material policy: theme preserves the draft and opaque reading surface", theme=theme)
            await choose("Theme", theme)
            await expect(page.locator("html")).to_have_attribute("data-liquid-theme", theme)
            effective = await policy("regular", "normal", None)
            await expect(prompt).to_have_value(draft)
            assert await prompt.evaluate("(node, original) => node === original", draft_node), \
                "Changing the theme remounted the draft field"
            styles = await settings.evaluate(READING_STYLES)
            assert styles["intent"] == "reading" and styles["backgroundAlpha"] == 1 and styles["opacity"] == 1, styles
            assert styles["backgroundImage"] == "none", \
                f"{theme} reading surface retained a decorative background image over its opaque base: {styles}"
            assert styles["backdropFilter"] == "none", \
                f"{theme} reading surface retained a backdrop filter: {styles}"
            assert len(styles["samples"]) >= 4, styles
            assert all(sample["alpha"] == 1 and sample["ratio"] >= 4.5 for sample in styles["samples"]), styles
            await capture(settings, f"material-settings-{theme}.png")
            themes.append({"requested": theme, "effective": effective, "reading": styles,
                           "draftRetained": True, "draftNodeRetained": True})
        report["themes"] = themes

        browser_stage("material policy: requested clear finish yields to increased contrast")
        await choose("Glass finish", "clear")
        clear = await policy("clear", "normal", None)
        await _act(page, await _entry(page, "switch", "Increase contrast"), "setChecked", [True])
        increased = await policy("solid", "more", "increased-contrast")
        assert (await _entry(page, "select", "Glass finish"))["value"] == "clear"
        await expect(settings.get_by_text("Increased contrast uses solid surfaces.", exact=True)).to_be_visible()
        await expect(prompt).to_have_value(draft)
        assert await prompt.evaluate("(node, original) => node === original", draft_node)
        await _act(page, await _entry(page, "switch", "Increase contrast"), "setChecked", [False])
        resumed = await policy("clear", "normal", None)
        report["materialPolicy"] = {"clear": clear, "increasedContrast": increased, "resumedRequestedFinish": resumed}
        done = settings.get_by_role("button", name="Done", exact=True)
        await done.focus()
        await done.press("Enter")
        await expect(settings).not_to_be_visible()
        await expect(trigger).to_be_focused()
        assert (await _entry(page, "textarea", "Design prompt"))["value"] == draft
        report["settingsKeyboardFocusReturned"] = True

        browser_stage("material policy: narrow wrapped chapter controls with expanded copy")
        await _select(page, "listbox", "Component catalogue", value="sections")
        chapter_control = await _entry(page, "segmented-control", "Story chapter")
        follow = await _entry(page, "switch", "Follow story scroll")
        original_sections = {"value": chapter_control["value"], "follow": follow["checked"]}
        await _act(page, follow, "setChecked", [False])
        await page.set_viewport_size({"width": 320, "height": 844})
        chapters = page.locator('[data-showcase="sections"] .qgs-chapters')
        navigation = chapters.locator(".qgs-chapter-navigation")
        items = navigation.get_by_role("radio")
        original_labels = await items.all_text_contents()
        expanded = [f"{label.strip()}: explore the scene, context and design details" for label in original_labels]
        # This changes only rendered fixture text; SDK values and host state stay authoritative.
        await items.evaluate_all("(nodes, labels) => nodes.forEach((node, index) => { node.textContent = labels[index]; })", expanded)
        await navigation.scroll_into_view_if_needed()
        await expect(navigation).to_have_attribute("data-liquid-layout", "wrap")
        choices = await _choices(page, await _entry(page, "segmented-control", "Story chapter"))
        assert len(choices) == len(expanded) and len(choices) >= 3, choices
        assert len({choice["value"] for choice in choices}) == len(choices), choices
        selected = choices[-1]
        await _act(page, await _entry(page, "segmented-control", "Story chapter"), "setValue", [selected["value"]])
        await expect(chapters).to_have_attribute("data-active-chapter", selected["value"])
        accepted = await _entry(page, "segmented-control", "Story chapter")
        assert accepted["value"] == selected["value"], accepted
        await expect(navigation.locator('[role="radio"][aria-checked="true"]')).to_have_count(1)
        await expect(navigation.locator('[role="radio"][tabindex="0"]')).to_have_count(1)
        await navigation.scroll_into_view_if_needed()
        await page.wait_for_function("""() => {
            const group = document.querySelector('[data-showcase="sections"] .qgs-chapter-navigation');
            const checked = group?.querySelector('[aria-checked="true"]')?.getBoundingClientRect();
            const indicator = group?.querySelector('[data-slot="segmented-control-indicator"]')?.getBoundingClientRect();
            return checked && indicator && ['x', 'y', 'width', 'height'].every(key => Math.abs(checked[key] - indicator[key]) <= 2);
        }""", timeout=5000)
        geometry = await navigation.evaluate(GROUP_GEOMETRY)
        _assert_group_bounds(geometry)
        await capture(navigation, "material-wrapped-chapters-320.png")
        report["narrowChapters"] = {"viewport": {"width": 320, "height": 844},
            "fixture": "Temporary rendered text expansion on real SDK controls; not localization or host-prop integration.",
            "labels": expanded, "discoveredChoices": choices, "acceptedValue": accepted["value"],
            "pageFit": await _page_fits(page), "geometry": geometry}
    except BaseException as error:
        failure = error
        if not isinstance(error, asyncio.CancelledError) and not page.is_closed():
            try:
                await page.screenshot(path=str(output / "material-policy-failure.png"), animations="allow", timeout=3000)
            except Exception as capture_error:
                error.add_note(f"Material policy failure screenshot unavailable: {capture_error}")
        raise
    finally:
        try:
            await asyncio.wait_for(restore(), timeout=15)
            report["preferencesDraftAndNavigationRestored"] = True
        except Exception as error:
            if failure is not None:
                failure.add_note(f"Material policy cleanup also failed: {error}")
            else:
                raise
        finally:
            if original_media is not None:
                await page.emulate_media(**original_media)
            if original_viewport:
                await page.set_viewport_size(original_viewport)
    return report
