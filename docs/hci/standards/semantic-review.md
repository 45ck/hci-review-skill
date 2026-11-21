# Semantic and layout review

Quantive's development review compares concrete observations with small, explicit rules. It helps an agent find unclear copy and broken structure while a person can inspect the same findings and select changes. It never rewrites an application, submits a form or calls a model.

## What runs

| Layer | Executable coverage | Limit |
| --- | --- | --- |
| Shared rules | `packages/liquid-glass/src/review/rules.ts`: control names, duplicate observed IDs, repeated headings/subtitles, generic action/heading wording, heading order, compact targets and horizontal overflow | Wording checks are contextual candidates. Geometry is an observation, not a full accessibility audit. |
| Browser extraction | `scanReview(root)` in `src/review/scan.ts` inspects the supplied connected region and its current rendered state | Other routes, hidden states, canvas text, screenshots and external content are not inspected. Text below the viewport remains in scope when rendered. |
| Source gate | `node scripts/check-semantic-ui.mjs` parses TSX with the existing Rolldown parser and uses the same rules | Static native elements and imported UI SDK Buttons only; dynamic expressions, unresolved labels, render templates and runtime state need browser checks. |
| Contextual assessment | Review the task, intended reader, heading/body agreement, claims, status messages, missing information and recovery against the actual source | The rule engine supplies no LLM inference or human review. A green literal check cannot replace this assessment. |

Source checks fail detected unnamed static controls. Advisory wording is reported without turning every conventional “Continue” or “Next” into a build failure. `--json` emits the detailed observations and limitations. Optional positional TSX paths support focused review. Explicit `data-review-example` regions are counted and excluded from the source gate because their intentional defects demonstrate the live scanner. They remain visible to the browser scanner; regression tests must prove it finds those defects.

The source gate does not infer that duplicate ID literals in separate functions are simultaneously rendered. Actual duplicate IDs are checked in the browser scope. Literal `render={<a />}` templates receive the containing SDK Button's children at runtime; a static empty template is not treated as a nameless live link.

Static associated labels are resolved where their IDs or nesting are explicit. A dynamically composed label is reported as unresolved rather than a definite unnamed-control error. This adapter is a bounded source check, not a complete browser accessible-name implementation.

## Contextual review receipts

`scripts/check-ui-review-evidence.mjs` binds recorded contextual assessments to the current source fingerprint. The initial scopes are **gallery-layouts** (the gallery shell and application layout) and **review-tool** (the overlay and its review implementation). The scopes include their current catalogue/recipe/validation dependencies and JSON manifests/contracts that determine visible navigation and copy; gallery-layouts also includes its layout diagnostic and placement-lab sources. Each record names the real reviewer and reviewer kind, task, covered scenarios, content/navigation/presentation/interaction/recovery reasoning and limitations. Source changes within a configured scope make the record stale.

The gate checks that those records exist, contain the required assessments and match the scoped source. It does not evaluate whether the reasoning is correct, establish human review, or imply coverage of every existing gallery collection. Extend the configured scope when new screens or shared dependencies affect the reviewed task. `--fingerprints` only reports source identity; it does not conduct a review or justify copying an old rationale onto a new revision.

## Findings and decisions

Each finding contains a stable ID, rule ID, severity, certainty, exact target, evidence, suggestion and numbered choices. Findings use three severities:

- **Error:** a bounded deterministic observation, such as an absent detected name or duplicate observed DOM ID. Verify the browser accessibility tree when the name algorithm is uncertain.
- **Warning:** a structural or geometric concern, such as heading order or horizontal overflow.
- **Review:** a contextual choice, such as repeated subtitles, generic wording or compact targets with possible spacing exceptions.

Certainty is separate: measured values stay distinct from heuristics and contextual judgments. There is no aggregate “quality score,” inferred AI-authorship score or sentiment threshold.

`createReviewPacket(report, {fingerprint, choices})` returns compact `OPTIONS`, stable finding/rule/target/option mappings and the number of undecided findings. The packet is explicitly `selection-only`. Choices request implementation work; they do not remove findings, approve publication or apply changes. Unknown IDs/options and a mismatched fingerprint are rejected. A regenerated report invalidates selections when observed content, geometry, viewport, scope or rules change. The fingerprint is a deterministic change detector, not a cryptographic signature or an authorization credential.

## Scope and privacy

The browser adapter excludes the tool's own `[data-quantive-review-root]` subtree, explicit agent-hidden/secret content, password controls and editable content. It never reads input, textarea or select values. Visible labels can still be checked. Text extraction also excludes protected descendants inside otherwise ordinary headings, paragraphs and controls; it does not copy an ancestor's unrestricted `textContent`.

CSS-hidden descendants and retained hidden views are excluded. Very small backing native inputs used by SDK controls are excluded by their painted dimensions; the actual visible SDK control is inspected. A modal review drawer may make the background region inert or ARIA-hidden without hiding its pixels, so the root's modal state does not turn the report into a false empty pass. Relevant hidden descendants still remain out of scope.

These exclusions also apply to the root of an external label referenced by `aria-labelledby` or a native associated `<label>`. Browsers may legitimately use a hidden label to name a control. The scanner leaves that name unresolved, counts the omission in its limitations and requests a browser accessibility-tree check; it neither copies the hidden text into the report/fingerprint nor invents an unnamed-control error.

The extractor is bounded to 1,000 observed elements, 1,200 characters of text per element and 200 findings. It reports omitted elements/findings as incomplete coverage and asks for a smaller scope. These budgets are performance limits, not sampling that validates the omitted content. Scrolling a nested container is accounted for in element coordinates; a scroll alone should not invalidate the content decision.

## Required workflow for a layout change

1. Identify the intended task, reader, visible state, important recovery path and changed regions.
2. Run the static gate and relevant unit/browser contracts against the candidate source. Resolve clear defects.
3. Open **Review UI** on the actual built view. Check the intended desktop and narrow viewports and relevant states; inspect every warning/candidate in context.
4. Keep necessary wording, remove real repetition and record the reason for each contextual decision. Do not auto-fill “retain” decisions to produce a green result.
5. Rescan after changes, preserve the matching evidence/review revision and report remaining limitations. Human usability validation remains separate from agent assessment and automated correctness.

## Verification

`node --test tests/test_semantic_review.mjs` covers clean versus flawed observations, duplicate scope, uncertainty, budgets, fingerprint changes, stale/unknown selections, exact source extraction, nested private content, SDK render templates and real CLI failure/success exits. Browser contracts separately verify rendered extraction, discoverable SDK actions, actual selection/export, exclusion boundaries, focus and responsive behaviour.

No automated result establishes factual accuracy, a complete accessibility conformance claim, human comprehension or improvement in task speed. Retain the kit's **Unvalidated** human review status until the existing promotion requirements are satisfied.
