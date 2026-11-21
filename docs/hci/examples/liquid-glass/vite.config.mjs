import { defineConfig } from "vite";
import { agentDocumentsPlugin } from "../../../../scripts/agent-documents.mjs";

export default defineConfig({
  resolve: { conditions: ["quantive-source", "module", "browser", "development|production"] },
  plugins: [agentDocumentsPlugin()],
  build: { manifest: true, chunkSizeWarningLimit: 650 },
  server: { host: "127.0.0.1", port: 4185 },
});
