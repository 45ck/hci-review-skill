import { defineConfig } from "vite";
import { readFileSync } from "node:fs";

const agentDocuments = {
  "llms.txt": "docs/llms.txt",
  "agent-engineering.md": "docs/agent-engineering.md",
  "agent-contracts.json": "agent-contracts.json",
  "agent-contracts.schema.json": "agent-contracts.schema.json",
};
const readAgentDocument = (path) => readFileSync(new URL(`../../../../packages/liquid-glass/${path}`, import.meta.url), "utf8");
const agentContractAssets = () => {
  const registry = JSON.parse(readAgentDocument("agent-contracts.json"));
  const foundation = JSON.parse(readAgentDocument("component-manifest.json"));
  const custom = JSON.parse(readAgentDocument("custom-component-manifest.json"));
  const recipes = JSON.parse(readAgentDocument("component-recipes.json"));
  return {
    "registry/components.json": JSON.stringify({ ...recipes, sdkComponents: foundation.components, customComponents: custom.components }, null, 2) + "\n",
    "agent-index.json": JSON.stringify({
      schemaVersion: registry.schemaVersion,
      package: registry.package,
      sdk: registry.sdk,
      entries: registry.entries.map(({ id, kind, purpose, exports: bindings }) => ({
        id, kind, purpose, exports: bindings, contract: `/contracts/${id}.json`,
      })),
    }, null, 2),
    ...Object.fromEntries(registry.entries.map(entry => [`contracts/${entry.id}.json`, JSON.stringify({
      schemaVersion: registry.schemaVersion,
      package: registry.package,
      sdk: registry.sdk,
      policies: Object.fromEntries(entry.policies.map(id => [id, registry.policies[id]])),
      entry,
    }, null, 2)])),
  };
};

export default defineConfig({
  plugins: [{
    name: "quantive-agent-documents",
    generateBundle() {
      for (const [fileName, path] of Object.entries(agentDocuments)) {
        this.emitFile({ type: "asset", fileName, source: readAgentDocument(path) });
      }
      for (const [fileName, source] of Object.entries(agentContractAssets())) {
        this.emitFile({ type: "asset", fileName, source });
      }
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const name = request.url?.split("?")[0].slice(1);
        if (!name) return next();
        const contract = name === "agent-index.json" || name === "registry/components.json" || /^contracts\/[a-z0-9-]+\.json$/.test(name)
          ? agentContractAssets()[name] : undefined;
        if (!contract && !Object.hasOwn(agentDocuments, name)) return next();
        response.setHeader("Content-Type", name.endsWith(".json") ? "application/json; charset=utf-8" : "text/plain; charset=utf-8");
        response.end(contract ?? readAgentDocument(agentDocuments[name]));
      });
    },
  }],
  build: { manifest: true, chunkSizeWarningLimit: 650 },
  server: { host: "127.0.0.1", port: 4185 },
});
