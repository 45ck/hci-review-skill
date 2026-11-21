import { defineConfig } from "vite";
import { agentDocumentsPlugin } from "@quantitative-hci/liquid-glass/agent-documents";

export default defineConfig({
  base: "/studio/",
  plugins: [agentDocumentsPlugin()],
  build: { chunkSizeWarningLimit: 650 },
});
