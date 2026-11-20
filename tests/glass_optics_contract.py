"""Bounded reference-lens checks for the remote browser suite.

Call verify_optics_contract(page, expect). No browser is launched here. A ready
GPU path additionally needs a real screenshot change after optical input; an
unavailable adapter is reported separately from successful rendering.
"""

from pathlib import Path
import re
import struct
import zlib


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


async def _agent_value(page, label, value):
    result = await page.evaluate("""async ({label, value}) => {
      const agent = window.quantitativeHciAgent;
      if (!agent) throw new Error('The gallery agent bridge is missing');
      return agent.act({steps: [{ref: label, action: 'setValue', args: [value]}]});
    }""", {"label": label, "value": value})
    assert result.get("ok"), f"Agent could not set {label}: {result}"


async def _agent_refresh(page):
    result = await page.evaluate("""async () => {
      return window.quantitativeHciAgent.act({steps: [{ref: 'Refresh captured backdrop', action: 'press', args: []}]});
    }""")
    assert result.get("ok"), f"Agent could not refresh the captured backdrop: {result}"


async def _painted(page):
    await page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")


async def verify_optics_contract(page, expect, *, output_dir="test-results/optics", require_gpu=False):
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    if not await page.locator(".reference-lens-stage").count():
        await page.get_by_role("radio", name="Video refraction", exact=True).click()
    stage = page.locator(".reference-lens-stage")
    await expect(stage).to_be_visible()
    await expect(stage).to_have_attribute("data-lens-status", re.compile(r"^(ready|unavailable|error|reduced)$"), timeout=30000)
    status = await stage.get_attribute("data-lens-status")
    detail = await page.locator(".reference-lens-status").inner_text()
    assert status != "error", detail

    next_sample = stage.get_by_role("button", name="Next sample", exact=True)
    previous_sample = stage.get_by_role("button", name="Previous sample", exact=True)
    sample_label = stage.locator(".reference-lens-scene-heading span").last
    before_sample = int((await sample_label.inner_text()).split()[-1])
    await next_sample.scroll_into_view_if_needed()
    unobscured = await next_sample.evaluate("""node => {
      const box = node.getBoundingClientRect();
      const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return top === node || node.contains(top);
    }""")
    assert unobscured, "Backdrop text covers a live lens button"
    await next_sample.click()
    await expect(sample_label).to_have_text(f"Sample {before_sample + 1:02}")
    await previous_sample.click()
    await expect(sample_label).to_have_text(f"Sample {before_sample:02}")

    lens = stage.locator(".reference-lens-object")
    before_box = await lens.bounding_box()
    await _agent_value(page, "Lens horizontal position", 15)
    await expect(page.get_by_role("slider", name="Lens horizontal position", exact=True)).to_have_value("15")
    await _painted(page)
    after_box = await lens.bounding_box()
    assert before_box and after_box and abs(before_box["x"] - after_box["x"]) > 5, "Agent position change did not move the rendered lens"
    await _agent_value(page, "Lens horizontal position", 50)
    await _agent_value(page, "Lens vertical position", 70)
    await expect(page.get_by_role("slider", name="Lens vertical position", exact=True)).to_have_value("70")

    canvas = stage.locator(".reference-lens-canvas")
    result = {"status": status, "message": detail, "controlsUsable": True, "agentPositionVerified": True, "gpuRendered": False}
    if status == "ready":
        await expect(canvas).to_be_visible()
        await _agent_refresh(page)
        await _agent_value(page, "Lens refraction strength", 1)
        await _painted(page)
        before_png = await canvas.screenshot(path=str(output / "lens-minimum.png"), animations="disabled")
        await _agent_value(page, "Lens refraction strength", 60)
        await expect(page.get_by_role("slider", name="Lens refraction strength", exact=True)).to_have_value("60")
        await _painted(page)
        after_png = await canvas.screenshot(path=str(output / "lens-maximum.png"), animations="disabled")
        await expect(stage).to_have_attribute("data-lens-status", "ready")
        width, height, before_pixels = _png_rgb(before_png)
        after_width, after_height, after_pixels = _png_rgb(after_png)
        assert (width, height) == (after_width, after_height), "Probe changed canvas geometry"
        assert width >= 150 and height >= 50, "Canvas rendered at an unexpectedly small size"
        differences = [abs(first - second) for first, second in zip(before_pixels, after_pixels)]
        changed = sum(max(differences[index:index + 3]) > 8 for index in range(0, len(differences), 3))
        fraction = changed / (width * height)
        mean_difference = sum(differences) / len(differences)
        assert max(after_pixels) - min(after_pixels) > 40, "GPU screenshot is effectively uniform"
        assert fraction > 0.01 and mean_difference > 0.25, f"Optical input did not change rendered pixels: {fraction=}, {mean_difference=}"
        result.update({"gpuRendered": True, "pixelProbe": {"width": width, "height": height, "changedFraction": round(fraction, 4), "meanChannelDifference": round(mean_difference, 3)}, "screenshots": [str(output / "lens-minimum.png"), str(output / "lens-maximum.png")]})
    else:
        await expect(canvas).not_to_be_visible()
        await expect(page.get_by_role("button", name="Refresh captured backdrop", exact=True)).to_be_disabled()
        result["limitation"] = "Controls verified; GPU rendering was unavailable or suppressed by a system preference."
    await page.get_by_role("button", name="Reset lens", exact=True).click()
    await expect(page.get_by_role("slider", name="Lens horizontal position", exact=True)).to_have_value("50")
    await expect(page.get_by_role("slider", name="Lens vertical position", exact=True)).to_have_value("46")
    await expect(page.get_by_role("slider", name="Lens refraction strength", exact=True)).to_have_value("30")
    await _painted(page)
    await stage.screenshot(path=str(output / "reference-stage.png"), animations="disabled")
    result["stageScreenshot"] = str(output / "reference-stage.png")
    if require_gpu:
        assert result["gpuRendered"], f"GPU verification required, but the stage reported {status}: {detail}"
    return result
