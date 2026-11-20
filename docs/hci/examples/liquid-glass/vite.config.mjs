import { defineConfig } from "vite";
export default defineConfig({
  build: { manifest: true, chunkSizeWarningLimit: 650 },
  server: { host: "127.0.0.1", port: 4185 },
});
