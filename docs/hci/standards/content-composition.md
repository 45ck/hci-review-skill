# Content that helps someone act

Start with the task, the selected object and its available actions. Use the shared [interface foundations](interface-foundations.md) for hierarchy and the [application layout](app-layout-system.md) for navigation. Copy should make a decision, consequence or state understandable. It does not need to fill every available slot.

## Give each piece of copy a purpose

| Part | Include it when | Example |
| --- | --- | --- |
| Page or section title | It identifies the current task or collection. | **Articles to review** |
| Selected-object title | It identifies the item being inspected. | **Preparing a release** |
| Description | It adds a relevant constraint, consequence or unfamiliar distinction. | **Approving this draft does not publish it.** Only use this when approval and publishing are separate. |
| Action label | It names what will happen to the relevant object. | **Save draft**, **Return to articles** |
| State message | It reports an actual pending or accepted state. | **Saving draft…**, then **Draft saved** after host acceptance. |
| Recovery message | It explains the problem and an available next step. | **The draft could not be saved. Your changes are still here. Try again.** Only promise retention if the host retains them. |

Use the same object and action names in visible labels, accessible names and agent discovery. Repeated controls need enough object context to distinguish them. A placeholder supplements a field label; it does not replace one. Status also needs text or another perceivable cue when color, glow or motion disappears.

## Remove repetition, keep useful context

These are editorial examples, not measured improvements or rules that every page must copy.

| Before | After | Reason |
| --- | --- | --- |
| **Article actions** / "Search the available actions." | **Article actions**, then the named search field and commands. | The subtitle repeats the control's purpose. |
| **A rule** / "Everything should have a clear next step." | **Title required** beside the title field, if it is required. | The message names a concrete constraint where it matters. Remove the original sentence if it adds no task information. |
| **No results** / **Continue** | **No articles match these filters** / **Clear filters** | The state and recovery action are specific. |
| **Success!** immediately after dispatch | **Saving draft…**, then **Draft saved** after acceptance. | The message follows the actual host state. |
| **Review article** / "Approve this article" on a flow that also publishes | **Publish article**, with the actual publication consequence. | The action and consequence must agree. |

An optional description, eyebrow or introduction can be absent. Do not render an empty text element or reserve its spacing. Keep the required title and accessible name. Use the SDK's description part only when there is meaningful content to associate. `LiquidCommandPalette` omits its description for missing, empty and whitespace-only strings; `LiquidSection`, `LiquidDetailSheet` and `LiquidEmptyState` also support omitted supporting copy.

Choose a dominant next action for the current state and keep relevant alternatives reachable. Put status beside the object or action it describes. Avoid repeating the same explanation in a heading, badge and paragraph. Do not add a universal word limit: a destructive consequence or unfamiliar recovery step can need more explanation than a familiar action.

## Write the whole state transition

Before polishing a success screen, describe what the person sees while work is pending, refused, canceled, completed or interrupted. Keep the draft or selected object available when the host supports recovery. Explain whether an action only prepares a proposal, saves locally, submits to a service or publishes externally.

The host owns execution, authorization, accepted data and recovery. Use the existing SDK callbacks and agent task/tool components. A button press, optimistic display or prepared request cannot justify a completed-result message. Preserve the library's required **Unvalidated** review status without presenting test counts as human approval.

## Review the composition in use

Check the rendered page with real titles, long labels, narrow layouts and text-spacing overrides. Check the accessible name and reading order after removing copy. Observe whether a person can identify the object, choose an appropriate first action and explain the outcome without coaching.

Record this judgement in the [HCI scorecard](../templates/hci-scorecard.md). Use the [task comparison record](../templates/task-comparison.md) and existing [evaluation protocol](../models/evaluation-protocol.md) for measured before/after claims. A shorter sentence or smaller page is not, by itself, evidence of better comprehension or faster work.
