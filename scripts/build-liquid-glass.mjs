import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseSync } from "rolldown/utils";
import { sourceIdentity } from "./agent-documents.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const packageRoot = join(root, "packages/liquid-glass");
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);

function rewriteModule(file) {
  let code = readFileSync(file, "utf8");
  const declaration = file.endsWith(".d.ts"), parsed = parseSync(file, code, { lang: declaration ? "ts" : "js" });
  if (parsed.errors.length) throw new Error(`Cannot parse compiled module ${file}: ${parsed.errors.map(error => error.message).join("; ")}`);
  const edits = [];
  const visit = node => {
    const source = ["ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration", "ImportExpression", "TSImportType"].includes(node.type) ? node.source : undefined;
    if (source?.type === "Literal" && typeof source.value === "string" && source.value.startsWith(".")) {
      const specifier = source.value, target = resolve(dirname(file), specifier);
      let emitted = specifier;
      if (!extname(specifier)) {
        if (existsSync(target + ".js")) emitted += ".js";
        else if (existsSync(join(target, "index.js"))) emitted += "/index.js";
        else throw new Error(`Unresolved compiled relative import ${specifier} in ${file}`);
      } else if (!existsSync(target)) throw new Error(`Unresolved compiled asset ${specifier} in ${file}`);
      if (emitted !== specifier) edits.push({ start: source.start, end: source.end, value: JSON.stringify(emitted) });
      if (!declaration && node.type === "ImportDeclaration" && emitted.endsWith(".json") && !node.attributes?.length) {
        edits.push({ start: source.end, end: source.end, value: ' with { type: "json" }' });
      }
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(child => { if (child?.type) visit(child); });
      else if (value?.type) visit(value);
    }
  };
  visit(parsed.program);
  for (const edit of edits.sort((a, b) => b.start - a.start)) code = code.slice(0, edit.start) + edit.value + code.slice(edit.end);
  const source = join(packageRoot, relative(join(packageRoot, "dist"), file)).replace(/\.js$/, ".tsx");
  // Compile JSX at the package boundary; keep client components explicit for consumers.
  if (!declaration && existsSync(source) && !/^\s*["']use client["'];/.test(code)) code = '"use client";\n\n' + code;
  if (declaration && /\bGPU[A-Za-z]/.test(code)) code = '/// <reference types="@webgpu/types" />\n' + code;
  if (parseSync(file, code, { lang: declaration ? "ts" : "js" }).errors.length) throw new Error(`Invalid emitted module ${file}`);
  writeFileSync(file, code);
}

export function buildLiquidGlass() {
  const pkg = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
  const output = join(packageRoot, "dist"), source = sourceIdentity(root);
  rmSync(output, { recursive: true, force: true });
  execFileSync(process.execPath, [join(root, "node_modules/typescript/bin/tsc"), "--project", join(packageRoot, "tsconfig.build.json")], { cwd: root, stdio: "inherit" });
  for (const path of walk(join(packageRoot, "src"))) {
    if (/\.[cm]?[jt]sx?$/.test(path)) continue;
    const target = join(output, relative(packageRoot, path));
    mkdirSync(dirname(target), { recursive: true });
    cpSync(path, target);
  }
  for (const path of walk(output).filter(path => path.endsWith(".js") || path.endsWith(".d.ts"))) rewriteModule(path);
  for (const [entry, conditions] of Object.entries(pkg.exports)) {
    for (const [condition, target] of Object.entries(typeof conditions === "string" ? { default: conditions } : conditions)) {
      if (condition === "quantive-source") continue;
      const path = join(packageRoot, target);
      if (entry.includes("*")) {
        const directory = dirname(path), extension = path.slice(path.indexOf("*") + 1);
        if (!existsSync(directory) || !readdirSync(directory).some(name => name.endsWith(extension))) throw new Error(`Missing compiled wildcard export ${entry}`);
      } else if (!existsSync(path) || !statSync(path).isFile()) throw new Error(`Missing ${condition} package export ${entry}: ${target}`);
    }
  }
  writeFileSync(join(output, "source-identity.json"), JSON.stringify({ packageVersion: pkg.version, source }, null, 2) + "\n");
  const files = walk(output);
  process.stdout.write(`Private Liquid Glass ${pkg.version} built: ${files.filter(path => path.endsWith(".js")).length} ESM modules, ${files.filter(path => path.endsWith(".d.ts")).length} declarations, bundled CSS/assets and ${source.status} kit provenance.\n`);
  return { output, version: pkg.version, source };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { buildLiquidGlass(); }
  catch (error) { process.stderr.write(error.message + "\n"); process.exitCode = 1; }
}
