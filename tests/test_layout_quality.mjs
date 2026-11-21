import assert from "node:assert/strict";
import { getEventListeners } from "node:events";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import fc from "fast-check";
import { parseSync } from "rolldown/utils";
import { captureLayoutSnapshot, compareLayoutSnapshots, inspectPopupPlacement } from "../packages/liquid-glass/src/quality/geometry.ts";
import { observeLayoutShifts, summarizeLayoutShifts } from "../packages/liquid-glass/src/quality/observer.ts";

const propertyOptions = { seed: 20261122, numRuns: 200 };
const rect = (x, y, width = 80, height = 40) => ({ x, y, width, height });
const target = (id, box = rect(120, 80), extra = {}) => ({ id, rect: box, scroll: { x: 0, y: 0 }, coordinateMode: "document", visible: true, ...extra });
const snapshot = (targets = [target("anchor")], extra = {}) => ({
  version: 1, status: "captured", capturedAt: 100,
  context: { viewport: rect(0, 0, 1000, 800), scroll: { x: 0, y: 0 }, scale: 1, devicePixelRatio: 1, scopeId: "fixture", scopeKey: "fixture-1" },
  targets, findings: [], limits: { maxTargets: 128, captured: targets.length, truncated: false }, ...extra,
});
const codes = report => report.findings.map(item => item.code);
const shift = (startTime, value, hadRecentInput = false, sources = []) => ({ startTime, value, hadRecentInput, sources });
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} differs from ${expected}`);

test("fixture settling samples stable geometry when paints are sparse without accepting motion or leaked work", async () => {
  const source = readFileSync(new URL("../docs/hci/examples/liquid-glass/src/layout-quality-lab.tsx", import.meta.url), "utf8");
  const parsed = parseSync("layout-quality-lab.tsx", source, { lang: "tsx" });
  assert.deepEqual(parsed.errors, []);
  const declaration = parsed.program.body.find(node => node.type === "FunctionDeclaration" && node.id?.name === "settle");
  assert.ok(declaration, "Exercise the fixture's actual settling implementation");
  const executable = stripTypeScriptTypes(source.slice(declaration.start, declaration.end));
  const budgetDeclarations = parsed.program.body.filter(node => node.type === "VariableDeclaration" && node.declarations.some(item => ["BASELINE_SETTLE_MS", "AUDIT_SETTLE_MS"].includes(item.id?.name)));
  assert.equal(budgetDeclarations.length, 2, "Exercise both source-defined preparation and audit budgets");
  const budgets = runInNewContext(`${budgetDeclarations.map(node => source.slice(node.start, node.end)).join("\n")}; [BASELINE_SETTLE_MS, AUDIT_SETTLE_MS]`);
  assert.deepEqual([...budgets], [5000, 1500]);

  for (const budgetMs of budgets) for (const mode of ["sparse", "frames", "raced", "moving", "animation", "hidden", "aborted"]) {
    let clock = 0, sequence = 0, measurements = 0;
    const timers = new Map();
    const frames = new Set();
    const setTimer = (callback, delay) => {
      const id = ++sequence;
      timers.set(id, { callback, at: clock + delay });
      return id;
    };
    const clearTimer = id => timers.delete(id);
    const requestFrame = callback => {
      const id = mode === "frames" || mode === "raced" ? setTimer(callback, mode === "raced" ? 50 : 16) : ++sequence;
      frames.add(id);
      return id;
    };
    const cancelFrame = id => { frames.delete(id); timers.delete(id); };
    const settle = runInNewContext(`${executable}; settle`, {
      window: { setTimeout: setTimer, clearTimeout: clearTimer },
      document: { hidden: mode === "hidden", visibilityState: mode === "hidden" ? "hidden" : "visible" },
      performance: { now: () => clock },
      requestAnimationFrame: requestFrame, cancelAnimationFrame: cancelFrame, clearTimeout: clearTimer,
    });
    const target = {
      isConnected: true,
      getAttribute: name => name === "data-layout-probe" ? "test-target" : null,
      textContent: "excluded fixture text", value: "excluded field value",
      getBoundingClientRect: () => { measurements++; return rect(mode === "moving" ? clock : 0, 0, 80, 44); },
      getAnimations: () => mode === "animation" ? [{
        playState: "running", effect: { getKeyframes: () => [{ translate: "0 0" }, { translate: "10px 0" }] },
      }] : [],
    };
    const controller = new AbortController();
    const result = settle(() => [target], controller.signal, budgetMs);
    if (mode === "aborted") controller.abort();
    while (timers.size) {
      clock = Math.min(...[...timers.values()].map(timer => timer.at));
      assert.ok(clock <= budgetMs, `${mode}: settling remains within its ${budgetMs}ms budget`);
      const due = [...timers].filter(([, timer]) => timer.at === clock);
      for (const [id] of due) timers.delete(id);
      // Both callbacks may already be queued; alternate the winner without dropping the loser.
      if (mode === "raced" && clock % 100 === 0) due.reverse();
      for (const [, timer] of due) timer.callback();
    }
    const expected = mode === "sparse" || mode === "frames" || mode === "raced";
    const evidence = JSON.parse(JSON.stringify(await result));
    assert.equal(evidence.settled, expected, mode);
    assert.equal(evidence.reason, expected ? "stable" : mode === "hidden" ? "document-hidden" : mode === "aborted" ? "aborted" : "time-limit", mode);
    assert.equal(evidence.blocker, mode === "moving" ? "geometry-changing" : mode === "animation" ? "geometry-animation" : null, mode);
    assert.equal(evidence.budgetMs, budgetMs, mode);
    assert.equal(evidence.elapsedMs, clock, mode);
    assert.equal(evidence.sampleCount, measurements, `${mode}: report only actual geometry observations`);
    assert.equal(evidence.animationFrameSamples + evidence.timerSamples, evidence.sampleCount, mode);
    assert.equal(evidence.requiredStableSamples, 3);
    assert.equal(evidence.stableSamples, expected ? 3 : 0, mode);
    assert.equal(evidence.visibility, mode === "hidden" ? "hidden" : "visible", mode);
    assert.equal(evidence.sampleLimit, 8);
    assert.equal(evidence.samples.length, Math.min(measurements, 8), `${mode}: bound retained geometry evidence`);
    assert.equal(JSON.stringify(evidence).includes("excluded"), false, "Never retain text or field values");
    if (expected) {
      assert.equal(measurements, 4, `${mode}: retain three unchanged comparisons`);
      assert.equal(clock, mode === "frames" ? 64 : 200, `${mode}: settle without waiting out the deadline`);
    }
    if (mode === "raced") {
      assert.equal(evidence.animationFrameSamples, 2);
      assert.equal(evidence.timerSamples, 2);
      assert.deepEqual(evidence.samples.map(sample => sample.origin), ["animation-frame", "timer", "animation-frame", "timer"]);
    } else {
      assert.equal(evidence.animationFrameSamples, mode === "frames" ? measurements : 0, mode);
      assert.ok(evidence.samples.every(sample => sample.origin === (mode === "frames" ? "animation-frame" : "timer")), mode);
    }
    if (mode === "moving" || mode === "animation") assert.equal(clock, budgetMs, `${mode}: the default budget must expire without a pass`);
    assert.equal(frames.size, 0, `${mode}: cancel pending animation frames`);
    assert.equal(timers.size, 0, `${mode}: cancel pending timers`);
    assert.equal(getEventListeners(controller.signal, "abort").length, 0, `${mode}: remove abort listener`);
  }
});

test("scrolling normal-flow probes does not masquerade as layout instability", () => {
  fc.assert(fc.property(
    fc.integer({ min: -2000, max: 2000 }), fc.integer({ min: -2000, max: 2000 }),
    fc.integer({ min: -1500, max: 1500 }), fc.integer({ min: -1500, max: 1500 }),
    (x, y, scrollX, scrollY) => {
      const before = snapshot([target("anchor", rect(x, y))]);
      const after = snapshot([target("anchor", rect(x - scrollX, y - scrollY), { scroll: { x: scrollX, y: scrollY } })]);
      after.context.scroll = { x: scrollX, y: scrollY };
      assert.equal(compareLayoutSnapshots(before, after).status, "pass");
    },
  ), propertyOptions);
});

test("fixed probes stay in viewport space; sticky scrolling requires a new baseline", () => {
  fc.assert(fc.property(fc.integer({ min: 1, max: 3000 }), scrollY => {
    const before = snapshot([target("fixed", rect(20, 20), { coordinateMode: "viewport" })]);
    const after = structuredClone(before);
    after.context.scroll.y = scrollY;
    assert.equal(compareLayoutSnapshots(before, after).status, "pass");
    before.targets[0].coordinateMode = "contextual";
    after.targets[0].coordinateMode = "contextual";
    const report = compareLayoutSnapshots(before, after);
    assert.equal(report.status, "incomparable");
    assert.equal(report.passed, null);
    assert.ok(codes(report).includes("scroll-context-changed"));
  }), propertyOptions);
});

test("position defects survive scroll compensation and explicit exceptions stay property-specific", () => {
  fc.assert(fc.property(fc.integer({ min: 2, max: 200 }), fc.integer({ min: 0, max: 2000 }), (offset, scrollY) => {
    const before = snapshot();
    const after = snapshot([target("anchor", rect(120 + offset, 80 + offset - scrollY), { scroll: { x: 0, y: scrollY } })]);
    const report = compareLayoutSnapshots(before, after, { expectedChanges: [{ id: "anchor", properties: ["x"], reason: "Expected horizontal expansion" }] });
    assert.equal(report.status, "fail");
    assert.equal(report.findings.length, 1);
    assert.equal(report.findings[0].values.property, "y");
    assert.equal(report.findings[0].values.delta, offset);
    assert.equal(compareLayoutSnapshots(before, after, { expectedChanges: [{ id: "anchor", properties: ["x", "y"], reason: "Expected navigation transition" }] }).status, "pass");
  }), propertyOptions);
});

test("viewport and scope changes are not graded as stable or unstable geometry", () => {
  const before = snapshot();
  const after = structuredClone(before);
  after.context.viewport.width = 390;
  assert.equal(compareLayoutSnapshots(before, after).status, "incomparable");
  assert.equal(compareLayoutSnapshots(before, after, { allowViewportChange: true }).status, "pass");
  after.context.scopeKey = "another-root";
  assert.equal(compareLayoutSnapshots(before, after, { allowViewportChange: true }).status, "incomparable");
  const zoomed = structuredClone(before);
  zoomed.context.scale = 2;
  assert.equal(compareLayoutSnapshots(before, zoomed).status, "incomparable");
});

test("probe identity, target presence and visibility cannot silently disappear", () => {
  const before = snapshot([target("anchor"), target("peer", rect(240, 80))]);
  const after = snapshot([target("anchor")]);
  assert.ok(codes(compareLayoutSnapshots(before, after)).includes("target-removed"));
  assert.equal(compareLayoutSnapshots(before, after, { expectedChanges: [{ id: "peer", properties: ["presence"], reason: "Expected removal" }] }).status, "pass");
  const hidden = snapshot([target("anchor", rect(0, 0, 0, 0), { visible: false }), target("peer", rect(240, 80))]);
  assert.ok(codes(compareLayoutSnapshots(before, hidden)).includes("visibility-changed"));
  const duplicated = snapshot([target("anchor"), target("anchor")]);
  assert.equal(compareLayoutSnapshots(before, duplicated).status, "invalid");
  const allHidden = snapshot([target("anchor", rect(0, 0, 0, 0), { visible: false })]);
  assert.equal(compareLayoutSnapshots(allHidden, allHidden).status, "incomparable");
});

test("only declared independent target pairs are checked for overlap", () => {
  fc.assert(fc.property(fc.integer({ min: 2, max: 30 }), overlap => {
    const stable = snapshot([target("anchor", rect(20, 20)), target("peer", rect(100 - overlap, 20))]);
    assert.equal(compareLayoutSnapshots(stable, stable).status, "pass");
    const report = compareLayoutSnapshots(stable, stable, { nonOverlapping: [["anchor", "peer"]] });
    assert.equal(report.status, "fail");
    assert.ok(codes(report).includes("target-overlap"));
    const separated = snapshot([target("anchor", rect(20, 20)), target("peer", rect(100 + overlap, 20))]);
    assert.equal(compareLayoutSnapshots(separated, separated, { nonOverlapping: [["anchor", "peer"]] }).status, "pass");
  }), propertyOptions);
});

test("capture failure and invalid budgets never produce a passing comparison", () => {
  const unavailable = captureLayoutSnapshot(null);
  assert.equal(unavailable.status, "unsupported");
  assert.equal(compareLayoutSnapshots(unavailable, unavailable).passed, null);
  for (const budget of [-1, NaN, Infinity]) assert.equal(compareLayoutSnapshots(snapshot(), snapshot(), { positionTolerancePx: budget }).status, "invalid");
  assert.equal(captureLayoutSnapshot(null, { maxTargets: 513 }).status, "invalid");
  const truncated = snapshot(undefined, { status: "truncated" });
  assert.equal(compareLayoutSnapshots(truncated, snapshot()).status, "invalid");
});

const popupCase = (width = 500, height = 500, popupWidth = 120, popupHeight = 90) => ({
  targetId: "menu", viewport: rect(0, 0, width, height), trigger: rect(80, 50, 72, 32),
  popup: rect(80, 90, popupWidth, popupHeight), actualSide: "bottom", preferredSide: "bottom", align: "start", direction: "ltr", gapPx: 8, collisionPaddingPx: 8,
});

test("placement is invariant under viewport translation and logical RTL mirroring", () => {
  fc.assert(fc.property(
    fc.integer({ min: 360, max: 1800 }), fc.integer({ min: 320, max: 1200 }),
    fc.integer({ min: -1000, max: 1000 }), fc.integer({ min: -1000, max: 1000 }),
    (width, height, dx, dy) => {
      const input = popupCase(width, height);
      assert.equal(inspectPopupPlacement(input).status, "pass");
      const translated = { ...input };
      for (const key of ["viewport", "trigger", "popup"]) translated[key] = { ...input[key], x: input[key].x + dx, y: input[key].y + dy };
      assert.equal(inspectPopupPlacement(translated).status, "pass");
      const mirrored = { ...input, direction: "rtl", trigger: { ...input.trigger, x: width - input.trigger.x - input.trigger.width }, popup: { ...input.popup, x: width - input.popup.x - input.popup.width } };
      assert.equal(inspectPopupPlacement(mirrored).status, "pass");
    },
  ), propertyOptions);
});

test("flip is accepted when the preferred side lacks room and rejected when unnecessary", () => {
  fc.assert(fc.property(fc.integer({ min: 320, max: 1600 }), fc.integer({ min: 40, max: 140 }), (height, popupHeight) => {
    const input = popupCase(600, height, 120, popupHeight);
    input.trigger.y = height - 40;
    input.actualSide = "top";
    input.popup.y = input.trigger.y - 8 - popupHeight;
    const flipped = inspectPopupPlacement(input);
    assert.equal(flipped.status, "pass");
    assert.equal(flipped.measurements.preferredFits, false);
    assert.equal(flipped.measurements.oppositeFits, true);
    assert.ok(codes(inspectPopupPlacement({ ...input, allowFlip: false })).includes("flip-disallowed"));
    const unnecessary = popupCase(600, 800, 120, popupHeight);
    unnecessary.trigger.y = 400;
    unnecessary.popup.y = 400 - 8 - popupHeight;
    unnecessary.actualSide = "top";
    assert.ok(codes(inspectPopupPlacement(unnecessary)).includes("unnecessary-flip"));
  }), propertyOptions);
});

test("collision shifting preserves containment without inventing anchor drift", () => {
  fc.assert(fc.property(fc.integer({ min: 320, max: 1600 }), fc.integer({ min: 80, max: 200 }), (width, popupWidth) => {
    const input = popupCase(width, 500, popupWidth, 80);
    input.trigger.x = width - 100;
    input.popup.x = Math.min(input.trigger.x, width - 8 - popupWidth);
    assert.equal(inspectPopupPlacement(input).status, "pass");
    input.popup.x += 4;
    assert.equal(inspectPopupPlacement(input).status, "fail");
  }), propertyOptions);
});

test("deliberate geometry faults produce actionable anchor, overflow and overlap findings", () => {
  fc.assert(fc.property(fc.integer({ min: 2, max: 100 }), delta => {
    const input = popupCase();
    assert.ok(codes(inspectPopupPlacement({ ...input, popup: { ...input.popup, x: input.popup.x + delta } })).includes("popup-anchor-drift"));
    assert.ok(codes(inspectPopupPlacement({ ...input, popup: { ...input.popup, y: input.popup.y + delta } })).includes("popup-gap"));
    assert.ok(codes(inspectPopupPlacement({ ...input, popup: { ...input.popup, x: input.viewport.width + delta } })).includes("popup-overflow"));
    const overlap = inspectPopupPlacement({ ...input, popup: { ...input.popup, y: input.trigger.y + 10 } });
    assert.ok(codes(overlap).includes("popup-overlap"));
    assert.ok(codes(overlap).includes("side-geometry-mismatch"));
  }), propertyOptions);
  const unsupported = inspectPopupPlacement({ ...popupCase(), actualSide: null });
  assert.equal(unsupported.status, "unsupported");
  assert.equal(unsupported.passed, null);
});

test("logical inline sides resolve correctly in horizontal LTR and RTL layouts", () => {
  const base = { viewport: rect(0, 0, 800, 600), trigger: rect(300, 100, 80, 40), popup: rect(388, 100, 120, 90), actualSide: "right", preferredSide: "inline-start", direction: "rtl", gapPx: 8 };
  assert.equal(inspectPopupPlacement(base).status, "pass");
  assert.equal(inspectPopupPlacement({ ...base, direction: "ltr", preferredSide: "inline-end" }).status, "pass");
  assert.ok(codes(inspectPopupPlacement({ ...base, direction: "ltr" })).includes("unnecessary-flip"));
});

test("actual alignment may flip only to resolve a collision", () => {
  const collision = popupCase(400, 500, 200, 90);
  collision.trigger.x = 300;
  collision.popup.x = 172;
  collision.actualAlign = "end";
  assert.equal(inspectPopupPlacement(collision).status, "pass");
  const unnecessary = popupCase(500, 500, 120, 90);
  unnecessary.popup.x = 32;
  unnecessary.actualAlign = "end";
  assert.ok(codes(inspectPopupPlacement(unnecessary)).includes("unnecessary-alignment-flip"));
  assert.equal(inspectPopupPlacement({ ...unnecessary, actualAlign: null }).status, "unsupported");
});

test("CLS uses maximum session windows rather than a lifetime sum", () => {
  const report = summarizeLayoutShifts([shift(0, .1), shift(500, .2), shift(1500, .25), shift(1800, .1)]);
  near(report.cls, .35);
  near(report.unexpectedShiftValue, .65);
  assert.deepEqual(report.maxSession, { value: .35, startTime: 1500, endTime: 1800, count: 2 });
  const fiveSecond = summarizeLayoutShifts([0, 900, 1800, 2700, 3600, 4500, 5000].map(time => shift(time, .1)));
  near(fiveSecond.cls, .6);
  assert.equal(fiveSecond.maxSession.count, 6);
});

test("recent-input shifts are reported separately and never bridge unexpected sessions", () => {
  const report = summarizeLayoutShifts([shift(0, .1), shift(900, .9, true), shift(1800, .2)]);
  near(report.cls, .2);
  near(report.recentInputShiftValue, .9);
  assert.equal(report.counts.recentInput, 1);
  assert.equal(report.counts.unexpected, 2);
  assert.equal(summarizeLayoutShifts([shift(0, .9, true)]).cls, 0);
});

test("seeded shift histories preserve scores under time translation, ordering and input exclusion", () => {
  fc.assert(fc.property(
    fc.array(fc.record({ gap: fc.integer({ min: 1, max: 1200 }), units: fc.integer({ min: 0, max: 500 }), recent: fc.boolean() }), { minLength: 1, maxLength: 80 }),
    fc.integer({ min: 0, max: 1_000_000 }),
    (data, offset) => {
      let time = 0;
      const history = data.map(item => shift(time += item.gap, item.units / 1000, item.recent));
      const original = summarizeLayoutShifts(history);
      const reversed = summarizeLayoutShifts([...history].reverse());
      const translated = summarizeLayoutShifts(history.map(item => ({ ...item, startTime: item.startTime + offset })));
      const noRecent = summarizeLayoutShifts(history.filter(item => !item.hadRecentInput));
      near(original.cls, reversed.cls);
      near(original.cls, translated.cls);
      near(original.cls, noRecent.cls);
      near(original.recentInputShiftValue, history.filter(item => item.hadRecentInput).reduce((sum, item) => sum + item.value, 0));
      assert.equal(original.counts.observed, history.length);
    },
  ), propertyOptions);
});

test("bounded samples retain the maximum score even after its source samples leave the ring", () => {
  fc.assert(fc.property(fc.integer({ min: 1, max: 30 }), fc.integer({ min: 40, max: 200 }), (limit, count) => {
    const history = Array.from({ length: count }, (_, index) => shift(index * 1500, index === 0 ? .9 : .01));
    const report = summarizeLayoutShifts(history, { maxSamples: limit });
    near(report.cls, .9);
    assert.equal(report.status, "complete");
    assert.equal(report.scoreComplete, true);
    assert.equal(report.samples.length, limit);
    assert.equal(report.limits.droppedSamples, count - limit);
  }), propertyOptions);
});

test("source reports strip DOM references and arbitrary text while bounding attribution", () => {
  const sources = Array.from({ length: 10 }, (_, index) => ({ targetId: `probe-${index}`, previousRect: rect(0, 0), currentRect: rect(2, 0), node: { textContent: "not included" }, value: "not included" }));
  const report = summarizeLayoutShifts([{ ...shift(0, .1, true, sources), text: "not included" }]);
  assert.equal(report.samples[0].sources.length, 5);
  assert.equal(JSON.stringify(report).includes("not included"), false);
  assert.deepEqual(Object.keys(report.samples[0]).sort(), ["hadRecentInput", "sources", "startTime", "value"]);
});

test("unsupported, malformed or truncated observation never claims a known CLS score", () => {
  const unavailable = summarizeLayoutShifts([shift(0, .1)], { supported: false });
  assert.equal(unavailable.status, "unsupported");
  assert.equal(unavailable.cls, null);
  assert.equal(unavailable.scoreComplete, false);
  const invalid = summarizeLayoutShifts([shift(0, NaN)]);
  assert.equal(invalid.status, "incomplete");
  assert.equal(invalid.cls, null);
  const oversized = summarizeLayoutShifts(Array.from({ length: 10_001 }, (_, index) => shift(index, .0001)));
  assert.equal(oversized.status, "incomplete");
  assert.equal(oversized.cls, null);
  assert.equal(oversized.counts.observed, 10_000);
  for (const maxSamples of [0, -1, 513, Infinity]) assert.equal(summarizeLayoutShifts([], { maxSamples }).status, "invalid");
  const observer = observeLayoutShifts();
  assert.equal(observer.supported, false);
  assert.equal(observer.snapshot().status, "unsupported");
  assert.equal(observer.stop().cls, null);
  assert.deepEqual(observer.stop(), observer.stop());
});

test("observer drains records once, disconnects on stop and bounds its lifetime", async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  const instances = [];
  class WatchedTarget extends EventTarget {
    listeners = new Set();
    addEventListener(name, listener, options) { this.listeners.add(listener); super.addEventListener(name, listener, options); }
    removeEventListener(name, listener, options) { this.listeners.delete(listener); super.removeEventListener(name, listener, options); }
  }
  class FakeObserver {
    static supportedEntryTypes = ["layout-shift"];
    queued = [];
    disconnects = 0;
    constructor(callback) { this.callback = callback; instances.push(this); }
    observe(options) { assert.equal(options.type, "layout-shift"); }
    takeRecords() { return this.queued.splice(0); }
    disconnect() { this.disconnects++; }
    emit(entries) { this.callback({ getEntries: () => entries }); }
  }
  const doc = new WatchedTarget();
  doc.visibilityState = "visible";
  const view = Object.assign(new WatchedTarget(), { document: doc, performance: { now: () => 100 }, PerformanceObserver: FakeObserver });
  Object.defineProperty(globalThis, "window", { configurable: true, value: view });
  try {
    const reports = [];
    const observer = observeLayoutShifts({ maxSamples: 2, maxDurationMs: 1000, onUpdate: report => reports.push(report) });
    assert.equal(observer.supported, true);
    const native = instances.at(-1);
    native.emit([0, 300, 600].map(time => ({ entryType: "layout-shift", ...shift(time, .1) })));
    native.queued.push({ entryType: "layout-shift", ...shift(900, .2, true) });
    const stopped = observer.stop();
    near(stopped.cls, .3);
    near(stopped.recentInputShiftValue, .2);
    assert.equal(stopped.samples.length, 2);
    assert.equal(stopped.counts.observed, 4);
    assert.equal(stopped.observation.stopReason, "manual");
    assert.equal(native.disconnects, 1);
    assert.equal(doc.listeners.size, 0);
    assert.equal(view.listeners.size, 0);
    native.emit([{ entryType: "layout-shift", ...shift(1200, .9) }]);
    assert.deepEqual(observer.stop(), stopped);
    assert.equal(native.disconnects, 1);
    assert.equal(reports.at(-1).observation.stopped, true);

    const timed = observeLayoutShifts({ maxDurationMs: 1 });
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(timed.snapshot().observation.stopReason, "time-limit");
    assert.equal(instances.at(-1).disconnects, 1);
    const hidden = observeLayoutShifts();
    doc.visibilityState = "hidden";
    doc.dispatchEvent(new Event("visibilitychange"));
    assert.equal(hidden.snapshot().observation.stopReason, "document-hidden");
    assert.equal(doc.listeners.size, 0);
    assert.equal(view.listeners.size, 0);
  } finally {
    for (const instance of instances) instance.disconnect();
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
