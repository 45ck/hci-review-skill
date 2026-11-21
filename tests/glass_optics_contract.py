"""Pixel evidence for GPU material on actual Liquid Glass kit controls.

No browser is launched here. An unavailable renderer is reported separately;
CI requires a ready GPU and verifies its contribution on three DOM rectangles.
"""

import asyncio
import base64
from contextvars import ContextVar
import json
from pathlib import Path
import re
import struct
from time import perf_counter
import zlib

# SwiftShader capture can outlast the interaction timeout after fonts are ready.
# Keep capture bounded and fatal; do not skip Playwright's font-readiness check.
SCREENSHOT_TIMEOUT_MS = 15000
MOTION_SETTLE_TIMEOUT_MS = 5000
MOTION_IDLE_SAMPLE_MS = 300
_CHECK_TRACE = ContextVar("glass_browser_check_trace", default=None)


def begin_browser_check(name):
    _CHECK_TRACE.set({"name": name, "started": perf_counter(), "stages": []})


def browser_stage(name, **detail):
    trace = _CHECK_TRACE.get()
    if trace is not None:
        trace["stages"].append({"stage": name, "atSeconds": round(perf_counter() - trace["started"], 3), **detail})
        trace["stages"] = trace["stages"][-24:]


def browser_check_trace():
    trace = _CHECK_TRACE.get()
    return trace["stages"][:] if trace else []


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
    try:
        return await asyncio.wait_for(page.evaluate("""async ({method, input}) => {
            const agent = window.quantitativeHciAgent;
            if (method === 'query') return agent.query(input);
            if (method === 'act') return agent.act(input);
            throw new Error('Unsupported optical-test operation');
        }""", {"method": method, "input": arguments}), timeout=5)
    except TimeoutError as error:
        raise AssertionError(f"Optical SDK {method} exceeded 5000 ms") from error


async def _entry(page, kind, labels):
    browser_stage("optics: query SDK control", kind=kind, labels=labels)
    result = await _call(page, "query", {"kind": kind})
    assert isinstance(result, list), result
    names = [labels] if isinstance(labels, str) else labels
    matching = [item for item in result if not item.get("offPage") and item.get("label") in names]
    assert len(matching) == 1, f"Expected one {kind} named {names}: {matching}"
    return matching[0]


async def _act(page, entry, action, args):
    browser_stage("optics: act on SDK control", component=entry.get("component"), label=entry.get("label"), action=action)
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
            visibility: document.visibilityState,
            effects: Number(state.liquidActiveEffects),
            motion: Number(state.liquidMotionRevision),
            render: Number(state.liquidRenderRevision),
            capture: Number(state.liquidCaptureRevision)
        };
    }""")


async def settled_motion(page, *, check_idle=True):
    quiet_window_ms = MOTION_IDLE_SAMPLE_MS * (2 if check_idle else 1)
    browser_stage("material: wait for idle", checkStableIdle=check_idle, quietWindowMs=quiet_window_ms)
    started = perf_counter()
    deadline = started + MOTION_SETTLE_TIMEOUT_MS / 1000
    candidate, candidate_since, before = None, None, None
    polls, snapshots, longest_round_trip, resets = 0, [], 0, 0
    # Preserve the original 300 ms qualification plus 300 ms observation as one
    # uninterrupted window. A queued resize can schedule work after an initial
    # idle sample; any diagnostic change restarts qualification within the same
    # deadline. Never-settling work still fails, and every revision must stay fixed.
    while perf_counter() < deadline:
        poll_started = perf_counter()
        try:
            state = await asyncio.wait_for(motion_diagnostics(page), timeout=min(1, max(0.001, deadline - poll_started)))
        except TimeoutError:
            resets += candidate is not None
            candidate, candidate_since = None, None
            snapshots.append({"atMs": round((perf_counter() - started) * 1000, 1), "snapshotTimeout": True})
        else:
            now = perf_counter()
            polls += 1
            longest_round_trip = max(longest_round_trip, now - poll_started)
            snapshots.append({"atMs": round((now - started) * 1000, 1), "roundTripMs": round((now - poll_started) * 1000, 1), "state": state})
            if candidate is not None and state != candidate:
                resets += 1
                candidate, candidate_since = None, None
            if state["visibility"] != "visible":
                await asyncio.wait_for(page.bring_to_front(), timeout=min(1, max(0.001, deadline - now)))
                candidate, candidate_since = None, None
            elif state["state"] == "idle" and state["effects"] == 0:
                if candidate != state:
                    candidate, candidate_since = state, now
                if now - candidate_since >= quiet_window_ms / 1000:
                    before = state
                    break
            else:
                candidate, candidate_since = None, None
        snapshots = snapshots[-12:]
        await asyncio.sleep(min(0.025, max(0, deadline - perf_counter())))
    if before is None:
        evidence = {"deadlineMs": MOTION_SETTLE_TIMEOUT_MS, "quietWindowMs": quiet_window_ms,
            "quietWindowResets": resets, "completedSnapshots": polls,
            "longestRoundTripMs": round(longest_round_trip * 1000, 1), "recentSnapshots": snapshots[-12:]}
        browser_stage("material: host-polled idle failed", evidence=evidence)
        raise AssertionError(f"Material did not reach qualified idle within {MOTION_SETTLE_TIMEOUT_MS} ms: {evidence}")
    browser_stage("material: qualified stable idle", baseline=before, quietWindowMs=quiet_window_ms,
        quietWindowResets=resets, completedSnapshots=polls, longestRoundTripMs=round(longest_round_trip * 1000, 1))
    return before


async def _arm_motion_frames(page, box, *, indicator=False, target_x=None, kind="pointer"):
    browser_stage("motion: arm response GPU frame snapshots", indicator=indicator, interaction=kind, targetX=target_x)
    # Snapshot before presentation; CPU decoding happens after the observer detaches
    # so software GPU readback cannot block every observed render callback.
    await page.evaluate("""({box, indicator, targetX, kind}) => {
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
        const snapshots = [];
        const bitmaps = new Set();
        const marker = indicator
            ? document.querySelector('[aria-label="Workspace view"] [data-slot="segmented-control-indicator"]')
            : null;
        const effectElement = document.querySelector('[data-optics-probe="button"]');
        const indicatorGeometry = () => {
            if (!marker) return null;
            const rect = marker.getBoundingClientRect();
            const style = getComputedStyle(marker);
            return {x: rect.x, y: rect.y, width: rect.width, height: rect.height,
                left: style.left, transitionProperty: style.transitionProperty,
                transitionDuration: style.transitionDuration,
                direction: marker.getAttribute('data-activation-direction')};
        };
        const indicatorStart = indicatorGeometry();
        const initialX = indicator ? indicatorStart.x
            : parseFloat(effectElement?.style.getPropertyValue('--liquid-fx-x') || '0');
        let responseStarted = false;
        let middleCaptured = false;
        let lateCaptured = false;
        let peakOpacity = 0;
        const probe = {phase: 'armed', frameCount: 0, requiredFrames: 3, maxSnapshots: 5, decodedCount: 0,
            interaction: indicator ? 'selection' : kind, initialX, targetX, indicatorStart,
            observedRenders: 0, activeRenders: 0, frameDeadlineMs: 4000, startedAt: performance.now()};
        const baseline = Number(root.dataset.liquidMotionRevision);
        const capture = Number(root.dataset.liquidCaptureRevision);
        let previous = -1;
        let timer;
        let finished = false;
        let cancelled = false;
        let resolve;
        const done = new Promise(complete => { resolve = complete; });
        const cancel = () => {
            cancelled = true;
            observer.disconnect();
            clearTimeout(timer);
            for (const bitmap of bitmaps) bitmap.close();
            bitmaps.clear();
            copy.width = copy.height = 0;
            resolve({frames, capture, error: 'Capture cancelled', probe});
        };
        const finish = async error => {
            if (finished) return;
            finished = true;
            observer.disconnect();
            clearTimeout(timer);
            if (error) {
                probe.phase = 'failed';
                probe.elapsedMs = performance.now() - probe.startedAt;
                resolve({frames, capture, error, probe});
                return;
            }
            try {
                probe.phase = 'awaiting snapshots';
                const images = await Promise.all(snapshots);
                if (cancelled) return;
                for (let index = 0; index < images.length; index++) {
                    probe.phase = `decoding snapshot ${index + 1}`;
                    context.clearRect(0, 0, copy.width, copy.height);
                    context.drawImage(images[index], 0, 0);
                    const pixels = context.getImageData(0, 0, copy.width, copy.height).data;
                    let painted = 0;
                    for (let offset = 3; offset < pixels.length; offset += 4) painted += pixels[offset] > 0;
                    frames[index].paintedFraction = painted / (copy.width * copy.height);
                    frames[index].png = copy.toDataURL('image/png');
                    images[index].close();
                    bitmaps.delete(images[index]);
                    probe.decodedCount++;
                }
                probe.phase = 'complete';
                probe.elapsedMs = performance.now() - probe.startedAt;
                resolve({frames, capture, error: null, probe});
            } catch (failure) {
                probe.phase = 'failed';
                resolve({frames, capture, error: String(failure), probe});
            }
        };
        const observer = new MutationObserver(() => {
            const now = performance.now();
            const state = root.dataset;
            probe.observedRenders++;
            probe.lastRender = Number(state.liquidRenderRevision);
            if (Number(state.liquidMotionRevision) <= baseline) return;
            const active = Number(state.liquidActiveEffects) > 0;
            if (active) probe.activeRenders++;
            if (Number(state.liquidRenderRevision) === previous) return;
            const geometry = indicatorGeometry();
            let progress;
            let responding;
            if (indicator || kind === 'pointer') {
                const x = indicator ? geometry.x
                    : parseFloat(effectElement?.style.getPropertyValue('--liquid-fx-x') || '0');
                progress = Math.min(1, Math.abs(x - initialX) / Math.max(0.5, Math.abs(targetX - initialX)));
                responding = Math.abs(x - initialX) > (indicator ? 0.5 : 0.1);
            } else {
                const opacity = parseFloat(effectElement?.style.getPropertyValue('--liquid-fx-ripple-opacity') || '0');
                peakOpacity = Math.max(peakOpacity, opacity);
                progress = peakOpacity ? Math.min(1, Math.max(0, 1 - opacity / peakOpacity)) : 0;
                responding = effectElement?.hasAttribute('data-liquid-ripple');
            }
            if (!responseStarted && !responding) { probe.phase = 'waiting for actual response'; return; }
            responseStarted = true;
            const settled = state.liquidMotionState === 'idle' && !active;
            const reason = settled ? 'settled response'
                : frames.length < 2 ? 'early response'
                : !middleCaptured && progress >= 0.5 ? 'middle response'
                : !lateCaptured && progress >= 0.85 ? 'late response' : null;
            probe.lastProgress = progress;
            if (!reason) return;
            try {
                probe.phase = `snapshot ${frames.length + 1}`;
                const snapshot = createImageBitmap(source,
                    Math.floor((box.x - bounds.x) * scaleX),
                    Math.floor((box.y - bounds.y) * scaleY), copy.width, copy.height
                ).then(bitmap => {
                    if (cancelled) bitmap.close();
                    else bitmaps.add(bitmap);
                    return bitmap;
                });
                snapshot.catch(error => finish(String(error)));
                snapshots.push(snapshot);
                frames.push({
                    at: now, motion: Number(state.liquidMotionRevision),
                    render: Number(state.liquidRenderRevision),
                    capture: Number(state.liquidCaptureRevision),
                    activeEffects: Number(state.liquidActiveEffects),
                    phase: reason, progress, indicator: geometry
                });
                if (progress >= 0.5) middleCaptured = true;
                if (progress >= 0.85) lateCaptured = true;
                probe.frameCount = frames.length;
                probe.phase = 'waiting for next render';
                previous = Number(state.liquidRenderRevision);
                if (settled) finish(null);
            } catch (error) { finish(String(error)); }
        });
        observer.observe(root, {attributes: true, attributeFilter: ['data-liquid-render-revision']});
        timer = setTimeout(() => finish('Response did not produce bounded initial-to-settled GPU evidence'), 4000);
        window.__glassMotionFrames = {done, probe, cancel};
    }""", {"box": box, "indicator": indicator, "targetX": target_x, "kind": kind})


async def _motion_frames(page, output, label):
    browser_stage("motion: await GPU frame evidence", label=label)
    try:
        sampled = await asyncio.wait_for(page.evaluate("window.__glassMotionFrames.done"), timeout=5)
    except TimeoutError as error:
        try:
            probe = await asyncio.wait_for(page.evaluate("window.__glassMotionFrames?.probe"), timeout=2)
        except Exception:
            probe = {"phase": "browser unavailable during readback timeout"}
        browser_stage("motion: GPU frame evidence timeout", label=label, probe=probe)
        raise AssertionError(f"{label}: GPU evidence exceeded 5000 ms; sampler={probe}") from error
    finally:
        try:
            await asyncio.wait_for(page.evaluate("window.__glassMotionFrames?.cancel(); delete window.__glassMotionFrames"), timeout=2)
        except Exception as cleanup_error:
            browser_stage("motion: cleanup unavailable", error=str(cleanup_error) or type(cleanup_error).__name__)
    if sampled["error"]:
        evidence = {"label": label, "error": sampled["error"], "sampler": sampled["probe"], "frames": [{key: value for key, value in frame.items() if key != "png"} for frame in sampled["frames"]]}
        (output / f"motion-{label}-failure.json").write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
        browser_stage("motion: frame capture failed", evidence=evidence)
        raise AssertionError(f"{label}: {sampled['error']}; sampler={sampled['probe']}")
    frames = sampled["frames"]
    assert 3 <= len(frames) <= 5, f"Expected 3–5 response frames in {label}; got {len(frames)}: {sampled['probe']}"
    assert frames[-1]["phase"] == "settled response", f"{label} omitted the settled response frame"
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
    full_response = _difference(pngs[0], pngs[-1])
    assert any(item["changedFraction"] > 0.001 and item["meanChannelDifference"] > 0.03 for item in [*differences, full_response]), f"{label} did not reach the pixel-change threshold over its sampled response: {differences}; full response={full_response}"
    assert len({frame["render"] for frame in frames}) == len(frames), f"{label} repeated a GPU frame"
    assert frames[-1]["motion"] > frames[0]["motion"], f"{label} did not advance its motion clock"
    return {"frames": frames, "differences": differences, "fullResponseDifference": full_response, "elapsedMs": round(frames[-1]["at"] - frames[0]["at"], 1), "sampler": sampled["probe"]}


async def _settings(page):
    settings = await _entry(page, "popover", ["Material settings", "Glass material"])
    if not settings.get("open"):
        await _act(page, settings, "setOpen", [True])
    return await _entry(page, "popover", "Glass material")


async def configure_material(page, *, strength=None, backdrop=None, motion=None, appearance=None):
    browser_stage("material: configure", strength=strength, backdrop=backdrop, motion=motion, appearance=appearance)
    await _settings(page)
    motion_control = await _entry(page, "switch", "Animate glass")
    resolved_motion = await page.locator("html").get_attribute("data-liquid-motion")
    assert motion_control["checked"] is (resolved_motion == "enabled"), f"Animate glass disagrees with resolved {resolved_motion} mode"
    if appearance is not None:
        control = await _entry(page, "select", "Appearance")
        result = await _call(page, "query", {"within": control["ref"]})
        choices = [item for entry in result if entry["ref"] == control["ref"] for item in entry.get("items", []) if item["label"] == appearance]
        assert len(choices) == 1, f"Appearance choice missing: {result}"
        await _act(page, control, "setValue", [choices[0]["value"]])
        assert (await _entry(page, "select", "Appearance"))["value"] == choices[0]["value"]
        await page.wait_for_function("""value => {
            const state = document.documentElement.dataset;
            return state.liquidTransparency === value &&
                ['ready', 'unavailable', 'reduced', 'error'].includes(state.liquidStatus);
        }""", arg=choices[0]["value"], timeout=25000)
        assert await page.locator("html").get_attribute("data-liquid-status") != "error", await page.locator("html").get_attribute("data-liquid-error")
    # Transparency may replace the engine, so baselines belong to the new instance.
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
        await settled_motion(page, check_idle=False)
        return {kind: await page.screenshot(path=str(output / f"gpu-{label}-{kind}.png"), clip=box, animations="allow", timeout=SCREENSHOT_TIMEOUT_MS) for kind, box in probes.items()}

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

    browser_stage("optics: observe capture work through a real backdrop change")
    await page.evaluate("""() => {
        const root = document.documentElement;
        const snapshots = [];
        let previous = '';
        const record = () => {
            const work = JSON.parse(root.dataset.liquidMotionWork || '{}');
            const state = {state: root.dataset.liquidMotionState, visibility: document.visibilityState,
                captureWork: work.capture ?? null, effects: work.effects ?? null,
                captureRevision: Number(root.dataset.liquidCaptureRevision)};
            const key = JSON.stringify(state);
            if (key === previous) return;
            previous = key;
            if (snapshots.length === 128) snapshots.splice(1, 1);
            snapshots.push(state);
        };
        const observer = new MutationObserver(record);
        observer.observe(root, {attributes: true, attributeFilter: [
            'data-liquid-motion-state', 'data-liquid-motion-work', 'data-liquid-capture-revision']});
        record();
        window.__glassCaptureActivity = {finish: () => {record(); observer.disconnect(); return snapshots;}};
    }""")
    try:
        capture_change = await configure_material(page, backdrop="Coast")
    finally:
        capture_activity = await page.evaluate("""() => {
            const snapshots = window.__glassCaptureActivity.finish();
            delete window.__glassCaptureActivity;
            return snapshots;
        }""")
    pending_capture = [sample for sample in capture_activity if sample["captureWork"] == 1 and sample["visibility"] == "visible"]
    assert pending_capture, f"The real backdrop refresh exposed no visible pending capture phase: {capture_activity}"
    assert all(sample["state"] == "running" for sample in pending_capture), f"Visible pending capture was reported idle: {capture_activity}"
    assert capture_activity[-1]["captureWork"] == 0 and capture_activity[-1]["state"] == "idle", f"Capture work did not settle: {capture_activity}"
    coast = await capture("coast")
    backdrop = {kind: _difference(high[kind], coast[kind], border_only=kind == "panel") for kind in probes}
    assert capture_change["captureAfter"] > capture_change["captureBefore"], "Backdrop changed without a completed texture capture"
    for kind, difference in backdrop.items():
        assert difference["changedFraction"] > 0.01 and difference["meanChannelDifference"] > 0.25, f"Changed backdrop did not reach the actual {kind} surface: {difference}"
    await page.screenshot(path=str(output / "gpu-effect-overview.png"), full_page=True, animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
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
        "captureActivity": capture_activity,
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
    await _arm_motion_frames(page, box, target_x=box["width"] * 0.8)
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

    await _arm_motion_frames(page, box, kind="ripple")
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
            target = await workspace.get_by_role("radio", name=label, exact=True).bounding_box()
            assert target, f"Workspace choice {label} has no bounds"
            await _arm_motion_frames(page, group_box, indicator=True, target_x=target["x"])
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
            assert any(frame["indicator"] and minimum + 0.5 < frame["indicator"]["x"] < maximum - 0.5 for frame in evidence["frames"]), f"{source} selection response lacked an observed intermediate position between {start} and {end}: {evidence}"
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


async def arm_popup_render_timeline(page):
    """Observe a single real popup entry without timers or renderer mutations."""
    await page.evaluate("""() => {
        window.__glassPopupTimeline?.stop('replaced');
        const root = document.documentElement;
        const first = [], last = [];
        const startedAt = performance.now();
        let stopped = false, total = 0, renderSamples = 0, lifecycleSamples = 0;
        let previousRender = Number(root.dataset.liquidRenderRevision);
        let currentHost = null;
        const rect = node => {
            if (!node) return null;
            const value = node.getBoundingClientRect();
            return [value.x, value.y, value.width, value.height];
        };
        const snapshot = source => {
            const host = document.querySelector('[data-slot="dialog-content"][data-open], [data-slot="dialog-content"]:popover-open, dialog[data-slot="dialog-content"]:modal');
            if (host instanceof HTMLElement) currentHost = host;
            const popup = host || (currentHost?.isConnected ? currentHost : null);
            if (!popup && source === 'render') return;
            const style = popup ? getComputedStyle(popup) : null;
            const canvases = popup?.querySelectorAll('canvas[data-liquid-canvas="popup"]');
            const canvas = canvases?.[0];
            const animations = popup?.getAnimations() ?? [];
            const entry = {
                atMs: performance.now() - startedAt, source,
                performanceNow: performance.now(), documentTimelineTime: document.timeline.currentTime,
                render: Number(root.dataset.liquidRenderRevision), motion: root.dataset.liquidMotion,
                motionRevision: Number(root.dataset.liquidMotionRevision),
                motionState: root.dataset.liquidMotionState, motionWork: root.dataset.liquidMotionWork,
                activeEffects: Number(root.dataset.liquidActiveEffects),
                surfaceCount: Number(root.dataset.liquidSurfaceCount),
                lastInvalidation: root.dataset.liquidLastInvalidation,
                popup: popup ? {
                    startingStyle: popup.hasAttribute('data-starting-style'),
                    endingStyle: popup.hasAttribute('data-ending-style'), open: popup.hasAttribute('data-open'),
                    inlineStyle: popup.getAttribute('style')?.slice(0, 1500) ?? null,
                    translate: style.translate, transform: style.transform, scale: style.scale, opacity: style.opacity,
                    transitionProperty: style.transitionProperty,
                    transitionDuration: style.transitionDuration, transitionDelay: style.transitionDelay,
                    actual: rect(popup), liquidSurface: popup.getAttribute('data-liquid-surface'),
                    canvasCount: canvases.length, actualCanvas: rect(canvas),
                    recordedCanvas: canvas?.getAttribute('data-liquid-render-rect') ?? null,
                    animationCount: animations.length,
                    animations: animations.slice(0, 4).map(animation => ({
                        type: animation.constructor.name, playState: animation.playState,
                        pending: animation.pending, currentTime: animation.currentTime,
                        endTime: animation.effect?.getComputedTiming().endTime,
                        progress: animation.effect?.getComputedTiming().progress
                    }))
                } : null
            };
            total++;
            if (source === 'render') renderSamples++; else lifecycleSamples++;
            if (first.length < 16) first.push(entry);
            else { last.push(entry); if (last.length > 16) last.shift(); }
        };
        const renders = new MutationObserver(() => {
            const revision = Number(root.dataset.liquidRenderRevision);
            if (revision === previousRender) return;
            previousRender = revision;
            snapshot('render');
        });
        const lifecycle = new MutationObserver(records => {
            for (const record of records) {
                if (!(record.target instanceof HTMLElement) || record.target.dataset.slot !== 'dialog-content' ||
                    record.oldValue === record.target.getAttribute(record.attributeName)) continue;
                currentHost = record.target;
                snapshot(`attribute:${record.attributeName}`);
            }
        });
        const transition = event => {
            if (!(event.target instanceof HTMLElement) || event.target.dataset.slot !== 'dialog-content') return;
            if (event instanceof TransitionEvent && !['translate', 'transform', 'scale', 'opacity'].includes(event.propertyName)) return;
            currentHost = event.target;
            snapshot(`${event.type}:${event.propertyName ?? ''}`);
        };
        const events = ['transitionrun', 'transitionstart', 'transitionend', 'transitioncancel', 'toggle'];
        const summary = () => ({startedAt, endedAt: performance.now(), total, renderSamples, lifecycleSamples,
            retained: first.length + last.length, dropped: total - first.length - last.length, first, last});
        const stop = reason => {
            if (!stopped) {
                stopped = true;
                renders.disconnect(); lifecycle.disconnect();
                for (const event of events) document.removeEventListener(event, transition, true);
                snapshot(`final:${reason}`);
            }
            return summary();
        };
        renders.observe(root, {attributes: true, attributeFilter: ['data-liquid-render-revision']});
        lifecycle.observe(document.body, {subtree: true, attributes: true, attributeOldValue: true,
            attributeFilter: ['data-starting-style', 'data-ending-style', 'data-open']});
        for (const event of events) document.addEventListener(event, transition, true);
        window.__glassPopupTimeline = {stop, summary};
        snapshot('armed');
    }""")


async def finish_popup_render_timeline(page, output_dir):
    """Always disconnect the bounded probe and retain evidence on assertion failure."""
    try:
        timeline = await asyncio.wait_for(page.evaluate("""() => {
            const result = window.__glassPopupTimeline?.stop('check cleanup');
            delete window.__glassPopupTimeline;
            return result ?? null;
        }"""), timeout=2)
        if timeline is None:
            return {"status": "not-armed"}
        path = Path(output_dir) / "keyboard-popup-render-timeline.json"
        path.write_text(json.dumps(timeline, indent=2) + "\n", encoding="utf-8")
        return {"status": "saved", "artifact": path.name,
                **{key: timeline[key] for key in ["total", "renderSamples", "lifecycleSamples", "retained", "dropped"]}}
    except Exception as error:
        return {"status": "unavailable", "error": str(error) or type(error).__name__}


async def _arm_drawer_frames(page, target_y):
    await page.evaluate("""targetY => {
        window.__glassDrawerFrames?.cancel();
        const root = document.documentElement;
        const drawer = document.querySelector('[data-slot="drawer-content"][data-open]');
        if (!(drawer instanceof HTMLElement)) throw new Error('Missing open native Drawer');
        const frames = [];
        const renders = new Set();
        const box = node => {const rect = node.getBoundingClientRect(); return [rect.x, rect.y, rect.width, rect.height];};
        const start = box(drawer);
        const probe = {phase: 'armed before release', startedAt: performance.now(), frameDeadlineMs: 4000,
            observedRenders: 0, nativeRenders: 0, frameCount: 0, startY: start[1], targetY};
        let observedNative = false;
        let timer;
        let finished = false;
        let resolve;
        const done = new Promise(complete => { resolve = complete; });
        const finish = error => {
            if (finished) return;
            finished = true;
            observer.disconnect();
            clearTimeout(timer);
            probe.phase = error ? 'failed' : 'complete';
            probe.elapsedMs = performance.now() - probe.startedAt;
            resolve({frames, error, probe});
        };
        const sample = initial => {
            const render = Number(root.dataset.liquidRenderRevision);
            if (!initial) probe.observedRenders++;
            if (renders.has(render) || render <= 0) return;
            const host = drawer.closest(':popover-open,dialog:modal');
            const canvas = host?.querySelector(':scope > canvas[data-liquid-canvas="popup"]');
            const animations = [];
            for (let node = drawer; node; node = node.parentElement) {
                for (const animation of node.getAnimations()) {
                    if (animation instanceof CSSAnimation || animation instanceof CSSTransition ||
                        animation.playState !== 'running' || !(animation.effect instanceof KeyframeEffect)) continue;
                    const timing = animation.effect.getComputedTiming();
                    if (!Number.isFinite(timing.endTime) || timing.endTime <= 0 ||
                        !animation.effect.getKeyframes().some(frame => 'translate' in frame || 'transform' in frame)) continue;
                    animations.push({progress: timing.progress, duration: timing.endTime,
                        target: node.getAttribute('data-slot')});
                }
                if (node === host) break;
            }
            if (!canvas || !host) { probe.phase = 'waiting for popup canvas'; return; }
            if (animations.length) { observedNative = true; probe.nativeRenders++; }
            const settled = observedNative && !animations.length && !drawer.hasAttribute('data-dragging') &&
                root.dataset.liquidMotionState === 'idle' && Number(root.dataset.liquidActiveEffects) === 0;
            if (!initial && !animations.length && !settled) return;
            const actual = box(drawer);
            const frame = {
                at: performance.now(), phase: initial ? 'dragged start' : settled ? 'settled response' : 'native settle',
                progress: Math.abs(actual[1] - start[1]) / Math.max(0.5, Math.abs(targetY - start[1])),
                nativeAnimations: animations,
                drawer: actual, renderedDrawer: JSON.parse(drawer.getAttribute('data-liquid-render-rect') || 'null'),
                host: box(host), canvas: box(canvas),
                renderedLayer: JSON.parse(canvas.getAttribute('data-liquid-render-rect') || 'null'),
                render,
                motion: Number(root.dataset.liquidMotionRevision),
                capture: Number(root.dataset.liquidCaptureRevision),
                state: root.dataset.liquidMotionState
            };
            // Keep bounded geometry evidence without discarding adjacent 60 Hz draws.
            if (frames.length < 32 || settled) frames.push(frame);
            else frames[31] = frame;
            renders.add(render);
            probe.frameCount = frames.length;
            probe.phase = frame.phase;
            if (settled) finish(null);
        };
        const observer = new MutationObserver(() => sample(false));
        observer.observe(root, {attributes: true, attributeFilter: ['data-liquid-render-revision']});
        // The already completed drag draw is the start state, before pointerup.
        sample(true);
        timer = setTimeout(() => finish('Native Drawer did not produce a completed settled redraw'), 4000);
        window.__glassDrawerFrames = {done, probe, cancel: () => finish('Capture cancelled')};
    }""", target_y)


def _assert_rect_alignment(actual, rendered, label):
    assert isinstance(rendered, list) and len(rendered) == 4, f"Missing actual GPU draw bounds for {label}: {rendered}"
    error = max(abs(left - right) for left, right in zip(actual, rendered))
    assert error <= 1.5, f"GPU bounds lagged {label} by {error:.3f}px: DOM {actual}, GPU {rendered}"
    return round(error, 4)


async def verify_drawer_motion_contract(page, expect, *, output_dir="test-results", require_gpu=False):
    root = page.locator("html")
    status = await root.get_attribute("data-liquid-status")
    if status != "ready":
        assert not require_gpu, f"Native Drawer GPU tracking is required; renderer reported {status}"
        return {"status": status, "geometryVerified": False}
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    outcomes = {}
    trigger = page.get_by_role("button", name="Arrange workspace", exact=True)
    try:
        for enabled in [True, False]:
            policy = "enabled" if enabled else "off"
            browser_stage("drawer: configure and open", policy=policy)
            await configure_material(page, motion=enabled)
            await expect(root).to_have_attribute("data-liquid-motion", policy)
            await trigger.click()
            drawer = page.get_by_role("dialog", name="Workspace layout", exact=True)
            await expect(drawer).to_be_visible()
            await expect(drawer).to_have_attribute("data-driver", "pointer")
            await settled_motion(page)
            rest = await drawer.bounding_box()
            grip = await drawer.locator("[data-slot='grip']").bounding_box()
            assert rest and grip, "Native Drawer or its drag grip has no bounds"
            start = {"x": grip["x"] + grip["width"] / 2, "y": grip["y"] + grip["height"] / 2}
            await page.mouse.move(**start)
            await settled_motion(page)
            before = await motion_diagnostics(page)
            await page.mouse.down()
            try:
                browser_stage("drawer: drag grip", policy=policy)
                distance = min(40, rest["height"] * 0.12)
                await page.mouse.move(start["x"], start["y"] + distance, steps=6)
                await expect(drawer).to_have_attribute("data-dragging", re.compile(r".*"))
                dragged = await drawer.bounding_box()
                assert dragged and dragged["y"] - rest["y"] > 8, f"The real Drawer did not follow the pointer: {rest}, {dragged}"
                # Qualify the held-drag endpoint before mixing live DOM bounds
                # with the published draw. A fixed delay can precede the last
                # drag render on software GPU, even though native settle draws
                # are synchronously sampled below. Keep alignment assertions.
                await settled_motion(page, check_idle=False)
                await _arm_drawer_frames(page, rest["y"])
            finally:
                await page.mouse.up()
            browser_stage("drawer: await native settle frames", policy=policy, deadlineMs=4000)
            try:
                samples = await asyncio.wait_for(page.evaluate("window.__glassDrawerFrames.done"), timeout=5)
            except TimeoutError as error:
                raise AssertionError(f"{policy}: native Drawer frame evidence exceeded 5000 ms") from error
            finally:
                try:
                    await asyncio.wait_for(page.evaluate("window.__glassDrawerFrames?.cancel(); delete window.__glassDrawerFrames"), timeout=2)
                except Exception as cleanup_error:
                    browser_stage("drawer: cleanup unavailable", error=str(cleanup_error) or type(cleanup_error).__name__)
            evidence_file = output / f"drawer-settle-{policy}.json"
            evidence_file.write_text(json.dumps(samples, indent=2) + "\n", encoding="utf-8")
            browser_stage("drawer: inspect completed render states", policy=policy, sampler=samples["probe"], evidence=evidence_file.name)
            assert not samples["error"], f"{policy}: {samples['error']}; sampler={samples['probe']}; frames={samples['frames']}"
            frames = samples["frames"]
            assert len(frames) >= 3 and len({frame["render"] for frame in frames}) == len(frames), f"{policy} Drawer did not produce three distinct completed render states: {samples}"
            assert frames[0]["phase"] == "dragged start" and frames[-1]["phase"] == "settled response", f"{policy} Drawer evidence omitted a rendered response endpoint: {samples}"
            assert max(frame["drawer"][1] for frame in frames) - min(frame["drawer"][1] for frame in frames) > 2, f"{policy} Drawer samples did not show native movement"
            minimum, maximum = sorted([frames[0]["drawer"][1], frames[-1]["drawer"][1]])
            assert any(frame["nativeAnimations"] and minimum + 0.5 < frame["drawer"][1] < maximum - 0.5 for frame in frames), f"{policy} Drawer lacked a rendered native intermediate position: {samples}"
            for frame in frames:
                frame["drawerAlignmentErrorPx"] = _assert_rect_alignment(frame["drawer"], frame["renderedDrawer"], f"{policy} Drawer surface")
                frame["layerAlignmentErrorPx"] = _assert_rect_alignment(frame["canvas"], frame["renderedLayer"], f"{policy} popup canvas")
                assert frame["capture"] == before["capture"], "Native Drawer settling recaptured the backdrop"
                if frame["nativeAnimations"]:
                    assert frame["state"] == "running", "Native Drawer settle was reported idle while moving"
                if not enabled:
                    assert frame["motion"] == before["motion"], "Native geometry tracking restarted decorative motion in off mode"
            idle = await settled_motion(page)
            await expect(drawer).to_be_visible()
            final = await drawer.evaluate("""node => {
                const rect = node.getBoundingClientRect();
                return {actual: [rect.x, rect.y, rect.width, rect.height],
                    rendered: JSON.parse(node.getAttribute('data-liquid-render-rect') || 'null')};
            }""")
            _assert_rect_alignment(final["actual"], final["rendered"], f"{policy} settled Drawer")
            assert abs(final["actual"][1] - rest["y"]) <= 1.5, f"{policy} Drawer did not return to its open snap point"
            if not enabled:
                assert idle["motion"] == before["motion"], "Off mode advanced decorative motion while Drawer settled"
                assert not await drawer.evaluate("node => node.hasAttribute('data-liquid-ripple') || node.hasAttribute('data-liquid-pressed')"), "Off Drawer retained decorative contact effects"
            filename = f"drawer-settled-{policy}.png"
            await page.screenshot(path=str(output / filename), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
            await page.keyboard.press("Escape")
            await expect(drawer).not_to_be_visible()
            await expect(trigger).to_be_focused()
            outcomes[policy] = {"frames": frames, "sampler": samples["probe"], "evidence": evidence_file.name, "final": final, "idle": idle, "screenshot": filename, "focusRestored": True}
    finally:
        await page.keyboard.press("Escape")
        await page.get_by_role("dialog", name="Workspace layout", exact=True).wait_for(state="hidden", timeout=5000)
        await configure_material(page, motion=True)
    return {"geometryVerified": True, "nativePhysicsPreserved": True, "modes": outcomes}
