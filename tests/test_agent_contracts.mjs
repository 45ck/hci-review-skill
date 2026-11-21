import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { collectPublicApi, validateAgentContracts } from "../scripts/check-agent-contracts.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const schema = JSON.parse(readFileSync(join(root, "packages/liquid-glass/agent-contracts.schema.json"), "utf8"));
const name = "@quantitative-hci/liquid-glass";
const sourcePath = "packages/liquid-glass/src/index.ts";

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), "quantive-contract-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const write = (path, content) => { mkdirSync(dirname(join(directory, path)), { recursive: true }); writeFileSync(join(directory, path), content); };
  write("packages/liquid-glass/package.json", JSON.stringify({ name, exports: { ".": "./src/index.ts" }, dependencies: { "@ui-sdk/core": "0.1.0-beta.13", "@ui-sdk/react": "0.1.0-beta.13" } }));
  write(sourcePath, 'export function formatCount(value: number) { return String(value); }\n');
  write("docs.md", "# Public API\n");
  write("evidence.mjs", "export const scope = 'fixture validation';\n");
  const manifest = {
    schemaVersion: 1, package: name, sdk: { name: "Vercel UI SDK", version: "0.1.0-beta.13", repository: "https://github.com/vercel-labs/ui" }, policies: { shared: "Observe real outcomes." },
    entries: [{
      id: "format-count", kind: "pure-utility", exports: [{ path: name, symbols: ["formatCount"] }], sources: [sourcePath],
      purpose: "Format a count.", useWhen: ["Render a count label."], inputs: ["value:number"], state: ["No internal state"],
      runtime: { discovery: "none", mutationPath: "Pure function.", actions: [], outcome: "Returns a string." },
      restrictions: ["No runtime agent action."], policies: ["shared"], docs: ["docs.md"], evidence: [{ path: "evidence.mjs", scope: "Fixture behavior." }], validation: "not-applicable",
    }],
  };
  return { root: directory, manifest, schema, write, check: () => validateAgentContracts({ root: directory, manifest, schema }) };
}

function rejects(result, pattern) {
  assert(result.errors.some((error) => pattern.test(error)), result.errors.join("\n"));
}

test("current public API has complete, resolvable contracts", () => {
  const result = validateAgentContracts({ root });
  assert.deepEqual(result.errors, []);
  assert.equal(result.counts.sdkFamilies, 55);
  assert(result.counts.publicModules > 55);
});

test("adding an unregistered public value fails coverage", (t) => {
  const f = fixture(t);
  assert.deepEqual(f.check().errors, []);
  f.write(sourcePath, 'export function formatCount(value:number) { return String(value); }\nexport const undeclaredFeature = true;\n');
  rejects(f.check(), /undocumented public export.*undeclaredFeature/);
});

test("stale exported symbols and nonexistent evidence fail separately", (t) => {
  const f = fixture(t);
  f.manifest.entries[0].exports[0].symbols = ["RemovedComponent"];
  f.manifest.entries[0].evidence[0].path = "missing-test.mjs";
  const result = f.check();
  rejects(result, /unresolved public symbol.*RemovedComponent/);
  rejects(result, /unresolved repository reference missing-test/);
});

test("a local import then named re-export is inventoried", (t) => {
  const f = fixture(t);
  f.write(sourcePath, 'import { formatCount as format } from "./format"; export { format as formatCount };');
  f.write("packages/liquid-glass/src/format.ts", 'export const formatCount = (value:number) => String(value);');
  f.manifest.entries[0].sources = ["packages/liquid-glass/src/format.ts"];
  assert.deepEqual(f.check().errors, []);
  f.write("packages/liquid-glass/src/format.ts", 'export const formatCount = (value:number) => String(value); export const extra = true;');
  f.write(sourcePath, 'import { formatCount, extra } from "./format"; export { formatCount, extra };');
  rejects(f.check(), /undocumented public export.*extra/);
});

test("unresolved re-exported imports fail closed", (t) => {
  const f = fixture(t);
  f.write("packages/liquid-glass/src/format.ts", 'export const anotherValue = true;');
  f.write(sourcePath, 'import { missing } from "./format"; export { missing };');
  assert.throws(() => f.check(), /Unresolved exported value missing/);
});

test("default and namespace public exports cannot silently escape inventory", (t) => {
  const f = fixture(t);
  f.write(sourcePath, 'export default function Component() { return null; }');
  assert.throws(() => f.check(), /Default public exports/);
  f.write("packages/liquid-glass/src/format.ts", 'export const value = true;');
  f.write(sourcePath, 'export * as formatters from "./format";');
  assert.throws(() => collectPublicApi(f.root), /Namespace public exports/);
});

test("type-only exports do not masquerade as runtime APIs", (t) => {
  const f = fixture(t);
  f.write(sourcePath, 'export type Count = number; export interface Options { value:number } export function formatCount(value:number) { return String(value); }');
  assert.deepEqual(f.check().errors, []);
});

test("passive display metadata cannot claim executable SDK actions", (t) => {
  const f = fixture(t);
  f.manifest.entries[0].runtime.discovery = "sdk";
  f.manifest.entries[0].runtime.actions = ["activate"];
  rejects(f.check(), /passive and host-only APIs cannot claim/);
});

test("undeclared native interaction fails even when not publicly exported", (t) => {
  const f = fixture(t);
  f.write("packages/liquid-glass/src/private-control.tsx", 'const Hidden = () => <div role="button" onClick={() => {}}>Apply</div>;');
  rejects(f.check(), /intrinsic <div> interaction bypasses SDK discovery/);
});

test("comments and string examples do not create false interaction findings", (t) => {
  const f = fixture(t);
  f.write(sourcePath, '/* <button onClick={bad}> */ export function formatCount(value:number) { return "<input onChange=bad>" + value; }');
  assert.deepEqual(f.check().errors, []);
});

test("a second window mutation interface is rejected", (t) => {
  const f = fixture(t);
  f.write(sourcePath, 'export function formatCount(value:number) { return String(value); } Object.defineProperty(window, "mutateDirectly", { value() {} });');
  rejects(f.check(), /global mutation APIs bypass/);
});

test("custom primitive action drift and missing primitive entries fail", (t) => {
  const f = fixture(t);
  const primitiveSource = 'import { definePrimitive as create } from "@ui-sdk/core"; export const count = create({ name: "count", state: () => ({value:0}), api: () => ({set() {},reset() {}}), agent:{actions:["set","reset"]} });';
  f.write(sourcePath, primitiveSource);
  f.manifest.entries[0] = {
    ...f.manifest.entries[0], id: "count", kind: "primitive", exports: [{ path: name, symbols: ["count"] }], validation: "unvalidated",
    runtime: { discovery: "sdk", mutationPath: "Shared primitive.", outcome: "Observe state.", actions: ["set"], primitive: { source: sourcePath, symbol: "count", name: "count", actions: ["set"] }, actionParameters: { set: ["value:number"] } },
  };
  rejects(f.check(), /primitive agent.actions drifted/);
  f.manifest.entries[0].runtime.actions.push("reset");
  f.manifest.entries[0].runtime.primitive.actions.push("reset");
  f.manifest.entries[0].runtime.actionParameters.reset = [];
  assert.deepEqual(f.check().errors, []);
  f.write("packages/liquid-glass/src/unlisted.ts", 'import {definePrimitive} from "@ui-sdk/core"; const extra = definePrimitive({name:"extra",agent:{actions:["set"]}});');
  rejects(f.check(), /undocumented custom primitive extra/);
});

test("compositions must route through controls actually imported by their source", (t) => {
  const f = fixture(t);
  f.manifest.entries[0].kind = "composition";
  f.manifest.entries[0].validation = "unvalidated";
  f.manifest.entries[0].runtime.discovery = "sdk-children";
  f.manifest.entries[0].runtime.controls = ["@ui-sdk/react/button"];
  rejects(f.check(), /declared SDK control.*is not imported/);
});

test("a composition cannot advertise child actions as its own root API", (t) => {
  const f = fixture(t);
  f.write("node_modules/@ui-sdk/react/package.json", JSON.stringify({ version: "0.1.0-beta.13", exports: { "./menu": "./menu.js" } }));
  f.write("node_modules/@ui-sdk/react/menu.js", "export function Menu() {}\n");
  f.write(sourcePath, 'import { Menu } from "@ui-sdk/react/menu"; export function formatCount(value:number) { return String(value); }');
  f.manifest.entries[0].kind = "composition";
  f.manifest.entries[0].validation = "unvalidated";
  f.manifest.entries[0].runtime.discovery = "sdk-children";
  f.manifest.entries[0].runtime.controls = ["@ui-sdk/react/menu"];
  assert.deepEqual(f.check().errors, []);
  f.manifest.entries[0].runtime.actions = ["select"];
  rejects(f.check(), /compositions discover child actions and cannot claim their own root actions/);
  f.manifest.entries[0].runtime.actions = [];
  f.manifest.entries[0].runtime.actionParameters = {};
  rejects(f.check(), /only custom primitives can declare a primitive binding or action parameters/);
});

test("schema rejects ambiguous fields and duplicate exports", (t) => {
  const f = fixture(t);
  f.manifest.entries[0].runtime.secretMagicAction = "run";
  rejects(f.check(), /unknown field secretMagicAction/);
  delete f.manifest.entries[0].runtime.secretMagicAction;
  f.manifest.entries.push({ ...structuredClone(f.manifest.entries[0]), id: "duplicate" });
  rejects(f.check(), /duplicate public coverage/);
});


test("conditional exports cannot silently remove the public inventory", (t) => {
  const f = fixture(t);
  f.write("packages/liquid-glass/package.json", JSON.stringify({ name, exports: { ".": { import: "./src/index.ts", types: "./src/index.ts" } }, dependencies: { "@ui-sdk/core": "0.1.0-beta.13", "@ui-sdk/react": "0.1.0-beta.13" } }));
  assert.throws(() => collectPublicApi(f.root), /Conditional or array public exports/);
});

test("directories cannot stand in for actual evidence files", (t) => {
  const f = fixture(t);
  f.manifest.entries[0].evidence[0].path = "packages/liquid-glass/src";
  rejects(f.check(), /unresolved repository reference packages\/liquid-glass\/src/);
});

test("invented SDK modules fail even when imported by source", (t) => {
  const f = fixture(t);
  f.write(sourcePath, 'import {Magic} from "@ui-sdk/react/nonexistent"; export function formatCount(value:number) { return String(value); }');
  f.manifest.entries[0].kind = "composition";
  f.manifest.entries[0].validation = "unvalidated";
  f.manifest.entries[0].runtime.discovery = "sdk-children";
  f.manifest.entries[0].runtime.controls = ["@ui-sdk/react/nonexistent"];
  rejects(f.check(), /unresolved installed SDK public entry/);
});


test("JavaScript exports receive the same native-interaction checks", (t) => {
  const f = fixture(t);
  f.write("packages/liquid-glass/package.json", JSON.stringify({ name, exports: { ".": "./src/index.jsx" }, dependencies: { "@ui-sdk/core": "0.1.0-beta.13", "@ui-sdk/react": "0.1.0-beta.13" } }));
  f.write("packages/liquid-glass/src/index.jsx", 'export function formatCount(value) { return String(value); } const Control = () => <button>Run</button>;');
  f.manifest.entries[0].sources = ["packages/liquid-glass/src/index.jsx"];
  rejects(f.check(), /intrinsic <button> interaction/);
});
