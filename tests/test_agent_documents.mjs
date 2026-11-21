import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createAgentDocuments, sha256, validateDocumentSchemas, verifyAgentDocuments } from "../scripts/agent-documents.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = { repository: "https://github.com/45ck/hci-review-skill", status: "unavailable" };
const assets = createAgentDocuments({ root, source });
const index = JSON.parse(assets["agent-index.json"]);

function fixture(t) {
  const output = mkdtempSync(join(tmpdir(), "quantive-agent-documents-"));
  t.after(() => rmSync(output, { recursive: true, force: true }));
  const write = (name, content) => { mkdirSync(dirname(join(output, name)), { recursive: true }); writeFileSync(join(output, name), content); };
  for (const [name, content] of Object.entries(assets)) write(name, content);
  write("index.html", `<html><head><meta name="quantive-agent-contract-set" content="${index.release.contractSet}"><link href="/agent-release.json"></head></html>`);
  return { output, write, check: () => verifyAgentDocuments({ root, output, source }) };
}

test("every generated contract and index validates against resolvable published schemas", () => {
  assert.deepEqual(validateDocumentSchemas(assets), []);
  const registry = JSON.parse(assets["agent-contracts.json"]);
  assert.equal(index.entries.length, registry.entries.length);
  assert.deepEqual(index.entries.map(entry => entry.id), registry.entries.map(entry => entry.id));
  for (const entry of registry.entries) {
    const envelope = JSON.parse(assets[`contracts/${entry.id}.json`]);
    assert.deepEqual(envelope.entry, entry);
    assert.deepEqual(envelope.policies, Object.fromEntries(entry.policies.map(id => [id, registry.policies[id]])));
    assert.deepEqual(envelope.release, index.release);
  }
});

test("index fingerprints identify the exact emitted contract bytes", () => {
  for (const entry of index.entries) {
    const content = assets[entry.contract.slice(1)];
    assert.equal(entry.sha256, sha256(content));
    assert.equal(entry.bytes, Buffer.byteLength(content));
  }
  const release = JSON.parse(assets["agent-release.json"]);
  assert.equal(release.files.length, Object.keys(assets).length - 1);
  for (const file of release.files) {
    assert.equal(file.sha256, sha256(assets[file.path.slice(1)]));
    assert.equal(file.bytes, Buffer.byteLength(assets[file.path.slice(1)]));
  }
});

test("hosted action schema links resolve from nested contracts to the published input definitions", () => {
  const definitions = JSON.parse(assets["agent-action-inputs.json"]).$defs;
  const primitives = index.entries.filter(entry => entry.kind === "primitive");
  assert.equal(primitives.length, 3);
  for (const entry of primitives) {
    const envelope = JSON.parse(assets[entry.contract.slice(1)]);
    const url = new URL(envelope.actionSchema, `https://kit.invalid${entry.contract}`);
    assert.equal(entry.actionSchema, envelope.actionSchema);
    assert.equal(url.pathname, "/agent-action-inputs.json");
    assert.equal(url.hash, `#/$defs/${entry.id}`);
    assert(definitions[entry.id]);
  }
});

test("contract content identity is stable across source commits without claiming they are the same build", () => {
  const other = createAgentDocuments({ root, source: { ...source, status: "clean", commit: "a".repeat(40), tree: "b".repeat(40) } });
  const otherIndex = JSON.parse(other["agent-index.json"]);
  assert.equal(otherIndex.release.contractSet, index.release.contractSet);
  assert.notDeepEqual(otherIndex.release.source, index.release.source);
  assert.notEqual(otherIndex.entries[0].sha256, index.entries[0].sha256);
  assert.deepEqual(validateDocumentSchemas(other), []);
});

test("changing a canonical guide invalidates the contract set identity", t => {
  const directory = mkdtempSync(join(tmpdir(), "quantive-agent-source-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const files = ["package.json", "component-manifest.json", "custom-component-manifest.json", "component-recipes.json",
    "docs/llms.txt", "docs/agent-engineering.md", "docs/motion.md", "motion-recipes.json", ...Object.keys(assets).filter(name => name.endsWith(".schema.json") || name === "agent-contracts.json" || name === "agent-action-inputs.json")];
  for (const file of files) {
    const target = join(directory, "packages/liquid-glass", file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, readFileSync(join(root, "packages/liquid-glass", file)));
  }
  assert.equal(JSON.parse(createAgentDocuments({ root: directory, source })["agent-index.json"]).release.contractSet, index.release.contractSet);
  writeFileSync(join(directory, "packages/liquid-glass/docs/llms.txt"), "# A changed guide\n");
  assert.notEqual(JSON.parse(createAgentDocuments({ root: directory, source })["agent-index.json"]).release.contractSet, index.release.contractSet);
});

test("production documentation verifier accepts the complete canonical output", t => {
  const result = fixture(t).check();
  assert.deepEqual(result.errors, []);
  assert.equal(result.contracts, index.entries.length);
  assert.equal(result.files, Object.keys(assets).length);
});

test("a missing individual contract fails the production release gate", t => {
  const f = fixture(t);
  rmSync(join(f.output, "contracts/model-document.json"));
  assert(f.check().errors.some(error => error.includes("Missing agent document contracts/model-document.json")));
});

test("a stale but syntactically valid contract fails exact canonical comparison", t => {
  const f = fixture(t);
  const contract = JSON.parse(assets["contracts/model-document.json"]);
  contract.entry.purpose = "A stale description from another build.";
  f.write("contracts/model-document.json", JSON.stringify(contract, null, 2) + "\n");
  assert(f.check().errors.some(error => error.includes("differs from canonical inputs: contracts/model-document.json")));
});

test("orphan contract files cannot survive a clean production documentation check", t => {
  const f = fixture(t);
  f.write("contracts/removed-component.json", "{}\n");
  assert(f.check().errors.some(error => error.includes("Orphan contract asset")));
});

test("a mismatched index digest or missing schema fails the production release gate", t => {
  const f = fixture(t);
  const damaged = structuredClone(index);
  damaged.entries[0].sha256 = "sha256:" + "0".repeat(64);
  f.write("agent-index.json", JSON.stringify(damaged, null, 2) + "\n");
  rmSync(join(f.output, "agent-index.schema.json"));
  const errors = f.check().errors;
  assert(errors.some(error => error.includes("differs from canonical inputs: agent-index.json")));
  assert(errors.some(error => error.includes("Missing agent document agent-index.schema.json")));
});

test("a page from a different contract set fails even when JSON documents are intact", t => {
  const f = fixture(t);
  f.write("index.html", '<html><head><meta name="quantive-agent-contract-set" content="sha256:stale"><link href="/agent-release.json"></head></html>');
  assert(f.check().errors.some(error => error.includes("matching agent contract set")));
});

test("unresolved schema links and undocumented envelope fields fail schema validation", () => {
  const broken = { ...assets };
  const contract = JSON.parse(broken["contracts/model-document.json"]);
  contract.claimedHumanApproval = true;
  broken["contracts/model-document.json"] = JSON.stringify(contract);
  assert(validateDocumentSchemas(broken).some(error => error.includes("claimedHumanApproval") && error.includes("not allowed")));
  const schema = JSON.parse(broken["agent-contract.schema.json"]);
  schema.properties.entry.$ref = "./missing.schema.json";
  broken["agent-contract.schema.json"] = JSON.stringify(schema);
  assert(validateDocumentSchemas(broken).some(error => error.includes("Unresolved schema reference")));
});

test("an absolute schema ID cannot silently resolve this release's references through moving main", () => {
  const broken = { ...assets };
  const schema = JSON.parse(broken["agent-index.schema.json"]);
  schema.$id = "https://raw.githubusercontent.com/45ck/hci-review-skill/main/packages/liquid-glass/agent-index.schema.json";
  broken["agent-index.schema.json"] = JSON.stringify(schema);
  assert(validateDocumentSchemas(broken).some(error => error.includes("must not rebase references")));
});

test("schema validation enforces numeric bounds rather than accepting invalid byte counts", () => {
  const broken = { ...assets };
  const damaged = structuredClone(index);
  damaged.entries[0].bytes = -1;
  broken["agent-index.json"] = JSON.stringify(damaged);
  assert(validateDocumentSchemas(broken).some(error => error.includes("bytes") && error.includes(">= 1")));
});
