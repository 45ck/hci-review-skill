#!/usr/bin/env python3
"""Audit the spotlight glass Liquid Glass reference in Chromium and emit evidence as JSON."""

import argparse
from functools import lru_cache
import hashlib
from io import BytesIO
import json
from math import ceil, floor
from pathlib import Path
import re

from measure import contrast_ratio


EXAMPLE = Path(__file__).resolve().parent.parent / "examples" / "spotlight-glass.html"
DESKTOP = {"viewport": {"width": 1280, "height": 850}, "color_scheme": "light"}
MOBILE = {
    "viewport": {"width": 320, "height": 740},
    "device_scale_factor": 2,
    "is_mobile": True,
    "has_touch": True,
    "color_scheme": "dark",
}
TEXT_MINIMUM = 4.5
TARGET_MINIMUM_PX = 44
BRIGHT_BACKDROP = "#f5f7ff"
FRAMES = "() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))"


def linear_channel(value):
    scaled = value / 255
    return scaled / 12.92 if scaled <= 0.04045 else ((scaled + 0.055) / 1.055) ** 2.4


CHANNEL_LUMINANCE = tuple(map(linear_channel, range(256)))


@lru_cache(maxsize=8192)
def luminance(rgb):
    red, green, blue = (CHANNEL_LUMINANCE[value] for value in rgb)
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue


def text_regions(page, selector):
    return page.evaluate(
        """selector => {
          const root = document.querySelector("main");
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
          const regions = [];
          const range = new Range();
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const text = node.textContent.trim();
            if (!text || node.parentElement.closest(".visually-hidden") || !node.parentElement.closest(selector)) continue;
            const element = node.parentElement;
            const style = getComputedStyle(element);
            if (style.visibility !== "visible") continue;
            range.selectNodeContents(node);
            const rects = Array.from(range.getClientRects(), rect => ({
              x: rect.x + scrollX,
              y: rect.y + scrollY,
              width: rect.width,
              height: rect.height,
            })).filter(rect => rect.width > 0 && rect.height > 0);
            if (rects.length) regions.push({text, color: style.color, rects});
          }
          return regions;
        }""",
        selector,
    )


def sample_contrast(page, image_class, selector="main"):
    regions = text_regions(page, selector)
    if not regions:
        raise ValueError("no visible text regions found in the fixture")
    # A contents-only wrapper hides glyph paint even when system colours are forced.
    page.evaluate(
        """() => {
          const walker = document.createTreeWalker(document.querySelector("main"), NodeFilter.SHOW_TEXT);
          const nodes = [];
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (node.textContent.trim()) nodes.push(node);
          }
          for (const node of nodes) {
            const wrapper = document.createElement("span");
            wrapper.dataset.auditInk = "";
            wrapper.style.cssText = "display:contents; forced-color-adjust:none; -webkit-text-fill-color:transparent";
            node.replaceWith(wrapper);
            wrapper.append(node);
          }
        }"""
    )
    try:
        layout = [(region["text"], region["rects"]) for region in regions]
        captured_layout = [(region["text"], region["rects"]) for region in text_regions(page, selector)]
        if captured_layout != layout:
            raise ValueError("hiding text changed the measured line bounds")
        screenshot = page.screenshot(full_page=True, scale="css", animations="disabled")
    finally:
        page.locator("[data-audit-ink]").evaluate_all(
            "wrappers => wrappers.forEach(wrapper => wrapper.replaceWith(...wrapper.childNodes))"
        )

    with image_class.open(BytesIO(screenshot)) as screenshot_image:
        background = screenshot_image.convert("RGB")
    samples = []
    for region in regions:
        color = re.fullmatch(r"rgb\((\d+), (\d+), (\d+)\)", region["color"])
        if not color:
            raise ValueError(f"fixture audit requires opaque sRGB text, found {region['color']}")
        text_luminance = luminance(tuple(map(int, color.groups())))
        ratios = []
        for rect in region["rects"]:
            left = max(0, floor(rect["x"]))
            top = max(0, floor(rect["y"]))
            right = min(background.width, ceil(rect["x"] + rect["width"]))
            bottom = min(background.height, ceil(rect["y"] + rect["height"]))
            if right > left and bottom > top:
                with background.crop((left, top, right, bottom)) as pixels:
                    channels = iter(pixels.tobytes())
                    ratios.append(min(
                        contrast_ratio(text_luminance, luminance(rgb))
                        for rgb in zip(channels, channels, channels)
                    ))
        if ratios:
            samples.append((min(ratios), region["text"]))

    if not samples:
        raise ValueError("visible text regions did not intersect the screenshot")
    minimum, worst_text = min(samples)
    return {
        "minimum_ratio": round(minimum, 3),
        "text_regions": len(samples),
        "worst_text": worst_text,
        "passed": minimum >= TEXT_MINIMUM,
    }


def layout_geometry(page):
    return page.locator(".surface-switch, .measure, .detail").evaluate_all(
        "elements => elements.map(element => element.getBoundingClientRect().toJSON())"
    )


def pointer_position(toolbar):
    return toolbar.evaluate(
        "toolbar => ['--spot-x', '--spot-y'].map(name => toolbar.style.getPropertyValue(name))"
    )


def move_over_toolbar(page, toolbar, dx=18, dy=10):
    bounds = toolbar.bounding_box()
    page.mouse.move(bounds["x"] + dx, bounds["y"] + dy)
    page.evaluate(FRAMES)


def burst_pointer_events(toolbar):
    return toolbar.evaluate(
        """async toolbar => {
          const rect = toolbar.getBoundingClientRect();
          let styleMutations = 0;
          const observer = new MutationObserver(records => { styleMutations += records.length; });
          observer.observe(toolbar, {attributes: true, attributeFilter: ["style"]});
          try {
            for (let i = 0; i < 24; i++) {
              toolbar.dispatchEvent(new PointerEvent("pointermove", {
                pointerType: "mouse", clientX: rect.left + 25 + i, clientY: rect.top + 15,
              }));
            }
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            const x = parseFloat(toolbar.style.getPropertyValue("--spot-x"));
            const y = parseFloat(toolbar.style.getPropertyValue("--spot-y"));
            return {
              events: 24,
              style_mutations: styleMutations,
              latest_pointer_applied: Math.abs(x - 48) <= 1 && Math.abs(y - 15) <= 1,
            };
          } finally {
            observer.disconnect();
          }
        }"""
    )


def audit_desktop(page, image_class):
    toolbar = page.locator(".surface-switch")
    glass = page.get_by_role("radio", name="Glass")
    solid = page.get_by_role("radio", name="Solid")
    default_glass = glass.is_checked()
    base_geometry = layout_geometry(page)
    contrast = {"glass_idle": sample_contrast(page, image_class)}

    move_over_toolbar(page, toolbar)
    pointer_active = pointer_position(toolbar) != ["", ""]
    contrast["glass_pointer"] = sample_contrast(page, image_class)
    burst = burst_pointer_events(toolbar)

    # Keep the mouse over the toolbar while changing the radio with the keyboard.
    page.keyboard.press("Tab")
    keyboard_glass = glass.evaluate("input => input === document.activeElement")
    page.keyboard.press("ArrowRight")
    keyboard_solid = solid.is_checked() and solid.evaluate("input => input === document.activeElement")
    focus_ring = solid.evaluate(
        """input => {
          const style = getComputedStyle(input.nextElementSibling);
          return {width_px: parseFloat(style.outlineWidth), style: style.outlineStyle};
        }"""
    )
    reset_in_solid = pointer_position(toolbar) == ["", ""]
    solid_geometry = layout_geometry(page)
    contrast["solid"] = sample_contrast(page, image_class)
    page.keyboard.press("ArrowLeft")
    keyboard_returns_to_glass = glass.is_checked()

    backdrop = page.add_style_tag(content=f".toolbar::before {{ background: {BRIGHT_BACKDROP}; filter: none; }}")
    try:
        contrast["glass_bright_backdrop"] = sample_contrast(page, image_class, ".surface-switch")
    finally:
        backdrop.evaluate("element => element.remove()")

    opaque = page.add_style_tag(content="""
        .surface-switch:has(#glass:checked) {
          background: var(--chrome-solid);
          -webkit-backdrop-filter: none;
          backdrop-filter: none;
        }
    """)
    try:
        contrast["opaque_fallback_simulation"] = sample_contrast(page, image_class, ".surface-switch")
    finally:
        opaque.evaluate("element => element.remove()")

    return {
        "contrast": contrast,
        "checks": {
            "glass_is_default": default_glass,
            "mouse_tracks": pointer_active,
            "coalesced_pointer_burst": 0 < burst["style_mutations"] <= 2 and burst["latest_pointer_applied"],
            "keyboard_switches_both_directions": keyboard_glass and keyboard_solid and keyboard_returns_to_glass,
            "keyboard_focus_outline_present": focus_ring["width_px"] >= 2 and focus_ring["style"] != "none",
            "switch_clears_pointer_state": reset_in_solid,
            "surface_switch_preserves_geometry": base_geometry == solid_geometry,
        },
        "pointer_burst": burst,
        "focus_outline": focus_ring,
    }


def audit_mobile(page, image_class):
    target_sizes = page.locator(".surface-switch label").evaluate_all(
        "labels => labels.map(label => { const r = label.getBoundingClientRect(); return [r.width, r.height]; })"
    )
    viewport_width, document_width = page.evaluate(
        "() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]"
    )
    contrast = {"glass_idle": sample_contrast(page, image_class)}
    page.locator('label:has(#solid)').tap()
    switched_to_solid = page.get_by_role("radio", name="Solid").is_checked()
    page.locator('label:has(#glass)').tap()
    switched_to_glass = page.get_by_role("radio", name="Glass").is_checked()
    toolbar = page.locator(".surface-switch")
    toolbar.tap()
    return {
        "contrast": contrast,
        "checks": {
            "no_horizontal_overflow": document_width <= viewport_width,
            "touch_targets_meet_fixture_minimum": all(min(size) >= TARGET_MINIMUM_PX for size in target_sizes),
            "touch_switches_both_directions": switched_to_solid and switched_to_glass,
            "touch_leaves_border_static": pointer_position(toolbar) == ["", ""],
        },
        "target_sizes_css_px": target_sizes,
    }


def audit_reduced_motion(page, image_class):
    toolbar = page.locator(".surface-switch")
    move_over_toolbar(page, toolbar)
    return {
        "contrast": {"glass_static": sample_contrast(page, image_class)},
        "checks": {
            "fine_pointer_available": page.evaluate("() => matchMedia('(hover: hover) and (pointer: fine)').matches"),
            "reduced_motion_leaves_border_static": pointer_position(toolbar) == ["", ""],
        },
    }


def audit_reduced_transparency(page, image_class):
    toolbar = page.locator(".surface-switch")
    session = page.context.new_cdp_session(page)
    try:
        session.send("Emulation.setEmulatedMedia", {
            "features": [{"name": "prefers-reduced-transparency", "value": "reduce"}],
        })
        move_over_toolbar(page, toolbar)
        return {
            "contrast": {"opaque_surface": sample_contrast(page, image_class)},
            "checks": {
                "preference_is_active": page.evaluate(
                    "() => matchMedia('(prefers-reduced-transparency: reduce)').matches"
                ),
                "reduced_transparency_disables_glow_and_blur": toolbar.evaluate(
                    """toolbar => getComputedStyle(toolbar, "::before").display === "none"
                        && getComputedStyle(toolbar).backdropFilter === "none" """
                ),
                "reduced_transparency_leaves_border_static": pointer_position(toolbar) == ["", ""],
            },
        }
    finally:
        session.detach()


def audit_forced_colors(page, image_class):
    toolbar = page.locator(".surface-switch")
    move_over_toolbar(page, toolbar)
    return {
        "contrast": {"system_colors": sample_contrast(page, image_class)},
        "checks": {
            "forced_colors_disables_glow_and_blur": toolbar.evaluate(
                """toolbar => getComputedStyle(toolbar, "::before").display === "none"
                    && getComputedStyle(toolbar).backdropFilter === "none" """
            ),
            "metric_text_remains_visible": page.locator(".value:visible").count() == 3,
        },
    }


def run_profile(browser, settings, audit, image_class):
    context = browser.new_context(**settings)
    try:
        page = context.new_page()
        page.set_content(EXAMPLE.read_text(encoding="utf-8"), wait_until="load")
        page.evaluate("() => document.fonts.ready")
        return audit(page, image_class)
    finally:
        context.close()


def main():
    profiles = {
        "desktop_light": (DESKTOP, audit_desktop),
        "desktop_dark": ({**DESKTOP, "color_scheme": "dark"}, audit_desktop),
        "touch_320px": (MOBILE, audit_mobile),
        "reduced_motion": ({**DESKTOP, "reduced_motion": "reduce"}, audit_reduced_motion),
        "reduced_transparency": (DESKTOP, audit_reduced_transparency),
        "forced_colors": ({**DESKTOP, "forced_colors": "active"}, audit_forced_colors),
    }
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--executable", help="path to a system Chromium executable")
    parser.add_argument("--profile", choices=["all", *profiles], default="all")
    args = parser.parse_args()
    selected = profiles if args.profile == "all" else {args.profile: profiles[args.profile]}
    try:
        from PIL import Image
        from playwright.sync_api import sync_playwright
    except ModuleNotFoundError:
        parser.exit(2, "Install the playwright and pillow packages and Chromium first.\n")

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=args.executable)
        try:
            results = {
                name: run_profile(browser, settings, audit, Image)
                for name, (settings, audit) in selected.items()
            }
            report = {
                "chromium": browser.version,
                "fixture_sha256": hashlib.sha256(EXAMPLE.read_bytes()).hexdigest(),
                "fixture_text_minimum_ratio": TEXT_MINIMUM,
                "fixture_touch_minimum_css_px": TARGET_MINIMUM_PX,
                "bright_backdrop": BRIGHT_BACKDROP,
                "profiles": results,
            }
        finally:
            browser.close()

    passed = all(
        all(result["checks"].values()) and all(sample["passed"] for sample in result["contrast"].values())
        for result in results.values()
    )
    print(json.dumps({**report, "passed": passed}, indent=2, allow_nan=False))
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
