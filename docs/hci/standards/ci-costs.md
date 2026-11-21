# CI cost and delivery

Keep necessary verification and ship useful changes. Reduce redundant candidates
and repeated work; a smaller bill is not evidence of adequate QA.

## Repository workflow

Reuse the shared UI SDK and Liquid Glass contracts. Coordinate root instructions and shared package/lockfile changes with the active integration owner; preserve active UI/material/layout work.

## Choose checks by the changed risk

| Change | First check | Required follow-through |
| --- | --- | --- |
| Agent contract change | `npm run glass:agent-check` | Run the affected contract tests first during diagnosis; preserve refused/cancelled action cases. |
| Package candidate | `npm run glass:verify` | Keep the build, canonical agent docs and structural gates together. |
| Interaction/layout/material change | `python3 tests/test_glass_browser.py` against the production preview | Retain required real browser, GPU-pixel, preference, mobile, keyboard and focus evidence. |

Focused checks shorten diagnosis. They do not replace existing merge, release,
security, compatibility, coverage or acceptance requirements. Shared runtime,
dependency, test-runner or workflow changes need the broader applicable gates.

## Publish a coherent candidate

1. Inspect current branches and open PRs. Assign one integrating writer for shared
   CI, configuration and lockfiles; preserve other agents' work.
2. Finish one reviewable increment, run its focused checks and required local gate,
   then publish together. Keep ownership claims timely where the repository requires them.
3. Read the actual remote result for that commit. On failure, capture the first
   relevant error, diagnose locally where possible, and retry the smallest failed
   job set only when a fix or transient-failure explanation warrants it.
4. Request a preview or manual heavy run when someone needs that result. Reuse
   valid evidence for an unchanged candidate; do not poll by dispatching workflows.
5. Record commit/PR, check scope, commands, outcomes, run links and retry reason in
   the existing handoff or change record. Keep blocked and unrun checks explicit.

## CI/CD warnings

> [!WARNING]
> The Liquid Glass PR gate includes a build and browser/GPU checks. Its manual browser_check input supports a focused diagnostic scenario; that diagnostic is not a substitute for the full required candidate suite.

GitHub can repeat dependent jobs when a failed job is rerun. A cancelled or
previously green run is not proof about a changed candidate. Do not add `[skip ci]`,
disable required jobs, lower thresholds or use forced green results as a cost control.
Path-filter changes require coverage proof and compatible required-check behaviour.

Keep Unvalidated human-review status and existing accessibility/material restrictions. Do not label a structural check, screenshot or focused browser scenario as full product or human usability validation.

## Measure the outcome

Use the existing run/deployment records: accepted change, commit, run attempt, job
duration, outcome and retry reason. Compare runner minutes, elapsed delivery time
and failed/repeated work per accepted change. Keep provider CPU usage, credits and
actual invoices separate; job counts and elapsed wall time alone are not billed cost.
This guidance adds no schedule, workflow, dependency or paid service.

References: [GitHub job reruns](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs)
and [skipped workflow checks](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs).
