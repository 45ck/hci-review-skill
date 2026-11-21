import { readFileSync } from "node:fs";

const registry = JSON.parse(readFileSync(new URL("../packages/liquid-glass/agent-contracts.json", import.meta.url), "utf8"));
const args = process.argv.slice(2);
const [command, ...terms] = args;
if (command === "--help") {
  process.stdout.write("npm run glass:contract -- <id>\nnpm run glass:contract -- --search <words>\nOmit arguments for the compact component index. Reads contracts; never operates an interface.\n");
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
