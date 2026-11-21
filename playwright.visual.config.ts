import { defineConfig } from "@playwright/test";
import type { ChromaticConfig } from "@chromatic-com/playwright";

const origin = "http://127.0.0.1:4186";

/** Static, solid-surface visual evidence. The Python suite separately tests live WebGPU. */
export default defineConfig<ChromaticConfig>({
  testDir: "./tests/visual",
  testMatch: "**/*.visual.spec.ts",
  outputDir: "test-results/layout-visual/test-output",
  snapshotPathTemplate: "{testDir}/baselines/{projectName}-{platform}/{arg}{ext}",
  updateSnapshots: "none",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  forbidOnly: Boolean(process.env.CI),
  reporter: [
    ["list"],
    ["html", { outputFolder: "test-results/layout-visual/report", open: "never" }],
    ["json", { outputFile: "test-results/layout-visual/results.json" }],
  ],
  expect: {
    timeout: 8_000,
    toHaveScreenshot: {
      // Permit only small perceived AA colour differences, never a differing-pixel budget.
      threshold: 0.1,
      maxDiffPixels: 0,
      animations: "allow",
      caret: "hide",
      scale: "css",
    },
  },
  use: {
    baseURL: origin,
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    locale: "en-AU",
    timezoneId: "Australia/Sydney",
    colorScheme: "light",
    reducedMotion: "reduce",
    storageState: {
      cookies: [],
      origins: [{
        origin,
        localStorage: [
          { name: "qg-kit-motion", value: "false" },
          { name: "qg-kit-transparency", value: "solid" },
          { name: "qg-kit-font", value: "studio" },
          { name: "qg-kit-icons", value: "isometric" },
        ],
      }],
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    disableAutoSnapshot: true,
    cropToViewport: true,
    prefersReducedMotion: "reduce",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: "python3 -m http.server 4186 --bind 127.0.0.1 --directory docs/hci/examples/liquid-glass/dist",
    url: origin,
    reuseExistingServer: false,
    timeout: 15_000,
  },
});
