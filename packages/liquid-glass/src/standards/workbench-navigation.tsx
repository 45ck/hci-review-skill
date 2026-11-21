"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@ui-sdk/react/button";
import { Field, FieldLabel } from "@ui-sdk/react/field";
import { Input } from "@ui-sdk/react/input";
import type { DiagramModel, DiagramNode } from "../developer/types";
import { ModelChoice } from "./controls";

export interface ModelNavigatorProps {
  models: readonly DiagramModel[];
  activeModelId: string;
  onNavigate: (modelId: string, nodeId?: string) => void;
  disabled?: boolean;
}

export function modelFamily(model: DiagramModel): string {
  if (model.profileId?.startsWith("agent-") || model.id.startsWith("agent-")) return "Agents";
  return model.standard?.acronym ?? model.notation.split(" ")[0];
}

export function ModelNavigator({ models, activeModelId, onNavigate, disabled }: ModelNavigatorProps) {
  const [search, setSearch] = useState("");
  const [family, setFamily] = useState("all");
  const previousModelId = useRef(activeModelId);
  const families = useMemo(() => [...new Set(models.map(modelFamily))].sort(), [models]);
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return models.filter(model => (family === "all" || modelFamily(model) === family) && (!query ||
      [model.name, model.notation, model.standard?.acronym, model.description].join(" ").toLocaleLowerCase().includes(query)));
  }, [models, search, family]);
  useEffect(() => {
    if (previousModelId.current !== activeModelId && !filtered.some(model => model.id === activeModelId)) {
      setSearch("");
      setFamily("all");
    }
    previousModelId.current = activeModelId;
  }, [activeModelId, filtered]);
  const active = models.find(model => model.id === activeModelId);
  const ancestors: DiagramModel[] = [];
  const seen = new Set([activeModelId]);
  let parentId = active?.parentModelId;
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = models.find(model => model.id === parentId);
    if (!parent) break;
    ancestors.unshift(parent);
    parentId = parent.parentModelId;
  }
  return <section className="standards-navigator" aria-label="Model navigation">
    <div className="standards-model-filters">
      <Field><FieldLabel>Search model views</FieldLabel><Input value={search} onValueChange={setSearch} disabled={disabled} placeholder="Find a model or task" /></Field>
      <ModelChoice label="Model family" value={family} onChange={setFamily} disabled={disabled}
        items={[{ value: "all", label: "All model families" }, ...families.map(value => ({ value, label: value }))]} />
      <div className="standards-model-choice"><ModelChoice label="Diagram model"
        value={filtered.some(model => model.id === activeModelId) ? activeModelId : null}
        items={filtered.map(model => ({ value: model.id, label: model.name }))}
        disabled={disabled || !filtered.length} onChange={id => onNavigate(id)}
        placeholder={filtered.length ? "Choose a matching view" : "No matching views"} /></div>
      {(search || family !== "all") && <Button onClick={() => { setSearch(""); setFamily("all"); }} disabled={disabled}>Clear model filters</Button>}
    </div>
    <div className="standards-navigation-context">
      <p aria-live="polite">{filtered.length} of {models.length} views{active ? ` · Viewing ${active.notation}` : ""}</p>
      {ancestors.length > 0 && <nav className="standards-breadcrumbs" aria-label="Model hierarchy">
        {ancestors.map(parent => <Button key={parent.id} disabled={disabled} onClick={() => onNavigate(parent.id)} aria-label={`Return to ${parent.name}`}>{parent.notation}</Button>)}
        <span aria-current="page">{active?.notation}</span>
      </nav>}
    </div>
  </section>;
}

export interface ModelReferencesProps {
  model: DiagramModel;
  selected?: DiagramNode;
  models: readonly DiagramModel[];
  onNavigate: (modelId: string, nodeId?: string) => void;
  disabled?: boolean;
}

export function ModelReferences({ model, selected, models, onNavigate, disabled }: ModelReferencesProps) {
  if (!selected?.references?.length) return null;
  return <section className="standards-references" aria-label="Related model views">
    <h3>Follow this element</h3>
    <p>{selected.name}{selected.entityId ? ` · ${selected.entityId}` : ""}</p>
    <ul>{selected.references.map((reference, index) => {
      const target = models.find(candidate => candidate.id === reference.modelId);
      const available = target && (!reference.nodeId || target.nodes.some(node => node.id === reference.nodeId));
      return <li key={`${reference.modelId}-${reference.nodeId ?? ""}-${reference.relation}-${index}`}>
        <Button disabled={disabled || !available} onClick={() => onNavigate(reference.modelId, reference.nodeId)}>
          Open {reference.label}
        </Button>
        <span>{reference.relation.replace("-", " ")}{target ? ` · ${target.notation}` : " · unavailable"}</span>
      </li>;
    })}</ul>
    <span className="qgd-sr-only">References from {model.name}.</span>
  </section>;
}
