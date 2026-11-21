import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseSync } from "rolldown/utils";

const defaultRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packagePath = "packages/liquid-glass";
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const posix = (path) => path.split(sep).join("/");
const sorted = (values) => [...values].sort();
const equalSet = (left, right) => JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));
const walk = (path) => existsSync(path) ? readdirSync(path, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(join(path, entry.name)) : [join(path, entry.name)]) : [];
const names = (node) => !node ? [] : node.type === "Identifier" ? [node.name] : node.type === "ObjectPattern" ? node.properties.flatMap((item) => names(item.value ?? item.argument)) : node.type === "ArrayPattern" ? node.elements.flatMap(names) : node.type === "AssignmentPattern" ? names(node.left) : node.type === "RestElement" ? names(node.argument) : [];
const codeFile = (path) => /\.[cm]?[jt]sx?$/.test(path);
const localModule = (from, specifier) => {
  const base = resolve(dirname(from), specifier);
  return [base, ...[".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".mjs", ".cjs"].flatMap((extension) => [base + extension, join(base, "index" + extension)])].find((path) => existsSync(path) && statSync(path).isFile() && codeFile(path));
};
const parse = (path) => {
  const lang = path.endsWith(".tsx") ? "tsx" : path.endsWith(".jsx") ? "jsx" : /\.[cm]?ts$/.test(path) ? "ts" : "js";
  const result = parseSync(path, readFileSync(path, "utf8"), { lang });
  if (result.errors.length) throw new Error(`Cannot parse ${path}: ${result.errors.map((error) => error.message).join("; ")}`);
  return result.program;
};
const property = (object, name) => object?.properties?.find((item) => (item.key?.name ?? item.key?.value) === name)?.value;
const stringArray = (node) => node?.type === "ArrayExpression" && node.elements.every((item) => item?.type === "Literal" && typeof item.value === "string") ? node.elements.map((item) => item.value) : null;
const visitChildren = (node, callback) => { for (const value of Object.values(node)) { if (Array.isArray(value)) value.forEach((item) => { if (item?.type) callback(item); }); else if (value?.type) callback(value); } };

function schemaErrors(schema, value, location = "$", document = schema) {
  if (schema.$ref) return schemaErrors(schema.$ref.slice(2).split("/").reduce((item, key) => item[key], document), value, location, document);
  const errors = [];
  const fail = (message) => errors.push(`${location}: ${message}`);
  if (schema.const !== undefined && value !== schema.const) fail(`expected ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) fail(`expected one of ${schema.enum.join(", ")}`);
  if (schema.type) {
    const actual = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
    if (actual !== schema.type && !(schema.type === "integer" && Number.isInteger(value))) { fail(`expected ${schema.type}`); return errors; }
  }
  if (typeof value === "string") {
    if (schema.minLength && value.trim().length < schema.minLength) fail("must not be empty");
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) fail(`must match ${schema.pattern}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems && value.length < schema.minItems) fail(`needs at least ${schema.minItems} item(s)`);
    if (schema.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) fail("items must be unique");
    value.forEach((item, index) => { if (schema.items) errors.push(...schemaErrors(schema.items, item, `${location}[${index}]`, document)); });
  } else if (value && typeof value === "object") {
    for (const key of schema.required ?? []) if (!Object.hasOwn(value, key)) fail(`missing ${key}`);
    for (const [key, item] of Object.entries(value)) {
      if (schema.properties?.[key]) errors.push(...schemaErrors(schema.properties[key], item, `${location}.${key}`, document));
      else if (schema.additionalProperties === false) fail(`unknown field ${key}`);
      else if (schema.additionalProperties && typeof schema.additionalProperties === "object") errors.push(...schemaErrors(schema.additionalProperties, item, `${location}.${key}`, document));
    }
  }
  return errors;
}

function collectPublicApi(root = defaultRoot) {
  const pkg = readJson(join(root, packagePath, "package.json"));
  const memo = new Map();
  const get = (path, active = new Set()) => {
    if (memo.has(path)) return memo.get(path);
    if (active.has(path)) throw new Error(`Circular public re-export: ${relative(root, path)}`);
    const next = new Set(active).add(path), tree = parse(path), values = new Map(), result = new Map(), types = new Set();
    const addDeclaration = (statement, target) => {
      if (!statement || statement.declare) return;
      if (["FunctionDeclaration", "ClassDeclaration", "TSEnumDeclaration"].includes(statement.type) && statement.id) target.set(statement.id.name, { source: posix(relative(root, path)), symbol: statement.id.name });
      if (statement.type === "VariableDeclaration") for (const item of statement.declarations) for (const name of names(item.id)) target.set(name, { source: posix(relative(root, path)), symbol: name });
    };
    for (const statement of tree.body) {
      const declaration = statement.declaration ?? statement;
      addDeclaration(declaration, values);
      if (["TSInterfaceDeclaration", "TSTypeAliasDeclaration"].includes(declaration.type)) types.add(declaration.id.name);
      if (statement.type === "ImportDeclaration") for (const specifier of statement.specifiers) {
        if (statement.importKind === "type" || specifier.importKind === "type") { types.add(specifier.local.name); continue; }
        const target = statement.source.value.startsWith(".") && localModule(path, statement.source.value);
        if (!target) { values.set(specifier.local.name, { source: posix(relative(root, path)), symbol: specifier.local.name, external: true }); continue; }
        const imported = specifier.type === "ImportSpecifier" ? specifier.imported.name ?? specifier.imported.value : specifier.type === "ImportDefaultSpecifier" ? "default" : "*";
        const found = get(target, next).get(imported);
        if (found) values.set(specifier.local.name, found);
        else if (specifier.type === "ImportNamespaceSpecifier") values.set(specifier.local.name, { source: posix(relative(root, path)), symbol: specifier.local.name, namespace: true });
        else values.set(specifier.local.name, { unresolved: true });
      }
    }
    for (const statement of tree.body) {
      if (statement.type === "ExportDefaultDeclaration") throw new Error(`Default public exports need an explicit named contract in ${relative(root, path)}; use named exports.`);
      if (!["ExportNamedDeclaration", "ExportAllDeclaration"].includes(statement.type) || statement.exportKind === "type") continue;
      if (statement.type === "ExportAllDeclaration" && statement.exported) throw new Error(`Namespace public exports need an explicit named contract in ${relative(root, path)}; use named exports.`);
      addDeclaration(statement.declaration, result);
      let available = values;
      if (statement.source) {
        const specifier = statement.source.value;
        if (!specifier.startsWith(".")) { result.set("*", { source: posix(relative(root, path)), upstream: specifier }); continue; }
        const target = localModule(path, specifier);
        if (!target) throw new Error(`Unresolved public re-export ${specifier} from ${relative(root, path)}`);
        available = get(target, next);
      }
      if (statement.type === "ExportAllDeclaration") for (const [name, record] of available) result.set(name, record);
      else for (const item of statement.specifiers) {
        if (item.exportKind === "type" || types.has(item.local.name)) continue;
        const found = available.get(item.local.name);
        if (!found || found.unresolved) throw new Error(`Unresolved exported value ${item.local.name} in ${relative(root, path)}; mark type exports explicitly.`);
        if (found.namespace || found.external) throw new Error(`Exported import ${item.local.name} in ${relative(root, path)} needs an explicit local implementation or dedicated SDK re-export.`);
        result.set(item.exported.name ?? item.exported.value, found);
      }
    }
    memo.set(path, result);
    return result;
  };
  const modules = new Map();
  for (const [subpath, target] of Object.entries(pkg.exports)) {
    if (target === null) continue;
    if (typeof target !== "string") throw new Error(`Conditional or array public exports need explicit inventory support: ${subpath}`);
    if (/\.(?:css|json|md|txt)$/.test(target)) {
      if (!subpath.includes("*") && (!existsSync(join(root, packagePath, target)) || !statSync(join(root, packagePath, target)).isFile())) throw new Error(`Unresolved public metadata ${subpath}: ${target}`);
      continue;
    }
    if (!/\.[cm]?[jt]sx?$/.test(target)) throw new Error(`Unsupported public export target ${subpath}: ${target}`);
    if (subpath.includes("*")) {
      const directory = dirname(join(root, packagePath, target));
      for (const file of walk(directory).filter((item) => extname(item) === extname(target))) {
        const part = file.slice(directory.length + 1, -extname(target).length);
        const expanded = subpath.replace("*", posix(part));
        if (!Object.hasOwn(pkg.exports, expanded)) modules.set(`${pkg.name}${expanded.slice(1)}`, { source: posix(relative(root, file)), exports: get(file) });
      }
    } else {
      const file = join(root, packagePath, target);
      modules.set(`${pkg.name}${subpath === "." ? "" : subpath.slice(1)}`, { source: posix(relative(root, file)), exports: get(file) });
    }
  }
  return modules;
}

function validateAgentContracts({ root = defaultRoot, manifest = readJson(join(root, packagePath, "agent-contracts.json")), schema = readJson(join(root, packagePath, "agent-contracts.schema.json")) } = {}) {
  const errors = schemaErrors(schema, manifest);
  if (errors.length) return { errors, counts: {} };
  const pkg = readJson(join(root, packagePath, "package.json"));
  const api = collectPublicApi(root), covered = new Map(), primitiveClaims = new Map();
  const fail = (id, message) => errors.push(`${id}: ${message}`);
  const safeFile = (path) => {
    if (path.includes("\\") || path.startsWith("/") || path.split("/").includes("..")) return false;
    return existsSync(join(root, path)) && statSync(join(root, path)).isFile();
  };
  if (manifest.package !== pkg.name) fail("package", "manifest package differs from package.json");
  for (const name of ["@ui-sdk/core", "@ui-sdk/react"]) if (pkg.dependencies[name] !== manifest.sdk.version) fail("sdk", `${name} must use the exact manifest version`);
  const sdkImports = (files, visited = new Set(), result = new Set()) => {
    for (const path of files) {
      if (visited.has(path) || !safeFile(path) || !codeFile(path)) continue;
      visited.add(path);
      for (const node of parse(join(root, path)).body) {
        if (node.type !== "ImportDeclaration" && node.type !== "ExportAllDeclaration" && node.type !== "ExportNamedDeclaration") continue;
        const specifier = node.source?.value;
        if (specifier?.startsWith("@ui-sdk/")) result.add(specifier);
        else if (specifier?.startsWith(".")) {
          const local = localModule(join(root, path), specifier);
          if (local) sdkImports([posix(relative(root, local))], visited, result);
        }
      }
    }
    return result;
  };
  const sdkEntry = (specifier) => {
    const matched = /^@ui-sdk\/(core|react)(?:\/(.+))?$/.exec(specifier);
    if (!matched) return false;
    const base = join(root, "node_modules/@ui-sdk", matched[1]), path = join(base, "package.json");
    if (!existsSync(path)) return false;
    const installed = readJson(path);
    if (installed.version !== manifest.sdk.version) return false;
    const exported = installed.exports?.[matched[2] ? `./${matched[2]}` : "."];
    const target = typeof exported === "string" ? exported : exported?.default ?? exported?.import;
    return typeof target === "string" && existsSync(join(base, target)) && statSync(join(base, target)).isFile();
  };
  const ids = new Set();
  for (const entry of manifest.entries) {
    if (ids.has(entry.id)) fail(entry.id, "duplicate entry ID");
    ids.add(entry.id);
    for (const path of [...entry.sources, ...entry.docs, ...entry.evidence.map((item) => item.path)]) if (!safeFile(path)) fail(entry.id, `unresolved repository reference ${path}`);
    for (const path of entry.sources) if (!/\.[cm]?[jt]sx?$/.test(path)) fail(entry.id, `implementation source must be a code file: ${path}`);
    for (const item of entry.evidence) if (!/\.(?:[cm]?[jt]sx?|py)$/.test(item.path)) fail(entry.id, `evidence must identify an executable check or test source: ${item.path}`);
    for (const policy of entry.policies) if (!Object.hasOwn(manifest.policies, policy)) fail(entry.id, `unknown policy ${policy}`);
    for (const item of entry.exports) {
      const module = api.get(item.path);
      if (!module) { fail(entry.id, `unresolved public module ${item.path}`); continue; }
      for (const name of item.symbols) {
        const key = `${item.path}#${name}`, found = module.exports.get(name);
        if (covered.has(key)) fail(entry.id, `duplicate public coverage ${key}`);
        covered.set(key, entry.id);
        if (!found) fail(entry.id, `unresolved public symbol ${key}`);
        else if (!entry.sources.includes(found.source)) fail(entry.id, `missing implementation source ${found.source} for ${name}`);
      }
      if (entry.kind.startsWith("sdk-")) {
        const tree = parse(join(root, module.source));
        const statement = tree.body[0];
        const expected = entry.runtime.upstream;
        if (!sdkEntry(expected ?? "")) fail(entry.id, `unresolved installed SDK public entry ${expected}`);
        if (tree.body.length !== 1 || statement.type !== "ExportAllDeclaration" || statement.exported || statement.source?.value !== expected || !expected?.startsWith("@ui-sdk/")) fail(entry.id, "SDK compatibility entries must stay one exact upstream export-all declaration");
        if (!equalSet(item.symbols, ["*"])) fail(entry.id, "SDK aliases inherit their entire upstream public contract");
        if (entry.runtime.actions.length) fail(entry.id, "SDK aliases must discover inherited actions instead of copying an action catalogue");
      } else if (item.symbols.includes("*")) fail(entry.id, "custom public symbols must be explicit");
    }
    if (["presentation", "decoration", "provider", "pure-utility", "host-hook"].includes(entry.kind) && (entry.runtime.actions.length || !["dom", "none"].includes(entry.runtime.discovery))) fail(entry.id, "passive and host-only APIs cannot claim SDK actions or discovery");
    if (entry.kind === "composition" && (entry.runtime.discovery !== "sdk-children" || !entry.runtime.controls?.length)) fail(entry.id, "compositions must name their actual SDK child-control route");
    if (entry.kind === "composition" && entry.runtime.actions.length) fail(entry.id, "compositions discover child actions and cannot claim their own root actions");
    if (entry.kind !== "primitive" && (entry.runtime.primitive || entry.runtime.actionParameters)) fail(entry.id, "only custom primitives can declare a primitive binding or action parameters");
    if (entry.kind === "primitive" && (entry.runtime.discovery !== "sdk" || !entry.runtime.primitive)) fail(entry.id, "custom primitives need a real SDK primitive binding");
    for (const control of entry.runtime.controls ?? []) {
      if (!sdkEntry(control)) fail(entry.id, `unresolved installed SDK public entry ${control}`);
      if (!sdkImports(entry.sources).has(control)) fail(entry.id, `declared SDK control ${control} is not imported by its implementation graph`);
    }
    if (entry.runtime.actionParameters && !equalSet(Object.keys(entry.runtime.actionParameters), entry.runtime.actions)) fail(entry.id, "action parameter keys must match declared actions");
    if (entry.kind === "primitive" && !equalSet(entry.runtime.actions, entry.runtime.primitive.actions)) fail(entry.id, "public action list differs from its primitive binding");
    if (entry.runtime.primitive) {
      const binding = entry.runtime.primitive;
      const key = `${binding.source}#${binding.symbol}`;
      if (!entry.sources.includes(binding.source)) fail(entry.id, "primitive definition must be an implementation source");
      if (primitiveClaims.has(key)) fail(entry.id, `duplicate primitive binding ${key}`);
      primitiveClaims.set(key, { entry, binding });
    }
    if (entry.validation === "upstream-foundation" && !entry.kind.startsWith("sdk-")) fail(entry.id, "custom APIs cannot inherit upstream validation status");
    if (entry.kind.startsWith("sdk-") && entry.validation !== "upstream-foundation") fail(entry.id, "SDK provenance must remain explicit");
  }
  for (const [path, module] of api) for (const name of module.exports.keys()) if (!covered.has(`${path}#${name}`)) fail("coverage", `undocumented public export ${path}#${name}`);
  const foundPrimitives = new Set();
  for (const path of walk(join(root, packagePath, "src")).filter(codeFile)) {
    const source = posix(relative(root, path)), tree = parse(path), primitiveNames = new Set(), primitiveNamespaces = new Set();
    for (const node of tree.body) if (node.type === "ImportDeclaration" && node.source.value === "@ui-sdk/core") for (const item of node.specifiers) {
      if (item.type === "ImportSpecifier" && item.imported.name === "definePrimitive") primitiveNames.add(item.local.name);
      if (item.type === "ImportNamespaceSpecifier") primitiveNamespaces.add(item.local.name);
    }
    const isPrimitive = (node) => node?.type === "Identifier" && primitiveNames.has(node.name) || node?.type === "MemberExpression" && primitiveNamespaces.has(node.object.name) && node.property.name === "definePrimitive";
    const globalTarget = (node) => node?.type === "Identifier" ? ["window", "globalThis"].includes(node.name) : node?.type === "MemberExpression" && globalTarget(node.object);
    const visit = (node) => {
      if (node.type === "ImportDeclaration" && node.source.value.includes("@ui-sdk/core/internal")) fail(source, "use documented SDK public imports");
      if (node.type === "VariableDeclarator" && node.id.type === "Identifier" && node.init?.type === "CallExpression" && isPrimitive(node.init.callee)) {
        const key = `${source}#${node.id.name}`, claim = primitiveClaims.get(key), definition = node.init.arguments[0];
        foundPrimitives.add(key);
        if (!claim) fail(source, `undocumented custom primitive ${node.id.name}`);
        else {
          const name = property(definition, "name"), actions = stringArray(property(property(definition, "agent"), "actions"));
          if (name?.value !== claim.binding.name) fail(claim.entry.id, "primitive runtime name differs from its contract");
          if (!actions || !equalSet(actions, claim.binding.actions)) fail(claim.entry.id, "primitive agent.actions drifted from the contract");
        }
      }
      if (node.type === "JSXOpeningElement" && node.name.type === "JSXIdentifier") {
        const tag = node.name.name;
        if (/^[a-z]/.test(tag)) {
          const attrs = node.attributes.filter((item) => item.type === "JSXAttribute").map((item) => item.name.name);
          if (["button", "input", "select", "textarea"].includes(tag) || attrs.some((name) => ["onClick", "onDoubleClick", "onChange", "onInput", "onKeyDown", "onPointerDown", "contentEditable"].includes(name))) fail(source, `intrinsic <${tag}> interaction bypasses SDK discovery; use a documented SDK part or primitive`);
        }
      }
      if (node.type === "AssignmentExpression" && node.operator === "=" && node.left.type === "MemberExpression" && globalTarget(node.left)) fail(source, "package global mutation APIs bypass the SDK policy; keep application state on documented primitives/callbacks");
      if (node.type === "CallExpression" && node.callee.type === "MemberExpression" && node.callee.object.name === "Object" && ["defineProperty", "defineProperties", "assign"].includes(node.callee.property.name) && globalTarget(node.arguments[0])) fail(source, "package global mutation APIs bypass the SDK policy; expose documented primitives instead");
      visitChildren(node, visit);
    };
    visit(tree);
  }
  for (const [key, claim] of primitiveClaims) if (!foundPrimitives.has(key)) fail(claim.entry.id, `no definePrimitive implementation for ${key}`);
  return { errors, counts: { entries: manifest.entries.length, publicModules: api.size, publicExports: [...api.values()].reduce((sum, item) => sum + item.exports.size, 0), sdkFamilies: manifest.entries.filter((entry) => entry.kind === "sdk-family").length, customPrimitives: foundPrimitives.size } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = validateAgentContracts();
    if (result.errors.length) { process.stderr.write(`Agent component contract failed (${result.errors.length}):\n${result.errors.map((error) => `- ${error}`).join("\n")}\n`); process.exitCode = 1; }
    else process.stdout.write(`Agent component contract passed: ${result.counts.entries} entries, ${result.counts.publicModules} public modules, ${result.counts.publicExports} public export bindings, ${result.counts.sdkFamilies} SDK families and ${result.counts.customPrimitives} custom primitives. Static coverage only; runtime outcomes require browser evidence.\n`);
  } catch (error) { process.stderr.write(`Agent component contract could not run: ${error.message}\n`); process.exitCode = 1; }
}

export { collectPublicApi, schemaErrors, validateAgentContracts };
