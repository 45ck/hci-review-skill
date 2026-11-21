"""Task evidence for custom diagram and image components, not UI/UX approval."""

import json
from pathlib import Path
import xml.etree.ElementTree as ET

from glass_optics_contract import (
    SCREENSHOT_TIMEOUT_MS,
    _act,
    _call,
    _difference,
    _entry,
    browser_stage,
    settled_motion,
)


async def _choices(page, control):
    result = await _call(page, "query", {"within": control["ref"]})
    assert isinstance(result, list), result
    matches = [item for item in result if item.get("ref") == control["ref"]]
    assert len(matches) == 1, f"The SDK did not return the requested choice control: {result}"
    return matches[0].get("items", [])


async def _select(page, kind, label, *, choice=None, value=None):
    control = await _entry(page, kind, label)
    choices = await _choices(page, control)
    matches = [item for item in choices if item.get("label") == choice] if choice is not None else [
        item for item in choices if item.get("value") == value
    ]
    assert len(matches) == 1, f"Choice is not discoverable in {label}: {choice or value}; {choices}"
    await _act(page, control, "setValue", [matches[0]["value"]])
    return matches[0]


async def _named_controls(page):
    entries = await page.evaluate("window.quantitativeHciAgent.snapshot()")
    visible = [entry for entry in entries if not entry.get("offPage") and entry.get("component") != "more"]
    missing = [entry for entry in visible if not str(entry.get("label", "")).strip()]
    assert not missing, f"The custom section has unnamed SDK controls: {missing}"
    return [{"component": entry["component"], "label": entry["label"]} for entry in visible]


async def _open_diagram_details(page):
    await _act(page, await _entry(page, "collapsible", "Diagram details"), "setOpen", [True])


async def _page_fits(page):
    dimensions = await page.evaluate("({width: innerWidth, scroll: document.documentElement.scrollWidth})")
    assert dimensions["scroll"] <= dimensions["width"] + 1, f"Page-level horizontal overflow: {dimensions}"
    return dimensions


async def _diagram_camera(viewer):
    return await viewer.locator(".qgv-viewport").evaluate("""root => {
        const world = root.querySelector('.qgv-world');
        const matrix = new DOMMatrixReadOnly(getComputedStyle(world).transform);
        return {x: Number(root.dataset.viewportX), y: Number(root.dataset.viewportY),
            zoom: Number(root.dataset.viewportZoom) / 100,
            painted: {x: matrix.e, y: matrix.f, zoom: matrix.a}};
    }""")


async def _diagram_fits(viewer):
    await viewer.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")
    bounds = await viewer.locator(".qgv-surface").evaluate("""surface => {
        const frame = surface.getBoundingClientRect(), world = surface.querySelector('.qgv-world').getBoundingClientRect();
        return {frame: {left: frame.left, top: frame.top, right: frame.right, bottom: frame.bottom},
            world: {left: world.left, top: world.top, right: world.right, bottom: world.bottom}};
    }""")
    frame, world = bounds["frame"], bounds["world"]
    assert world["left"] >= frame["left"] - 1 and world["top"] >= frame["top"] - 1, bounds
    assert world["right"] <= frame["right"] + 1 and world["bottom"] <= frame["bottom"] + 1, bounds
    return bounds


async def _verify_viewport_contract(page, expect, viewer):
    browser_stage("standards: shared camera, pointer capture, wheel and keyboard")
    viewport = viewer.locator(".qgv-viewport")
    surface = viewer.locator(".qgv-surface")
    control = await _entry(page, "liquid-viewport", "Diagram viewport")
    assert {"setViewport", "panBy", "zoomTo", "zoomBy", "fit", "actualSize", "focusSelection", "setPanMode", "setExpanded"}.issubset(control["actions"]), control
    await _act(page, control, "fit", [])
    await _diagram_fits(viewer)
    initial = await _diagram_camera(viewer)
    assert .1 <= initial["zoom"] <= 1, initial
    await _act(page, await _entry(page, "button", "Zoom in diagram"), "press", [])
    increased = await _diagram_camera(viewer)
    assert increased["zoom"] > initial["zoom"], (initial, increased)
    await _act(page, await _entry(page, "number-input", "Diagram zoom percent"), "setValue", [150])
    assert abs((await _diagram_camera(viewer))["zoom"] - 1.5) < .001
    await _act(page, control, "setViewport", [{"x": 120, "y": 120, "zoom": 1}])
    await surface.scroll_into_view_if_needed()
    box = await surface.bounding_box()
    assert box
    before_drag = await _diagram_camera(viewer)
    await page.mouse.move(box["x"] + 30, box["y"] + 30)
    await page.mouse.down()
    await page.mouse.move(box["x"] - 25, box["y"] + 70, steps=5)
    await page.mouse.up()
    dragged = await _diagram_camera(viewer)
    assert abs(dragged["x"] - before_drag["x"] + 55) < 1, (before_drag, dragged)
    assert abs(dragged["y"] - before_drag["y"] - 40) < 1, (before_drag, dragged)
    await page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
    await page.mouse.wheel(35, 55)
    await expect(viewport).not_to_have_attribute("data-viewport-y", str(dragged["y"]).removesuffix(".0"))
    wheeled = await _diagram_camera(viewer)
    assert abs(wheeled["x"] - dragged["x"] + 35) < 1 and abs(wheeled["y"] - dragged["y"] + 55) < 1, (dragged, wheeled)
    anchor = {"x": box["width"] / 2, "y": box["height"] / 2}
    before_anchor = {axis: (anchor[axis] - wheeled[axis]) / wheeled["zoom"] for axis in ("x", "y")}
    await page.keyboard.down("Control")
    try:
        await page.mouse.wheel(0, -120)
    finally:
        await page.keyboard.up("Control")
    await expect(viewport).not_to_have_attribute("data-viewport-zoom", str(wheeled["zoom"] * 100).removesuffix(".0"))
    zoomed = await _diagram_camera(viewer)
    assert zoomed["zoom"] > wheeled["zoom"], (wheeled, zoomed)
    for axis in ("x", "y"):
        after_anchor = (anchor[axis] - zoomed[axis]) / zoomed["zoom"]
        assert abs(after_anchor - before_anchor[axis]) < 1, (before_anchor, zoomed)
    await surface.focus()
    before_key = await _diagram_camera(viewer)
    await page.keyboard.press("ArrowRight")
    assert abs((await _diagram_camera(viewer))["x"] - before_key["x"] - 80) < .1
    await page.keyboard.press("ArrowLeft")
    assert abs((await _diagram_camera(viewer))["x"] - before_key["x"]) < .1
    await page.keyboard.press("Shift+ArrowDown")
    assert abs((await _diagram_camera(viewer))["y"] - before_key["y"] - 240) < .1
    await page.keyboard.press("ArrowUp")
    assert abs((await _diagram_camera(viewer))["y"] - before_key["y"] - 160) < .1
    await page.keyboard.press("+")
    assert (await _diagram_camera(viewer))["zoom"] > before_key["zoom"]
    await page.keyboard.press("0")
    assert abs((await _diagram_camera(viewer))["zoom"] - 1) < .001
    await page.keyboard.down("Space")
    await expect(surface).to_have_attribute("data-pan-mode", "true")
    await page.keyboard.up("Space")
    await expect(surface).to_have_attribute("data-pan-mode", "false")
    await page.keyboard.press("f")
    await _diagram_fits(viewer)
    for label, dx, dy in [("left", -80, 0), ("up", 0, -80), ("down", 0, 80), ("right", 80, 0)]:
        before = await _diagram_camera(viewer)
        await _act(page, await _entry(page, "button", f"Pan diagram {label}"), "press", [])
        after = await _diagram_camera(viewer)
        assert abs(after["x"] - before["x"] - dx) < .1 and abs(after["y"] - before["y"] - dy) < .1, (label, before, after)
    await _act(page, control, "zoomTo", [100])
    assert (await _diagram_camera(viewer))["zoom"] == 4
    await _act(page, control, "zoomTo", [.001])
    assert (await _diagram_camera(viewer))["zoom"] == .1
    await _act(page, control, "fit", [])
    selected_before_hand = await viewer.locator("[data-diagram-selection]").get_attribute("data-diagram-selection")
    await _act(page, await _entry(page, "toggle", "Pan diagram tool"), "setPressed", [True])
    await viewer.locator('[data-diagram-node="project"]').click()
    assert await viewer.locator("[data-diagram-selection]").get_attribute("data-diagram-selection") == selected_before_hand, "Hand tool activated an element"
    await _act(page, await _entry(page, "toggle", "Pan diagram tool"), "setPressed", [False])
    await _select(page, "select", "Diagram element", value="image-asset")
    await _act(page, control, "setViewport", [{"x": -2000, "y": -1800, "zoom": 1}])
    await viewer.locator('[data-diagram-node="image-asset"]').focus()
    selected_bounds = await viewer.locator('[data-diagram-node="image-asset"]').bounding_box()
    frame = await surface.bounding_box()
    assert frame and selected_bounds and selected_bounds["x"] >= frame["x"] and selected_bounds["x"] + selected_bounds["width"] <= frame["x"] + frame["width"], (frame, selected_bounds)
    await _act(page, await _entry(page, "button", "Diagram focus selection"), "press", [])
    assert (await _diagram_camera(viewer))["zoom"] > initial["zoom"]
    browser_stage("standards: full-window SDK Dialog and focus restoration")
    trigger = page.get_by_role("button", name="Fullscreen diagram", exact=True)
    await trigger.click()
    dialog = page.get_by_role("dialog", name="Diagram fullscreen", exact=True)
    await expect(dialog).to_be_visible()
    await expect(dialog.get_by_text("Unvalidated", exact=True)).to_be_visible()
    await expect(dialog.locator(".qgv-surface")).to_be_visible()
    await expect(viewer.locator(".qgv-surface")).to_have_count(1)
    expanded = await dialog.bounding_box()
    screen = page.viewport_size
    assert expanded and screen and expanded["width"] >= screen["width"] - 40 and expanded["height"] >= screen["height"] - 40, expanded
    await _act(page, control, "panBy", [90, -50])
    await page.keyboard.press("Escape")
    await expect(dialog).to_be_hidden()
    await expect(trigger).to_be_focused()
    await _act(page, control, "setExpanded", [True])
    await expect(dialog).to_be_visible()
    await page.get_by_role("button", name="Close fullscreen diagram", exact=True).click()
    await expect(dialog).to_be_hidden()
    await expect(trigger).to_be_focused()
    await _act(page, control, "fit", [])
    final = await _diagram_camera(viewer)
    for axis in ("x", "y", "zoom"):
        assert abs(final[axis] - final["painted"][axis]) < .01, final
    return {"initial": initial, "zoomed": increased, "pointerCaptureBeyondFrame": True,
            "wheelPanAndAnchoredZoom": True, "keyboard": ["arrows", "Shift+arrow", "+", "0", "Space", "F"],
            "agentActions": control["actions"], "boundedZoom": [10, 400], "handPreventsSelection": True,
            "focusedNodeRevealed": True, "fullscreen": {"bounds": expanded, "escapeAndCloseRestoreFocus": True}}


async def verify_developer_contract(page, expect, *, base_url, output_dir):
    output = Path(output_dir)
    browser_stage("developer: load custom section through the actual SDK")
    await page.goto(base_url, wait_until="networkidle")
    await _select(page, "listbox", "Component catalogue", value="standards")
    await expect(page.get_by_role("combobox", name="Diagram model", exact=True)).to_be_visible()
    await expect(page.get_by_text("Unvalidated", exact=True).first).to_be_visible()
    named = await _named_controls(page)
    model_control = await _entry(page, "select", "Diagram model")
    models = await _choices(page, model_control)
    legacy_ids = {"uml-class", "uml-component", "uwe-navigation", "uwe-presentation"}
    assert legacy_ids.issubset({item["value"] for item in models}), models
    models = [item for item in models if item["value"] in legacy_ids]

    # Isolate clipboard output while exercising the real copy action; never read
    # the user's or runner's existing clipboard.
    await page.evaluate("""() => {
        Object.defineProperty(navigator, 'clipboard', {configurable: true,
            value: {writeText: async value => {window.__developerClipboard = value;}}});
    }""")

    async def copy_model():
        await _act(page, await _entry(page, "button", "Copy diagram JSON"), "press", [])
        copied = await page.evaluate("window.__developerClipboard")
        assert isinstance(copied, str), "Copy diagram JSON did not produce text"
        model = json.loads(copied)
        assert isinstance(model.get("nodes"), list) and isinstance(model.get("edges"), list), model
        return model

    async def capture(name):
        await page.mouse.move(1, 1)
        await settled_motion(page)
        await page.screenshot(path=str(output / name), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
        return name

    diagrams = []
    initial_model = None
    for item in models:
        browser_stage("developer: notation and text equivalent", model=item["value"])
        await _select(page, "select", "Diagram model", value=item["value"])
        viewer = page.locator(f'[data-diagram-id="{item["value"]}"]')
        await expect(viewer).to_be_visible()
        await expect(viewer).to_have_attribute("data-validation", "unvalidated")
        artwork = viewer.locator("svg[data-diagram-artwork]")
        await expect(artwork).to_be_visible()
        await expect(artwork.locator("image, foreignObject, script")).to_have_count(0)
        model = await copy_model()
        assert model["id"] == item["value"], model
        assert model["nodes"] and all(node.get("name") and node.get("id") for node in model["nodes"]), model
        assert len({node["id"] for node in model["nodes"]}) == len(model["nodes"]), model
        element_choices = await _choices(page, await _entry(page, "select", "Diagram element"))
        assert {choice["value"] for choice in element_choices} == {node["id"] for node in model["nodes"]}, element_choices
        description = viewer.locator("[data-diagram-description]")
        await _open_diagram_details(page)
        await expect(description).to_be_visible()
        readable = await description.inner_text()
        for node in model["nodes"]:
            assert node["name"] in readable, f"Text equivalent omits element {node['name']}: {readable}"
        names = {node["id"]: node["name"] for node in model["nodes"]}
        for edge in model["edges"]:
            relation = description.locator(f'[data-diagram-relation="{edge["id"]}"]')
            relation_text = await relation.inner_text()
            assert names[edge["source"]] in relation_text and names[edge["target"]] in relation_text, relation_text
            await expect(artwork.locator(f'[data-diagram-edge="{edge["id"]}"]')).to_have_count(1)
        if model["id"] == "uml-class":
            initial_model = model
            await expect(artwork.locator('[data-arrowhead="triangle"]')).to_have_count(1)
            await expect(artwork.locator('[data-arrowhead="filled-diamond"]')).to_have_count(1)
        if model["id"] == "uml-component":
            dashes = await artwork.locator('[data-edge-kind="realization"]').evaluate_all(
                "nodes => nodes.map(node => getComputedStyle(node).strokeDasharray)")
            assert dashes and all(value not in ("none", "0px") for value in dashes), "Realization lost its dashed stroke"
            assert "«component»" in await artwork.text_content(), "Components lost the UML keyword"
        if model["id"] == "uwe-navigation":
            assert "«navigationClass»" in await artwork.text_content(), "Navigation stereotypes are missing"
        if model["id"] == "uwe-presentation":
            assert any(node.get("parentId") for node in model["nodes"]), "Presentation model lost containment"
            assert "«presentationPage»" in await artwork.text_content(), "Presentation-page stereotype is missing"
        await artwork.scroll_into_view_if_needed()
        diagrams.append({"id": model["id"], "nodes": len(model["nodes"]), "relationships": len(model["edges"]),
                         "textEquivalent": True, "screenshot": await capture(f'developer-{model["id"]}.png')})

    assert initial_model is not None
    await _select(page, "select", "Diagram model", value="uml-class")
    viewer = page.locator('[data-diagram-id="uml-class"]')
    await _open_diagram_details(page)
    browser_stage("developer: pointer, keyboard and agent share selection")
    await viewer.locator('[data-diagram-node="asset"]').click()
    await expect(viewer.locator('[data-diagram-selection="asset"]')).to_be_visible()
    choice = page.get_by_role("combobox", name="Diagram element", exact=True)
    await choice.focus()
    await choice.press("ArrowDown")
    await page.keyboard.press("End")
    await page.keyboard.press("Enter")
    await expect(choice).to_be_focused()
    last = (await _choices(page, await _entry(page, "select", "Diagram element")))[-1]
    await expect(viewer.locator(f'[data-diagram-selection="{last["value"]}"]')).to_be_visible()
    await _select(page, "select", "Diagram element", value="asset")
    await expect(viewer.locator('[data-diagram-selection="asset"]')).to_be_visible()

    browser_stage("developer: shared edit validation and model integrity")
    renamed = "Reviewed <Asset> & image"
    field = page.get_by_role("textbox", name="Element label", exact=True)
    await _act(page, await _entry(page, "input", "Element label"), "setValue", [renamed])
    await _act(page, await _entry(page, "button", "Apply element label"), "press", [])
    await expect(viewer.locator('[data-diagram-selection="asset"]')).to_contain_text(renamed)
    await expect(viewer.locator('[data-diagram-node="asset"]')).to_have_attribute("aria-label", f"Inspect {renamed}")
    await expect(page.locator("[data-developer-feedback]")).to_contain_text(renamed)
    edited = await copy_model()
    assert [node["id"] for node in edited["nodes"]] == [node["id"] for node in initial_model["nodes"]], edited
    assert edited["edges"] == initial_model["edges"], "A label edit changed relationship identity or geometry"
    assert next(node["name"] for node in edited["nodes"] if node["id"] == "asset") == renamed, edited
    assert any(option["label"] == renamed for option in await _choices(page, await _entry(page, "select", "Diagram element")))
    await field.fill("")
    await page.get_by_role("button", name="Apply element label", exact=True).click()
    await expect(page.locator("[data-developer-error]")).to_be_visible()
    assert await copy_model() == edited, "Rejected empty label mutated the model"
    for rejected in ["", "x" * 81]:
        await _act(page, await _entry(page, "input", "Element label"), "setValue", [rejected])
        await _act(page, await _entry(page, "button", "Apply element label"), "press", [])
        await expect(page.locator("[data-developer-error]")).to_be_visible()
        assert await copy_model() == edited, "An invalid agent edit bypassed the shared validation"
    await field.fill(renamed)
    await page.get_by_role("button", name="Apply element label", exact=True).click()
    await _select(page, "select", "Diagram model", value="uwe-navigation")
    await _select(page, "select", "Diagram model", value="uml-class")
    assert await copy_model() == edited, "Switching models discarded the session edit"
    await _select(page, "listbox", "Component catalogue", value="visual")
    await _select(page, "listbox", "Component catalogue", value="standards")
    await _open_diagram_details(page)
    assert await copy_model() == edited, "Leaving the developer section discarded the session model"
    await _act(page, await _entry(page, "collapsible", "Model data"), "setOpen", [True])
    code = await _entry(page, "textarea", "Diagram JSON")
    assert json.loads(code["value"]) == edited, "The agent-readable model differs from its export"
    readonly_attempt = await _call(page, "act", {"steps": [{"ref": code["ref"], "action": "setValue", "args": ["{}"]}]})
    await expect(page.get_by_role("textbox", name="Diagram JSON", exact=True)).to_have_value(json.dumps(edited, indent=2, ensure_ascii=False))
    assert json.loads((await _entry(page, "textarea", "Diagram JSON"))["value"]) == edited, "The read-only representation exposed a mutation route"
    await _act(page, await _entry(page, "collapsible", "Model data"), "setOpen", [False])

    navigation = await _verify_viewport_contract(page, expect, viewer)
    browser_stage("developer: standalone SVG export")
    async with page.expect_download() as download_event:
        await page.get_by_role("button", name="Download diagram SVG", exact=True).click()
    download = await download_event.value
    filename = "developer-edited-diagram.svg"
    await download.save_as(output / filename)
    document = ET.fromstring((output / filename).read_text(encoding="utf-8"))
    assert document.tag == "{http://www.w3.org/2000/svg}svg", document.tag
    text = "".join(document.itertext())
    assert renamed in text, "The vector export lost or interpreted the literal edited label"
    forbidden = {"script", "foreignObject", "image"}
    assert not any(element.tag.rsplit("}", 1)[-1] in forbidden for element in document.iter()), "Export contains non-vector executable or raster content"
    assert not any(key.startswith("on") for element in document.iter() for key in element.attrib), "Export contains event handlers"

    browser_stage("developer: narrow layout and forced-colour operation")
    await page.set_viewport_size({"width": 390, "height": 844})
    await page.evaluate("window.scrollTo(0, 0)")
    mobile = await _page_fits(page)
    await choice.scroll_into_view_if_needed()
    await expect(choice).to_be_in_viewport()
    await _select(page, "select", "Diagram element", value="image-asset")
    await expect(viewer.locator('[data-diagram-selection="image-asset"]')).to_be_visible()
    await _act(page, await _entry(page, "liquid-viewport", "Diagram viewport"), "fit", [])
    mobile_canvas = await _diagram_fits(viewer)
    surface = viewer.locator(".qgv-surface")
    await surface.scroll_into_view_if_needed()
    box = await surface.bounding_box()
    assert box
    touch = await page.context.new_cdp_session(page)
    before_pinch = await _diagram_camera(viewer)
    try:
        await touch.send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 2})
        center_x, center_y = box["x"] + box["width"] / 2, box["y"] + box["height"] - 20
        points = lambda gap: [{"x": center_x - gap, "y": center_y, "id": 1}, {"x": center_x + gap, "y": center_y, "id": 2}]
        await touch.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": points(30)})
        await touch.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": points(55)})
        await touch.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        after_pinch = await _diagram_camera(viewer)
        assert after_pinch["zoom"] > before_pinch["zoom"] * 1.3, (before_pinch, after_pinch)
    finally:
        await touch.send("Emulation.setTouchEmulationEnabled", {"enabled": False})
        await touch.detach()
    await _act(page, await _entry(page, "button", "Diagram focus selection"), "press", [])
    mobile_screenshot = await capture("developer-mobile.png")
    await page.emulate_media(forced_colors="active", reduced_motion="reduce")
    await expect(page.locator("html")).to_have_attribute("data-liquid-status", "reduced")
    await choice.focus()
    await choice.press("ArrowDown")
    await page.keyboard.press("Home")
    await page.keyboard.press("Enter")
    await expect(choice).to_be_focused()
    focus = await choice.evaluate("node => ({focusVisible: node.matches(':focus-visible'), outline: getComputedStyle(node).outlineStyle})")
    assert focus["focusVisible"] and focus["outline"] != "none", focus
    await expect(viewer.locator("[data-diagram-description]")).to_be_visible()
    forced_screenshot = await capture("developer-forced-colours.png")
    await page.emulate_media(forced_colors="none", reduced_motion="no-preference")
    return {"reviewStatus": "Unvalidated", "models": diagrams, "namedControls": named,
            "sharedSelection": ["pointer", "keyboard", "agent"], "labelEdit": renamed,
            "stableIdsAndEdges": True, "rejectedEmptyAndOverlongLabels": True, "sessionDraftPreserved": True,
            "sectionReturnPreserved": True, "agentReadableJson": True,
            "readOnlyMutationRefused": not readonly_attempt.get("ok", False),
            "viewport": navigation, "touchPinch": {"before": before_pinch, "after": after_pinch},
            "vectorExport": filename, "mobile": mobile, "mobileCanvas": mobile_canvas, "forcedColourFocus": focus,
            "screenshots": [mobile_screenshot, forced_screenshot]}


async def verify_visual_contract(page, expect, *, base_url, output_dir):
    output = Path(output_dir)
    browser_stage("visual: open image compositions through the actual SDK")
    await page.goto(base_url, wait_until="networkidle")
    await _select(page, "listbox", "Component catalogue", value="visual")
    await _select(page, "tabs", "Graphics views", value="images")
    gallery = page.locator('[data-custom-component="media-gallery"]')
    comparison = page.locator('[data-custom-component="image-comparison"]')
    card = page.locator('[data-custom-component="image-card"]')

    async def gallery_layout(viewport_name):
        evidence = await gallery.evaluate("""root => {
            const rect = node => {
                const box = node.getBoundingClientRect();
                return {left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width};
            };
            const inner = node => {
                const box = node.getBoundingClientRect();
                const style = getComputedStyle(node);
                const left = box.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
                const right = box.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight);
                return {left, right, width: right - left};
            };
            const carousel = root.querySelector('[data-slot="carousel"]');
            return {galleryInner: inner(root), carousel: rect(carousel), carouselInner: inner(carousel),
                viewport: rect(carousel.querySelector('[data-slot="carousel-viewport"]')),
                caption: rect(root.querySelector('.qg-media-gallery-caption')),
                buttons: [...root.querySelectorAll('.qg-media-paging button')].map(button => {
                    const range = document.createRange();
                    range.selectNodeContents(button);
                    const text = range.getBoundingClientRect();
                    return {label: button.textContent.trim(), box: rect(button),
                        text: {left: text.left, right: text.right, top: text.top, bottom: text.bottom},
                        clientWidth: button.clientWidth, scrollWidth: button.scrollWidth};
                })};
        }""")
        assert abs(evidence["carousel"]["width"] - evidence["galleryInner"]["width"]) <= 1, f"Gallery carousel leaves available width unused ({viewport_name}): {evidence}"
        assert abs(evidence["viewport"]["width"] - evidence["carouselInner"]["width"]) <= 1, f"Gallery image is squeezed into a column ({viewport_name}): {evidence}"
        assert abs(evidence["viewport"]["left"] - evidence["carouselInner"]["left"]) <= 1, evidence
        assert evidence["caption"]["top"] >= evidence["viewport"]["bottom"] - 1, f"Gallery caption is beside or overlapping the image ({viewport_name}): {evidence}"
        assert len(evidence["buttons"]) == 2, evidence
        for button in evidence["buttons"]:
            box, text = button["box"], button["text"]
            assert box["left"] <= text["left"] + 1 and text["right"] <= box["right"] + 1, f"Paging label does not fit ({viewport_name}): {button}"
            assert box["top"] <= text["top"] + 1 and text["bottom"] <= box["bottom"] + 1, f"Paging label clips vertically ({viewport_name}): {button}"
            assert button["scrollWidth"] <= button["clientWidth"] + 1, button
        assert evidence["buttons"][0]["box"]["right"] <= evidence["buttons"][1]["box"]["left"] + 1, f"Paging buttons overlap ({viewport_name}): {evidence}"
        return evidence

    for component in [gallery, comparison, card]:
        await expect(component).to_be_visible()
        await expect(component).to_have_attribute("data-validation", "unvalidated")
        await expect(component.get_by_text("Unvalidated", exact=True).first).to_be_visible()
    named = await _named_controls(page)

    browser_stage("visual: carousel agent selection and real image loading")
    await gallery.scroll_into_view_if_needed()
    carousel = await _entry(page, "carousel", "Artwork collection")
    await _act(page, carousel, "setPage", [2])
    await expect(gallery).to_have_attribute("data-selected-image", "glass-study")
    trigger = page.get_by_role("button", name="Inspect selected image", exact=True)
    await trigger.click()
    dialog = page.get_by_role("dialog", name="Artwork details", exact=True)
    await expect(dialog).to_be_visible()
    await expect(dialog).to_contain_text("Glass study")
    await page.keyboard.press("Escape")
    await expect(dialog).to_be_hidden()
    await expect(trigger).to_be_focused()
    await _act(page, await _entry(page, "carousel", "Artwork collection"), "setPage", [3])
    await expect(gallery).to_have_attribute("data-selected-image", "quiet-pavilion")
    await _act(page, await _entry(page, "toggle", "Save selected artwork"), "setPressed", [True])
    await expect(page.get_by_role("button", name="Save selected artwork", exact=True)).to_have_attribute("aria-pressed", "true")
    await page.get_by_role("button", name="Previous artwork", exact=True).click()
    await expect(gallery).to_have_attribute("data-selected-image", "glass-study")
    await expect(page.get_by_role("button", name="Save selected artwork", exact=True)).to_have_attribute("aria-pressed", "false")
    await _act(page, await _entry(page, "carousel", "Artwork collection"), "setPage", [1])
    await expect(gallery).to_have_attribute("data-selected-image", "emerald-coast")
    thumbnail = gallery.get_by_role("tab", name="Emerald coast", exact=True)
    await thumbnail.focus()
    await thumbnail.press("ArrowRight")
    await expect(gallery).to_have_attribute("data-selected-image", "glass-study")

    browser_stage("visual: comparison uses pointer and SDK value changes")
    await comparison.scroll_into_view_if_needed()
    await page.wait_for_function("""() => [...document.querySelectorAll('[data-custom-component="image-comparison"] img')]
        .every(image => image.complete && image.naturalWidth > 0)""", timeout=8000)
    await page.get_by_role("button", name="Show architecture", exact=True).click()
    await expect(comparison).to_have_attribute("data-reveal", "0")
    reveal = comparison.locator("figure")
    architecture_pixels = await reveal.screenshot(path=str(output / "visual-reveal-architecture.png"), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
    slider = await _entry(page, "slider", "Landscape reveal")
    await _act(page, slider, "setValue", [75])
    await expect(comparison).to_have_attribute("data-reveal", "75")
    revealed_pixels = await reveal.screenshot(path=str(output / "visual-reveal-landscape.png"), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
    reveal_difference = _difference(architecture_pixels, revealed_pixels)
    assert reveal_difference["changedFraction"] > 0.15, f"The reveal value did not visibly change the imagery: {reveal_difference}"
    await page.get_by_role("button", name="Split evenly", exact=True).press("Enter")
    await expect(comparison).to_have_attribute("data-reveal", "50")
    images = []
    for component in [card, gallery, comparison]:
        await component.scroll_into_view_if_needed()
        await page.wait_for_function("""selector => [...document.querySelectorAll(selector + ' img')]
            .filter(image => image.checkVisibility())
            .every(image => image.complete && image.naturalWidth > 0)""",
            arg=f'[data-custom-component="{await component.get_attribute("data-custom-component")}"]', timeout=8000)
        images.extend(await component.locator("img").evaluate_all("""nodes => nodes.filter(image => image.checkVisibility()).map(image => ({
            alt: image.alt, width: image.naturalWidth, height: image.naturalHeight,
            sameOrigin: new URL(image.currentSrc).origin === location.origin,
            path: new URL(image.currentSrc).pathname,
            namedThumbnail: !image.alt && Boolean(image.closest('[data-slot="carousel-indicator"]')?.getAttribute('aria-label')),
        }))"""))
    assert len({image["path"] for image in images}) >= 3, images
    assert all(image["sameOrigin"] and image["width"] > 0 and image["height"] > 0 and (image["alt"].strip() or image["namedThumbnail"]) for image in images), images
    desktop_gallery_layout = await gallery_layout("desktop")
    await gallery.scroll_into_view_if_needed()
    await settled_motion(page)
    await gallery.screenshot(path=str(output / "visual-gallery-desktop.png"), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
    await page.evaluate("window.scrollTo(0, 0)")
    await settled_motion(page)
    await page.screenshot(path=str(output / "visual-components-desktop.png"), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)

    browser_stage("visual: narrow layout, named detail and recovery")
    await page.set_viewport_size({"width": 390, "height": 844})
    mobile = await _page_fits(page)
    mobile_gallery_layout = await gallery_layout("mobile")
    await gallery.scroll_into_view_if_needed()
    await settled_motion(page)
    await gallery.screenshot(path=str(output / "visual-gallery-mobile.png"), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
    story_trigger = page.get_by_role("button", name="Explore Emerald coast", exact=True)
    await story_trigger.scroll_into_view_if_needed()
    await story_trigger.press("Enter")
    story = page.get_by_role("dialog", name="Emerald coast story", exact=True)
    await expect(story).to_be_visible()
    await _page_fits(page)
    await page.screenshot(path=str(output / "visual-components-mobile-dialog.png"), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
    await page.keyboard.press("Escape")
    await expect(story).to_be_hidden()
    await expect(story_trigger).to_be_focused()
    await page.emulate_media(forced_colors="active", reduced_motion="reduce")
    await expect(page.locator("html")).to_have_attribute("data-liquid-status", "reduced")
    await page.get_by_role("button", name="Show landscape", exact=True).click()
    await expect(comparison).to_have_attribute("data-reveal", "100")
    await page.screenshot(path=str(output / "visual-components-forced-colours.png"), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
    return {"reviewStatus": "Unvalidated", "namedControls": named, "images": images,
            "carouselSources": ["agent", "pointer", "keyboard"], "saveTracksArtwork": True,
            "detailMatchesSelection": True, "dialogEscapeFocus": True,
            "comparisonValues": [0, 75, 50, 100], "comparisonPixels": reveal_difference, "mobile": mobile,
            "galleryLayout": {"desktop": desktop_gallery_layout, "mobile": mobile_gallery_layout},
            "screenshots": ["visual-components-desktop.png", "visual-gallery-desktop.png", "visual-gallery-mobile.png", "visual-components-mobile-dialog.png", "visual-components-forced-colours.png"]}
