"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@ui-sdk/react/button";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@ui-sdk/react/dialog";
import { Radio, RadioGroup, RadioIndicator } from "@ui-sdk/react/radio";
import { Textarea } from "@ui-sdk/react/textarea";
import { LiquidIcon } from "../icons";
import { ValidationBadge } from "../validation";
import { createReviewPacket, type ReviewFinding, type ReviewReport } from "./rules";
import { scanReview } from "./scan";

export type LiquidReviewOverlayProps = {
  open: boolean;
  onOpenChange: NonNullable<ComponentProps<typeof Dialog>["onOpenChange"]>;
  root: () => HTMLElement | null;
  triggerLabel?: string;
  shortcut?: string;
  tools?: ReactNode;
  className?: string;
};

type Highlight = { element: HTMLElement; number: number };

function TargetOutline({ target }: { target: Highlight }) {
  const [bounds, setBounds] = useState<CSSProperties | null>(null);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!target.element.isConnected) { setBounds(null); return; }
        const rect = target.element.getBoundingClientRect();
        setBounds({ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8 });
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(target.element);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [target]);
  return bounds && createPortal(<div className="qgr-target" data-review-highlight={target.number} data-quantive-review-root="" aria-hidden="true" style={bounds}><span>{target.number}</span></div>, document.body);
}

export function LiquidReviewOverlay({ open, onOpenChange, root, triggerLabel = "Review UI", shortcut, tools, className = "" }: LiquidReviewOverlayProps) {
  const resolveRoot = useRef(root);
  resolveRoot.current = root;
  const [report, setReport] = useState<ReviewReport | null>(null);
  const [choices, setChoices] = useState<Record<string, number>>({});
  const [stale, setStale] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [peek, setPeek] = useState(false);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const exportField = useRef<HTMLTextAreaElement | null>(null);
  const exportId = useId();
  const trigger = useRef<HTMLButtonElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);
  const returnButton = useRef<HTMLButtonElement | null>(null);
  const wasPeeking = useRef(false);
  const reportRef = useRef(report);
  reportRef.current = report;

  const refresh = useCallback(() => {
    const surface = resolveRoot.current();
    setHighlight(null);
    setPeek(false);
    setNotice("");
    if (!surface) { setError("The review surface is not available. Open a page and refresh."); setStale(true); return; }
    try {
      const next = scanReview(surface);
      if (reportRef.current?.fingerprint !== next.fingerprint) setChoices({});
      setReport(next);
      setStale(false);
      setError("");
    } catch {
      setError("This surface could not be inspected. Refresh after it finishes loading.");
      setStale(true);
    }
  }, []);

  useEffect(() => {
    if (!open) { setHighlight(null); setPeek(false); return; }
    const frame = requestAnimationFrame(refresh);
    return () => cancelAnimationFrame(frame);
  }, [open, root, refresh]);

  useEffect(() => {
    if (open && peek) returnButton.current?.focus();
    else if (open && wasPeeking.current) panel.current?.focus();
    wasPeeking.current = peek;
  }, [open, peek]);

  useEffect(() => {
    if (!open || !report) return;
    const surface = resolveRoot.current();
    if (!surface) return;
    let timer = 0;
    const check = () => {
      if (document.hidden) return;
      try {
        const current = resolveRoot.current();
        const changed = !current || scanReview(current).fingerprint !== report.fingerprint;
        if (changed) { setStale(true); setHighlight(null); setNotice(""); }
      } catch { setStale(true); }
    };
    const schedule = () => { window.clearTimeout(timer); timer = window.setTimeout(check, 220); };
    const observer = new MutationObserver(records => {
      if (records.some(record => {
        const element = record.target instanceof Element ? record.target : record.target.parentElement;
        return element && !element.closest("[data-quantive-review-root], canvas, svg, [aria-hidden='true']");
      })) schedule();
    });
    observer.observe(surface, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["hidden", "aria-hidden", "aria-label", "aria-labelledby", "alt", "title", "disabled", "aria-disabled", "class", "style", "data-review-scope", "data-agent-hidden", "data-agent-secret"] });
    window.addEventListener("resize", schedule);
    document.addEventListener("visibilitychange", schedule);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [open, report]);

  const currentReport = () => {
    const surface = resolveRoot.current();
    if (!report || !surface || stale) return false;
    try {
      if (scanReview(surface).fingerprint === report.fingerprint) return true;
    } catch { /* An unavailable surface cannot authorise an old selection. */ }
    setStale(true);
    setHighlight(null);
    setNotice("The page changed. Refresh checks before choosing or copying.");
    return false;
  };

  const packetText = useMemo(() => {
    if (!report || stale) return "";
    try { return JSON.stringify(createReviewPacket(report, { fingerprint: report.fingerprint, choices }), null, 2); }
    catch { return ""; }
  }, [report, choices, stale]);

  const locate = (finding: ReviewFinding, number: number) => {
    if (!currentReport()) return;
    const surface = resolveRoot.current();
    let element: HTMLElement | null = null;
    try { element = surface?.matches(finding.target) ? surface : surface?.querySelector<HTMLElement>(finding.target) ?? null; }
    catch { /* A stale selector leaves the document unchanged. */ }
    if (!element || !surface?.contains(element)) { setNotice("That element is no longer on this page. Refresh checks."); setStale(true); return; }
    setPeek(true);
    element.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
    setHighlight({ element, number });
    setNotice(`Finding ${number} is outlined on the page.`);
  };

  const copyPacket = async () => {
    if (!currentReport() || !packetText || !Object.keys(choices).length) return;
    try {
      await navigator.clipboard.writeText(packetText);
      setNotice("Decisions copied. Give this JSON to your agent.");
    } catch {
      setNotice("Clipboard unavailable. Select and copy the JSON below.");
      exportField.current?.focus();
      exportField.current?.select();
    }
  };

  return <>
    <Dialog open={open} onOpenChange={onOpenChange} modal={false} closeOnOutsidePress={false}>
      <DialogTrigger ref={trigger} className={`qgr-trigger ${className}`} data-quantive-review-root="" shortcut={shortcut}><LiquidIcon name="search" size={18} />{triggerLabel}</DialogTrigger>
      <DialogContent ref={panel} className="qgr-panel" initialFocus="content" finalFocus={() => trigger.current} data-quantive-review-root="" data-review-fingerprint={report?.fingerprint ?? ""} data-review-stale={stale} data-review-scope={report?.scope ?? ""} data-review-element-count={report?.elementCount ?? 0} data-review-peek={peek} data-review-source={report?.scope.includes("lint-example") ? "fixture" : "page"} data-validation="unvalidated" data-liquid-glass="off">
        <header className="qgr-header">
          <div className="qgr-title"><LiquidIcon name="search" size={24} /><DialogTitle>Review UI</DialogTitle></div>
          <DialogClose aria-label="Close review" className="qgr-close">×</DialogClose>
        </header>
        {peek ? <div className="qgr-peek"><p role="status">{notice}</p><Button ref={returnButton} onClick={() => { setPeek(false); setHighlight(null); setNotice(""); }}>Back to findings</Button></div> : <>
          <div className="qgr-toolbar"><Button onClick={refresh}>Refresh checks</Button>{tools}</div>
          <div className="qgr-scroll">
            {error && <p className="qgr-alert" role="alert">{error}</p>}
            {stale && <div className="qgr-alert" role="status"><strong>Page changed</strong><p>Refresh to inspect the current content. Previous choices will be cleared.</p></div>}
            {report ? <>
              <div className="qgr-summary"><span>{report.findings.length} {report.findings.length === 1 ? "finding" : "findings"}</span><span>{report.elementCount} elements · {report.viewport.width} × {report.viewport.height}</span></div>
              <p className="qgr-scope">{report.scope}</p>
              {report.findings.length === 0 && <div className="qgr-empty"><strong>No findings in these checks</strong><p>Meaning, task clarity and visual judgment still need contextual review.</p></div>}
              <ol className="qgr-findings">
                {report.findings.map((finding, index) => <li key={finding.id} data-review-finding={finding.id} data-review-rule={finding.ruleId} data-review-severity={finding.severity} className="qgr-finding">
                  <div className="qgr-finding-heading"><span className="qgr-number">{index + 1}</span><h3>{finding.title}</h3></div>
                  <div className="qgr-meta"><span>{finding.severity === "review" ? "Review" : finding.severity === "error" ? "Error" : "Warning"}</span><span>{finding.certainty === "measured" ? "Measured" : finding.certainty === "heuristic" ? "Heuristic" : "Contextual"}</span></div>
                  <blockquote>{finding.evidence}</blockquote>
                  <p>{finding.suggestion}</p>
                  <Button className="qgr-locate" aria-label={`Locate finding ${index + 1}`} disabled={stale} onClick={() => locate(finding, index + 1)}>Show on page</Button>
                  {finding.options.length > 0 && <RadioGroup className="qgr-options" aria-label={`Decision for finding ${index + 1}`} data-agent-confirm="A person chooses the design direction for this finding." value={choices[finding.id] === undefined ? "" : String(choices[finding.id])} disabled={stale} onValueChange={(value, details) => {
                    const option = finding.options.find(item => String(item.id) === value);
                    if (details.source === "agent" || !option || !currentReport()) { details.cancel(); return; }
                    setChoices(previous => ({ ...previous, [finding.id]: option.id }));
                    setNotice("");
                  }}>
                    {finding.options.map(option => <label key={option.id} className="qgr-option" data-selected={choices[finding.id] === option.id}>
                      <Radio value={String(option.id)}><RadioIndicator /></Radio>
                      <span className="qgr-option-copy"><strong>{option.id}. {option.label}</strong><span>{option.description}</span>{option.preview && <span className="qgr-option-preview">{option.preview}</span>}</span>
                    </label>)}
                  </RadioGroup>}
                </li>)}
              </ol>
              <section className="qgr-boundaries" aria-label="Review coverage"><h3>Coverage</h3><ul>{report.limitations.map(item => <li key={item}>{item}</li>)}</ul><ValidationBadge /></section>
              {Object.keys(choices).length > 0 && !stale && <div className="qgr-export"><label htmlFor={exportId}>Review decisions JSON</label><Textarea id={exportId} ref={exportField} aria-label="Review decisions JSON" readOnly value={packetText} rows={6} spellCheck={false} /></div>}
            </> : !error && <p className="qgr-empty" role="status">Inspecting the visible page…</p>}
          </div>
          <footer className="qgr-footer">
            <p className="qgr-selection-status">{Object.keys(choices).length} choices · No page changes applied.</p>
            <div><Button data-variant="solid" disabled={stale || !packetText || Object.keys(choices).length === 0} onClick={copyPacket}>Copy decisions JSON</Button><Button disabled={Object.keys(choices).length === 0} onClick={() => { setChoices({}); setNotice("Choices cleared."); }}>Clear choices</Button></div>
            <output className="qgr-notice" aria-live="polite">{notice}</output>
          </footer>
        </>}
      </DialogContent>
    </Dialog>
    {open && highlight && <TargetOutline target={highlight} />}
  </>;
}
