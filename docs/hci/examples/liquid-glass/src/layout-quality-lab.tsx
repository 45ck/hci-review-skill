"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@ui-sdk/react/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@ui-sdk/react/dialog";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@ui-sdk/react/menu";
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@ui-sdk/react/select";
import {
  captureLayoutSnapshot, compareLayoutSnapshots, inspectPopupPlacement, observeLayoutShifts,
  type LayoutComparison, type LayoutSnapshot, type LayoutShiftObserver, type LayoutShiftReport,
  type PopupPlacementReport, type QualityFinding,
} from "@quantitative-hci/liquid-glass/quality";
import "./layout-quality-lab.css";

type Anchor = "top-start" | "top-end" | "bottom-start" | "bottom-end";
type Fault = "none" | "anchor-offset" | "overflow" | "overlap";
type SettleSample = Readonly<{
  origin: "animation-frame" | "timer";
  elapsedMs: number;
  changed: boolean;
  targets: readonly Readonly<{ id: string; rect: readonly number[] }>[];
  animations: readonly Readonly<{ id: string; properties: readonly string[] }>[];
}>;
type SettleEvidence = Readonly<{
  settled: boolean;
  reason: "stable" | "time-limit" | "document-hidden" | "aborted";
  blocker: "no-samples" | "no-targets" | "geometry-animation" | "insufficient-samples" | "geometry-changing" | "incomplete-stable-window" | null;
  budgetMs: number;
  elapsedMs: number;
  sampleCount: number;
  animationFrameSamples: number;
  timerSamples: number;
  stableSamples: number;
  requiredStableSamples: 3;
  visibility: DocumentVisibilityState;
  sampleLimit: 8;
  samples: readonly SettleSample[];
}>;
type Report = Readonly<{
  revision: number; pass: boolean; findings: readonly QualityFinding[];
  placement: PopupPlacementReport | null; comparison: LayoutComparison | null;
  shifts: LayoutShiftReport | null;
  settling?: SettleEvidence;
}>;
const BASELINE_SETTLE_MS = 5000;
const AUDIT_SETTLE_MS = 1500;
const directionOptions = [{ value: "ltr", label: "Left to right" }, { value: "rtl", label: "Right to left" }];
const anchorOptions = [
  { value: "top-start", label: "Top · start" }, { value: "top-end", label: "Top · end" },
  { value: "bottom-start", label: "Bottom · start" }, { value: "bottom-end", label: "Bottom · end" },
];
const contentOptions = [{ value: "short", label: "Short labels" }, { value: "long", label: "Long labels" }];
const faultOptions = [
  { value: "none", label: "Healthy layout" }, { value: "anchor-offset", label: "Displaced popup" },
  { value: "overflow", label: "Viewport overflow" }, { value: "overlap", label: "Popup overlaps trigger" },
];

function Choice({ label, value, items, onChange }: { label: string; value: string; items: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return <Select items={items} value={value} onValueChange={next => { if (next && items.some(item => item.value === next)) onChange(next); }}>
    <SelectLabel>{label}</SelectLabel>
    <SelectTrigger><SelectValue /></SelectTrigger>
    <SelectContent>{items.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
  </Select>;
}

/** Finite, passive settling: no CSS animation suppression or control mutations. */
function settle(elements: () => (Element | null)[], signal: AbortSignal, budgetMs: number): Promise<SettleEvidence> {
  return new Promise(resolve => {
    let frame = 0, wake = 0, sampleCount = 0, animationFrameSamples = 0, timerSamples = 0;
    let stable = 0, previous = "", finished = false;
    const startedAt = performance.now();
    const samples: SettleSample[] = [];
    const elapsed = () => Math.round((performance.now() - startedAt) * 100) / 100;
    const finish = (reason: SettleEvidence["reason"]) => {
      if (finished) return;
      finished = true; cancelAnimationFrame(frame); window.clearTimeout(wake); clearTimeout(timer); signal.removeEventListener("abort", aborted);
      const last = samples.at(-1);
      const blocker: SettleEvidence["blocker"] = reason !== "time-limit" ? null
        : !sampleCount ? "no-samples"
        : !last?.targets.length ? "no-targets"
        : last.animations.length ? "geometry-animation"
        : sampleCount < 4 ? "insufficient-samples"
        : last.changed ? "geometry-changing" : "incomplete-stable-window";
      resolve({
        settled: reason === "stable", reason, blocker, budgetMs, elapsedMs: elapsed(),
        sampleCount, animationFrameSamples, timerSamples, stableSamples: stable, requiredStableSamples: 3,
        visibility: document.visibilityState, sampleLimit: 8, samples,
      });
    };
    const aborted = () => finish("aborted");
    const timer = window.setTimeout(() => finish(document.hidden ? "document-hidden" : "time-limit"), budgetMs);
    const schedule = () => {
      let sampled = false;
      const sample = (origin: SettleSample["origin"]) => {
        if (finished || sampled) return;
        sampled = true;
        cancelAnimationFrame(frame); window.clearTimeout(wake);
        tick(origin);
      };
      frame = requestAnimationFrame(() => sample("animation-frame"));
      // Software rendering can delay paint callbacks while geometry is already stable.
      wake = window.setTimeout(() => sample("timer"), 50);
    };
    const tick = (origin: SettleSample["origin"]) => {
      if (signal.aborted) { finish("aborted"); return; }
      if (document.hidden) { finish("document-hidden"); return; }
      if (performance.now() - startedAt >= budgetMs) { finish("time-limit"); return; }
      sampleCount += 1;
      if (origin === "animation-frame") animationFrameSamples += 1; else timerSamples += 1;
      const nodes = elements().filter((node): node is Element => Boolean(node?.isConnected)).slice(0, 8);
      const targetId = (node: Element) => node.getAttribute("data-layout-probe") ?? node.getAttribute("data-layout-scope") ?? "fixture-region";
      const targets = nodes.map(node => {
        const r = node.getBoundingClientRect();
        return { id: targetId(node), rect: [r.x, r.y, r.width, r.height].map(value => Math.round(value * 100) / 100) };
      });
      const geometry = JSON.stringify(targets.map(target => target.rect));
      const animations: { id: string; properties: string[] }[] = [];
      for (const node of nodes) {
        const properties = new Set<string>();
        for (const animation of node.getAnimations()) {
          if (animation.playState !== "running") continue;
          const effect = animation.effect;
          if (!effect || !("getKeyframes" in effect)) { properties.add("unavailable"); continue; }
          // Material color, shadow, and filter animations do not move a hit region.
          for (const keyframe of (effect as KeyframeEffect).getKeyframes()) {
            for (const property of Object.keys(keyframe)) {
              if (/^(transform|translate|scale|rotate|top|right|bottom|left|inset.*|(?:min|max)?(?:width|height)|margin.*|padding.*|border.*width|font.*|lineheight|letterspacing|wordspacing|gap|rowgap|columngap|grid.*|flex.*|offset(?:anchor|distance|path|position|rotate)|zoom)$/.test(property.replaceAll("-", "").toLowerCase())) properties.add(property);
            }
          }
        }
        if (properties.size) animations.push({ id: targetId(node), properties: [...properties].slice(0, 16) });
      }
      const changed = geometry !== previous;
      stable = nodes.length && !changed && !animations.length ? stable + 1 : 0;
      previous = geometry;
      if (samples.length === 8) samples.shift();
      samples.push({ origin, elapsedMs: elapsed(), changed, targets, animations });
      if (stable >= 3) finish("stable");
      else schedule();
    };
    signal.addEventListener("abort", aborted, { once: true });
    if (signal.aborted) finish("aborted"); else schedule();
  });
}

export function LayoutQualityLab({ active = true }: { active?: boolean }) {
  const [open, setOpen] = useState(false);
  const [dialogReady, setDialogReady] = useState(false);
  const [baselineState, setBaselineState] = useState<"preparing" | "ready" | "unavailable">("preparing");
  const [baselineEvidence, setBaselineEvidence] = useState<SettleEvidence | null>(null);
  const [direction, setDirection] = useState<"ltr" | "rtl">("ltr");
  const [anchor, setAnchor] = useState<Anchor>("top-start");
  const [content, setContent] = useState("short");
  const [fault, setFault] = useState<Fault>("none");
  const [menuOpen, setMenuOpen] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [notice, setNotice] = useState("Open Quality actions, then choose Check placement inside the menu.");
  const root = useRef<HTMLDivElement | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const peer = useRef<HTMLButtonElement | null>(null);
  const popup = useRef<HTMLDivElement | null>(null);
  const baseline = useRef<LayoutSnapshot | null>(null);
  const preparing = useRef<Promise<void> | null>(null);
  const recorder = useRef<LayoutShiftObserver | null>(null);
  const pending = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const revision = useRef(0);
  const live = useRef(false);
  const align = anchor.endsWith("start") ? "start" : "end";

  function stopWork() {
    generation.current += 1;
    pending.current?.abort(); pending.current = null; preparing.current = null;
    recorder.current?.stop(); recorder.current = null;
  }
  function startRecorder() {
    recorder.current?.stop();
    recorder.current = observeLayoutShifts({ root: root.current, buffered: false, maxSamples: 128, maxDurationMs: 15000 });
  }
  async function resetBaseline() {
    const currentGeneration = ++generation.current;
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller;
    baseline.current = null;
    setBaselineState("preparing");
    setBaselineEvidence(null);
    setNotice("Preparing the healthy baseline. Waiting for stable control positions.");
    recorder.current?.stop(); recorder.current = null;
    const task = (async () => {
      // Closing content remains mounted until its SDK exit animation finishes.
      const settling = await settle(() => [root.current, trigger.current, peer.current, popup.current], controller.signal, BASELINE_SETTLE_MS);
      if (!live.current || controller.signal.aborted || currentGeneration !== generation.current) return;
      setBaselineEvidence(settling);
      if (!settling.settled) {
        setBaselineState("unavailable");
        setNotice(settling.reason === "document-hidden"
          ? "Baseline not ready: this tab became hidden. Return to the visible fixture, then reset it."
          : `Baseline not ready after 5 seconds: ${settling.blocker ?? settling.reason} (${settling.sampleCount} observations, ${settling.stableSamples}/3 stable). Inspect the preparation evidence below, then reset the fixture.`);
        return;
      }
      baseline.current = captureLayoutSnapshot(root.current, { scopeId: "placement-lab", maxTargets: 8 });
      if (baseline.current.status === "captured") {
        setBaselineState("ready");
        setNotice("Ready. Open Quality actions, then choose Check placement inside the menu.");
        startRecorder();
      } else {
        setBaselineState("unavailable");
        setNotice("Baseline unavailable: the stable controls could not be captured. Reset the fixture to try again.");
      }
    })();
    preparing.current = task;
    try { await task; }
    finally {
      if (preparing.current === task) preparing.current = null;
      if (pending.current === controller) pending.current = null;
    }
  }
  useEffect(() => {
    live.current = open && active;
    if (!open || !active) { stopWork(); setDialogReady(false); if (!active) setOpen(false); return; }
    setFault("none"); setMenuOpen(false); setReport(null);
    if (dialogReady) void resetBaseline();
    else {
      baseline.current = null;
      setBaselineState("preparing");
      setBaselineEvidence(null);
      setNotice("Preparing the fixture. Waiting for the dialog to finish opening.");
    }
    return () => { live.current = false; stopWork(); };
  }, [open, active, dialogReady, direction, anchor, content]);

  async function reset() {
    setFault("none"); setMenuOpen(false); setReport(null);
    await resetBaseline();
  }
  async function audit() {
    const currentGeneration = generation.current;
    // Checking immediately after a configuration change must not cancel its baseline.
    await preparing.current;
    if (!live.current || currentGeneration !== generation.current) return;
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller;
    const settling = await settle(() => [trigger.current, peer.current, popup.current], controller.signal, AUDIT_SETTLE_MS);
    if (!live.current || controller.signal.aborted || currentGeneration !== generation.current) return;
    if (pending.current === controller) pending.current = null;
    const findings: QualityFinding[] = [];
    const issue = (code: string, message: string): QualityFinding => ({ code, message, severity: "error", targetId: "quality-popup" });
    let placement: PopupPlacementReport | null = null;
    let comparison: LayoutComparison | null = null;
    if (!settling.settled) findings.push({ ...issue("layout-unsettled", "Geometry did not settle within the bounded check window."), values: {
      reason: settling.reason, blocker: settling.blocker, sampleCount: settling.sampleCount,
      animationFrameSamples: settling.animationFrameSamples, timerSamples: settling.timerSamples,
      stableSamples: settling.stableSamples, elapsedMs: settling.elapsedMs, budgetMs: settling.budgetMs,
    } });
    if (!baseline.current) findings.push(issue("missing-baseline", "Reset the fixture to capture a healthy baseline."));
    else {
      comparison = compareLayoutSnapshots(baseline.current, captureLayoutSnapshot(root.current, { scopeId: "placement-lab", maxTargets: 8 }), {
        nonOverlapping: [["quality-anchor", "quality-peer"]],
        expectedChanges: [{
          id: "quality-popup", properties: ["presence", "visibility", "x", "y", "width", "height"],
          reason: "The SDK menu deliberately opens after the baseline; its geometry is checked separately against the placement policy.",
        }],
      });
      findings.push(...comparison.findings);
    }
    if (!menuOpen || !popup.current?.isConnected || !trigger.current?.isConnected) findings.push(issue("missing-popup", "Open Quality actions and choose Check placement while the menu is visible."));
    else {
      const visual = window.visualViewport;
      placement = inspectPopupPlacement({
        targetId: "quality-popup", trigger: trigger.current.getBoundingClientRect(), popup: popup.current.getBoundingClientRect(),
        viewport: { x: visual?.offsetLeft ?? 0, y: visual?.offsetTop ?? 0, width: visual?.width ?? innerWidth, height: visual?.height ?? innerHeight },
        actualSide: popup.current.dataset.side ?? null, actualAlign: popup.current.dataset.align ?? null,
        preferredSide: "bottom", align, direction, gapPx: 8, collisionPaddingPx: 8, tolerancePx: 1,
      });
      findings.push(...placement.findings);
    }
    const next = { revision: ++revision.current, pass: settling.settled && comparison?.passed === true && placement?.passed === true, findings, placement, comparison, shifts: recorder.current?.snapshot() ?? null,
      ...(!settling.settled ? { settling } : {}),
    };
    setReport(next);
    setNotice(next.pass ? "Placement and stable hit regions passed this check." : `Detected ${findings.length} finding${findings.length === 1 ? "" : "s"}. Inspect the report below.`);
  }

  return <Dialog open={open}
    onOpenChange={(next, details) => {
      if (next && !active) details.cancel();
      else { setDialogReady(false); setBaselineState("preparing"); setOpen(next); }
    }}
    onOpenChangeComplete={next => { if (next && active) setDialogReady(true); }}>
    <div className="qg-quality-entry">
      <div><strong>Placement lab</strong><p>Exercise real SDK menus at the viewport edges. Inject a fault to check that the detector catches it.</p></div>
      <DialogTrigger disabled={!active}>Open placement lab</DialogTrigger>
    </div>
    <DialogContent ref={root} className="qg-quality-fixture" data-layout-quality-fixture="" data-layout-scope="placement-lab" data-quality-baseline={baselineState} data-quality-settle={baselineEvidence ? JSON.stringify(baselineEvidence) : undefined} dir={direction}>
      <div className="qg-quality-lab-panel" dir="ltr">
        <div className="qg-quality-lab-heading"><div><DialogTitle>Layout quality fixtures</DialogTitle><span>Unvalidated · local test fixtures</span></div><DialogClose aria-label="Close placement lab">Close</DialogClose></div>
        <DialogDescription>Leading actions align to the logical start; trailing actions align to the end. This lab prefers below and lets the SDK flip above when space runs out.</DialogDescription>
        <div className="qg-quality-choices">
          <Choice label="Fixture direction" value={direction} items={directionOptions} onChange={value => setDirection(value as "ltr" | "rtl")} />
          <Choice label="Fixture anchor" value={anchor} items={anchorOptions} onChange={value => setAnchor(value as Anchor)} />
          <Choice label="Fixture content" value={content} items={contentOptions} onChange={setContent} />
          <Choice label="Fixture fault" value={fault} items={faultOptions} onChange={value => { setFault(value as Fault); setReport(null); setNotice(value === "none" ? "Healthy placement selected." : "Deliberate fixture fault enabled. Check the open menu to detect it."); }} />
        </div>
        <div className="qg-quality-lab-actions"><Button onClick={audit} disabled={baselineState !== "ready"}>Run layout check</Button><Button onClick={reset}>Reset quality fixture</Button></div>
        <p className="qg-quality-lab-notice" role="status">{notice}</p>
        <pre className="qg-quality-lab-report" data-layout-quality-report="" aria-label="Placement check report" tabIndex={0}>{JSON.stringify(report ?? {
          revision: revision.current, pass: false, findings: [], placement: null, shifts: null,
          status: baselineState === "unavailable" ? "baseline-unavailable" : "not-checked",
          ...(baselineState === "unavailable" ? { baselinePreparation: baselineEvidence } : {}),
        }, null, 2)}</pre>
      </div>
      <div className="qg-quality-pair" data-quality-pair="" data-anchor={anchor}>
        <Button ref={peer} data-quality-peer="" data-layout-probe="quality-peer" onClick={() => setNotice("Primary action accepted. The action group remains in place.")}>Primary action</Button>
        <Menu open={menuOpen} onOpenChange={(next, details) => {
          if (next && (!active || !dialogReady || baselineState !== "ready")) details.cancel();
          else setMenuOpen(next);
        }} modal={false}>
          <MenuTrigger ref={trigger} data-quality-anchor="" data-layout-probe="quality-anchor" disabled={baselineState !== "ready"}>Quality actions</MenuTrigger>
          <MenuContent ref={popup} className="qg-quality-popup" data-quality-popup="" data-layout-probe="quality-popup" data-fault={fault} dir={direction} side="bottom" align={align} sideOffset={8} collisionPadding={8}>
            <MenuItem value="check-placement" closeOnSelect={false} onSelect={audit} disabled={baselineState !== "ready"}>Check placement</MenuItem>
            <MenuItem value="inspect" onSelect={() => setNotice("Inspect action accepted.")}>{content === "long" ? "Inspect the complete review history and all related workspace details" : "Inspect details"}</MenuItem>
            <MenuItem value="copy" onSelect={() => setNotice("Reference prepared locally; no clipboard data was changed.")}>{content === "long" ? "Prepare a reference for the currently selected workspace record" : "Prepare reference"}</MenuItem>
          </MenuContent>
        </Menu>
      </div>
    </DialogContent>
  </Dialog>;
}
