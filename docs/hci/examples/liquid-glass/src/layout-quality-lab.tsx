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
type Report = Readonly<{
  revision: number; pass: boolean; findings: readonly QualityFinding[];
  placement: PopupPlacementReport | null; comparison: LayoutComparison | null;
  shifts: LayoutShiftReport | null;
}>;
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
function settle(elements: () => (Element | null)[], signal: AbortSignal): Promise<boolean> {
  return new Promise(resolve => {
    let frame = 0, stable = 0, previous = "", finished = false;
    const finish = (value: boolean) => {
      if (finished) return;
      finished = true; cancelAnimationFrame(frame); clearTimeout(timer); signal.removeEventListener("abort", aborted); resolve(value);
    };
    const aborted = () => finish(false);
    const timer = window.setTimeout(() => finish(false), 1500);
    const tick = () => {
      if (signal.aborted || document.hidden) { finish(false); return; }
      const nodes = elements().filter((node): node is Element => Boolean(node?.isConnected));
      const geometry = JSON.stringify(nodes.map(node => {
        const r = node.getBoundingClientRect();
        return [r.x, r.y, r.width, r.height].map(value => Math.round(value * 100) / 100);
      }));
      const animating = nodes.some(node => node.getAnimations().some(animation => {
        if (animation.playState !== "running") return false;
        const effect = animation.effect;
        if (!effect || !("getKeyframes" in effect)) return true;
        // Material color, shadow, and filter animations do not move a hit region.
        return (effect as KeyframeEffect).getKeyframes().some(keyframe => Object.keys(keyframe).some(property =>
          /^(transform|translate|scale|rotate|top|right|bottom|left|inset.*|(?:min|max)?(?:width|height)|margin.*|padding.*|border.*width|font.*|lineheight|letterspacing|wordspacing|gap|rowgap|columngap|grid.*|flex.*|offset(?:anchor|distance|path|position|rotate)|zoom)$/.test(property.replaceAll("-", "").toLowerCase()),
        ));
      }));
      stable = nodes.length && geometry === previous && !animating ? stable + 1 : 0;
      previous = geometry;
      if (stable >= 3) finish(true);
      else frame = requestAnimationFrame(tick);
    };
    signal.addEventListener("abort", aborted, { once: true });
    if (signal.aborted) finish(false); else frame = requestAnimationFrame(tick);
  });
}

export function LayoutQualityLab({ active = true }: { active?: boolean }) {
  const [open, setOpen] = useState(false);
  const [dialogReady, setDialogReady] = useState(false);
  const [baselineState, setBaselineState] = useState<"preparing" | "ready" | "unavailable">("preparing");
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
    setNotice("Preparing the healthy baseline. Waiting for stable control positions.");
    recorder.current?.stop(); recorder.current = null;
    const task = (async () => {
      // Closing content remains mounted until its SDK exit animation finishes.
      const settled = await settle(() => [root.current, trigger.current, peer.current, popup.current], controller.signal);
      if (!live.current || controller.signal.aborted || currentGeneration !== generation.current) return;
      if (!settled) {
        setBaselineState("unavailable");
        setNotice("Baseline not ready: the fixture did not settle within 1.5 seconds. Keep this tab visible, then reset the fixture.");
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
    const settled = await settle(() => [trigger.current, peer.current, popup.current], controller.signal);
    if (!live.current || controller.signal.aborted || currentGeneration !== generation.current) return;
    if (pending.current === controller) pending.current = null;
    const findings: QualityFinding[] = [];
    const issue = (code: string, message: string): QualityFinding => ({ code, message, severity: "error", targetId: "quality-popup" });
    let placement: PopupPlacementReport | null = null;
    let comparison: LayoutComparison | null = null;
    if (!settled) findings.push(issue("layout-unsettled", "Geometry did not settle within the bounded check window."));
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
    const next = { revision: ++revision.current, pass: settled && comparison?.passed === true && placement?.passed === true, findings, placement, comparison, shifts: recorder.current?.snapshot() ?? null };
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
    <DialogContent ref={root} className="qg-quality-fixture" data-layout-quality-fixture="" data-layout-scope="placement-lab" data-quality-baseline={baselineState} dir={direction}>
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
        <pre className="qg-quality-lab-report" data-layout-quality-report="" aria-label="Placement check report" tabIndex={0}>{JSON.stringify(report ?? { revision: revision.current, pass: false, findings: [], placement: null, shifts: null, status: "not-checked" }, null, 2)}</pre>
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
