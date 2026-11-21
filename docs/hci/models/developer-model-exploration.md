# Developer model exploration: task and evidence

**Decision:** expose UML and UWE models as reusable interactive components inside the kit, with the same actions available to a person and an agent.

**Review status: Unvalidated.** A human UI/UX team has not reviewed and approved these custom components. This record defines the task, design choices and evaluation method; browser results establish only the behaviour observed in the tested build.

## Representative task

“Find the project's image type and explain how it relates to its parent asset type. Give the element a clearer label, switch to another model and return, then export the edited model. Use the navigation and presentation examples to identify where search starts and which controls belong to the page.”

Success requires selecting the intended model and element, correctly interpreting a relationship, editing only the requested label, retaining model identity, finding the same edit on return, and obtaining an export that agrees with the screen. The initial sample remains a demonstration of the supported notation, not a connected model of the running application's complete architecture.

## Model the design before measuring it

| View | Design object | Decision |
| --- | --- | --- |
| Task | Inspect, select, explain, rename and export | Keep the workflow explicit; no action requires drawing a connection or dragging a canvas. |
| Content | Diagram, stable node IDs, labels, kinds and relationships | Use a typed model as the common source for vector rendering, details and export. |
| Navigation | Kit catalogue → Developer components → chosen model → chosen element | Keep models in one destination and selection inside that destination; make both choices discoverable by name. |
| Presentation | Model chooser, diagram, element details, editor, export actions | Use clear reading surfaces for exact notation; apply the shared material to interactive framing. |
| State | Active model, selected node, per-model edited data, zoom, edit validation | Focus can move without discarding selection. Each session model retains its edits while another model is inspected. |
| Evaluation | Task success, interpretation accuracy, first action, errors and recovery | Treat notation comprehension and interaction operation as separate outcomes. |

UWE provides distinct views for navigation and presentation. Its [navigation tutorial](https://uwe.pst.ifi.lmu.de/teachingTutorialNavigation.html) allows navigation units on one or multiple pages, while the [presentation tutorial](https://uwe.pst.ifi.lmu.de/teachingTutorialPresentation.html) models the grouping of displayed controls. These distinctions help decide where a task is reachable and how its information is arranged; they do not prescribe the glass effect or establish its usability.

## Observable contracts

| Event | Expected result | Failure that matters |
| --- | --- | --- |
| Choose a diagram | The expected diagram and its text equivalent become available | Stale node details or an export from the previously viewed model. |
| Choose an element by name or node button | The same stable ID becomes selected; visible details describe it | Pointer and agent choices affect different state. |
| Move keyboard focus to editing | Selection is retained and the field describes the selected element | Focus movement silently changes the selected object. |
| Apply a valid name | Diagram, chooser, inspector and exported model agree | Only SVG text changes while the underlying model remains stale. |
| Apply an empty or overlong name | The model is unchanged and the reason is readable | An agent bypasses validation that a person encounters. |
| Change models and return | The session edit remains for that model | A model selection resets unrelated work. |
| Zoom and reset | Scale changes within declared bounds; reset returns the initial view | The apparent scale changes but labels or input targets become unreachable. |
| Export | JSON reflects the current model; SVG preserves exact vector structure and literal labels | Model IDs change, edges disconnect, or label text is interpreted as markup. |
| Forced colours or narrow screen | Named selection and text details remain usable | Meaning depends on translucent colour, tiny artwork or page overflow. |

The media task is complementary: choose a visual, inspect its detail, compare presentations and return to the previous control. Its success concerns understandable image identity and recoverable navigation. An attractive generated image alone is not evidence that the surrounding card, gallery or dialog is good UI.

## Automated implementation evidence

Use the real SDK bridge rather than synthetic DOM state changes. Discover model and element options through `query`; call their advertised actions; verify the DOM and exported data afterward. Repeat selected actions with keyboard and pointer input. Probe both accepted and rejected label edits. Keep a human-readable screenshot of each model, one narrow layout and the forced-colour path alongside the structured report.

Check that all visible SDK entries have names. Inspect relationships as text as well as SVG; a screenshot cannot establish that an agent or screen reader receives the same meaning. Keep generated artwork local, loaded and labelled. The all-foundation-family, material, animation and popup checks remain independent regression gates.

Automated checks support a statement such as “this build preserved the edited node ID through model switching and exported its current label.” They do not support “developers understand the architecture faster” or “the component is approved.” The status therefore remains Unvalidated.

## Human UI/UX review

Recruit people who match the intended tasks, including those who use UML routinely and those who need occasional orientation. Record prior notation familiarity and input method. Include keyboard and assistive-technology sessions where those users are in scope. Compare equivalent models with an existing familiar diagram view, or compare two proposed presentations with notation and content held constant. Counterbalance order to reduce the effect of learning the sample.

Collect final-task success, correct relationship explanations, first-action correctness, wrong-node edits, recovery actions, time under a predefined timeout, and confidence after each task. Keep failures in the denominator. Separately record whether participants correctly interpret Unvalidated and SDK foundation; the status labels are part of the interface, not internal release jargon.

Reuse the existing HCI models only where their variables fit:

- **Affordance:** measure the intended first action and confusing alternatives.
- **Choice complexity / Hick–Hyman:** compare model or element finding under stated choice counts and familiarity; do not turn a formula into a measured completion time.
- **Fitts:** inspect the size and distance of interactive targets, then test whether the chosen layout reduces selection errors in the relevant input mode.
- **Progressive disclosure:** test whether initially showing selected-element detail helps the inspection task without hiding essential relationships.
- **Typography:** record actual label sizes and line spacing alongside reading and relationship-interpretation errors.

Follow the [evaluation protocol](evaluation-protocol.md) for independent units, uncertainty and predefined worthwhile differences. Keep model version, interface build, sample data, raw observations, analysis and review decision together. A team can then approve a precise usage scope, request a revision or reject the pattern with evidence. Until that review is recorded, every custom component keeps its Unvalidated status.
