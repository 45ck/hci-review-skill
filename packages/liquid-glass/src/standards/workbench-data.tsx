"use client";

import { useState } from "react";
import { Button } from "@ui-sdk/react/button";
import { Field, FieldDescription, FieldLabel } from "@ui-sdk/react/field";
import { Textarea } from "@ui-sdk/react/textarea";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@ui-sdk/react/collapsible";
import { diagramToSvg } from "../developer/scene";
import type { ModelActionResult, ModelDocument, ModelDocumentHandle, ModelIssue } from "../modeling/types";

export interface ModelToolbarProps {
  document: ModelDocument;
  api: ModelDocumentHandle;
  onNotice?: (message: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

export function ModelToolbar({ document, api, onNotice, disabled, readOnly }: ModelToolbarProps) {
  const { model, revision, past, future } = document;
  return <div className="standards-toolbar" aria-label="Model actions">
    <span className="standards-revision" data-model-revision={revision}>Revision {revision} · {model.nodes.length} elements</span>
    <div className="standards-export-actions">
      <Button disabled={disabled || readOnly || !past.length} onClick={event => { api.undo(revision, { event: event.nativeEvent }); }}>Undo diagram change</Button>
      <Button disabled={disabled || readOnly || !future.length} onClick={event => { api.redo(revision, { event: event.nativeEvent }); }}>Redo diagram change</Button>
      <Button disabled={disabled} onClick={async () => {
        try { await navigator.clipboard.writeText(JSON.stringify(model, null, 2)); onNotice?.("Diagram JSON copied from the current model."); }
        catch { onNotice?.("Clipboard unavailable. Open Model data to copy the JSON."); }
      }}>Copy diagram JSON</Button>
      <Button disabled={disabled} onClick={() => {
        const url = URL.createObjectURL(new Blob([diagramToSvg(model)], { type: "image/svg+xml;charset=utf-8" }));
        const anchor = globalThis.document.createElement("a");
        anchor.href = url; anchor.download = `${model.id}.svg`; anchor.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        onNotice?.("Diagram SVG download prepared from the current model.");
      }}>Download diagram SVG</Button>
    </div>
  </div>;
}

export function ModelHistory({ document }: { document: ModelDocument }) {
  const recent = document.past.slice(-10).reverse();
  return <Collapsible className="standards-history" aria-label="Model history"><CollapsibleTrigger>Change history · {document.past.length}</CollapsibleTrigger><CollapsiblePanel>
    <p>Revision {document.revision}. Undo and redo create a new revision, so an old agent request cannot overwrite the current model.</p>
    {recent.length ? <ol reversed>{recent.map((entry, index) => <li key={`${document.past.length - index}-${entry.label}`}>{entry.label}</li>)}</ol> : <p>No document changes in this session.</p>}
    {document.future.length > 0 && <p>{document.future.length} change{document.future.length === 1 ? "" : "s"} available to redo.</p>}
  </CollapsiblePanel></Collapsible>;
}

export interface ModelValidationPanelProps {
  issues: readonly ModelIssue[];
  result?: ModelActionResult | null;
  notice?: string;
}

export function ModelValidationPanel({ issues, result, notice }: ModelValidationPanelProps) {
  const errors = issues.filter(issue => issue.severity !== "warning");
  const warnings = issues.filter(issue => issue.severity === "warning");
  const feedback = notice || (result?.ok && result.changed ? result.summary.label : "");
  return <section className="standards-validation" aria-label="Model validation" data-model-outcome={result?.status ?? "idle"}>
    {errors.length > 0 && <div className="standards-error" role="alert" data-developer-error="">
      <strong>{result?.ok === false ? "Change could not be applied" : "Model needs attention"}</strong><ul>{errors.slice(0, 8).map((issue, index) => <li key={`${issue.code}-${index}`}>{issue.message}</li>)}</ul>
    </div>}
    {warnings.length > 0 && <div className="standards-warning" role="status"><strong>Review this model</strong><ul>{warnings.slice(0, 8).map((issue, index) => <li key={`${issue.code}-${index}`}>{issue.message}</li>)}</ul></div>}
    <output className="standards-feedback" data-developer-feedback="" aria-live="polite">{feedback}</output>
  </section>;
}

export interface ModelDataEditorProps {
  document: ModelDocument;
  api: ModelDocumentHandle;
  onIssues?: (issues: ModelIssue[]) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

function ModelContextFields({ api }: { api: ModelDocumentHandle }) {
  return <Field><FieldLabel>Agent model context</FieldLabel><Textarea readOnly value={JSON.stringify(api.inspect(), null, 2)} rows={8} spellCheck={false} />
    <FieldDescription>Current selection, revision, relationships and cross-view references. The SDK exposes the same context through inspect.</FieldDescription></Field>;
}

function ModelJsonFields({ document, api, onIssues, disabled, readOnly }: ModelDataEditorProps) {
  const [draft, setDraft] = useState("");
  const [draftRevision, setDraftRevision] = useState(document.revision);
  const [transactionDraft, setTransactionDraft] = useState("");
  const [preview, setPreview] = useState<ModelActionResult | null>(null);
  const currentJson = JSON.stringify(document.model, null, 2);
  const parse = (text: string): unknown => {
    if (text.length > 1_000_000) throw new Error("Limit model JSON to 1 MB.");
    return JSON.parse(text) as unknown;
  };
  const report = (problem: unknown) => onIssues?.([{ code: "invalid-json", message: problem instanceof Error ? problem.message : "Invalid diagram JSON." }]);
  return <>
    <Field><FieldLabel>Diagram JSON</FieldLabel><Textarea readOnly value={currentJson} rows={8} spellCheck={false} />
      <FieldDescription>Current model and stable element IDs. Application JSON; not XMI, BPMN XML or another standards interchange format.</FieldDescription></Field>
    <Field><FieldLabel>Import diagram JSON</FieldLabel><Textarea value={draft} onValueChange={value => { if (!draft) setDraftRevision(document.revision); setDraft(value); setPreview(null); }}
      rows={7} spellCheck={false} disabled={disabled} readOnly={readOnly} placeholder="Paste an edited model. Keep its model ID." /></Field>
    <div className="standards-editor-actions">
      <Button disabled={disabled || readOnly} onClick={() => { setDraft(currentJson); setDraftRevision(document.revision); setPreview(null); onIssues?.([]); }}>Load current model into editor</Button>
      <Button disabled={disabled || !draft.trim()} onClick={() => {
        try { onIssues?.([]); setPreview(api.preview({ expectedRevision: draftRevision, label: "Apply structured model edits", operations: [{ type: "replace-model", model: parse(draft) }] })); }
        catch (problem) { report(problem); }
      }}>Preview diagram JSON</Button>
      <Button disabled={disabled || readOnly || !draft.trim()} onClick={event => {
        try {
          onIssues?.([]);
          const result = api.applyTransaction({ expectedRevision: draftRevision, label: "Applied structured model edits. Undo is available.", operations: [{ type: "replace-model", model: parse(draft) }] }, { event: event.nativeEvent });
          if (result.ok) setDraftRevision(result.requestedRevision ?? result.revision);
          setPreview(null);
        } catch (problem) { report(problem); }
      }}>Apply diagram JSON</Button>
    </div>
    {draft && draftRevision !== document.revision && <p className="standards-stale-draft" role="status">This draft started at revision {draftRevision}; the model is now at revision {document.revision}. Load the current model before applying it.</p>}
    {preview && <div className="standards-preview" role="status">
      <strong>{preview.ok ? "Preview ready · no changes applied" : "Preview needs changes"}</strong>
      {preview.ok ? <p>{preview.summary.addedNodeIds.length} added, {preview.summary.updatedNodeIds.length} updated, {preview.summary.removedNodeIds.length} removed elements.</p>
        : <ul>{preview.issues.map((issue, index) => <li key={`${issue.code}-${index}`}>{issue.message}</li>)}</ul>}
    </div>}
    <Collapsible className="standards-transaction" aria-label="Atomic model transactions"><CollapsibleTrigger>Atomic transactions</CollapsibleTrigger><CollapsiblePanel keepMounted>
      <Field><FieldLabel>Diagram transaction</FieldLabel><Textarea value={transactionDraft} onValueChange={setTransactionDraft} disabled={disabled} readOnly={readOnly} rows={7} spellCheck={false} />
        <FieldDescription>Operations apply together at an expected revision. If any operation fails, the document stays unchanged.</FieldDescription></Field>
      <div className="standards-editor-actions"><Button disabled={disabled || readOnly} onClick={() => setTransactionDraft(JSON.stringify(api.inspect().transactionExample, null, 2))}>Load transaction example</Button>
        <Button disabled={disabled || !transactionDraft.trim()} onClick={() => { try { onIssues?.([]); setPreview(api.preview(parse(transactionDraft))); } catch (problem) { report(problem); } }}>Preview model transaction</Button>
        <Button disabled={disabled || readOnly || !transactionDraft.trim()} onClick={event => { try { onIssues?.([]); api.applyTransaction(parse(transactionDraft), { event: event.nativeEvent }); setPreview(null); } catch (problem) { report(problem); } }}>Apply model transaction</Button>
      </div>
    </CollapsiblePanel></Collapsible>
    <Collapsible className="standards-context" aria-label="Agent context"><CollapsibleTrigger>Agent context</CollapsibleTrigger><CollapsiblePanel><ModelContextFields api={api} /></CollapsiblePanel></Collapsible>
    <p>Changes stay while you explore the kit. Export JSON to retain your work before reloading.</p>
  </>;
}

export function ModelDataEditor(props: ModelDataEditorProps) {
  const [visited, setVisited] = useState(false);
  return <Collapsible className="standards-data-panel" aria-label="Model data" onOpenChange={open => { if (open) setVisited(true); }}><CollapsibleTrigger>Model data and structured edits</CollapsibleTrigger>
    <CollapsiblePanel keepMounted>{visited && <ModelJsonFields {...props} />}</CollapsiblePanel>
  </Collapsible>;
}
