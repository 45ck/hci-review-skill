import { defineConfig } from "vite";
import { createAgentDocuments, sha256 } from "../../../../scripts/agent-documents.mjs";

let buildDocuments;
let isBuild = false;

export default defineConfig({
  plugins: [{
    name: "quantive-agent-documents",
    configResolved(config) {
      isBuild = config.command === "build";
    },
    buildStart() {
      if (isBuild) buildDocuments = createAgentDocuments();
    },
    transformIndexHtml() {
      const documents = buildDocuments ?? createAgentDocuments();
      const { release } = JSON.parse(documents["agent-release.json"]);
      return [
        { tag: "meta", attrs: { name: "quantive-agent-contract-set", content: release.contractSet } },
        { tag: "link", attrs: { rel: "describedby", type: "application/json", href: "/agent-release.json", title: "Agent documentation release identity" } },
      ];
    },
    generateBundle() {
      for (const [fileName, source] of Object.entries(buildDocuments ?? createAgentDocuments())) {
        this.emitFile({ type: "asset", fileName, source });
      }
    },
    configureServer(server) {
      buildDocuments = undefined;
      server.middlewares.use((request, response, next) => {
        if (request.method !== "GET" && request.method !== "HEAD") return next();
        const name = request.url?.split("?")[0].slice(1);
        if (!name || !/^(?:agent-[a-z.-]+|llms\.txt|registry\/components\.json|contracts\/[a-z0-9-]+\.json)$/.test(name)) return next();
        try {
          const content = createAgentDocuments()[name];
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
  }],
  build: { manifest: true, chunkSizeWarningLimit: 650 },
  server: { host: "127.0.0.1", port: 4185 },
});
