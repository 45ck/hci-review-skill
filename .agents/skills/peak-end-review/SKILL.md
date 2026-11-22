---
name: peak-end-review
description: Review demanding moments and task endings using the peak-end rule. Use for unclear save or submit outcomes, weak success states, confusing completion screens, intrusive celebrations, and journeys where the final state undermines confidence.
---

# Peak-End Review

Improve the hardest relevant moments and provide truthful task closure. Treat remembered experience as a hypothesis to evaluate, while checking the entire journey for functional failures.

## Work from evidence

State the task, start/end boundaries, and available screenshots, logs, source, or interaction traces. Identify a demanding moment from actual user observations when available; otherwise label it as an agent hypothesis. Include failure, cancellation, and deferred completion, not just the happy path.

## Review

1. Map the shortest meaningful journey. Locate consequential waiting, uncertainty, errors, irreversible choices, and the actual terminal state. Do not assume that a visually dramatic moment is the user's emotional peak.
2. Check what success means in the underlying system. Distinguish locally entered, queued, submitted, saved, accepted, and completed states. Confirm persistence or the authoritative response when evidence permits; a button click or HTTP acceptance alone may not mean the whole task finished.
3. Inspect the ending: what completed, for which object, what remains, what happens next, and how to leave or revisit it. Show a useful receipt, reference, result link, or undo only when the system supports it. Avoid vague success claims and repeated submissions.
4. Check the failure/partial/cancel path alongside success. Preserve work, explain recoverable steps, and avoid treating cancellation as success or trapping the user in a celebration. Improve earlier blockers instead of covering them with a pleasant ending.
5. Make confirmation proportionate to the task. Use existing status and motion components, accessible status announcements, and sensible focus handling. Nonessential celebration must respect reduced motion and must not add forced delay or block the next action. A modal is not required for every successful operation.
6. When asked to implement, exercise the relevant success, failure, and retry paths in a safe environment. Verify no false success, duplicate action, lost state, focus trap, or missing next step. Report remembered satisfaction only if measured with users, separately from functional correctness.

## Return

Write `docs/hci/peak-end-review.md` when requested, or return:

| Journey moment and state | User expectation | Actual result and evidence | Closure/recovery gap | Proposed fix | Verification |
| --- | --- | --- | --- | --- | --- |

Give the most consequential gaps first. Include implemented versus proposed status, unknown backend outcomes, and checks that could not run. If the ending already provides adequate closure, retain it and say why.

## Boundaries

- Peak-end findings concern retrospective evaluation in studied conditions. They do not mean people remember only peaks/endings, or that confetti repairs a broken process.
- Do not add artificial delays or withhold a completed result to manufacture an emotional moment.
- Use `failure-path-audit` for a full state-coverage review and `zeigarnik-progress-review` for work that should remain resumable.

## Sources

- [Kahneman et al. (1993), When More Pain Is Preferred to Less](https://www.psychologicalscience.org/journals/psychological-science/j.1467-9280.1993.tb00589.x/): original experimental context and findings.
- [W3C SC 4.1.3: status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).
- [W3C C39: reduced motion](https://www.w3.org/WAI/WCAG22/Techniques/css/C39.html); its associated SC 2.3.3 is AAA, not an AA requirement.
