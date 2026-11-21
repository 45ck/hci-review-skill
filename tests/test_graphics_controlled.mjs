import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

const source = readFileSync(new URL("../packages/liquid-glass/src/graphics/controlled-change.ts", import.meta.url), "utf8");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`;
const { createGraphicChangeController } = await import(moduleUrl);
const initial = () => ({ schemaVersion: 1, id: "poster", name: "Poster", revision: 0, width: 1200, height: 800,
  background: "#ffffff", layers: [{ id: "shape", name: "Shape", kind: "shape", shape: "rectangle", x: 0, y: 0,
    width: 100, height: 100, rotation: 0, opacity: 1, visible: true, locked: false, fill: "#000000", radius: 0 }] });
const input = { reason: "properties", source: "agent" };
const edit = (document, name = "Edited") => ({ ...document, layers: document.layers.map(layer => ({ ...layer, name })) });
const accept = (controller, next, details = input) => {
  let proposal;
  controller.request(next, details, value => { proposal = value; });
  controller.observe(proposal);
  return proposal;
};

test("an ignored controlled request cannot change document, history or selection", () => {
  const before = initial(), events = [];
  const controller = createGraphicChangeController(before, event => events.push(event));
  controller.request(edit(before), { ...input, selectedId: "new-layer" }, () => {});
  assert.equal(controller.state().document, before);
  assert.deepEqual(controller.state().undo, []);
  assert.deepEqual(controller.state().redo, []);
  assert.equal(controller.state().pending.proposal.revision, 1);
  assert.equal(events.at(-1).status, "requested");
  assert.ok(events.every(event => !event.selectedId));
  controller.observe(structuredClone(before));
  assert.ok(controller.state().pending, "equivalent unchanged host props do not accept a proposal");
});

test("SDK source and event reach the host and synchronous cancel keeps history unchanged", () => {
  const before = initial(), events = [];
  const controller = createGraphicChangeController(before, event => events.push(event));
  const event = new Event("click");
  let details;
  controller.request(edit(before), { ...input, event }, (_value, change) => { details = change; change.cancel(); });
  assert.equal(details.source, "agent");
  assert.equal(details.event, event);
  assert.equal(details.canceled, true);
  assert.equal(details.signal.aborted, true);
  assert.equal(controller.state().document, before);
  assert.equal(controller.state().pending, null);
  assert.deepEqual(controller.state().undo, []);
  assert.equal(events.at(-1).status, "cancelled");
  assert.ok(events.every(event => event.status !== "applied"));
});

test("a throwing host cannot commit or report success", () => {
  const before = initial(), events = [];
  const controller = createGraphicChangeController(before, event => events.push(event));
  const result = controller.request(edit(before), input, () => { throw new Error("Denied"); });
  assert.equal(result.status, "rejected");
  assert.equal(controller.state().document, before);
  assert.equal(controller.state().pending, null);
  assert.deepEqual(controller.state().undo, []);
  assert.match(events.at(-1).message, /Denied/);
  assert.ok(events.every(event => event.status !== "applied"));
});

test("a pending request blocks another host callback", () => {
  const controller = createGraphicChangeController(initial());
  let calls = 0;
  controller.request(edit(initial()), input, () => { calls++; });
  const first = controller.state().pending;
  const result = controller.request(edit(initial(), "Other"), input, () => { calls++; });
  assert.equal(calls, 1);
  assert.equal(result.status, "rejected");
  assert.equal(controller.state().pending, first);
  assert.equal(controller.state().document.revision, 0);
});

test("observed accepted props create exactly one history entry and defer selection until then", () => {
  const before = initial(), events = [];
  const controller = createGraphicChangeController(before, event => events.push(event));
  let proposal;
  controller.request(edit(before), { ...input, selectedId: "shape" }, value => { proposal = value; });
  assert.equal(events.at(-1).selectedId, undefined);
  controller.observe(structuredClone(proposal));
  assert.equal(controller.state().document.revision, 1);
  assert.deepEqual(controller.state().undo, [before]);
  assert.equal(controller.state().pending, null);
  assert.equal(events.at(-1).status, "applied");
  assert.equal(events.at(-1).selectedId, "shape");
  controller.observe(proposal);
  assert.equal(controller.state().undo.length, 1);
  assert.equal(events.filter(event => event.status === "applied").length, 1);
});

test("equivalent host data with reordered object keys counts as acceptance", () => {
  const controller = createGraphicChangeController(initial());
  let proposal;
  controller.request(edit(initial()), input, value => { proposal = value; });
  controller.observe(Object.fromEntries(Object.entries(proposal).reverse()));
  assert.equal(controller.state().pending, null);
  assert.equal(controller.state().undo.length, 1);
});

test("conflicting host props clear stale whole-document history without a speculative checkpoint", () => {
  const controller = createGraphicChangeController(initial());
  const accepted = accept(controller, edit(initial()));
  controller.request(edit(accepted, "Proposed"), input, () => {});
  const external = { ...edit(accepted, "External"), revision: 8 };
  const result = controller.observe(external);
  assert.equal(result.status, "rejected");
  assert.equal(controller.state().document, external);
  assert.deepEqual(controller.state().undo, []);
  assert.deepEqual(controller.state().redo, []);
  assert.equal(controller.state().pending, null);
});

test("undo and redo move history only after the host accepts their proposals", () => {
  const before = initial();
  const controller = createGraphicChangeController(before);
  const edited = accept(controller, edit(before));
  let proposal;
  controller.request(controller.state().undo.at(-1), { reason: "undo", source: "keyboard" }, value => { proposal = value; });
  assert.equal(controller.state().undo.length, 1);
  assert.equal(controller.state().redo.length, 0);
  assert.equal(controller.state().document, edited);
  controller.observe(proposal);
  assert.equal(controller.state().document.revision, 2);
  assert.equal(controller.state().undo.length, 0);
  assert.equal(controller.state().redo.length, 1);
  controller.request(controller.state().redo.at(-1), { reason: "redo", source: "agent" }, value => { proposal = value; });
  assert.equal(controller.state().undo.length, 0);
  assert.equal(controller.state().redo.length, 1);
  controller.observe(proposal);
  assert.equal(controller.state().document.revision, 3);
  assert.equal(controller.state().undo.length, 1);
  assert.equal(controller.state().redo.length, 0);
});

test("cancelled undo preserves both history stacks", () => {
  const controller = createGraphicChangeController(initial());
  accept(controller, edit(initial()));
  const before = controller.state();
  controller.request(before.undo.at(-1), { reason: "undo", source: "agent" }, (_value, details) => details.cancel());
  assert.equal(controller.state().document, before.document);
  assert.deepEqual(controller.state().undo, before.undo);
  assert.deepEqual(controller.state().redo, before.redo);
});

test("explicit cancellation releases an ignored host and aborts its signal", () => {
  const controller = createGraphicChangeController(initial());
  let details;
  controller.request(edit(initial()), input, (_value, change) => { details = change; });
  controller.cancel();
  assert.equal(details.signal.aborted, true);
  assert.equal(controller.state().pending, null);
  assert.equal(controller.state().undo.length, 0);
  const accepted = accept(controller, edit(initial(), "Retry"));
  assert.equal(controller.state().document, accepted);
});

test("async rejection clears pending without success or history", async () => {
  const events = [];
  const controller = createGraphicChangeController(initial(), event => events.push(event));
  controller.request(edit(initial()), input, () => Promise.reject(new Error("Remote refusal")));
  await Promise.resolve();
  assert.equal(controller.state().pending, null);
  assert.equal(controller.state().undo.length, 0);
  assert.equal(events.at(-1).status, "rejected");
});

test("observed props are applied immediately even while the callback Promise is pending", async () => {
  const controller = createGraphicChangeController(initial());
  let proposal, complete;
  controller.request(edit(initial()), input, value => { proposal = value; return new Promise(resolve => { complete = resolve; }); });
  controller.observe(proposal);
  assert.equal(controller.state().undo.length, 1);
  assert.equal(controller.state().pending, null);
  assert.equal(controller.cancel(), null);
  complete();
  await Promise.resolve();
  assert.equal(controller.state().undo.length, 1);
  assert.equal(controller.state().pending, null);
});

test("late host rejection reports an already-applied error without pretending rollback", async () => {
  const events = [];
  const controller = createGraphicChangeController(initial(), event => events.push(event));
  let proposal, reject;
  controller.request(edit(initial()), input, value => { proposal = value; return new Promise((_resolve, fail) => { reject = fail; }); });
  controller.observe(proposal);
  reject(new Error("Persistence failed"));
  await Promise.resolve();
  assert.equal(controller.state().document, proposal);
  assert.equal(controller.state().undo.length, 1);
  assert.equal(events.at(-1).status, "applied-error");
  assert.match(events.at(-1).message, /already applied/);
  assert.match(events.at(-1).message, /not rolled back/);
});

test("external host changes cannot be overwritten by stale undo checkpoints", () => {
  const controller = createGraphicChangeController(initial());
  const accepted = accept(controller, edit(initial()));
  const external = { ...accepted, name: "Host external title", revision: 8 };
  controller.observe(external);
  assert.deepEqual(controller.state().undo, []);
  assert.deepEqual(controller.state().redo, []);
  let called = false;
  const result = controller.request(initial(), { reason: "undo", source: "agent" }, () => { called = true; });
  assert.equal(result.status, "rejected");
  assert.equal(called, false);
  assert.equal(controller.state().document.name, "Host external title");
  assert.equal(controller.state().document.revision, 8);
});

test("equivalent external clones preserve accepted undo history", () => {
  const controller = createGraphicChangeController(initial());
  const accepted = accept(controller, edit(initial()));
  controller.observe(Object.fromEntries(Object.entries(structuredClone(accepted)).reverse()));
  assert.equal(controller.state().undo.length, 1);
});

test("late completion after cancellation cannot settle another request", async () => {
  const controller = createGraphicChangeController(initial());
  let finish;
  controller.request(edit(initial()), input, () => new Promise(resolve => { finish = resolve; }));
  controller.cancel();
  controller.request(edit(initial(), "New proposal"), input, () => {});
  const pending = controller.state().pending;
  finish();
  await Promise.resolve();
  assert.equal(controller.state().pending, pending);
  assert.equal(controller.state().undo.length, 0);
});

test("host mutation of a proposal cannot be mistaken for its accepted original", () => {
  const controller = createGraphicChangeController(initial());
  let proposal;
  controller.request(edit(initial()), input, value => { proposal = value; value.layers[0].name = "Different"; });
  assert.equal(controller.observe(proposal).status, "rejected");
  assert.equal(controller.state().undo.length, 0);
});

test("history is bounded and revision exhaustion cannot submit", () => {
  const controller = createGraphicChangeController(initial());
  for (let index = 0; index < 45; index++) accept(controller, edit(controller.state().document, `Name ${index}`));
  assert.equal(controller.state().undo.length, 40);
  controller.observe({ ...initial(), revision: Number.MAX_SAFE_INTEGER });
  let called = false;
  const result = controller.request(initial(), input, () => { called = true; });
  assert.equal(result.status, "rejected");
  assert.equal(called, false);
});
