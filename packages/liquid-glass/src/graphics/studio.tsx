"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { Button } from "@ui-sdk/react/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@ui-sdk/react/collapsible";
import { Field, FieldDescription, FieldLabel } from "@ui-sdk/react/field";
import { FileInput, FileInputTrigger } from "@ui-sdk/react/file-input";
import { Input } from "@ui-sdk/react/input";
import { Listbox, ListboxItem, ListboxItemIndicator } from "@ui-sdk/react/listbox";
import { NumberInput, NumberInputControl, NumberInputGroup } from "@ui-sdk/react/number-input";
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@ui-sdk/react/select";
import { Switch, SwitchThumb } from "@ui-sdk/react/switch";
import { Textarea } from "@ui-sdk/react/textarea";
import { LiquidViewport, type LiquidViewportHandle } from "../developer/viewport";
import { ValidationBadge } from "../validation";
import { graphicToStandaloneSvg } from "./export";
import { createGraphicAgentContext, graphicLayerBounds, graphicTextLines, validateGraphicDocument } from "./model";
import type { GraphicAgentContext, GraphicAsset, GraphicChangeDetails, GraphicDocument, GraphicLayer, GraphicLayerKind, GraphicVariant } from "./types";

export interface LiquidGraphicStudioProps {
  model: GraphicDocument;
  assets: readonly GraphicAsset[];
  onModelChange: (model: GraphicDocument, details: GraphicChangeDetails) => void;
  onAssetsChange?: (assets: GraphicAsset[]) => void;
  onImageRequest?: (context: GraphicAgentContext) => void | Promise<void>;
  selectedId?: string;
  onSelectionChange?: (id: string) => void;
  className?: string;
}

type LayerDraft = {
  name: string; x: number | null; y: number | null; width: number | null; height: number | null;
  rotation: number | null; opacity: number | null; fill: string; text: string; fontSize: number | null;
  fontFamily: "sans-serif" | "serif" | "monospace"; fontWeight: 400 | 600 | 700;
  align: "left" | "center" | "right"; assetId: string; fit: "cover" | "contain";
  shape: "rectangle" | "ellipse"; radius: number | null;
};
const formats = [
  { value: "landscape", label: "Landscape · 3:2", width: 1200, height: 800 },
  { value: "square", label: "Square · 1:1", width: 1080, height: 1080 },
  { value: "portrait", label: "Portrait · 4:5", width: 1080, height: 1350 },
  { value: "story", label: "Story · 9:16", width: 1080, height: 1920 },
];
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const number = (value: number | null) => value === null ? Number.NaN : value;
const rounded = (value: number) => Math.round(value * 10) / 10;

function resizedLayer(layer: GraphicLayer, width: number, height: number): GraphicLayer {
  const radians = layer.rotation * Math.PI / 180;
  const dw = width - layer.width, dh = height - layer.height;
  return { ...layer, width: rounded(width), height: rounded(height), x: rounded(layer.x + (dw * Math.cos(radians) - dh * Math.sin(radians) - dw) / 2), y: rounded(layer.y + (dw * Math.sin(radians) + dh * Math.cos(radians) - dh) / 2) };
}

function layerDraft(layer: GraphicLayer | undefined): LayerDraft {
  return {
    name: layer?.name ?? "", x: layer?.x ?? 0, y: layer?.y ?? 0,
    width: layer?.width ?? 100, height: layer?.height ?? 100,
    rotation: layer?.rotation ?? 0, opacity: (layer?.opacity ?? 1) * 100,
    fill: layer && layer.kind !== "image" ? layer.fill : "#163348",
    text: layer?.kind === "text" ? layer.text : "",
    fontSize: layer?.kind === "text" ? layer.fontSize : 48,
    fontFamily: layer?.kind === "text" ? layer.fontFamily : "sans-serif",
    fontWeight: layer?.kind === "text" ? layer.fontWeight : 600,
    align: layer?.kind === "text" ? layer.align : "left",
    assetId: layer?.kind === "image" ? layer.assetId : "",
    fit: layer?.kind === "image" ? layer.fit : "cover",
    shape: layer?.kind === "shape" ? layer.shape : "rectangle",
    radius: layer && layer.kind !== "text" ? layer.radius : 0,
  };
}

function Choice({ label, value, options, onChange, disabled = false }: {
  label: string; value: string; options: readonly { value: string; label: string }[];
  onChange: (value: string) => void; disabled?: boolean;
}) {
  return <Select value={value} items={[...options]} disabled={disabled} onValueChange={(next) => {
    if (typeof next === "string" && options.some((option) => option.value === next)) onChange(next);
  }}><SelectLabel>{label}</SelectLabel><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
    {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
  </SelectContent></Select>;
}

function Numeric({ label, value, min, max, onChange, disabled = false }: {
  label: string; value: number | null; min: number; max: number;
  onChange: (value: number | null) => void; disabled?: boolean;
}) {
  return <Field><FieldLabel>{label}</FieldLabel><NumberInput value={value} min={min} max={max} step={1} disabled={disabled} onValueChange={onChange}>
    <NumberInputGroup><NumberInputControl /></NumberInputGroup>
  </NumberInput></Field>;
}

function GraphicArtwork({ model, assets, namespace }: { model: GraphicDocument; assets: readonly GraphicAsset[]; namespace: string }) {
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
  return <svg width={model.width} height={model.height} viewBox={`0 0 ${model.width} ${model.height}`} className="qgs-artwork" aria-hidden="true" data-graphic-artwork="">
    <rect width={model.width} height={model.height} fill={model.background} />
    {model.layers.filter((layer) => layer.visible).map((layer) => {
      const clip = `${namespace}-${layer.id}`;
      return <g key={layer.id} opacity={layer.opacity} transform={`translate(${layer.x} ${layer.y}) rotate(${layer.rotation} ${layer.width / 2} ${layer.height / 2})`} data-graphic-art-layer={layer.id}>
        {layer.kind === "image" ? <>
          <defs><clipPath id={clip}><rect width={layer.width} height={layer.height} rx={layer.radius} /></clipPath></defs>
          <image width={layer.width} height={layer.height} href={assetMap.get(layer.assetId)?.src} preserveAspectRatio={`xMidYMid ${layer.fit === "cover" ? "slice" : "meet"}`} clipPath={`url(#${clip})`} />
        </> : layer.kind === "shape" ? layer.shape === "ellipse" ?
          <ellipse cx={layer.width / 2} cy={layer.height / 2} rx={layer.width / 2} ry={layer.height / 2} fill={layer.fill} /> :
          <rect width={layer.width} height={layer.height} rx={layer.radius} fill={layer.fill} /> : <>
            <defs><clipPath id={clip}><rect width={layer.width} height={layer.height} /></clipPath></defs>
            <text fontFamily={layer.fontFamily} fontSize={layer.fontSize} fontWeight={layer.fontWeight} fill={layer.fill} textAnchor={layer.align === "left" ? "start" : layer.align === "center" ? "middle" : "end"} clipPath={`url(#${clip})`}>
              {graphicTextLines(layer).map((line, index) => <tspan key={index} x={layer.align === "left" ? 0 : layer.align === "center" ? layer.width / 2 : layer.width} y={layer.fontSize + index * layer.fontSize * 1.18}>{line}</tspan>)}
            </text>
          </>}
      </g>;
    })}
  </svg>;
}

export function LiquidGraphicStudio({ model, assets, onModelChange, onAssetsChange, onImageRequest, selectedId, onSelectionChange, className = "" }: LiquidGraphicStudioProps) {
  const namespace = useId().replace(/[^a-zA-Z\d_-]/g, "");
  const [localSelection, setLocalSelection] = useState(model.layers.at(-1)?.id ?? "");
  const selected = model.layers.find((layer) => layer.id === (selectedId ?? localSelection)) ?? model.layers.at(-1);
  const [draft, setDraft] = useState<LayerDraft>(() => layerDraft(selected));
  const [undo, setUndo] = useState<GraphicDocument[]>([]);
  const [redo, setRedo] = useState<GraphicDocument[]>([]);
  const [variants, setVariants] = useState<GraphicVariant[]>([]);
  const [variantName, setVariantName] = useState("Direction 1");
  const [variantId, setVariantId] = useState("");
  const [newKind, setNewKind] = useState<GraphicLayerKind>("text");
  const [newAssetId, setNewAssetId] = useState(assets[0]?.id ?? "");
  const [brief, setBrief] = useState("Keep the image and headline editable. Try a calmer composition with more space around the title.");
  const [jsonDraft, setJsonDraft] = useState(() => JSON.stringify(model, null, 2));
  const [background, setBackground] = useState(model.background);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [importing, setImporting] = useState(false);
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<GraphicLayer | null>(null);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const viewport = useRef<LiquidViewportHandle>(null);
  const importBusy = useRef(false);
  const drag = useRef<{ pointer: number; x: number; y: number; screenX: number; screenY: number; layer: GraphicLayer; revision: number; kind: "move" | "resize"; next: GraphicLayer | null } | null>(null);
  const errors = useMemo(() => validateGraphicDocument(model, assets), [model, assets]);
  const currentModel = useRef(model);
  currentModel.current = model;
  const visibleModel = preview ? { ...model, layers: model.layers.map((layer) => layer.id === preview.id ? preview : layer) } : model;
  const format = formats.find((item) => item.width === model.width && item.height === model.height)?.value ?? "custom";

  useEffect(() => { setDraft(layerDraft(selected)); setError(""); }, [selected?.id, model.revision]);
  useEffect(() => { setBackground(model.background); }, [model.background]);
  useEffect(() => { setUndo([]); setRedo([]); setVariants([]); setVariantId(""); }, [model.id]);

  function choose(id: string) {
    if (!model.layers.some((layer) => layer.id === id)) return;
    setLocalSelection(id);
    onSelectionChange?.(id);
    setError("");
  }

  function commit(next: GraphicDocument, details: GraphicChangeDetails, availableAssets: readonly GraphicAsset[] = assets) {
    const current = currentModel.current;
    const problems = validateGraphicDocument(next, availableAssets);
    if (next.id !== current.id) problems.push("Keep the current composition ID.");
    if (!["undo", "redo", "variant", "artboard", "lock", "visibility"].includes(details.reason)) {
      for (const layer of current.layers.filter((item) => item.locked)) {
        if (JSON.stringify(next.layers.find((item) => item.id === layer.id)) !== JSON.stringify(layer)) problems.push(`Unlock ${layer.name} before editing it.`);
      }
    }
    if (problems.length) { setError(problems[0]); return false; }
    const updated = { ...next, revision: current.revision + 1 };
    if (details.reason !== "undo" && details.reason !== "redo") {
      setUndo((items) => [...items.slice(-39), structuredClone(current)]);
      setRedo([]);
    }
    currentModel.current = updated;
    onModelChange(updated, details);
    setError("");
    setFeedback(`${details.reason === "properties" ? "Applied layer changes" : "Updated composition"}. Revision ${updated.revision}.`);
    return true;
  }

  function updateLayer(layer: GraphicLayer, reason: GraphicChangeDetails["reason"]) {
    return commit({ ...currentModel.current, layers: currentModel.current.layers.map((item) => item.id === layer.id ? layer : item) }, { reason, layerId: layer.id });
  }

  function applyProperties() {
    if (!selected) return;
    const base = { ...selected, name: draft.name.trim(), x: number(draft.x), y: number(draft.y), width: number(draft.width), height: number(draft.height), rotation: number(draft.rotation), opacity: number(draft.opacity) / 100 };
    const updated: GraphicLayer = selected.kind === "image" ? { ...base, kind: "image", assetId: draft.assetId, fit: draft.fit, radius: number(draft.radius) } : selected.kind === "text" ? { ...base, kind: "text", text: draft.text, fontSize: number(draft.fontSize), fontFamily: draft.fontFamily, fontWeight: draft.fontWeight, fill: draft.fill, align: draft.align } : { ...base, kind: "shape", shape: draft.shape, fill: draft.fill, radius: number(draft.radius) };
    updateLayer(updated, "properties");
  }

  function patchDraft<K extends keyof LayerDraft>(key: K, value: LayerDraft[K]) { setDraft((current) => ({ ...current, [key]: value })); }

  function uniqueName(name: string) {
    let next = name.slice(0, 50), count = 2;
    const existing = new Set(model.layers.map((layer) => layer.name.toLocaleLowerCase()));
    while (existing.has(next.toLocaleLowerCase())) next = `${name.slice(0, 50)} ${count++}`;
    return next;
  }

  function freshId(prefix: string) {
    let count = 1;
    while (model.layers.some((layer) => layer.id === `${prefix}-${count}`)) count++;
    return `${prefix}-${count}`;
  }

  function addLayer() {
    const base = { id: freshId(newKind), name: uniqueName(newKind === "text" ? "New text" : newKind === "image" ? "New image" : "New shape"), x: model.width * 0.15, y: model.height * 0.2, width: model.width * 0.55, height: model.height * 0.3, rotation: 0, opacity: 1, visible: true, locked: false };
    const layer: GraphicLayer = newKind === "text" ? { ...base, kind: "text", text: "Make something worth seeing.", fontSize: 56, fontFamily: "sans-serif", fontWeight: 600, fill: "#163348", align: "left" } : newKind === "image" ? { ...base, kind: "image", assetId: newAssetId, fit: "cover", radius: 24 } : { ...base, kind: "shape", shape: "rectangle", fill: "#d9f0e8", radius: 24 };
    if (commit({ ...model, layers: [...model.layers, layer] }, { reason: "add", layerId: layer.id })) { setLocalSelection(layer.id); onSelectionChange?.(layer.id); }
  }

  function duplicateLayer() {
    if (!selected) return;
    const layer = { ...structuredClone(selected), id: freshId(selected.kind), name: uniqueName(`${selected.name} copy`), x: selected.x + 24, y: selected.y + 24, locked: false };
    if (commit({ ...model, layers: [...model.layers, layer] }, { reason: "duplicate", layerId: selected.id })) { setLocalSelection(layer.id); onSelectionChange?.(layer.id); }
  }

  function deleteLayer() {
    if (!selected || model.layers.length <= 1) return;
    const remaining = model.layers.filter((layer) => layer.id !== selected.id);
    if (commit({ ...model, layers: remaining }, { reason: "delete", layerId: selected.id })) choose(remaining.at(-1)!.id);
  }

  function reorder(offset: number) {
    if (!selected) return;
    const index = model.layers.findIndex((layer) => layer.id === selected.id);
    const destination = clamp(index + offset, 0, model.layers.length - 1);
    if (index === destination) return;
    const next = [...model.layers];
    next.splice(index, 1);
    next.splice(destination, 0, selected);
    commit({ ...model, layers: next }, { reason: "reorder", layerId: selected.id });
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>, layer: GraphicLayer, kind: "move" | "resize") {
    if (event.button !== 0 || layer.locked) return;
    const point = viewport.current?.toCanvas(event.clientX, event.clientY);
    if (!point) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    choose(layer.id);
    drag.current = { pointer: event.pointerId, ...point, screenX: event.clientX, screenY: event.clientY, layer, revision: model.revision, kind, next: null };
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.pointer !== event.pointerId) return;
    const point = viewport.current?.toCanvas(event.clientX, event.clientY);
    if (!point) return;
    const dx = point.x - active.x;
    const dy = point.y - active.y;
    if (!active.next && Math.hypot(event.clientX - active.screenX, event.clientY - active.screenY) < 4) return;
    event.preventDefault();
    event.stopPropagation();
    const radians = active.layer.rotation * Math.PI / 180;
    const next = active.kind === "move" ? { ...active.layer, x: rounded(clamp(active.layer.x + dx, -10000, 10000)), y: rounded(clamp(active.layer.y + dy, -10000, 10000)) } : resizedLayer(active.layer, clamp(active.layer.width + dx * Math.cos(radians) + dy * Math.sin(radians), 1, 8192), clamp(active.layer.height - dx * Math.sin(radians) + dy * Math.cos(radians), 1, 8192));
    active.next = next;
    setPreview(next);
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>, cancel = false) {
    const active = drag.current;
    if (!active || active.pointer !== event.pointerId) return;
    drag.current = null;
    setPreview(null);
    if (!cancel && active.next) {
      if (active.revision !== currentModel.current.revision) setError("The composition changed during this gesture. Try the move again.");
      else updateLayer(active.next, active.kind);
    }
  }

  async function copy(value: unknown, message: string) {
    try { await navigator.clipboard.writeText(JSON.stringify(value, null, 2)); setFeedback(message); setError(""); }
    catch { setError("Clipboard access is unavailable. Use the structured edit panel to select and copy the composition JSON."); }
  }

  async function exportSvg() {
    try {
      const svg = await graphicToStandaloneSvg(model, assets);
      const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `${model.id}.svg`; document.body.append(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setFeedback("SVG downloaded with embedded images and editable text."); setError("");
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Could not export this composition."); }
  }

  async function importImage(file: File) {
    if (!onAssetsChange || importBusy.current) return;
    if (assets.length >= 24) { setError("This session can contain up to 24 image assets."); return; }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5_000_000 || file.size < 1) { setError("Choose a PNG, JPEG or WebP image up to 5 MB."); return; }
    importBusy.current = true;
    setImporting(true);
    try {
      const bitmap = await createImageBitmap(file);
      const { width, height } = bitmap; bitmap.close();
      if (width > 8192 || height > 8192 || width < 1 || height < 1) throw new Error("Choose an image no larger than 8192 pixels in either dimension.");
      const src = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Could not read this image.")); reader.readAsDataURL(file); });
      const id = `import-${crypto.randomUUID()}`;
      const asset: GraphicAsset = { id, name: file.name.slice(0, 100), src, alt: `Imported image: ${file.name.slice(0, 100)}`, width, height, provenance: "Imported by the user in this session." };
      const nextAssets = [...assets, asset];
      onAssetsChange(nextAssets);
      setNewAssetId(id);
      const target = currentModel.current.layers.find((layer) => layer.id === selected?.id);
      if (target?.kind === "image" && !target.locked) {
        commit({ ...currentModel.current, layers: currentModel.current.layers.map((layer) => layer.id === target.id ? { ...target, assetId: id } : layer) }, { reason: "image-import", layerId: target.id }, nextAssets);
        setFeedback(`Imported ${asset.name} into ${target.name}.`);
      } else setFeedback(`Imported ${asset.name}. Choose Image and add a layer to use it.`);
      setError("");
    } catch (issue) { setError(issue instanceof Error ? issue.message : "Could not import this image."); }
    finally { importBusy.current = false; setImporting(false); setImportFiles([]); }
  }

  async function copyAgentContext(operation: "compose" | "edit-image") {
    if (!brief.trim() || brief.length > 2000) { setError("Use an image brief of 1–2,000 characters."); return; }
    if (operation === "edit-image" && selected?.kind !== "image") { setError("Select an image layer for an image edit request."); return; }
    return copy(createGraphicAgentContext(model, assets, selected?.id ?? null, brief, operation), operation === "edit-image" ? "Selected-image edit request copied for your connected image tool." : "Composition context and selected-layer brief copied.");
  }

  async function sendImageRequest() {
    if (!onImageRequest || selected?.kind !== "image") { setError("Select an image layer and connect an image-request handler."); return; }
    if (!brief.trim() || brief.length > 2000) { setError("Use an image brief of 1–2,000 characters."); return; }
    const context = createGraphicAgentContext(model, assets, selected.id, brief, "edit-image");
    try {
      await onImageRequest(context);
      setFeedback(`Image request from revision ${context.baseRevision} handed to the connected tool. Import its result when ready.`);
      setError("");
    } catch (issue) { setError(issue instanceof Error ? `Image request failed: ${issue.message}` : "Could not hand the image request to the connected tool."); }
  }

  if (errors.length || !selected) return <section className={`qg-graphic-studio ${className}`} data-validation="unvalidated"><ValidationBadge /><p role="alert">{errors[0] ?? "Add a layer to this composition."}</p></section>;
  const selectedIndex = model.layers.findIndex((layer) => layer.id === selected.id);
  const selection = preview?.id === selected.id ? preview : selected;
  const canEdit = !selected.locked;
  const assetOptions = assets.map((asset) => ({ value: asset.id, label: asset.name }));
  const handleSize = 32 / canvasZoom;
  const radians = selection.rotation * Math.PI / 180;
  const handleX = selection.x + selection.width / 2 + (selection.width * Math.cos(radians) - selection.height * Math.sin(radians)) / 2;
  const handleY = selection.y + selection.height / 2 + (selection.width * Math.sin(radians) + selection.height * Math.cos(radians)) / 2;

  return <section className={`qg-graphic-studio ${className}`} data-graphic-studio={model.id} data-graphic-revision={model.revision} data-validation="unvalidated" aria-label="Graphic composition studio">
    <header className="qgs-header">
      <div className="qgs-heading"><h2>{model.name}</h2><ValidationBadge /></div>
      <div className="qgs-history">
        <Button aria-label="Undo graphic change" disabled={!undo.length} onClick={() => {
          const previous = undo.at(-1); if (!previous) return;
          if (commit(previous, { reason: "undo" })) { setUndo((items) => items.slice(0, -1)); setRedo((items) => [...items.slice(-39), structuredClone(model)]); }
        }}>Undo</Button>
        <Button aria-label="Redo graphic change" disabled={!redo.length} onClick={() => {
          const next = redo.at(-1); if (!next) return;
          if (commit(next, { reason: "redo" })) { setRedo((items) => items.slice(0, -1)); setUndo((items) => [...items.slice(-39), structuredClone(model)]); }
        }}>Redo</Button>
        <Button onClick={() => copy(model, "Current graphic JSON copied.")}>Copy graphic JSON</Button>
        <Button onClick={exportSvg}>Download graphic SVG</Button>
      </div>
    </header>
    <div className="qgs-layout">
      <div className="qgs-canvas-column">
        <LiquidViewport ref={viewport} label="Graphic canvas" width={model.width} height={model.height} selectionRect={graphicLayerBounds(selection)} resetKey={`${model.id}-${model.width}-${model.height}`} className="qgs-viewport" onViewportChange={(value) => setCanvasZoom(value.zoom)}>
          <div className="qgs-world" style={{ width: model.width, height: model.height, "--qgs-inverse-zoom": 1 / canvasZoom } as CSSProperties} data-graphic-world="">
            <GraphicArtwork model={visibleModel} assets={assets} namespace={namespace} />
            {visibleModel.layers.filter((layer) => layer.visible).map((layer) => <Button key={layer.id} className="qgs-layer-hit" data-viewport-interactive="" data-liquid-glass="off" data-graphic-layer={layer.id} data-selected={layer.id === selected.id ? "" : undefined} data-locked={layer.locked ? "" : undefined} aria-label={`Select graphic layer ${layer.name}`} aria-pressed={layer.id === selected.id} tabIndex={layer.id === selected.id ? 0 : -1} onClick={() => choose(layer.id)}
              style={{ left: layer.x, top: layer.y, width: layer.width, height: layer.height, transform: `rotate(${layer.rotation}deg)` } as CSSProperties}
              onPointerDown={(event) => startDrag(event, layer, "move")} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={(event) => endDrag(event, true)} onLostPointerCapture={(event) => endDrag(event, true)}
              onKeyDown={(event) => {
                const movement = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
                if (!movement || layer.locked) return;
                event.preventDefault(); event.stopPropagation();
                const step = event.shiftKey ? 10 : 1;
                updateLayer({ ...layer, x: layer.x + movement[0] * step, y: layer.y + movement[1] * step }, "move");
              }}>
              {layer.id === selected.id && <span className="qgs-layer-tag" aria-hidden="true">{layer.name}{layer.locked ? " · locked" : ""}</span>}
            </Button>)}
            {selected.visible && !selected.locked && <Button className="qgs-resize-handle" data-viewport-interactive="" data-liquid-glass="off" aria-label={`Resize graphic layer ${selected.name}`} style={{ left: handleX - handleSize / 2, top: handleY - handleSize / 2, width: handleSize, height: handleSize, fontSize: 17 / canvasZoom }}
              onPointerDown={(event) => startDrag(event, selected, "resize")} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={(event) => endDrag(event, true)} onLostPointerCapture={(event) => endDrag(event, true)}
              onKeyDown={(event) => {
                const movement = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
                if (!movement) return; event.preventDefault(); event.stopPropagation();
                const step = event.shiftKey ? 10 : 1;
                updateLayer(resizedLayer(selected, clamp(selected.width + movement[0] * step, 1, 8192), clamp(selected.height + movement[1] * step, 1, 8192)), "resize");
              }}><span aria-hidden="true">↘</span></Button>}
          </div>
        </LiquidViewport>
        <div className="qgs-artboard-controls">
          <Choice label="Graphic format" value={format} options={[...formats, { value: "custom", label: `${model.width} × ${model.height} · custom` }]} onChange={(value) => {
            const preset = formats.find((item) => item.value === value); if (!preset) return;
            const sx = preset.width / model.width, sy = preset.height / model.height;
            commit({ ...model, width: preset.width, height: preset.height, layers: model.layers.map((layer) => ({ ...layer, x: rounded(layer.x * sx), y: rounded(layer.y * sy), width: rounded(layer.width * sx), height: rounded(layer.height * sy), ...(layer.kind === "text" ? { fontSize: rounded(clamp(layer.fontSize * Math.min(sx, sy), 8, 240)) } : {}) })) }, { reason: "artboard" });
          }} />
          <form className="qgs-background" onSubmit={(event) => { event.preventDefault(); commit({ ...model, background }, { reason: "artboard" }); }} noValidate>
            <Field><FieldLabel>Graphic background</FieldLabel><Input value={background} onValueChange={setBackground} maxLength={7} spellCheck={false} /></Field><Button type="submit">Apply background</Button>
          </form>
        </div>
        <p className="qgs-help">Select and drag a layer to move it. Arrow keys move the focused layer; Shift moves ten pixels. The same geometry is editable in the layer controls.</p>
      </div>
      <aside className="qgs-inspector" aria-label="Graphic layer controls" data-liquid-glass="" data-liquid-kind="panel">
        <div className="qgs-inspector-heading"><h3>Layers</h3><span>{model.layers.length} / 64</span></div>
        <Listbox aria-label="Graphic layers" className="qgs-layer-list" value={selected.id} items={[...model.layers].reverse().map((layer) => ({ value: layer.id, label: layer.name }))} onValueChange={(value) => { if (typeof value === "string") choose(value); }}>
          {[...model.layers].reverse().map((layer) => <ListboxItem key={layer.id} value={layer.id} data-graphic-layer-option={layer.id}><span>{layer.name}</span><small aria-hidden="true">{layer.visible ? layer.kind : "hidden"}{layer.locked ? " · locked" : ""}</small><ListboxItemIndicator>✓</ListboxItemIndicator></ListboxItem>)}
        </Listbox>
        <div className="qgs-layer-switches">
          <Field><FieldLabel>Layer visible</FieldLabel><Switch checked={selected.visible} onCheckedChange={(visible) => updateLayer({ ...selected, visible }, "visibility")}><SwitchThumb /></Switch></Field>
          <Field><FieldLabel>Layer locked</FieldLabel><Switch checked={selected.locked} onCheckedChange={(locked) => updateLayer({ ...selected, locked }, "lock")}><SwitchThumb /></Switch></Field>
        </div>
        <form className="qgs-properties" onSubmit={(event) => { event.preventDefault(); applyProperties(); }} noValidate data-selected-graphic-layer={selected.id}>
          <Field><FieldLabel>Layer name</FieldLabel><Input value={draft.name} onValueChange={(value) => patchDraft("name", value)} maxLength={60} disabled={!canEdit} /></Field>
          <div className="qgs-number-grid">
            <Numeric label="Layer X" value={draft.x} min={-10000} max={10000} onChange={(value) => patchDraft("x", value)} disabled={!canEdit} />
            <Numeric label="Layer Y" value={draft.y} min={-10000} max={10000} onChange={(value) => patchDraft("y", value)} disabled={!canEdit} />
            <Numeric label="Layer width" value={draft.width} min={1} max={8192} onChange={(value) => patchDraft("width", value)} disabled={!canEdit} />
            <Numeric label="Layer height" value={draft.height} min={1} max={8192} onChange={(value) => patchDraft("height", value)} disabled={!canEdit} />
            <Numeric label="Layer rotation" value={draft.rotation} min={-360} max={360} onChange={(value) => patchDraft("rotation", value)} disabled={!canEdit} />
            <Numeric label="Layer opacity" value={draft.opacity} min={0} max={100} onChange={(value) => patchDraft("opacity", value)} disabled={!canEdit} />
          </div>
          {selected.kind === "image" && <><Choice label="Image source" value={draft.assetId} options={assetOptions} onChange={(value) => patchDraft("assetId", value)} disabled={!canEdit} /><Choice label="Image fit" value={draft.fit} options={[{ value: "cover", label: "Fill and crop" }, { value: "contain", label: "Fit whole image" }]} onChange={(value) => patchDraft("fit", value as LayerDraft["fit"])} disabled={!canEdit} /><p className="qgs-image-alt">{assets.find((asset) => asset.id === selected.assetId)?.alt}</p></>}
          {selected.kind === "text" && <>
            <Field><FieldLabel>Layer text</FieldLabel><Textarea value={draft.text} onValueChange={(value) => patchDraft("text", value)} maxLength={500} rows={3} disabled={!canEdit} /></Field>
            <div className="qgs-number-grid"><Numeric label="Text size" value={draft.fontSize} min={8} max={240} onChange={(value) => patchDraft("fontSize", value)} disabled={!canEdit} /><Choice label="Text weight" value={String(draft.fontWeight)} options={[{ value: "400", label: "Regular" }, { value: "600", label: "Semibold" }, { value: "700", label: "Bold" }]} onChange={(value) => patchDraft("fontWeight", Number(value) as LayerDraft["fontWeight"])} disabled={!canEdit} /></div>
            <Choice label="Text family" value={draft.fontFamily} options={[{ value: "sans-serif", label: "Sans serif" }, { value: "serif", label: "Serif" }, { value: "monospace", label: "Monospace" }]} onChange={(value) => patchDraft("fontFamily", value as LayerDraft["fontFamily"])} disabled={!canEdit} />
            <Choice label="Text alignment" value={draft.align} options={[{ value: "left", label: "Left" }, { value: "center", label: "Centre" }, { value: "right", label: "Right" }]} onChange={(value) => patchDraft("align", value as LayerDraft["align"])} disabled={!canEdit} />
          </>}
          {selected.kind === "shape" && <Choice label="Shape geometry" value={draft.shape} options={[{ value: "rectangle", label: "Rectangle" }, { value: "ellipse", label: "Ellipse" }]} onChange={(value) => patchDraft("shape", value as LayerDraft["shape"])} disabled={!canEdit} />}
          {selected.kind !== "image" && <Field><FieldLabel>Layer colour</FieldLabel><Input value={draft.fill} onValueChange={(value) => patchDraft("fill", value)} maxLength={7} disabled={!canEdit} spellCheck={false} /></Field>}
          {selected.kind !== "text" && <Numeric label="Corner radius" value={draft.radius} min={0} max={512} onChange={(value) => patchDraft("radius", value)} disabled={!canEdit} />}
          <Button type="submit" data-variant="solid" disabled={!canEdit}>Apply layer changes</Button>
        </form>
        <div className="qgs-layer-actions">
          <Button disabled={!canEdit || selectedIndex === model.layers.length - 1} onClick={() => reorder(1)}>Bring layer forward</Button>
          <Button disabled={!canEdit || selectedIndex === 0} onClick={() => reorder(-1)}>Send layer backward</Button>
          <Button disabled={model.layers.length >= 64} onClick={duplicateLayer}>Duplicate layer</Button>
          <Button disabled={!canEdit || model.layers.length <= 1} onClick={deleteLayer}>Delete layer</Button>
        </div>
      </aside>
    </div>
    <div className="qgs-feedback" aria-live="polite"><p role={error ? "alert" : "status"} data-graphic-feedback="" data-error={error ? "" : undefined}>{error || feedback || `${selected.name} selected · revision ${model.revision}`}</p></div>
    <div className="qgs-workflows">
      <Collapsible className="qgs-workflow" aria-label="Add graphic content"><CollapsibleTrigger>Add content</CollapsibleTrigger><CollapsiblePanel>
        <Choice label="New layer type" value={newKind} options={[{ value: "text", label: "Text" }, { value: "image", label: "Image" }, { value: "shape", label: "Shape" }]} onChange={(value) => setNewKind(value as GraphicLayerKind)} />
        {newKind === "image" && <Choice label="New image asset" value={newAssetId} options={assetOptions} onChange={setNewAssetId} />}
        <Button disabled={model.layers.length >= 64 || (newKind === "image" && !assets.length)} onClick={addLayer}>Add graphic layer</Button>
        {onAssetsChange && <FileInput aria-label="Import graphic image" value={importFiles} accept={["image/png", "image/jpeg", "image/webp"]} maxSize={5_000_000} disabled={importing || assets.length >= 24} onValueChange={(files) => { setImportFiles(files); if (files[0]) void importImage(files[0]); }} onReject={() => setError("Choose a PNG, JPEG or WebP image up to 5 MB.")}><FileInputTrigger>{importing ? "Reading image…" : "Import image"}</FileInputTrigger></FileInput>}
        <p>Imported images stay in this session. Importing replaces the selected unlocked image layer.</p>
      </CollapsiblePanel></Collapsible>
      <Collapsible className="qgs-workflow" aria-label="Graphic variants"><CollapsibleTrigger>Save a direction</CollapsibleTrigger><CollapsiblePanel>
        <Field><FieldLabel>Graphic variant name</FieldLabel><Input value={variantName} maxLength={60} onValueChange={setVariantName} /></Field>
        <Button disabled={variants.length >= 12} onClick={() => {
          const name = variantName.trim();
          if (variants.length >= 12) { setError("This session can contain up to 12 saved directions."); return; }
          if (!name || name.length > 60 || variants.some((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) { setError("Use a new variant name of 1–60 characters."); return; }
          const variant = { id: `variant-${variants.length + 1}`, name, document: structuredClone(model) };
          setVariants((items) => [...items, variant]); setVariantId(variant.id); setVariantName(`Direction ${variants.length + 2}`); setFeedback(`Saved ${name} in this session.`); setError("");
        }}>Save graphic variant</Button>
        {variants.length > 0 && <><Choice label="Saved graphic variant" value={variantId} options={variants.map((item) => ({ value: item.id, label: item.name }))} onChange={setVariantId} /><Button onClick={() => { const variant = variants.find((item) => item.id === variantId); if (variant) commit(structuredClone(variant.document), { reason: "variant" }); }}>Restore graphic variant</Button></>}
      </CollapsiblePanel></Collapsible>
      <Collapsible className="qgs-workflow" aria-label="Graphic agent context"><CollapsibleTrigger>Work with an image agent</CollapsibleTrigger><CollapsiblePanel>
        <Field><FieldLabel>Graphic edit brief</FieldLabel><Textarea value={brief} rows={3} maxLength={2000} onValueChange={setBrief} /><FieldDescription>Copy the brief with the selected layer and current composition. Import the returned image to continue editing.</FieldDescription></Field>
        <Button onClick={() => copyAgentContext("compose")}>Copy graphic agent context</Button>
        <Button disabled={selected.kind !== "image" || !brief.trim()} onClick={() => copyAgentContext("edit-image")}>Copy image edit request</Button>
        {onImageRequest && <Button disabled={selected.kind !== "image" || !brief.trim()} onClick={sendImageRequest} pendingAnnouncement="Sending image request">Send image request</Button>}
      </CollapsiblePanel></Collapsible>
    </div>
    <Collapsible className="qgs-structured" aria-label="Structured graphic edits"><CollapsibleTrigger>Structured edits</CollapsibleTrigger><CollapsiblePanel>
      <div className="qgs-structured-actions"><Button onClick={() => { setJsonDraft(JSON.stringify(model, null, 2)); setFeedback(`Loaded revision ${model.revision} into the JSON draft.`); setError(""); }}>Load current graphic JSON</Button><Button onClick={() => {
        try {
          if (jsonDraft.length > 1_000_000 || new TextEncoder().encode(jsonDraft).length > 1_000_000) { setError("Limit graphic JSON to 1 MB."); return; }
          const candidate: unknown = JSON.parse(jsonDraft);
          const problems = validateGraphicDocument(candidate, assets);
          if (problems.length) { setError(problems[0]); return; }
          const next = candidate as GraphicDocument;
          if (next.revision !== model.revision) { setError(`This draft is revision ${next.revision}; the composition is revision ${model.revision}. Load the current graphic JSON before editing.`); return; }
          if (commit(next, { reason: "json" })) setFeedback("Applied the structured edit through shared validation. Undo restores the previous composition.");
        } catch { setError("Enter valid composition JSON."); }
      }}>Apply graphic JSON</Button></div>
      <Field><FieldLabel>Graphic JSON draft</FieldLabel><Textarea value={jsonDraft} onValueChange={setJsonDraft} rows={12} maxLength={1_000_000} spellCheck={false} /><FieldDescription>Stable layer IDs and a matching revision keep edits attached to the intended composition. Locked layers must be unlocked first. Drafts can contain up to 1 MB of JSON.</FieldDescription></Field>
    </CollapsiblePanel></Collapsible>
    <p className="qgs-review-note"><ValidationBadge /> This custom graphic editor has not been reviewed or approved by a human UI/UX team. Edits, imports and saved directions last for this kit session.</p>
  </section>;
}
