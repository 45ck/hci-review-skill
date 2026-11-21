"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LiquidDiagram } from "../developer/diagram";
import type { DiagramModel } from "../developer/types";
import { LiquidModelDocument } from "../modeling/document-provider";
import type { ModelDocumentRenderContext } from "../modeling/primitive";
import type { ModelDocument, ModelDocumentChangeDetails, ModelIssue } from "../modeling/types";
import { ValidationBadge } from "../validation";
import { catalogueCounts } from "./catalogue";
import { StandardsCatalogue } from "./catalogue-browser";
import { diagramProfiles, getDiagramProfile, validateDiagramProfile, type DiagramProfile } from "./profiles";
import { ModelNavigator, ModelReferences } from "./workbench-navigation";
import { ModelInspector } from "./workbench-inspector";
import { ModelDataEditor, ModelHistory, ModelToolbar, ModelValidationPanel } from "./workbench-data";

export interface StandardsWorkbenchProps {
  documents: readonly ModelDocument[];
  onDocumentsChange: (documents: ModelDocument[], details: ModelDocumentChangeDetails) => void;
  profiles?: readonly DiagramProfile[];
  activeModelId?: string;
  defaultModelId?: string;
  onActiveModelChange?: (modelId: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
}

interface WorkbenchDocumentProps extends ModelDocumentRenderContext {
  models: readonly DiagramModel[];
  profiles: readonly DiagramProfile[];
  onNavigate: (modelId: string, nodeId?: string) => void;
  requestedSelection?: { modelId: string; nodeId: string } | null;
  onSelectionRequested: () => void;
}

function WorkbenchDocument({ document, api, disabled, readOnly, lastResult, models, profiles, onNavigate, requestedSelection, onSelectionRequested }: WorkbenchDocumentProps) {
  const [notice, setNotice] = useState("");
  const [editorIssues, setEditorIssues] = useState<ModelIssue[]>([]);
  const model = document.model;
  const selected = model.nodes.find(node => node.id === document.selectedId);
  const profile = getDiagramProfile(model, profiles);
  const profileIssues = useMemo(() => validateDiagramProfile(model, profiles), [model, profiles]);
  useEffect(() => {
    if (!requestedSelection || requestedSelection.modelId !== model.id || disabled) return;
    onSelectionRequested();
    api.select(requestedSelection.nodeId);
  }, [requestedSelection, model.id, disabled, api, onSelectionRequested]);
  useEffect(() => { setNotice(""); setEditorIssues([]); }, [lastResult]);
  const issues = [...editorIssues, ...(lastResult?.ok === false ? lastResult.issues : []), ...profileIssues];
  return <>
    <ModelToolbar document={document} api={api} disabled={disabled} readOnly={readOnly} onNotice={setNotice} />
    <ModelValidationPanel issues={issues} result={lastResult} notice={notice} />
    <div className="standards-workspace-grid">
      <section className="standards-model-panel" data-liquid-glass="" data-liquid-kind="panel" aria-label="Standards models">
        <LiquidDiagram model={model} selectedId={document.selectedId} details="disclosure" disabled={disabled}
          onSelectionChange={id => { api.select(id); }} />
      </section>
      <aside className="standards-inspector-stack" aria-label="Model editing tools">
        <ModelReferences model={model} selected={selected} models={models} onNavigate={onNavigate} disabled={disabled} />
        <ModelInspector document={document} api={api} profile={profile} nodeKinds={profile?.allowedNodeKinds} edgeKinds={profile?.allowedEdgeKinds} disabled={disabled} readOnly={readOnly} />
        <ModelHistory document={document} />
      </aside>
    </div>
    <ModelDataEditor document={document} api={api} disabled={disabled} readOnly={readOnly} onIssues={setEditorIssues} />
  </>;
}

export function StandardsWorkbench({ documents, onDocumentsChange, profiles = diagramProfiles, activeModelId, defaultModelId, onActiveModelChange,
  disabled = false, readOnly = false, className = "" }: StandardsWorkbenchProps) {
  const models = useMemo(() => documents.map(document => document.model), [documents]);
  const validateModel = useCallback((model: DiagramModel) => validateDiagramProfile(model, profiles), [profiles]);
  const [localModelId, setLocalModelId] = useState(() => defaultModelId ?? documents[0]?.model.id ?? "");
  const [requestedSelection, setRequestedSelection] = useState<{ modelId: string; nodeId: string } | null>(null);
  const current = documents.find(document => document.model.id === (activeModelId ?? localModelId)) ?? documents[0];
  const navigate = (modelId: string, nodeId?: string) => {
    const next = documents.find(document => document.model.id === modelId);
    if (disabled || !next || (nodeId && !next.model.nodes.some(node => node.id === nodeId))) return;
    setRequestedSelection(nodeId ? { modelId, nodeId } : null);
    if (activeModelId === undefined) setLocalModelId(modelId);
    onActiveModelChange?.(modelId);
  };
  return <div className={`standards-showcase standards-workbench ${className}`} data-kit-view="standards" data-validation="unvalidated">
    <div className="standards-intro"><div><p className="standards-eyebrow">Business · systems · software · agents</p><p>Explore a model. Follow its connections. Shape the next revision.</p></div><StandardsCatalogue models={models} onChoose={navigate} disabled={disabled} /></div>
    <p className="standards-scope"><ValidationBadge /> {models.length} editable views · {catalogueCounts.officialEntries} OMG catalogue entries. Custom adapters await human UI/UX review.</p>
    {!current ? <section className="standards-empty-workspace" aria-label="Empty model workspace"><h2>No model documents</h2><p>Provide a model document to begin. The catalogue remains available for reference.</p></section> : <>
      <ModelNavigator models={models} activeModelId={current.model.id} onNavigate={navigate} disabled={disabled} />
      <LiquidModelDocument key={current.model.id} className="standards-document" label="Model document" document={current} models={models} validateModel={validateModel}
        disabled={disabled} readOnly={readOnly} onDocumentChange={(next, details) => {
          onDocumentsChange(documents.map(document => document.model.id === next.model.id ? next : document), details);
        }}>
        {context => <WorkbenchDocument {...context} models={models} profiles={profiles} onNavigate={navigate} requestedSelection={requestedSelection} onSelectionRequested={() => setRequestedSelection(null)} />}
      </LiquidModelDocument>
    </>}
  </div>;
}
