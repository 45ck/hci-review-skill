import { createChange, definePrimitive, type ChangeDetails } from "@ui-sdk/core";
import { applyModelTransaction, inspectModelDocument, modelDocumentSnapshot, previewModelTransaction,
  redoModelDocument, rejectedModelResult, selectModelElement, undoModelDocument } from "./document";
import type { ModelActionResult, ModelDocument, ModelDocumentContext, ModelDocumentHandle, ModelDocumentInput,
  ModelDocumentReason, ModelDocumentResult, ModelDocumentSnapshot } from "./types";

export type ModelSnapshotChangeDetails = ChangeDetails<ModelDocumentReason> & { proposedDocument: ModelDocument };

export interface LiquidModelDocumentOptions extends ModelDocumentContext {
  document: ModelDocument;
  value: ModelDocumentSnapshot;
  onValueChange: (snapshot: ModelDocumentSnapshot, details: ModelSnapshotChangeDetails) => void;
  disabled?: boolean;
  readOnly?: boolean;
  onResult?: (result: ModelActionResult) => void;
}

export interface ModelDocumentRenderContext {
  document: ModelDocument;
  api: ModelDocumentHandle;
  disabled: boolean;
  readOnly: boolean;
  lastResult: ModelActionResult | null;
}

function actionResult(result: ModelDocumentResult, status: ModelActionResult["status"]): ModelActionResult {
  const { document: _document, ...value } = result;
  return { ...value, status };
}

export const liquidModelDocument = definePrimitive({
  name: "model-document",
  options: {
    document: "value", value: "value", onValueChange: "callback", disabled: "boolean", readOnly: "boolean",
    models: "list", validateModel: "callback", onResult: "callback",
  },
  controlled: ["value"],
  state: (options: LiquidModelDocumentOptions) => ({ value: options.value, disabled: options.disabled ?? false, readOnly: options.readOnly ?? false, lastResult: null as ModelActionResult | null }),
  sync: options => ({ value: options.value, disabled: options.disabled ?? false, readOnly: options.readOnly ?? false }),
  api: context => {
    const change = createChange(context);
    let pending: { base: ModelDocument; proposal: ModelDocument; result: ModelDocumentResult } | null = null;
    context.onOptions(options => {
      if (!pending || options.document === pending.base) return;
      const settled = options.document === pending.proposal
        ? actionResult(pending.result, "applied")
        : actionResult(rejectedModelResult(options.document, "controlled-not-accepted", "The host supplied a different document. Inspect the current state before retrying."), "rejected");
      pending = null;
      context.store.set({ lastResult: settled });
    });
    const current = () => context.options().document;
    const report = (result: ModelActionResult) => {
      context.store.set({ lastResult: result });
      context.options().onResult?.(result);
      return result;
    };
    const reject = (code: string, message: string) => report(actionResult(rejectedModelResult(current(), code, message), "rejected"));
    const canRequest = (selection = false): ModelActionResult | null => {
      const options = context.options();
      if (options.disabled) return reject("disabled", "The model document is disabled.");
      if (options.readOnly && !selection) return reject("read-only", "The model is read-only. Inspection and selection remain available.");
      if (pending) return reject("pending-controlled-change", "Wait for the host to accept the previous document change before requesting another.");
      return null;
    };
    const publish = (result: ModelDocumentResult, reason: ModelDocumentReason, input?: ModelDocumentInput): ModelActionResult => {
      if (!result.ok) return report(actionResult(result, "rejected"));
      if (!result.changed) return report(actionResult(result, "unchanged"));
      const base = current();
      const event = typeof Event !== "undefined" && input?.event instanceof Event ? input.event : undefined;
      const accepted = change("value", modelDocumentSnapshot(result.document), { reason, event, proposedDocument: result.document });
      if (!accepted) return reject("cancelled", "The host cancelled this change. The document and history were not changed.");
      const after = current();
      if (after === result.document) return report(actionResult(result, "applied"));
      if (after !== base) return reject("controlled-conflict", "The host supplied a different document while this change was being requested. Inspect the current state before retrying.");
      pending = { base, proposal: result.document, result };
      return report({ ...actionResult(result, "requested"), changed: false, revision: base.revision, requestedRevision: result.revision });
    };
    return {
      inspect: () => ({ ...inspectModelDocument(current(), context.options()), readOnly: Boolean(context.options().readOnly), disabled: Boolean(context.options().disabled), pendingRevision: pending?.proposal.revision, lastResult: context.store.get().lastResult }),
      getDocument: current,
      items: () => current().model.nodes.map(node => ({ value: node.id, label: node.name })),
      preview(transaction: unknown) {
        const result = previewModelTransaction(current(), transaction, context.options());
        return report({ ...actionResult(result, result.ok ? "unchanged" : "rejected"), changed: false, revision: current().revision, ...(result.ok && result.changed ? { requestedRevision: result.revision } : {}) });
      },
      applyTransaction(transaction: unknown, input?: ModelDocumentInput) {
        return canRequest() ?? publish(applyModelTransaction(current(), transaction, context.options()), "model-transaction", input);
      },
      undo(expectedRevision: number, input?: ModelDocumentInput) {
        return canRequest() ?? publish(undoModelDocument(current(), expectedRevision, context.options()), "model-undo", input);
      },
      redo(expectedRevision: number, input?: ModelDocumentInput) {
        return canRequest() ?? publish(redoModelDocument(current(), expectedRevision, context.options()), "model-redo", input);
      },
      select(nodeId: string | null, input?: ModelDocumentInput) {
        return canRequest(true) ?? publish(selectModelElement(current(), nodeId), "model-select", input);
      },
    };
  },
  slots: slot => ({
    root: slot<{}, ModelDocumentRenderContext>({
      role: "region",
      attrs: state => ({ "data-validation": "unvalidated", "data-model-id": state.value.modelId,
        "data-model-revision": String(state.value.revision), "data-model-readonly": String(state.readOnly),
        "data-model-disabled": String(state.disabled), "aria-disabled": String(state.disabled),
        "data-model-result": state.lastResult?.status }),
      state: (state, { api }) => ({ document: api.getDocument(), api, disabled: state.disabled, readOnly: state.readOnly, lastResult: state.lastResult }),
    }),
  }),
  agent: { actions: ["inspect", "preview", "applyTransaction", "undo", "redo", "select"], items: api => api.items() },
});
