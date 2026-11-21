"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { canRecordReview, initialLayoutNavigation, transitionLayout, type LayoutSpaceId as SpaceId, type LayoutRouteId as RouteId } from "./layouts-state";
import {
  ArrowLeft, Check, ChevronDown, ChevronRight,
  MoreHorizontal, Search, X
} from "lucide-react";
import { LiquidIcon } from "@quantitative-hci/liquid-glass/icons";
import { Button } from "@ui-sdk/react/button";
import { Input } from "@ui-sdk/react/input";
import { Field, FieldLabel } from "@ui-sdk/react/field";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@ui-sdk/react/menu";
import {
  Dialog, DialogBackdrop, DialogClose, DialogContent,
  DialogTitle, DialogTrigger
} from "@ui-sdk/react/dialog";
import {
  SegmentedControl, SegmentedControlIndicator, SegmentedControlItem
} from "@ui-sdk/react/segmented-control";
import { Tabs, TabsList, TabsTab, TabsPanel, TabsIndicator } from "@ui-sdk/react/tabs";
import { Switch, SwitchThumb } from "@ui-sdk/react/switch";
import "./layouts-showcase.css";

type Review = Readonly<{
  id: string; project: string; title: string; summary: string;
  evidence: string; owner: string; changed: string;
}>;

const spaces: ReadonlyArray<{ id: SpaceId; name: string; role: "Owner" | "Viewer"; short: string }> = [
  { id: "northstar", name: "Northstar Lab", role: "Owner", short: "NL" },
  { id: "fieldworks", name: "Fieldworks", role: "Viewer", short: "FW" }
];
const reviewsBySpace: Record<SpaceId, ReadonlyArray<Review>> = {
  northstar: [
    {
      id: "REL-204", project: "Member portal", title: "Payment retry",
      summary: "Confirm that retrying a payment cannot charge the same invoice twice.",
      evidence: "One failure-path test needs a decision before this change is released.",
      owner: "Mika L.", changed: "Today"
    },
    {
      id: "REL-198", project: "Member portal", title: "Account recovery",
      summary: "Review the account recovery path after an expired link.",
      evidence: "The expiry message and return path are ready for a final check.",
      owner: "Jo R.", changed: "Yesterday"
    },
    {
      id: "REL-191", project: "Operations", title: "Export access",
      summary: "Confirm only permitted members can export organisation records.",
      evidence: "A denied-permission example has been added to the acceptance cases.",
      owner: "Sam A.", changed: "19 Nov"
    }
  ],
  fieldworks: [
    {
      id: "OPS-114", project: "Field reports", title: "Offline upload",
      summary: "Check what field staff see when a report cannot be uploaded.",
      evidence: "The retry and local-draft cases still need a final review.",
      owner: "Ari S.", changed: "Today"
    },
    {
      id: "OPS-109", project: "Field reports", title: "Supervisor access",
      summary: "Confirm that supervisors can inspect reports without editing them.",
      evidence: "The read-only path was added to the sample test plan.",
      owner: "Dana F.", changed: "20 Nov"
    }
  ]
};
const membersBySpace: Record<SpaceId, ReadonlyArray<{ name: string; role: string; scope: string }>> = {
  northstar: [
    { name: "Alex Morgan", role: "Owner", scope: "Workspace management" },
    { name: "Mika Lane", role: "Editor", scope: "Review and delivery" },
    { name: "Jo Reed", role: "Viewer", scope: "Read-only access" }
  ],
  fieldworks: [
    { name: "Alex Morgan", role: "Viewer", scope: "Read-only access" },
    { name: "Ari Singh", role: "Owner", scope: "Workspace management" }
  ]
};
const navigation: ReadonlyArray<{ id: RouteId; label: string; icon: "inbox" | "folder" | "layers" | "settings" }> = [
  { id: "reviews", label: "Reviews", icon: "inbox" },
  { id: "projects", label: "Projects", icon: "folder" },
  { id: "people", label: "People", icon: "layers" },
  { id: "workspace", label: "Workspace settings", icon: "settings" }
];
const routes: ReadonlyArray<{ id: RouteId; label: string }> = [
  ...navigation.map(({ id, label }) => ({ id, label })),
  { id: "account", label: "Your account" }
];

export function LayoutsShowcase() {
  const [device, setDevice] = useState<"wide" | "phone">("wide");
  const [layoutState, dispatch] = useReducer(transitionLayout, initialLayoutNavigation);
  const { spaceId, route, selectedId, detailOpen, filter, query, projectFilter, scenario } = layoutState;
  const [reviewed, setReviewed] = useState<Record<SpaceId, string[]>>({ northstar: [], fieldworks: [] });
  const [accountName, setAccountName] = useState("Alex Morgan");
  const [accountDraft, setAccountDraft] = useState("Alex Morgan");
  const [digest, setDigest] = useState(true);
  const [notice, setNotice] = useState("");
  const [lastReviewed, setLastReviewed] = useState<string | null>(null);
  const [command, setCommand] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const detailHeading = useRef<HTMLHeadingElement | null>(null);
  const space = spaces.find((item) => item.id === spaceId)!;
  const canReview = space.role === "Owner";
  const records = reviewsBySpace[spaceId];
  const totalOpen = records.filter((item) => !reviewed[spaceId].includes(item.id)).length;
  const matching = useMemo(() => records.filter((record) => {
    if (projectFilter && record.project !== projectFilter) return false;
    if (filter === "open" && reviewed[spaceId].includes(record.id)) return false;
    if (filter === "reviewed" && !reviewed[spaceId].includes(record.id)) return false;
    const terms = (record.title + " " + record.id + " " + record.project + " " + record.summary).toLocaleLowerCase();
    return terms.includes(query.trim().toLocaleLowerCase());
  }), [spaceId, records, reviewed, filter, query, projectFilter]);
  const selected = matching.find((item) => item.id === selectedId) ?? null;
  const projectNames = [...new Set(records.map((record) => record.project))];
  useEffect(() => {
    if (detailOpen && device === "phone") detailHeading.current?.focus();
  }, [detailOpen, device]);
  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); setCommandOpen(true);
      }
      if (event.key === "Escape" && detailOpen) dispatch({ type: "close-detail" });
    }
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [detailOpen]);

  function navigate(next: RouteId) {
    dispatch({ type: "navigate", route: next }); setNotice("");
    if (next === "account") setAccountDraft(accountName);
  }
  function switchSpace(next: SpaceId) {
    if (next === spaceId) return;
    dispatch({ type: "switch-space", spaceId: next, firstRecordId: reviewsBySpace[next][0]?.id ?? null });
    setLastReviewed(null); setNotice("Switched to " + spaces.find((item) => item.id === next)!.name + ".");
  }
  function inspect(id: string) { dispatch({ type: "inspect", recordId: id }); }
  function markReviewed() {
    if (!selected || !canRecordReview(space.role, selected.id, reviewed[spaceId])) return;
    const id = selected.id;
    setReviewed((before) => ({ ...before, [spaceId]: [...before[spaceId], id] }));
    setLastReviewed(id);
    setNotice(id + " marked reviewed in this local example.");
    dispatch({ type: "close-detail" });
  }
  function undoReview() {
    if (!lastReviewed || !canReview) return;
    setReviewed((before) => ({ ...before, [spaceId]: before[spaceId].filter((id) => id !== lastReviewed) }));
    setNotice(lastReviewed + " returned to the review queue.");
    dispatch({ type: "filter", value: "open" }); setLastReviewed(null);
  }
  function openProject(name: string) {
    dispatch({ type: "open-project", name }); setNotice("");
  }
  function openRouteFromSearch(id: RouteId) {
    navigate(id); setCommandOpen(false); setCommand("");
  }

  return (
    <section className="qg-layout-study" data-validation="unvalidated" aria-label="Responsive application layout study">
      <div className="qg-layout-toolbar">
        <SegmentedControl aria-label="Preview width" value={device} onValueChange={(value) => {
          if (value === "wide" || value === "phone") { setDevice(value); dispatch({ type: "close-detail" }); }
        }}>
          <SegmentedControlIndicator />
          <SegmentedControlItem value="wide">Desktop</SegmentedControlItem>
          <SegmentedControlItem value="phone">Phone</SegmentedControlItem>
        </SegmentedControl>
        <Menu>
          <MenuTrigger aria-label="Preview application state">
            State <ChevronDown size={15} aria-hidden="true" />
          </MenuTrigger>
          <MenuContent>
            <MenuItem onClick={() => dispatch({ type: "scenario", value: "ready" })}>Ready</MenuItem>
            <MenuItem onClick={() => dispatch({ type: "scenario", value: "empty" })}>No results</MenuItem>
            <MenuItem onClick={() => dispatch({ type: "scenario", value: "loading" })}>Loading</MenuItem>
            <MenuItem onClick={() => dispatch({ type: "scenario", value: "error" })}>Unavailable</MenuItem>
          </MenuContent>
        </Menu>
        <span className="qg-layout-fixture">Fictional data</span>
      </div>

      <div className="qg-layout-canvas" data-size={device}>
        <div className="qg-app" data-app-screen={route} data-details-open={detailOpen} data-preview-size={device} data-has-detail={route === "reviews" && selected !== null && scenario === "ready"}>
          <aside className="qg-app-rail" aria-label="Workspace navigation">
            <div className="qg-app-identity">
              <span className="qg-app-symbol"><LiquidIcon name="layers" size={26} /></span>
              <strong>Quantive</strong>
            </div>
            <nav className="qg-app-navigation" aria-label="Workspace pages">
              {navigation.map((item) => (
                <Button key={item.id} className="qg-app-nav-button" aria-label={item.label} aria-current={route === item.id ? "page" : undefined}
                  onClick={() => navigate(item.id)}>
                  <LiquidIcon name={item.icon} size={22} /><span>{item.label}</span>
                  {item.id === "reviews" && totalOpen > 0 && <span className="qg-app-nav-count">{totalOpen}</span>}
                </Button>
              ))}
            </nav>
            <p className="qg-app-rail-end">Sample application</p>
          </aside>

          <div className="qg-app-workarea">
            <header className="qg-app-header" data-liquid-glass="" data-liquid-kind="panel">
              <Menu>
                <MenuTrigger className="qg-app-space-menu" aria-label={"Current workspace: " + space.name + ". Switch workspace"}>
                  <span className="qg-app-workspace-avatar">{space.short}</span>
                  <span className="qg-app-space-label">{space.name}</span>
                  <ChevronDown size={15} aria-hidden="true" />
                </MenuTrigger>
                <MenuContent>
                  {spaces.map((item) => (
                    <MenuItem key={item.id} onClick={() => switchSpace(item.id)}>
                      <span className="qg-app-menu-space">{item.name}</span>
                      <span className="qg-app-menu-role">{item.role}</span>
                      {item.id === spaceId && <Check size={15} aria-hidden="true" />}
                    </MenuItem>
                  ))}
                </MenuContent>
              </Menu>
              <span className="qg-app-header-spacer" />
              <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
                <DialogTrigger aria-label="Search application pages" className="qg-app-icon-control">
                  <Search size={18} aria-hidden="true" />
                </DialogTrigger>
                <DialogBackdrop />
                <DialogContent className="qg-app-search-dialog">
                  <DialogTitle>Find a page</DialogTitle>
                  <Input aria-label="Search pages" placeholder="Search pages" value={command} onValueChange={setCommand}/>
                  <div className="qg-app-search-results">
                    {routes.filter((item) => item.label.toLocaleLowerCase().includes(command.toLocaleLowerCase())).map((item) => (
                      <Button key={item.id} onClick={() => openRouteFromSearch(item.id)}>
                        {item.label} <ChevronRight size={16} aria-hidden="true" />
                      </Button>
                    ))}
                    {routes.every((item) => !item.label.toLocaleLowerCase().includes(command.toLocaleLowerCase()))
                      && <p role="status">No matching pages.</p>}
                  </div>
                  <DialogClose>Close</DialogClose>
                </DialogContent>
              </Dialog>
              <Menu>
                <MenuTrigger className="qg-app-icon-control" aria-label="Notifications">
                  <LiquidIcon name="bell" size={24} />
                </MenuTrigger>
                <MenuContent>
                  <MenuItem onClick={() => navigate("reviews")}>Open reviews ({totalOpen})</MenuItem>
                  <MenuItem onClick={() => navigate("account")}>Notification preferences</MenuItem>
                </MenuContent>
              </Menu>
              <Menu>
                <MenuTrigger className="qg-app-account-trigger" aria-label="Open account menu">
                  <span aria-hidden="true">AM</span>
                </MenuTrigger>
                <MenuContent>
                  <MenuItem onClick={() => navigate("account")}>Your account</MenuItem>
                  <MenuItem onClick={() => navigate("workspace")}>Workspace settings</MenuItem>
                </MenuContent>
              </Menu>
            </header>

            <main className="qg-app-main" id="qg-layout-main">
              {route === "reviews" && (
                <div className="qg-app-page">
                  <div className="qg-app-heading">
                    <h2>Reviews</h2>
                    <span className="qg-app-count">{totalOpen} need attention</span>
                  </div>
                  {projectFilter && <div className="qg-app-filter-chip">
                    <span>{projectFilter}</span>
                    <Button aria-label="Show reviews from all projects" onClick={() => { dispatch({ type: "clear-project" }); }}>
                      <X size={16} aria-hidden="true" />
                    </Button>
                  </div>}
                  <div className="qg-app-query">
                    <Input aria-label="Search reviews" placeholder="Search reviews" value={query} onValueChange={(value) => dispatch({ type: "query", value })} />
                    <SegmentedControl aria-label="Review filter" value={filter} onValueChange={(value) => {
                      if (value === "open" || value === "all" || value === "reviewed") dispatch({ type: "filter", value });
                    }}>
                      <SegmentedControlIndicator />
                      <SegmentedControlItem value="open">To review</SegmentedControlItem>
                      <SegmentedControlItem value="all">All</SegmentedControlItem>
                      <SegmentedControlItem value="reviewed">Done</SegmentedControlItem>
                    </SegmentedControl>
                  </div>
                  {scenario === "loading" ? (
                    <div className="qg-app-state" role="status"><strong>Loading reviews</strong><p>The current workspace is being refreshed.</p>
                      <Button onClick={() => dispatch({ type: "scenario", value: "ready" })}>Show example data</Button>
                    </div>
                  ) : scenario === "error" ? (
                    <div className="qg-app-state" role="alert"><strong>Reviews are unavailable</strong><p>Nothing has changed. Try loading this workspace again.</p>
                      <Button onClick={() => dispatch({ type: "scenario", value: "ready" })}>Retry</Button>
                    </div>
                  ) : scenario === "empty" || matching.length === 0 ? (
                    <div className="qg-app-state" role="status">
                      <LiquidIcon name="inbox" size={40}/>
                      <strong>{scenario === "empty" ? "No reviews here yet" : "No matching reviews"}</strong>
                      <p>{scenario === "empty" ? "This preview state has no records." : "Clear the filters to see the full queue."}</p>
                      <Button onClick={() => { dispatch({ type: "show-all" }); }}>Show all reviews</Button>
                    </div>
                  ) : (
                    <div className="qg-app-list" aria-label="Reviews">
                      {matching.map((record) => {
                        const done = reviewed[spaceId].includes(record.id);
                        return <Button key={record.id} className="qg-app-review-row"
                          aria-label={"Inspect " + record.title} aria-pressed={selectedId === record.id}
                          onClick={() => inspect(record.id)}>
                          <span className="qg-app-row-main">
                            <span className="qg-app-row-id">{record.id} · {record.project}</span>
                            <strong>{record.title}</strong>
                            <span>{record.summary}</span>
                          </span>
                          <span className="qg-app-row-end">
                            <span>{done ? "Reviewed" : record.changed}</span>
                            {done ? <Check size={18} aria-hidden="true"/> : <ChevronRight size={18} aria-hidden="true"/>}
                          </span>
                        </Button>;
                      })}
                    </div>
                  )}
                </div>
              )}
              {route === "projects" && (
                <div className="qg-app-page">
                  <div className="qg-app-heading"><h2>Projects</h2></div>
                  <div className="qg-app-project-list">
                    {projectNames.map((name) => <Button key={name} className="qg-app-project-row" onClick={() => openProject(name)}>
                      <LiquidIcon name="folder" size={32}/>
                      <span><strong>{name}</strong><small>{records.filter((r) => r.project === name).length} reviews</small></span>
                      <ChevronRight size={18} aria-hidden="true" />
                    </Button>)}
                  </div>
                </div>
              )}
              {route === "people" && (
                <div className="qg-app-page">
                  <div className="qg-app-heading"><h2>People</h2><span className="qg-app-count">{membersBySpace[spaceId].length} members</span></div>
                  <div className="qg-app-member-list">
                    {membersBySpace[spaceId].map((person) => <div className="qg-app-member" key={person.name}>
                      <span className="qg-app-member-avatar" aria-hidden="true">{person.name.split(" ").map((part) => part[0]).join("")}</span>
                      <span><strong>{person.name}</strong><small>{person.scope}</small></span>
                      <span>{person.role}</span>
                    </div>)}
                  </div>
                  <p className="qg-app-helper">Membership changes require a connected identity service. This example only displays roles.</p>
                </div>
              )}
              {route === "workspace" && (
                <div className="qg-app-page qg-app-settings">
                  <div className="qg-app-heading"><h2>Workspace settings</h2></div>
                  <div className="qg-app-form-grid">
                    <Field><FieldLabel>Organisation</FieldLabel><Input value={space.name} readOnly /></Field>
                    <Field><FieldLabel>Workspace ID</FieldLabel><Input value={space.id} readOnly /></Field>
                  </div>
                  <div className="qg-app-section-rule">
                    <strong>Your access</strong><p>{space.role} · {canReview ? "Review changes" : "View records only"}</p>
                  </div>
                  <p className="qg-app-helper">Your account is separate from this organisation. Access and billing changes require a connected backend.</p>
                </div>
              )}
              {route === "account" && (
                <div className="qg-app-page qg-app-settings">
                  <div className="qg-app-heading"><h2>Your account</h2></div>
                  <Tabs defaultValue="profile">
                    <TabsList aria-label="Account settings">
                      <TabsTab value="profile">Profile</TabsTab>
                      <TabsTab value="alerts">Notifications</TabsTab>
                      <TabsTab value="security">Security</TabsTab>
                      <TabsIndicator />
                    </TabsList>
                    <TabsPanel value="profile" className="qg-app-tab-body">
                      <form onSubmit={(event) => { event.preventDefault(); const name = accountDraft.trim(); if (!name) return; setAccountName(name); setNotice("Profile name changed in this local example."); }}>
                        <Field><FieldLabel>Name</FieldLabel>
                          <Input required aria-label="Account name" value={accountDraft} onValueChange={setAccountDraft} />
                        </Field>
                        <Button type="submit" disabled={!accountDraft.trim() || accountDraft.trim() === accountName}>Save name</Button>
                      </form>
                    </TabsPanel>
                    <TabsPanel value="alerts" className="qg-app-tab-body">
                      <div className="qg-app-setting-row">
                        <span><strong>Weekly email summary</strong><small>One digest of the workspaces you belong to.</small></span>
                        <Switch aria-label="Weekly email summary" checked={digest} onCheckedChange={(value) => { setDigest(value); setNotice("Preference updated in this local example."); }}><SwitchThumb /></Switch>
                      </div>
                    </TabsPanel>
                    <TabsPanel value="security" className="qg-app-tab-body">
                      <div className="qg-app-section-rule">
                        <strong>Sessions</strong>
                        <p>Session management needs a connected authentication provider.</p>
                        <Button disabled>Manage sessions</Button>
                      </div>
                    </TabsPanel>
                  </Tabs>
                </div>
              )}
              {notice && <div className="qg-app-notice" role="status">
                <span>{notice}</span>
                {lastReviewed && notice.includes("marked reviewed") && <Button onClick={undoReview}>Undo</Button>}
                <Button aria-label="Dismiss message" onClick={() => { setNotice(""); setLastReviewed(null); }}><X size={15} aria-hidden="true"/></Button>
              </div>}
            </main>
            <nav className="qg-app-bottom-nav" aria-label="Mobile workspace navigation" data-liquid-glass="" data-liquid-kind="panel">
              <Button onClick={() => navigate("reviews")} aria-current={route === "reviews" ? "page" : undefined}>
                <LiquidIcon name="inbox" size={24}/> Reviews
              </Button>
              <Button onClick={() => navigate("projects")} aria-current={route === "projects" ? "page" : undefined}>
                <LiquidIcon name="folder" size={24}/> Projects
              </Button>
              <Menu>
                <MenuTrigger aria-label="More pages"><MoreHorizontal size={22} aria-hidden="true" />More</MenuTrigger>
                <MenuContent>
                  <MenuItem onClick={() => navigate("people")}>People</MenuItem>
                  <MenuItem onClick={() => navigate("workspace")}>Workspace settings</MenuItem>
                  <MenuItem onClick={() => navigate("account")}>Your account</MenuItem>
                </MenuContent>
              </Menu>
            </nav>
          </div>
          {route === "reviews" && selected && scenario === "ready" && (
            <aside className="qg-app-detail" aria-label="Selected review" data-open={detailOpen}>
              <div className="qg-app-detail-head">
                <Button className="qg-app-back" onClick={() => dispatch({ type: "close-detail" })}>
                  <ArrowLeft size={17} aria-hidden="true"/> Reviews
                </Button>
                <span>{selected.id}</span>
                <Menu>
                  <MenuTrigger className="qg-app-icon-control" aria-label="Review actions">
                    <MoreHorizontal size={18} aria-hidden="true" />
                  </MenuTrigger>
                  <MenuContent>
                    <MenuItem onClick={() => setNotice("Reference: " + selected.id)}>Show reference</MenuItem>
                    <MenuItem onClick={() => dispatch({ type: "close-detail" })}>Close details</MenuItem>
                  </MenuContent>
                </Menu>
              </div>
              <h3 tabIndex={-1} ref={detailHeading}>{selected.title}</h3>
              <p className="qg-app-detail-summary">{selected.summary}</p>
              <div className="qg-app-detail-section">
                <span>Review evidence</span>
                <p>{selected.evidence}</p>
              </div>
              <dl className="qg-app-detail-facts">
                <div><dt>Project</dt><dd>{selected.project}</dd></div>
                <div><dt>Owner</dt><dd>{selected.owner}</dd></div>
                <div><dt>Status</dt><dd>{reviewed[spaceId].includes(selected.id) ? "Reviewed" : "Needs review"}</dd></div>
              </dl>
              <div className="qg-app-detail-action">
                {reviewed[spaceId].includes(selected.id)
                  ? <p role="status"><Check size={18} aria-hidden="true" /> Reviewed in this example</p>
                  : <>
                    <Button onClick={markReviewed} disabled={!canReview}>Mark reviewed</Button>
                    {!canReview && <p>You have view-only access in {space.name}.</p>}
                  </>}
              </div>
            </aside>
          )}
        </div>
      </div>
      <p className="qg-layout-footer">
        This example uses the gallery's real UI SDK, Quantive icons, fonts and Liquid Glass provider.
        Changes stay in page memory. Login, tenant isolation and persistence are not implemented.
      </p>
    </section>
  );
}
