import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

// Exercise the actual primitive against the installed UI SDK, without a DOM or
// a replacement change/store implementation.
const source = stripTypeScriptTypes(readFileSync(new URL("../packages/liquid-glass/src/motion/state.ts", import.meta.url), "utf8"))
  .replace(/from (["'])@ui-sdk\/core\1/g, `from ${JSON.stringify(import.meta.resolve("@ui-sdk/core"))}`);
const { liquidMotionState, validateLiquidMotionGraph } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

function mediaGraph() {
  return {
    id: "media",
    initial: "paused",
    states: [{ id: "paused", label: "Paused" }, { id: "playing", label: "Playing" }, { id: "ended", label: "Ended" }],
    transitions: [
      { from: "paused", event: "play", to: "playing", label: "Play media" },
      { from: "playing", event: "pause", to: "paused", label: "Pause media" },
      { from: "playing", event: "finish", to: "ended", label: "Finish media" },
      { from: "ended", event: "reset", to: "paused", label: "Reset media" },
    ],
  };
}

function host(t, extra = {}) {
  const requests = [];
  let instance;
  let options = {
    graph: mediaGraph(),
    ...extra,
    onValueChange(value, details) {
      requests.push({ value, details, before: instance.get().value });
      return extra.onValueChange?.(value, details);
    },
  };
  instance = liquidMotionState(options);
  t.after(() => instance.destroy());
  return {
    instance,
    api: instance.api,
    requests,
    state: () => instance.get(),
    update(patch) {
      options = { ...options, ...patch };
      instance.setOptions(options);
    },
  };
}

test("valid graph transitions update accepted state and discover only its available events", t => {
  const view = host(t);
  assert.deepEqual(validateLiquidMotionGraph(mediaGraph()), []);
  assert.equal(view.instance.name, "liquid-motion-state");
  assert.equal(view.state().value, "paused");
  assert.deepEqual(view.api.getEvents(), [{ value: "play", label: "Play media" }]);
  assert.equal(view.api.send("play", "paused"), true);
  assert.equal(view.state().value, "playing");
  assert.deepEqual(view.api.getEvents(), [{ value: "pause", label: "Pause media" }, { value: "finish", label: "Finish media" }]);
  assert.equal(view.api.send("finish", "playing"), true);
  assert.equal(view.state().value, "ended");
  assert.deepEqual(view.api.getEvents(), [{ value: "reset", label: "Reset media" }]);
  assert.equal(view.api.send("reset", "ended"), true);
  assert.equal(view.state().value, "paused");
  assert.deepEqual(view.requests.map(({ value, before }) => [before, value]), [["paused", "playing"], ["playing", "ended"], ["ended", "paused"]]);
});

test("send requires the exact current expectedState and a valid event from that state", t => {
  const view = host(t);
  for (const expected of [undefined, null, 0, false, {}, ["paused"], "", "Paused", " paused", "paused ", "playing"]) {
    assert.equal(view.api.send("play", expected), false, `reject expectedState ${String(expected)}`);
  }
  for (const event of [undefined, null, 0, false, {}, ["play"], "", " ", "Play", " play", "unknown", "pause", "x".repeat(121)]) {
    assert.equal(view.api.send(event, "paused"), false, `reject event ${String(event)}`);
  }
  assert.equal(view.state().value, "paused");
  assert.equal(view.requests.length, 0);
  assert.equal(view.api.send("play", "paused"), true);
  assert.equal(view.api.send("pause", "paused"), false, "a previously valid snapshot is stale after acceptance");
  assert.equal(view.state().value, "playing");
  assert.equal(view.requests.length, 1);
});

test("the SDK reports change provenance before an uncontrolled write", t => {
  const view = host(t);
  assert.equal(view.api.send("play", "paused", { source: "agent", reason: "forged" }), true);
  const { value, before, details } = view.requests[0];
  assert.equal(value, "playing");
  assert.equal(before, "paused");
  assert.equal(details.reason, "motion-event");
  assert.equal(details.source, "programmatic", "an arbitrary action argument cannot claim SDK agent provenance");
  assert.equal(details.canceled, false);
  assert.equal(typeof details.cancel, "function");
});

test("synchronous host cancellation refuses controlled and uncontrolled requests", t => {
  for (const controlled of [false, true]) {
    const view = host(t, {
      ...(controlled ? { value: "paused" } : {}),
      onValueChange(_value, details) { details.cancel(); },
    });
    assert.equal(view.api.send("play", "paused"), false);
    assert.equal(view.requests.length, 1);
    assert.equal(view.requests[0].details.canceled, true);
    assert.equal(view.state().value, "paused");
    assert.deepEqual(view.api.getEvents(), [{ value: "play", label: "Play media" }]);
  }
});

test("controlled requests do not publish a speculative value or accept its next event", t => {
  const view = host(t, { value: "paused" });
  assert.equal(view.api.send("play", "paused"), true, "true acknowledges a request, not host acceptance");
  assert.equal(view.requests[0].value, "playing");
  assert.equal(view.state().value, "paused");
  assert.deepEqual(view.api.getEvents(), [{ value: "play", label: "Play media" }]);
  view.update({ value: "paused" });
  assert.equal(view.state().value, "paused", "retaining props refuses to publish the requested endpoint");
  assert.equal(view.api.send("pause", "playing"), false);
  assert.equal(view.requests.length, 1);

  view.update({ value: view.requests[0].value });
  assert.equal(view.state().value, "playing");
  assert.equal(view.api.send("pause", "paused"), false);
  assert.equal(view.api.send("pause", "playing"), true);
  assert.equal(view.state().value, "playing", "the second request also waits for accepted props");
  view.update({ value: "paused" });
  assert.equal(view.state().value, "paused");
  assert.deepEqual(view.requests.map(request => request.value), ["playing", "paused"]);
});

test("synchronous controlled acceptance and external host state remain authoritative", t => {
  const view = host(t, { value: "paused", onValueChange(value) { view.update({ value }); } });
  assert.equal(view.api.send("play", "paused"), true);
  assert.equal(view.state().value, "playing");
  view.update({ value: "ended" });
  assert.equal(view.state().value, "ended");
  assert.equal(view.requests.length, 1, "host publication does not synthesize a user request");
  assert.deepEqual(view.api.getEvents(), [{ value: "reset", label: "Reset media" }]);
  assert.equal(view.api.send("reset", "ended"), true);
  assert.equal(view.state().value, "paused");
});

test("disabled and readOnly guard the actual API at creation and after option changes", t => {
  for (const flag of ["disabled", "readOnly"]) {
    const view = host(t, { [flag]: true });
    assert.equal(view.api.send("play", "paused"), false);
    assert.equal(view.requests.length, 0);
    assert.equal(view.state().value, "paused");
    view.update({ [flag]: false });
    assert.equal(view.api.send("play", "paused"), true);
    view.update({ [flag]: true });
    assert.equal(view.api.send("pause", "playing"), false);
    assert.equal(view.state().value, "playing");
    assert.equal(view.requests.length, 1);
  }
});

test("defaults initialize once, controlled values take precedence and unknown values fall back", t => {
  const uncontrolled = host(t, { defaultValue: "playing" });
  assert.equal(uncontrolled.state().value, "playing");
  uncontrolled.update({ defaultValue: "ended" });
  assert.equal(uncontrolled.state().value, "playing");
  const controlled = host(t, { defaultValue: "playing", value: "ended" });
  assert.equal(controlled.state().value, "ended");
  controlled.update({ value: "missing" });
  assert.equal(controlled.state().value, "paused");
  assert.equal(host(t, { defaultValue: "missing" }).state().value, "paused");
});

test("a self-transition is a no-op rather than a fabricated accepted change", t => {
  const graph = mediaGraph();
  graph.transitions.push({ from: "paused", event: "stay", to: "paused", label: "Stay paused" });
  const view = host(t, { graph });
  assert.equal(view.api.send("stay", "paused"), false);
  assert.equal(view.state().value, "paused");
  assert.equal(view.requests.length, 0);
});

test("replacing a graph preserves a valid value or publishes its new initial state atomically", t => {
  const view = host(t, { defaultValue: "playing" });
  const observed = [];
  const unsubscribe = view.instance.subscribe(() => observed.push(structuredClone(view.state())));
  t.after(unsubscribe);
  const relabeled = mediaGraph();
  relabeled.id = "relabeled-media";
  relabeled.transitions[1].label = "Pause playback";
  view.update({ graph: relabeled });
  assert.equal(view.state().value, "playing");
  assert.equal(view.api.getEvents()[0].label, "Pause playback");
  const replacement = { id: "complete", initial: "complete", states: [{ id: "complete", label: "Complete" }], transitions: [] };
  view.update({ graph: replacement });
  assert.equal(view.state().graph.id, "complete");
  assert.equal(view.state().value, "complete");
  assert.deepEqual(view.api.getEvents(), []);
  assert.equal(view.api.send("pause", "playing"), false);
  assert.equal(view.requests.length, 0);
  assert.ok(observed.length > 0);
  for (const snapshot of observed) {
    assert.ok(snapshot.graph.states.some(state => state.id === snapshot.value), `subscriber saw ${snapshot.value} outside graph ${snapshot.graph.id}`);
  }
});

test("graph validation rejects ambiguous transitions, missing states and invalid structure", () => {
  const base = mediaGraph();
  const invalid = [
    null, undefined, {}, { ...base, id: " " }, { ...base, id: "x".repeat(121) },
    { ...base, states: [] }, { ...base, states: null }, { ...base, transitions: null },
    { ...base, initial: "missing" },
    { ...base, states: [...base.states, { id: "paused", label: "Duplicate" }] },
    { ...base, states: [null, ...base.states] },
    { ...base, states: [{ id: "paused", label: "" }, ...base.states.slice(1)] },
    { ...base, transitions: [null] },
    { ...base, transitions: [{ from: "missing", event: "play", to: "playing", label: "Play" }] },
    { ...base, transitions: [{ from: "paused", event: "play", to: "missing", label: "Play" }] },
    { ...base, transitions: [{ from: "paused", event: " ", to: "playing", label: "Play" }] },
    { ...base, transitions: [{ from: "paused", event: "play", to: "playing", label: "" }] },
    { ...base, transitions: [...base.transitions, { from: "paused", event: "play", to: "ended", label: "Conflicting play" }] },
    { id: "large", initial: "s0", states: Array.from({ length: 65 }, (_, i) => ({ id: `s${i}`, label: `State ${i}` })), transitions: [] },
    { ...base, transitions: Array.from({ length: 257 }, (_, i) => ({ from: "paused", event: `event${i}`, to: "playing", label: `Event ${i}` })) },
  ];
  for (const graph of invalid) {
    assert.ok(validateLiquidMotionGraph(graph).length > 0);
    assert.throws(() => liquidMotionState({ graph }), Error);
  }
  const reusedEvent = { ...base, transitions: [
    { from: "paused", event: "toggle", to: "playing", label: "Play" },
    { from: "playing", event: "toggle", to: "paused", label: "Pause" },
  ] };
  assert.deepEqual(validateLiquidMotionGraph(reusedEvent), [], "an event may have different targets from different source states");
});
