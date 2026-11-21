import { readFileSync } from "node:fs";
import { actionSchemaDocumentIssues, validateAgentActionInput } from "./agent-action-validation.mjs";

const registry = JSON.parse(readFileSync(new URL("../packages/liquid-glass/agent-contracts.json", import.meta.url), "utf8"));
const args = process.argv.slice(2);
const [command, ...terms] = args;
if (command === "--help") {
  process.stdout.write("npm run glass:contract -- <id>\nnpm run glass:contract -- --search <words>\nnpm run glass:contract -- validate <id> <action> '<JSON args array>'\nExample: npm run glass:contract -- validate liquid-viewport panBy '[80,-40]'\nOmit arguments for the compact component index. Reads contracts and validates supported custom action shapes; never operates an interface. Validation does not establish authorization, current-state validity or host acceptance.\n");
} else if (command === "validate") {
  const [contract, action, serialized] = terms;
  try {
    if (terms.length !== 3) throw new Error("Use validate <id> <action> '<JSON args array>'.");
    const schemas = JSON.parse(readFileSync(new URL("../packages/liquid-glass/agent-action-inputs.json", import.meta.url), "utf8"));
    const problems = actionSchemaDocumentIssues(schemas);
    if (problems.length) throw new Error(`Invalid action schema: ${problems.join("; ")}`);
    const result = validateAgentActionInput(schemas, contract, action, JSON.parse(serialized));
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    if (!result.ok) process.exitCode = 1;
  } catch (error) {
    process.stdout.write(JSON.stringify({ ok: false, scope: "structural-preflight", contract, action, issues: [error.message], next: "No interface action was performed." }, null, 2) + "\n");
    process.exitCode = 1;
  }
} else if (!command || command === "--search") {
  const words = terms.join(" ").toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const entries = registry.entries.filter(entry => words.every(word =>
    [entry.id, entry.kind, entry.purpose, ...entry.useWhen, ...entry.exports.flatMap(binding => [binding.path, ...binding.symbols])]
      .join(" ").toLocaleLowerCase().includes(word)));
  process.stdout.write(JSON.stringify(entries.map(({ id, kind, purpose, exports: bindings }) => ({ id, kind, purpose, exports: bindings })), null, 2) + "\n");
} else {
  const entry = args.length === 1 ? registry.entries.find(entry => entry.id === command) : undefined;
  if (!entry) {
    process.stderr.write("Unknown contract or unsupported arguments. Use --search <words> or --help.\n");
    process.exitCode = 1;
  } else {
    process.stdout.write(JSON.stringify({
      schemaVersion: registry.schemaVersion,
      package: registry.package,
      sdk: registry.sdk,
      policies: Object.fromEntries(entry.policies.map(id => [id, registry.policies[id]])),
      entry,
    }, null, 2) + "\n");
  }
}
