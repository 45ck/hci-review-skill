# Standards, graphics and shared canvas

**Standards** covers business, systems, software, knowledge, interchange, middleware, measurement and industry specifications. **Graphics** combines editable compositions with the existing image components. Both extend the pinned Vercel UI SDK and remain **Unvalidated**: no human UI/UX team has reviewed or approved these custom components.

The full OMG catalogue is a discovery registry. A reference entry is not an implemented language, runtime, protocol or interchange format. Coverage is attached to an exact authority/version and must never silently transfer to a newer release. Read [OMG coverage](omg-coverage.md) for the complete inventory, supported subsets, primary sources and limitations.

## Additive package contract

| Entry | Purpose |
| --- | --- |
| `@quantitative-hci/liquid-glass/standards` | Model/scene types, renderer, runtime validation, SVG serialization, full catalogue and deterministic search. |
| `@quantitative-hci/liquid-glass/viewport` | Shared SDK canvas camera and navigation controls. |
| `@quantitative-hci/liquid-glass/graphics` | Controlled image/text/shape composition, validation, context and export. |
| `@quantitative-hci/liquid-glass/media` | Image cards, gallery and comparison. |
| `@quantitative-hci/liquid-glass/developer` | Compatibility export for existing consumers; new UI and examples say Standards. |

Each has its corresponding CSS subpath. Keep all 55 upstream families available. Import interaction controls from documented `@ui-sdk/react/<component>` entries. New behavior uses documented `@ui-sdk/core` primitives and the existing `createAgent` bridge; never fork Vercel's foundation or add a hidden state-changing API.

## Canvas controls by default

`LiquidViewport` uses the installed SDK's `createViewport`. Fit the whole world initially, then support drag pan, scroll pan, anchored Ctrl/Command-wheel zoom, touch pinch, explicit zoom percentage, fit, actual size, focus selection and a full-window view. Zoom is bounded to 10–400%. Focus the canvas for arrows, +/−, 0 and F. Space/Hand allows panning over selectable content.

Every drag task must have a non-drag single-pointer alternative: directional buttons and zoom controls for the camera; transform fields for graphics; geometry fields for standards elements. This follows the [W3C dragging-movements guidance](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html). Keyboard support alone does not replace those controls.

Camera actions use the same cancellable SDK change path whether invoked by pointer, keyboard, a control or an agent. SDK snapshots expose the current camera and supported actions. Native pointer capture, pinch and coordinate conversion stay with the SDK. The full-window canvas uses its Dialog behavior, retaining Escape and focus return. A dragged node must not activate accidentally when the pointer is released.

## Standards model and notation

The model owns stable IDs, names, kinds, dimensions, compartment text, stereotypes, ownership/containment, table rows, relationships, routing points and specification metadata. SVG, selected-element details, relationship descriptions and exported JSON must agree. Label edits preserve identity. Deleting a container removes its descendants and connected relationships in one undoable operation.

The initial 27 views cover all 14 UML diagram kinds, two UWE views, BPMN process, two DMN views, CMMN case, VDML value delivery, IFML interaction, two legacy SysML views, and BMM/SBVR/BACM concept projections. Keep normative shapes and marker direction where the specification defines them. Do not present an application-defined concept layout as an OMG-mandated notation. UWE is an LMU research profile, separately attributed from OMG.

Geometry/runtime validation checks supported data types, finite dimensions, bounds, containment, stable identities, relationship endpoints and text suitable for SVG. It is not domain-semantic validation. The JSON editor uses that validation before replacing state; invalid edits leave the current document intact. History is bounded and works across normal kit navigation. The application schema is not XMI, BPMN XML, DMN XML or a round-trip standards interchange implementation.

Glass belongs on the frame and controls. Keep notation, labels, markers and separators crisp. Exact diagram geometry comes from typed data, never image generation. Supply readable element and relationship alternatives and table content; the picture is not the sole source of meaning. See [W3C complex-image guidance](https://www.w3.org/WAI/tutorials/images/complex/).

## Agent-first graphics

A useful image workflow keeps its composition editable. `GraphicDocument` uses revisioned image/text/shape layers with stable identities. People and agents share the layer selector, transform fields, text editing, visibility/lock controls, ordering, duplication, deletion, aspect/background settings, history, variants and exports.

The architecture follows the separation visible in [tldraw's agent starter](https://tldraw.dev/starter-kits/agent): inspectable document/selection context, validated actions and explicit results. [Figma's MCP documentation](https://developers.figma.com/docs/figma-mcp-server/) provides another primary reference for supplying structured design context to agents. These are design references, not copied components or a claim of feature equivalence.

The image-agent handoff includes the brief, current document/revision, selected layer and source asset metadata. A host can supply the `onImageRequest` callback documented in the [graphics API](../../../packages/liquid-glass/src/graphics/README.md). The shipped demo prepares or copies the request; it does not call an image service. A future host integration should return assets with provenance, retain original source layers and apply results as explicit document changes. Do not embed provider credentials in browser code.

Raster upload enforces file type/size and image decoding in the shared handler. JSON import validates layer kinds, IDs, dimensions, references and revision before applying. SVG export retains editable text and embeds allowed raster images for a standalone file. Labels and text are escaped; imported SVG is not accepted as a raster image. Uploaded assets and document history remain browser-session data; exporting is the persistence mechanism in this demo.

## Quantitative HCI evaluation

Model the task before optimizing its appearance. Reuse the project's content/navigation/presentation/state framework and calculators; the prior pilot is independent evidence and must not be presented as validating these new components.

| Task | Observable outcome | Useful measurements | Failure to watch for |
| --- | --- | --- | --- |
| Find and inspect a model element | Correct element selected, its relationships correctly identified | Task completion, time to first correct selection, navigation actions, mis-selections | Losing orientation after zoom, ambiguous node names, unreadable labels |
| Correct a business rule | Intended cell changed and exported, surrounding rules retained | Edit errors, recovery time, extra actions, resulting data integrity | Treating a visual table as an executed decision engine |
| Revise a composition together | Requested layer change accepted with stable identity and correct export | Human/agent agreement on target and result, rejected edits, correction cycles | Flattening all content, stale revisions, missing asset provenance |
| Hand off an image request | Brief and context identify the intended asset and constraints | Missing-context rate, retries, number of corrective requests | A prompt detached from the selected layer or canvas state |

Use Fitts-style checks for control target size and movement, choice complexity for crowded selection lists, and KLM/action counts for repeated editing tasks. Record assumptions and compare matched tasks. None of these predicts human preference or proves comprehension by itself. Measure real users before claiming improved speed, recognition, aesthetics or accessibility conformance.

## Verification and review status

Run `npm run glass:verify`, model/registry checks and the required production-browser suite. Preserve all existing WebGPU optics, motion, preferences, popup and 55-family checks. New checks cover viewport gestures/keyboard/agent actions, full-window focus, all registered views, catalogue/version coverage, validated model changes, graphics history, revision safety and current exports. Inspect representative desktop/mobile screenshots for clipping, misplaced markers and unusable controls.

**SDK foundation** describes upstream provenance. **Unvalidated** describes the absence of human UI/UX approval for Quantive's component or composition. Automated checks cannot promote that status. Promotion needs recorded component version, reviewers, date, tasks, participants/devices, findings, restrictions and decision. Use the [exploration model](../models/developer-model-exploration.md) as a starting point for human evaluation.
