# Development review

`LiquidReviewOverlay` adds page review to an explicitly enabled development or internal preview. It uses the existing Liquid Glass provider and the host's single UI SDK agent bridge. It reads the page, points to findings and records decisions; it does not rewrite application content.

The gallery's **Review UI** control opens the panel beside the current collection. `?review=1` opens the same tool directly. This developer tool is separate from the fictional **Reviews** workflow in the App layouts example.

## What a result means

| Evidence | What it supports | What it does not establish |
| --- | --- | --- |
| Measured | The included element has the reported name, repeated text or geometry in this rendered state. | Complete accessibility conformance or successful user tasks. |
| Heuristic | A wording pattern may deserve attention, such as a generic action label or redundant explanation. | That the wording is necessarily wrong in context. |
| Contextual | A reviewer should consider a task, wording or presentation decision. | A completed semantic review or approval. |

Reports retain scope, viewport, element count, rule version and content fingerprint. The panel excludes itself from extraction. Hidden retained views, explicitly protected content and editable field values stay outside the report. A scan covers the supplied rendered DOM, including visible content outside the current scroll position; it does not visit other routes, open every control state or inspect a remote backend.

No model call, embedding service or remote transmission is involved. The checks do not understand the full business context. A clear automated report still needs an assessment of whether the page helps its intended user complete the task.

## Components and utilities

Import code from `@quantitative-hci/liquid-glass/review` and load `@quantitative-hci/liquid-glass/review.css` after the kit stylesheet. Supported rendering is React.

### LiquidReviewOverlay

This is an SDK composition, without its own invented agent action API. It exposes the genuine named Dialog, Buttons, RadioGroup and Textarea children. The host supplies `open`, `onOpenChange` and `root: () => HTMLElement | null`. Optional props are `triggerLabel`, `shortcut`, `tools` and `className`. `onOpenChange` uses the SDK Dialog callback contract; the root resolver defines the review scope. The exported `LiquidReviewOverlayProps` type records this signature.

The panel provides:

- **Refresh checks**, which rescans the current root.
- Numbered findings with exact evidence, rule identity, certainty and suggested next action.
- **Locate finding**, which adds temporary decoration around the referenced element without editing its content.
- Explicit decision options with stable IDs and descriptions.
- **Copy decisions JSON**, with readable JSON available when clipboard access fails.
- **Close review**, with Escape dismissal and focus return through the SDK.

The tool marks a report stale after relevant content or viewport changes. Refresh before using its decisions. Temporary highlighting and observers are cleaned up when the panel closes or unmounts.

Human decisions use confirmation-marked controls and reject agent-sourced selection. An agent may inspect findings and current choices, but it must not invent a user's preference. The resulting packet remains `selection-only`; it does not mark components validated or change the site's human-review status.

### scanReview(root)

Reads a supplied `HTMLElement` and returns a `ReviewReport`. The host chooses the permitted scope. It does not search the whole application independently, read editable values, call a model or send data elsewhere.

The DOM extractor uses actual rendered element names, text and geometry. It excludes hidden backing inputs used by SDK controls so the backing element does not become a second unnamed-control finding. Full accessible-name and accessibility-tree conformance remain outside this lightweight pass.

### analyzeReviewSnapshot(snapshot)

Runs the versioned rule engine against structured evidence. This is the shared analysis path for browser extraction and source linting. Source extraction cannot supply all information available after rendering; the report records the relevant coverage limits.

### createReviewPacket(report, selections)

Accepts a current report and `{fingerprint, choices}`. The choices map stable finding IDs to option IDs. Unknown decisions, invalid options and a stale fingerprint are refused.

The returned packet contains:

| Field | Meaning |
| --- | --- |
| `schemaVersion` | Packet contract version. |
| `ruleVersion` | Rule set that produced the report. |
| `fingerprint` | Identity of the reviewed evidence, rules and viewport. |
| `scope`, `viewport` | Where the selected findings came from. |
| `OPTIONS` | Numeric shorthand, in the packet's stable decision order. |
| `decisions` | Finding ID, rule ID, target, option ID and label for each selection. |
| `unresolved` | Findings that have no selected disposition. |
| `status` | Always `selection-only`; no edit or approval is implied. |

Keep the full packet when handing decisions to an agent. `OPTIONS` on its own loses the identity needed to interpret reordered findings safely. Before implementing a selection, compare its fingerprint with a fresh report and inspect the exact target. This library provides no automatic edit application.

The fingerprint is not a cryptographic signature or proof that a particular person reviewed the page. The packet does not grant deployment, publication or editing permission.

### REVIEW_RULE_VERSION

Identifies the rule set used by the analyzer and packet. A changed rule set requires fresh report evidence and decisions.

## Agent operation

Use the existing `createAgent` bridge. Query current controls instead of keeping stale SDK refs. Opening or refreshing the tool is an ordinary SDK action; verify the actual rendered panel and report fingerprint after dispatch. `act().ok` alone is not evidence that the intended state was accepted.

Human choices have a different boundary. Preserve `data-agent-confirm` and the shared source check. Do not synthesize DOM events, remove confirmation marks or call internal handlers to record an agent choice as a human decision.

The public contracts are:

- `liquid-review-overlay`: SDK composition and visible state.
- `semantic-review-data`: pure rule analysis and selection serialization.
- `semantic-review-scan`: host DOM inspection, without SDK actions.

## Changes and verification

Run `npm run glass:semantic-check` for cheap source analysis, and `npm run glass:verify` for the normal package gate. The semantic source command checks only statically recoverable UI literals. It does not replace rendered testing for dynamic values, responsive layouts, clipping or focus behaviour.

`tests/test_semantic_review.mjs` covers meaningful rule cases and packet identity. `tests/glass_review_contract.py` exercises the production gallery's real SDK bridge, rendered extraction, choice boundary, stale state, keyboard dismissal and narrow layout. Test references identify executable checks; they do not assert that any particular revision passed them.

For a layout or copy change, record the task, affected view/state, automatic findings, contextual decision and verification evidence. Review the page after the change. Automated diagnostics and selected options do not promote the custom component from **Unvalidated**.

See [the semantic review standard](../../../docs/hci/standards/semantic-review.md) for rule policy and CI scope.
