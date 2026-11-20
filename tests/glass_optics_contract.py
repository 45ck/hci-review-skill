"""Pixel evidence for GPU material on actual Liquid Glass kit controls.

No browser is launched here. An unavailable renderer is reported separately;
CI requires a ready GPU and verifies its contribution on three DOM rectangles.
"""

import asyncio
from pathlib import Path
import re
import struct
import zlib

# SwiftShader capture can outlast the interaction timeout after fonts are ready.
# Keep capture bounded and fatal; do not skip Playwright's font-readiness check.
SCREENSHOT_TIMEOUT_MS = 15000


def _png_rgb(data):
    """Decode Chromium's non-interlaced 8-bit RGB/RGBA screenshot without PIL."""
    assert data[:8] == b"\x89PNG\r\n\x1a\n", "Expected a PNG screenshot"
    offset = 8
    compressed = bytearray()
    width = height = channels = 0
    while offset < len(data):
        length = struct.unpack_from(">I", data, offset)[0]
        kind = data[offset + 4:offset + 8]
        chunk = data[offset + 8:offset + 8 + length]
        offset += length + 12
        if kind == b"IHDR":
            width, height, depth, colour, compression, filtering, interlace = struct.unpack(">IIBBBBB", chunk)
            assert depth == 8 and colour in (2, 6) and not interlace, "Unsupported screenshot PNG encoding"
            assert compression == 0 and filtering == 0
            channels = 3 if colour == 2 else 4
        elif kind == b"IDAT":
            compressed.extend(chunk)
        elif kind == b"IEND":
            break
    raw = zlib.decompress(compressed)
    stride = width * channels
    assert len(raw) == (stride + 1) * height, "Unexpected screenshot data size"
    rgb = bytearray()
    previous = bytearray(stride)
    cursor = 0
    for _ in range(height):
        filter_type = raw[cursor]
        cursor += 1
        row = bytearray(raw[cursor:cursor + stride])
        cursor += stride
        for x in range(stride):
            left = row[x - channels] if x >= channels else 0
            above = previous[x]
            upper_left = previous[x - channels] if x >= channels else 0
            if filter_type == 1:
                predictor = left
            elif filter_type == 2:
                predictor = above
            elif filter_type == 3:
                predictor = (left + above) // 2
            elif filter_type == 4:
                estimate = left + above - upper_left
                distances = [abs(estimate - left), abs(estimate - above), abs(estimate - upper_left)]
                predictor = (left, above, upper_left)[distances.index(min(distances))]
            else:
                assert filter_type == 0, f"Unknown PNG filter {filter_type}"
                predictor = 0
            row[x] = (row[x] + predictor) & 255
        for x in range(0, stride, channels):
            rgb.extend(row[x:x + 3])
        previous = row
    return width, height, rgb



def _difference(before, after, *, border_only=False):
    width, height, left = _png_rgb(before)
    other_width, other_height, right = _png_rgb(after)
    assert (width, height) == (other_width, other_height), "Comparison changed screenshot geometry"
    changed = total = channel_sum = 0
    edge = min(14, width // 4, height // 4)
    for pixel in range(width * height):
        x, y = pixel % width, pixel // width
        if border_only and edge <= x < width - edge and edge <= y < height - edge:
            continue
        offset = pixel * 3
        differences = [abs(left[offset + channel] - right[offset + channel]) for channel in range(3)]
        changed += max(differences) > 4
        channel_sum += sum(differences)
        total += 1
    assert total, "No pixels were sampled"
    return {
        "width": width, "height": height, "sampledPixels": total,
        "region": "14px border band" if border_only else "full control",
        "changedFraction": round(changed / total, 5),
        "meanChannelDifference": round(channel_sum / (total * 3), 4),
    }


async def _call(page, method, arguments=None):
    return await asyncio.wait_for(page.evaluate("""async ({method, input}) => {
        const agent = window.quantitativeHciAgent;
        if (method === 'query') return agent.query(input);
        if (method === 'act') return agent.act(input);
        throw new Error('Unsupported optical-test operation');
    }""", {"method": method, "input": arguments}), timeout=5)


async def _entry(page, kind, labels):
    result = await _call(page, "query", {"kind": kind})
    assert isinstance(result, list), result
    names = [labels] if isinstance(labels, str) else labels
    matching = [item for item in result if not item.get("offPage") and item.get("label") in names]
    assert len(matching) == 1, f"Expected one {kind} named {names}: {matching}"
    return matching[0]


async def _act(page, entry, action, args):
    assert action in entry["actions"], f"{entry} does not expose {action}"
    result = await _call(page, "act", {"steps": [{"ref": entry["ref"], "action": action, "args": args}]})
    assert result.get("ok"), f"Optical control action failed: {result}"
    return result


async def _painted(page):
    await page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")


async def _revision(page, name):
    return int(await page.locator("html").get_attribute(name) or 0)


async def _after_revision(page, name, before):
    await page.wait_for_function("""({name, before}) =>
        document.documentElement.dataset.liquidStatus === 'ready' &&
        Number(document.documentElement.getAttribute(name) || 0) > before
    """, arg={"name": name, "before": before}, timeout=8000)
    await _painted(page)


async def _settings(page):
    settings = await _entry(page, "popover", ["Material settings", "Glass material"])
    if not settings.get("open"):
        await _act(page, settings, "setOpen", [True])
    return await _entry(page, "popover", "Glass material")


async def _configure(page, *, strength=None, backdrop=None):
    await _settings(page)
    capture_before = await _revision(page, "data-liquid-capture-revision")
    backdrop_changed = False
    if strength is not None:
        control = await _entry(page, "slider", "Refraction strength")
        await _act(page, control, "setValue", [strength])
        assert (await _entry(page, "slider", "Refraction strength"))["value"] == strength
    if backdrop is not None:
        control = await _entry(page, "select", "Backdrop")
        result = await _call(page, "query", {"within": control["ref"]})
        assert isinstance(result, list), result
        options = [item for found in result if found["ref"] == control["ref"] for item in found.get("items", [])]
        chosen = [item for item in options if item["label"] == backdrop]
        assert len(chosen) == 1, f"Backdrop choice missing: {options}"
        backdrop_changed = control.get("value") != chosen[0]["value"]
        await _act(page, control, "setValue", [chosen[0]["value"]])
        assert (await _entry(page, "select", "Backdrop"))["value"] == chosen[0]["value"]
    render_before = await _revision(page, "data-liquid-render-revision")
    await _act(page, await _entry(page, "popover", "Glass material"), "setOpen", [False])
    await page.locator(".kit-material-popover").wait_for(state="hidden", timeout=5000)
    await _after_revision(page, "data-liquid-render-revision", render_before)
    if backdrop_changed:
        await _after_revision(page, "data-liquid-capture-revision", capture_before)
    return {"captureBefore": capture_before, "captureAfter": await _revision(page, "data-liquid-capture-revision")}


async def verify_optics_contract(page, expect, *, output_dir="test-results", require_gpu=False):
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    root = page.locator("html")
    await expect(page.locator("[data-kit-view='overview']")).to_be_visible(timeout=5000)
    await expect(root).to_have_attribute("data-liquid-status", re.compile(r"^(ready|unavailable|error|reduced)$"), timeout=25000)
    status = await root.get_attribute("data-liquid-status")
    failure = await root.get_attribute("data-liquid-error")
    assert status != "error", f"GPU initialization/capture failed: {failure}"
    result = {"status": status, "gpuRendered": False, "required": require_gpu}
    if status != "ready":
        result["limitation"] = "The controls use the compatibility material; GPU pixels were not verified."
        assert not require_gpu, f"GPU evidence is required; renderer reported {status}: {failure}"
        return result

    await page.evaluate("window.scrollTo(0, 0)")
    await page.mouse.move(1, 1)
    await _configure(page, strength=30, backdrop="Coast")
    canvas = page.locator("canvas[data-liquid-canvas='viewport']")
    await expect(canvas).to_have_count(1)
    await expect(canvas).to_be_visible()
    assert await canvas.get_attribute("aria-hidden") == "true"
    assert await canvas.evaluate("node => getComputedStyle(node).pointerEvents") == "none"
    surface_count = int(await root.get_attribute("data-liquid-surface-count") or 0)
    assert surface_count >= 3, f"Only {surface_count} actual surfaces were registered"
    probes = {}
    for kind in ["button", "input", "panel"]:
        locator = page.locator(f"[data-optics-probe='{kind}']")
        await expect(locator).to_have_count(1)
        await expect(locator).to_be_visible()
        await expect(locator).to_have_attribute("data-liquid-surface", "viewport", timeout=5000)
        box = await locator.bounding_box()
        assert box and box["width"] >= 30 and box["height"] >= 20, f"Invalid {kind} bounds: {box}"
        viewport = page.viewport_size
        assert box["x"] >= 0 and box["y"] >= 0 and box["x"] + box["width"] <= viewport["width"] + 1 and box["y"] + box["height"] <= viewport["height"] + 1, f"{kind} probe is outside the overview viewport: {box}"
        probes[kind] = box

    async def capture(label):
        return {kind: await page.screenshot(path=str(output / f"gpu-{label}-{kind}.png"), clip=box, animations="disabled", timeout=SCREENSHOT_TIMEOUT_MS) for kind, box in probes.items()}

    on = await capture("on")
    hide = await page.add_style_tag(content="canvas[data-liquid-canvas] { visibility: hidden !important; }")
    try:
        await _painted(page)
        off = await capture("off")
    finally:
        await hide.evaluate("node => node.remove()")
    await _painted(page)
    contribution = {kind: _difference(off[kind], on[kind], border_only=kind == "panel") for kind in probes}
    for kind, difference in contribution.items():
        assert difference["changedFraction"] > 0.005 and difference["meanChannelDifference"] > 0.15, f"GPU has no meaningful contribution on actual {kind} rectangle: {difference}"

    await _configure(page, strength=1)
    low = await capture("strength-1")
    await _configure(page, strength=60)
    high = await capture("strength-60")
    strength = {kind: _difference(low[kind], high[kind], border_only=kind == "panel") for kind in probes}
    responding = [kind for kind, difference in strength.items() if difference["changedFraction"] > 0.002 and difference["meanChannelDifference"] > 0.05]
    assert len(responding) >= 2, f"Refraction strength did not affect multiple actual surfaces: {strength}"

    capture_change = await _configure(page, backdrop="Grid")
    grid = await capture("grid")
    backdrop = {kind: _difference(high[kind], grid[kind], border_only=kind == "panel") for kind in probes}
    assert capture_change["captureAfter"] > capture_change["captureBefore"], "Backdrop changed without a completed texture capture"
    for kind, difference in backdrop.items():
        assert difference["changedFraction"] > 0.01 and difference["meanChannelDifference"] > 0.25, f"Changed backdrop did not reach the actual {kind} surface: {difference}"
    await page.screenshot(path=str(output / "gpu-effect-overview.png"), full_page=True, animations="disabled", timeout=SCREENSHOT_TIMEOUT_MS)
    await expect(root).to_have_attribute("data-liquid-status", "ready")
    await _configure(page, strength=30, backdrop="Coast")
    result.update({
        "gpuRendered": True,
        "surfaceCount": surface_count,
        "probeRectangles": probes,
        "gpuContribution": contribution,
        "strengthChanges": strength,
        "strengthResponders": responding,
        "backdropChanges": backdrop,
        "captureRevision": capture_change,
        "screenshots": sorted(path.name for path in output.glob("gpu-*.png")),
    })
    return result
