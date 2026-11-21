import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createAgentDocuments, normalizeBasePath, sha256, validateDocumentSchemas, verifyAgentDocuments, writeAgentDocuments } from "../packages/liquid-glass/tools/agent-documents.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const packageRoot = join(root, "packages/liquid-glass");
const source = { repository: "https://github.com/45ck/hci-review-skill", status: "unavailable" };
const rootDocuments = createAgentDocuments({ packageRoot, source });
const prefixed = createAgentDocuments({ packageRoot, source, basePath: "/studio/" });

test("publishing under a prefix preserves canonical identity and rebases every reachable schema and fingerprint", () => {
  const release = JSON.parse(prefixed["agent-release.json"]), index = JSON.parse(prefixed["agent-index.json"]);
  assert.equal(release.release.contractSet, JSON.parse(rootDocuments["agent-release.json"]).release.contractSet);
  assert.deepEqual(validateDocumentSchemas(prefixed), []);
  assert.equal(index.$schema, "/studio/agent-index.schema.json");
  for (const file of release.files) {
    assert(file.path.startsWith("/studio/"));
    const content = prefixed[file.path.slice("/studio/".length)];
    assert.equal(file.sha256, sha256(content));
    assert.equal(file.bytes, Buffer.byteLength(content));
  }
  for (const entry of index.entries) {
    const envelope = JSON.parse(prefixed[entry.contract.slice("/studio/".length)]);
    assert.equal(envelope.$schema, "/studio/agent-contract.schema.json");
    if (entry.actionSchema) assert(entry.actionSchema.startsWith("/studio/agent-action-inputs.json#"));
  }
  assert(prefixed["llms.txt"].includes("](/studio/agent-index.json)"));
  assert(!prefixed["llms.txt"].includes("](/agent-index.json)"));
});

test("canonical package files work without a repository layout and never infer provenance from host Git", t => {
  const directory = mkdtempSync(join(tmpdir(), "quantive-portable-docs-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const files = ["package.json", "component-manifest.json", "custom-component-manifest.json", "component-recipes.json", "docs",
    "agent-contracts.json", "agent-contracts.schema.json", "agent-action-inputs.json", "agent-index.schema.json", "agent-contract.schema.json", "agent-release.schema.json"];
  for (const name of files) cpSync(join(packageRoot, name), join(directory, name), { recursive: true });
  let documents = createAgentDocuments({ packageRoot: directory, basePath: "/studio/" });
  assert.deepEqual(JSON.parse(documents["agent-release.json"]).release.source, source);
  const frozenSource = { ...source, status: "clean", commit: "a".repeat(40), tree: "b".repeat(40) };
  const version = JSON.parse(readFileSync(join(directory, "package.json"), "utf8")).version;
  mkdirSync(join(directory, "dist"));
  writeFileSync(join(directory, "dist/source-identity.json"), JSON.stringify({ packageVersion: version, source: frozenSource }));
  documents = createAgentDocuments({ packageRoot: directory, basePath: "/studio/" });
  assert.deepEqual(JSON.parse(documents["agent-release.json"]).release.source, frozenSource);
  writeFileSync(join(directory, "dist/source-identity.json"), JSON.stringify({ packageVersion: "stale", source: frozenSource }));
  assert.throws(() => createAgentDocuments({ packageRoot: directory }), /provenance is stale/);
});

test("the standalone emitter binds a prefixed built page and the production verifier refuses a different mount", t => {
  const output = mkdtempSync(join(tmpdir(), "quantive-prefixed-output-"));
  t.after(() => rmSync(output, { recursive: true, force: true }));
  writeFileSync(join(output, "index.html"), '<html><head><title>Consumer</title></head><body>Application</body></html>');
  writeAgentDocuments({ packageRoot, source, output, basePath: "/studio/" });
  assert.deepEqual(verifyAgentDocuments({ packageRoot, source, output, basePath: "/studio/" }).errors, []);
  assert(verifyAgentDocuments({ packageRoot, source, output }).errors.length > 0);
  writeAgentDocuments({ packageRoot, source, output, basePath: "/studio/" });
  assert.equal((readFileSync(join(output, "index.html"), "utf8").match(/name="quantive-agent-contract-set"/g) ?? []).length, 1);
  const damaged = JSON.parse(readFileSync(join(output, "contracts/model-document.json"), "utf8"));
  damaged.$schema = "/agent-contract.schema.json";
  writeFileSync(join(output, "contracts/model-document.json"), JSON.stringify(damaged));
  assert(verifyAgentDocuments({ packageRoot, source, output, basePath: "/studio/" }).errors.some(error => error.includes("contracts/model-document.json")));
});

test("a prefixed schema cannot escape its publication path", () => {
  const broken = { ...prefixed }, schema = JSON.parse(broken["agent-index.schema.json"]);
  schema.properties.release.$ref = "/agent-contract.schema.json#/$defs/release";
  broken["agent-index.schema.json"] = JSON.stringify(schema);
  assert(validateDocumentSchemas(broken).some(error => error.includes("Unresolved schema reference")));
});

test("base paths cannot inject markup or escape the declared mount", () => {
  assert.equal(normalizeBasePath("/studio"), "/studio/");
  for (const value of ["https://other.invalid/", "studio/", "/../", "/a/./", "//other/", '/studio/\"', "/studio/?x=1", "/studio/#x"]) {
    assert.throws(() => normalizeBasePath(value), /root-relative path/);
  }
});
