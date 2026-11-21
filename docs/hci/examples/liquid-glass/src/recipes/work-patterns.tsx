"use client";

import { useState } from "react";
import { Button } from "@ui-sdk/react/button";
import { Checkbox, CheckboxIndicator } from "@ui-sdk/react/checkbox";
import { LiquidGlassProvider } from "@quantitative-hci/liquid-glass/webgpu";
import { LiquidCommandPalette, LiquidDetailSheet, LiquidEmptyState, LiquidFilterBar, LiquidSelectionBar } from "@quantitative-hci/liquid-glass/patterns";
import "@ui-sdk/core/web.css";
import "@quantitative-hci/liquid-glass/kit.css";
import "@quantitative-hci/liquid-glass/patterns.css";

const examples = [{ id: "brief", label: "Project brief", status: "draft" }, { id: "review", label: "Design review", status: "ready" }];

export default function WorkPatternsRecipe() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const visible = examples.filter(item => item.label.toLowerCase().includes(query.toLowerCase()) && (!status.length || status.includes(item.status)));
  const reset = () => { setQuery(""); setStatus([]); };
  return <LiquidGlassProvider backdrop={<div style={{ width: "100%", height: "100%", background: "#d8e9ef" }} />}>
    <section style={{ padding: 24 }}>
      <h2>Project library</h2>
      <LiquidCommandPalette title="Project commands" triggerLabel="Open project commands" searchLabel="Find project action" groups={[{ id: "view", label: "View", items: [{ id: "all", label: "Show every project" }, { id: "ready", label: "Show ready projects" }] }]} onAction={id => { setQuery(""); setStatus(id === "ready" ? ["ready"] : []); }} />
      <LiquidFilterBar searchLabel="Search projects" query={query} onQueryChange={(next, details) => { if (next.length > 80) { details.cancel(); return; } setQuery(next); }} facets={[{ id: "status", label: "Project status", value: status, options: [{ id: "draft", label: "Draft" }, { id: "ready", label: "Ready" }], onValueChange: setStatus }]} onReset={reset} resultCount={visible.length} />
      {visible.length ? <ul>{visible.map(item => <li key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12 }}>
        <Checkbox aria-label={`Select ${item.label}`} checked={selected.includes(item.id)} onCheckedChange={checked => setSelected(current => checked ? [...new Set([...current, item.id])] : current.filter(id => id !== item.id))}><CheckboxIndicator>✓</CheckboxIndicator></Checkbox>
        <span>{item.label}</span>
        <LiquidDetailSheet title={`${item.label} details`} triggerLabel={`Inspect ${item.label}`} description={item.status}><p>This local record is identified by {item.id}.</p></LiquidDetailSheet>
      </li>)}</ul> : <LiquidEmptyState title="No projects found" description="Clear the filters to return to every project." actions={<Button onClick={reset}>Show projects</Button>} />}
      <LiquidSelectionBar label="Project selection actions" selectedCount={selected.length} actions={[{ id: "save", label: "Save selected projects" }]} onAction={() => { setSaved(current => [...new Set([...current, ...selected])]); setSelected([]); }} onClear={() => setSelected([])} />
      <output aria-live="polite">{saved.length} projects saved in this local example.</output>
    </section>
  </LiquidGlassProvider>;
}
