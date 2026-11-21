# Developer components and review status

The **Developer components** section adds interactive UML and UWE views to the Liquid Glass kit. **Visual components** demonstrates image-led compositions using the same controls. Both are custom Quantive components and remain **Unvalidated**.

Here, **Unvalidated means that a human UI/UX team has not reviewed and approved this custom component**. It is a product review status, not a claim that the component has no automated checks. Passing TypeScript, browser, notation or accessibility checks cannot remove the label.

## Provenance and approval are different

| Label | Meaning | What it does not establish |
| --- | --- | --- |
| SDK foundation | The interaction primitive comes from the pinned Vercel UI SDK, with upstream provenance in the component manifest. | Human approval of Quantive styling, a new composition or a particular product task. |
| Unvalidated | Quantive owns the new component or composition; human UI/UX team approval has not been recorded. | That no engineering checks were run, or that the underlying SDK primitive has no upstream work. |

Keep the visible status beside the custom component's title and expose the explanation as readable text. A tooltip alone is insufficient for an essential qualification. The same status belongs in its documented API and catalogue metadata. Do not infer approval from using a familiar diagram notation, from an automated agent completing a task, or from a screenshot that looks finished.

If a team later reviews a component, retain the component ID, exact version, reviewers, review date, tested tasks, participant/device scope, findings and remaining restrictions with the decision. Approval applies to that recorded scope; a materially changed interaction needs a new decision. No reviewed state is asserted by this release.

The [Vercel UI repository](https://github.com/vercel-labs/ui) describes a library of UI behaviours. Quantive uses the documented components and their agent bridge, while owning the new visual compositions. The installed version remains the API authority; do not substitute a newer online example for an unavailable method.

## Notation contract

Use **OMG UML 2.5.1** as the notation reference. The renderer implements a bounded subset, not a complete UML modelling tool. The initial examples cover UML class and component structure plus UWE navigation and presentation. It does not claim UML conformance, full semantic validation, XMI interchange, automatic layout or code generation.

| View | Semantic information to preserve |
| --- | --- |
| UML class | Class name, attributes and operations in separate compartments; visibility and multiplicity as explicit text; direction and end markers of relationships. |
| UML component | Components distinguishable by the component keyword/icon; interfaces identified separately; dependencies and realizations keep their different line/arrow conventions. |
| UWE navigation | Navigation units, indexes, menus, queries and processes retain their stereotypes. Navigation links and process links remain distinguishable in text as well as in the picture. |
| UWE presentation | The page and contained groups/controls keep their containment and stereotypes. A containment view is not an assertion that navigation or a business process has been implemented. |

Glass belongs on the surrounding interactive controls and framing. Diagram labels, compartment separators, arrowheads, diamonds and stereotypes remain crisp and stable. Do not replace a normative marker with an isometric illustration or make relationship meaning depend on colour. Generated artwork is suitable for the media showcase, never for exact diagram geometry.

The typed model owns IDs, labels, node kinds, relationships and supported presentation properties. Selection and label editing refer to stable IDs. Changing a displayed name must not recreate identity, disconnect edges or mutate an unrelated model. SVG export and the text equivalent must be derived from this same model. Escape text in exported SVG; user-authored labels must remain text rather than executable markup.

## One interface for people and agents

Use the existing SDK `createAgent` bridge. All task actions use SDK components and normal application callbacks. For example, the **Diagram model** Select changes the same model for a pointer, keyboard user and SDK agent. **Diagram element** selects the same node as a named node button. **Apply element label** applies the same validation regardless of input source.

An agent discovers available choices with `query`, takes values from the returned items and calls the advertised action. Do not add a second global API that directly changes diagram state, or a hidden command field whose rules differ from the visible controls. Agent success must be checked against the resulting rendered and exported state; a successful transport response alone does not prove an accepted edit.

Each control needs a meaningful, unambiguous accessible name. Preserve the distinction between focus and selection. A selected node stays selected while focus moves to its label field or export action. Popup controls retain their established Escape, keyboard and focus-return behaviour. Give click/tap alternatives to any dragging task; keyboard equivalence alone is not a complete single-pointer alternative. The initial diagram viewer therefore offers named zoom controls and direct element selection without requiring canvas dragging.

The SVG is one representation, not the sole source of information. Provide a title/short description, a named element chooser, selected-element details, and readable relationships with their source, target and kind. Keep the text representation available to everyone. This follows the W3C guidance for complex images while supporting agents that operate conventional semantic controls instead of interpreting pixels.

For image components, use useful alt text for meaningful images, captions for context and visible selection state. Preserve native image dimensions and bounded responsive layouts. Thumbnail choice, previous/next, detail opening and comparison values must be reachable through named SDK controls. Avoid autoplay; a person controls when displayed imagery changes.

## Evidence and release gate

Run the repository's standard source/build and browser verification. Add task-level checks for the custom components, without relaxing existing GPU, popup or foundation-component checks.

| Evidence | Required observation |
| --- | --- |
| Notation | Inspect the actual SVG and sample model: marker direction, compartments, stereotypes, multiplicities and containment match the declared subset. |
| Agent/human equivalence | Pointer/keyboard and SDK `query`/`act` reach the same selection, edited label, media item and visible result. |
| Model integrity | Label changes preserve IDs and relationships; invalid edits leave the model unchanged; model switching retains each session draft. |
| Export | The current model is serialized; SVG is standalone vector markup with escaped labels and no embedded executable content. |
| Access and layout | Named controls, text equivalent, focus, narrow viewport, forced colours and reduced motion remain usable. Diagram-local scrolling must not create page-level overflow. |
| Media | Bundled images load, have dimensions and useful alternatives, and detail dialogs restore focus on dismissal. |
| Review status | Every custom example remains visibly Unvalidated after successful engineering checks. |

Record exact build and browser versions with evidence. A geometry check does not measure comprehension; successful agent actions do not establish ease of use for people. Follow the [worked exploration model](../models/developer-model-exploration.md) for human evaluation before making recognition, productivity or approval claims.

## Primary references

- [OMG UML 2.5.1 specification and normative documents](https://www.omg.org/spec/UML/2.5.1), particularly classifiers, relationships, components and profiles.
- [LMU: About UWE](https://uwe.pst.ifi.lmu.de/aboutUwe.html), explaining its use of UML and web-specific profile extensions.
- [LMU: UWE navigation tutorial](https://uwe.pst.ifi.lmu.de/teachingTutorialNavigation.html) and [presentation tutorial](https://uwe.pst.ifi.lmu.de/teachingTutorialPresentation.html).
- [W3C WAI: Complex images](https://www.w3.org/WAI/tutorials/images/complex/), for short and structured long alternatives.
- [W3C APG: Developing a keyboard interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/), for predictable focus and selection.
- [W3C: Understanding dragging movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html), for non-drag single-pointer alternatives.
- [Vercel UI SDK](https://github.com/vercel-labs/ui) and the installed `@ui-sdk/react/docs/agents.md`, for the shared state/action contract.
