import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { buildLiquidGlass } from "./build-liquid-glass.mjs";
import { packLiquidGlass } from "./pack-liquid-glass.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const flags = new Set(process.argv.slice(2));
for (const flag of flags) if (!["--online", "--skip-optional"].includes(flag)) throw new Error(`Unknown consumer check option ${flag}`);
const resultDirectory = join(root, "test-results");
mkdirSync(resultDirectory, { recursive: true });
const reportPath = join(resultDirectory, "package-consumer.json");
const directory = mkdtempSync(join(dirname(root), "quantive-installed-consumer-"));
const log = [];
const run = (command, args) => {
  log.push(`$ ${command} ${args.join(" ")}`);
  try {
    const output = execFileSync(command, args, { cwd: directory, encoding: "utf8", maxBuffer: 16 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
    log.push(output);
    return output;
  } catch (error) {
    log.push(error.stdout?.toString() ?? "", error.stderr?.toString() ?? "");
    throw new Error(`${command} ${args.join(" ")} failed:\n${error.stdout?.toString() ?? ""}${error.stderr?.toString() ?? ""}`);
  }
};

try {
  const built = buildLiquidGlass();
  const packed = packLiquidGlass();
  cpSync(join(root, "tests/fixtures/liquid-glass-consumer"), directory, { recursive: true });
  cpSync(join(root, "docs/hci/examples/liquid-glass/src/starter-template.tsx"), join(directory, "src/copied-starter.tsx"));
  const packagePath = join(directory, "package.json"), pkg = JSON.parse(readFileSync(packagePath, "utf8"));
  pkg.dependencies["@quantitative-hci/liquid-glass"] = "file:" + packed.path;
  writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n");
  const installFlags = ["--ignore-scripts", "--no-audit", "--no-fund", "--fetch-retries=0", "--fetch-timeout=20000", ...(flags.has("--online") ? [] : ["--offline"])];
  run("npm", ["install", ...installFlags]);
  const installed = join(directory, "node_modules/@quantitative-hci/liquid-glass");
  assert(!lstatSync(installed).isSymbolicLink(), "Consumer must install the tarball, not a workspace link.");
  assert.notEqual(realpathSync(installed), realpathSync(join(root, "packages/liquid-glass")));
  assert(!existsSync(join(installed, "src/webgpu.tsx")), "The package must not require raw JSX compilation.");
  const optionalPeers = ["ai", "@ag-ui/core", "openai", "@anthropic-ai/sdk"];
  for (const name of optionalPeers) assert(!existsSync(join(directory, "node_modules", name)), `Base consumer unexpectedly installed optional peer ${name}`);
  const resolution = JSON.parse(run(process.execPath, ["--input-type=module", "-e", `
    import {createRequire} from 'node:module';
    import {fileURLToPath} from 'node:url';
    const fromApp=createRequire(process.cwd()+'/package.json');
    const fromKit=createRequire(fileURLToPath(import.meta.resolve('@quantitative-hci/liquid-glass/webgpu')));
    console.log(JSON.stringify({provider:import.meta.resolve('@quantitative-hci/liquid-glass/webgpu'),
      shared:['react','@ui-sdk/core','@ui-sdk/react/agent'].every(name=>fromApp.resolve(name)===fromKit.resolve(name))}));
  `]));
  assert(resolution.provider.endsWith("/dist/src/webgpu.js"));
  assert(resolution.shared, "The app and kit must share React and the SDK registry.");
  run("npm", ["run", "build"]);
  const release = JSON.parse(readFileSync(join(directory, "dist/agent-release.json"), "utf8"));
  assert.equal(release.release.packageVersion, built.version);
  assert.deepEqual(release.release.source, built.source);
  assert.equal(release.resources.index, "/studio/agent-index.json");
  const canonicalBytes = readFileSync(join(directory, "dist/agent-index.json"));
  writeFileSync(join(directory, "dist/agent-index.json"), "{}\n");
  let staleRejected = false;
  try { run("npm", ["exec", "--", "quantive-agent-documents", "check", "--output", "dist", "--base", "/studio/"]); }
  catch (error) { staleRejected = /differs from canonical inputs: agent-index.json/.test(error.message); }
  finally { writeFileSync(join(directory, "dist/agent-index.json"), canonicalBytes); }
  assert(staleRejected, "The installed production documentation check must reject stale output.");
  const checks = ["tarball installation outside the repository", "compiled ESM and declarations", "one React/SDK registry", "provider, icons, viewport and compositions build", "base app without optional provider peers", "prefix-aware docs and stale output rejection", "exact copied starter compiles"];
  if (!flags.has("--skip-optional")) {
    const kit = JSON.parse(readFileSync(join(installed, "package.json"), "utf8"));
    const declarationPeers = JSON.parse(readFileSync(join(directory, "optional-dev-dependencies.json"), "utf8"));
    run("npm", ["install", "--save-dev", ...optionalPeers.map(name => `${name}@${kit.peerDependencies[name].replace(/^\^/, "")}`),
      ...Object.entries(declarationPeers).map(([name, version]) => `${name}@${version}`), ...installFlags]);
    run(process.execPath, ["node_modules/typescript/bin/tsc", "--project", "tsconfig.optional.json", "--noEmit"]);
    run(process.execPath, ["--input-type=module", "-e", `
      for (const entry of ['ai-sdk','ag-ui','openai','anthropic']) {
        const module=await import('@quantitative-hci/liquid-glass/chat/'+entry);
        if (!Object.values(module).some(value=>typeof value==='function')) throw new Error('Missing adapter '+entry);
      }
    `]);
    checks.push("all four optional adapter subpaths typecheck and import with their declared peers");
  }
  const report = { directory, tarball: packed.path, packageVersion: built.version, packageIntegrity: packed.integrity,
    kitSource: built.source, basePath: "/studio/", checks, browserStatus: "not-run", generatedAt: new Date().toISOString() };
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  process.stdout.write(`Installed consumer passed ${checks.length} checks in ${directory}\nReport: ${relative(root, reportPath)}\nBrowser acceptance: npm run glass:consumer:browser\n`);
} catch (error) {
  process.stderr.write(error.message + `\nConsumer retained at ${directory}\n`);
  process.exitCode = 1;
} finally {
  writeFileSync(join(resultDirectory, "package-consumer-build.log"), log.join("\n"));
}
