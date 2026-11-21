import { useState } from "react";
import { Button } from "@ui-sdk/react/button";
import { Input } from "@ui-sdk/react/input";
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@ui-sdk/react/select";
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from "@ui-sdk/react/tabs";
import { LiquidIcon } from "@quantitative-hci/liquid-glass/icons";
import { FoundationBadge, ValidationBadge } from "@quantitative-hci/liquid-glass/validation";
import { liquidComponentRecipes, liquidComponentRegistry } from "@quantitative-hci/liquid-glass/recipes";
import { collectionLabels, libraryComponents, libraryCounts, matchesLibrarySearch, type LibraryComponent, type LibraryNavigationOptions } from "./library-catalogue";
import { exampleSource } from "./example-preview";
import "./library-pages.css";

type NavigationProps = { onNavigate: (id: string, options?: LibraryNavigationOptions) => void };
const kinds = [{ value: "all", label: "All components" }, { value: "custom", label: "Quantive components" }, { value: "sdk", label: "SDK foundation" }];
const categories = [{ value: "all", label: "Every category" }, ...[...new Set(libraryComponents.map(item => item.category))].sort().map(category => ({ value: category, label: category }))];

function LibrarySelect({ label, value, items, onChange }: { label: string; value: string; items: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return <div className="library-select"><Select value={value} items={items} onValueChange={next => { if (typeof next === "string") onChange(next); }}>
    <SelectLabel>{label}</SelectLabel><SelectTrigger><SelectValue /></SelectTrigger>
    <SelectContent>{items.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
  </Select></div>;
}

function LibraryCard({ item, onNavigate }: { item: LibraryComponent } & NavigationProps) {
  return <article className="library-component-card" data-library-component={item.id} data-library-kind={item.foundation ? "sdk" : "custom"}>
    <div className="library-card-top"><LiquidIcon name={item.icon} size={32} /><span>{item.category}</span>{item.foundation ? <FoundationBadge /> : <ValidationBadge />}</div>
    <h2>{item.title}</h2>
    {item.name !== item.title && <code className="library-export-name">{item.name}</code>}
    <p>{item.purpose}</p>
    <Button aria-label={`Open ${item.name}`} onClick={() => onNavigate(item.route)}>{item.foundation ? "Try component" : "View component"}</Button>
  </article>;
}

export function LibraryCatalogue({ onNavigate }: NavigationProps) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [category, setCategory] = useState("all");
  const visible = libraryComponents.filter(item => matchesLibrarySearch(item, query)
    && (kind === "all" || item.foundation === (kind === "sdk")) && (category === "all" || item.category === category));
  const reset = () => { setQuery(""); setKind("all"); setCategory("all"); };
  return <section className="library-page" data-kit-view="catalogue" aria-label="All component entries" data-liquid-glass="off">
    <div className="library-intro">
      <p>Try a control, inspect its API, or open a complete working example.</p>
      <div className="library-counts"><span><strong>{libraryCounts.foundation}</strong> SDK families</span><span><strong>{libraryCounts.custom}</strong> custom entries</span><span><strong>{libraryCounts.examples}</strong> runnable examples</span></div>
    </div>
    <div className="library-filter-row">
      <label className="library-query"><span>Find a component</span><Input aria-label="Find a library component" value={query} onValueChange={setQuery} placeholder="Prompt, cursor, dialog…" /></label>
      <LibrarySelect label="Component origin" value={kind} items={kinds} onChange={setKind} />
      <LibrarySelect label="Component category" value={category} items={categories} onChange={setCategory} />
      <Button onClick={reset} disabled={!query && kind === "all" && category === "all"}>Clear filters</Button>
    </div>
    <output className="library-results" aria-label="Component results" aria-live="polite">{visible.length} of {libraryComponents.length} entries</output>
    {visible.length ? <div className="library-card-grid">{visible.map(item => <LibraryCard key={item.id} item={item} onNavigate={onNavigate} />)}</div>
      : <div className="library-empty"><h2>No components found</h2><p>Try a different name or clear the filters.</p><Button onClick={reset}>Show every component</Button></div>}
  </section>;
}

export function ComponentDetails({ item, onNavigate }: { item: LibraryComponent } & NavigationProps) {
  const [copyResult, setCopyResult] = useState("");
  const contract = item.contract;
  const related = liquidComponentRecipes.filter(recipe => item.recipeIds.includes(recipe.id));
  const copy = async () => { try { await navigator.clipboard.writeText(item.importLine); setCopyResult("Import copied"); } catch { setCopyResult("Select the import below to copy it."); } };
  return <article className="library-page library-detail" data-kit-view="component-detail" data-library-detail={item.id} data-validation="unvalidated" data-liquid-glass="off">
    <div className="library-detail-lead"><LiquidIcon name={item.icon} size={52} /><div><p>{item.purpose}</p><ValidationBadge /></div></div>
    <div className="library-detail-actions"><Button onClick={() => onNavigate(item.collection, item.graphicsView ? { graphicsView: item.graphicsView } : undefined)}>Open live example</Button><Button onClick={() => onNavigate("catalogue")}>Back to all components</Button></div>
    <p className="library-example-context">See this {contract?.kind === "provider" ? "provider" : "component"} in <strong>{item.graphicsView === "images" ? "Image components" : collectionLabels[item.collection] ?? item.collection}</strong>. The working example supplies its surrounding state and controls.</p>
    <section className="library-detail-section"><h2>Use it</h2><div className="library-import"><code>{item.importLine}</code>{contract && <Button onClick={copy}>Copy import</Button>}</div><output aria-live="polite">{copyResult}</output>
      {related.length > 0 && <div className="library-detail-actions">{related.map(recipe => <Button key={recipe.id} onClick={() => onNavigate(`example:${recipe.id}`)}>Try {recipe.title}</Button>)}</div>}
    </section>
    {contract && <>
      <div className="library-detail-columns">
        <section className="library-detail-section"><h2>Inputs</h2><ul>{contract.inputs.map(input => <li key={input}>{input}</li>)}</ul></section>
        <section className="library-detail-section"><h2>State and results</h2><ul>{contract.state.map(state => <li key={state}>{state}</li>)}</ul></section>
      </div>
      <section className="library-detail-section"><h2>Agent operation</h2><p>{contract.runtime.mutationPath}</p><p>{contract.runtime.outcome}</p><Button render={<a href={`/contracts/${contract.id}.json`} target="_blank" rel="noreferrer" />}>Open component contract</Button></section>
      <section className="library-detail-section"><h2>Integration notes</h2><ul>{contract.restrictions.map(restriction => <li key={restriction}>{restriction}</li>)}</ul><div className="library-detail-actions">{contract.sources.slice(0, 2).map((source, index) => <Button key={source} render={<a href={`https://github.com/45ck/hci-review-skill/blob/main/${source}`} target="_blank" rel="noreferrer" />}>{index ? "Supporting source" : "Component source"}</Button>)}</div></section>
    </>}
  </article>;
}

export function ExamplesPage({ onNavigate }: NavigationProps) {
  return <section className="library-page" data-kit-view="examples" data-liquid-glass="off">
    <div className="library-intro"><p>Run the example, inspect its source, then copy it into your project.</p></div>
    <div className="library-example-grid">{liquidComponentRecipes.map(recipe => <article className="library-example-card" key={recipe.id} data-library-example={recipe.id}>
      <div className="library-card-top"><LiquidIcon name={recipe.collection === "assistant" || recipe.collection === "chat" ? "sparkles" : recipe.collection === "sections" ? "layers" : "folder"} size={40} /><span>{collectionLabels[recipe.collection] ?? recipe.collection}</span></div>
      <h2>{recipe.title}</h2><p>{recipe.purpose}</p><div className="library-example-components">{recipe.components.map(component => <code key={component}>{component}</code>)}</div>
      <div className="library-detail-actions"><Button onClick={() => onNavigate(`example:${recipe.id}`)}>Try {recipe.title}</Button><Button onClick={() => onNavigate(recipe.collection)}>Open full showcase</Button></div>
    </article>)}</div>
  </section>;
}

export function ExampleDetails({ id, onNavigate }: { id: string } & NavigationProps) {
  const [result, setResult] = useState("");
  const [previewVersion, setPreviewVersion] = useState(0);
  const recipe = liquidComponentRecipes.find(item => item.id === id);
  const source = exampleSource(id);
  if (!recipe || !source) return <p role="alert">This example is unavailable.</p>;
  const copy = async (content: string, label: string) => {
    try { await navigator.clipboard.writeText(content); setResult(label); } catch { setResult("Clipboard unavailable. Select the source to copy it."); }
  };
  const embedUrl = `?example=${encodeURIComponent(id)}&embed=1`;
  return <article className="library-page library-example-detail" data-kit-view="example-detail" data-example-id={id} data-validation="unvalidated" data-liquid-glass="off">
    <div className="library-intro"><p>{recipe.purpose}</p><ValidationBadge /></div>
    <div className="library-detail-actions"><Button onClick={() => onNavigate("examples")}>All examples</Button><Button onClick={() => copy(source, "Example copied")}>Copy example</Button><Button onClick={() => copy(JSON.stringify({ ...recipe, foundation: liquidComponentRegistry.foundation, distribution: liquidComponentRegistry.distribution, policy: liquidComponentRegistry.policy, exampleSource: source }, null, 2), "Agent brief copied")}>Copy agent brief</Button></div>
    <Tabs defaultValue="preview" key={id}>
      <TabsList aria-label="Example view"><TabsTab value="preview">Live preview</TabsTab><TabsTab value="source">Source</TabsTab><TabsTab value="integration">Integration</TabsTab><TabsIndicator /></TabsList>
      <TabsPanel value="preview">
        <div className="library-preview-toolbar"><span>Interactive local example</span><Button onClick={() => setPreviewVersion(value => value + 1)}>Restart example</Button><Button render={<a href={embedUrl} target="_blank" rel="noreferrer" />}>Open preview</Button></div>
        <iframe key={`${id}:${previewVersion}`} className="library-example-frame" title={`${recipe.title} interactive preview`} src={embedUrl} />
      </TabsPanel>
      <TabsPanel value="source"><pre className="library-source" tabIndex={0} aria-label={`${recipe.title} complete source`}><code>{source}</code></pre></TabsPanel>
      <TabsPanel value="integration"><section className="library-detail-section"><h2>Connect it to your application</h2><p>{liquidComponentRegistry.distribution}</p><ul>{recipe.constraints.map(constraint => <li key={constraint}>{constraint}</li>)}</ul><p>The standalone preview runs in its own document with its own provider and SDK bridge. In your application, compose its contents into your existing provider and bridge.</p><Button onClick={() => onNavigate(recipe.collection)}>Open full showcase</Button></section></TabsPanel>
    </Tabs>
    <output className="library-copy-result" aria-live="polite">{result}</output>
  </article>;
}
