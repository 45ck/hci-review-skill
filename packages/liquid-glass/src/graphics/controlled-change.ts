import type { ChangeSource } from "@ui-sdk/core";
import type { GraphicChangeDetails, GraphicDocument } from "./types";

type GraphicChangeInput = {
  reason: GraphicChangeDetails["reason"];
  source: ChangeSource;
  event?: Event;
  layerId?: string;
  selectedId?: string;
  message?: string;
};

type GraphicChangeResult = {
  status: "requested" | "applied" | "applied-error" | "cancelled" | "rejected" | "external";
  message: string;
  revision: number;
  selectedId?: string;
};

const signature = (value: unknown): string => JSON.stringify(value, (_key, item) =>
  item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([left], [right]) => left.localeCompare(right)))
    : item);

function createGraphicChangeController(initial: GraphicDocument, notify: (result: GraphicChangeResult) => void = () => {}) {
  let document = initial;
  let undo: GraphicDocument[] = [];
  let redo: GraphicDocument[] = [];
  let lastResult: GraphicChangeResult | null = null;
  let pending: {
    before: GraphicDocument;
    beforeSignature: string;
    proposal: GraphicDocument;
    proposalSignature: string;
    input: GraphicChangeInput;
    details: GraphicChangeDetails;
    abort: AbortController;
    applied: boolean;
  } | null = null;

  function report(status: GraphicChangeResult["status"], message: string, selectedId?: string) {
    const result = { status, message, revision: document.revision, ...(selectedId && { selectedId }) };
    lastResult = result;
    notify(result);
    return result;
  }

  function cancel(message = "The pending graphic change was cancelled.") {
    if (!pending) return null;
    const previous = pending;
    pending = null;
    previous.abort.abort();
    return report("cancelled", message);
  }

  function observe(next: GraphicDocument) {
    const prior = document;
    const priorSignature = signature(prior);
    const observed = signature(next);
    document = next;
    if (next.id !== prior.id) {
      const previous = pending;
      pending = null;
      previous?.abort.abort();
      undo = [];
      redo = [];
      return report("external", "Opened another composition.");
    }
    if (!pending) {
      if (observed === priorSignature) return null;
      undo = [];
      redo = [];
      return report("external", "The host changed this composition. Local undo history was cleared.");
    }
    const request = pending;
    if (observed === request.proposalSignature) {
      pending = null;
      request.applied = true;
      if (request.input.reason === "undo") {
        undo = undo.slice(0, -1);
        redo = [...redo.slice(-39), request.before];
      } else if (request.input.reason === "redo") {
        redo = redo.slice(0, -1);
        undo = [...undo.slice(-39), request.before];
      } else {
        undo = [...undo.slice(-39), request.before];
        redo = [];
      }
      return report("applied", request.input.message ?? `${request.input.reason === "properties" ? "Applied layer changes" : "Updated composition"}. Revision ${next.revision}.`, request.input.selectedId);
    }
    if (observed === request.beforeSignature) return null;
    pending = null;
    request.abort.abort();
    undo = [];
    redo = [];
    return report("rejected", "The host supplied a different composition. Inspect its current revision before editing again.");
  }

  function request(next: GraphicDocument, input: GraphicChangeInput, accept: (model: GraphicDocument, details: GraphicChangeDetails) => void | Promise<void>) {
    if (pending) return report("rejected", "A graphic change is waiting for the host. Wait or cancel the pending change.");
    if (next.id !== document.id) return report("rejected", "Keep the current composition ID.");
    if (!Number.isSafeInteger(document.revision + 1)) return report("rejected", "The composition revision cannot advance safely.");
    if ((input.reason === "undo" && !undo.length) || (input.reason === "redo" && !redo.length)) return report("rejected", "No history entry is available.");
    const abort = new AbortController();
    let canceled = false;
    const details: GraphicChangeDetails = {
      reason: input.reason, source: input.source, event: input.event, layerId: input.layerId,
      signal: abort.signal,
      cancel() {
        if (pending?.details !== details) return;
        canceled = true;
        cancel("The host cancelled this graphic change.");
      },
      get canceled() { return canceled || abort.signal.aborted; },
    };
    const proposal = { ...structuredClone(next), revision: document.revision + 1 };
    const staged = { before: structuredClone(document), beforeSignature: signature(document), proposal,
      proposalSignature: signature(proposal), input, details, abort, applied: false };
    pending = staged;
    report("requested", `Waiting for the host to accept revision ${proposal.revision}.`);
    const failed = (issue: unknown) => {
      if (staged.applied) {
        if (document.id === staged.proposal.id) report("applied-error", `Revision ${staged.proposal.revision} was already applied; the host callback later failed${issue instanceof Error ? `: ${issue.message}` : "."} The applied document was not rolled back.`);
        return;
      }
      if (pending !== staged) return;
      pending = null;
      abort.abort();
      report("rejected", issue instanceof Error ? `The host rejected the graphic change: ${issue.message}` : "The host rejected the graphic change.");
    };
    const completed = () => {
      if (pending !== staged) return;
      observe(document);
    };
    try {
      const result = accept(proposal, details);
      if (result && typeof result.then === "function") result.then(completed, failed);
      else completed();
    } catch (issue) { failed(issue); }
    return lastResult;
  }

  return { state: () => ({ document, undo, redo, pending }), request, observe, cancel };
}

export { createGraphicChangeController };
export type { GraphicChangeInput, GraphicChangeResult };
