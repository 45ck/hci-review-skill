import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { analyzeReviewSnapshot, createReviewPacket, REVIEW_RULE_VERSION } from "../packages/liquid-glass/src/review/rules.ts";
import { extractSourceSnapshot } from "../scripts/check-semantic-ui.mjs";

const base = () => ({ scope: "Account", source: "dom", target: "#account", viewport: { width: 390, height: 844 }, elements: [
  { id: "title", target: "#title", kind: "heading", text: "Account", level: 2, group: "account" },
  { id: "save", target: "#save", kind: "control", text: "Save profile", name: "Save profile", width: 140, height: 44, checkTargetSize: true },
] });
const rules = report => report.findings.map(finding => finding.ruleId);

test("a named task and usable target produce no findings without modifying their snapshot", () => {
  const snapshot = base(), before = structuredClone(snapshot);
  const report = analyzeReviewSnapshot(snapshot);
  assert.deepEqual(report.summary, { error: 0, warning: 0, review: 0 });
  assert.equal(report.ruleVersion, REVIEW_RULE_VERSION);
  assert.deepEqual(snapshot, before);
});

test("unnamed measured controls fail while unresolved dynamic names remain unclaimed", () => {
  const snapshot = base();
  snapshot.elements.push({ id: "empty", target: "#empty", kind: "control", text: "", name: "" });
  snapshot.elements.push({ id: "dynamic", target: "#dynamic", kind: "control", text: "", nameKnown: false });
  const report = analyzeReviewSnapshot(snapshot);
  assert.equal(report.summary.error, 1);
  assert.equal(report.findings[0].target, "#empty");
});

test("repetition is scoped to meaningful regions and literal subtitle equality is advisory", () => {
  const snapshot = base();
  snapshot.elements.push(
    { id: "other", target: "#other", kind: "heading", text: "Account", level: 2, group: "other-region" },
    { id: "duplicate", target: "#duplicate", kind: "heading", text: "ACCOUNT!", level: 2, group: "account" },
    { id: "subtitle", target: "#subtitle", kind: "prose", text: "Account.", precedingHeadingId: "title" },
    { id: "useful", target: "#useful", kind: "prose", text: "Change the name used in invoices.", precedingHeadingId: "title" },
  );
  const report = analyzeReviewSnapshot(snapshot);
  assert.deepEqual(rules(report), ["duplicate-heading", "repeated-subtitle"]);
  assert(report.findings.every(finding => finding.certainty === "heuristic" && finding.severity === "review"));
});

test("generic labels, compact targets and overflow remain contextual or geometry diagnostics", () => {
  const snapshot = base();
  snapshot.elements[1] = { ...snapshot.elements[1], name: "Continue", text: "Continue", width: 20, height: 20 };
  snapshot.overflowPixels = 32;
  const report = analyzeReviewSnapshot(snapshot);
  assert.deepEqual(rules(report), ["generic-action", "small-target", "horizontal-overflow"]);
  assert.equal(report.summary.error, 0);
  assert.match(report.findings[1].suggestion, /exceptions/);
});

test("a region may start at h3; an internal jump is reported without claiming conformance", () => {
  const snapshot = base();
  snapshot.elements[0].level = 3;
  assert.equal(analyzeReviewSnapshot(snapshot).findings.length, 0);
  snapshot.elements.push({ id: "jump", target: "#jump", kind: "heading", text: "Billing address", level: 5 });
  assert(rules(analyzeReviewSnapshot(snapshot)).includes("heading-order"));
});

test("duplicate observed DOM IDs fail but separate valid IDs do not", () => {
  const snapshot = base();
  snapshot.elements[0].domId = "same";
  snapshot.elements[1].domId = "same";
  assert.equal(analyzeReviewSnapshot(snapshot).summary.error, 1);
  snapshot.elements[1].domId = "save";
  assert.equal(analyzeReviewSnapshot(snapshot).summary.error, 0);
});

test("the fingerprint changes with observed copy, viewport and scope", () => {
  const snapshot = base(), initial = analyzeReviewSnapshot(snapshot);
  assert.equal(analyzeReviewSnapshot(structuredClone(snapshot)).fingerprint, initial.fingerprint);
  for (const mutate of [s => { s.elements[0].text = "Personal account"; }, s => { s.viewport.width = 1440; }, s => { s.scope = "Workspace"; }]) {
    const next = structuredClone(snapshot); mutate(next);
    assert.notEqual(analyzeReviewSnapshot(next).fingerprint, initial.fingerprint);
  }
});

test("selection export binds stable decisions to the current review and never clears defects", () => {
  const snapshot = base(); snapshot.elements[1].name = "Click here";
  const report = analyzeReviewSnapshot(snapshot), finding = report.findings[0];
  const packet = createReviewPacket(report, { fingerprint: report.fingerprint, choices: { [finding.id]: 1 } });
  assert.deepEqual(packet.OPTIONS, [1]);
  assert.equal(packet.decisions[0].findingId, finding.id);
  assert.equal(packet.status, "selection-only");
  assert.equal(packet.unresolved, 0);
  assert.equal(report.findings.length, 1);
  assert.throws(() => createReviewPacket(report, { fingerprint: "old", choices: {} }), /review changed/);
  assert.throws(() => createReviewPacket(report, { fingerprint: report.fingerprint, choices: { missing: 1 } }), /Unknown/);
  assert.throws(() => createReviewPacket(report, { fingerprint: report.fingerprint, choices: { [finding.id]: 9 } }), /Unknown/);
  assert.equal(createReviewPacket(report, { fingerprint: report.fingerprint, choices: {} }).unresolved, 1);
});

test("budgets disclose incomplete coverage instead of presenting an empty passing result", () => {
  const snapshot = base();
  snapshot.elements = Array.from({ length: 1010 }, (_, index) => ({ id: `empty-${index}`, target: `#empty-${index}`, kind: "control", text: "", name: "" }));
  const report = analyzeReviewSnapshot(snapshot);
  assert.equal(report.elementCount, 1000);
  assert.equal(report.findings.length, 200);
  assert.match(report.limitations[0], /10 additional elements and 800 findings/);
});

test("source AST extracts UI literals, skips dynamic names and does not lint code comments", () => {
  const source = `// <button></button> is documentation, not a rendered control.
    const x = <section><h2>Account</h2><p>Account</p><button>Click here</button><button />
      <button aria-label={label} /><button>{label}</button><button {...props} /></section>;`;
  const snapshot = extractSourceSnapshot(source);
  const report = analyzeReviewSnapshot(snapshot);
  assert.equal(report.summary.error, 1);
  assert(rules(report).includes("repeated-subtitle"));
  assert(rules(report).includes("generic-action"));
  assert.equal(snapshot.omittedDynamic, 3);
});

test("SDK render templates and associated labels do not become fictitious unnamed controls", () => {
  const source = `import {Button as Action} from '@ui-sdk/react/button';
    const x = <Action render={<a href='/profile' />}>Save profile</Action>;`;
  const snapshot = extractSourceSnapshot(source);
  assert.equal(analyzeReviewSnapshot(snapshot).summary.error, 0);
  assert.equal(snapshot.omittedDynamic, 1);
  const real = extractSourceSnapshot(`import {Button} from '@ui-sdk/react/button'; const x=<Button />`);
  assert.equal(analyzeReviewSnapshot(real).summary.error, 1);
  for (const valid of [
    'const x = <label>Balanced<button /></label>',
    'const x = <><label htmlFor="mode">Balanced</label><button id="mode" /></>',
    'import {Button} from "@ui-sdk/react/button"; const x = <label>Balanced<Button /></label>',
    'import {Button} from "@ui-sdk/react/button"; const x = <><label htmlFor="mode">Balanced</label><Button id="mode" /></>',
  ]) assert.equal(analyzeReviewSnapshot(extractSourceSnapshot(valid)).summary.error, 0, valid);
  assert.equal(analyzeReviewSnapshot(extractSourceSnapshot('const x = <label><button /></label>')).summary.error, 1);
});

test("source extraction excludes nested secret, hidden and editable text and counts deliberate examples", () => {
  const source = `const x = <section><h2>Account<span data-agent-secret>SECRET_SENTINEL</span></h2>
    <p>Account<span data-agent-hidden>HIDDEN_SENTINEL</span><span contentEditable>EDITABLE_SENTINEL</span></p>
    <div data-agent-secret><button>SECRET_ACTION_SENTINEL</button></div>
    <aside data-review-example><button /></aside><button>Save profile</button></section>`;
  const snapshot = extractSourceSnapshot(source);
  assert.doesNotMatch(JSON.stringify(snapshot), /SENTINEL/);
  assert.equal(snapshot.omittedExamples, 1);
  assert.equal(analyzeReviewSnapshot(snapshot).summary.error, 0);
  assert(rules(analyzeReviewSnapshot(snapshot)).includes("repeated-subtitle"));
});

test("the CLI fails a real unnamed static control and passes its labelled correction", t => {
  const folder = mkdtempSync(join(tmpdir(), "quantive-semantic-"));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const file = join(folder, "test.tsx");
  const script = fileURLToPath(new URL("../scripts/check-semantic-ui.mjs", import.meta.url));
  writeFileSync(file, "const x = <button />;");
  let result = spawnSync(process.execPath, [script, file], { cwd: resolve(folder), encoding: "utf8" });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /control-name/);
  writeFileSync(file, 'const x = <button aria-label="Close account settings" />;');
  result = spawnSync(process.execPath, [script, file], { cwd: resolve(folder), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});
