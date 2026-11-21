import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

export function packLiquidGlass({ output = join(root, "dist/packages") } = {}) {
  const packageRoot = join(root, "packages/liquid-glass");
  if (!existsSync(join(packageRoot, "dist/source-identity.json"))) throw new Error("Run npm run glass:package before packing.");
  mkdirSync(output, { recursive: true });
  const [result] = JSON.parse(execFileSync("npm", ["pack", packageRoot, "--ignore-scripts", "--json", "--pack-destination", output], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }));
  if (result.files.some(file => /^src\/.*\.[cm]?[jt]sx?$/.test(file.path))) throw new Error("The installable package must not depend on uncompiled source.");
  return { ...result, path: join(output, result.filename) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { const result = packLiquidGlass(); process.stdout.write(`${result.path}\n${result.files.length} files; ${result.integrity}\n`); }
  catch (error) { process.stderr.write(error.message + "\n"); process.exitCode = 1; }
}
