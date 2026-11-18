import { defineConfig } from "vite";

export default defineConfig({
  build: {
    manifest: true,
    outDir: "dist",
    rollupOptions: {
      input: { index: "index.html", baseline: "baseline.html", sdk: "sdk.html" },
    },
  },
});
