import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  createAgentDocuments as createPackageDocuments,
  verifyAgentDocuments as verifyPackageDocuments,
  agentDocumentsPlugin as packageDocumentsPlugin,
} from "../packages/liquid-glass/tools/agent-documents.mjs";
export { sha256, normalizeBasePath, validateDocumentSchemas, writeAgentDocuments } from "../packages/liquid-glass/tools/agent-documents.mjs";

const defaultRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repository = "https://github.com/45ck/hci-review-skill";

export function sourceIdentity(root = defaultRoot) {
  const git = args => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  try {
    const commit = git(["rev-parse", "HEAD"]);
    const dirty = Boolean(git(["status", "--porcelain", "--untracked-files=normal"]));
    return { repository, status: dirty ? "dirty" : "clean", commit, ...(!dirty ? { tree: git(["rev-parse", "HEAD^{tree}"]) } : {}) };
  } catch { return { repository, status: "unavailable" }; }
}

function packageOptions({ root = defaultRoot, source = sourceIdentity(root), ...options } = {}) {
  return { packageRoot: join(root, "packages/liquid-glass"), source, ...options };
}

export function createAgentDocuments(options) { return createPackageDocuments(packageOptions(options)); }
export function agentDocumentsPlugin(options) { return packageDocumentsPlugin(packageOptions(options)); }
export function verifyAgentDocuments({ root = defaultRoot, output = join(root, "docs/hci/examples/liquid-glass/dist"), ...options } = {}) {
  return verifyPackageDocuments({ ...packageOptions({ root, ...options }), output });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = verifyAgentDocuments();
    if (result.errors.length) { process.stderr.write(result.errors.join("\n") + "\n"); process.exitCode = 1; }
    else process.stdout.write(`Agent documentation assets passed: ${result.files} files, ${result.contracts} individual contracts; schemas, exact content, fingerprints and page identity agree. Kit source ${result.source.status}.\n`);
  } catch (error) { process.stderr.write(error.message + "\n"); process.exitCode = 1; }
}
