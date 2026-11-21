import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { actionSchemaDocumentIssues, actionSchemaValueIssues } from "./agent-action-validation.mjs";

const defaultPackageRoot = fileURLToPath(new URL("../", import.meta.url));
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
});
const json = value => JSON.stringify(value, null, 2) + "\n";
const sha256 = value => "sha256:" + createHash("sha256").update(value).digest("hex");
const descriptor = (name, content, basePath = "/") => ({ path: basePath + name, sha256: sha256(content), bytes: Buffer.byteLength(content) });

function normalizeBasePath(value = "/") {
  if (typeof value !== "string" || !value.startsWith("/") || !/^\/[a-zA-Z0-9/._-]*$/.test(value)
    || value.includes("//") || value.split("/").some(part => part === "." || part === "..")) {
    throw new Error("Agent documentation basePath must be a root-relative path such as /studio/, without query, fragment or traversal segments.");
  }
  return value.endsWith("/") ? value : value + "/";
}

function kitSource(packageRoot, version) {
  const path = join(packageRoot, "dist/source-identity.json");
  if (!existsSync(path)) return { repository, status: "unavailable" };
  const identity = JSON.parse(readFileSync(path, "utf8"));
  if (identity.packageVersion !== version) throw new Error("The compiled package provenance is stale; rebuild the kit package.");
  return identity.source;
}

const publishedPath = value => /^\/(?:agent-[a-z.-]+|llms\.txt|registry\/components\.json|contracts\/)/.test(value);
const regexEscape = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function rebaseValue(value, basePath, key) {
  if (Array.isArray(value)) return value.map(item => rebaseValue(item, basePath));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, rebaseValue(item, basePath, name)]));
  if (typeof value !== "string") return value;
  if (publishedPath(value)) return basePath + value.slice(1);
  if (key === "pattern" && /^\^\/(?:contracts\/|agent-)/.test(value)) return "^" + regexEscape(basePath) + value.slice(2);
  return value;
}

function rebaseDocument(name, content, basePath) {
  if (basePath === "/") return content;
  if (name.endsWith(".json")) return json(rebaseValue(JSON.parse(content), basePath));
  return content.replace(/(?<=["'(\s])\/(?=(?:agent-[a-z.-]+|llms\.txt|registry\/components\.json|contracts\/))/g, basePath);
}

function createAgentDocuments({ packageRoot = defaultPackageRoot, source, basePath = "/" } = {}) {
  basePath = normalizeBasePath(basePath);
  const read = path => readFileSync(join(packageRoot, path), "utf8");
  const canonical = Object.fromEntries(Object.entries(documentPaths).map(([name, path]) => [name, read(path)]));
  const packageText = read("package.json"), pkg = JSON.parse(packageText);
  const registry = JSON.parse(canonical["agent-contracts.json"]);
  const foundation = JSON.parse(read("component-manifest.json"));
  const custom = JSON.parse(read("custom-component-manifest.json"));
  const recipes = JSON.parse(read("component-recipes.json"));
  canonical["registry/components.json"] = json({ ...recipes, sdkComponents: foundation.components, customComponents: custom.components });
  const identityInputs = { ...canonical, "package.json": packageText };
  const contractSet = sha256(json(Object.keys(identityInputs).sort().map(name => descriptor(name, identityInputs[name]))));
  const release = { packageVersion: pkg.version, contractSet, source: source ?? kitSource(packageRoot, pkg.version) };
  const common = { schemaVersion: 1, package: registry.package, sdk: registry.sdk, release };
  const assets = Object.fromEntries(Object.entries(canonical).map(([name, content]) => [name, rebaseDocument(name, content, basePath)]));
  const ids = new Set();
  const entries = registry.entries.map(entry => {
    if (!/^[a-z0-9-]+$/.test(entry.id) || ids.has(entry.id)) throw new Error(`Invalid or duplicate contract ID: ${entry.id}`);
    ids.add(entry.id);
    const name = `contracts/${entry.id}.json`;
    const actionSchema = entry.runtime.actionSchema ? { actionSchema: entry.runtime.actionSchema.replace(/^\.\//, basePath) } : {};
    assets[name] = json({
      $schema: basePath + "agent-contract.schema.json", ...common, ...actionSchema,
      policies: Object.fromEntries(entry.policies.map(id => [id, registry.policies[id]])), entry,
    });
    const { id, kind, purpose, exports: bindings } = entry;
    const { path, ...fingerprint } = descriptor(name, assets[name], basePath);
    return { id, kind, purpose, exports: bindings, contract: path, ...fingerprint, ...actionSchema };
  });
  assets["agent-index.json"] = json({ $schema: basePath + "agent-index.schema.json", ...common, entries });
  assets["agent-release.json"] = json({
    $schema: basePath + "agent-release.schema.json", ...common,
    scope: "Content identity and kit source provenance only. These fields do not identify the host application's source or assert executed tests or human review.",
    resources: Object.fromEntries(Object.entries({ index: "agent-index.json", contracts: "agent-contracts.json", actionInputs: "agent-action-inputs.json",
      guide: "llms.txt", engineering: "agent-engineering.md", recipes: "registry/components.json" }).map(([key, path]) => [key, basePath + path])),
    counts: { contracts: entries.length, sdkFamilies: registry.entries.filter(entry => entry.kind === "sdk-family").length,
      customPrimitives: registry.entries.filter(entry => entry.kind === "primitive").length },
    files: Object.keys(assets).sort().map(name => descriptor(name, assets[name], basePath)),
  });
  return assets;
}

function assetName(reference, file, assets, basePath) {
  const url = new URL(reference, `https://contract.invalid${basePath}${file}`);
  const name = url.pathname.startsWith(basePath) ? url.pathname.slice(basePath.length) : "";
  if (url.origin !== "https://contract.invalid" || !name || !Object.hasOwn(assets, name)) throw new Error(`Unresolved schema reference ${reference} in ${file}`);
  return { name, hash: url.hash };
}

function resolveSchema(schema, file, assets, basePath, active = new Set()) {
  if (!schema || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map(item => resolveSchema(item, file, assets, basePath, active));
  const fileUrl = `https://contract.invalid${basePath}${file}`;
  if (schema.$id && new URL(schema.$id, fileUrl).href !== fileUrl) throw new Error(`Documentation schema identity must not rebase references outside its emitted file: ${file}`);
  if (schema.$ref) {
    const { name, hash } = assetName(schema.$ref, file, assets, basePath), key = name + hash;
    if (active.has(key)) throw new Error(`Cyclic documentation schema reference ${key}`);
    let target = JSON.parse(assets[name]);
    for (const token of hash.slice(2).split("/").filter(Boolean)) target = target?.[decodeURIComponent(token).replaceAll("~1", "/").replaceAll("~0", "~")];
    if (!target) throw new Error(`Unresolved schema fragment ${key}`);
    return resolveSchema({ ...target, ...Object.fromEntries(Object.entries(schema).filter(([name]) => name !== "$ref")) }, name, assets, basePath, new Set([...active, key]));
  }
  return Object.fromEntries(Object.entries(schema).map(([key, value]) => [key, resolveSchema(value, file, assets, basePath, active)]));
}

function validateDocumentSchemas(assets) {
  const errors = [], schemas = new Map();
  const documents = ["agent-index.json", "agent-release.json", ...Object.keys(assets).filter(name => name.startsWith("contracts/"))];
  let basePath;
  try {
    const releaseSchema = JSON.parse(assets["agent-release.json"]).$schema;
    if (!releaseSchema?.endsWith("/agent-release.schema.json")) throw new Error("Unresolved document schema for the agent release");
    basePath = normalizeBasePath(releaseSchema.slice(0, -"agent-release.schema.json".length));
  } catch (error) { return [error.message]; }
  for (const name of documents) {
    try {
      const document = JSON.parse(assets[name]);
      const { name: schemaName } = assetName(document.$schema, name, assets, basePath);
      if (!schemas.has(schemaName)) {
        const resolved = resolveSchema(JSON.parse(assets[schemaName]), schemaName, assets, basePath);
        const problems = actionSchemaDocumentIssues(resolved);
        if (problems.length) throw new Error(problems.join("; "));
        schemas.set(schemaName, resolved);
      }
      errors.push(...actionSchemaValueIssues(schemas.get(schemaName), document, schemas.get(schemaName)).map(error => `${name}: ${error}`));
    } catch (error) { errors.push(`${name}: ${error.message}`); }
  }
  return errors;
}

function pageTags(documents, basePath) {
  const { release } = JSON.parse(documents["agent-release.json"]);
  return [
    { tag: "meta", attrs: { name: "quantive-agent-contract-set", content: release.contractSet } },
    { tag: "link", attrs: { rel: "describedby", type: "application/json", href: basePath + "agent-release.json", title: "Agent documentation release identity" } },
  ];
}

function pagePath(output, page) {
  const directory = resolve(output), path = resolve(directory, page);
  if (!path.startsWith(directory + sep)) throw new Error("The built page must be inside the documentation output directory.");
  return path;
}

function writeAgentDocuments({ output, page = "index.html", ...options } = {}) {
  if (!output) throw new Error("Choose the built application's output directory.");
  const basePath = normalizeBasePath(options.basePath), documents = createAgentDocuments({ ...options, basePath });
  const errors = validateDocumentSchemas(documents);
  if (errors.length) throw new Error(errors.join("\n"));
  let html;
  if (page !== false) {
    html = readFileSync(pagePath(output, page), "utf8");
    if (!/<\/head\s*>/i.test(html)) throw new Error("The built page has no closing head element for its agent documentation identity.");
    html = html.replace(/<meta\b(?=[^>]*\bname=["']quantive-agent-contract-set["'])[^>]*>\s*/gi, "")
      .replace(/<link\b(?=[^>]*\bhref=["'][^"']*\/agent-release\.json["'])[^>]*>\s*/gi, "");
    const tags = pageTags(documents, basePath).map(({ tag, attrs }) => `<${tag} ${Object.entries(attrs).map(([name, value]) => `${name}="${value}"`).join(" ")}>`).join("\n");
    html = html.replace(/<\/head\s*>/i, tags + "\n</head>");
  }
  for (const [name, content] of Object.entries(documents)) {
    const path = join(output, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  if (html !== undefined) writeFileSync(pagePath(output, page), html);
  return documents;
}

function verifyAgentDocuments({ output, page = "index.html", ...options } = {}) {
  if (!output) throw new Error("Choose the built application's output directory.");
  const basePath = normalizeBasePath(options.basePath), expected = createAgentDocuments({ ...options, basePath });
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
  const htmlPath = pagePath(output, page), html = existsSync(htmlPath) ? readFileSync(htmlPath, "utf8") : "";
  const release = JSON.parse(expected["agent-release.json"]);
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].filter(([tag]) => /\bname=["']quantive-agent-contract-set["']/i.test(tag));
  const content = metas.length === 1 ? metas[0][0].match(/\bcontent=["']([^"']+)["']/i)?.[1] : undefined;
  if (content !== release.release.contractSet) errors.push("Built page does not identify its matching agent contract set");
  if (![...html.matchAll(/<link\b[^>]*>/gi)].some(([tag]) => tag.match(/\bhref=["']([^"']+)["']/i)?.[1] === basePath + "agent-release.json")) errors.push("Built page does not link its agent release metadata");
  return { errors, files: Object.keys(expected).length, contracts: release.counts.contracts, contractSet: release.release.contractSet, source: release.release.source };
}

function agentDocumentsPlugin(options = {}) {
  let basePath = normalizeBasePath(options.basePath), isBuild = false, buildDocuments;
  const create = () => createAgentDocuments({ ...options, basePath });
  return {
    name: "quantive-agent-documents",
    configResolved(config) {
      const viteBase = normalizeBasePath(config.base);
      if (options.basePath !== undefined && basePath !== viteBase) throw new Error("Agent documentation basePath must match Vite's base path.");
      basePath = viteBase;
      isBuild = config.command === "build";
    },
    buildStart() {
      if (isBuild) {
        buildDocuments = create();
        const errors = validateDocumentSchemas(buildDocuments);
        if (errors.length) throw new Error(errors.join("\n"));
      }
    },
    transformIndexHtml() { return pageTags(buildDocuments ?? create(), basePath); },
    generateBundle() {
      for (const [fileName, source] of Object.entries(buildDocuments ?? create())) this.emitFile({ type: "asset", fileName, source });
    },
    configureServer(server) {
      buildDocuments = undefined;
      server.middlewares.use((request, response, next) => {
        if (request.method !== "GET" && request.method !== "HEAD") return next();
        const pathname = request.url?.split("?")[0];
        const name = pathname?.startsWith(basePath) ? pathname.slice(basePath.length) : pathname?.slice(1);
        if (!name || !/^(?:agent-[a-z.-]+|llms\.txt|registry\/components\.json|contracts\/[a-z0-9-]+\.json)$/.test(name)) return next();
        try {
          const content = create()[name];
          if (content === undefined) {
            response.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
            return response.end(request.method === "HEAD" ? undefined : JSON.stringify({ error: "Unknown agent document" }));
          }
          response.setHeader("Content-Type", name.endsWith(".json") ? "application/json; charset=utf-8" : "text/plain; charset=utf-8");
          response.setHeader("Cache-Control", "no-cache");
          response.setHeader("ETag", '"' + sha256(content) + '"');
          response.setHeader("Content-Length", Buffer.byteLength(content));
          response.end(request.method === "HEAD" ? undefined : content);
        } catch (error) { next(error); }
      });
    },
  };
}

export { createAgentDocuments, writeAgentDocuments, verifyAgentDocuments, validateDocumentSchemas, agentDocumentsPlugin, normalizeBasePath, sha256 };
