"""Presentation choices on real controls, isolated from the optics benchmarks.

Font loading, rendered icon pixels and state continuity are implementation
evidence. They do not establish human recognition, reading speed or preference.
"""

import asyncio
import re
from pathlib import Path

from glass_optics_contract import (
    SCREENSHOT_TIMEOUT_MS,
    _act,
    _call,
    _difference,
    _entry,
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

    browser_stage("appearance: load isolated default kit")
    await page.goto(base_url, wait_until="networkidle")
    await expect(root).to_have_attribute("data-liquid-font", "studio")
    await expect(root).to_have_attribute("data-liquid-icons", "isometric")
    await ready()
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
    browser_stage("appearance: invalid stored presets use defaults")
    await page.evaluate("""() => {
        localStorage.setItem('qg-kit-font', '__unsupported_font__');
        localStorage.setItem('qg-kit-icons', '__unsupported_icons__');
    }""")
    await page.reload(wait_until="networkidle")
    await expect(root).to_have_attribute("data-liquid-font", "studio")
    await expect(root).to_have_attribute("data-liquid-icons", "isometric")
    await ready()
    return {"defaults": {"fontSet": "studio", "iconSet": "isometric"},
            "fonts": {"studio": studio, "editorial": editorial, "system": system},
            "icons": icons, "iconPixelDifference": icon_difference,
            "choices": choices_used, "stateContinuity": preserved,
            "copyStarter": {"fontSet": "editorial", "iconSet": "line", "clipboardIO": "isolated writeText spy"},
            "persisted": stored, "resetDefaults": True, "invalidStorageDefaults": True,
            "forcedColoursUseLine": True, "screenshots": screenshots}
