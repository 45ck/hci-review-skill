import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { reviewFingerprint, validateReviewEvidence } from "../scripts/check-ui-review-evidence.mjs";

function withFixture(run) {
  const root = mkdtempSync(join(tmpdir(), "quantive-review-evidence-"));
  mkdirSync(join(root, "ui"));
  writeFileSync(join(root, "ui/screen.tsx"), '<h1>Review projects</h1>');
  const scopes = { layout: ["ui"] };
  const record = { schemaVersion: 1, reviews: [{
    id: "layout", fingerprint: reviewFingerprint(root, scopes.layout).fingerprint,
    reviewer: { kind: "agent", name: "Test reviewer" }, reviewedAt: "2026-11-22T00:00:00+11:00",
    task: "Review a project", scenarios: ["Overview and empty state"],
    assessments: { content: "Names identify the task.", navigation: "Return path retained.", presentation: "Task heading precedes details.", interaction: "Shared accepted state.", recovery: "Undo is available." },
    limitations: ["No human study."],
  }] };
  try { run(root, scopes, record); } finally { rmSync(root, { recursive: true, force: true }); }
}

test("review evidence accepts unchanged scoped source without claiming human approval", () => withFixture((root, scopes, record) => {
  assert.deepEqual(validateReviewEvidence(root, record, scopes), []);
  assert.equal(record.reviews[0].reviewer.kind, "agent");
}));

test("copy or layout edits invalidate the recorded review", () => withFixture((root, scopes, record) => {
  writeFileSync(join(root, "ui/screen.tsx"), '<h1>Delete projects</h1>');
  assert.match(validateReviewEvidence(root, record, scopes).join(" "), /source changed/);
}));

test("a new file in a scoped directory cannot escape the review fingerprint", () => withFixture((root, scopes, record) => {
  writeFileSync(join(root, "ui/mobile.css"), '.action {display:none}');
  assert.match(validateReviewEvidence(root, record, scopes).join(" "), /source changed/);
}));

test("an unexplained fresh hash is insufficient evidence", () => withFixture((root, scopes, record) => {
  delete record.reviews[0].assessments.recovery;
  assert.match(validateReviewEvidence(root, record, scopes).join(" "), /missing recovery assessment/);
}));

test("unrelated files do not invalidate a bounded review", () => withFixture((root, scopes, record) => {
  writeFileSync(join(root, "unrelated.md"), "A separate task");
  assert.deepEqual(validateReviewEvidence(root, record, scopes), []);
}));

test("duplicate and unknown review IDs cannot be accepted beside a current record", () => withFixture((root, scopes, record) => {
  const duplicate = structuredClone(record);
  duplicate.reviews.push(structuredClone(record.reviews[0]));
  assert.match(validateReviewEvidence(root, duplicate, scopes).join(" "), /duplicate review scope ID/);
  const unknown = structuredClone(record);
  unknown.reviews.push({ ...record.reviews[0], id: "unregistered-layout" });
  assert.match(validateReviewEvidence(root, unknown, scopes).join(" "), /unknown review scope ID/);
}));

test("scenario and limitation entries must contain actual text", () => withFixture((root, scopes, record) => {
  for (const field of ["scenarios", "limitations"]) {
    for (const value of [[], [""], ["  "], [null], ["Covered", null], ["Covered", 7], {}]) {
      const malformed = structuredClone(record);
      malformed.reviews[0][field] = value;
      assert.match(validateReviewEvidence(root, malformed, scopes).join(" "), new RegExp(`${field} must be`));
    }
  }
}));

test("malformed review containers return validation errors instead of throwing", () => withFixture((root, scopes) => {
  for (const value of [null, 7, "record", [], {}, { schemaVersion: 1, reviews: {} }, { schemaVersion: 1, reviews: [null, 7, [], { id: [] }] }]) {
    const errors = validateReviewEvidence(root, value, scopes);
    assert.ok(errors.length > 0, JSON.stringify(value));
    assert.ok(errors.every((error) => typeof error === "string"));
  }
}));

test("malformed object fields cannot masquerade as review prose or reviewer identity", () => withFixture((root, scopes, record) => {
  const changes = [
    ["reviewer", { kind: "agent", name: {} }, /identify the actual reviewer/],
    ["reviewer", ["agent", "Test reviewer"], /identify the actual reviewer/],
    ["task", 3, /record the task/],
    ["task", {}, /record the task/],
    ["assessments", [], /missing content assessment/],
    ["assessments", { ...record.reviews[0].assessments, recovery: {} }, /missing recovery assessment/],
    ["reviewedAt", {}, /valid date string/],
    ["fingerprint", [], /SHA-256 hex string/],
  ];
  for (const [field, value, expected] of changes) {
    const malformed = structuredClone(record);
    malformed.reviews[0][field] = value;
    assert.match(validateReviewEvidence(root, malformed, scopes).join(" "), expected);
  }
}));
