---
name: zeigarnik-progress-review
description: Review honest progress, unfinished tasks, and reliable resumption with explicit Zeigarnik-effect limits. Use for onboarding checklists, progress bars, saved drafts, interrupted workflows, nearly complete profiles, or optional steps that prevent users reaching completion.
---

# Zeigarnik Progress Review

Help users understand remaining work, stop safely, and resume accurately. Keep the familiar principle name for discovery, but do not promise motivation or recall improvements from artificial incompleteness.

## Work from evidence

State the user's chosen goal, actual completion rule, available task states, and screenshot/code/trace/runtime evidence. Distinguish required work, optional enrichment, and promotions. If the completion rule is unknown, state the assumption and request its owner/source only when further progress depends on it.

## Review

1. Inventory steps and their dependencies. Mark each as required, optional, completed, blocked, or skipped with evidence. Do not make inviting friends, subscribing to marketing, or buying an upgrade required merely to achieve a displayed 100%.
2. Validate the progress basis. For equally weighted required steps, explain completed/total counts; use documented weights when steps differ. Keep optional work separate. Do not claim that 3 of 4 steps means 75% of elapsed time or effort. If total work is unknown, use an indeterminate state or descriptive status rather than a fabricated percentage.
3. Inspect changes to the denominator and failure states. Explain newly required work, validation failures, or unavailable steps; do not silently reset progress or inflate completion. Distinguish local edits from successfully saved work.
4. Check interruption and resumption: save, leave/cancel, refresh/reopen, resume at the correct place, retry after failure, and complete. Preserve valid input and avoid duplicate side effects. Use supplied traces or code if execution is unavailable, explicitly labeling the evidence level.
5. Verify readable remaining-work labels, accessible progress values, status announcements, and a clear next action. For a progressbar with unknown value, omit `aria-valuenow`; use an appropriate label and indeterminate semantics. Provide skip or dismiss for optional work without blocking the user's actual goal.
6. When asked to implement, reuse existing checklist, progress, persistence, and state components. Test the relevant interruption/recovery path and confirm that completed required work produces a real complete state. Treat completion-rate or satisfaction gains as hypotheses requiring user/product data.

## Return

Write `docs/hci/zeigarnik-progress-review.md` when requested, or return:

| Goal and step/state | Required or optional and why | Displayed versus actual progress | Save/resume evidence | Proposed fix | Verification |
| --- | --- | --- | --- | --- | --- |

Include the completion calculation, supported failures, no-change decisions, unknown persistence behavior, and checks actually run. Keep proposed changes distinct from implemented/verified ones. Never claim a screenshot proved resumption or a research effect proved engagement.

## Evidence limits

A 2025 meta-analysis did not support a general memory advantage for interrupted tasks, and distinguished that claim from a tendency to resume tasks (the Ovsiankina effect). Neither result proves that a near-finished progress bar will improve completion in this product. Use truthful state and recovery as the review's concrete targets.

Use `state-model` for broader lifecycle ambiguity and `peak-end-review` for the final completed state. Do not expand a small progress review into a new runtime or scoring framework.

## Sources

- [Ghibellini and Meier (2025), Interruption, recall and resumption](https://www.nature.com/articles/s41599-025-05000-w): meta-analysis of the Zeigarnik and Ovsiankina effects.
- [W3C APG: range-related properties](https://www.w3.org/WAI/ARIA/apg/practices/range-related-properties/).
- [W3C SC 4.1.3: status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).
