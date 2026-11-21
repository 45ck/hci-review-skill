import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { actionSchemaDocumentIssues, actionSchemaValueIssues } from "./agent-action-validation.mjs";

const defaultRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repository = "https://github.com/45ck/hci-review-skill";
const documentPaths = Object.freeze({
  "llms.txt": "docs/llms.txt",
  "agent-engineering.md": "docs/agent-engineering.md",
  "agent-contracts.json": "agent-contracts.json",
  "agent-contracts.schema.json": "agent-contracts.schema.json",
  "agent-action-inputs.json": "agent-action-inputs.json",
  "agent-index.schema.json": "agent-index.schema.json",
  "agent-contract.schema.json": "agent-contract.schema.json",
  "agent-release.schema.json": "agent-release.schema.json",
  "motion.md": "docs/motion.md",
  "motion-recipes.json": "motion-recipes.json",
  "motion-recipes.schema.json": "motion-recipes.schema.json",
});
const json = value => JSON.stringify(value, null, 2) + "\n";
const sha256 = value => "sha256:" + createHash("sha256").update(value).digest("hex");
const descriptor = (path, content) => ({ path: "/" + path, sha256: sha256(content), bytes: Buffer.byteLength(content) });

function sourceIdentity(root) {
  const git = args => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  try {
    const commit = git(["rev-parse", "HEAD"]);
    const dirty = Boolean(git(["status", "--porcelain", "--untracked-files=normal"]));
    return { repository, status: dirty ? "dirty" : "clean", commit, ...(!dirty ? { tree: git(["rev-parse", "HEAD^{tree}"]) } : {}) };
  } catch {
    return { repository, status: "unavailable" };
  }
}

function createAgentDocuments({ root = defaultRoot, source = sourceIdentity(root) } = {}) {
  const read = path => readFileSync(join(root, "packages/liquid-glass", path), "utf8");
  const assets = Object.fromEntries(Object.entries(documentPaths).map(([name, path]) => [name, read(path)]));
  const packageText = read("package.json");
  const pkg = JSON.parse(packageText);
  const registry = JSON.parse(assets["agent-contracts.json"]);
  const foundation = JSON.parse(read("component-manifest.json"));
  const custom = JSON.parse(read("custom-component-manifest.json"));
  const recipes = JSON.parse(read("component-recipes.json"));
  assets["registry/components.json"] = json({ ...recipes, sdkComponents: foundation.components, customComponents: custom.components });
  const identityInputs = { ...assets, "package.json": packageText };
  const contractSet = sha256(json(Object.keys(identityInputs).sort().map(name => descriptor(name, identityInputs[name]))));
  const release = { packageVersion: pkg.version, contractSet, source };
  const common = { schemaVersion: 1, package: registry.package, sdk: registry.sdk, release };
  const ids = new Set();
  const entries = registry.entries.map(entry => {
    if (!/^[a-z0-9-]+$/.test(entry.id) || ids.has(entry.id)) throw new Error(`Invalid or duplicate contract ID: ${entry.id}`);
    ids.add(entry.id);
    const name = `contracts/${entry.id}.json`;
    const actionSchema = entry.runtime.actionSchema ? { actionSchema: entry.runtime.actionSchema.replace(/^\.\//, "/") } : {};
    assets[name] = json({
      $schema: "/agent-contract.schema.json", ...common, ...actionSchema,
      policies: Object.fromEntries(entry.policies.map(id => [id, registry.policies[id]])), entry,
    });
    const { id, kind, purpose, exports: bindings } = entry;
    const { path, ...fingerprint } = descriptor(name, assets[name]);
    return { id, kind, purpose, exports: bindings, contract: path, ...fingerprint, ...actionSchema };
  });
  assets["agent-index.json"] = json({ $schema: "/agent-index.schema.json", ...common, entries });
  assets["agent-release.json"] = json({
    $schema: "/agent-release.schema.json", ...common,
    scope: "Content identity and source provenance only. These fields do not assert executed tests or human review.",
    resources: {
      index: "/agent-index.json", contracts: "/agent-contracts.json", actionInputs: "/agent-action-inputs.json",
      guide: "/llms.txt", engineering: "/agent-engineering.md", recipes: "/registry/components.json",
    },
    counts: { contracts: entries.length, sdkFamilies: registry.entries.filter(entry => entry.kind === "sdk-family").length,
      customPrimitives: registry.entries.filter(entry => entry.kind === "primitive").length },
    files: Object.keys(assets).sort().map(name => descriptor(name, assets[name])),
  });
  return assets;
}

function resolveSchema(schema, file, assets, active = new Set()) {
  if (!schema || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map(item => resolveSchema(item, file, assets, active));
  if (schema.$id && new URL(schema.$id, `https://contract.invalid/${file}`).href !== `https://contract.invalid/${file}`) {
    throw new Error(`Documentation schema identity must not rebase references outside its emitted file: ${file}`);
  }
  if (schema.$ref) {
    const url = new URL(schema.$ref, `https://contract.invalid/${file}`);
    const name = url.pathname.slice(1);
    const key = name + url.hash;
    if (url.origin !== "https://contract.invalid" || !assets[name]) throw new Error(`Unresolved schema reference ${schema.$ref} in ${file}`);
    if (active.has(key)) throw new Error(`Cyclic documentation schema reference ${key}`);
    let target = JSON.parse(assets[name]);
    for (const token of url.hash.slice(2).split("/").filter(Boolean)) target = target?.[decodeURIComponent(token).replaceAll("~1", "/").replaceAll("~0", "~")];
    if (!target) throw new Error(`Unresolved schema fragment ${key}`);
    return resolveSchema({ ...target, ...Object.fromEntries(Object.entries(schema).filter(([name]) => name !== "$ref")) }, name, assets, new Set([...active, key]));
  }
  return Object.fromEntries(Object.entries(schema).map(([key, value]) => [key, resolveSchema(value, file, assets, active)]));
}

function validateDocumentSchemas(assets) {
  const errors = [];
  const documents = ["agent-index.json", "agent-release.json", "motion-recipes.json", ...Object.keys(assets).filter(name => name.startsWith("contracts/"))];
  const schemas = new Map();
  for (const name of documents) {
    try {
      const document = JSON.parse(assets[name]);
      const schemaName = document.$schema?.slice(1);
      if (!schemaName || !assets[schemaName]) throw new Error(`Unresolved document schema ${document.$schema}`);
      if (!schemas.has(schemaName)) {
        const resolved = resolveSchema(JSON.parse(assets[schemaName]), schemaName, assets);
        const problems = actionSchemaDocumentIssues(resolved);
        if (problems.length) throw new Error(problems.join("; "));
        schemas.set(schemaName, resolved);
      }
      errors.push(...actionSchemaValueIssues(schemas.get(schemaName), document, schemas.get(schemaName)).map(error => `${name}: ${error}`));
    } catch (error) {
      errors.push(`${name}: ${error.message}`);
    }
  }
  return errors;
}

function verifyAgentDocuments({ root = defaultRoot, output = join(root, "docs/hci/examples/liquid-glass/dist"), source } = {}) {
  const expected = createAgentDocuments({ root, ...(source ? { source } : {}) });
  const errors = validateDocumentSchemas(expected);
  for (const [name, content] of Object.entries(expected)) {
    const path = join(output, name);
    if (!existsSync(path) || !statSync(path).isFile()) errors.push(`Missing agent document ${name}`);
    else if (readFileSync(path, "utf8") !== content) errors.push(`Agent document differs from canonical inputs: ${name}`);
  }
  const contracts = join(output, "contracts");
  if (existsSync(contracts) && statSync(contracts).isDirectory()) {
    for (const name of readdirSync(contracts)) if (!Object.hasOwn(expected, `contracts/${name}`)) errors.push(`Orphan contract asset contracts/${name}`);
  }
  const htmlPath = join(output, "index.html");
  const html = existsSync(htmlPath) ? readFileSync(htmlPath, "utf8") : "";
  const release = JSON.parse(expected["agent-release.json"]);
  const match = html.match(/<meta\s+name="quantive-agent-contract-set"\s+content="([^"]+)"\s*\/?>/);
  if (match?.[1] !== release.release.contractSet) errors.push("Built page does not identify its matching agent contract set");
  if (!html.includes('href="/agent-release.json"')) errors.push("Built page does not link its agent release metadata");
  return { errors, files: Object.keys(expected).length, contracts: release.counts.contracts, contractSet: release.release.contractSet, source: release.release.source };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = verifyAgentDocuments();
    if (result.errors.length) { process.stderr.write(result.errors.join("\n") + "\n"); process.exitCode = 1; }
    else process.stdout.write(`Agent documentation assets passed: ${result.files} files, ${result.contracts} individual contracts; schemas, exact content, fingerprints and page identity agree. Source ${result.source.status}.\n`);
  } catch (error) { process.stderr.write(error.message + "\n"); process.exitCode = 1; }
}

export { createAgentDocuments, sourceIdentity, validateDocumentSchemas, verifyAgentDocuments, sha256 };
