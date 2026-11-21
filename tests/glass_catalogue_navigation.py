"""Discover real components, navigate examples, and operate compiled preview code."""

import json
from pathlib import Path

from glass_developer_contract import _page_fits, _select
from glass_optics_contract import SCREENSHOT_TIMEOUT_MS, _act, _entry, browser_stage


async def verify_catalogue_navigation(page, expect, *, base_url, output_dir):
    root = Path(__file__).resolve().parents[1]
    package = root / "packages/liquid-glass"
    foundation = json.loads((package / "component-manifest.json").read_text())["components"]
    custom = json.loads((package / "custom-component-manifest.json").read_text())["components"]
    recipes = json.loads((package / "component-recipes.json").read_text())["recipes"]
    expected_ids = {entry["id"] for entry in foundation + custom}
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    original_viewport = page.viewport_size
    screenshots = []

    async def press(label, frame=None):
        target = frame or page
        await _act(target, await _entry(target, "button", label), "press", [])

    async def set_input(label, value, frame=None, kind="input"):
        target = frame or page
        await _act(target, await _entry(target, kind, label), "setValue", [value])

    async def capture(name):
        await page.screenshot(path=str(output / name), timeout=SCREENSHOT_TIMEOUT_MS, animations="allow")
        screenshots.append(name)

    try:
        await page.goto(base_url, wait_until="networkidle")
        await page.wait_for_function("() => typeof window.quantitativeHciAgent?.snapshot === 'function'")
        browser_stage("library: all canonical entries are browsable")
        await press("All components")
        stage = page.locator('[data-kit-view="catalogue"]')
        await expect(stage).to_be_visible()
        cards = stage.locator("[data-library-component]")
        await expect(cards).to_have_count(len(expected_ids))
        ids = await cards.evaluate_all("nodes => nodes.map(node => node.dataset.libraryComponent)")
        assert set(ids) == expected_ids and len(ids) == len(expected_ids), ids
        await capture("library-catalogue-desktop.png")

        browser_stage("library: search reaches individual custom contract and real showcase")
        await _select(page, "select", "Component category", value="Assistant")
        await set_input("Find a library component", "prompt composer")
        await expect(cards).to_have_count(1)
        await expect(cards.first).to_have_attribute("data-library-component", "liquid-prompt-composer")
        await press("Open LiquidPromptComposer")
        detail = page.locator('[data-library-detail="liquid-prompt-composer"]')
        await expect(detail).to_be_visible()
        await expect(detail).to_contain_text('@quantitative-hci/liquid-glass/assistant')
        await expect(detail.get_by_role("link", name="Open component contract", exact=True)).to_have_attribute("href", "/contracts/liquid-prompt-composer.json")
        await press("Open live example")
        await expect(page.locator('[data-kit-view="assistant"]')).to_be_visible()
        await page.go_back()
        await expect(detail).to_be_visible()
        await page.go_back()
        await expect(stage).to_be_visible()
        await expect(stage.get_by_label("Find a library component", exact=True)).to_have_value("prompt composer")
        await expect(cards).to_have_count(1)

        browser_stage("library: origin filters and empty-state recovery use accepted SDK state")
        await press("Clear filters")
        await _select(page, "select", "Component origin", value="custom")
        await expect(cards).to_have_count(len(custom))
        assert await cards.evaluate_all("nodes => nodes.every(node => node.dataset.libraryKind === 'custom')")
        await set_input("Find a library component", "there-is-no-such-component")
        await expect(cards).to_have_count(0)
        await press("Show every component")
        await expect(cards).to_have_count(len(expected_ids))

        browser_stage("library: media component links reveal the images view")
        for component_id, component_name in (("image-card", "LiquidImageCard"), ("media-gallery", "LiquidMediaGallery"), ("image-comparison", "LiquidImageComparison")):
            await set_input("Find a library component", component_name)
            await expect(cards).to_have_count(1)
            await press(f"Open {component_name}")
            media_detail = page.locator(f'[data-library-detail="{component_id}"]')
            await expect(media_detail).to_be_visible()
            await press("Open live example")
            images_tab = page.get_by_role("tab", name="Image components", exact=True)
            await expect(images_tab).to_have_attribute("aria-selected", "true")
            await expect(images_tab).to_be_focused()
            assert "graphicsview=images" in page.url, page.url
            await expect(page.locator(".kit-graphics-tabs").get_by_role("tabpanel", name="Image components", exact=True)).to_be_visible()
            await page.go_back()
            await expect(media_detail).to_be_visible()
            await page.go_forward()
            await expect(images_tab).to_have_attribute("aria-selected", "true")
            await press("All components")
        await press("Clear filters")

        browser_stage("library: sidebar filtering keeps the current page until a choice is made")
        await set_input("Search components", "password")
        await expect(stage).to_be_visible()
        await expect(page.locator("[data-catalogue-id]")).to_have_count(1)
        await _select(page, "listbox", "Component catalogue", value="password-input")
        await expect(page.locator('[data-component-id="password-input"]')).to_be_visible()
        await set_input("Search components", "")

        browser_stage("library: examples contain every registered recipe and executable source")
        await press("Examples")
        examples = page.locator('[data-kit-view="examples"]')
        await expect(examples).to_be_visible()
        recipe_ids = await examples.locator("[data-library-example]").evaluate_all("nodes => nodes.map(node => node.dataset.libraryExample)")
        assert set(recipe_ids) == {recipe["id"] for recipe in recipes}, recipe_ids
        await press("Try Assistant composer")
        example = page.locator('[data-example-id="assistant-composer"]')
        await expect(example).to_be_visible()
        await _select(page, "tabs", "Example view", value="source")
        await expect(example.get_by_label("Assistant composer complete source", exact=True)).to_contain_text("export default function AssistantComposerRecipe")
        await _select(page, "tabs", "Example view", value="preview")
        handle = await example.locator("iframe").element_handle()
        frame = await handle.content_frame()
        assert frame is not None
        await frame.wait_for_function("() => typeof window.quantitativeHciAgent?.snapshot === 'function' && !!document.querySelector('[data-example-document] [data-slot=textarea]')")
        assert await frame.locator(".kit-shell").count() == 0, "Preview rendered the gallery recursively"
        await set_input("Project prompt", "An accepted request from the compiled example.", frame, kind="textarea")
        await press("Keep local request", frame)
        await expect(frame.get_by_label("Project prompt", exact=True)).to_have_value("")
        await expect(frame.locator('[data-message-id="accepted-request"]')).to_contain_text("An accepted request from the compiled example.")
        await capture("library-example-desktop.png")

        browser_stage("library: narrow normal and forced-colour layouts fit")
        await page.set_viewport_size({"width": 390, "height": 844})
        preview_dimensions = {}
        for recipe in recipes:
            browser_stage("library: compiled preview's own document fits narrow width", example=recipe["id"])
            await press("Examples")
            await press(f'Try {recipe["title"]}')
            preview_handle = await page.locator(".library-example-frame").element_handle()
            preview_frame = await preview_handle.content_frame()
            assert preview_frame is not None
            await preview_frame.wait_for_function("id => document.querySelector('[data-example-document]')?.dataset.exampleDocument === id && document.documentElement.dataset.liquidGlassKit === 'true'", arg=recipe["id"])
            dimensions = await preview_frame.evaluate("async () => { await document.fonts.ready; return {width: innerWidth, scroll: document.documentElement.scrollWidth}; }")
            assert dimensions["scroll"] <= dimensions["width"] + 1, f'{recipe["id"]} preview document overflows: {dimensions}'
            assert dimensions["width"] < 390, "Expected the actual nested preview width"
            preview_dimensions[recipe["id"]] = dimensions
        await press("All components")
        await page.locator("#kit-main").scroll_into_view_if_needed()
        mobile = await _page_fits(page)
        await capture("library-catalogue-mobile.png")
        await page.emulate_media(forced_colors="active", reduced_motion="reduce")
        forced = await _page_fits(page)
        await _select(page, "select", "Component category", value="Assistant")
        await set_input("Find a library component", "PromptComposer")
        await expect(cards).to_have_count(1)
        await press("Open LiquidPromptComposer")
        await expect(detail).to_be_visible()
        detail_mobile = await _page_fits(page)
        await capture("library-detail-forced-colours.png")
        return {"canonicalEntries": len(expected_ids), "sdkFamilies": len(foundation), "customEntries": len(custom),
                "recipes": len(recipes), "customContractReached": True, "historyPreservedFilter": True,
                "searchDoesNotNavigate": True, "compiledPreviewAcceptedRequest": True,
                "mediaLinksRevealImages": True, "compiledPreviewWidths": preview_dimensions,
                "independentPreviewDocument": True, "mobile": mobile, "forcedColours": forced,
                "detailMobile": detail_mobile, "screenshots": screenshots}
    finally:
        await page.emulate_media(forced_colors="none", reduced_motion="no-preference")
        if original_viewport:
            await page.set_viewport_size(original_viewport)
