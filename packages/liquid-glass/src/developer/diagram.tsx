"use client";

import { createElement, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@ui-sdk/react/button";
import {
  Select, SelectContent, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@ui-sdk/react/select";
import { ValidationBadge } from "../validation";
import { diagramScene, nodeHeaderHeight, nodeKeyword, validateDiagramModel, type DiagramShape } from "./scene";
import type { DiagramEdge, DiagramSelectionDetails, LiquidDiagramProps } from "./types";

function renderShape(item: DiagramShape, key: string): ReactNode {
  return createElement(item.tag, { ...item.attrs, key }, item.text, item.children?.map((child, index) => renderShape(child, `${key}-${index}`)));
}

const relationshipNames: Record<DiagramEdge["kind"], string> = {
  association: "Association",
  composition: "Composition",
  aggregation: "Aggregation",
  generalization: "Generalization",
  dependency: "Dependency",
  realization: "Realization",
  navigationLink: "«navigationLink»",
  processLink: "«processLink»",
};

export function LiquidDiagram({ model, selectedId, onSelectionChange, className = "" }: LiquidDiagramProps) {
  const [localSelection, setLocalSelection] = useState<string>();
  const [zoom, setZoom] = useState(1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const summaryId = useId();
  const detailsId = useId();
  const errors = useMemo(() => validateDiagramModel(model), [model]);
  const selected = model.nodes.find((node) => node.id === (selectedId ?? localSelection)) ?? model.nodes[0];
  const scene = useMemo(() => errors.length ? [] : diagramScene(model, selected?.id), [model, selected?.id, errors]);
  const parents = new Set(model.nodes.map((node) => node.parentId));
  const nodes = new Map(model.nodes.map((node) => [node.id, node]));

  function selectNode(nodeId: string, details: DiagramSelectionDetails) {
    if (!nodes.has(nodeId)) return;
    setLocalSelection(nodeId);
    onSelectionChange?.(nodeId, details);
    const node = nodes.get(nodeId)!;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const stage = viewport.firstElementChild as HTMLElement | null;
    const scale = (stage?.clientWidth ?? model.width) / model.width;
    const left = node.x * scale;
    const right = (node.x + node.width) * scale;
    if (left < viewport.scrollLeft || right > viewport.scrollLeft + viewport.clientWidth) {
      viewport.scrollLeft = Math.max(0, left - (viewport.clientWidth - node.width * scale) / 2);
    }
  }

  return (
    <section className={`qgd-diagram ${className}`} data-diagram-id={model.id} data-validation="unvalidated" aria-labelledby={labelId}>
      <header className="qgd-heading">
        <div><p className="qgd-eyebrow">{model.notation}</p><h3 id={labelId}>{model.name}</h3></div>
        <ValidationBadge />
      </header>
      <p className="qgd-summary" id={summaryId}>{model.description}</p>
      {errors.length ? <p role="alert">This model cannot render: {errors.join(" ")}</p> : <>
        <div className="qgd-toolbar">
          <div className="qgd-element-picker">
            <Select
              value={selected?.id ?? null}
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
          <div className="qgd-zoom">
            <Button aria-label="Zoom out diagram" disabled={zoom <= 0.75} onClick={() => setZoom((value) => Math.max(0.75, value - 0.25))}>−</Button>
            <span data-diagram-zoom={Math.round(zoom * 100)} aria-live="polite">{Math.round(zoom * 100)}%</span>
            <Button aria-label="Zoom in diagram" disabled={zoom >= 2} onClick={() => setZoom((value) => Math.min(2, value + 0.25))}>+</Button>
            <Button onClick={() => { setZoom(1); if (viewportRef.current) viewportRef.current.scrollLeft = 0; }}>Reset diagram view</Button>
          </div>
        </div>
        <div className="qgd-canvas-viewport" data-liquid-glass="off" ref={viewportRef} tabIndex={0} role="region" aria-label="Scrollable diagram" aria-describedby={summaryId}>
          <div className="qgd-canvas-stage" style={{ width: `${zoom * 100}%`, minWidth: model.width * zoom, aspectRatio: `${model.width} / ${model.height}` }}>
            <svg viewBox={`0 0 ${model.width} ${model.height}`} aria-hidden="true" focusable="false" data-diagram-artwork>
              {scene.map((item, index) => renderShape(item, `scene-${index}`))}
            </svg>
            {model.nodes.map((node) => <Button
              key={node.id}
              className="qgd-node-button"
              data-diagram-node={node.id}
              aria-label={`Inspect ${node.name}`}
              aria-pressed={node.id === selected?.id}
              aria-controls={detailsId}
              onClick={(_, details) => selectNode(node.id, { source: details.source, reason: "node-press" })}
              style={{ left: `${node.x / model.width * 100}%`, top: `${node.y / model.height * 100}%`, width: `${node.width / model.width * 100}%`, height: `${(parents.has(node.id) ? nodeHeaderHeight(node) : node.height) / model.height * 100}%` }}
            ><span className="qgd-sr-only">{node.name}</span></Button>)}
          </div>
        </div>
        <p className="qgd-canvas-hint">Select an element to inspect it. Use the element menu or Tab and Enter; on small screens, scroll the diagram horizontally.</p>
        <div className="qgd-reading" data-diagram-description>
          <section className="qgd-inspector" data-diagram-selection={selected?.id} aria-label="Selected element" id={detailsId}>
            <p className="qgd-eyebrow">Element details</p>
            {selected ? <>
              <h4>{selected.name}</h4>
              <p className="qgd-element-kind">{nodeKeyword(selected) ? `«${nodeKeyword(selected)}»` : selected.abstract ? "Abstract class" : "Class"}{selected.multiplicity ? ` · multiplicity ${selected.multiplicity}` : ""}</p>
              <p>{selected.description}</p>
              {selected.parentId && <p>Contained in <strong>{nodes.get(selected.parentId)?.name}</strong>.</p>}
              {selected.compartments?.map((compartment, index) => <div className="qgd-member-list" key={index}>
                {compartment.label && <h5>{compartment.label}</h5>}
                <ul>{compartment.entries.map((entry) => <li key={entry}><code>{entry}</code></li>)}</ul>
              </div>)}
              {selected.constraints?.length ? <p>Constraints: <code>{`{${selected.constraints.join(", ")}}`}</code></p> : null}
            </> : <p>This model has no elements.</p>}
            <span className="qgd-sr-only" aria-live="polite">Selected element: {selected?.name ?? "none"}.</span>
          </section>
          <section className="qgd-relationships" aria-label="Diagram relationships">
            <p className="qgd-eyebrow">Read the model</p>
            <h4>{model.nodes.length} elements · {model.edges.length} relationships</h4>
            {model.edges.length > 0 && <ul>{model.edges.map((edge) => <li key={edge.id} data-diagram-relation={edge.id}>
              <span className="qgd-relationship-kind">{relationshipNames[edge.kind]}</span>
              <strong>{nodes.get(edge.source)?.name} <span aria-label="to">→</span> {nodes.get(edge.target)?.name}</strong>
              <p>{edge.description}</p>
              {(edge.sourceMultiplicity || edge.targetMultiplicity) && <span className="qgd-multiplicity">Multiplicity: {nodes.get(edge.source)?.name} {edge.sourceMultiplicity ?? "unspecified"}; {nodes.get(edge.target)?.name} {edge.targetMultiplicity ?? "unspecified"}.</span>}
            </li>)}</ul>}
            {model.nodes.some((node) => node.parentId) && <ul className="qgd-containment">{model.nodes.filter((node) => node.parentId).map((node) => <li key={node.id} data-diagram-containment={node.id}>
              <span className="qgd-relationship-kind">Containment</span>
              <strong>{nodes.get(node.parentId!)?.name} → {node.name}</strong>
              <p>{nodeKeyword(node) ? `«${nodeKeyword(node)}»` : node.kind}{node.multiplicity ? `, multiplicity ${node.multiplicity}` : ""}. {node.description}</p>
            </li>)}</ul>}
            {model.edges.length === 0 && !model.nodes.some((node) => node.parentId) && <p>No relationships in this model.</p>}
          </section>
        </div>
      </>}
      <p className="qgd-validation-note">Unvalidated: this custom component has not been reviewed or approved by a human UI/UX team. It renders a documented subset of UML/UWE notation.</p>
    </section>
  );
}
