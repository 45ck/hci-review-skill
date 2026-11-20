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
}
check(
  gallery.dependencies?.["@quantitative-hci/liquid-glass"],
  "Gallery must consume the shared material package.",
);
check(
  !gallery.dependencies?.["@ui-sdk/react"],
  "Gallery must not bypass the shared package with a direct UI SDK React dependency.",
);

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
    component?.exportPath?.endsWith(`/${id}`),
    `${id}: exportPath must name its package subpath.`,
  );
  const source = read(join(packageDir, "src/components", `${id}.ts`));
  check(
    source.includes(`@ui-sdk/react/${id}`),
    `${id}: public subpath must delegate to the corresponding SDK primitive.`,
  );
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const key = new RegExp(
    `(?:["']${escaped}["']|\\b${escaped})\\s*:\\s*[A-Z][A-Za-z0-9_]*`,
  );
  check(key.test(demos), `${id}: add a real component entry to a demo map.`);
}

for (const path of filesUnder(join(galleryDir, "src")).filter((file) =>
  /\.(?:tsx?|jsx?)$/.test(file),
)) {
  const source = read(path);
  check(
    !/["']@ui-sdk\/react(?:\/|["'])/.test(source),
    `${relative(root, path)}: import through @quantitative-hci/liquid-glass.`,
  );
}

const tokens = read(join(packageDir, "src/tokens.css"));
const styles = read(join(packageDir, "src/styles.css"));
const material = read(join(packageDir, "src/material.tsx"));
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
    `Liquid Glass standard failed (${errors.length}):\n${errors.map((error) => `- ${error}`).join("\n")}\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Liquid Glass standard passed: ${expected.length} families, pinned SDK, shared imports, tokens and preference fallbacks.\n`,
  );
}
