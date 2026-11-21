import { useState } from "react";
import { Button } from "@ui-sdk/react/button";
import { Checkbox, CheckboxIndicator } from "@ui-sdk/react/checkbox";
import { Field, FieldLabel } from "@ui-sdk/react/field";
import { Input } from "@ui-sdk/react/input";
import { Archive, Check, FileText, FolderOpen, Image, Layers2, Search, SlidersHorizontal } from "lucide-react";
import { LiquidCommandPalette, LiquidDetailSheet, LiquidEmptyState, LiquidFilterBar, LiquidSelectionBar } from "@quantitative-hci/liquid-glass/patterns";
import { ValidationBadge } from "@quantitative-hci/liquid-glass/validation";
import "@quantitative-hci/liquid-glass/patterns.css";
import "./patterns-showcase.css";

type Work = { id: string; title: string; kind: string; status: "draft" | "ready" | "archived"; detail: string; image?: string; updated: string };
const initialWorks: Work[] = [
  { id: "coast", title: "Coastal study", kind: "Design", status: "ready", detail: "Light, colour and texture from a fictional coastal landscape. Ready for the next design review.", image: "/media/emerald-coast-small.webp", updated: "Today" },
  { id: "pavilion", title: "Pavilion notes", kind: "Research", status: "draft", detail: "A short spatial study of the quiet pavilion: threshold, material and the rhythm of natural light.", image: "/media/quiet-pavilion-small.webp", updated: "Today" },
  { id: "glass", title: "Glass references", kind: "Design", status: "draft", detail: "Material references for the shared glass surface, readable controls and solid fallback.", image: "/media/glass-study-small.webp", updated: "Yesterday" },
  { id: "audit", title: "Interface audit", kind: "Research", status: "ready", detail: "Questions for a future human review: keyboard continuity, understandable choices and readable content.", updated: "Yesterday" },
  { id: "motion", title: "Motion specification", kind: "Engineering", status: "archived", detail: "The earlier motion notes. Kept here as a local archived record.", updated: "12 Nov" },
  { id: "contract", title: "Component contract", kind: "Engineering", status: "ready", detail: "The public inputs, state, genuine SDK actions and observed outcomes for a reusable component.", updated: "11 Nov" },
];
const statuses = [{ id: "draft", label: "Draft" }, { id: "ready", label: "Ready" }, { id: "archived", label: "Archived" }];

export function PatternsShowcase() {
  const [works, setWorks] = useState(initialWorks);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("Changes stay in this local sample.");
  const [lastSource, setLastSource] = useState("none");
  const [archiveOperations, setArchiveOperations] = useState(0);
  const visible = works.filter(work => (!status.length || status.includes(work.status)) && `${work.title} ${work.kind}`.toLowerCase().includes(query.trim().toLowerCase()));
  const resetFilters = () => { setQuery(""); setStatus([]); };
  const resetLibrary = () => { setWorks(initialWorks); setSelected([]); setArchiveOperations(0); resetFilters(); setFeedback("Local sample restored."); };
  const archive = () => {
    const count = selected.length;
    if (!count) throw new Error("Choose at least one work first.");
    setWorks(current => current.map(work => selected.includes(work.id) ? { ...work, status: "archived" } : work));
    setSelected([]);
    setArchiveOperations(count => count + 1);
    setFeedback(`${count} ${count === 1 ? "work" : "works"} archived in this sample.`);
  };

  return <div className="patterns-showcase" data-kit-view="patterns" data-validation="unvalidated">
    <header className="patterns-intro">
      <div><p className="patterns-eyebrow">Search · select · act</p><h2>Your working library.</h2><p>Find a study, gather a selection, or jump straight to an action.</p></div>
      <ValidationBadge />
    </header>
    <section className="patterns-library" aria-label="Sample work library" data-liquid-glass="" data-liquid-kind="panel">
      <header className="patterns-library-header">
        <div className="patterns-library-label"><FolderOpen size={23} aria-hidden="true" /><div><h3>Saved work</h3><span>{works.length} local items</span></div></div>
        <LiquidCommandPalette title="Library commands" triggerLabel="Search library commands" searchLabel="Find a library command" description="Jump to a view or restore the local sample." groups={[
          { id: "views", label: "Views", items: [
            { id: "ready", label: "Show ready work", icon: <Check size={17} />, keywords: ["review", "complete"] },
            { id: "draft", label: "Show draft work", icon: <FileText size={17} />, keywords: ["unfinished"] },
            { id: "all", label: "Show all work", icon: <Layers2 size={17} /> },
          ] },
          { id: "actions", label: "Actions", items: [
            { id: "restore", label: "Restore sample library", icon: <FolderOpen size={17} /> },
            { id: "publish", label: "Publish library online", icon: <Layers2 size={17} />, disabled: true },
          ] },
        ]} onAction={id => {
          if (id === "ready" || id === "draft") { setQuery(""); setStatus([id]); setFeedback(`Showing ${id} work.`); }
          if (id === "all") { resetFilters(); setFeedback("Showing all work."); }
          if (id === "restore") resetLibrary();
        }} />
      </header>
      <div className="patterns-filters"><LiquidFilterBar searchLabel="Search saved work" placeholder="Search titles or types…" query={query} onQueryChange={(next, details) => {
        setLastSource(details.source);
        if (next.length > 80) { details.cancel(); setFeedback("Search was not changed. Use 80 characters or fewer."); return; }
        setQuery(next);
      }} facets={[{ id: "status", label: "Work status", value: status, options: statuses, onValueChange: (next, details) => {
        setLastSource(details.source);
        if (next.some(value => !statuses.some(option => option.id === value))) { details.cancel(); return; }
        setStatus(next);
      } }]} onReset={details => { setLastSource(details.source); resetFilters(); setFeedback("Filters cleared."); }} resetLabel="Clear work filters" resultCount={visible.length} /></div>
      <div className="patterns-list-heading"><span>Work</span><span>Status</span><span>Updated</span></div>
      {visible.length > 0 ? <ul className="patterns-work-list" aria-label="Saved work results">
        {visible.map(work => <li className="patterns-work-row" key={work.id} data-work-id={work.id} data-work-status={work.status} data-selected={selected.includes(work.id)}>
          <div className="patterns-work-main">
            <Checkbox aria-label={`Select ${work.title}`} checked={selected.includes(work.id)} onCheckedChange={(checked, details) => {
              setLastSource(details.source);
              setSelected(current => checked ? [...new Set([...current, work.id])] : current.filter(id => id !== work.id));
            }}><CheckboxIndicator><Check size={14} aria-hidden="true" /></CheckboxIndicator></Checkbox>
            <div className="patterns-thumbnail" aria-hidden="true">{work.image ? <img src={work.image} alt="" width="96" height="96" /> : <FileText size={23} />}</div>
            <div className="patterns-work-name"><strong>{work.title}</strong><span>{work.kind}</span></div>
          </div>
          <span className="patterns-status" data-status={work.status}><span aria-hidden="true" />{statuses.find(item => item.id === work.status)?.label}</span>
          <span className="patterns-work-updated">{work.updated}</span>
          <LiquidDetailSheet title={`${work.title} details`} triggerLabel={`Open ${work.title}`} description={`${work.kind} · ${statuses.find(item => item.id === work.status)?.label}`} footer={<Button disabled>Share online</Button>}>
            {work.image ? <img className="patterns-detail-image" src={work.image.replace("-small", "")} alt={`Concept artwork for ${work.title}.`} width="1200" height="800" /> : <div className="patterns-detail-symbol" aria-hidden="true"><FileText size={44} /></div>}
            <p className="patterns-detail-description">{work.detail}</p>
            <Field><FieldLabel>{`Title for ${work.id}`}</FieldLabel><Input value={work.title} onValueChange={(next, details) => {
              setLastSource(details.source);
              if (!next.trim() || next.length > 64) { details.cancel(); setFeedback("The title was not changed. Use 1–64 characters."); return; }
              setWorks(current => current.map(item => item.id === work.id ? { ...item, title: next, updated: "Just now" } : item));
              setFeedback("Title updated in this sample.");
            }} /></Field>
            <dl className="patterns-detail-metadata"><div><dt>Reference</dt><dd>{work.id}</dd></div><div><dt>Type</dt><dd>{work.kind}</dd></div><div><dt>Storage</dt><dd>This page only</dd></div></dl>
          </LiquidDetailSheet>
        </li>)}
      </ul> : <LiquidEmptyState title="No work matches yet." description="Try another title, choose a different status, or clear the filters to see the full library." media={<Search size={27} />} actions={<Button onClick={() => { resetFilters(); setFeedback("Filters cleared."); }}>Show the full library</Button>} />}
      <div className="patterns-library-footer"><output aria-label="Library result" aria-live="polite" data-last-source={lastSource} data-archive-operations={archiveOperations}>{feedback}</output><Button onClick={resetLibrary}>Restore sample</Button></div>
    </section>
    <LiquidSelectionBar label="Selected work actions" selectedCount={selected.length} actions={[{ id: "archive", label: "Archive selected work" }, { id: "publish", label: "Publish selected work", disabled: true }]} onAction={(id, details) => { setLastSource(details.source); if (id === "archive") archive(); }} onClear={details => { setLastSource(details.source); setSelected([]); setFeedback("Selection cleared."); }} clearLabel="Clear work selection" />
    <div className="patterns-notes"><p><SlidersHorizontal size={16} aria-hidden="true" />Familiar controls, one shared state.</p><p><Image size={16} aria-hidden="true" />Artwork and records are local samples.</p><p><Archive size={16} aria-hidden="true" />Archiving can be undone with Restore sample.</p></div>
  </div>;
}
