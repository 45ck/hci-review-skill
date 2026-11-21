"use client";

import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { registerTools, type AgentAction } from "@ui-sdk/react/agent";
import { Button } from "@ui-sdk/react/button";
import { Field, FieldLabel } from "@ui-sdk/react/field";
import { Input } from "@ui-sdk/react/input";
import { LiquidGlassProvider } from "@quantitative-hci/liquid-glass/webgpu";
import { LiquidIcon } from "@quantitative-hci/liquid-glass/icons";
import { LiquidViewport, type Viewport } from "@quantitative-hci/liquid-glass/viewport";
import { LiquidFilterBar } from "@quantitative-hci/liquid-glass/patterns";
import { LiquidAppShell, LiquidAppWorkarea, LiquidAppContent } from "@quantitative-hci/liquid-glass/layouts";
import { ValidationBadge } from "@quantitative-hci/liquid-glass/validation";
import CopiedStarter, { getStarterAgent } from "./copied-starter";
import "@ui-sdk/core/web.css";
import "@quantitative-hci/liquid-glass/kit.css";
import "@quantitative-hci/liquid-glass/viewport.css";
import "@quantitative-hci/liquid-glass/patterns.css";
import "@quantitative-hci/liquid-glass/layouts.css";
import "./styles.css";

const agent = getStarterAgent();
const allow = (step: AgentAction) => !step.confirm;
const hmrRevision = "initial";
const copiedStarter = new URLSearchParams(location.search).get("view") === "starter";

declare global {
  interface Window {
    consumerAgent: Pick<typeof agent, "snapshot" | "query" | "act" | "subscribe">;
  }
}

window.consumerAgent = Object.freeze({ snapshot: agent.snapshot, query: agent.query, act: agent.act, subscribe: agent.subscribe });

function Workspace() {
  const [name, setName] = useState("Atlas");
  const [saved, setSaved] = useState("");
  const [notice, setNotice] = useState("");
  const [source, setSource] = useState("");
  const [query, setQuery] = useState("");
  const [removed, setRemoved] = useState(false);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  useEffect(() => registerTools(agent, { allow }), []);
  return <LiquidGlassProvider backdrop={<div className="backdrop" />} transparency="solid" motion={false}>
    <LiquidAppShell className="consumer-shell">
      <LiquidAppWorkarea>
        <LiquidAppContent className="consumer-content">
          <h1><LiquidIcon name="folder" /> Installed package workspace</h1>
          <p>This page consumes the private package tarball outside the source repository.</p>
          <ValidationBadge />
          <section data-liquid-glass="" data-liquid-kind="panel" className="consumer-panel">
            <Field><FieldLabel>Workspace name</FieldLabel><Input value={name} onValueChange={(value, details) => {
              if (value.toLowerCase().includes("locked")) {
                details.cancel();
                setNotice("Names containing locked are reserved. The workspace name was kept.");
                return;
              }
              setName(value);
              setSource(details.source);
              setNotice("");
            }} /></Field>
            <Button onClick={() => setSaved(name)}>Save workspace</Button>
            <Button data-agent-confirm="Removes this local example record" onClick={() => setRemoved(true)}>Remove example record</Button>
            <output data-testid="saved" aria-live="polite">{saved ? `Saved ${saved}` : "No workspace saved"}</output>
            <output data-testid="source">{source}</output>
            <output data-testid="notice" aria-live="polite">{notice}</output>
            <output data-testid="removed">{removed ? "Removed" : "Record retained"}</output>
          </section>
          <LiquidFilterBar searchLabel="Find installed examples" query={query} onQueryChange={setQuery} onReset={() => setQuery("")} resultCount={query ? 1 : 3} />
          <output data-testid="query">{query}</output>
          <LiquidViewport label="Installed package canvas" width={480} height={200} viewport={viewport} onViewportChange={(value, details) => {
            if (value.zoom > 2) { details.cancel(); setNotice("The host limits this canvas to 200% zoom."); return; }
            setViewport(value);
          }}>
            <div className="canvas-card">A shared viewport from the installed package</div>
          </LiquidViewport>
          <output data-testid="viewport">{JSON.stringify(viewport)}</output>
        </LiquidAppContent>
      </LiquidAppWorkarea>
    </LiquidAppShell>
  </LiquidGlassProvider>;
}

function Harness() {
  const [mounted, setMounted] = useState(true);
  return <>
    <header className="lifecycle-controls">
      <Button onClick={() => setMounted(current => !current)}>{mounted ? "Unmount application" : "Mount application"}</Button>
      <output data-testid="hmr-revision">{hmrRevision}</output>
    </header>
    {mounted ? copiedStarter ? <CopiedStarter /> : <Workspace /> : <p>Application unmounted.</p>}
  </>;
}

const root = createRoot(document.getElementById("root")!);
root.render(<StrictMode><Harness /></StrictMode>);
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => root.unmount());
}
