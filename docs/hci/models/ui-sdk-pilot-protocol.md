# UI SDK pilot: compare controls and operation paths

**Decision:** determine whether a small settings workflow can use UI SDK controls and its agent bridge correctly, and record the integration and execution costs before considering a wider trial. This is a controlled engineering fixture, with no participants or model calls.

The plan follows the repository's [evaluation protocol](evaluation-protocol.md). The primary endpoint is **independently verified task completion**. Duration, automation-command counts and built asset size are secondary diagnostics. No financial or productivity threshold is implied by this feasibility run.

## Three comparison arms

| Arm | Interface | Driver | Question answered |
| --- | --- | --- | --- |
| `native-dom` | React with native HTML controls, `/baseline.html` | Playwright browser operations | What does the simple existing-control approach achieve on this fixture? |
| `sdk-dom` | React with UI SDK controls, `/sdk.html` | Playwright browser operations | Does changing the controls preserve the task outcome and ordinary browser operation? |
| `sdk-bridge` | The same SDK page | The fixture's `uiSdkAgent` snapshot/action interface | Can explicit component actions accomplish the same task, under the fixture's action policy? |

All arms use the same labels, option values, initial data, validation, save handler, visible saved-state output and CSS treatment. The baseline is a new native-control reference fixture; it is not a measurement of an existing customer application. The SDK browser and bridge arms share one implementation, so differences between those arms concern the driver as well as its waiting and transport behaviour.

The fixture saves only to its own in-memory state. A readback verifies that state through a separate observation path, outside the bridge response. It does not establish backend persistence, authorization or production readiness.

## State and action contract

| Field | Accessible label | Allowed values | Initial value |
| --- | --- | --- | --- |
| `region` | Region | `sydney`, `frankfurt`, `singapore` | `sydney` |
| `retention` | Retention | `30`, `90`, `365`, as strings | `30` |
| `digest` | Weekly digest | Boolean | `false` |
| Save action | Save settings | Saves the validated draft | Disabled while the draft equals saved state |

Initially, both the draft and saved state are `{region: "sydney", retention: "30", digest: false}`, and the save counter is zero. A successful save increments the counter once and makes the draft clean. `?readonly=1` disables all field changes and saving. The SDK action policy allows only the stated controls, actions and value domain; rejection is visible in the trace and must leave state unchanged.

`?reject=1` provides a deliberately cancelled change to retention `365`. It is a fault-injection case for the verifier: an action response cannot establish that the requested value was applied. Record the actual response and the unchanged application state separately.

## Routine tasks, fixed before measurement

Each task starts from a fresh page and isolated browser context. The same task ID has the same expected outcome in all three arms.

| ID | Operation | Expected draft and saved state | Expected saves |
| --- | --- | --- | --- |
| T1 | Set Region to `frankfurt`, then save | `{region: "frankfurt", retention: "30", digest: false}` | 1 |
| T2 | Set Retention to `90`, then save | `{region: "sydney", retention: "90", digest: false}` | 1 |
| T3 | Enable Weekly digest, then save | `{region: "sydney", retention: "30", digest: true}` | 1 |
| T4 | Set Region to `singapore`, Retention to `90`, and Weekly digest to true; save | `{region: "singapore", retention: "90", digest: true}` | 1 |
| T5 | Make the three changes in T4, then restore every field to its initial value without saving | Both draft and saved state equal the initial state; Save is disabled | 0 |
| T6 | Complete T4; change only Region back to `sydney`; save again | `{region: "sydney", retention: "90", digest: true}` | 2 |

The outcome check compares every field, the save count and the expected clean/disabled state. A correct-looking label, a successful action response or a driver that returns without an exception is insufficient. Retain initial and final observations so an unexpected change to an untargeted field remains visible.

## Collection matrix

Run three fresh trials for every task, arm and profile:

| Profile | Viewport | Other settings |
| --- | --- | --- |
| Desktop | 1280 × 800 CSS px | Default motion |
| Mobile | 390 × 844 CSS px | Emulated mobile/touch settings recorded by the runner |
| Reduced motion | 390 × 844 CSS px | Same mobile profile with reduced motion requested |

This produces **162 routine attempts**: 6 tasks × 3 arms × 3 profiles × 3 repetitions. Rotate arm order across repetitions, record the actual order, and create a new context for each attempt. Wait for the page to be ready before starting task timing. Hold the browser build, machine, application revision, data and package lock constant.

These are fixed coverage conditions and reload repetitions, not 162 independent people or production workflows. Mobile and reduced-motion results concern emulation in the recorded browser, not physical-device usability or assistive-technology performance.

## Separate guardrails

Run these checks separately from routine-task completion and timing summaries. Report each executed case and its observed outcome; an unexecuted case stays unverified.

| Check | Required evidence |
| --- | --- |
| Read-only save | On `?readonly=1`, an attempted bridge save must leave draft state, saved state and save count unchanged. Record the denial. The initial draft is clean, so this case alone does not isolate the read-only policy from clean-save prevention. |
| Read-only edit | On `?readonly=1`, attempt a Region change through the bridge. Record the denial and verify the draft, saved state and save count remain unchanged. |
| Unsupported action or reference | Attempt an action outside the allowlist and a nonexistent reference. Preserve the error/denial and verify no state change. |
| Invalid option | Attempt a value outside the enumerated domain. Verify neither draft nor saved state changes. |
| Cancelled change | On `?reject=1`, request retention `365`. Preserve the bridge response and show that independent verification detects the unchanged value. This is a successful verifier check, not a successful retention-change task. |
| Clean save/repeated save | Save once, then verify Save is disabled. An attempted repeat must not increase the save counter. This only tests the fixture's clean-state behaviour, not network idempotency. |
| Keyboard operation | Operate both native and SDK controls with keyboard input, verify the resulting state, and inspect focus and disabled-state behaviour. Bridge operation cannot substitute for this check. |
| Layout and labels | Check for horizontal overflow, visible control labels and usable focus indication in the tested profiles. Report exactly what was checked. |

The bridge allowlist is a UI fixture policy. It is not a backend authorization mechanism. No cross-tenant, authentication, network failure, screen-reader, full WCAG or hostile-content claim follows unless a separate test actually covers it.

## Measurements and interpretation

| Measurement | Definition and reporting rule |
| --- | --- |
| Task completion | Number of routine attempts whose independently observed final state, save count and clean state match the case, divided by all scheduled attempts. Report by task, profile and arm; keep failures in the denominator. |
| Scripted duration | Monotonic wall time from the first task operation to successful independent verification, excluding page startup. Preserve timeouts, errors and elapsed time. For completed pairs, report within-task deltas and medians by profile; identify success-only summaries and their denominators. |
| Semantic actions | The actual field changes and save steps attempted. A batch with four steps still contains four semantic actions. Include denied and failed attempts in the trace. |
| Automation commands | Calls made by the harness to the driver, with the counting boundary documented. Separate observation, action and verification commands where counted. These are not automatically model tool calls or low-level browser-protocol roundtrips. |
| Bridge batching | Record how many `act` requests and how many steps each request contains. Any reduction from packaging several steps in one request is a batching result. It does not demonstrate better planning or lower token use. |
| Build size | Measure baseline and SDK production entry points separately, preserving the same build mode. Record loaded JavaScript and CSS bytes and compression method. Shared or unused SDK imports must not contaminate the baseline. Report the absolute increment as well as any ratio. |
| Integration cost | Record changes and package versions. Report engineering time or money only if directly tracked; otherwise mark them unmeasured. |

The scripts already know the target labels, values and task sequence. They do not test whether a model can discover controls, choose a plan, recover from ambiguity or resist untrusted instructions. Browser automation and the bridge may use different waiting policies, event paths and transport batching. Their measured duration is the cost of these particular scripts on this fixture, not a pure component-speed measurement.

Use descriptive analysis. Preserve all per-attempt records, and show the three repetitions rather than interpreting them as independent study participants. Do not compute a population confidence interval, significance claim or overall productivity percentage from this matrix. The existing `compare.py` accepts named HCI-model metrics; do not relabel task duration as an unrelated model just to obtain an interval.

## Evidence and decision record

Save the tested source revision, package-lock hash, fixture and runner hashes, exact command, UTC run time, browser and runtime versions, profile settings, ordering, raw attempts, guardrail results and build measurements. Retain failed runs and note any implementation correction followed by a new run. A later source change requires a new run or an explicit statement that the evidence predates it.

| Result | Decision supported |
| --- | --- |
| All routine cases and executed guardrails pass | This settings fixture is feasible enough to consider a larger agent trial; no broader adoption is established. |
| Routine regression, unexpected save, or policy breach | Fix the specific defect and rerun the affected comparison before recommending this pattern. Preserve the failed evidence. |
| SDK works, but timing or size is worse | Keep the observed tradeoff visible. Compatibility alone is not a reason to replace the current controls. |
| Faster scripted operation | Treat it as a local driver-path observation. Test a model-operated workload before claiming token, cost or development-speed benefits. |

Any subsequent model trial needs versioned prompts, the same model configuration and permissions, equivalent tasks, independently verified outcomes, full traces including retries, and actual token/cost accounting. A human usability study additionally needs representative participants and a separate study design. Those are follow-on experiments, not results of this fixture.
