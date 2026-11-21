# Model documents

**Unvalidated.** This is a custom modelling component system. Its automated checks do not establish human UI/UX approval or complete conformance to UML, UWE, C4 or another modelling specification.

The pure document engine, the `LiquidModelDocument` UI SDK primitive and the reusable `StandardsWorkbench` use the same transaction path. A person editing a label and an agent submitting a batch update the same controlled document, with the same validation, cancellation, revision checks and undo history. SVG rendering, canvas navigation and profile rules stay in their existing modules.

## Controlled integration

```tsx
import { useState } from "react";
import { Button } from "@ui-sdk/react/button";
import {
  LiquidModelDocument,
  createModelDocument,
} from "@quantitative-hci/liquid-glass/modeling";

function ModelEditor({ initialModel }) {
  const [document, setDocument] = useState(() => createModelDocument(initialModel));

  return (
    <LiquidModelDocument
      label="Model document"
      document={document}
      onDocumentChange={(next, details) => {
        setDocument(next);
      }}
    >
      {({ document, api, lastResult }) => (
        <>
          <p>{document.model.name} · revision {document.revision}</p>
          <Button
            disabled={!document.selectedId}
            onClick={event => api.applyTransaction({
              expectedRevision: document.revision,
              label: "Rename the selected element",
              operations: [{
                type: "rename-node",
                nodeId: document.selectedId!,
                name: "Reviewed element",
              }],
            }, { event: event.nativeEvent })}
          >
            Rename selected element
          </Button>
          <p role="status">{lastResult?.summary.label}</p>
        </>
      )}
    </LiquidModelDocument>
  );
}
```

Supply `defaultDocument` instead of `document` to let the provider keep local state. Keep one document per model to retain its selection and history while navigating between views. The existing `StandardsWorkbench` accepts `documents` and `onDocumentsChange` and composes the navigator, inspector, model data editor, validation feedback, history and canvas.

For linked model sets, provide `models={documents.map(item => item.model)}`. This validates incoming references as well as references in the edited model. Pass a profile checker such as `validateModel={validateDiagramProfile}` for notation-specific rules. Structural errors reject the batch; warnings stay visible in its result and permit the edit. A checker that throws rejects the request without changing state.

### Acceptance and cancellation

`onDocumentChange(next, details)` is the single acceptance boundary. Use `details.cancel()` to reject a request. It preserves the model, selection, undo history and redo history. `details.source` comes from the UI SDK (`agent`, pointer/keyboard input, or application code); action arguments cannot claim a different source.

A controlled callback usually schedules a React update. Before the new prop is received, the synchronous action result has `status: "requested"`, `changed: false`, the current `revision`, and a `requestedRevision`. This means the host received a proposal. It does not claim that the edit was applied. When the host supplies the exact proposed document, `lastResult` settles to `"applied"`, including selection changes that keep the same revision. Use the render context or `api.inspect().lastResult` to observe settlement. `onResult` reports the immediate action outcome.

Another mutation is refused while a proposal is pending. Supplying a different document clears the pending request and reports `controlled-not-accepted`; the next command must use that document's current revision. If the host refuses an edit, call `details.cancel()` explicitly instead of silently ignoring the callback. External edits should use the same engine and preserve revision monotonicity. A document without an `onDocumentChange` handler is effectively read-only.

`readOnly` blocks content mutations; the direct component handle still allows inspection and selection. `disabled` blocks selection as well. The pinned UI SDK also removes **all agent actions** from a read-only or disabled component, including custom inspection actions. Its compact snapshot and queried choices remain available. The provider preserves that upstream policy.

## Agent contract

The SDK discovers one named `model-document` component. It exposes:

| Action | Arguments | Outcome |
| --- | --- | --- |
| `inspect` | None | Current revision, complete model, selection, related edges, entity occurrences in other views, limits, operation descriptions and an example transaction |
| `preview` | Transaction | Validate the complete proposed batch and return affected IDs without changing the document or history |
| `applyTransaction` | Transaction | Submit one atomic, undoable proposal through the same change callback as the human controls |
| `undo` | Current revision | Restore the previous checkpoint with a new revision |
| `redo` | Current revision | Restore the next checkpoint with a new revision |
| `select` | Existing node ID or `null` | Change selection without creating an edit checkpoint or incrementing revision |

Use the existing `createAgent` bridge's `snapshot`, `query`, `act` and `subscribe`. There is no separate global mutation API. `query({ within: documentRef })` discovers stable element IDs and labels. The compact snapshot contains model identity, revision, selection, counts and undo/redo depths. It excludes the full model and history; request `inspect` when those details are needed. `inspect` exposes supported operation names, required fields and patch field names so an agent can form a transaction from the current model.

An SDK call's outer `ok` confirms dispatch, while each custom action's `steps[0].result.ok`, `status` and issues describe the document outcome. Re-read `inspect` or the snapshot to confirm host acceptance. A rejected request returns structured issue codes and the unchanged revision. A preview returns a change summary and `requestedRevision`, while its own `changed` remains false because it did not mutate the document.

```ts
const inspected = await agent.act({
  steps: [{ ref: documentRef, action: "inspect", args: [] }],
});
const current = inspected.steps[0].result;
const transaction = {
  expectedRevision: current.revision,
  label: "Update the selected element",
  operations: [{
    type: "update-node",
    nodeId: current.selectedId,
    patch: { description: "The reviewed responsibility of this element." },
  }],
};
await agent.act({ steps: [{ ref: documentRef, action: "preview", args: [transaction] }] });
await agent.act({ steps: [{ ref: documentRef, action: "applyTransaction", args: [transaction] }] });
```

Select an element first when `current.selectedId` is `null`. A transaction can also set `selectedId` to an element that exists after the entire batch, so adding and selecting a node takes one controlled update.

## Pure engine and invariants

The pure functions return `{ok, changed, revision, document, issues, summary}`. They never mutate the supplied document. `createModelDocument` validates and owns an immutable JSON copy; invalid initial data throws so the host can report an initialization error. Agent-supplied transactions return structured rejection results.

| Operation | Fields | Rules |
| --- | --- | --- |
| `rename-node` | `nodeId`, `name` | Distinct element labels, 1–80 characters, no control characters |
| `update-node` | `nodeId`, `patch` | Preserve ID; update supported content, geometry, containment and profile metadata |
| `add-node` | `node` | Complete valid node with a new stable ID |
| `remove-node` | `nodeId` | Remove contained and owned descendants and all connected edges |
| `add-edge` | `edge` | Complete valid edge with a new stable ID |
| `update-edge` | `edgeId`, `patch` | Preserve edge ID; validate endpoints, route and other supplied fields |
| `remove-edge` | `edgeId` | Remove an existing edge |
| `replace-model` | `model` | Preserve the current model ID and validate all replacement content |

All operations are evaluated against a private proposal, then the resulting model is validated once. An edge may refer to a node added later in the same batch. Any failure discards the whole proposal. Each successful content transaction produces one checkpoint and increments revision once. Undo and redo also increment revision, so an old request never becomes current again merely because an earlier state was restored. A semantic no-op preserves both revision and history, including redo. A new edit after undo clears the redo branch.

In `update-node` and `update-edge`, an explicit `null` removes an optional top-level field, for example `{stereotype: null}`. Clearing a required field fails final validation. Omitted fields remain unchanged. Nested objects such as `architecture` are complete field replacements, so omit a nested optional property to remove it. JavaScript `undefined` is omitted when requests are copied as JSON; use the explicit `null` form for top-level removal.

Moving a container translates its descendants and owner-attached nodes. Explicit source/target points follow the moved endpoints. Internal edge waypoints and labels translate when both endpoints move; an external route retains its remaining points. The existing diagram validator checks the final coordinates and containment. Removing a selected element selects the first retained node unless the transaction supplies another valid selection.

`validateModelSetReferences` detects duplicate model IDs, missing parent models, parent hierarchy cycles and dangling references across models. Node `entityId` values connect occurrences for inspection; they do not impose identical names or representations across views. A deletion or replacement that would leave a dangling reference is rejected when the linked model set is supplied.

Limits are 100 operations per transaction, 1 MB of UTF-8 JSON per transaction or model, 40 levels of JSON nesting, and 50 checkpoints in each history direction. Prototype-changing keys and circular input are rejected. Existing diagram limits also apply. Revision must be a non-negative safe integer and must match `expectedRevision`; exhaustion is refused rather than wrapping around.

This module manages an in-memory editing session. It does not provide server persistence, permissions, collaborative merge or a modelling-language interchange parser. Host applications own those responsibilities and can gate all accepted changes at `onDocumentChange`.

## Verification

Run `node packages/liquid-glass/src/modeling/check-document.mjs` for the pure source gate. It exercises descendant geometry, route transforms, atomic rollback, stable IDs, monotonic history, bounded history, cancellation-free preview, no-op redo preservation, cross-view integrity and malformed inputs.

The browser harness includes `model_document_atomic_agent_commands_and_human_history`, using the real production workbench and actual SDK bridge. It checks discovery, preview, atomic apply, stale and invalid rejection, selection settlement, no-op behavior, shared human/agent history and source attribution. A mounted React/SDK probe also verified host cancellation, read-only and disabled guards, and pending controlled-change recovery; those host policies are not exposed as demo switches.

The environment-local probe was compiled with `node_modules/.bin/tsc -p node_modules/.cache/model-document-probe/tsconfig.json` and run with `node node_modules/.cache/model-document-probe/probe.mjs` (both exit 0). It reused an already installed jsdom 27.4.0 from another workspace. The probe is temporary evidence, not a portable CI dependency; the committed pure gate and production browser contract are the repeatable project checks.
