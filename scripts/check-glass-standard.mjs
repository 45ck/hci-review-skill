import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const packageDir = join(root, "packages/liquid-glass");
const galleryDir = join(root, "docs/hci/examples/liquid-glass");
const expected =
  `accordion alert-dialog autocomplete avatar button calendar carousel checkbox collapsible color-picker combobox command date-input date-picker dialog drawer field file-input hover-card image-cropper input label listbox menu menubar meter navigation-menu number-input otp-input pagination password-input popover preferences progress radio rating resizable scroll-area segmented-control select separator slider switch tabs textarea time-input timeline toast toggle token-input toolbar tooltip tree trigger-menu waterfall`.split(
    " ",
  );
const errors = [];
const check = (condition, message) => {
  if (!condition) errors.push(message);
};
const read = (path) => {
  if (!existsSync(path)) {
    errors.push(`Missing ${relative(root, path)}`);
    return "";
  }
  return readFileSync(path, "utf8");
};
const json = (path) => {
  try {
    return JSON.parse(read(path));
  } catch (error) {
    errors.push(`Invalid JSON in ${relative(root, path)}: ${error.message}`);
    return {};
  }
};
const filesUnder = (directory) =>
  existsSync(directory)
    ? readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        return entry.isDirectory() ? filesUnder(path) : [path];
      })
    : [];

const checkMaterialScope = (source, name) => {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const stack = [];
  let start = 0;
  let quote = "";
  for (let index = 0; index < css.length; index++) {
    const char = css[index];
    if (quote) {
      if (char === "\\") index++;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "{") {
      const selector = css.slice(start, index).trim();
      const enabledRoot =
        /^:root\[data-qg-material-enabled=(?:"true"|'true'|true)\](?:\[[^\]]+\])*$/.test(
          selector,
        );
      const scoped = enabledRoot || stack.at(-1) === true;
      if (!selector.startsWith("@")) {
        check(scoped, `${name}: material selector is outside the enabled root: ${selector}`);
      }
      stack.push(scoped);
      start = index + 1;
    } else if (char === "}") {
      stack.pop();
      start = index + 1;
    } else if (char === ";") {
      start = index + 1;
    }
  }
  check(stack.length === 0 && !quote, `${name}: incomplete CSS block or string.`);
};

const manifest = json(join(packageDir, "component-manifest.json"));
const pkg = json(join(packageDir, "package.json"));
const gallery = json(join(galleryDir, "package.json"));
const components = manifest.components ?? [];
const ids = components.map((component) => component.id);
check(
  ids.length === expected.length,
  `Catalogue must contain ${expected.length} families, found ${ids.length}.`,
);
check(new Set(ids).size === ids.length, "Catalogue IDs must be unique.");
check(
  expected.every((id) => ids.includes(id)),
  `Missing catalogue families: ${expected.filter((id) => !ids.includes(id)).join(", ")}`,
);
check(
  ids.every((id) => expected.includes(id)),
  `Unreviewed catalogue families: ${ids.filter((id) => !expected.includes(id)).join(", ")}`,
);
check(
  /^[a-f0-9]{40}$/.test(manifest.upstreamCommit ?? ""),
  "Catalogue must retain a full upstream reference commit.",
);
check(
  manifest.sdkVersion === "0.1.0-beta.13",
  "Review catalogue and examples explicitly before updating the pinned UI SDK beta.",
);
check(
  pkg.private === true && gallery.private === true,
  "Material and gallery packages must remain private workspace packages.",
);
for (const name of ["@ui-sdk/core", "@ui-sdk/react"]) {
  check(
    pkg.dependencies?.[name] === manifest.sdkVersion,
    `${name} must be pinned to the manifest SDK version.`,
  );
  check(
    gallery.dependencies?.[name] === manifest.sdkVersion,
    `The workbench must depend directly on ${name}, pinned to the manifest SDK version.`,
  );
  check(
    json(join(root, "node_modules", name, "package.json")).version === manifest.sdkVersion,
    `Installed ${name} must match the pinned SDK version; run npm ci.`,
  );
}
check(
  gallery.dependencies?.["@quantitative-hci/liquid-glass"],
  "The workbench must retain its optional material comparison package.",
);
for (const path of [
  "node_modules/@ui-sdk/core/skills/ui-sdk/SKILL.md",
  "node_modules/@ui-sdk/react/docs/llms.txt",
  "node_modules/@ui-sdk/react/docs/agents.md",
]) {
  check(existsSync(join(root, path)), `Missing installed official SDK guidance: ${path}.`);
}

const demoFiles = filesUnder(join(galleryDir, "src")).filter((path) =>
  /demos.*\.(?:tsx?|jsx?)$/.test(path),
);
const demos = demoFiles.map((path) => read(path)).join("\n");
for (const id of expected) {
  const component = components.find((entry) => entry.id === id);
  check(
    component?.name && component?.category,
    `${id}: name and category are required.`,
  );
  check(
    component?.exportPath === `@quantitative-hci/liquid-glass/${id}`,
    `${id}: preserve its existing compatibility exportPath.`,
  );
  const source = read(join(packageDir, "src/components", `${id}.ts`));
  check(
    new RegExp(`^export\\s+\\*\\s+from\\s+["']@ui-sdk/react/${id}["'];?$`).test(source.trim()),
    `${id}: compatibility subpath must remain a plain SDK re-export, without a behavior fork.`,
  );
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const key = new RegExp(
    `(?:["']${escaped}["']|\\b${escaped})\\s*:\\s*[A-Z][A-Za-z0-9_]*`,
  );
  check(key.test(demos), `${id}: add a real component entry to a demo map.`);
  check(
    new RegExp(`["']@ui-sdk/react/${id}["']`).test(demos),
    `${id}: the workbench specimen must import the upstream component directly.`,
  );
}

for (const path of filesUnder(join(galleryDir, "src")).filter((file) =>
  /\.(?:tsx?|jsx?)$/.test(file),
)) {
  const source = read(path);
  check(
    !/["']@quantitative-hci\/liquid-glass\/(?!styles\.css["']|tokens\.css["'])/.test(source),
    `${relative(root, path)}: use direct SDK component/helper imports; material aliases are for compatibility.`,
  );
  check(
    !/["']@ui-sdk\/react["']/.test(source) && !source.includes("@ui-sdk/core/internal/"),
    `${relative(root, path)}: use documented per-component SDK entries, not root or internal imports.`,
  );
}

const main = read(join(galleryDir, "src/main.tsx"));
const bridge = read(join(galleryDir, "src/agent-bridge.ts"));
const inspector = read(join(galleryDir, "src/agent-inspector.tsx"));
check(main.includes("@ui-sdk/core/web.css"), "The workbench must retain the upstream baseline stylesheet.");
check(
  /\[frosted,\s*setFrosted\]\s*=\s*useState\(false\)/.test(main) &&
    /<GlassProvider\s+enabled=\{/.test(main),
  "The workbench must start in the upstream baseline and enable Frosted CSS explicitly.",
);
check(
  main.includes("data-catalogue-id") &&
    (main.match(/\bdata-component-id\s*=/g) ?? []).length === 1 &&
    (main.match(/<Demo\b/g) ?? []).length === 1,
  "Keep the full discoverable catalogue and one selected specimen render site; verify mounted counts in the browser.",
);
check(
  main.includes("<AgentInspector") && main.includes("<ReferenceLens"),
  "The workbench must expose the live inspector and separate reference optics study.",
);
check(
  bridge.includes("@ui-sdk/react/agent") &&
    /\bcreateAgent\s*\(/.test(bridge) &&
    /\bregisterTools\s*\(/.test(bridge) &&
    /\ballow\s*:/.test(bridge),
  "Use the official createAgent/registerTools bridge with an explicit action policy.",
);
for (const method of ["snapshot", "query", "act", "subscribe"]) {
  check(
    new RegExp(`\\.${method}\\b`).test(bridge),
    `The restricted browser agent facade must expose the SDK ${method} method.`,
  );
}
check(bridge.includes("quantitativeHciAgent"), "Retain the documented browser agent facade.");
check(
  /\.snapshot\s*\(/.test(inspector) && /\.subscribe\s*\(/.test(inspector),
  "The live inspector must read and subscribe to the actual SDK bridge.",
);
const browserChecks = read(join(root, "tests/test_glass_browser.py"));
check(
  ["quantitativeHciAgent", "snapshot", "query", "act", "data-catalogue-id", "data-component-id"].every(
    (contract) => browserChecks.includes(contract),
  ),
  "The browser suite must cover catalogue discovery, one mounted specimen and the real snapshot/query/act contract.",
);

const tokens = read(join(packageDir, "src/tokens.css"));
const styles = read(join(packageDir, "src/styles.css"));
const material = read(join(packageDir, "src/material.tsx"));
checkMaterialScope(tokens, "tokens.css");
checkMaterialScope(styles, "styles.css");
check(
  /--qg-[\w-]+\s*:/.test(tokens),
  "Reusable material tokens must live in tokens.css under the --qg- namespace.",
);
for (const feature of [
  "prefers-reduced-motion",
  "prefers-reduced-transparency",
  "prefers-contrast",
  "forced-colors",
]) {
  check(
    (styles + tokens).includes(feature),
    `Add a CSS fallback for ${feature}.`,
  );
}
for (const attribute of [
  "data-qg-material-enabled",
  "data-qg-theme",
  "data-qg-material",
  "data-qg-motion",
  "data-qg-contrast",
]) {
  check(
    (styles + tokens + material).includes(attribute),
    `Missing material preference contract: ${attribute}.`,
  );
}
check(
  material.includes("matchMedia"),
  "The material provider must resolve system preferences.",
);
check(
  /enabled\??:\s*boolean/.test(material) && material.includes("!enabled"),
  "GlassProvider must support disabling its material side effects.",
);
check(
  /refraction:\s*false/.test(material) && !material.includes("feTurbulence"),
  "Frosted CSS must not enable or present turbulent noise as optical refraction.",
);
for (const semantic of ['data-variant="solid"', 'data-variant="destructive"', "data-invalid"]) {
  check(styles.includes(semantic), `Preserve the optional material's semantic state: ${semantic}.`);
}
const layout = read(join(galleryDir, "src/sdk-layout.css"));
check(
  !layout.includes("--qg-") && layout.includes("--ui-") && main.includes("./sdk-layout.css"),
  "The Timeline/Waterfall base layout shim must use neutral upstream tokens and load without the material.",
);
const reference = read(join(galleryDir, "src/reference-optics/README.md"));
check(
  reference.includes("arya3d/liquid-glass-webgpu") &&
    reference.includes("90cb73931bbaf38bd54b3263cd3fda1daef1869c"),
  "Document the exact optical reference source separately from local adaptations.",
);
check(
  existsSync(join(galleryDir, "public/licenses/arya3d-liquid-glass-MIT.txt")),
  "Ship the reference shader's MIT attribution notice.",
);
check(
  material.includes("qg.preferences.v1"),
  "Persist requested preferences under the versioned preference key.",
);
check(
  styles.includes(":focus-visible"),
  "The material must preserve a visible keyboard focus treatment.",
);
check(
  existsSync(join(root, "docs/hci/standards/liquid-glass.md")),
  "The checked material standard must be documented.",
);
check(
  existsSync(join(root, "THIRD_PARTY_NOTICES.md")),
  "Retain notices for the upstream UI SDK dependency.",
);

if (errors.length) {
  process.stderr.write(
    `UI SDK workbench source contract failed (${errors.length}):\n${errors.map((error) => `- ${error}`).join("\n")}\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `UI SDK workbench source contract passed: ${expected.length} families, pinned direct imports, agent bridge, optional scoped material and source attribution. Browser behavior and optical fidelity require separate evidence.\n`,
  );
}
