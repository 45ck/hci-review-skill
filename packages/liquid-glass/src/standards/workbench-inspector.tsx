"use client";

import { useEffect, useState } from "react";
import { Button } from "@ui-sdk/react/button";
import { Field, FieldDescription, FieldLabel } from "@ui-sdk/react/field";
import { Input } from "@ui-sdk/react/input";
import { Textarea } from "@ui-sdk/react/textarea";
import { NumberInput, NumberInputControl, NumberInputGroup } from "@ui-sdk/react/number-input";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@ui-sdk/react/collapsible";
import { DIAGRAM_NODE_KINDS, DIAGRAM_EDGE_KINDS, type DiagramNode, type DiagramNodeKind, type DiagramEdgeKind } from "../developer/types";
import type { ModelDocument, ModelDocumentHandle } from "../modeling/types";
import { ValidationBadge } from "../validation";
import { ModelChoice, modelKindLabel } from "./controls";
import type { DiagramProfile } from "./profiles";

export interface ModelInspectorProps {
  document: ModelDocument;
  api: ModelDocumentHandle;
  profile?: DiagramProfile;
  nodeKinds?: readonly DiagramNodeKind[];
  edgeKinds?: readonly DiagramEdgeKind[];
  disabled?: boolean;
  readOnly?: boolean;
}

export function ModelInspector({ document, api, profile, nodeKinds = DIAGRAM_NODE_KINDS, edgeKinds = DIAGRAM_EDGE_KINDS, disabled, readOnly }: ModelInspectorProps) {
  const { model, revision } = document;
  const selected = model.nodes.find(node => node.id === document.selectedId);
  const [name, setName] = useState(selected?.name ?? "");
  const [geometry, setGeometry] = useState<Record<"x" | "y" | "width" | "height", number | null>>({ x: selected?.x ?? 0, y: selected?.y ?? 0, width: selected?.width ?? 180, height: selected?.height ?? 100 });
  const [description, setDescription] = useState(selected?.description ?? "");
  const [stereotype, setStereotype] = useState(selected?.stereotype ?? "");
  const [technology, setTechnology] = useState(selected?.architecture?.technology ?? "");
  const [draftRevision, setDraftRevision] = useState(revision);
  const [dirty, setDirty] = useState(false);
  const [kind, setKind] = useState<DiagramNodeKind>(nodeKinds[0] ?? "class");
  const [newName, setNewName] = useState("New element");
  const [newStereotype, setNewStereotype] = useState("");
  const [newTechnology, setNewTechnology] = useState("");
  const [newParent, setNewParent] = useState("none");
  const [newOwner, setNewOwner] = useState("");
  const [edgeTechnology, setEdgeTechnology] = useState("");
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [edgeKind, setEdgeKind] = useState<DiagramEdgeKind>(edgeKinds[0] ?? "association");
  const [edgeLabel, setEdgeLabel] = useState("");
  useEffect(() => {
    setDirty(false);
    setDraftRevision(revision);
    setName(selected?.name ?? "");
    setDescription(selected?.description ?? "");
    setStereotype(selected?.stereotype ?? "");
    setTechnology(selected?.architecture?.technology ?? "");
    if (selected) setGeometry({ x: selected.x, y: selected.y, width: selected.width, height: selected.height });
  }, [model.id, selected?.id]);
  useEffect(() => {
    if (dirty) return;
    setDraftRevision(revision);
    setName(selected?.name ?? "");
    setDescription(selected?.description ?? "");
    setStereotype(selected?.stereotype ?? "");
    setTechnology(selected?.architecture?.technology ?? "");
    if (selected) setGeometry({ x: selected.x, y: selected.y, width: selected.width, height: selected.height });
  }, [selected, revision, dirty]);
  const locked = disabled || readOnly;
  const currentKind = nodeKinds.includes(kind) ? kind : nodeKinds[0];
  const stereotypeOptions = currentKind ? profile?.stereotypes?.[currentKind] ?? [] : [];
  const currentStereotype = stereotypeOptions.includes(newStereotype) ? newStereotype : stereotypeOptions[0];
  const currentEdgeKind = edgeKinds.includes(edgeKind) ? edgeKind : edgeKinds[0];
  const nodeOptions = model.nodes.map(node => ({ value: node.id, label: node.name }));
  const currentSource = nodeOptions.some(item => item.value === source) ? source : nodeOptions[0]?.value ?? "";
  const currentTarget = nodeOptions.some(item => item.value === target) ? target : nodeOptions[1]?.value ?? nodeOptions[0]?.value ?? "";
  const currentParent = nodeOptions.some(item => item.value === newParent) ? newParent : "none";
  const ownerOptions = model.nodes.filter(node => profile?.family !== "uwe" || node.kind === "activity").map(node => ({ value: node.id, label: node.name }));
  const currentOwner = ownerOptions.some(item => item.value === newOwner) ? newOwner : ownerOptions[0]?.value;
  return <section className="standards-editor" data-liquid-glass="" data-liquid-kind="panel" aria-label="Edit diagram">
    <div className="standards-editor-heading"><div><p className="standards-eyebrow">Inspector</p><h2>Edit the model</h2></div><ValidationBadge /></div>
    {selected ? <>
      <p className="standards-selected-summary"><strong>{selected.name}</strong><span>{selected.architecture?.type ?? (selected.stereotype ? `«${selected.stereotype}»` : modelKindLabel(selected.kind))}{selected.architecture?.external ? " · External" : ""}</span></p>
      <p className="standards-selected-description">{selected.description}</p>
      {selected.architecture?.technology && <p className="standards-selected-technology">Technology: {selected.architecture.technology}</p>}
      <form onSubmit={event => {
        event.preventDefault();
        const result = api.applyTransaction({ expectedRevision: draftRevision, label: `Applied label: ${name.trim()}. Relationships keep the same element IDs.`, operations: [{ type: "rename-node", nodeId: selected.id, name: name.trim() }] }, { event: event.nativeEvent });
        if (result.ok) setDirty(false);
      }} noValidate>
        <Field><FieldLabel>Element label</FieldLabel><Input value={name} onValueChange={value => { setName(value); setDirty(true); }} maxLength={80} disabled={disabled} readOnly={readOnly} /><FieldDescription>Stable ID: {selected.id}</FieldDescription></Field>
        <Button type="submit" disabled={locked}>Apply element label</Button>
        <div className="standards-geometry">{(["x", "y", "width", "height"] as const).map(key => <Field key={key}>
          <FieldLabel>Element {key}</FieldLabel><NumberInput value={geometry[key]} min={key === "width" || key === "height" ? 8 : 0} max={20000}
            disabled={disabled} readOnly={readOnly} onValueChange={value => { setGeometry(current => ({ ...current, [key]: value })); setDirty(true); }}>
            <NumberInputGroup><NumberInputControl /></NumberInputGroup>
          </NumberInput>
        </Field>)}</div>
        <Collapsible className="standards-element-properties" aria-label="Element properties"><CollapsibleTrigger>Element properties</CollapsibleTrigger><CollapsiblePanel keepMounted>
          <Field><FieldLabel>Element description</FieldLabel><Textarea value={description} onValueChange={value => { setDescription(value); setDirty(true); }} disabled={disabled} readOnly={readOnly} rows={3} /></Field>
          <Field><FieldLabel>Element stereotype</FieldLabel><Input value={stereotype} onValueChange={value => { setStereotype(value); setDirty(true); }} disabled={disabled} readOnly={readOnly} /></Field>
          {selected.architecture && <Field><FieldLabel>Element technology</FieldLabel><Input value={technology} onValueChange={value => { setTechnology(value); setDirty(true); }} disabled={disabled} readOnly={readOnly} /></Field>}
          <Button disabled={locked} onClick={event => {
            const result = api.applyTransaction({ expectedRevision: draftRevision, label: `Updated ${selected.name} properties.`, operations: [{ type: "update-node", nodeId: selected.id, patch: { description: description.trim(), stereotype: stereotype.trim() || null, ...(selected.architecture ? { architecture: { ...selected.architecture, technology: technology.trim() || undefined } } : {}) } }] }, { event: event.nativeEvent });
            if (result.ok) setDirty(false);
          }}>Apply element properties</Button>
        </CollapsiblePanel></Collapsible>
        {dirty && draftRevision !== revision && <div className="standards-stale-draft" role="status">
          <p>The model changed after this edit began. Reload its current values before applying.</p>
          <Button type="button" onClick={() => setDirty(false)}>Reload element values</Button>
        </div>}
        <div className="standards-editor-actions">
          <Button type="button" disabled={locked} onClick={event => { const result = api.applyTransaction({ expectedRevision: draftRevision, label: `Updated ${selected.id}.`, operations: [{ type: "update-node", nodeId: selected.id, patch: { name: name.trim(), x: geometry.x ?? Number.NaN, y: geometry.y ?? Number.NaN, width: geometry.width ?? Number.NaN, height: geometry.height ?? Number.NaN } }] }, { event: event.nativeEvent }); if (result.ok) setDirty(false); }}>Apply element geometry</Button>
          <Button type="button" disabled={locked} data-variant="destructive" onClick={event => api.applyTransaction({ expectedRevision: revision, label: `Removed ${selected.name} and its dependent relationships. Undo is available.`, operations: [{ type: "remove-node", nodeId: selected.id }] }, { event: event.nativeEvent })}>Delete selected element</Button>
        </div>
      </form>
    </> : <p className="standards-empty-selection">Select an element on the canvas or add one below.</p>}
    <Collapsible className="standards-disclosure" aria-label="Add elements and relationships"><CollapsibleTrigger>Add elements and relationships</CollapsibleTrigger><CollapsiblePanel keepMounted>
      <div className="standards-add-row">
        <ModelChoice label="New element kind" value={currentKind ?? null} onChange={value => setKind(value as DiagramNodeKind)} disabled={locked || !nodeKinds.length}
          items={nodeKinds.map(value => ({ value, label: modelKindLabel(value) }))} />
        <Field><FieldLabel>New element label</FieldLabel><Input value={newName} onValueChange={setNewName} maxLength={80} disabled={disabled} readOnly={readOnly} /></Field>
        {stereotypeOptions.length > 0 && <ModelChoice label="New element stereotype" value={currentStereotype ?? null} onChange={setNewStereotype} disabled={locked} items={stereotypeOptions.map(value => ({ value, label: `«${value}»` }))} />}
        <ModelChoice label="New element parent" value={currentParent} onChange={setNewParent} disabled={locked} items={[{ value: "none", label: "No container" }, ...nodeOptions]} />
        {currentKind === "port" && <ModelChoice label="New element owner" value={currentOwner ?? null} onChange={setNewOwner} disabled={locked || !ownerOptions.length} items={ownerOptions} placeholder="Create an owning action first" />}
        {currentKind?.startsWith("c4") && <Field><FieldLabel>New element technology</FieldLabel><Input value={newTechnology} onValueChange={setNewTechnology} disabled={disabled} readOnly={readOnly} placeholder="Technology or execution environment" /></Field>}
        <Button disabled={locked || !currentKind} onClick={event => {
          if (!currentKind) return;
          const id = `element-${crypto.randomUUID().slice(0, 8)}`;
          const small = ["initial", "final", "startEvent", "endEvent", "ifmlEvent", "eventListener"].includes(currentKind);
          const diamond = ["decision", "merge", "gateway", "criterion"].includes(currentKind);
          const parent = model.nodes.find(candidate => candidate.id === currentParent);
          const owner = currentKind === "port" ? model.nodes.find(candidate => candidate.id === currentOwner) : undefined;
          const c4Type = currentKind === "c4Person" ? "Person" : currentKind === "c4Deployment" ? "Deployment Node" : currentKind === "c4Boundary" ? (profile?.id === "c4-component" ? "Container" : "Software System") : profile?.id === "c4-deployment" ? "Container Instance" : profile?.id === "c4-component" ? "Component" : ["c4-container", "c4-dynamic"].includes(profile?.id ?? "") ? "Container" : "Software System";
          const node: DiagramNode = { id, name: newName.trim(), description: "Custom element. Review its semantics against the selected specification.", kind: currentKind, x: owner ? owner.x + owner.width - 20 : parent ? parent.x + 24 : 36, y: owner ? owner.y + Math.min(owner.height - 20, 60) : parent ? parent.y + 70 : 36,
            ...(parent ? { parentId: parent.id } : {}),
            ...(owner ? { ownerId: owner.id } : {}),
            ...(currentStereotype ? { stereotype: currentStereotype } : {}),
            ...(currentKind.startsWith("c4") ? { architecture: { type: c4Type, ...(newTechnology.trim() ? { technology: newTechnology.trim() } : {}) } } : {}),
            width: currentKind === "table" ? 600 : small ? 36 : diamond ? 60 : currentKind === "port" ? 20 : 200,
            height: currentKind === "table" ? 260 : small ? 36 : diamond ? 60 : currentKind === "port" ? 20 : currentKind === "fork" ? 12 : currentKind === "lifeline" ? 400 : 120,
            ...(currentKind === "table" ? { table: { columns: ["Item", "Description"], rows: [["1", "Edit this table through Model data."]] } } : {}),
          };
          api.applyTransaction({ expectedRevision: revision, label: `Added ${id}.`, selectedId: id, operations: [{ type: "add-node", node }] }, { event: event.nativeEvent });
        }}>Add diagram element</Button>
      </div>
      <div className="standards-add-row">
        <ModelChoice label="Relationship source" value={currentSource || null} onChange={setSource} items={nodeOptions} disabled={locked || !nodeOptions.length} />
        <ModelChoice label="Relationship target" value={currentTarget || null} onChange={setTarget} items={nodeOptions} disabled={locked || !nodeOptions.length} />
        <ModelChoice label="Relationship kind" value={currentEdgeKind ?? null} onChange={value => setEdgeKind(value as DiagramEdgeKind)} disabled={locked || !edgeKinds.length}
          items={edgeKinds.map(value => ({ value, label: modelKindLabel(value) }))} />
        <Field><FieldLabel>Relationship label</FieldLabel><Input value={edgeLabel} onValueChange={setEdgeLabel} maxLength={160} disabled={disabled} readOnly={readOnly} /></Field>
        {profile?.family === "c4" && <Field><FieldLabel>Relationship technology</FieldLabel><Input value={edgeTechnology} onValueChange={setEdgeTechnology} disabled={disabled} readOnly={readOnly} placeholder="HTTPS, SQL, events…" /></Field>}
        <Button disabled={locked || !model.nodes.length || !currentEdgeKind} onClick={event => {
          if (!currentEdgeKind) return;
          const id = `relationship-${crypto.randomUUID().slice(0, 8)}`;
          api.applyTransaction({ expectedRevision: revision, label: `Added ${id}.`, operations: [{ type: "add-edge", edge: { id, source: currentSource, target: currentTarget, kind: currentEdgeKind, label: edgeLabel, ...(edgeTechnology.trim() ? { technology: edgeTechnology.trim() } : {}), ...(profile?.id === "c4-dynamic" ? { order: model.edges.filter(edge => edge.kind === "c4Relationship").length + 1 } : {}), description: edgeLabel || modelKindLabel(currentEdgeKind) } }] }, { event: event.nativeEvent });
        }}>Add diagram relationship</Button>
      </div>
      <p>Shapes and relationships follow this model’s profile. Structural checks protect the document; they do not certify complete standards conformance.</p>
    </CollapsiblePanel></Collapsible>
  </section>;
}
