import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceRoot = join(root, "packages/liquid-glass/src");
const output = mkdtempSync(join(tmpdir(), "quantive-model-host-"));
const compiled = new Map();

function compile(sourceFile) {
  const filename = resolve(sourceFile);
  if (compiled.has(filename)) return compiled.get(filename);
  const target = join(output, relative(sourceRoot, filename).replace(/\.ts$/, ".mjs"));
  compiled.set(filename, pathToFileURL(target).href);
  const source = stripTypeScriptTypes(readFileSync(filename, "utf8"))
    .replace(/(from\s+)(["'])([^"']+)\2/g, (_match, from, quote, specifier) => {
      const location = specifier.startsWith(".")
        ? compile(resolve(dirname(filename), `${specifier}.ts`))
        : import.meta.resolve(specifier);
      return `${from}${quote}${location}${quote}`;
    });
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, source);
  return pathToFileURL(target).href;
}

after(() => rmSync(output, { recursive: true, force: true }));
const { createModelDocument, modelDocumentSnapshot } = await import(compile(join(sourceRoot, "modeling/document.ts")));
const { liquidModelDocument } = await import(compile(join(sourceRoot, "modeling/primitive.ts")));

function initialDocument() {
  return createModelDocument({
    id: "host-contract", name: "Host contract", notation: "UML class", description: "Controlled document verification.",
    width: 900, height: 600,
    nodes: [
      { id: "first", name: "First", kind: "class", description: "", x: 30, y: 30, width: 180, height: 100 },
      { id: "second", name: "Second", kind: "class", description: "", x: 300, y: 30, width: 180, height: 100 },
    ], edges: [],
  }, "first");
}

function host(t, extra = {}) {
  const requests = [];
  const outcomes = [];
  let options = {
    document: initialDocument(),
    onValueChange(value, details) {
      requests.push(details);
      return extra.onValueChange?.(value, details);
    },
    onResult(result) { outcomes.push(result); },
    ...Object.fromEntries(Object.entries(extra).filter(([key]) => key !== "onValueChange")),
  };
  options.value = modelDocumentSnapshot(options.document);
  const instance = liquidModelDocument(options);
  t.after(() => instance.destroy());
  return {
    instance, api: instance.api, requests, outcomes,
    update(patch) {
      options = { ...options, ...patch };
      options.value = modelDocumentSnapshot(options.document);
      instance.setOptions(options);
    },
    accept(document = requests.at(-1).proposedDocument) {
      this.update({ document });
    },
  };
}

const rename = (revision = 0, name = "Reviewed first") => ({ expectedRevision: revision,
  operations: [{ type: "rename-node", nodeId: "first", name }] });

function deferred() {
  let resolve, reject;
  const promise = new Promise((resolveValue, rejectValue) => { resolve = resolveValue; reject = rejectValue; });
  return { promise, resolve, reject };
}

const flush = () => new Promise(resolve => setImmediate(resolve));

function reorder(value) {
  if (Array.isArray(value)) return value.map(reorder);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reorder(item)]));
  return value;
}

function unchanged(view, expected = initialDocument()) {
  assert.deepEqual(view.api.getDocument(), expected);
  const state = view.api.inspect();
  assert.equal(state.revision, expected.revision);
  assert.equal(state.undoDepth, expected.past.length);
  assert.equal(state.redoDepth, expected.future.length);
  assert.equal(state.selectedId, expected.selectedId);
}

test("a serialized accepted document settles with its content and history", (t) => {
  const view = host(t);
  const result = view.api.applyTransaction(rename());
  assert.equal(result.status, "requested");
  const proposal = view.requests[0].proposedDocument;
  view.accept(JSON.parse(JSON.stringify(proposal)));
  const accepted = view.api.inspect();
  assert.equal(accepted.lastResult.status, "applied");
  assert.equal(accepted.revision, 1);
  assert.equal(accepted.model.nodes[0].name, "Reviewed first");
  assert.equal(accepted.undoDepth, 1);
  assert.equal(accepted.pendingRevision, undefined);
  assert.equal(view.outcomes.at(-1).status, "applied");
});

test("equivalent old props keep a proposal pending and key order does not alter acceptance", (t) => {
  const view = host(t);
  view.api.applyTransaction(rename());
  const details = view.requests[0];
  view.accept(reorder(initialDocument()));
  unchanged(view);
  assert.equal(view.api.inspect().pendingRevision, 1);
  assert.equal(details.signal.aborted, false);
  view.accept(reorder(details.proposedDocument));
  assert.equal(view.api.inspect().lastResult.status, "applied");
  assert.equal(view.api.inspect().pendingRevision, undefined);
});

test("an ignored request blocks overlapping mutations until cancellation", (t) => {
  const view = host(t);
  const proposal = view.api.applyTransaction(rename());
  assert.equal(proposal.status, "requested");
  assert.equal(proposal.changed, false);
  assert.equal(proposal.revision, 0);
  assert.equal(proposal.requestedRevision, 1);
  assert.equal(view.api.select("second").ok, false);
  assert.equal(view.api.applyTransaction(rename(0, "Overlapping")).ok, false);
  assert.equal(view.requests.length, 1);
  unchanged(view);
  const cancelled = view.api.cancelPending();
  assert.equal(cancelled.changed, false);
  assert.equal(view.requests[0].signal.aborted, true);
  assert.equal(view.api.inspect().pendingRevision, undefined);
  unchanged(view);
  assert.equal(view.api.applyTransaction(rename(0, "Recovered")).status, "requested");
  assert.equal(view.requests.length, 2);
  view.accept();
  assert.equal(view.api.inspect().model.nodes[0].name, "Recovered");
});

test("synchronous host cancellation preserves document, selection and history", (t) => {
  const view = host(t, { onValueChange(_value, details) { details.cancel(); } });
  const outcome = view.api.applyTransaction({ ...rename(), selectedId: "second" });
  assert.equal(outcome.ok, false);
  assert.equal(outcome.changed, false);
  assert.equal(view.requests[0].canceled, true);
  assert.equal(view.requests[0].signal.aborted, true);
  assert.equal(view.api.inspect().pendingRevision, undefined);
  unchanged(view);
});

test("a host can cancel asynchronously through the original change details", async (t) => {
  const view = host(t);
  view.api.applyTransaction(rename());
  const details = view.requests[0];
  await flush();
  details.cancel();
  assert.equal(details.canceled, true);
  assert.equal(details.signal.aborted, true);
  assert.equal(view.api.inspect().pendingRevision, undefined);
  unchanged(view);
  assert.equal(view.api.applyTransaction(rename(0, "Retry after host cancellation")).status, "requested");
  view.accept();
  assert.equal(view.api.inspect().lastResult.status, "applied");
});

test("SDK event and source survive while action arguments cannot impersonate an agent", (t) => {
  const view = host(t);
  const event = new Event("change");
  view.api.applyTransaction(rename(), { event, source: "agent", reason: "forged" });
  const details = view.requests[0];
  assert.equal(details.event, event);
  assert.equal(details.source, "programmatic");
  assert.equal(details.reason, "model-transaction");
  assert(details.signal instanceof AbortSignal);
  view.accept();
  assert.equal(view.api.inspect().lastResult.status, "applied");
});

test("a throwing host callback rejects without leaving a pending request", (t) => {
  const view = host(t, { onValueChange() { throw new Error("Host refused"); } });
  const result = view.api.applyTransaction(rename());
  assert.equal(result.ok, false);
  assert.equal(result.status, "rejected");
  assert(result.issues.length > 0);
  assert.equal(view.api.inspect().pendingRevision, undefined);
  assert.equal(view.requests[0].signal.aborted, true);
  unchanged(view);
});

test("resolving a host Promise without publishing props does not apply its proposal", async (t) => {
  const completion = deferred();
  const view = host(t, { onValueChange() { return completion.promise; } });
  view.api.applyTransaction(rename());
  completion.resolve();
  await flush();
  unchanged(view);
  assert.equal(view.api.inspect().pendingRevision, 1);
  assert(!view.outcomes.some(result => result.status === "applied"));
  view.accept(structuredClone(view.requests[0].proposedDocument));
  assert.equal(view.api.inspect().lastResult.status, "applied");
});

test("asynchronous rejection releases pending state with no speculative document or history", async (t) => {
  const completion = deferred();
  const view = host(t, { onValueChange() { return completion.promise; } });
  view.api.applyTransaction(rename());
  completion.reject(new Error("Persistence refused"));
  await flush();
  const state = view.api.inspect();
  assert.equal(state.lastResult.ok, false);
  assert.equal(state.lastResult.status, "rejected");
  assert.equal(state.pendingRevision, undefined);
  assert.equal(view.requests[0].signal.aborted, true);
  assert(!view.outcomes.some(result => result.status === "applied"));
  unchanged(view);
});

test("accepted props apply immediately and a later host failure cannot roll them back", async (t) => {
  const completion = deferred();
  const view = host(t, { onValueChange() { return completion.promise; } });
  view.api.applyTransaction(rename());
  const accepted = structuredClone(view.requests[0].proposedDocument);
  view.accept(accepted);
  assert.equal(view.api.inspect().lastResult.status, "applied");
  assert.equal(view.api.inspect().pendingRevision, undefined);
  completion.reject(new Error("Persistence failed after publication"));
  await flush();
  unchanged(view, accepted);
  const result = view.api.inspect().lastResult;
  assert.equal(result.status, "applied-error");
  assert.equal(result.ok, false);
  assert.equal(result.changed, true);
  assert.equal(result.revision, 1);
  assert(result.issues.some(issue => issue.code === "host-callback-failed-after-application"));
  assert.equal(view.outcomes.at(-1), result);
});

test("a synchronous host publication stays authoritative if its callback then throws", (t) => {
  const view = host(t, { onValueChange(_value, details) {
    view.accept(structuredClone(details.proposedDocument));
    throw new Error("Host failed after synchronous publication");
  } });
  const result = view.api.applyTransaction(rename());
  assert.equal(result.status, "applied-error");
  assert.equal(result.changed, true);
  assert.equal(result.ok, false);
  assert.equal(view.api.inspect().revision, 1);
  assert.equal(view.api.inspect().model.nodes[0].name, "Reviewed first");
  assert.equal(view.api.inspect().undoDepth, 1);
  assert.equal(view.api.inspect().pendingRevision, undefined);
});

test("late cancellation has no authority over an already applied document", (t) => {
  const view = host(t);
  view.api.applyTransaction(rename());
  const details = view.requests[0];
  view.accept();
  const applied = view.api.getDocument();
  details.cancel();
  unchanged(view, applied);
  assert.equal(view.api.inspect().pendingRevision, undefined);
  assert.equal(view.api.inspect().lastResult.status, "applied");
});

test("late rejection from a cancelled request cannot settle a newer request", async (t) => {
  const first = deferred();
  let count = 0;
  const view = host(t, { onValueChange() { return count++ === 0 ? first.promise : undefined; } });
  view.api.applyTransaction(rename());
  const abandoned = view.requests[0];
  view.api.cancelPending();
  view.api.applyTransaction(rename(0, "Second proposal"));
  const current = view.requests[1];
  first.reject(new Error("Stale request failed"));
  await flush();
  assert.equal(abandoned.signal.aborted, true);
  assert.equal(current.signal.aborted, false);
  assert.equal(view.api.inspect().pendingRevision, 1);
  assert.equal(view.api.inspect().lastResult.status, "requested");
  view.accept(current.proposedDocument);
  assert.equal(view.api.inspect().model.nodes[0].name, "Second proposal");
  assert.equal(view.api.inspect().lastResult.status, "applied");
});

test("late failure of an earlier applied request cannot overwrite a newer outcome", async (t) => {
  const first = deferred();
  let count = 0;
  const view = host(t, { onValueChange() { return count++ === 0 ? first.promise : undefined; } });
  view.api.applyTransaction(rename());
  view.accept();
  view.api.applyTransaction(rename(1, "Newer accepted name"));
  view.accept();
  const outcomes = view.outcomes.length;
  first.reject(new Error("Older persistence failure"));
  await flush();
  assert.equal(view.api.inspect().revision, 2);
  assert.equal(view.api.inspect().model.nodes[0].name, "Newer accepted name");
  assert.equal(view.api.inspect().lastResult.status, "applied");
  assert.equal(view.outcomes.length, outcomes);
});

test("disposal aborts unpublished host work and ignores its late completion", async (t) => {
  const completion = deferred();
  const view = host(t, { onValueChange() { return completion.promise; } });
  view.api.applyTransaction(rename());
  const details = view.requests[0];
  view.instance.destroy();
  assert.equal(details.signal.aborted, true);
  const outcomes = view.outcomes.length;
  completion.reject(new Error("Finished after unmount"));
  await flush();
  assert.equal(view.outcomes.length, outcomes);
});

test("conflicting host content at the same revision rejects the pending proposal", (t) => {
  const view = host(t);
  view.api.applyTransaction(rename());
  const external = structuredClone(initialDocument());
  external.model.nodes[1].description = "An external update";
  view.accept(external);
  assert.equal(view.api.inspect().lastResult.status, "rejected");
  assert.equal(view.api.inspect().lastResult.ok, false);
  assert.equal(view.api.inspect().pendingRevision, undefined);
  assert.equal(view.requests[0].signal.aborted, true);
  unchanged(view, external);
});

test("matching revision and content without the proposed history is not full acceptance", (t) => {
  const view = host(t);
  view.api.applyTransaction(rename());
  const different = structuredClone(view.requests[0].proposedDocument);
  different.past = [];
  view.accept(different);
  assert.equal(view.api.inspect().lastResult.status, "rejected");
  assert.equal(view.api.inspect().pendingRevision, undefined);
  unchanged(view, different);
});

test("selection settlement compares selected IDs even when revision and history stay unchanged", (t) => {
  const view = host(t);
  const result = view.api.select("second");
  assert.equal(result.status, "requested");
  assert.equal(result.revision, 0);
  view.accept(JSON.parse(JSON.stringify(view.requests[0].proposedDocument)));
  const selected = view.api.inspect();
  assert.equal(selected.lastResult.status, "applied");
  assert.equal(selected.selectedId, "second");
  assert.equal(selected.revision, 0);
  assert.equal(selected.undoDepth, 0);
});

test("invalid and stale transactions never invoke a controlled host", (t) => {
  const view = host(t);
  for (const request of [null, rename(9), { expectedRevision: 0, operations: [{ type: "update-node", nodeId: "first", patch: { width: -1 } }] }]) {
    assert.equal(view.api.applyTransaction(request).ok, false);
    unchanged(view);
  }
  assert.equal(view.requests.length, 0);
  assert.equal(view.api.inspect().pendingRevision, undefined);
});

test("read-only and disabled guards remain effective on the actual primitive API", (t) => {
  const view = host(t, { readOnly: true });
  assert.equal(view.api.applyTransaction(rename()).ok, false);
  assert.equal(view.api.undo(0).ok, false);
  assert.equal(view.requests.length, 0);
  assert.equal(view.api.select("second").status, "requested");
  view.accept();
  assert.equal(view.api.inspect().selectedId, "second");
  view.update({ disabled: true });
  assert.equal(view.api.select("first").ok, false);
  assert.equal(view.api.applyTransaction(rename()).ok, false);
  assert.equal(view.requests.length, 1);
  assert.equal(view.api.inspect().selectedId, "second");
  assert.equal(view.api.inspect().revision, 0);
});

test("undo and redo keep monotonic revision and shared history through accepted clones", (t) => {
  const view = host(t);
  view.api.applyTransaction(rename());
  view.accept(structuredClone(view.requests.at(-1).proposedDocument));
  assert.equal(view.api.undo(1).status, "requested");
  view.accept(structuredClone(view.requests.at(-1).proposedDocument));
  assert.equal(view.api.inspect().revision, 2);
  assert.equal(view.api.inspect().model.nodes[0].name, "First");
  assert.equal(view.api.inspect().redoDepth, 1);
  assert.equal(view.api.redo(2).status, "requested");
  view.accept(structuredClone(view.requests.at(-1).proposedDocument));
  assert.equal(view.api.inspect().revision, 3);
  assert.equal(view.api.inspect().model.nodes[0].name, "Reviewed first");
  assert.equal(view.api.inspect().redoDepth, 0);
  assert.equal(view.api.inspect().undoDepth, 1);
});

test("cancelling without a pending request is an observable no-op", (t) => {
  const view = host(t);
  const result = view.api.cancelPending();
  assert.equal(result.status, "unchanged");
  assert.equal(result.changed, false);
  assert.equal(result.revision, 0);
  assert.equal(view.requests.length, 0);
  unchanged(view);
});
