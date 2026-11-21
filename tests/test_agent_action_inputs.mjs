import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { after, test } from "node:test";
import { actionSchemaDocumentIssues, actionSchemaValueIssues, primitiveActionSchemaIssues, validateAgentActionInput } from "../scripts/agent-action-validation.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const schemas = JSON.parse(readFileSync(join(root, "packages/liquid-glass/agent-action-inputs.json"), "utf8"));
const contracts = JSON.parse(readFileSync(join(root, "packages/liquid-glass/agent-contracts.json"), "utf8"));
const check = (id, action, args) => validateAgentActionInput(schemas, id, action, args);
const temporary = mkdtempSync(join(tmpdir(), "quantive-action-inputs-"));
after(() => rmSync(temporary, { recursive: true, force: true }));
const modules = {
  "diagram-types": "packages/liquid-glass/src/developer/types.ts",
  notations: "packages/liquid-glass/src/developer/notations.ts",
  scene: "packages/liquid-glass/src/developer/scene.ts",
  types: "packages/liquid-glass/src/modeling/types.ts",
  document: "packages/liquid-glass/src/modeling/document.ts",
  viewport: "packages/liquid-glass/src/developer/viewport-primitive.ts",
};
for (const [id, path] of Object.entries(modules)) {
  let source = stripTypeScriptTypes(readFileSync(join(root, path), "utf8"));
  if (id === "notations" || id === "scene") source = source.replaceAll('"./types"', '"./diagram-types.mjs"');
  source = source.replaceAll('"./notations"', '"./notations.mjs"').replaceAll('"../developer/scene"', '"./scene.mjs"').replaceAll('"./types"', '"./types.mjs"').replaceAll('"@ui-sdk/core"', JSON.stringify(import.meta.resolve("@ui-sdk/core")));
  writeFileSync(join(temporary, `${id}.mjs`), source);
}
const modelApi = await import(pathToFileURL(join(temporary, "document.mjs")).href);
const diagramTypes = await import(pathToFileURL(join(temporary, "diagram-types.mjs")).href);
const { liquidViewport } = await import(pathToFileURL(join(temporary, "viewport.mjs")).href);
const model = () => ({ id: "schema-test", name: "Schema test", notation: "UML class", description: "A test diagram.", width: 1000, height: 800,
  nodes: [
    { id: "node-1", name: "First node", kind: "class", description: "", x: 20, y: 20, width: 180, height: 100 },
    { id: "node-2", name: "Second node", kind: "class", description: "", x: 300, y: 20, width: 180, height: 100 },
  ],
  edges: [{ id: "edge-1", source: "node-1", target: "node-2", kind: "association", description: "" }],
});
const transaction = operation => ({ expectedRevision: 0, operations: [operation] });

test("all custom actions have exact schemas and valid/invalid examples", () => {
  assert.deepEqual(actionSchemaDocumentIssues(schemas), []);
  let count = 0;
  for (const entry of contracts.entries.filter(item => item.kind === "primitive")) {
    assert.equal(entry.runtime.actionSchema, `./agent-action-inputs.json#/$defs/${entry.id}`);
    assert.deepEqual(primitiveActionSchemaIssues(schemas, entry.id, entry.runtime.actions), []);
    count += entry.runtime.actions.length;
  }
  assert.equal(count, 17);
});

test("viewport schemas agree with actual rejection and zoom clamping", () => {
  const view = liquidViewport({ id: "schema-viewport", width: 1000, height: 800 });
  try {
    const camera = { x: 20, y: 40, zoom: 8 };
    assert.equal(check("liquid-viewport", "setViewport", [camera]).ok, true);
    assert.equal(view.api.setViewport(camera), true);
    assert.deepEqual(view.get().viewport, { ...camera, zoom: 4 });
    for (const invalid of [{ x: 0, y: 0, zoom: 0 }, { x: 10000001, y: 0, zoom: 1 }, { x: "20", y: 0, zoom: 1 }]) {
      assert.equal(check("liquid-viewport", "setViewport", [invalid]).ok, false);
      const before = view.get().viewport;
      assert.equal(view.api.setViewport(invalid), false);
      assert.deepEqual(view.get().viewport, before);
    }
    for (const invalid of [0, -1, "2"]) {
      assert.equal(check("liquid-viewport", "zoomTo", [invalid]).ok, false);
      assert.equal(view.api.zoomTo(invalid), false);
    }
    assert.equal(check("liquid-viewport", "panBy", [80, -40]).ok, true);
    assert.equal(view.api.panBy(80, -40), true);
    assert.deepEqual(view.get().viewport, { x: 100, y: 0, zoom: 4 });
  } finally { view.destroy(); }
});

test("model schema accepts every supported operation through real preview validation", () => {
  const document = modelApi.createModelDocument(model());
  const operations = [
    { type: "rename-node", nodeId: "node-1", name: "Renamed node" },
    { type: "update-node", nodeId: "node-1", patch: { stereotype: "entity", description: "Updated" } },
    { type: "add-node", node: { ...model().nodes[0], id: "node-3", name: "Third node", y: 200 } },
    { type: "remove-node", nodeId: "node-1" },
    { type: "add-edge", edge: { ...model().edges[0], id: "edge-2" } },
    { type: "update-edge", edgeId: "edge-1", patch: { label: "Updated", technology: null } },
    { type: "remove-edge", edgeId: "edge-1" },
    { type: "replace-model", model: { ...model(), name: "Updated model" } },
  ];
  for (const operation of operations) {
    const args = [transaction(operation)];
    assert.equal(check("model-document", "applyTransaction", args).ok, true, operation.type);
    assert.equal(modelApi.previewModelTransaction(document, args[0]).ok, true, operation.type);
  }
  const withoutLabel = transaction(operations[0]);
  assert.equal(check("model-document", "applyTransaction", [withoutLabel]).ok, true);
  const result = modelApi.applyModelTransaction(document, { ...withoutLabel, selectedId: null });
  assert.equal(result.ok, true);
  assert.equal(result.revision, 1);
  assert.equal(result.document.selectedId, null);
  assert.equal(document.revision, 0);
});

test("model schemas reject malformed operations the actual domain API refuses", () => {
  const document = modelApi.createModelDocument(model());
  const malformed = [
    { expectedRevision: -1, operations: [{ type: "remove-node", nodeId: "node-1" }] },
    { expectedRevision: 0, operations: [] },
    { expectedRevision: 0, operations: Array.from({ length: 101 }, () => ({ type: "remove-edge", edgeId: "edge-1" })) },
    transaction({ type: "unknown" }),
    transaction({ type: "update-node", nodeId: "node-1", patch: { id: "replacement" } }),
    transaction({ type: "rename-node", nodeId: "node-1", name: "" }),
    transaction({ type: "rename-node", nodeId: "node-1", name: "A\ud800" }),
    transaction({ type: "rename-node", nodeId: "node-1", name: "A\ufffe" }),
    transaction({ type: "update-node", nodeId: "node-1", patch: { width: null } }),
    transaction({ type: "add-node", node: { ...model().nodes[0], id: "node-3", kind: "invented" } }),
    transaction({ type: "update-edge", edgeId: "edge-1", patch: { sourceOffset: 1.5 } }),
  ];
  for (const value of malformed) {
    assert.equal(check("model-document", "applyTransaction", [value]).ok, false, JSON.stringify(value));
    const result = modelApi.applyModelTransaction(document, value);
    assert.equal(result.ok, false);
    assert.equal(result.document, document);
  }
  const supplementaryUnicode = transaction({ type: "rename-node", nodeId: "node-1", name: "Node \u{1f600}" });
  assert.equal(check("model-document", "applyTransaction", [supplementaryUnicode]).ok, true);
  assert.equal(modelApi.applyModelTransaction(document, supplementaryUnicode).ok, true);
});

test("structural acceptance cannot claim current-state validity or host permission", () => {
  const document = modelApi.createModelDocument(model());
  const requests = [
    { expectedRevision: 6, operations: [{ type: "rename-node", nodeId: "node-1", name: "Updated" }] },
    transaction({ type: "rename-node", nodeId: "missing", name: "Updated" }),
    transaction({ type: "update-node", nodeId: "node-1", patch: { x: 950 } }),
    transaction({ type: "rename-node", nodeId: "node-1", name: "Second node" }),
  ];
  for (const value of requests) {
    const preflight = check("model-document", "applyTransaction", [value]);
    assert.equal(preflight.ok, true);
    assert.equal(preflight.scope, "structural-preflight");
    assert.match(preflight.next, /verify accepted state/);
    assert.equal(modelApi.applyModelTransaction(document, value).ok, false);
  }
});

test("schema enums and patch fields track actual exported model vocabulary", () => {
  const defs = schemas.$defs;
  assert.deepEqual(defs["diagram-node"].properties.kind.enum, [...diagramTypes.DIAGRAM_NODE_KINDS]);
  assert.deepEqual(defs["diagram-edge"].properties.kind.enum, [...diagramTypes.DIAGRAM_EDGE_KINDS]);
  assert.deepEqual(defs["diagram-model"].properties.notation.enum, [...diagramTypes.DIAGRAM_NOTATIONS]);
  assert.deepEqual(defs["diagram-node"].properties.architecture.properties.type.enum, [...diagramTypes.DIAGRAM_ARCHITECTURE_TYPES]);
  const inspection = modelApi.inspectModelDocument(modelApi.createModelDocument(model()));
  assert.deepEqual(Object.keys(defs["node-patch"].properties).sort(), [...inspection.nodePatchFields].sort());
  assert.deepEqual(Object.keys(defs["edge-patch"].properties).sort(), [...inspection.edgePatchFields].sort());
  assert.deepEqual(defs["model-operation"].oneOf.map(item => item.properties.type.const).sort(), inspection.operations.map(item => item.type).sort());
});

test("arity and JSON input checks cannot silently coerce invalid requests", () => {
  for (const args of [[], [1], [1, 2, 3], ["1", 2], [Infinity, 0], [NaN, 0], [1n, 0], [new Date(), 0], [undefined, 0], Array(2)]) assert.equal(check("liquid-viewport", "panBy", args).ok, false);
  assert.equal(check("liquid-viewport", "setPanMode", ["true"]).ok, false);
  assert.equal(check("model-document", "cancelPending", [true]).ok, false);
  assert.equal(check("sdk-button", "press", []).ok, false);
  assert.equal(check("model-document", "invented", []).ok, false);
  const circular = []; circular.push(circular);
  assert.equal(check("model-document", "preview", circular).ok, false);
});

test("the local schema evaluator fails on unsupported or malformed schema keywords", () => {
  for (const change of [schema => { schema.not = {}; }, schema => { schema.$defs["safe-revision"].minimum = "zero"; }, schema => { schema.$defs["safe-revision"].type = "float"; }, schema => { schema.$defs["safe-revision"].$ref = "#/missing"; }, schema => { schema.$defs["safe-revision"].$ref = "#/$defs/safe-revision"; }, schema => { schema.$defs["liquid-viewport"].oneOf[4].properties.args.prefixItems = []; }, schema => { schema.$defs["liquid-viewport"].oneOf[4].properties.args.uniqueItems = "yes"; }]) {
    const candidate = structuredClone(schemas); change(candidate);
    assert(actionSchemaDocumentIssues(candidate).length > 0);
  }
  const malformed = structuredClone(schemas);
  malformed.$defs["liquid-viewport"].oneOf[0].examples[0].args[0].zoom = 0;
  assert(primitiveActionSchemaIssues(malformed, "liquid-viewport", contracts.entries.find(entry => entry.id === "liquid-viewport").runtime.actions).some(issue => issue.includes("valid example fails")));
});

test("schema composition evaluates refs, additional properties, bounds and tuple tails", () => {
  assert.deepEqual(actionSchemaValueIssues(schemas, { contract: "model-document", action: "select", args: [null] }, schemas), []);
  assert(actionSchemaValueIssues(schemas, { contract: "model-document", action: "select", args: [null], extra: true }, schemas).length > 0);
  assert(actionSchemaValueIssues(schemas, { contract: "model-document", action: "undo", args: [9007199254740992] }, schemas).length > 0);
  assert(actionSchemaValueIssues(schemas, { contract: "liquid-viewport", action: "fit", args: [0] }, schemas).length > 0);
  const unique = { type: "array", uniqueItems: true };
  assert(actionSchemaValueIssues(unique, [{ x: 1, y: 2 }, { y: 2, x: 1 }], unique).some(issue => issue.includes("unique")));
  assert.deepEqual(actionSchemaValueIssues(unique, [{ x: 1 }, { x: 2 }], unique), []);
});

test("CLI validates JSON without operating an interface and reports errors as JSON", () => {
  const run = args => spawnSync(process.execPath, ["scripts/agent-contract.mjs", ...args], { cwd: root, encoding: "utf8" });
  const valid = run(["validate", "liquid-viewport", "panBy", "[80,-40]"]);
  assert.equal(valid.status, 0, valid.stderr);
  assert.equal(JSON.parse(valid.stdout).ok, true);
  for (const args of [["validate", "liquid-viewport", "panBy", "[80]"], ["validate", "model-document", "cancelPending", "[true]"], ["validate", "sdk-button", "press", "[]"], ["validate", "liquid-viewport", "panBy", "invalid"]]) {
    const result = run(args);
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stdout).ok, false);
  }
  const contract = run(["liquid-viewport"]);
  assert.equal(contract.status, 0);
  assert.match(JSON.parse(contract.stdout).entry.runtime.actionSchema, /agent-action-inputs/);
});
