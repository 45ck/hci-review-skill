"""Presentation choices on real controls, isolated from the optics benchmarks.

Font loading, rendered icon pixels and state continuity are implementation
evidence. They do not establish human recognition, reading speed or preference.
"""

import asyncio
from collections import Counter
from math import ceil, floor
import re
from pathlib import Path
from urllib.parse import urlsplit

from glass_optics_contract import (
    SCREENSHOT_TIMEOUT_MS,
    _act,
    _call,
    _difference,
    _entry,
    _png_rgb,
    _settings,
    browser_stage,
    settled_motion,
)


async def verify_appearance_contract(page, expect, *, base_url, output_dir, require_gpu):
    output = Path(output_dir)
    root = page.locator("html")
    screenshots = []
    choices_used = []

    async def ready():
        await expect(root).to_have_attribute("data-liquid-status", re.compile(r"^(ready|unavailable)$"), timeout=25000)
        if require_gpu:
            await expect(root).to_have_attribute("data-liquid-status", "ready")
        await settled_motion(page)

    async def select(label, choice):
        browser_stage("appearance: select through SDK", control=label, choice=choice)
        await _settings(page)
        control = await _entry(page, "select", label)
        queried = await _call(page, "query", {"within": control["ref"]})
        options = [item for entry in queried if entry["ref"] == control["ref"]
                   for item in entry.get("items", []) if item["label"] == choice]
        assert len(options) == 1, f"Appearance choice is not discoverable: {label} / {choice}: {queried}"
        await _act(page, control, "setValue", [options[0]["value"]])
        await expect(page.get_by_role("combobox", name=label, exact=True)).to_contain_text(choice)
        choices_used.append({"control": label, "choice": choice, "source": "agent"})

    async def close_settings():
        await _act(page, await _entry(page, "popover", "Glass material"), "setOpen", [False])
        await page.locator(".kit-material-popover").wait_for(state="hidden")
        await page.mouse.move(1, 1)
        await ready()

    async def capture(name):
        await page.screenshot(path=str(output / name), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
        screenshots.append(name)

    async def fonts(preset, heading, body, *, popup=False):
        browser_stage("appearance: font loading and computed roles", preset=preset)
        families = [] if preset == "system" else sorted({heading, body})
        evidence = await asyncio.wait_for(page.evaluate(r"""async ({families, popup}) => {
            const loaded = {};
            for (const family of families) {
                const faces = await document.fonts.load(`500 16px "${family}"`, 'Quantive');
                loaded[family] = faces.map(face => ({family: face.family, status: face.status}));
            }
            const familyOf = selector => {
                const node = document.querySelector(selector);
                return node ? getComputedStyle(node).fontFamily : null;
            };
            return {loaded,
                heading: familyOf('.kit-main h1, main h1, h1'),
                body: familyOf('[data-optics-probe="input"]'),
                popupBody: popup ? familyOf('.kit-material-popover [data-slot="select-trigger"]') : null,
                popupTitle: popup ? familyOf('.kit-material-popover [data-slot="popover-title"]') : null,
                fontRequests: performance.getEntriesByType('resource')
                    .filter(entry => /\.woff2(?:\?|$)/.test(entry.name))
                    .map(entry => ({path: new URL(entry.name).pathname,
                        sameOrigin: new URL(entry.name).origin === location.origin}))};
        }""", {"families": families, "popup": popup}), timeout=5)
        for family in families:
            faces = evidence["loaded"][family]
            assert faces and all(face["status"] == "loaded" for face in faces), f"Font silently fell back: {evidence}"
        if preset == "system":
            assert all(name not in evidence["heading"] + evidence["body"]
                       for name in ["Manrope", "Fraunces"]), evidence
        else:
            assert heading in evidence["heading"] and body in evidence["body"], evidence
            assert evidence["fontRequests"] and all(request["sameOrigin"] for request in evidence["fontRequests"]), evidence
            if popup:
                assert body in evidence["popupBody"] and heading in evidence["popupTitle"], evidence
        return evidence

    async def continuity():
        evidence = await page.evaluate("""() => ({
            sameInput: window.__appearanceInput === document.querySelector('[data-optics-probe="input"]'),
            inputConnected: window.__appearanceInput?.isConnected,
            value: window.__appearanceInput?.value,
            sameCanvas: window.__appearanceCanvas === document.querySelector('canvas[data-liquid-canvas="viewport"]'),
            revision: Number(document.documentElement.dataset.liquidRenderRevision)
        })""")
        assert evidence["sameInput"] and evidence["inputConnected"] and evidence["sameCanvas"], evidence
        assert evidence["value"] == "Unsent studio draft", evidence
        assert evidence["revision"] >= initial_revision, evidence
        return evidence

    browser_stage("appearance: recover invalid stored presets on initial mount")
    address = urlsplit(base_url)
    origin = f"{address.scheme}://{address.netloc}"
    storage = await page.context.storage_state()
    stored_before_mount = {
        item["name"]: item["value"]
        for site in storage.get("origins", []) if site["origin"] == origin
        for item in site.get("localStorage", [])
    }
    invalid_stored = {
        "font": stored_before_mount.get("qg-kit-font"),
        "icons": stored_before_mount.get("qg-kit-icons"),
    }
    assert invalid_stored == {"font": "__unsupported_font__", "icons": "__unsupported_icons__"}, invalid_stored
    await page.goto(base_url, wait_until="networkidle")
    await expect(root).to_have_attribute("data-liquid-font", "studio")
    await expect(root).to_have_attribute("data-liquid-icons", "isometric")
    await ready()
    recovered_storage = await page.evaluate("({font: localStorage.getItem('qg-kit-font'), icons: localStorage.getItem('qg-kit-icons')})")
    assert recovered_storage == {"font": "studio", "icons": "isometric"}, recovered_storage
    studio = await fonts("studio", "Manrope", "Manrope")
    field = page.get_by_label("Project name", exact=True)
    await field.fill("Unsent studio draft")
    initial_revision = await page.evaluate("""() => {
        window.__appearanceInput = document.querySelector('[data-optics-probe="input"]');
        window.__appearanceCanvas = document.querySelector('canvas[data-liquid-canvas="viewport"]');
        return Number(document.documentElement.dataset.liquidRenderRevision);
    }""")
    icon = page.locator('[data-liquid-icon="layers"]').first
    await expect(icon).to_be_visible()
    await expect(icon).to_have_attribute("data-icon-style", "isometric")
    icons = await page.locator("[data-liquid-icon]").evaluate_all("""nodes => ({
        count: nodes.length,
        isometric: nodes.filter(node => node.dataset.iconStyle === 'isometric').length,
        decorative: nodes.every(node => node.getAttribute('aria-hidden') === 'true'),
        rasters: nodes.reduce((sum, node) => sum + node.querySelectorAll('image, foreignObject').length, 0),
        duplicateIds: (() => {const ids = nodes.flatMap(node => [...node.querySelectorAll('[id]')].map(part => part.id));
            return ids.filter((id, index) => ids.indexOf(id) !== index);})()
    })""")
    assert icons["isometric"] >= 6 and icons["decorative"] and icons["rasters"] == 0 and not icons["duplicateIds"], icons
    await page.mouse.move(1, 1)
    await ready()
    iso_pixels = await icon.screenshot(animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
    await capture("appearance-studio-isometric.png")

    await select("Font set", "Editorial — Fraunces")
    await expect(root).to_have_attribute("data-liquid-font", "editorial")
    editorial = await fonts("editorial", "Fraunces", "Manrope", popup=True)
    preserved = [await continuity()]
    await settled_motion(page)
    await capture("appearance-settings.png")
    await close_settings()
    await capture("appearance-editorial-isometric.png")

    await select("Icon style", "Line")
    await expect(root).to_have_attribute("data-liquid-icons", "line")
    await close_settings()
    await expect(icon).to_have_attribute("data-icon-style", "line")
    line_pixels = await icon.screenshot(animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
    icon_difference = _difference(iso_pixels, line_pixels)
    assert icon_difference["changedFraction"] > 0.05, f"Icon choice changed no meaningful pixels: {icon_difference}"
    preserved.append(await continuity())

    # Isolate clipboard I/O while exercising the actual Copy starter button and
    # exported source; never read the user's or the runner's existing clipboard.
    await page.evaluate("""() => {
        Object.defineProperty(navigator, 'clipboard', {configurable: true,
            value: {writeText: async value => {window.__appearanceStarter = value;}}});
    }""")
    await _act(page, await _entry(page, "button", "Copy starter"), "press", [])
    copied = await page.evaluate("window.__appearanceStarter")
    assert isinstance(copied, str) and 'fontSet="editorial"' in copied and 'iconSet="line"' in copied, copied
    assert "@quantitative-hci/liquid-glass/webgpu" in copied, "Starter lost the shared provider"

    browser_stage("appearance: keyboard font selection")
    await _settings(page)
    font_control = page.get_by_role("combobox", name="Font set", exact=True)
    await font_control.focus()
    await font_control.press("ArrowDown")
    await page.keyboard.press("End")
    await page.keyboard.press("Enter")
    await expect(root).to_have_attribute("data-liquid-font", "system")
    await expect(font_control).to_contain_text("System")
    await expect(font_control).to_be_focused()
    choices_used.append({"control": "Font set", "choice": "System", "source": "keyboard"})
    system = await fonts("system", "", "")
    preserved.append(await continuity())
    await close_settings()
    await capture("appearance-system-line.png")
    stored = await page.evaluate("({font: localStorage.getItem('qg-kit-font'), icons: localStorage.getItem('qg-kit-icons')})")
    assert stored == {"font": "system", "icons": "line"}, stored

    browser_stage("appearance: persisted choices survive reload")
    await page.reload(wait_until="networkidle")
    await expect(root).to_have_attribute("data-liquid-font", "system")
    await expect(root).to_have_attribute("data-liquid-icons", "line")
    await ready()
    await select("Icon style", "Isometric")
    await close_settings()
    await page.emulate_media(forced_colors="active")
    await expect(root).to_have_attribute("data-liquid-status", "reduced")
    forced_icon = page.locator('[data-liquid-icon="layers"]').first
    await expect(forced_icon.locator('svg[data-icon-variant="line"]')).to_be_visible()
    await expect(forced_icon.locator('svg[data-icon-variant="isometric"]')).not_to_be_visible()
    solid_button = page.get_by_role("button", name="Open library", exact=True)
    await solid_button.scroll_into_view_if_needed()
    forced_label = await solid_button.evaluate(r"""button => {
        const label = 'Open library';
        const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
        let text;
        while ((text = walker.nextNode()) && !text.data.includes(label)) {}
        if (!text) throw new Error('Missing actual Open library text node');
        const range = document.createRange();
        const start = text.data.indexOf(label);
        range.setStart(text, start);
        range.setEnd(text, start + label.length);
        const rect = range.getBoundingClientRect();
        const bounds = button.getBoundingClientRect();
        const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
        return {text: label, rect: [rect.x - bounds.x, rect.y - bounds.y, rect.width, rect.height],
            buttonSize: [bounds.width, bounds.height],
            foreground: rgb(getComputedStyle(text.parentElement).color),
            computedBackground: rgb(getComputedStyle(button).backgroundColor)};
    }""")
    label_screenshot = "appearance-forced-colours-label.png"
    width, height, rgb = _png_rgb(await solid_button.screenshot(
        path=str(output / label_screenshot), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS))
    screenshots.append(label_screenshot)
    x, y, text_width, text_height = forced_label["rect"]
    scale_x, scale_y = width / forced_label["buttonSize"][0], height / forced_label["buttonSize"][1]
    left, top = max(0, ceil(x * scale_x)), max(0, ceil(y * scale_y))
    right, bottom = min(width, floor((x + text_width) * scale_x)), min(height, floor((y + text_height) * scale_y))
    pixels = [rgb[(row * width + column) * 3:(row * width + column) * 3 + 3]
              for row in range(top, bottom) for column in range(left, right)]
    assert pixels, f"Forced-colour label has no rendered text area: {forced_label}"
    patch_left, patch_right = max(left, ceil(4 * scale_x)), min(right, width - ceil(4 * scale_x))
    patch_top = max(ceil(4 * scale_y), ceil((y + text_height + 2) * scale_y))
    patch_bottom = min(height - ceil(4 * scale_y), floor((y + text_height + 4) * scale_y))
    patch = [tuple(rgb[(row * width + column) * 3:(row * width + column) * 3 + 3])
             for row in range(patch_top, patch_bottom) for column in range(patch_left, patch_right)]
    assert patch, f"No empty button interior beneath the label: {forced_label}"
    background = Counter(patch).most_common(1)[0][0]
    uniform = sum(max(abs(a - b) for a, b in zip(pixel, background)) <= 18 for pixel in patch) / len(patch)
    forced_label.update({"background": list(background),
                         "backgroundPatch": [patch_left, patch_top, patch_right, patch_bottom],
                         "backgroundPatchPixels": len(patch), "backgroundPatchUniformFraction": round(uniform, 5)})
    assert uniform > 0.9, f"Button background reference is not predominantly uniform: {forced_label}"
    assert max(abs(a - b) for a, b in zip(forced_label["foreground"], forced_label["background"])) > 36, forced_label
    fractions = {name: sum(max(abs(a - b) for a, b in zip(pixel, forced_label[name])) <= 18
                           for pixel in pixels) / len(pixels) for name in ("foreground", "background")}
    forced_label.update({"sampledPixels": len(pixels), "maxChannelDistance": 18,
                         "foregroundFraction": round(fractions["foreground"], 5),
                         "backgroundFraction": round(fractions["background"], 5),
                         "screenshot": label_screenshot})
    assert fractions["background"] > 0.25 and fractions["foreground"] > 0.02, f"Forced-colour text must contain visible glyphs and background gaps: {forced_label}"
    await capture("appearance-forced-colours.png")
    await page.emulate_media(forced_colors="none")
    await ready()

    browser_stage("appearance: reset defaults")
    await _settings(page)
    await _act(page, await _entry(page, "button", "Reset material"), "press", [])
    await expect(root).to_have_attribute("data-liquid-font", "studio")
    await expect(root).to_have_attribute("data-liquid-icons", "isometric")
    assert (await _entry(page, "select", "Font set"))["value"] == "studio"
    assert (await _entry(page, "select", "Icon style"))["value"] == "isometric"
    await close_settings()
    return {"defaults": {"fontSet": "studio", "iconSet": "isometric"},
            "fonts": {"studio": studio, "editorial": editorial, "system": system},
            "icons": icons, "iconPixelDifference": icon_difference,
            "choices": choices_used, "stateContinuity": preserved,
            "copyStarter": {"fontSet": "editorial", "iconSet": "line", "clipboardIO": "isolated writeText spy"},
            "persisted": stored, "resetDefaults": True, "invalidStorageDefaults": True,
            "invalidStorageRecovery": {"beforeMount": invalid_stored, "afterMount": recovered_storage},
            "forcedColoursUseLine": True, "forcedColourLabelPixels": forced_label, "screenshots": screenshots}
