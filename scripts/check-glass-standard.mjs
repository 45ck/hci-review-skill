import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const packageDir = join(root, "packages/liquid-glass");
const galleryDir = join(root, "docs/hci/examples/liquid-glass");
const expected = "accordion alert-dialog autocomplete avatar button calendar carousel checkbox collapsible color-picker combobox command date-input date-picker dialog drawer field file-input hover-card image-cropper input label listbox menu menubar meter navigation-menu number-input otp-input pagination password-input popover preferences progress radio rating resizable scroll-area segmented-control select separator slider switch tabs textarea time-input timeline toast toggle token-input toolbar tooltip tree trigger-menu waterfall".split(" ");
const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };
const read = (path) => {
  if (!existsSync(path)) { errors.push(`Missing ${relative(root, path)}`); return ""; }
  return readFileSync(path, "utf8");
};
const json = (path) => {
  try { return JSON.parse(read(path)); }
  catch (error) { errors.push(`Invalid JSON in ${relative(root, path)}: ${error.message}`); return {}; }
};
const filesUnder = (directory) => existsSync(directory)
  ? readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? filesUnder(path) : [path];
    }) : [];

const manifest = json(join(packageDir, "component-manifest.json"));
const pkg = json(join(packageDir, "package.json"));
const gallery = json(join(galleryDir, "package.json"));
const components = manifest.components ?? [];
const ids = components.map((component) => component.id);
check(ids.length === expected.length, `Catalogue must contain ${expected.length} families; found ${ids.length}.`);
check(new Set(ids).size === ids.length, "Catalogue IDs must be unique.");
check(expected.every((id) => ids.includes(id)) && ids.every((id) => expected.includes(id)), "Catalogue families differ from the reviewed 55-family inventory.");
check(/^[a-f0-9]{40}$/.test(manifest.upstreamCommit ?? ""), "Retain a full upstream reference commit.");
check(manifest.sdkVersion === "0.1.0-beta.13", "Review the catalogue and tests explicitly before updating the SDK pin.");
check(pkg.private === true && gallery.private === true, "Kit and demo must remain private workspace packages.");
for (const name of ["@ui-sdk/core", "@ui-sdk/react"]) {
  check(pkg.dependencies?.[name] === manifest.sdkVersion, `Package ${name} must match the manifest pin.`);
  check(gallery.dependencies?.[name] === manifest.sdkVersion, `Demo ${name} must match the manifest pin.`);
  check(json(join(root, "node_modules", name, "package.json")).version === manifest.sdkVersion, `Installed ${name} differs from the lock; run npm ci.`);
}
check(gallery.dependencies?.["@quantitative-hci/liquid-glass"], "The demo must consume the shared kit package.");
check(pkg.exports?.["./webgpu"] === "./src/webgpu.tsx", "Export the reusable WebGPU provider from the package.");
check(pkg.exports?.["./kit.css"] === "./src/kit.css", "Export the shared kit stylesheet.");
for (const [entry, path] of Object.entries({
  "./appearance": "./src/appearance.tsx",
  "./icons": "./src/icons.tsx",
  "./validation": "./src/validation.tsx",
  "./developer": "./src/developer/index.ts",
  "./developer.css": "./src/developer/diagrams.css",
  "./standards": "./src/standards/index.ts",
  "./standards.css": "./src/standards/standards.css",
  "./viewport": "./src/developer/viewport.tsx",
  "./viewport.css": "./src/developer/viewport.css",
  "./graphics": "./src/graphics/index.ts",
  "./graphics.css": "./src/graphics/graphics.css",
  "./media": "./src/media/index.ts",
  "./media.css": "./src/media/media.css",
  "./modeling": "./src/modeling/index.ts",
  "./agents": "./src/agents/index.ts",
  "./agents.css": "./src/agents/agents.css",
  "./interactions": "./src/interactions/index.ts",
  "./interactions.css": "./src/interactions/interactions.css",
  "./sections": "./src/sections/index.ts",
  "./sections.css": "./src/sections/sections.css",
  "./patterns": "./src/patterns/index.ts",
  "./patterns.css": "./src/patterns/patterns.css",
  "./assistant": "./src/assistant/index.ts",
  "./assistant.css": "./src/assistant/assistant.css",
  "./layouts": "./src/layouts/index.ts",
  "./layouts.css": "./src/layouts/layouts.css",
  "./review": "./src/review/index.ts",
  "./review.css": "./src/review/review.css",
  "./quality": "./src/quality/index.ts",
  "./quality.css": "./src/quality/quality.css",
  "./chat": "./src/chat/index.ts",
  "./chat.css": "./src/chat/chat.css",
  "./chat/ai-sdk": "./src/chat/adapters/ai-sdk.ts",
  "./chat/ag-ui": "./src/chat/adapters/ag-ui.ts",
  "./chat/openai": "./src/chat/adapters/openai.ts",
  "./chat/anthropic": "./src/chat/adapters/anthropic.ts",
  "./recipes": "./src/recipes.ts",
  "./fonts.css": "./src/fonts.css",
})) {
  check(pkg.exports?.[entry] === path && existsSync(join(packageDir, path)), `Retain the public ${entry} entry.`);
}
const fontDirectory = join(packageDir, "src/assets/fonts");
const fontSources = json(join(fontDirectory, "sources.json"));
check(fontSources.fonts?.length === 4, "Retain the reviewed Latin and Latin-ext font subsets.");
for (const font of fontSources.fonts ?? []) {
  const path = join(fontDirectory, font.file);
  check(existsSync(path), `Missing bundled font ${font.file}.`);
  if (!existsSync(path)) continue;
  const bytes = readFileSync(path);
  check(bytes.length === font.bytes && createHash("sha256").update(bytes).digest("hex") === font.sha256, `Font ${font.file} differs from its recorded source; review and update provenance.`);
}
for (const family of ["Manrope", "Fraunces"]) {
  check(existsSync(join(packageDir, "LICENSES", `${family}-OFL.txt`)) && existsSync(join(galleryDir, "public/licenses", `${family.toLowerCase()}-OFL.txt`)), `Preserve ${family}'s licence in the package and demo.`);
}
for (const path of ["node_modules/@ui-sdk/core/skills/ui-sdk/SKILL.md", "node_modules/@ui-sdk/react/docs/llms.txt", "node_modules/@ui-sdk/react/docs/agents.md"]) {
  check(existsSync(join(root, path)), `Missing installed official SDK guidance: ${path}.`);
}

const sourceFiles = filesUnder(join(galleryDir, "src")).filter((path) => /\.(?:tsx?|jsx?)$/.test(path));
const demos = sourceFiles.filter((path) => /demos.*\.(?:tsx?|jsx?)$/.test(path)).map(read).join("\n");
for (const id of expected) {
  const component = components.find((entry) => entry.id === id);
  check(component?.name && component?.category, `${id}: name and category are required.`);
  check(component?.exportPath === `@quantitative-hci/liquid-glass/${id}`, `${id}: preserve the compatibility exportPath.`);
  const alias = read(join(packageDir, "src/components", `${id}.ts`));
  check(new RegExp(`^export\\s+\\*\\s+from\\s+["']@ui-sdk/react/${id}["'];?$`).test(alias.trim()), `${id}: compatibility subpath must remain a plain SDK re-export.`);
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  check(new RegExp(`(?:["']${escaped}["']|\\b${escaped})\\s*:\\s*[A-Z][A-Za-z0-9_]*`).test(demos), `${id}: add a real demo-map entry.`);
  check(new RegExp(`["']@ui-sdk/react/${id}["']`).test(demos), `${id}: import the real SDK component directly.`);
}
for (const path of sourceFiles) {
  const source = read(path);
  check(!/["']@ui-sdk\/react["']/.test(source) && !source.includes("@ui-sdk/core/internal/"), `${relative(root, path)}: use documented SDK entries.`);
  check(!/["']@quantitative-hci\/liquid-glass\/(?!webgpu["']|appearance["']|icons["']|validation["']|developer(?:\.css)?["']|standards(?:\.css)?["']|viewport(?:\.css)?["']|graphics(?:\.css)?["']|media(?:\.css)?["']|modeling["']|agents(?:\.css)?["']|interactions(?:\.css)?["']|sections(?:\.css)?["']|patterns(?:\.css)?["']|assistant(?:\.css)?["']|layouts(?:\.css)?["']|review(?:\.css)?["']|quality(?:\.css)?["']|chat(?:\.css|\/(?:ai-sdk|ag-ui|openai|anthropic))?["']|recipes["']|material["']|fonts\.css["']|kit\.css["']|styles\.css["']|tokens\.css["'])/.test(source), `${relative(root, path)}: use direct SDK primitives and documented shared kit APIs.`);
}

const customManifest = json(join(packageDir, "custom-component-manifest.json"));
check(customManifest.foundation?.version === manifest.sdkVersion, "Custom provenance must retain the installed SDK version.");
check(customManifest.components?.length >= 4 && customManifest.components.every((item) => item.validation === "unvalidated"), "Custom components remain Unvalidated until an evidenced human UI/UX review changes this standard.");
check(new Set(customManifest.components?.map((item) => item.id)).size === customManifest.components?.length, "Custom component IDs must be unique.");

const main = read(join(galleryDir, "src/main.tsx"));
const bridge = read(join(galleryDir, "src/agent-bridge.ts"));
const provider = read(join(packageDir, "src/webgpu.tsx"));
const engine = read(join(packageDir, "src/webgpu/engine.ts"));
const motion = read(join(packageDir, "src/webgpu/motion.ts"));
const renderer = read(join(packageDir, "src/webgpu/renderer.ts"));
const surfaces = read(join(packageDir, "src/webgpu/surfaces.ts"));
const shader = read(join(packageDir, "src/webgpu/shader.ts"));
const kit = read(join(packageDir, "src/kit.css"));
check(main.includes("@quantitative-hci/liquid-glass/webgpu") && main.includes("<LiquidGlassProvider"), "The demo must use the reusable GPU provider by default.");
check(main.includes("@quantitative-hci/liquid-glass/kit.css") && main.includes("@ui-sdk/core/web.css"), "Load the shared kit theme over SDK base structure.");
check(main.includes('useState("overview")') && main.includes('data-kit-view="overview"'), "Start with the usable component overview.");
check(main.includes("data-catalogue-id") && main.includes("data-component-id") && main.includes("<Demo"), "Retain all family choices and the selected real specimen.");
for (const name of ["button", "input", "panel"]) {
  check(main.includes(`data-optics-probe="${name}"`) || main.includes(`probe="${name}"`), `Keep an actual ${name} surface probe for optical verification.`);
}
check(!/AgentInspector|ReferenceLens|agent-inspector|reference-lens/.test(main), "Do not ship the former workbench/inspector/lens in the kit interface.");
check(!existsSync(join(galleryDir, "public/refraction-lab.html")), "Remove the separate public refraction lab from the hosted build.");
check(!existsSync(join(galleryDir, "src/agent-inspector.tsx")), "Remove the unused diagnostic inspector and command console.");
check(provider.includes("LiquidGlassProvider") && provider.includes("useLiquidGlass"), "Export the shared provider and its status/refresh hook.");
for (const attribute of ["data-liquid-glass-kit", "data-liquid-status", "data-liquid-surface-count", "data-liquid-render-revision", "data-liquid-capture-revision", "data-liquid-motion", "data-liquid-motion-state", "data-liquid-motion-revision", "data-liquid-active-effects", "data-liquid-transparency", "data-liquid-reduced-reason"]) {
  check((provider + engine).includes(attribute), `Missing renderer evidence contract: ${attribute}.`);
}
check((provider + engine).includes("data-liquid-canvas") && surfaces.includes("data-liquid-glass"), "Use actual registered surfaces and identifiable GPU canvases.");
check(engine.includes("requestAdapter") && /createRenderPipeline/.test(renderer) && shader.includes("@fragment"), "Use an actual WebGPU pipeline, not a CSS-only substitute.");
check(engine.includes("html2canvas") && engine.includes("config.backdrop"), "Keep capture bounded to the supplied backdrop.");
check(engine.includes("createLiquidMotion") && engine.includes("withoutMotionStyles"), "Share bounded interaction motion and exclude its own CSS writes from geometry invalidation.");
check(engine.includes("getAnimations") && engine.includes("liquidRenderRect"), "Follow finite native geometry animations and expose actual popup/Drawer draw bounds for verification.");
check(["pointerdown", "pointermove", "keydown", "data-checked", "aria-selected", "disabled", "destroy()"].every((term) => motion.includes(term)), "Track real pointer, keyboard and SDK state changes; retain disabled guards and cleanup.");
check(["ripple", "displacement", "fresnel"].every((term) => shader.includes(term)) && renderer.includes("SurfaceMotion"), "Connect contact-wave and bevel optics to the actual GPU surface data.");
check(["segmented-control-indicator", "tabs-indicator"].every((term) => surfaces.includes(term)), "Register the real SDK selection indicators as optical surfaces.");
check(main.includes("SegmentedControlIndicator") && demos.includes("TabsIndicator"), "Mount SDK indicators for visible keyboard and agent selection travel.");
check(["Animate glass", "Appearance", "qg-kit-motion", "qg-kit-transparency"].every((term) => main.includes(term)), "Expose and persist truthful per-kit motion and transparency choices.");
check(kit.includes('data-liquid-glass-kit="true"'), "Scope the kit theme to an active provider.");
for (const preference of ["prefers-reduced-motion", "prefers-reduced-transparency", "forced-colors", "prefers-contrast"]) {
  check((kit + provider + engine).includes(preference), `Preserve the ${preference} policy.`);
}
check(kit.includes(":focus-visible") && kit.includes("data-invalid") && kit.includes('data-variant="destructive"'), "Retain focus, invalid and destructive semantics in the kit theme.");
check(["data-liquid-pressed", "data-liquid-ripple", "data-liquid-travelling", "data-liquid-motion"].every((term) => kit.includes(term)), "Keep the shared CSS press, ripple and selection fallback under the resolved motion policy.");
check(bridge.includes("@ui-sdk/react/agent") && /\bcreateAgent\s*\(/.test(bridge) && /\bregisterTools\s*\(/.test(bridge) && /allow\s*:/.test(bridge), "Keep the official SDK bridge with an explicit action policy.");
check(bridge.includes("quantitativeHciAgent"), "Retain the private browser verification facade.");
for (const method of ["snapshot", "query", "act", "subscribe"]) {
  check(new RegExp(`\\.${method}\\b`).test(bridge), `Expose the actual SDK ${method} method in the facade.`);
}
const browser = read(join(root, "tests/test_glass_browser.py"));
const agentTests = read(join(root, "tests/glass_agent_contract.py"));
const opticsTests = read(join(root, "tests/glass_optics_contract.py"));
const browserDiagnostics = read(join(root, "tests/glass_browser_diagnostics.py"));
check(["data-catalogue-id", "data-component-id", "data-kit-view", "software_gpu"].every((term) => browser.includes(term)), "Browser checks must cover the kit overview, every family and the reviewed GPU path.");
check(["quantitativeHciAgent", "snapshot", "query", "act", "subscribe", "[redacted]"].every((term) => agentTests.includes(term)), "Verify real SDK reads/actions, subscriptions and secret redaction.");
check(["data-optics-probe", "data-liquid-canvas", "data-liquid-capture-revision", "Refraction strength", "Backdrop"].every((term) => opticsTests.includes(term)), "Verify actual control rectangles, GPU contribution, strength changes and backdrop capture.");
check(["verify_motion_contract", "paintedFraction", "changedFraction", "captureRevisionUnchanged", "idlePixels", "selectionSources", "verify_suppressed_motion", "MOTION_IDLE_SAMPLE_MS"].every((term) => opticsTests.includes(term)), "Verify actual motion pixels, keyboard/agent indicator travel, settled idle work, texture reuse and suppressed effects.");
check(["verify_drawer_motion_contract", "data-liquid-render-rect", "nativeAnimations", "drawerAlignmentErrorPx"].every((term) => opticsTests.includes(term)) && browser.includes("native_drawer_settle_tracks_gpu_with_motion_on_and_off"), "Verify real native Drawer settling against actual GPU draw bounds with decorative motion enabled and off.");
check(["visible_pointer_ripple_selection_and_idle", "system_preferences_explicit_opt_in_and_forced_colours", "unavailable_gpu_css_motion_and_popup", "short_overview_motion_video", "record_video_dir", 'animations="allow"'].every((term) => browser.includes(term)), "Run motion, explicit preference override and unavailable-GPU checks; retain a short real-motion video.");
check(["traceback", "lastStage", "failureEvidence", "runningAnimations"].every((term) => browser.includes(term)) && ["createImageBitmap", "frameDeadlineMs", "observedRenders", "activeRenders", "Capture cancelled"].every((term) => opticsTests.includes(term)), "Keep bounded, cancellable frame probes and actionable stage/stack/render-state evidence on browser failure.");
check(![browser, opticsTests].some((source) => source.includes('animations="disabled"')), "Capture the live kit after settlement without fast-forwarding SDK-owned animations.");
check(["settled response", "fullResponseDifference", "initialX", "targetX", "completedSnapshots", "longestRoundTripMs"].every((term) => opticsTests.includes(term)), "Sample actual response progress through settlement and distinguish idle-state changes from slow DOM replies.");
check(browser.includes("start_browser_profile") && browserDiagnostics.includes("Profiler.stop") && browserDiagnostics.includes("longtask"), "Keep bounded CPU and long-task evidence around the observed popup/fallback stalls.");
const notice = read(join(packageDir, "src/webgpu/NOTICE.md"));
check(notice.includes("arya3d/liquid-glass-webgpu") && notice.includes("90cb73931bbaf38bd54b3263cd3fda1daef1869c"), "Document the exact reference shader and its local adaptations.");
for (const path of ["packages/liquid-glass/LICENSES/arya3d-MIT.txt", "docs/hci/examples/liquid-glass/public/licenses/arya3d-liquid-glass-MIT.txt", "THIRD_PARTY_NOTICES.md", "docs/hci/standards/liquid-glass.md"]) {
  check(existsSync(join(root, path)), `Retain ${path}.`);
}

if (errors.length) {
  process.stderr.write(`Liquid Glass kit source contract failed (${errors.length}):\n${errors.map((error) => `- ${error}`).join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Liquid Glass kit source contract passed: ${expected.length} families, pinned SDK behaviour, shared WebGPU material and bounded motion, private agent bridge and source attribution. Rendering requires the browser pixel checks.\n`);
}
