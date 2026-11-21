import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
export default defineConfig({
  plugins: [{
    name: "quantive-agent-registry",
    generateBundle() {
      const readPackage = file => readFileSync(new URL(`../../../../packages/liquid-glass/${file}`, import.meta.url), "utf8");
      const foundation = JSON.parse(readPackage("component-manifest.json"));
      const custom = JSON.parse(readPackage("custom-component-manifest.json"));
      const recipes = JSON.parse(readPackage("component-recipes.json"));
      this.emitFile({ type: "asset", fileName: "registry/components.json", source: JSON.stringify({ ...recipes, sdkComponents: foundation.components, customComponents: custom.components }, null, 2) + "\n" });
      this.emitFile({ type: "asset", fileName: "llms.txt", source: readPackage("docs/llms.txt") });
    },
  }],
  build: { manifest: true, chunkSizeWarningLimit: 650 },
  server: { host: "127.0.0.1", port: 4185 },
});
