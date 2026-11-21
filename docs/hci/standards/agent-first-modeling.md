# Agent-first modeling and reusable components

The kit keeps one authoritative document for people and agents. The screen, SDK snapshot, selected element, validation results and exports derive from that document. The new layer extends the pinned Vercel UI SDK; it does not replace its 55 component families or add a second mutation interface.

## Component boundaries

| Layer | Public parts | Contract |
| --- | --- | --- |
| Data and history | `createModelDocument`, preview/apply/undo/redo functions | Immutable document, monotonic revision, stable IDs, bounded history. |
| Interaction primitive | `LiquidModelDocument` | Actual SDK discovery/actions, controlled callbacks, cancellation, source attribution and pending-request settlement. |
| Composition | `StandardsWorkbench` | Controlled documents with a chosen model; reusable composition of the parts below. |
| Discovery | `StandardsCatalogue`, `ModelNavigator` | Versioned coverage registry, text/family filters and parent hierarchy. |
| Relationships between views | `ModelReferences` | Named links to another model or an exact element, then selection/reveal in the target canvas. |
| Editing | `ModelInspector`, `ModelDataEditor` | Label, properties, geometry, elements/edges, structured JSON and atomic transactions. |
| Feedback | `ModelToolbar`, `ModelHistory`, `ModelValidationPanel` | Revision, export, undo/redo, actual results and clear rejection diagnostics. |
| Diagram | `LiquidDiagram`, `DiagramMetadata`, `DiagramDetails` | Data-driven SVG, source/coverage, selected-element and relationship text, data tables and key. |
| Agent task | Seven exports under `/agents` | Capabilities, status, timeline, tool request, artifact, structured context and composed task panel. |

All custom parts appear in `custom-component-manifest.json` with **Unvalidated** status. An upstream SDK foundation is provenance, not a human approval of our adaptation.

The demo's Standards wrapper delegates to the shared workbench. The application owns the documents, so changes and history survive navigation between collections. Consumers can use the parts separately instead of copying the gallery page.

```tsx
import { useState } from "react";
import { createModelDocument } from "@quantitative-hci/liquid-glass/modeling";
import { StandardsWorkbench, type DiagramModel } from "@quantitative-hci/liquid-glass/standards";
import "@quantitative-hci/liquid-glass/standards.css";

export function Models({ initialModels }: { initialModels: DiagramModel[] }) {
  const [documents, setDocuments] = useState(() => initialModels.map(model => createModelDocument(model)));
  return <StandardsWorkbench documents={documents} onDocumentsChange={setDocuments} />;
}
```

The workbench also accepts `activeModelId`, `onActiveModelChange`, `defaultModelId`, `disabled`, `readOnly`, `className` and an additive `profiles` registry. Validate new profiles with the exported `validateDiagramProfile`; use `family: "custom"` for application profiles. Supported SVG node/edge kinds remain the explicit typed renderer vocabulary.

## One change path

A host or agent first inspects the current revision and stable element IDs. It previews a transaction if needed, then applies its operations with `expectedRevision`. The engine checks the entire candidate and its cross-view references before publishing it through the cancellable SDK callback. An invalid batch cannot leave a valid prefix applied.

```json
{
  "expectedRevision": 4,
  "label": "Clarify review and adjust its position",
  "operations": [
    { "type": "rename-node", "nodeId": "review", "name": "Review release candidate" },
    { "type": "update-node", "nodeId": "review", "patch": { "x": 420, "y": 180 } }
  ]
}
```

`LiquidModelDocument` is discoverable as `model-document`. Its actions are `inspect`, `preview`, `applyTransaction`, `undo`, `redo`, `select` and `cancelPending`. Inspection describes the supported operations and patch fields, revision, selection, elements, relationships, profile, references, limits and an example transaction. Agents do not have to infer an undocumented JSON format from screenshots.

The renderer, inspector and JSON editor all use this same engine. Changes that have only been requested from a controlled host are labelled `requested`; acceptance is reported after the host supplies the proposed document or a structurally equivalent JSON copy, including its selection and history. The host callback may return a Promise, but resolving it alone does not establish acceptance. A second change is rejected while the first remains pending. Hosts can cancel asynchronously through the original details; agents and the workbench's visible cancellation button use the same `cancelPending` method. Both abort the request's `AbortSignal` without changing published content.

`onResult` reports immediate results and later settlement. A rejected callback before acceptance preserves the document. If props were already accepted and the matching callback then fails, `applied-error` reports `changed: true` and the actual revision without rolling back. Stale completions cannot overwrite a newer request's outcome; disposal aborts unfinished work. A successful SDK button action alone does not establish a successful model edit: inspect the result and revision.

History contains at most 50 changes. A transaction contains at most 100 operations and model JSON is bounded to 1 MB. Undo and redo create new revisions, preventing an old request from becoming current again. No-ops do not consume history or clear redo. Selection changes do not create a model revision. Moving a parent moves its descendants/owned elements and affected routed endpoints; deleting it removes the dependent local structure atomically. Dangling cross-view references prevent the change until they are resolved.

See the [modeling API](../../../packages/liquid-glass/src/modeling/README.md) for exact type and controlled-host semantics. The SDK beta.13 read-only/disabled gates suppress agent actions at the bridge, including inspect; direct library inspection remains read-only. Do not bypass upstream gating with a separate window API.

## UWE coverage

The implemented views are explicitly labelled as an **LMU UWE 3.0 subset**, based on the [published metamodel/profile](https://uwe.pst.ifi.lmu.de/publicationsMetamodelAndProfile.html), the UWE tutorials and the linked security research. The examples describe one project/asset application and include references across relevant models.

| Area | Views |
| --- | --- |
| Requirements | Requirements use cases; requirement activity |
| Design | Content; navigation; presentation |
| Process | Process structure; process flow |
| Declarative security | User and roles; basic rights; navigation states; application modes |

The profile supplies permitted node kinds, relationships and stereotypes, and bounded semantic checks. Navigation queries/processes use process links where required; presentation is a structured model, not a pixel layout; process data nodes remain distinct from control flow and instance specifications. Security views describe roles, rights and states but do not enforce runtime permissions.

This provides a linked, editable workflow across 11 UWE views. Full UWE conformance would additionally require the complete metamodel/tagged-value rules, OCL constraints, XMI interoperability, transformations and adaptation/aspect weaving. Those capabilities are not present and are not implied by the word “UWE” in a picker. All model keys, scope text, validation and exports keep that boundary visible.

## C4 coverage

The adapter follows the [C4 model's four static and three supporting diagram types](https://c4model.com/diagrams): landscape, system context, container, component, code, dynamic and deployment. C4 is separately attributed to Simon Brown; it is not represented as an OMG specification.

Typed person/system/container/component/deployment elements include appropriate technology and external-system labels. Relationships name their direction and, where required by the local profile, technology. Dynamic interactions have explicit order. The code view uses existing UML class notation. Parent models and element references connect levels; every view has a key.

The shapes and data are original examples. The kit does not parse Structurizr DSL, discover a deployed architecture or certify conformance. Runtime profile checks cover the adapter's declared abstraction and relationship rules.

## Agent models and task components

Three editable views reuse UML rather than inventing a new diagram language: component architecture, A2A task-state projection and a reviewed tool-call sequence. Architecture and handoff are explicitly local concept projections. The [A2A 0.3.0](https://a2a-protocol.org/v0.3.0/specification/) enum supplies all nine state names; the displayed arrows illustrate selected application transitions.

The Agents collection demonstrates an actual local task: inspect → propose → review → apply → artifact. Each event has an identity, order, time and actor. The visible model changes only after the sample host accepts the proposal, and the artifact contains that resulting model. Rejection and cancellation retain the previous model. Duplicate/out-of-order events, stale revisions and illegal call transitions have explicit outcomes.

Tool request presentation is informed by [MCP tool contracts](https://modelcontextprotocol.io/specification/2025-06-18/server/tools). It keeps names, arguments, before/after fields and results inspectable. A host supplies its real authorization/review policy and execution callbacks. No transport, remote model provider or actual authentication flow is included. See the [agent component API](../../../packages/liquid-glass/src/agents/README.md).

## Quantitative HCI evaluation

Evaluate concrete tasks before claiming this design is better. The component boundaries make the same task measurable through pointer, keyboard and SDK actions.

| Task | Human outcome | Agent outcome | Measurements |
| --- | --- | --- | --- |
| Find a presentation element from a requirement | Correct view and element identified | References resolve to stable IDs | Completion rate, steps, time, wrong-target rate |
| Follow C4 context to code | Understand the level and return to context | Hierarchy/reference preserves identity | Navigation actions, backtracking, loss of context |
| Rename two related elements | Both edits land or neither does | One accepted transaction at expected revision | Completion, rejected stale requests, partial-edit count |
| Recover from an incorrect change | Undo restores the intended content | New revision observed before retry | Recovery time, extra actions, stale retry count |
| Review and inspect a produced artifact | Decision matches the displayed proposal | Result content matches accepted operation | Proposal/result mismatch, correction cycles, comprehension |

Measure action count with the existing KLM/task models, pointer target effort where relevant, and choice complexity in selectors. Compare matched tasks, not screenshots. Record errors and recovery alongside speed. Agent contract tests establish state integrity and discoverability; they do not establish human comprehension, aesthetic preference or accessibility conformance.

## Required evidence

`npm run glass:verify` executes source contracts, all 46 model/profile/reference/SVG checks, focused UWE/C4 semantic regressions, model transaction tests, actual SDK controlled-model regressions, agent task tests, TypeScript and production build. CI additionally runs existing HCI calculator tests and the full production-browser suite, including all 55 SDK families, WebGPU optics/motion, preferences, viewport gestures, model editing with cloned host acceptance, agent callbacks, graphics and the local task workflow. Representative desktop/mobile captures must be reviewed for text clipping and practical usability.

Keep the original material pipeline, font/icon preferences, crisp notation and readable DOM. Glass frames the work; semantic diagram content remains exact SVG and text. A future human UI/UX review should identify the component version, tasks, devices, participants, findings and approval decision before any Unvalidated status is changed.
