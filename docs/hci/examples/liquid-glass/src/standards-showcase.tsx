import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Button } from "@ui-sdk/react/button";
import { Field, FieldDescription, FieldLabel } from "@ui-sdk/react/field";
import { Input } from "@ui-sdk/react/input";
import { Textarea } from "@ui-sdk/react/textarea";
import { NumberInput, NumberInputControl, NumberInputGroup } from "@ui-sdk/react/number-input";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@ui-sdk/react/collapsible";
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@ui-sdk/react/select";
import { Dialog, DialogBackdrop, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@ui-sdk/react/dialog";
import { LiquidDiagram, diagramToSvg, validateDiagramModel, DIAGRAM_NODE_KINDS, DIAGRAM_EDGE_KINDS,
  catalogueCounts, coverageLabels, findStandards, standardCategories, omgCatalogueSource,
  type DiagramModel, type DiagramNode, type DiagramNodeKind, type DiagramEdgeKind,
  type StandardCategory, type StandardCoverage } from "@quantitative-hci/liquid-glass/standards";
import { ValidationBadge } from "@quantitative-hci/liquid-glass/validation";
import "@quantitative-hci/liquid-glass/standards.css";
import "./standards-showcase.css";

const words = (value: string) => value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, letter => letter.toUpperCase());

function Choice({ label, value, items, onChange }: { label: string; value: string; items: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return <Select value={value} items={items} onValueChange={next => { if (typeof next === "string") onChange(next); }}>
    <SelectLabel>{label}</SelectLabel><SelectTrigger><SelectValue /></SelectTrigger>
    <SelectContent>{items.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
  </Select>;
}

function StandardsCatalogue({ models, onChoose }: { models: DiagramModel[]; onChoose: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [coverage, setCoverage] = useState("all");
  const entries = useMemo(() => findStandards({ query: search,
    category: category === "all" ? undefined : category as StandardCategory,
    coverage: coverage === "all" ? undefined : coverage as StandardCoverage,
  }), [search, category, coverage]);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger>Browse all standards</DialogTrigger><DialogBackdrop />
    <DialogContent className="standards-catalogue" initialFocus="content">
      <header className="standards-catalogue-heading"><div><DialogTitle>Standards catalogue</DialogTitle>
        <DialogDescription>Every entry in OMG’s current full catalogue, with coverage pinned to its exact version. Historical SysML 1.7 and LMU UWE are included separately.</DialogDescription></div>
        <DialogClose aria-label="Close standards catalogue">Close</DialogClose></header>
      <div className="standards-catalogue-filters">
        <Field><FieldLabel>Search standards</FieldLabel><Input value={search} onValueChange={setSearch} placeholder="BPMN, architecture, finance…" /></Field>
        <Choice label="Standard category" value={category} onChange={setCategory} items={[{ value: "all", label: "All categories" }, ...standardCategories.map(item => ({ value: item.id, label: item.label }))]} />
        <Choice label="Standard coverage" value={coverage} onChange={setCoverage} items={[{ value: "all", label: "All coverage" }, ...Object.entries(coverageLabels).map(([value, label]) => ({ value, label }))]} />
      </div>
      <p className="standards-catalogue-count" aria-live="polite">{entries.length} of {catalogueCounts.totalEntries} entries · {catalogueCounts.views} editable views · {catalogueCounts.referenceOnly} reference-only entries</p>
      <div className="standards-catalogue-scroll">
        {entries.map(entry => <article key={entry.id} className="standards-catalogue-card" data-standard-id={entry.id} data-standard-coverage={entry.coverage}>
          <div className="standards-entry-heading"><strong>{entry.displayAcronym} <span>{entry.version}</span></strong><span className="standards-coverage" data-coverage={entry.coverage}>{coverageLabels[entry.coverage]}</span></div>
          <h3>{entry.title}</h3><p>{entry.coverageDescription}</p>
          <div className="standards-entry-meta"><span>{entry.authority} · {entry.status} · {entry.publicationDate || "Research profile"}</span><a href={entry.sourceUrl} target="_blank" rel="noreferrer">Read specification</a></div>
          {entry.viewIds.length > 0 && <div className="standards-entry-actions">{entry.viewIds.map(id => {
            const view = models.find(model => model.id === id);
            return view ? <Button key={id} onClick={() => { onChoose(id); setOpen(false); }}>Open {view.notation}</Button> : null;
          })}</div>}
        </article>)}
        {!entries.length && <p className="standards-empty">No standards match these filters.</p>}
      </div>
      <footer><Collapsible className="standards-catalogue-data"><CollapsibleTrigger>Catalogue data</CollapsibleTrigger><CollapsiblePanel><Field><FieldLabel>Matching standards JSON</FieldLabel><Textarea readOnly value={JSON.stringify(entries)} rows={4} spellCheck={false} /></Field></CollapsiblePanel></Collapsible>
        <a href={omgCatalogueSource.url} target="_blank" rel="noreferrer">Official OMG catalogue</a> · Snapshot {omgCatalogueSource.retrievedOn}. Reference entries have source metadata, not an implemented renderer or runtime.</footer>
    </DialogContent>
  </Dialog>;
}

function ElementEditor({ model, selected, onCommit, onSelect, error }: {
  model: DiagramModel; selected?: DiagramNode; onCommit: (next: DiagramModel, reason: string) => boolean; onSelect: (id: string) => void; error: string;
}) {
  const [name, setName] = useState(selected?.name ?? "");
  const [geometry, setGeometry] = useState<Record<"x" | "y" | "width" | "height", number | null>>({ x: selected?.x ?? 0, y: selected?.y ?? 0, width: selected?.width ?? 180, height: selected?.height ?? 100 });
  const [kind, setKind] = useState<DiagramNodeKind>("class");
  const [newName, setNewName] = useState("New element");
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [edgeKind, setEdgeKind] = useState<DiagramEdgeKind>("association");
  const [edgeLabel, setEdgeLabel] = useState("");
  useEffect(() => {
    setName(selected?.name ?? "");
    if (selected) setGeometry({ x: selected.x, y: selected.y, width: selected.width, height: selected.height });
  }, [selected]);
  const descendants = (id: string) => {
    const ids = new Set([id]);
    for (let i = 0; i < model.nodes.length; i++) for (const node of model.nodes) if ((node.parentId && ids.has(node.parentId)) || (node.ownerId && ids.has(node.ownerId))) ids.add(node.id);
    return ids;
  };
  const patch = (labelOnly = false) => {
    if (!selected) return;
    const ids = descendants(selected.id);
    const nextGeometry = labelOnly ? selected : { x: geometry.x ?? Number.NaN, y: geometry.y ?? Number.NaN, width: geometry.width ?? Number.NaN, height: geometry.height ?? Number.NaN };
    const dx = nextGeometry.x - selected.x, dy = nextGeometry.y - selected.y;
    onCommit({ ...model, nodes: model.nodes.map(node => node.id === selected.id ? { ...node, ...(labelOnly ? {} : nextGeometry), name: name.trim() }
      : ids.has(node.id) ? { ...node, x: node.x + dx, y: node.y + dy } : node),
      edges: model.edges.map(edge => ids.has(edge.source) && ids.has(edge.target) ? { ...edge,
        ...(edge.waypoints ? { waypoints: edge.waypoints.map(point => ({ x: point.x + dx, y: point.y + dy })) } : {}),
        ...(edge.labelPosition ? { labelPosition: { x: edge.labelPosition.x + dx, y: edge.labelPosition.y + dy } } : {}),
        ...(edge.sourcePoint ? { sourcePoint: { x: edge.sourcePoint.x + dx, y: edge.sourcePoint.y + dy } } : {}),
        ...(edge.targetPoint ? { targetPoint: { x: edge.targetPoint.x + dx, y: edge.targetPoint.y + dy } } : {}),
      } : { ...edge,
        ...(edge.sourcePoint && ids.has(edge.source) ? { sourcePoint: { x: edge.sourcePoint.x + dx, y: edge.sourcePoint.y + dy } } : {}),
        ...(edge.targetPoint && ids.has(edge.target) ? { targetPoint: { x: edge.targetPoint.x + dx, y: edge.targetPoint.y + dy } } : {}),
      }),
    }, labelOnly ? `Applied label: ${name.trim()}. Relationships keep the same element IDs.` : `Updated ${selected.id}.`);
  };
  const nodeOptions = model.nodes.map(node => ({ value: node.id, label: node.name }));
  const currentSource = nodeOptions.some(item => item.value === source) ? source : nodeOptions[0]?.value ?? "";
  const currentTarget = nodeOptions.some(item => item.value === target) ? target : nodeOptions[1]?.value ?? nodeOptions[0]?.value ?? "";
  return <section className="standards-editor" data-liquid-glass="" data-liquid-kind="panel" aria-label="Edit diagram">
    <div className="standards-editor-heading"><h2>Edit the model</h2><ValidationBadge /></div>
    {selected && <form onSubmit={event => { event.preventDefault(); patch(true); }} noValidate>
      <div className="standards-label-row"><Field invalid={Boolean(error)}><FieldLabel>Element label</FieldLabel><Input value={name} onValueChange={setName} maxLength={80} /><FieldDescription>Stable ID: {selected.id}</FieldDescription></Field><Button type="submit">Apply element label</Button></div>
      <div className="standards-geometry">{(["x", "y", "width", "height"] as const).map(key => <Field key={key}>
        <FieldLabel>Element {key}</FieldLabel><NumberInput value={geometry[key]} min={key === "width" || key === "height" ? 8 : 0} max={20000} onValueChange={value => setGeometry(current => ({ ...current, [key]: value }))}><NumberInputGroup><NumberInputControl /></NumberInputGroup></NumberInput>
      </Field>)}</div>
      <div className="standards-editor-actions"><Button type="button" onClick={() => patch()}>Apply element geometry</Button><Button type="button" data-variant="destructive" onClick={() => {
        const ids = descendants(selected.id);
        const nodes = model.nodes.filter(node => !ids.has(node.id));
        if (onCommit({ ...model, nodes, edges: model.edges.filter(edge => !ids.has(edge.source) && !ids.has(edge.target)) }, `Removed ${ids.size} element(s) and their relationships. Undo is available.`)) onSelect(nodes[0]?.id ?? "");
      }}>Delete selected element</Button></div>
    </form>}
    <Collapsible className="standards-disclosure"><CollapsibleTrigger>Add elements and relationships</CollapsibleTrigger><CollapsiblePanel>
      <div className="standards-add-row"><Choice label="New element kind" value={kind} onChange={value => setKind(value as DiagramNodeKind)} items={DIAGRAM_NODE_KINDS.map(value => ({ value, label: words(value) }))} />
        <Field><FieldLabel>New element label</FieldLabel><Input value={newName} onValueChange={setNewName} maxLength={80} /></Field>
        <Button onClick={() => {
          const id = `element-${crypto.randomUUID().slice(0, 8)}`;
          const small = ["initial", "final", "startEvent", "endEvent", "ifmlEvent", "eventListener"].includes(kind);
          const diamond = ["decision", "merge", "gateway", "criterion"].includes(kind);
          const added: DiagramNode = { id, name: newName.trim(), description: "Custom element. Review its semantics against the selected specification.", kind, x: 36, y: 36,
            width: kind === "table" ? 600 : small ? 36 : diamond ? 60 : kind === "port" ? 20 : 200,
            height: kind === "table" ? 260 : small ? 36 : diamond ? 60 : kind === "port" ? 20 : kind === "fork" ? 12 : kind === "lifeline" ? 400 : 120,
            ...(kind === "table" ? { table: { columns: ["Item", "Description"], rows: [["1", "Edit this table through Model data."]] } } : {}),
          };
          if (onCommit({ ...model, nodes: [...model.nodes, added] }, `Added ${id}.`)) onSelect(id);
        }}>Add diagram element</Button></div>
      <div className="standards-add-row"><Choice label="Relationship source" value={currentSource} onChange={setSource} items={nodeOptions} />
        <Choice label="Relationship target" value={currentTarget} onChange={setTarget} items={nodeOptions} />
        <Choice label="Relationship kind" value={edgeKind} onChange={value => setEdgeKind(value as DiagramEdgeKind)} items={DIAGRAM_EDGE_KINDS.map(value => ({ value, label: words(value) }))} />
        <Field><FieldLabel>Relationship label</FieldLabel><Input value={edgeLabel} onValueChange={setEdgeLabel} maxLength={160} /></Field>
        <Button disabled={!model.nodes.length} onClick={() => {
          const id = `relationship-${crypto.randomUUID().slice(0, 8)}`;
          onCommit({ ...model, edges: [...model.edges, { id, source: currentSource, target: currentTarget, kind: edgeKind, label: edgeLabel, description: "Custom relationship. Review its meaning against the selected specification." }] }, `Added ${id}.`);
        }}>Add diagram relationship</Button></div>
      <p>New elements use the chosen shape. Geometric validation checks IDs, containment and endpoints; it does not certify the model’s domain semantics. Use structured edits for compartments, table rules and connection routing.</p>
    </CollapsiblePanel></Collapsible>
    {error && <p className="standards-error" role="alert" data-developer-error="">{error}</p>}
  </section>;
}

export function StandardsShowcase({ models, onModelsChange }: { models: DiagramModel[]; onModelsChange: Dispatch<SetStateAction<DiagramModel[]>> }) {
  const [modelId, setModelId] = useState(models[0].id);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Record<string, { past: DiagramModel[]; future: DiagramModel[] }>>({});
  const [jsonDraft, setJsonDraft] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const model = models.find(item => item.id === modelId) ?? models[0];
  const selected = model.nodes.find(node => node.id === selection[model.id]) ?? model.nodes[0];
  const timeline = history[model.id] ?? { past: [], future: [] };
  const modelJson = JSON.stringify(model, null, 2);
  const choose = (id: string) => { setModelId(id); setError(""); setFeedback(""); setJsonDraft(""); };
  const commit = (next: DiagramModel, reason: string) => {
    const errors = validateDiagramModel(next);
    if (next.nodes.some(node => !node.name.trim() || node.name.length > 80 || /[\u0000-\u001f\u007f]/.test(node.name))) errors.push("Enter an element label of 1–80 characters without control characters.");
    if (new Set(next.nodes.map(node => node.name)).size !== next.nodes.length) errors.push("Use a distinct label within this model.");
    if (errors.length) { setError(errors.slice(0, 4).join(" ")); setFeedback(""); return false; }
    setHistory(current => ({ ...current, [model.id]: { past: [...(current[model.id]?.past ?? []), model].slice(-50), future: [] } }));
    onModelsChange(current => current.map(item => item.id === model.id ? next : item));
    setError(""); setFeedback(reason); return true;
  };
  const travel = (direction: "past" | "future") => {
    const from = timeline[direction];
    const next = from[from.length - 1];
    if (!next) return;
    const opposite = direction === "past" ? "future" : "past";
    setHistory(current => ({ ...current, [model.id]: { ...timeline, [direction]: from.slice(0, -1), [opposite]: [...timeline[opposite], model] } }));
    onModelsChange(current => current.map(item => item.id === model.id ? next : item));
    setError(""); setFeedback(direction === "past" ? "Diagram change undone." : "Diagram change redone.");
  };
  return <div className="standards-showcase" data-kit-view="standards" data-validation="unvalidated">
    <div className="standards-intro"><div><p className="standards-eyebrow">Business · systems · software</p><p>Models you can navigate, inspect and shape.</p></div><StandardsCatalogue models={models} onChoose={choose} /></div>
    <p className="standards-scope"><ValidationBadge /> {catalogueCounts.views} editable views · {catalogueCounts.officialEntries} OMG catalogue entries. Custom adapters await human UI/UX review.</p>
    <section className="standards-model-panel" data-liquid-glass="" data-liquid-kind="panel" aria-label="Standards models">
      <div className="standards-model-controls"><div className="standards-model-choice"><Choice label="Diagram model" value={model.id} onChange={choose} items={models.map(item => ({ value: item.id, label: item.name }))} /></div>
        <div className="standards-export-actions"><Button disabled={!timeline.past.length} onClick={() => travel("past")}>Undo diagram change</Button><Button disabled={!timeline.future.length} onClick={() => travel("future")}>Redo diagram change</Button>
          <Button onClick={async () => { try { await navigator.clipboard.writeText(modelJson); setFeedback("Diagram JSON copied from the current model."); } catch { setFeedback("Clipboard unavailable. Open Model data to copy the JSON."); } }}>Copy diagram JSON</Button>
          <Button onClick={() => { const url = URL.createObjectURL(new Blob([diagramToSvg(model)], { type: "image/svg+xml;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${model.id}.svg`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); setFeedback("Diagram SVG download prepared from the current model."); }}>Download diagram SVG</Button></div>
      </div>
      <LiquidDiagram model={model} selectedId={selected?.id} onSelectionChange={id => { setSelection(current => ({ ...current, [model.id]: id })); setError(""); }} />
    </section>
    <ElementEditor key={model.id} model={model} selected={selected} onCommit={commit} onSelect={id => setSelection(current => ({ ...current, [model.id]: id }))} error={error} />
    <output className="standards-feedback" data-developer-feedback="" aria-live="polite">{feedback}</output>
    <Collapsible className="standards-data-panel" aria-label="Model data"><CollapsibleTrigger>Model data and structured edits</CollapsibleTrigger><CollapsiblePanel>
      <Field><FieldLabel>Diagram JSON</FieldLabel><Textarea readOnly value={modelJson} rows={10} spellCheck={false} /><FieldDescription>Current model and stable element IDs. Application JSON; not XMI, BPMN XML or another standards interchange format.</FieldDescription></Field>
      <Field><FieldLabel>Import diagram JSON</FieldLabel><Textarea value={jsonDraft} onValueChange={setJsonDraft} rows={8} spellCheck={false} placeholder="Paste an edited model. The model ID must match the current example." /></Field>
      <div className="standards-editor-actions"><Button onClick={() => setJsonDraft(modelJson)}>Load current model into editor</Button><Button disabled={!jsonDraft.trim()} onClick={() => {
        try { if (jsonDraft.length > 1_000_000) throw new Error("Limit model JSON to 1 MB."); const candidate: unknown = JSON.parse(jsonDraft); const errors = validateDiagramModel(candidate); if (errors.length) throw new Error(errors.slice(0, 4).join(" ")); const next = candidate as DiagramModel; if (next.id !== model.id) throw new Error(`Keep model ID ${model.id} to edit this example.`); commit(next, "Applied structured model edits. Undo is available."); } catch (problem) { setError(problem instanceof Error ? problem.message : "Invalid diagram JSON."); setFeedback(""); }
      }}>Apply diagram JSON</Button></div>
      <p>Changes stay while you explore the kit. Reloading starts a fresh session. Export JSON to retain your work.</p><code>import {"{ LiquidDiagram, findStandards }"} from "@quantitative-hci/liquid-glass/standards";</code>
    </CollapsiblePanel></Collapsible>
  </div>;
}
