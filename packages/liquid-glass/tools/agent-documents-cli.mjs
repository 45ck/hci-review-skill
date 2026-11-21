#!/usr/bin/env node
import { resolve } from "node:path";
import { writeAgentDocuments, verifyAgentDocuments } from "./agent-documents.mjs";

const usage = "Usage: quantive-agent-documents <emit|check> --output <build-directory> [--base /studio/] [--page index.html]\n";
try {
  const [command, ...args] = process.argv.slice(2);
  if (command === "--help" || command === "-h") { process.stdout.write(usage); }
  else {
    if (!["emit", "check"].includes(command)) throw new Error(usage.trim());
    const options = {};
    for (let i = 0; i < args.length; i += 2) {
      const key = { "--output": "output", "--base": "basePath", "--page": "page" }[args[i]];
      if (!key || !args[i + 1] || args[i + 1].startsWith("--")) throw new Error(usage.trim());
      if (Object.hasOwn(options, key)) throw new Error(`Duplicate option ${args[i]}`);
      options[key] = args[i + 1];
    }
    if (!options.output) throw new Error(usage.trim());
    options.output = resolve(options.output);
    if (command === "emit") writeAgentDocuments(options);
    const result = verifyAgentDocuments(options);
    if (result.errors.length) throw new Error(result.errors.join("\n"));
    process.stdout.write(`Agent documentation ${command} passed: ${result.files} files, ${result.contracts} contracts; kit source ${result.source.status}.\n`);
  }
} catch (error) { process.stderr.write(error.message + "\n"); process.exitCode = 1; }
