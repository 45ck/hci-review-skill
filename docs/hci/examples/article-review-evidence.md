# Article review: a before/after evidence plan

**Status:** proposed domain scenario; no participant observations or measured usability gains. The existing layout gallery supplies a fictional local review task, not an article crawler, publisher or production service. Custom components remain **Unvalidated**.

This filled planning example follows the [task comparison template](../templates/task-comparison.md), [evaluation protocol](../models/evaluation-protocol.md) and [content composition standard](../standards/content-composition.md). It distinguishes a proposed article workflow from the reusable implementation available today.

## Task and ownership

**Goal:** review the proposed title for the article “Preparing a release,” save an acceptable draft revision, then return to the filtered article list with the selected article still identifiable.

Use a fictional fixture with a stable article ID, current title, proposed title, revision, review status and the original filter. Success means the host accepts exactly one intended revision for that article, the shown result matches the accepted record, and the return path preserves the relevant list context. Saving a draft does not publish it in this proposed scenario.

The consuming application owns article data, permissions, persistence, network execution and late-result handling. Compose the existing layout, detail and SDK actions under one provider and agent bridge. Reuse the existing agent task/tool review components when the host produces agent proposals. Do not add an article store, crawler or alternate execution endpoint to the component library.

## Copy and hierarchy to compare

The following text is an authored comparison to implement in matched fixtures. It is not a screenshot transcription or a result from participants.

| Task state | Baseline copy to examine | Candidate copy and hierarchy | Expected benefit to investigate |
| --- | --- | --- | --- |
| Article collection | **Content** / "Your content, all in one place." | **Articles to review**; named filters; article title and review state in each row. | Correct first action without relying on remembered navigation. |
| Selected article | **A rule** / "Every article deserves a better title." | **Preparing a release**; current and proposed title with **Save draft** beside the change. | Identify the object and distinguish the existing value from the proposal. |
| Save pending | **Success!** on dispatch | **Saving draft…** while the host is pending. | Understand whether work has actually been accepted. |
| Save accepted | **Done** | **Draft saved**, followed by **Return to articles**. | Explain the result and find the return path. |
| Save refused | **Something went wrong** | **The draft could not be saved. Your changes are still here. Try again.** | Recover without re-entering the proposal, when the host actually retains it. |
| No matching rows | **No results** / **Continue** | **No articles match these filters** / **Clear filters**. | Recover from filtering without losing the underlying record. |

The baseline is deliberately illustrative. Replace it with the actual previous source/build and content before claiming a before/after improvement. Remove redundant copy only where the task remains understandable; keep a useful constraint such as “Saving a draft does not publish it” when that distinction matters.

## Existing implementation to exercise

The [application layout study](../standards/app-layout-system.md) already provides the shell and a local review/decision/return loop. Its implementation is [layouts-showcase.tsx](liquid-glass/src/layouts-showcase.tsx), with state in [layouts-state.ts](liquid-glass/src/layouts-state.ts). The compiled [application-shell recipe](liquid-glass/src/recipes/application-shell.tsx) is the reusable starting point. Its fictional review records are not the article fixture above.

The relevant automated scenarios are:

| Scenario / source | What it can establish when executed | What it cannot establish |
| --- | --- | --- |
| `layouts_real_sdk_responsive_tenant_and_state` in [glass_layouts_contract.py](../../../tests/glass_layouts_contract.py) | Behavior of the current local layout task, SDK operations, context separation and responsive states within its exact assertions. | A live article service, production authorization or human task comprehension. |
| [test_app_layout_state.mjs](../../../tests/test_app_layout_state.mjs) | In-memory state transitions and refusal/recovery cases within its assertions. | Server persistence, production tenancy or observed user recovery. |
| `patterns_commands_filters_selection_and_details` in [glass_patterns_contract.py](../../../tests/glass_patterns_contract.py) | Command/filter/selection/detail behavior, focus and accepted local results within its exact assertions. | Article quality, discoverability or faster human review. |

Attach the matching run artifacts after execution. This table declares evidence sources; it is not a test-pass record.

## Measurement plan before a human comparison

Use equivalent article-review tasks and counterbalance their order so reading the same proposal twice does not become the candidate's advantage. Compare the same fixture complexity, viewport/input, font, locale, preferences and network condition. Keep each participant's repeated tasks within that participant's predetermined summary.

The proposed primary outcome is **correct first action**, using the existing `affordance` model. Before collecting data, define which actions count as correct and the no-action timeout. Record task completion, incorrect-object edits, explanation of pending versus saved state, recovery and return-context errors separately. Completion time is exploratory unless selected in advance as the primary outcome.

The minimum worthwhile gain and sample-size/precision rationale are **not yet chosen**. Agree on them before collecting results, using baseline difficulty and the cost of a wrong action. No human comparison or calculator threshold decision is claimed by this plan. Browser fixtures remain descriptive coverage, even when run repeatedly.

## Guardrails

- The accepted article ID and revision match the intended change; a dispatched action alone is insufficient.
- Cancel/refusal retains useful draft context where promised; a late response cannot replace newer work.
- A prohibited action remains refused through both human and SDK-agent controls.
- Return preserves the relevant filter/selection, with a reachable destination and visible keyboard focus.
- Long titles, text-spacing overrides and zoom do not remove the action or recovery information.
- Reduced motion, solid material and forced colors preserve meaning and operation.
- Any screen-reader finding names the actual technology, procedure and result.

## Evidence record to complete after execution

| Evidence category | Current result | Required record |
| --- | --- | --- |
| Automated local review workflow | Not run in this example | Exact commit/build, scenario, command/exit code, accepted result, failures and artifact paths. |
| Automated title-only command palette | Not run in this example | Matching Patterns browser report: dialog name, absent description, accepted command effect and focus return. |
| Proposed article-specific workflow | Not implemented by this document | Host fixture, baseline/candidate source and executed article-task traces. |
| Human first action, completion and recovery | Unmeasured | Independent-unit/attempt log, all failures, prespecified endpoint and uncertainty. |
| Human UI/UX review | Unvalidated | Reviewer, date, scope, findings and decision. |

**Next decision:** first assess the existing local review loop using recorded implementation results. Then decide whether the article task warrants a host-specific fixture and human comparison. No statement about better comprehension or faster work follows from the authored copy examples alone.
