import { test, expect, takeSnapshot } from "@chromatic-com/playwright";
import type { Page, TestInfo } from "@playwright/test";

type Choice = { value: string; label: string };
type AgentEntry = {
  ref: string;
  label?: string;
  offPage?: boolean;
  actions?: string[];
  items?: Choice[];
};
type FixtureAgent = {
  query(input: { kind?: string; within?: string }): Promise<AgentEntry[]>;
  act(input: { steps: { ref: string; action: string; args: unknown[] }[] }): Promise<{ ok: boolean }>;
};

const baselineMode = process.env.GLASS_VISUAL_BASELINE_MODE ?? "compare";
if (!["compare", "candidates"].includes(baselineMode)) {
  throw new Error("GLASS_VISUAL_BASELINE_MODE must be compare or candidates.");
}
const archiveForChromatic = process.env.GLASS_CAPTURE_CHROMATIC === "1";
if (archiveForChromatic && baselineMode !== "compare") {
  throw new Error("Baseline candidate capture must not submit an unreviewed Chromatic build.");
}
const runtimeErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  // The reviewed production build serves its own fonts/assets. Never browse outside it.
  await page.context().route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.origin === "http://127.0.0.1:4186" || ["data:", "blob:"].includes(url.protocol)
      ? route.continue()
      : route.abort("blockedbyclient");
  });
  await page.goto("/?collection=layouts&quality=1", { waitUntil: "networkidle" });
  await expect(page.locator(".qg-layout-study")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-liquid-status", "reduced");
  await expect(page.locator("html")).toHaveAttribute("data-liquid-transparency", "solid");
  await expect(page.locator("html")).toHaveAttribute("data-liquid-motion", "off");
  await page.evaluate(async () => {
    const faces = await document.fonts.load('400 16px "Manrope"');
    await document.fonts.ready;
    if (!faces.length || faces.some((face) => face.status !== "loaded")) {
      throw new Error("The canonical Manrope font did not load.");
    }
  });
});

test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page) ?? [], "No console or uncaught page errors").toEqual([]);
});

/** Operate the actual discoverable SDK Select, then verify the accepted visible value. */
async function chooseFixture(page: Page, label: string, value: string) {
  await page.waitForFunction(() => typeof (window as unknown as {
    quantitativeHciAgent?: FixtureAgent;
  }).quantitativeHciAgent?.query === "function");
  const acceptedLabel = await page.evaluate(async ({ label, value }) => {
    const agent = (window as unknown as { quantitativeHciAgent: FixtureAgent }).quantitativeHciAgent;
    const entries = await agent.query({ kind: "select" });
    const matches = entries.filter((entry) => !entry.offPage && entry.label === label);
    if (matches.length !== 1 || !matches[0].actions?.includes("setValue")) {
      throw new Error(`Expected one SDK Select with setValue: ${label}`);
    }
    const entry = matches[0];
    const choices = await agent.query({ within: entry.ref });
    const choice = choices.find((item) => item.ref === entry.ref)?.items?.find((item) => item.value === value);
    if (!choice) throw new Error(`Undiscoverable fixture choice: ${label}/${value}`);
    const result = await agent.act({ steps: [{ ref: entry.ref, action: "setValue", args: [value] }] });
    if (!result.ok) throw new Error(`SDK refused fixture choice: ${label}/${value}`);
    return choice.label;
  }, { label, value });
  await expect(page.getByRole("combobox", { name: label, exact: true })).toContainText(acceptedLabel);
}

async function openQualityPopup(page: Page, options: {
  direction: "ltr" | "rtl";
  anchor: "top-start" | "top-end" | "bottom-start" | "bottom-end";
  content: "short" | "long";
}) {
  await page.getByRole("button", { name: "Open placement lab", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Layout quality fixtures", exact: true })).toBeVisible();
  await chooseFixture(page, "Fixture direction", options.direction);
  await chooseFixture(page, "Fixture anchor", options.anchor);
  await chooseFixture(page, "Fixture content", options.content);
  await chooseFixture(page, "Fixture fault", "none");
  await page.getByRole("button", { name: "Quality actions", exact: true }).click();
  const popup = page.locator("[data-quality-popup]");
  await expect(popup).toBeVisible();
  const bounds = await popup.boundingBox();
  const viewport = page.viewportSize();
  expect(bounds).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (!bounds || !viewport) throw new Error("The popup/viewport has no measurable bounds.");
  expect(bounds.x).toBeGreaterThanOrEqual(-1);
  expect(bounds.y).toBeGreaterThanOrEqual(-1);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1);
  for (const selector of ["[data-quality-anchor]", "[data-quality-peer]"]) {
    const control = await page.locator(selector).boundingBox();
    expect(control, `${selector} has a measurable hit region`).not.toBeNull();
    if (!control) throw new Error(`Missing action-group control: ${selector}`);
    expect(control.height).toBeGreaterThanOrEqual(44);
    expect(control.x).toBeGreaterThanOrEqual(-1);
    expect(control.y).toBeGreaterThanOrEqual(-1);
    expect(control.x + control.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(control.y + control.height).toBeLessThanOrEqual(viewport.height + 1);
  }
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  await page.mouse.move(0, 0);
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  await expect(page.locator("html")).toHaveAttribute("data-liquid-motion", "off");
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
  if (archiveForChromatic) await takeSnapshot(page, name, testInfo);
  if (baselineMode === "candidates") {
    // Candidates are artifacts only. No expected PNG is written or accepted by this code.
    testInfo.annotations.push({ type: "baseline-candidate", description: "No pixel comparison or baseline approval performed." });
    const filename = testInfo.outputPath(name);
    await page.screenshot({ path: filename, fullPage: false, animations: "allow", caret: "hide", scale: "css" });
    await testInfo.attach(name, { path: filename, contentType: "image/png" });
    await testInfo.attach("baseline-candidate.json", {
      body: JSON.stringify({
        compared: false,
        approved: false,
        candidate: name,
        expectedPath: testInfo.snapshotPath(name),
        viewport: page.viewportSize(),
        scope: "Explicit solid surfaces and motion off; excludes live WebGPU optics.",
      }, null, 2),
      contentType: "application/json",
    });
  } else {
    // Missing baselines and changed pixels fail. CI never writes/accepts expected images.
    await expect(page).toHaveScreenshot(name, { fullPage: false });
  }
}

const states: Array<{
  name: string;
  viewport: { width: number; height: number };
  prepare(page: Page): Promise<void>;
}> = [
  {
    name: "desktop-review",
    viewport: { width: 1440, height: 1000 },
    async prepare(page) {
      await page.locator(".qg-layout-study").scrollIntoViewIfNeeded();
      await expect(page.getByRole("button", { name: "Inspect Payment retry", exact: true })).toBeVisible();
    },
  },
  {
    name: "desktop-bottom-end-popup",
    viewport: { width: 1280, height: 900 },
    prepare: (page) => openQualityPopup(page, { direction: "ltr", anchor: "bottom-end", content: "short" }),
  },
  {
    name: "desktop-rtl-top-start-popup",
    viewport: { width: 1280, height: 900 },
    prepare: (page) => openQualityPopup(page, { direction: "rtl", anchor: "top-start", content: "short" }),
  },
  {
    name: "phone-320-review",
    viewport: { width: 320, height: 850 },
    async prepare(page) {
      await page.locator(".qg-layout-study").scrollIntoViewIfNeeded();
      await expect(page.locator(".qg-app-bottom-nav")).toBeVisible();
    },
  },
  {
    name: "phone-390-inspector",
    viewport: { width: 390, height: 844 },
    async prepare(page) {
      await page.getByRole("button", { name: "Inspect Payment retry", exact: true }).click();
      const inspector = page.locator(".qg-app-detail");
      await expect(inspector).toBeVisible();
      await expect(inspector.getByRole("heading", { name: "Payment retry", exact: true })).toBeFocused();
      // Match the reviewed frame: keep the whole task above the viewport's bottom edge.
      // "If needed" retained incidental click/focus scrolling when the canvas was already visible.
      const canvas = page.locator(".qg-layout-canvas");
      await canvas.evaluate((element) => element.scrollIntoView({
        block: "end", inline: "nearest", behavior: "instant",
      }));
      const bounds = await canvas.boundingBox();
      expect(bounds, "The compact canvas has measurable bounds").not.toBeNull();
      if (!bounds) throw new Error("The compact canvas has no measurable bounds.");
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(Math.abs(bounds.y + bounds.height - page.viewportSize()!.height),
        "The compact canvas is aligned to the reviewed bottom edge").toBeLessThanOrEqual(1);
    },
  },
  {
    name: "phone-390-long-popup",
    viewport: { width: 390, height: 844 },
    prepare: (page) => openQualityPopup(page, { direction: "ltr", anchor: "bottom-end", content: "long" }),
  },
];

for (const state of states) {
  test.describe(state.name, () => {
    test.use({ viewport: state.viewport });
    test("solid static appearance", async ({ page }, testInfo) => {
      await state.prepare(page);
      await capture(page, testInfo, `${state.name}.png`);
    });
  });
}
