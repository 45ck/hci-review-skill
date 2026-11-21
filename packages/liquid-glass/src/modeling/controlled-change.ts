import type { ChangeDetails } from "@ui-sdk/core";
import { rejectedModelResult } from "./document";
import type { ModelActionResult, ModelDocument, ModelDocumentChangeDetails, ModelDocumentReason, ModelDocumentResult } from "./types";

function sameJson(left: unknown, right: unknown, depth = 0): boolean {
  if (left === right) return true;
  if (depth > 64 || !left || !right || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right)) return Array.isArray(left) && Array.isArray(right)
    && left.length === right.length && left.every((value, index) => sameJson(value, right[index], depth + 1));
  if (![Object.prototype, null].includes(Object.getPrototypeOf(left)) || ![Object.prototype, null].includes(Object.getPrototypeOf(right))) return false;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every(key => Object.hasOwn(right, key)
    && sameJson((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key], depth + 1));
}

function actionResult(result: ModelDocumentResult, status: ModelActionResult["status"]): ModelActionResult {
  const { document: _document, ...value } = result;
  return { ...value, status };
}

type PendingModelChange = {
  base: ModelDocument;
  proposal: ModelDocument;
  result: ModelDocumentResult;
  abort: AbortController;
  originalDetails: ChangeDetails<ModelDocumentReason>;
  applied: boolean;
};

export function createModelChangeController(initial: ModelDocument, notify: (result: ModelActionResult) => void = () => {}) {
  let document = initial;
  let pending: PendingModelChange | null = null;
  let latestRequest: PendingModelChange | null = null;
  let lastResult: ModelActionResult | null = null;
  let disposed = false;
  const callbacks = new Set<PendingModelChange>();

  const report = (result: ModelActionResult) => {
    if (!disposed) {
      lastResult = result;
      notify(result);
    }
    return result;
  };
  const rejection = (code: string, message: string) => actionResult(rejectedModelResult(document, code, message), "rejected");

  function cancelPending() {
    if (!pending) return report({ ...rejection("no-pending-change", "There is no pending model change to cancel. Applied content was retained."), ok: true, status: "unchanged", issues: [] });
    const request = pending;
    pending = null;
    latestRequest = null;
    request.originalDetails.cancel();
    request.abort.abort();
    return report(rejection("cancelled", "The pending model change was cancelled. The document and history were retained."));
  }

  function observe(next: ModelDocument): ModelActionResult | null {
    if (disposed) return null;
    const previous = document;
    document = next;
    if (!pending) {
      if (!sameJson(previous, next)) latestRequest = null;
      return null;
    }
    const request = pending;
    if (sameJson(next, request.proposal)) {
      pending = null;
      request.applied = true;
      return report(actionResult(request.result, "applied"));
    }
    if (sameJson(next, request.base)) return null;
    pending = null;
    latestRequest = null;
    request.originalDetails.cancel();
    request.abort.abort();
    return report(rejection("controlled-not-accepted", "The host supplied a different document. Inspect the current state before retrying."));
  }

  function request(result: ModelDocumentResult, originalDetails: ChangeDetails<ModelDocumentReason>, accept: (proposal: ModelDocument, details: ModelDocumentChangeDetails) => void | Promise<void>): ModelActionResult {
    if (disposed) return rejection("disposed", "The model document is no longer mounted.");
    if (pending) return report(rejection("pending-controlled-change", "Wait for the host to accept the previous document change, or cancel the pending change."));
    if (!result.ok || !result.changed) {
      latestRequest = null;
      return report(actionResult(result, result.ok ? "unchanged" : "rejected"));
    }
    const staged: PendingModelChange = { base: document, proposal: result.document, result, abort: new AbortController(), originalDetails, applied: false };
    pending = staged;
    latestRequest = staged;
    const details: ModelDocumentChangeDetails = {
      reason: originalDetails.reason, source: originalDetails.source, event: originalDetails.event,
      signal: staged.abort.signal,
      cancel() { if (pending === staged) cancelPending(); },
      get canceled() { return originalDetails.canceled || staged.abort.signal.aborted; },
    };
    report({ ...actionResult(result, "requested"), changed: false, revision: document.revision, requestedRevision: result.revision });
    if (pending !== staged) return lastResult!;
    const failed = (problem: unknown) => {
      if (disposed || latestRequest !== staged) return;
      const message = problem instanceof Error ? problem.message : "The host callback failed.";
      if (staged.applied) {
        return report({ ...actionResult(result, "applied-error"), ok: false, revision: document.revision,
          issues: [...result.issues, { code: "host-callback-failed-after-application", message: `Revision ${staged.proposal.revision} was applied before the host callback failed: ${message} The applied document was not rolled back.`, severity: "error" }] });
      }
      if (pending !== staged) return;
      pending = null;
      latestRequest = null;
      originalDetails.cancel();
      staged.abort.abort();
      return report(rejection("host-callback-failed", `The host rejected the model change: ${message}`));
    };
    try {
      const completion = accept(staged.proposal, details);
      if (completion && typeof completion.then === "function") {
        callbacks.add(staged);
        completion.then(() => { callbacks.delete(staged); }, problem => { callbacks.delete(staged); failed(problem); });
      }
    } catch (problem) { failed(problem); }
    return lastResult!;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (pending) {
      pending.originalDetails.cancel();
      pending.abort.abort();
    }
    for (const request of callbacks) request.abort.abort();
    callbacks.clear();
    pending = null;
    latestRequest = null;
  }

  return { state: () => ({ document, pendingRevision: pending?.proposal.revision, lastResult, disposed }), request, observe, cancelPending, dispose, report };
}
