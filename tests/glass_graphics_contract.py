"""Real-control evidence for the custom graphics studio, not UI/UX approval."""

from copy import deepcopy
import json
from pathlib import Path
import xml.etree.ElementTree as ET

from glass_developer_contract import _choices, _named_controls, _page_fits, _select
from glass_optics_contract import SCREENSHOT_TIMEOUT_MS, _act, _call, _entry, browser_stage, settled_motion


def _content(model):
    return {key: value for key, value in model.items() if key != "revision"}


def _layer(model, identifier):
    return next(layer for layer in model["layers"] if layer["id"] == identifier)


async def verify_graphics_contract(page, expect, *, base_url, output_dir):
    output = Path(output_dir)
    # The separate optics scenario exercises WebGPU. Reduce animation here so
    # this larger interaction contract spends its budget on actual edit paths.
    await page.emulate_media(reduced_motion="reduce")
    browser_stage("graphics: discover the composition through the actual SDK")
    await page.goto(base_url, wait_until="networkidle")
    await _select(page, "listbox", "Component catalogue", value="visual")
    await _act(page, await _entry(page, "tabs", "Graphics views"), "setValue", ["canvas"])
    studio = page.locator('[data-graphic-studio="material-studies"]')
    feedback = studio.locator("[data-graphic-feedback]")
    await expect(studio).to_be_visible()
    await expect(studio).to_have_attribute("data-validation", "unvalidated")
    named = await _named_controls(page)
    await page.evaluate("""() => {
        Object.defineProperty(navigator, 'clipboard', {configurable: true,
            value: {writeText: async text => {window.__graphicsClipboard = text;}}});
    }""")

    async def press(label):
        return await _act(page, await _entry(page, "button", label), "press", [])

    async def set_value(kind, label, value):
        return await _act(page, await _entry(page, kind, label), "setValue", [value])

    async def copy_model():
        await press("Copy graphic JSON")
        model = json.loads(await page.evaluate("window.__graphicsClipboard"))
        assert model["schemaVersion"] == 1 and model["id"] == "material-studies", model
        assert model["revision"] == int(await studio.get_attribute("data-graphic-revision")), model
        return model

    async def panel(label, opened=True):
        await _act(page, await _entry(page, "collapsible", label), "setOpen", [opened])

    async def capture(name, *, full_page=False):
        await page.mouse.move(1, 1)
        await settled_motion(page)
        await page.screenshot(path=str(output / name), full_page=full_page,
                              animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
        return name

    initial = await copy_model()
    choices = await _choices(page, await _entry(page, "listbox", "Graphic layers"))
    assert {item["value"] for item in choices} == {layer["id"] for layer in initial["layers"]}, choices
    await expect(studio.locator('[data-selected-graphic-layer="headline"]')).to_be_visible()
    await page.evaluate("window.scrollTo(0, 0)")
    desktop_screenshot = await capture("graphics-desktop.png")

    browser_stage("graphics: agent properties, human text and shared history")
    steps = []
    changes = {"Layer X": 108, "Layer Y": 220, "Layer width": 436,
               "Layer height": 250, "Layer rotation": 12, "Layer opacity": 85}
    for label, value in changes.items():
        entry = await _entry(page, "number-input", label)
        steps.append({"ref": entry["ref"], "action": "setValue", "args": [value]})
    result = await _call(page, "act", {"steps": steps})
    assert result.get("ok"), result
    await set_value("textarea", "Layer text", "Glass <&>")
    await press("Apply layer changes")
    edited = await copy_model()
    headline = _layer(edited, "headline")
    assert [headline[key] for key in ("x", "y", "width", "height", "rotation", "opacity")] == [108, 220, 436, 250, 12, .85], headline
    assert headline["text"] == "Glass <&>", headline
    assert [layer["id"] for layer in edited["layers"]] == [layer["id"] for layer in initial["layers"]]
    await press("Undo graphic change")
    assert _content(await copy_model()) == _content(initial), "Undo did not restore the original composition"
    await press("Redo graphic change")
    assert _content(await copy_model()) == _content(edited), "Redo did not restore the edited composition"
    await set_value("number-input", "Layer width", None)
    await press("Apply layer changes")
    await expect(feedback).to_have_attribute("data-error", "")
    assert _content(await copy_model()) == _content(edited), "Empty geometry bypassed shared validation"
    await set_value("number-input", "Layer width", 436)
    await page.get_by_role("textbox", name="Layer text", exact=True).fill("Light <&>")
    await page.get_by_role("button", name="Apply layer changes", exact=True).click()
    edited = await copy_model()
    assert _layer(edited, "headline")["text"] == "Light <&>", "Human text edit did not reach the same model"

    browser_stage("graphics: real pointer and keyboard geometry")
    await press("Fit graphic canvas")
    layer_button = studio.locator('[data-graphic-layer="headline"]')
    await layer_button.scroll_into_view_if_needed()
    await layer_button.focus()
    await layer_button.press("ArrowRight")
    before_drag = await copy_model()
    assert _layer(before_drag, "headline")["x"] == _layer(edited, "headline")["x"] + 1
    await layer_button.scroll_into_view_if_needed()
    viewport = studio.locator(".qgs-viewport")
    zoom = float(await viewport.get_attribute("data-viewport-zoom")) / 100
    box = await layer_button.bounding_box()
    assert box and box["width"] > 24 and box["height"] > 24, box
    x, y = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + 24, y + 12, steps=4)
    await page.mouse.up()
    dragged = await copy_model()
    assert abs(_layer(dragged, "headline")["x"] - _layer(before_drag, "headline")["x"] - 24 / zoom) < .3, dragged
    assert abs(_layer(dragged, "headline")["y"] - _layer(before_drag, "headline")["y"] - 12 / zoom) < .3, dragged
    await press("Undo graphic change")
    assert _content(await copy_model()) == _content(before_drag), "A drag must be one undoable change"

    browser_stage("graphics: layer identity, ordering and image framing")
    await press("Duplicate layer")
    duplicated = await copy_model()
    original_ids = {layer["id"] for layer in initial["layers"]}
    duplicate_ids = {layer["id"] for layer in duplicated["layers"]} - original_ids
    assert len(duplicate_ids) == 1 and len(duplicated["layers"]) == len(initial["layers"]) + 1
    duplicate_id = duplicate_ids.pop()
    await press("Send layer backward")
    reordered = await copy_model()
    assert reordered["layers"][-2]["id"] == duplicate_id, reordered
    await press("Bring layer forward")
    await press("Delete layer")
    assert _content(await copy_model()) == _content(before_drag), "Duplicate/reorder/delete changed existing layers"
    await _select(page, "listbox", "Graphic layers", value="image")
    await _select(page, "select", "Image fit", value="contain")
    await press("Apply layer changes")
    framed = await copy_model()
    assert _layer(framed, "image")["fit"] == "contain"
    await expect(studio.locator('[data-graphic-art-layer="image"] image')).to_have_attribute("preserveAspectRatio", "xMidYMid meet")

    browser_stage("graphics: inspectable image-agent context without a fake job")
    await panel("Graphic agent context")
    brief = "Keep the glass objects; replace the setting with a pale green studio."
    await set_value("textarea", "Graphic edit brief", brief)
    submitted = []
    page.on("request", lambda request: submitted.append(request.url) if request.method not in ("GET", "HEAD") else None)
    await press("Copy image edit request")
    context = json.loads(await page.evaluate("window.__graphicsClipboard"))
    assert context["operation"] == "edit-image" and context["selectedLayerId"] == "image", context
    assert context["baseRevision"] == framed["revision"] and context["document"] == framed, context
    assert context["brief"] == brief and any(asset["id"] == _layer(framed, "image")["assetId"] for asset in context["assets"])
    assert not submitted, f"Copying a handoff unexpectedly submitted a generation request: {submitted}"
    await panel("Graphic agent context", False)

    browser_stage("graphics: structured edits reject invalid, stale and locked changes")
    await panel("Structured graphic edits")
    await press("Load current graphic JSON")
    draft = await _entry(page, "textarea", "Graphic JSON draft")
    assert json.loads(draft["value"]) == framed
    invalid = deepcopy(framed)
    invalid["layers"][0]["width"] = 0
    await set_value("textarea", "Graphic JSON draft", json.dumps(invalid))
    await press("Apply graphic JSON")
    await expect(feedback).to_have_attribute("data-error", "")
    assert await copy_model() == framed, "Invalid structured geometry changed the composition"
    stale = deepcopy(framed)
    stale["revision"] -= 1
    await set_value("textarea", "Graphic JSON draft", json.dumps(stale))
    await press("Apply graphic JSON")
    await expect(feedback).to_contain_text("Load the current graphic JSON")
    assert await copy_model() == framed, "A stale draft replaced a newer composition"
    await _act(page, await _entry(page, "switch", "Layer locked"), "setChecked", [True])
    locked = await copy_model()
    invalid = deepcopy(locked)
    _layer(invalid, "image")["x"] += 100
    await set_value("textarea", "Graphic JSON draft", json.dumps(invalid))
    await press("Apply graphic JSON")
    await expect(feedback).to_contain_text("Unlock Glass image")
    assert await copy_model() == locked, "Structured edits bypassed a layer lock"
    await _act(page, await _entry(page, "switch", "Layer locked"), "setChecked", [False])
    unlocked = await copy_model()
    changed = deepcopy(unlocked)
    _layer(changed, "caption")["text"] = "A composition worth keeping."
    await set_value("textarea", "Graphic JSON draft", json.dumps(changed))
    await press("Apply graphic JSON")
    structured = await copy_model()
    assert _layer(structured, "caption")["text"] == "A composition worth keeping."
    assert structured["revision"] == unlocked["revision"] + 1
    await panel("Structured graphic edits", False)

    browser_stage("graphics: validated raster import and self-contained SVG")
    await panel("Add graphic content")
    image_file = Path(__file__).resolve().parents[1] / "docs/hci/examples/liquid-glass/public/media/glass-study-small.webp"
    async with page.expect_file_chooser() as chooser_event:
        await page.get_by_role("button", name="Import image", exact=True).click()
    await (await chooser_event.value).set_files({"name": "uploaded-glass.webp", "mimeType": "image/webp", "buffer": image_file.read_bytes()})
    await expect(feedback).to_contain_text("Imported uploaded-glass.webp")
    imported = await copy_model()
    imported_asset = _layer(imported, "image")["assetId"]
    assert imported_asset.startswith("import-") and imported_asset != _layer(structured, "image")["assetId"]
    async with page.expect_file_chooser() as rejected_chooser:
        await page.get_by_role("button", name="Import image", exact=True).click()
    await (await rejected_chooser.value).set_files({"name": "blocked.svg", "mimeType": "image/svg+xml", "buffer": b"<svg xmlns='http://www.w3.org/2000/svg'/>"})
    await expect(feedback).to_contain_text("Choose a PNG, JPEG or WebP")
    assert await copy_model() == imported, "Unsupported upload changed the document"
    await panel("Add graphic content", False)
    async with page.expect_download() as download_event:
        await page.get_by_role("button", name="Download graphic SVG", exact=True).click()
    download = await download_event.value
    svg_name = "graphics-edited-composition.svg"
    await download.save_as(output / svg_name)
    svg = ET.fromstring((output / svg_name).read_text(encoding="utf-8"))
    assert svg.tag == "{http://www.w3.org/2000/svg}svg", svg.tag
    images = list(svg.iter("{http://www.w3.org/2000/svg}image"))
    assert images and all(image.attrib.get("href", "").startswith("data:image/webp;base64,") for image in images)
    assert list(svg.iter("{http://www.w3.org/2000/svg}text")), "Export flattened the editable typography"
    assert "Light <&>" in "".join(svg.itertext()), "SVG lost the literal escaped layer text"
    assert not any(element.tag.rsplit("}", 1)[-1] in {"script", "foreignObject"} for element in svg.iter())
    assert not any(key.startswith("on") for element in svg.iter() for key in element.attrib)
    await panel("Graphic agent context")
    await press("Copy graphic agent context")
    imported_context = json.loads(await page.evaluate("window.__graphicsClipboard"))
    imported_metadata = next(asset for asset in imported_context["assets"] if asset["id"] == imported_asset)
    assert imported_metadata["width"] == 600 and imported_metadata["height"] == 400
    assert imported_metadata.get("provenance") and "data:" not in imported_metadata["source"]
    await panel("Graphic agent context", False)

    browser_stage("graphics: saved direction, section return and mobile controls")
    await panel("Graphic variants")
    await set_value("input", "Graphic variant name", "Editorial direction")
    await press("Save graphic variant")
    await set_value("input", "Graphic background", "#ffffff")
    await press("Apply background")
    await _select(page, "listbox", "Component catalogue", value="button")
    await _select(page, "listbox", "Component catalogue", value="visual")
    await press("Restore graphic variant")
    restored = await copy_model()
    assert _content(restored) == _content(imported), "Saved direction did not survive section navigation"
    await _act(page, await _entry(page, "tabs", "Graphics views"), "setValue", ["images"])
    await _act(page, await _entry(page, "tabs", "Graphics views"), "setValue", ["canvas"])
    assert await copy_model() == restored, "Changing graphics views discarded the composition"
    await panel("Graphic variants", False)
    await page.set_viewport_size({"width": 390, "height": 844})
    mobile = await _page_fits(page)
    await press("Fit graphic canvas")
    await _select(page, "listbox", "Graphic layers", value="caption")
    await expect(studio.locator('[data-selected-graphic-layer="caption"]')).to_be_visible()
    await page.evaluate("window.scrollTo(0, 0)")
    mobile_screenshot = await capture("graphics-mobile.png", full_page=True)
    return {"reviewStatus": "Unvalidated", "namedControls": named,
            "stableLayerIds": True, "sharedPropertyValidation": True,
            "selectionAndGeometry": ["agent", "pointer", "keyboard"],
            "history": ["undo", "redo", "single-step drag"], "layerOrderAndDeletion": True,
            "structuredEdits": ["valid edit", "invalid geometry refused", "stale revision refused", "locked layer protected"],
            "agentContext": {"selectedLayer": "image", "brief": brief, "generationRequestSubmitted": False},
            "validatedImageImport": True, "unsupportedSvgUploadRefused": True,
            "standaloneSvg": svg_name, "editableEscapedText": True,
            "savedDirectionAndSectionReturn": True, "mobile": mobile,
            "screenshots": [desktop_screenshot, mobile_screenshot]}
