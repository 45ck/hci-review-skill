import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { webcrypto } from "node:crypto";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createContext, runInContext } from "node:vm";
import test from "node:test";
import { createAgent, registerTools } from "@ui-sdk/react/agent";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const agent = createAgent();
const allow = step => !step.confirm;

function transport(t, enabled = true) {
  const script = execFileSync("python3", ["-c", `import runpy; module = runpy.run_path('tests/test_liquid_glass_consumer.py'); print(module['transport_script'](${enabled ? "True" : "False"}))`], { cwd: root, encoding: "utf8" });
  const context = createContext({ window: {}, document: {}, crypto: webcrypto, DOMException, addEventListener() {} });
  runInContext(script, context);
  const previous = globalThis.document;
  globalThis.document = context.document;
  t.after(() => { if (previous === undefined) delete globalThis.document; else globalThis.document = previous; });
  return { state: context.window.__consumerTransport, modelContext: context.document.modelContext };
}

test("the exact browser transport supports SDK Promise registration and AbortSignal cleanup", async t => {
  const { state } = transport(t);
  const unregister = registerTools(agent, { allow });
  assert.deepEqual(Object.keys(state.active).sort(), ["act", "query", "snapshot"]);
  unregister();
  assert.equal(Object.keys(state.active).length, 0);
  assert.deepEqual([...state.unregistered].sort(), ["act", "query", "snapshot"]);
  await Promise.resolve();
  assert.equal(state.duplicates.length, 0);
});

test("immediate setup cleanup setup preserves one registration during StrictMode effect replay", async t => {
  const { state } = transport(t);
  registerTools(agent, { allow })();
  const unregister = registerTools(agent, { allow });
  assert.equal(state.registered.length, 6);
  assert.equal(state.unregistered.length, 3);
  assert.equal(Object.keys(state.active).length, 3);
  assert.equal(state.duplicates.length, 0);
  unregister();
  await Promise.resolve();
  assert.equal(state.unregistered.length, 6);
  assert.equal(Object.keys(state.active).length, 0);
});

test("an unavailable browser transport leaves direct SDK registration as a safe no-op", t => {
  const { state, modelContext } = transport(t, false);
  assert.equal(modelContext, undefined);
  registerTools(agent, { allow })();
  assert.equal(state.registered.length, 0);
  assert.equal(state.unregistered.length, 0);
});
