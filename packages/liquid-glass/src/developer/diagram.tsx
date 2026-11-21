"use client";

import { createElement, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@ui-sdk/react/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@ui-sdk/react/collapsible";
import {
  Select, SelectContent, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@ui-sdk/react/select";
import { ValidationBadge } from "../validation";
import { diagramScene, nodeHeaderHeight, nodeKeyword, validateDiagramModel, type DiagramShape } from "./scene";
import type { DiagramEdge, DiagramModel, DiagramSelectionDetails, LiquidDiagramProps } from "./types";
import { LiquidViewport, type LiquidViewportHandle } from "./viewport";

function renderShape(item: DiagramShape, key: string): ReactNode {
  return createElement(item.tag, { ...item.attrs, key }, item.text, item.children?.map((child, index) => renderShape(child, `${key}-${index}`)));
}

const relationshipNames: Partial<Record<DiagramEdge["kind"], string>> = {
  association: "Association",
  composition: "Composition",
  aggregation: "Aggregation",
  generalization: "Generalization",
  dependency: "Dependency",
  realization: "Realization",
  navigationLink: "«navigationLink»",
  processLink: "«processLink»",
  sequenceFlow: "Sequence flow",
  messageFlow: "Message flow",
  informationRequirement: "Information requirement",
  knowledgeRequirement: "Knowledge requirement",
  authorityRequirement: "Authority requirement",
  caseLink: "Case link",
  synchronousMessage: "Synchronous message",
  returnMessage: "Return message",
  controlFlow: "Control flow",
  transition: "Transition",
  extension: "Extension",
  deliverableFlow: "Deliverable flow",
  intangibleFlow: "Intangible flow",
  dataFlow: "Data flow",
  navigationFlow: "Navigation flow",
  sentryOnPart: "Sentry on-part",
  valuePropositionFlow: "Value proposition flow",
  communicationMessage: "Communication message",
};

export function DiagramMetadata({ model, labelId, summaryId }: { model: DiagramModel; labelId?: string; summaryId?: string }) {
  return <>
  <header className="qgd-heading">
        <div><p className="qgd-eyebrow">{model.notation}</p><h3 id={labelId}>{model.name}</h3></div>
        <ValidationBadge />
      </header>
      <p className="qgd-summary" id={summaryId}>{model.description}</p>
      {model.standard && <p className="qgd-standard-source">
        <a href={model.standard.sourceUrl} target="_blank" rel="noreferrer">{model.standard.acronym} {model.standard.version}</a>
        <span>{model.standard.coverage === "concept-projection" ? "Concept projection" : "Notation subset"} · {model.standard.scope}</span>
      </p>}
      {model.legend?.length ? <div className="qgd-legend" aria-label="Diagram legend"><strong>Key</strong><ul>{model.legend.map(item => <li key={item}>{item}</li>)}</ul></div> : null}
  </>;
}

export function DiagramDetails({ model, selectedId, id }: { model: DiagramModel; selectedId?: string | null; id?: string }) {
  const selected = selectedId === null ? undefined : model.nodes.find(node => node.id === selectedId) ?? model.nodes[0];
  const nodes = new Map(model.nodes.map(node => [node.id, node]));
  const containmentCount = model.nodes.filter(node => node.parentId).length;
  const detailsId = id;
  return (
        <div className="qgd-reading" data-diagram-description>
          <section className="qgd-inspector" data-diagram-selection={selected?.id} aria-label="Selected element" id={detailsId}>
            <p className="qgd-eyebrow">Element details</p>
            {selected ? <>
              <h4>{selected.name}</h4>
              <p className="qgd-element-kind">{nodeKeyword(selected) ? `«${nodeKeyword(selected)}»` : `${selected.abstract ? "Abstract " : ""}${selected.kind}`}{selected.multiplicity ? ` · multiplicity ${selected.multiplicity}` : ""}</p>
              <p>{selected.description}</p>
              {selected.architecture && <p><strong>{selected.architecture.type}</strong>{selected.architecture.external ? " · External" : ""}{selected.architecture.technology ? ` · ${selected.architecture.technology}` : ""}</p>}
              {selected.parentId && <p>Contained in <strong>{nodes.get(selected.parentId)?.name}</strong>.</p>}
              {selected.ownerId && <p>Owner: <strong>{nodes.get(selected.ownerId)?.name}</strong>.</p>}
              {selected.compartments?.map((compartment, index) => <div className="qgd-member-list" key={index}>
                {compartment.label && <h5>{compartment.label}</h5>}
                <ul>{compartment.entries.map((entry) => <li key={entry}><code>{entry}</code></li>)}</ul>
              </div>)}
              {selected.constraints?.length ? <p>Constraints: <code>{`{${selected.constraints.join(", ")}}`}</code></p> : null}
              {selected.table && <div className="qgd-table-alternative">
                {selected.table.hitPolicy && <p>Hit policy: <strong>{selected.table.hitPolicy}</strong></p>}
                <table>
                  <caption>{selected.name} rules</caption>
                  <thead><tr>{selected.table.columns.map((column, index) => <th key={`${index}-${column}`} scope="col">{column}</th>)}</tr></thead>
                  <tbody>{selected.table.rows.map((row, rowIndex) => <tr key={`${selected.id}-row-${rowIndex}`}>{row.map((cell, columnIndex) => <td key={`${selected.id}-${rowIndex}-${columnIndex}`}>{cell}</td>)}</tr>)}</tbody>
                </table>
              </div>}
              {selected.activations?.length ? <p>{selected.activations.length} execution {selected.activations.length === 1 ? "specification" : "specifications"} on this lifeline.</p> : null}
            </> : <p>{model.nodes.length ? "No element selected." : "This model has no elements."}</p>}
          </section>
          <section className="qgd-relationships" aria-label="Diagram relationships">
            <p className="qgd-eyebrow">Read the model</p>
            <h4>{model.nodes.length} elements · {model.edges.length} links{containmentCount > 0 ? ` · ${containmentCount} containments` : ""}</h4>
            {model.edges.length > 0 && <ul>{model.edges.map((edge) => <li key={edge.id} data-diagram-relation={edge.id}>
              <span className="qgd-relationship-kind">{relationshipNames[edge.kind] ?? edge.kind}</span>
              <strong>{nodes.get(edge.source)?.name} <span aria-label="to">→</span> {nodes.get(edge.target)?.name}</strong>
              <p>{edge.description}</p>
              {(edge.order !== undefined || edge.technology) && <p>{edge.order !== undefined ? `Step ${edge.order}` : ""}{edge.order !== undefined && edge.technology ? " · " : ""}{edge.technology}</p>}
              {(edge.sourceMultiplicity || edge.targetMultiplicity) && <span className="qgd-multiplicity">Multiplicity: {nodes.get(edge.source)?.name} {edge.sourceMultiplicity ?? "unspecified"}; {nodes.get(edge.target)?.name} {edge.targetMultiplicity ?? "unspecified"}.</span>}
            </li>)}</ul>}
            {model.nodes.some((node) => node.parentId) && <ul className="qgd-containment">{model.nodes.filter((node) => node.parentId).map((node) => <li key={node.id} data-diagram-containment={node.id}>
              <span className="qgd-relationship-kind">Containment</span>
              <strong>{nodes.get(node.parentId!)?.name} → {node.name}</strong>
              <p>{nodeKeyword(node) ? `«${nodeKeyword(node)}»` : node.kind}{node.multiplicity ? `, multiplicity ${node.multiplicity}` : ""}. {node.description}</p>
            </li>)}</ul>}
            {model.nodes.some((node) => node.ownerId) && <ul className="qgd-containment">{model.nodes.filter((node) => node.ownerId).map((node) => <li key={node.id} data-diagram-owner={node.id}>
              <span className="qgd-relationship-kind">Boundary ownership</span>
              <strong>{nodes.get(node.ownerId!)?.name} → {node.name}</strong>
              <p>{node.description}</p>
            </li>)}</ul>}
            {model.edges.length === 0 && !model.nodes.some((node) => node.parentId || node.ownerId) && <p>No relationships in this model.</p>}
          </section>
        </div>
  );
}

export function LiquidDiagram({ model, selectedId, onSelectionChange, className = "", details = "inline", disabled = false }: LiquidDiagramProps) {
  const [localSelection, setLocalSelection] = useState<string>();
  const viewportRef = useRef<LiquidViewportHandle>(null);
  const labelId = useId();
  const summaryId = useId();
  const detailsId = useId();
  const errors = useMemo(() => validateDiagramModel(model), [model]);
  const selected = selectedId === null ? undefined : model.nodes.find((node) => node.id === (selectedId ?? localSelection)) ?? model.nodes[0];
  const scene = useMemo(() => errors.length ? [] : diagramScene(model, selected?.id), [model, selected?.id, errors]);
  const parents = new Set(model.nodes.map((node) => node.parentId));
  const nodes = new Map(model.nodes.map((node) => [node.id, node]));
  useEffect(() => {
    if (selected) viewportRef.current?.reveal({ left: selected.x, top: selected.y, right: selected.x + selected.width, bottom: selected.y + selected.height });
  }, [model.id, selected?.id, selected?.x, selected?.y, selected?.width, selected?.height]);

  function selectNode(nodeId: string, details: DiagramSelectionDetails) {
    if (disabled || !nodes.has(nodeId)) return;
    setLocalSelection(nodeId);
    onSelectionChange?.(nodeId, details);
    const node = nodes.get(nodeId)!;
    viewportRef.current?.reveal({ left: node.x, top: node.y, right: node.x + node.width, bottom: node.y + node.height });
  }

  return (
    <section className={`qgd-diagram ${className}`} data-diagram-id={model.id} data-validation="unvalidated" aria-labelledby={labelId}>
      <DiagramMetadata model={model} labelId={labelId} summaryId={summaryId} />
      {errors.length ? <p role="alert">This model cannot render: {errors.join(" ")}</p> : <>
        <div className="qgd-toolbar">
          <div className="qgd-element-picker">
            <Select
              value={selected?.id ?? null}
              disabled={disabled}
              items={model.nodes.map((node) => ({ value: node.id, label: node.name }))}
              onValueChange={(value, details) => {
                if (typeof value === "string") selectNode(value, { source: details.source, reason: "element-select" });
              }}
            >
              <SelectLabel>Diagram element</SelectLabel>
              <SelectTrigger><SelectValue placeholder="Choose an element" /></SelectTrigger>
              <SelectContent className="qgd-element-options">
                {model.nodes.map((node) => <SelectItem key={node.id} value={node.id}>{node.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <LiquidViewport label="Diagram" width={model.width} height={model.height} resetKey={model.id}
          ref={viewportRef} worldClassName="qgd-canvas-stage"
          selectionRect={selected ? { left: selected.x, top: selected.y, right: selected.x + selected.width, bottom: selected.y + selected.height } : null}>
            <svg viewBox={`0 0 ${model.width} ${model.height}`} aria-hidden="true" focusable="false" data-diagram-artwork>
              {scene.map((item, index) => renderShape(item, `scene-${index}`))}
            </svg>
            {model.nodes.map((node) => <Button
              key={node.id}
              className="qgd-node-button"
              data-diagram-node={node.id}
              data-viewport-interactive
              disabled={disabled}
              aria-label={`Inspect ${node.name}`}
              aria-pressed={node.id === selected?.id}
              aria-controls={details === "none" ? undefined : detailsId}
              onClick={(_, details) => selectNode(node.id, { source: details.source, reason: "node-press" })}
              style={{ left: `${node.x / model.width * 100}%`, top: `${node.y / model.height * 100}%`, width: `${node.width / model.width * 100}%`, height: `${(parents.has(node.id) ? Math.max(24, nodeHeaderHeight(node)) : node.height) / model.height * 100}%` }}
            ><span className="qgd-sr-only">{node.name}</span></Button>)}
        </LiquidViewport>
        <p className="qgd-canvas-hint">Select an element to inspect it. Use the element menu or Tab and Enter; Focus selection brings the selected element into view.</p>
        <span className="qgd-sr-only" aria-live="polite">Selected element: {selected?.name ?? "none"}.</span>
        {details === "inline" && <DiagramDetails model={model} selectedId={selected?.id ?? null} id={detailsId} />}
        {details === "disclosure" && <Collapsible className="qgd-details-disclosure" aria-label="Diagram details">
          <CollapsibleTrigger>Read model details</CollapsibleTrigger>
          <CollapsiblePanel keepMounted><DiagramDetails model={model} selectedId={selected?.id ?? null} id={detailsId} /></CollapsiblePanel>
        </Collapsible>}
      </>}
      <p className="qgd-validation-note">Unvalidated: this custom component has not been reviewed or approved by a human UI/UX team. Each standards example declares its notation subset or concept projection; these views do not assert full standards conformance.</p>
    </section>
  );
}
