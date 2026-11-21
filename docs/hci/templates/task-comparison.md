# Before/after task evidence: [task name]

> Record ID: [stable study-local ID]
> Date and author: [YYYY-MM-DD; person or automation]
> Decision: [what this comparison should decide]
> Status: [planned, collecting, or recorded]
> Human review: [Unvalidated, or link to scoped review]

Use this with the [HCI scorecard](hci-scorecard.md) and [evaluation protocol](../models/evaluation-protocol.md). Record an unrun check as **not run** and an unobserved outcome as **unmeasured**. The [article review example](../examples/article-review-evidence.md) shows a plan without invented results.

## Task and expected outcome

- Intended user, device and relevant knowledge:
- Goal, without directing the person to a particular control:
- Starting state and exact content fixture:
- Accepted result that counts as success:
- Important failure, cancellation and recovery cases:
- State owner and execution boundary: [local fixture, host service, or another actual boundary]

## Matched variants

| Condition | Before / baseline | After / candidate |
| --- | --- | --- |
| Source commit, build URL and dirty-state note | | |
| Content fixture and starting state | | |
| Changed copy, hierarchy or interaction | | |
| Browser/device, CSS viewport and zoom | | |
| Input mode, font, locale and text-spacing overrides | | |
| Effective material/motion/forced-color preferences | | |
| Network, data reset and timing boundary | | |
| Screenshot or recording at equivalent task state | | |

Hold unrelated conditions constant or record why they differ. Screenshots illustrate the compared states; they do not measure comprehension, completion speed or accessibility conformance.

## Predetermined measurement plan

- Primary task outcome and unit:
- Relevant existing model and calculator output, if applicable:
- Minimum worthwhile difference and its basis:
- Independent unit and sample-size/precision rationale:
- Order/counterbalancing and equivalent-task plan:
- Failure/timeout treatment and denominators:
- Exclusions or missing-data rules:
- Analysis: [descriptive fixed fixtures, or paired observations with a justified sampling basis]
- Required guardrails and separate acceptance basis:

Do not use frames, rerenders or repeated runs from one participant as independent users. Fixed browser/device matrices are descriptive coverage. Use the protocol's paired comparison only when its assumptions fit; its minimum finite-interval sample is not a general study-size recommendation. Unplanned metrics are exploratory.

## Attempt log and raw artifacts

Record every attempt, including no action, rejected changes, failures, timeouts and missing data. Link raw observations; store no participant secrets in the record.

| Attempt / independent-unit ID | Variant / order | Input and condition | Observed result | Primary value / unit | Failure or missing-data reason | Trace / screenshot / raw record |
| --- | --- | --- | --- | --- | --- | --- |
| | | | Not run | Unmeasured | | |

For an automated action, record the accepted host result as well as dispatch. For delayed work, include cancellation and late-result handling where relevant. If no attempts have run, leave the log empty or retain the explicitly unrun row; do not fill it with illustrative participant scores.

## Guardrails and implementation checks

| Check | Acceptance basis | Before status | After status | Evidence / remaining issue |
| --- | --- | --- | --- | --- |
| Correct object and accepted result | | Not run | Not run | |
| Error, cancellation and recovery | | Not run | Not run | |
| Keyboard/focus and accessible name | | Not run | Not run | |
| Content expansion, zoom and narrow layout | | Not run | Not run | |
| Effective material/motion/forced-color preferences | | Not run | Not run | |
| Host authorization / context isolation, where relevant | | Not run | Not run | |

Record the command/scenario, exit code, source commit/build and artifact path for each executed check. **Pass**, **fail**, **not run** and **not applicable with reason** are independent of the primary metric. Name the actual assistive technology and procedure for any screen-reader claim.

## Results and decision

| Evidence category | Result | Scope / uncertainty |
| --- | --- | --- |
| Implementation checks | Not run | |
| Measured task outcomes | Unmeasured | |
| Human UI/UX review | Unvalidated | |

- Included independent units, attempts, failures and exclusions:
- Primary outcome, observed difference and uncertainty:
- Calculator input/output paths, if used:
- Failed guardrails:
- Interpretation: [descriptive, meets-threshold, below-threshold, inconclusive, or unmeasured; use the protocol's meanings]
- Decision and next evidence needed:

A measured improvement does not establish full accessibility conformance, production reliability or human approval. Keep those scopes explicit in the [scorecard](hci-scorecard.md).
