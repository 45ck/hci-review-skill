"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@ui-sdk/react/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@ui-sdk/react/collapsible";
import { captureLayoutSnapshot, compareLayoutSnapshots, type LayoutComparison, type LayoutSnapshot } from "./geometry";
import { observeLayoutShifts, type LayoutShiftObserver, type LayoutShiftReport } from "./observer";

/** Read-only, bounded diagnostics. SDK child controls own every user/agent action. */
export function LiquidLayoutDiagnostics({
  target, label = "Layout diagnostics", active = true, defaultOpen = false, children,
}: {
  target: () => Element | null;
  label?: string;
  active?: boolean;
  defaultOpen?: boolean;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [baseline, setBaseline] = useState<LayoutSnapshot | null>(null);
  const [comparison, setComparison] = useState<LayoutComparison | null>(null);
  const [shifts, setShifts] = useState<LayoutShiftReport | null>(null);
  const [message, setMessage] = useState("Capture a baseline before checking stable controls.");
  const observer = useRef<LayoutShiftObserver | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; observer.current?.stop(); observer.current = null; };
  }, []);
  useEffect(() => {
    if (!active || !open) {
      const result = observer.current?.stop();
      observer.current = null;
      if (result) setShifts(result);
    }
  }, [active, open]);

  function capture() {
    const result = captureLayoutSnapshot(target(), { scopeId: "application-layout", maxTargets: 64 });
    setBaseline(result); setComparison(null);
    setMessage(result.status === "captured" ? `${result.targets.length} stable controls captured. Interact, then check for changes.` : "A complete baseline could not be captured. Inspect the report.");
  }
  function check() {
    if (!baseline) { setMessage("Capture a baseline first."); return; }
    const result = compareLayoutSnapshots(baseline, captureLayoutSnapshot(target(), { scopeId: "application-layout", maxTargets: 64 }));
    setComparison(result);
    setMessage(result.passed === true ? "No unexpected movement in the captured controls." : result.passed === false ? "Unexpected layout changes detected. Inspect the findings." : "These captures cannot establish stability. Capture a fresh baseline in the current viewport.");
  }
  function start() {
    observer.current?.stop();
    observer.current = observeLayoutShifts({ root: target(), maxSamples: 128, maxDurationMs: 15000, buffered: false,
      onUpdate: result => { if (mounted.current) setShifts(result); },
    });
    setShifts(observer.current.snapshot());
    setMessage(observer.current.supported ? "Recording for up to 15 seconds. Recent-input shifts are reported separately." : "Layout Instability API is unavailable in this browser. Geometry checks still work.");
  }
  function stop() {
    const result = observer.current?.stop();
    observer.current = null;
    if (result) setShifts(result);
    setMessage("Recording stopped. Scores describe only this observed window.");
  }
  const report = { baseline, comparison, shifts };
  const recording = shifts?.supported && shifts.observation?.stopped === false;
  return <Collapsible className="qg-layout-diagnostics" open={open} onOpenChange={setOpen} disabled={!active} data-validation="unvalidated">
    <CollapsibleTrigger className="qg-layout-diagnostics-trigger" aria-label={label}><span>{label}</span><span className="qg-layout-diagnostics-tag">Unvalidated</span></CollapsibleTrigger>
    <CollapsiblePanel>
      <div className="qg-layout-diagnostics-body">
        <p>Check stable controls while using the application. Resizing or zooming requires a fresh baseline. Geometry checks and observed-window CLS measure different things.</p>
        <div className="qg-layout-diagnostics-actions">
          <Button onClick={capture} disabled={!active}>Capture baseline</Button>
          <Button onClick={check} disabled={!active || baseline?.status !== "captured"}>Check layout changes</Button>
          <Button onClick={start} disabled={!active || Boolean(recording)}>Start shift recording</Button>
          <Button onClick={stop} disabled={!recording}>Stop shift recording</Button>
          <Button disabled={!active || (!baseline && !shifts)} onClick={async () => {
            try {
              await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
              if (mounted.current) setMessage("Layout report copied.");
            } catch {
              if (mounted.current) setMessage("Clipboard unavailable. The report below remains selectable.");
            }
          }}>Copy layout report</Button>
        </div>
        <p className="qg-layout-diagnostics-status" role="status">{message}</p>
        {shifts && <dl className="qg-layout-diagnostics-metrics">
          <div><dt>Observed-window CLS</dt><dd>{shifts.cls === null ? "Unavailable" : shifts.cls.toFixed(5)}</dd></div>
          <div><dt>Recent-input shift value</dt><dd>{shifts.recentInputShiftValue === null ? "Unavailable" : shifts.recentInputShiftValue.toFixed(5)}</dd></div>
          <div><dt>Recording</dt><dd>{recording ? "Active · 15 s limit" : shifts.observation?.stopReason ?? shifts.status}</dd></div>
        </dl>}
        {(baseline || shifts) && <pre className="qg-layout-diagnostics-report" tabIndex={0} aria-label="Layout diagnostic report">{JSON.stringify(report, null, 2)}</pre>}
        {children}
      </div>
    </CollapsiblePanel>
  </Collapsible>;
}
