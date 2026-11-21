import { createChange, definePrimitive } from "@ui-sdk/core";
import { applyModelTransaction, inspectModelDocument, modelDocumentSnapshot, previewModelTransaction,
  redoModelDocument, rejectedModelResult, selectModelElement, undoModelDocument } from "./document";
import { createModelChangeController } from "./controlled-change";
import type { ModelActionResult, ModelDocument, ModelDocumentContext, ModelDocumentHandle, ModelDocumentInput,
  ModelDocumentChangeDetails, ModelDocumentReason, ModelDocumentResult, ModelDocumentSnapshot } from "./types";

export type ModelSnapshotChangeDetails = ModelDocumentChangeDetails & { proposedDocument: ModelDocument };

export interface LiquidModelDocumentOptions extends ModelDocumentContext {
  document: ModelDocument;
  value: ModelDocumentSnapshot;
  onValueChange: (snapshot: ModelDocumentSnapshot, details: ModelSnapshotChangeDetails) => void | Promise<void>;
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
  pendingRevision: number | null;
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
  state: (options: LiquidModelDocumentOptions) => ({ value: options.value, disabled: options.disabled ?? false, readOnly: options.readOnly ?? false, lastResult: null as ModelActionResult | null, pendingRevision: null as number | null }),
  sync: options => ({ value: options.value, disabled: options.disabled ?? false, readOnly: options.readOnly ?? false }),
  api: context => {
    const controller = createModelChangeController(context.options().document, result => {
      context.store.set({ lastResult: result, pendingRevision: controller.state().pendingRevision ?? null });
      context.options().onResult?.(result);
    });
    let dispatchResult: ModelDocumentResult | null = null;
    const change = createChange({ ...context, options: () => ({ ...context.options(),
      onValueChange(snapshot: ModelDocumentSnapshot, details: ModelSnapshotChangeDetails) {
        const result = dispatchResult;
        if (!result) { details.cancel(); return; }
        controller.request(result, details, (proposal, enhanced) => context.options().onValueChange(snapshot, {
          reason: enhanced.reason, source: enhanced.source, event: enhanced.event, signal: enhanced.signal,
          proposedDocument: proposal, cancel: enhanced.cancel, get canceled() { return enhanced.canceled; },
        }));
      },
    }) });
    context.onOptions(options => { controller.observe(options.document); });
    context.onDestroy(controller.dispose);
    const current = () => controller.state().document;
    const report = controller.report;
    const reject = (code: string, message: string) => report(actionResult(rejectedModelResult(current(), code, message), "rejected"));
    const canRequest = (selection = false): ModelActionResult | null => {
      const options = context.options();
      if (options.disabled) return reject("disabled", "The model document is disabled.");
      if (options.readOnly && !selection) return reject("read-only", "The model is read-only. Inspection and selection remain available.");
      if (controller.state().pendingRevision !== undefined) return reject("pending-controlled-change", "Wait for the host to accept the previous document change, or cancel the pending change.");
      return null;
    };
    const publish = (result: ModelDocumentResult, reason: ModelDocumentReason, input?: ModelDocumentInput): ModelActionResult => {
      if (!result.ok) return report(actionResult(result, "rejected"));
      if (!result.changed) return report(actionResult(result, "unchanged"));
      const event = typeof Event !== "undefined" && input?.event instanceof Event ? input.event : undefined;
      dispatchResult = result;
      try { change("value", modelDocumentSnapshot(result.document), { reason, event, proposedDocument: result.document }); }
      finally { dispatchResult = null; }
      return controller.state().lastResult!;
    };
    return {
      inspect: () => ({ ...inspectModelDocument(current(), context.options()), readOnly: Boolean(context.options().readOnly), disabled: Boolean(context.options().disabled), pendingRevision: controller.state().pendingRevision, lastResult: context.store.get().lastResult }),
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
      cancelPending: controller.cancelPending,
    };
  },
  slots: slot => ({
    root: slot<{}, ModelDocumentRenderContext>({
      role: "region",
      attrs: state => ({ "data-validation": "unvalidated", "data-model-id": state.value.modelId,
        "data-model-revision": String(state.value.revision), "data-model-readonly": String(state.readOnly),
        "data-model-disabled": String(state.disabled), "aria-disabled": String(state.disabled),
        "data-model-result": state.lastResult?.status, "data-model-pending-revision": state.pendingRevision === null ? undefined : String(state.pendingRevision) }),
      state: (state, { api }) => ({ document: api.getDocument(), api, disabled: state.disabled, readOnly: state.readOnly, lastResult: state.lastResult, pendingRevision: state.pendingRevision }),
    }),
  }),
  agent: { actions: ["inspect", "preview", "applyTransaction", "undo", "redo", "select", "cancelPending"], items: api => api.items() },
});
