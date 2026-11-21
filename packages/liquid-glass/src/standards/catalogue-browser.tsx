"use client";

import { useMemo, useState } from "react";
import { Button } from "@ui-sdk/react/button";
import { Field, FieldLabel } from "@ui-sdk/react/field";
import { Input } from "@ui-sdk/react/input";
import { Textarea } from "@ui-sdk/react/textarea";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@ui-sdk/react/collapsible";
import { Dialog, DialogBackdrop, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@ui-sdk/react/dialog";
import type { DiagramModel } from "../developer/types";
import { catalogueCounts, coverageLabels, findStandards, standardCategories, omgCatalogueSource, type StandardCategory, type StandardCoverage } from "./catalogue";
import { ModelChoice } from "./controls";

export interface StandardsCatalogueProps {
  models: readonly DiagramModel[];
  onChoose: (id: string) => void;
  disabled?: boolean;
}

export function StandardsCatalogue({ models, onChoose, disabled }: StandardsCatalogueProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [coverage, setCoverage] = useState("all");
  const entries = useMemo(() => findStandards({ query: search,
    category: category === "all" ? undefined : category as StandardCategory,
    coverage: coverage === "all" ? undefined : coverage as StandardCoverage,
  }), [search, category, coverage]);
  const views = useMemo(() => new Map(models.map(model => [model.id, model])), [models]);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger disabled={disabled}>Browse all standards</DialogTrigger><DialogBackdrop />
    <DialogContent className="standards-catalogue" initialFocus="content">
      <header className="standards-catalogue-heading"><div><DialogTitle>Standards catalogue</DialogTitle>
        <DialogDescription>OMG’s current catalogue, with coverage pinned to each version. External modelling methods and profiles are attributed separately.</DialogDescription></div>
        <DialogClose aria-label="Close standards catalogue">Close</DialogClose></header>
      <div className="standards-catalogue-filters">
        <Field><FieldLabel>Search standards</FieldLabel><Input value={search} onValueChange={setSearch} placeholder="BPMN, UWE, architecture…" /></Field>
        <ModelChoice label="Standard category" value={category} onChange={setCategory} items={[{ value: "all", label: "All categories" }, ...standardCategories.map(item => ({ value: item.id, label: item.label }))]} />
        <ModelChoice label="Standard coverage" value={coverage} onChange={setCoverage} items={[{ value: "all", label: "All coverage" }, ...Object.entries(coverageLabels).map(([value, label]) => ({ value, label }))]} />
      </div>
      <p className="standards-catalogue-count" aria-live="polite">{entries.length} of {catalogueCounts.totalEntries} entries · {models.length} editable views · {catalogueCounts.referenceOnly} reference-only entries</p>
      <div className="standards-catalogue-scroll">
        {entries.map(entry => <article key={entry.id} className="standards-catalogue-card" data-standard-id={entry.id} data-standard-coverage={entry.coverage}>
          <div className="standards-entry-heading"><strong>{entry.displayAcronym} <span>{entry.version}</span></strong><span className="standards-coverage" data-coverage={entry.coverage}>{coverageLabels[entry.coverage]}</span></div>
          <h3>{entry.title}</h3><p>{entry.coverageDescription}</p>
          <div className="standards-entry-meta"><span>{entry.authority} · {entry.status} · {entry.publicationDate || "Research profile"}</span><a href={entry.sourceUrl} target="_blank" rel="noreferrer">Read specification</a></div>
          {entry.viewIds.length > 0 && <div className="standards-entry-actions">{entry.viewIds.map(id => {
            const view = views.get(id);
            return view ? <Button key={id} onClick={() => { onChoose(id); setOpen(false); }}>Open {view.notation}</Button> : null;
          })}</div>}
        </article>)}
        {!entries.length && <p className="standards-empty">No standards match these filters.</p>}
      </div>
      <footer><Collapsible className="standards-catalogue-data" aria-label="Catalogue data"><CollapsibleTrigger>Catalogue data</CollapsibleTrigger><CollapsiblePanel>
        <Field><FieldLabel>Matching standards JSON</FieldLabel><Textarea readOnly value={JSON.stringify(entries)} rows={4} spellCheck={false} /></Field>
      </CollapsiblePanel></Collapsible>
        <a href={omgCatalogueSource.url} target="_blank" rel="noreferrer">Official OMG catalogue</a> · Snapshot {omgCatalogueSource.retrievedOn}. Reference entries have source metadata, not an implemented renderer or runtime.</footer>
    </DialogContent>
  </Dialog>;
}
