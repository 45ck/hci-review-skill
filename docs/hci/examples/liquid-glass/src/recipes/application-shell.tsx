"use client";

import { useState } from "react";
import { Button } from "@ui-sdk/react/button";
import { LiquidGlassProvider } from "@quantitative-hci/liquid-glass/webgpu";
import {
  LiquidAppShell, LiquidAppRail, LiquidAppWorkarea, LiquidAppHeader,
  LiquidAppContent, LiquidAppDock, LiquidAppNavigation, LiquidWorkspaceSwitcher,
} from "@quantitative-hci/liquid-glass/layouts";
import "@ui-sdk/core/web.css";
import "@quantitative-hci/liquid-glass/kit.css";
import "@quantitative-hci/liquid-glass/layouts.css";

const workspaces = [
  { id: "northstar", name: "Northstar Lab", role: "Owner", shortLabel: "NL", task: "Payment retry", evidence: "The retry uses the original request key to prevent a duplicate charge." },
  { id: "fieldworks", name: "Fieldworks", role: "Viewer", shortLabel: "FW", task: "Offline upload", evidence: "A failed upload retains its local draft for another attempt." },
];
const pages = [
  { id: "reviews", label: "Reviews", icon: "inbox" as const },
  { id: "workspace", label: "Workspace", icon: "settings" as const },
];

// Standalone example: reuse the existing provider and agent bridge in a host app.
export default function ApplicationShellRecipe() {
  const [workspaceId, setWorkspaceId] = useState("northstar");
  const [page, setPage] = useState("reviews");
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const workspace = workspaces.find(item => item.id === workspaceId)!;
  const canReview = workspace.role === "Owner";
  const complete = reviewed.includes(workspaceId);
  const navigate = (id: string) => { setPage(id); setNotice(""); };
  const switchWorkspace = (id: string) => {
    if (!workspaces.some(item => item.id === id)) return;
    setWorkspaceId(id);
    setPage("reviews");
    setNotice("");
  };
  const review = () => {
    if (!canReview || complete) return;
    setReviewed(current => [...current, workspaceId]);
    setNotice(`${workspace.task} marked reviewed in this local example.`);
  };
  const undo = () => {
    if (!canReview) return;
    setReviewed(current => current.filter(id => id !== workspaceId));
    setNotice(`${workspace.task} returned to review.`);
  };

  return <LiquidGlassProvider backdrop={<div style={{ width: "100%", height: "100%", background: "#d8e9ef" }} />}>
    <LiquidAppShell style={{ minHeight: 540 }}>
      <LiquidAppRail style={{ padding: 16 }}>
        <LiquidAppNavigation items={pages} activeId={page} onNavigate={navigate} />
      </LiquidAppRail>
      <LiquidAppWorkarea>
        <LiquidAppHeader style={{ display: "flex", alignItems: "center", padding: 16 }}>
          <LiquidWorkspaceSwitcher items={workspaces} value={workspaceId} onValueChange={switchWorkspace} />
        </LiquidAppHeader>
        <LiquidAppContent style={{ padding: 24 }}>
          {page === "reviews" ? <>
            <h1>Reviews</h1>
            <article aria-label={workspace.task}>
              <h2>{workspace.task}</h2>
              <p>{workspace.evidence}</p>
              <p>{complete ? "Reviewed" : "Ready for a review decision"}</p>
              <Button disabled={!canReview || complete} onClick={review}>Mark reviewed</Button>
              {complete && <Button onClick={undo}>Undo review</Button>}
              {!canReview && <p>Your Viewer role can inspect this example but cannot record a review.</p>}
            </article>
          </> : <>
            <h1>Workspace</h1>
            <dl><dt>Name</dt><dd>{workspace.name}</dd><dt>Example role</dt><dd>{workspace.role}</dd></dl>
            <p>These fictional memberships and decisions live in memory. The host supplies authentication, authorization and persistence.</p>
          </>}
          <output aria-live="polite">{notice}</output>
        </LiquidAppContent>
        <LiquidAppDock>
          {pages.map(item => <Button key={item.id} aria-current={page === item.id ? "page" : undefined} onClick={() => navigate(item.id)}>{item.label}</Button>)}
        </LiquidAppDock>
      </LiquidAppWorkarea>
    </LiquidAppShell>
  </LiquidGlassProvider>;
}
