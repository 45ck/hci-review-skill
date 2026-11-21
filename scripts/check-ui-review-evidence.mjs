import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REVIEW_SCOPES = {
  "gallery-layouts": [
    "docs/hci/examples/liquid-glass/src/main.tsx",
    "docs/hci/examples/liquid-glass/src/gallery.css",
    "docs/hci/examples/liquid-glass/src/review-launcher.tsx",
    "docs/hci/examples/liquid-glass/src/layouts-showcase.tsx",
    "docs/hci/examples/liquid-glass/src/layouts-showcase.css",
    "docs/hci/examples/liquid-glass/src/layouts-state.ts",
    "packages/liquid-glass/src/layouts",
    "packages/liquid-glass/src/kit.css",
    "packages/liquid-glass/src/fonts.css",
    "packages/liquid-glass/src/validation.css",
    "packages/liquid-glass/src/appearance.tsx",
    "packages/liquid-glass/src/icons.tsx",
  ],
  "review-tool": [
    "docs/hci/examples/liquid-glass/src/main.tsx",
    "docs/hci/examples/liquid-glass/src/gallery.css",
    "docs/hci/examples/liquid-glass/src/review-launcher.tsx",
    "packages/liquid-glass/src/review",
    "packages/liquid-glass/src/kit.css",
    "packages/liquid-glass/src/fonts.css",
    "packages/liquid-glass/src/validation.css",
    "packages/liquid-glass/src/appearance.tsx",
    "packages/liquid-glass/src/icons.tsx",
    "scripts/check-semantic-ui.mjs",
    "scripts/check-ui-review-evidence.mjs",
  ],
};

const requiredAssessments = ["content", "navigation", "presentation", "interaction", "recovery"];
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const hasText = (value) => typeof value === "string" && value.trim().length > 0;
const hasTextItems = (value) => Array.isArray(value) && value.length > 0 && value.every(hasText);
const sourceFiles = (path) => statSync(path).isDirectory()
  ? readdirSync(path).sort().flatMap((name) => sourceFiles(join(path, name)))
  : /\.(?:tsx?|jsx?|mjs|css)$/.test(path) ? [path] : [];

export function reviewFingerprint(root, paths) {
  const files = [...new Set(paths.flatMap((path) => {
    const fullPath = resolve(root, path);
    if (!fullPath.startsWith(resolve(root) + "/") || !existsSync(fullPath)) {
      throw new Error(`Review source is missing or outside the checkout: ${path}`);
    }
    return sourceFiles(fullPath);
  }))].sort();
  if (!files.length) throw new Error("Review scope has no source files.");
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(relative(root, file).replaceAll("\\", "/"));
    hash.update("\0");
    hash.update(readFileSync(file));
    hash.update("\0");
  }
  return { fingerprint: hash.digest("hex"), files: files.map((file) => relative(root, file).replaceAll("\\", "/")) };
}

export function validateReviewEvidence(root, record, scopes = REVIEW_SCOPES) {
  const errors = [];
  if (!isRecord(record)) return ["Review record must be an object."];
  if (record.schemaVersion !== 1) errors.push("Review record needs schemaVersion 1.");
  if (!Array.isArray(record.reviews)) errors.push("Review record needs a reviews array.");
  const reviews = new Map();
  for (const [index, entry] of (Array.isArray(record.reviews) ? record.reviews : []).entries()) {
    if (!isRecord(entry) || !hasText(entry.id)) {
      errors.push(`reviews[${index}]: each review must be an object with a nonempty ID.`);
      continue;
    }
    if (!Object.hasOwn(scopes, entry.id)) {
      errors.push(`${entry.id}: unknown review scope ID.`);
      continue;
    }
    if (reviews.has(entry.id)) {
      errors.push(`${entry.id}: duplicate review scope ID.`);
      continue;
    }
    reviews.set(entry.id, entry);
  }
  for (const [id, paths] of Object.entries(scopes)) {
    const evidence = reviews.get(id);
    if (!evidence) { errors.push(`${id}: contextual review record is missing.`); continue; }
    let current;
    try { current = reviewFingerprint(root, paths); }
    catch (error) { errors.push(`${id}: ${error.message}`); continue; }
    if (typeof evidence.fingerprint !== "string" || !/^[a-f0-9]{64}$/.test(evidence.fingerprint)) {
      errors.push(`${id}: fingerprint must be a SHA-256 hex string.`);
    } else if (evidence.fingerprint !== current.fingerprint) {
      errors.push(`${id}: source changed since contextual review. Recheck the affected tasks, then update the rationale and fingerprint.`);
    }
    if (!isRecord(evidence.reviewer) || !["agent", "human"].includes(evidence.reviewer.kind) || !hasText(evidence.reviewer.name)) {
      errors.push(`${id}: identify the actual reviewer and reviewer kind.`);
    }
    if (!hasText(evidence.reviewedAt) || !Number.isFinite(Date.parse(evidence.reviewedAt))) errors.push(`${id}: reviewedAt must be a valid date string.`);
    if (!hasText(evidence.task)) errors.push(`${id}: record the task as nonempty text.`);
    if (!hasTextItems(evidence.scenarios)) errors.push(`${id}: scenarios must be a nonempty array of nonempty text.`);
    for (const assessment of requiredAssessments) {
      if (!isRecord(evidence.assessments) || !hasText(evidence.assessments[assessment])) errors.push(`${id}: missing ${assessment} assessment.`);
    }
    if (!hasTextItems(evidence.limitations)) errors.push(`${id}: limitations must be a nonempty array of nonempty text.`);
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  if (process.argv.includes("--fingerprints")) {
    console.log(JSON.stringify(Object.fromEntries(Object.entries(REVIEW_SCOPES).map(([id, paths]) => [id, reviewFingerprint(root, paths)])), null, 2));
  } else {
    const path = join(root, "docs/hci/reviews/semantic-review.json");
    let record;
    try { record = JSON.parse(readFileSync(path, "utf8")); }
    catch { console.error("Missing or invalid docs/hci/reviews/semantic-review.json."); process.exit(1); }
    const errors = validateReviewEvidence(root, record);
    if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
    console.log(`Context review records are current for ${Object.keys(REVIEW_SCOPES).join(", ")}. This verifies provenance and coverage, not the correctness of a review or human usability.`);
  }
}
