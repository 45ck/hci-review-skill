"""Pixel evidence for GPU material on actual Liquid Glass kit controls.

No browser is launched here. An unavailable renderer is reported separately;
CI requires a ready GPU and verifies its contribution on three DOM rectangles.
"""

import asyncio
import base64
from pathlib import Path
import re
import struct
import zlib

# SwiftShader capture can outlast the interaction timeout after fonts are ready.
# Keep capture bounded and fatal; do not skip Playwright's font-readiness check.
SCREENSHOT_TIMEOUT_MS = 15000
MOTION_SETTLE_TIMEOUT_MS = 5000
MOTION_IDLE_SAMPLE_MS = 300


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


async def motion_diagnostics(page):
    return await page.evaluate("""() => {
        const state = document.documentElement.dataset;
        return {
            policy: state.liquidMotion, state: state.liquidMotionState,
            effects: Number(state.liquidActiveEffects),
            motion: Number(state.liquidMotionRevision),
            render: Number(state.liquidRenderRevision),
            capture: Number(state.liquidCaptureRevision)
        };
    }""")


async def settled_motion(page, *, check_idle=True):
    await page.wait_for_function("""() => {
        const state = document.documentElement.dataset;
        return state.liquidMotionState === 'idle' && Number(state.liquidActiveEffects) === 0;
    }""", timeout=MOTION_SETTLE_TIMEOUT_MS)
    await _painted(page)
    before = await motion_diagnostics(page)
    if check_idle:
        await page.wait_for_timeout(MOTION_IDLE_SAMPLE_MS)
        after = await motion_diagnostics(page)
        assert after == before, f"Settled material kept scheduling work: {before} -> {after}"
    return before


async def _arm_motion_frames(page, box, *, indicator=False):
    # Observe completed GPU draws so Chromium cannot discard a presented texture
    # before the test reads it. Only three frames are copied, never every frame.
    await page.evaluate("""({box, indicator}) => {
        window.__glassMotionFrames?.cancel();
        const root = document.documentElement;
        const source = document.querySelector('canvas[data-liquid-canvas="viewport"]');
        if (!(source instanceof HTMLCanvasElement)) throw new Error('Missing viewport GPU canvas');
        const bounds = source.getBoundingClientRect();
        const scaleX = source.width / bounds.width;
        const scaleY = source.height / bounds.height;
        const copy = document.createElement('canvas');
        copy.width = Math.max(1, Math.round(box.width * scaleX));
        copy.height = Math.max(1, Math.round(box.height * scaleY));
        const context = copy.getContext('2d', {willReadFrequently: true});
        if (!context) throw new Error('Missing test readback context');
        const frames = [];
        const baseline = Number(root.dataset.liquidMotionRevision);
        const capture = Number(root.dataset.liquidCaptureRevision);
        let previous = -Infinity;
        let timer;
        let finished = false;
        let resolve;
        const done = new Promise(complete => { resolve = complete; });
        const finish = error => {
            if (finished) return;
            finished = true;
            observer.disconnect();
            clearTimeout(timer);
            copy.width = copy.height = 0;
            resolve({frames, capture, error});
        };
        const observer = new MutationObserver(() => {
            const now = performance.now();
            const state = root.dataset;
            if (Number(state.liquidMotionRevision) <= baseline ||
                state.liquidMotionState !== 'running' ||
                Number(state.liquidActiveEffects) < 1 || now - previous < 70) return;
            try {
                context.clearRect(0, 0, copy.width, copy.height);
                context.drawImage(source,
                    (box.x - bounds.x) * scaleX, (box.y - bounds.y) * scaleY,
                    box.width * scaleX, box.height * scaleY,
                    0, 0, copy.width, copy.height);
                const pixels = context.getImageData(0, 0, copy.width, copy.height).data;
                let painted = 0;
                for (let offset = 3; offset < pixels.length; offset += 4) painted += pixels[offset] > 0;
                const marker = indicator
                    ? document.querySelector('[aria-label="Workspace view"] [data-slot="segmented-control-indicator"]')
                    : null;
                const rect = marker?.getBoundingClientRect();
                frames.push({
                    at: now, motion: Number(state.liquidMotionRevision),
                    render: Number(state.liquidRenderRevision),
                    capture: Number(state.liquidCaptureRevision),
                    activeEffects: Number(state.liquidActiveEffects),
                    paintedFraction: painted / (copy.width * copy.height),
                    indicator: rect ? {x: rect.x, y: rect.y, width: rect.width, height: rect.height} : null,
                    png: copy.toDataURL('image/png')
                });
                previous = now;
                if (frames.length === 3) finish(null);
            } catch (error) { finish(String(error)); }
        });
        observer.observe(root, {attributes: true, attributeFilter: ['data-liquid-render-revision']});
        timer = setTimeout(() => finish('Fewer than three active GPU frames were observed'), 4000);
        window.__glassMotionFrames = {done, cancel: () => finish('Capture cancelled')};
    }""", {"box": box, "indicator": indicator})


async def _motion_frames(page, output, label):
    sampled = await asyncio.wait_for(page.evaluate("window.__glassMotionFrames.done"), timeout=5)
    await page.evaluate("delete window.__glassMotionFrames")
    assert not sampled["error"], f"{label}: {sampled['error']}; captured {len(sampled['frames'])} frames"
    frames = sampled["frames"]
    assert len(frames) == 3, f"Missing motion frames in {label}: {len(frames)}"
    pngs = []
    for index, frame in enumerate(frames):
        encoded = frame.pop("png")
        assert encoded.startswith("data:image/png;base64,"), "GPU crop was not a PNG"
        data = base64.b64decode(encoded.split(",", 1)[1], validate=True)
        assert frame["paintedFraction"] > 0.05, f"Blank/discarded GPU texture in {label}: {frame}"
        assert frame["capture"] == sampled["capture"], f"Animation recaptured its backdrop in {label}: {frame}"
        path = output / f"motion-{label}-{index + 1}.png"
        path.write_bytes(data)
        frame["screenshot"] = path.name
        pngs.append(data)
    differences = [_difference(left, right) for left, right in zip(pngs, pngs[1:])]
    assert any(item["changedFraction"] > 0.001 and item["meanChannelDifference"] > 0.03 for item in differences), f"{label} changed diagnostics but not rendered pixels: {differences}"
    assert len({frame["render"] for frame in frames}) == 3, f"{label} repeated a GPU frame"
    assert frames[-1]["motion"] > frames[0]["motion"], f"{label} did not advance its motion clock"
    return {"frames": frames, "differences": differences, "elapsedMs": round(frames[-1]["at"] - frames[0]["at"], 1)}


async def _settings(page):
    settings = await _entry(page, "popover", ["Material settings", "Glass material"])
    if not settings.get("open"):
        await _act(page, settings, "setOpen", [True])
    return await _entry(page, "popover", "Glass material")


async def configure_material(page, *, strength=None, backdrop=None, motion=None, appearance=None):
    await _settings(page)
    motion_control = await _entry(page, "switch", "Animate glass")
    resolved_motion = await page.locator("html").get_attribute("data-liquid-motion")
    assert motion_control["checked"] is (resolved_motion == "enabled"), f"Animate glass disagrees with resolved {resolved_motion} mode"
    capture_before = await _revision(page, "data-liquid-capture-revision")
    backdrop_changed = False
    if strength is not None:
        control = await _entry(page, "slider", "Refraction strength")
        await _act(page, control, "setValue", [strength])
        assert (await _entry(page, "slider", "Refraction strength"))["value"] == strength
    if motion is not None:
        control = await _entry(page, "switch", "Animate glass")
        if control["checked"] is motion:
            await _act(page, control, "setChecked", [not motion])
            control = await _entry(page, "switch", "Animate glass")
        await _act(page, control, "setChecked", [motion])
        assert (await _entry(page, "switch", "Animate glass"))["checked"] is motion
    if appearance is not None:
        control = await _entry(page, "select", "Appearance")
        result = await _call(page, "query", {"within": control["ref"]})
        choices = [item for entry in result if entry["ref"] == control["ref"] for item in entry.get("items", []) if item["label"] == appearance]
        assert len(choices) == 1, f"Appearance choice missing: {result}"
        await _act(page, control, "setValue", [choices[0]["value"]])
        assert (await _entry(page, "select", "Appearance"))["value"] == choices[0]["value"]
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
    gpu = await page.locator("html").get_attribute("data-liquid-status") == "ready"
    if gpu:
        await _after_revision(page, "data-liquid-render-revision", render_before)
    if backdrop_changed and gpu:
        await _after_revision(page, "data-liquid-capture-revision", capture_before)
    await settled_motion(page)
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
    await configure_material(page, strength=30, backdrop="Coast")
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

    await configure_material(page, strength=1, backdrop="Grid")
    low = await capture("strength-1")
    await configure_material(page, strength=60)
    high = await capture("strength-60")
    strength = {kind: _difference(low[kind], high[kind], border_only=kind == "panel") for kind in probes}
    responding = [kind for kind, difference in strength.items() if difference["changedFraction"] > 0.002 and difference["meanChannelDifference"] > 0.05]
    assert len(responding) >= 2, f"Refraction strength did not affect multiple actual surfaces: {strength}"

    capture_change = await configure_material(page, backdrop="Coast")
    coast = await capture("coast")
    backdrop = {kind: _difference(high[kind], coast[kind], border_only=kind == "panel") for kind in probes}
    assert capture_change["captureAfter"] > capture_change["captureBefore"], "Backdrop changed without a completed texture capture"
    for kind, difference in backdrop.items():
        assert difference["changedFraction"] > 0.01 and difference["meanChannelDifference"] > 0.25, f"Changed backdrop did not reach the actual {kind} surface: {difference}"
    await page.screenshot(path=str(output / "gpu-effect-overview.png"), full_page=True, animations="disabled", timeout=SCREENSHOT_TIMEOUT_MS)
    await expect(root).to_have_attribute("data-liquid-status", "ready")
    await configure_material(page, strength=30, backdrop="Coast")
    result.update({
        "gpuRendered": True,
        "surfaceCount": surface_count,
        "probeRectangles": probes,
        "gpuContribution": contribution,
        "strengthChanges": strength,
        "strengthBackdrop": "Grid",
        "strengthResponders": responding,
        "backdropChanges": backdrop,
        "captureRevision": capture_change,
        "screenshots": sorted(path.name for path in output.glob("gpu-*.png")),
    })
    return result


async def _workspace_choice(page, label):
    control = await _entry(page, "segmented-control", "Workspace view")
    result = await _call(page, "query", {"within": control["ref"]})
    choices = [item for entry in result if entry["ref"] == control["ref"] for item in entry.get("items", []) if item["label"] == label]
    assert len(choices) == 1, f"Workspace choice {label} is not discoverable: {result}"
    return control, choices[0]


async def _select_workspace(page, label):
    control, choice = await _workspace_choice(page, label)
    await _act(page, control, "setValue", [choice["value"]])
    assert (await _entry(page, "segmented-control", "Workspace view"))["value"] == choice["value"]
    return control, choice


async def verify_pointer_motion(page, expect, *, output_dir="test-results", label="pointer"):
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    await expect(page.locator("html")).to_have_attribute("data-liquid-motion", "enabled")
    await page.mouse.move(1, 1)
    await settled_motion(page)
    button = page.locator("[data-optics-probe='button']")
    box = await button.bounding_box()
    assert box, "Missing live button bounds"
    y = box["y"] + box["height"] * 0.5
    await page.mouse.move(box["x"] + box["width"] * 0.2, y)
    await settled_motion(page)
    await _arm_motion_frames(page, box)
    await page.mouse.move(box["x"] + box["width"] * 0.8, y)
    result = await _motion_frames(page, output, label)
    await settled_motion(page)
    return result


async def verify_motion_contract(page, expect, *, output_dir="test-results", require_gpu=False):
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    root = page.locator("html")
    await expect(root).to_have_attribute("data-liquid-motion", "enabled")
    status = await root.get_attribute("data-liquid-status")
    if status != "ready":
        assert not require_gpu, f"GPU motion evidence is required; renderer reported {status}"
        return {"status": status, "gpuMotionVerified": False, "limitation": "GPU animation pixels unavailable; CSS fallback is checked separately."}

    await page.evaluate("window.scrollTo(0, 0)")
    await page.mouse.move(1, 1)
    await settled_motion(page)
    capture_before = await _revision(page, "data-liquid-capture-revision")
    button = page.locator("[data-optics-probe='button']")
    box = await button.bounding_box()
    assert box, "Missing live button bounds"
    pointer = await verify_pointer_motion(page, expect, output_dir=output)

    await _arm_motion_frames(page, box)
    await page.mouse.down()
    try:
        await expect(button).to_have_attribute("data-liquid-pressed", re.compile(r".*"))
        await expect(button).to_have_attribute("data-liquid-ripple", re.compile(r"^[ab]$"))
        ripple = await _motion_frames(page, output, "ripple")
    finally:
        await page.mouse.up()
    await expect(page.get_by_label("Project result", exact=True)).to_have_text("Created Coastal studio")
    await page.mouse.move(1, 1)
    await settled_motion(page)

    workspace = page.get_by_role("radiogroup", name="Workspace view", exact=True)
    await expect(workspace).to_be_visible()
    indicator = workspace.locator("[data-slot='segmented-control-indicator']")
    await expect(indicator).to_have_count(1)
    await _select_workspace(page, "Files")
    files = workspace.get_by_role("radio", name="Files", exact=True)
    activity = workspace.get_by_role("radio", name="Activity", exact=True)
    await files.focus()
    await settled_motion(page)
    control, _ = await _workspace_choice(page, "Files")
    await page.evaluate("""ref => {
        const events = [];
        const stop = window.quantitativeHciAgent.subscribe(change => {
            if (change.ref === ref && change.key === 'value') events.push(change);
        });
        window.__glassSelectionEvidence = {events, stop};
    }""", control["ref"])
    selections = {}
    try:
        for source, label in [("keyboard", "Activity"), ("agent", "Files")]:
            await settled_motion(page)
            start = await indicator.bounding_box()
            group_box = await workspace.bounding_box()
            assert start and group_box, "Selection surface has no measurable bounds"
            await _arm_motion_frames(page, group_box, indicator=True)
            if source == "keyboard":
                await files.press("ArrowRight")
                await expect(activity).to_be_checked()
                await expect(page.get_by_text("No recent changes", exact=True)).to_be_visible()
            else:
                await _select_workspace(page, label)
                await expect(files).to_be_checked()
            evidence = await _motion_frames(page, output, f"selection-{source}")
            await settled_motion(page)
            end = await indicator.bounding_box()
            assert end and abs(end["x"] - start["x"]) > 5, f"{source} selection did not relocate the indicator: {start}, {end}"
            minimum, maximum = sorted([start["x"], end["x"]])
            assert any(frame["indicator"] and minimum + 0.5 < frame["indicator"]["x"] < maximum - 0.5 for frame in evidence["frames"]), f"{source} selection jumped without observed travel: {evidence}"
            selections[source] = {"choice": label, "start": start, "end": end, **evidence}
        events = await page.evaluate("window.__glassSelectionEvidence.events")
        for source in ["keyboard", "agent"]:
            assert any(event["source"] == source for event in events), f"Missing SDK {source} change notification: {events}"
    finally:
        await page.evaluate("window.__glassSelectionEvidence?.stop(); delete window.__glassSelectionEvidence")

    disabled = page.get_by_role("button", name="Unavailable", exact=True)
    await expect(disabled).to_be_disabled()
    await page.mouse.move(1, 1)
    await settled_motion(page)
    disabled_box = await disabled.bounding_box()
    assert disabled_box, "Missing disabled control bounds"
    await page.mouse.move(disabled_box["x"] + disabled_box["width"] / 2, disabled_box["y"] + disabled_box["height"] / 2)
    await page.mouse.down()
    try:
        await page.wait_for_timeout(100)
        assert not await disabled.evaluate("node => node.hasAttribute('data-liquid-pressed') || node.hasAttribute('data-liquid-ripple')"), "Disabled control received an animated press"
    finally:
        await page.mouse.up()
    await page.mouse.move(1, 1)
    idle = await settled_motion(page)
    assert idle["capture"] == capture_before, f"Interactions recaptured the supplied backdrop: {capture_before} -> {idle['capture']}"
    first_idle = await page.screenshot(path=str(output / "motion-idle-before.png"), clip=box, animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
    await page.wait_for_timeout(MOTION_IDLE_SAMPLE_MS)
    second_idle = await page.screenshot(path=str(output / "motion-idle-after.png"), clip=box, animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
    idle_pixels = _difference(first_idle, second_idle)
    assert idle_pixels["changedFraction"] == 0 and idle_pixels["meanChannelDifference"] == 0, f"Settled control pixels kept moving: {idle_pixels}"
    return {
        "gpuMotionVerified": True, "pointer": pointer, "ripple": ripple,
        "selection": selections, "selectionSources": sorted({event["source"] for event in events}),
        "disabledPressSuppressed": True, "captureRevisionUnchanged": capture_before,
        "idle": idle, "idleObservationMs": MOTION_IDLE_SAMPLE_MS, "idlePixels": idle_pixels,
    }


async def verify_suppressed_motion(page, expect, *, policy):
    root = page.locator("html")
    await expect(root).to_have_attribute("data-liquid-motion", policy)
    await page.mouse.move(1, 1)
    before = await settled_motion(page)
    button = page.locator("[data-optics-probe='button']")
    await button.hover()
    await page.mouse.down()
    try:
        await page.wait_for_timeout(150)
        state = await button.evaluate("""node => ({
            pressed: node.hasAttribute('data-liquid-pressed'),
            ripple: node.hasAttribute('data-liquid-ripple'),
            animations: node.getAnimations().filter(animation => animation.playState === 'running').length
        })""")
        assert not state["pressed"] and not state["ripple"] and state["animations"] == 0, f"{policy} retained decorative button motion: {state}"
    finally:
        await page.mouse.up()
    await _select_workspace(page, "Activity")
    await expect(page.get_by_text("No recent changes", exact=True)).to_be_visible()
    indicator = page.locator("[aria-label='Workspace view'] [data-slot='segmented-control-indicator']")
    assert not await indicator.evaluate("node => node.hasAttribute('data-liquid-travelling')"), f"{policy} retained selection travel"
    assert await indicator.evaluate("node => node.getAnimations().filter(animation => animation.playState === 'running').length") == 0, f"{policy} retained a running CSS selection animation"
    after = await settled_motion(page)
    assert before["motion"] == after["motion"], f"{policy} advanced decorative animation: {before} -> {after}"
    assert before["capture"] == after["capture"], f"{policy} recaptured the backdrop during a control action"
    await _select_workspace(page, "Files")
    return {"policy": policy, "before": before, "after": after, "button": state, "selectionStillWorks": True}
