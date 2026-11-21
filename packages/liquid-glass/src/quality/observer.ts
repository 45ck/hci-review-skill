import type { LayoutRect, QualityFinding } from "./geometry";

export type LayoutShiftSource = Readonly<{ targetId: string; previousRect: LayoutRect; currentRect: LayoutRect }>;
export type LayoutShiftSample = Readonly<{
  startTime: number;
  value: number;
  hadRecentInput: boolean;
  sources?: readonly LayoutShiftSource[];
}>;
export type LayoutShiftReport = Readonly<{
  status: "complete" | "incomplete" | "unsupported" | "invalid";
  supported: boolean;
  scoreComplete: boolean;
  cls: number | null;
  unexpectedShiftValue: number | null;
  recentInputShiftValue: number | null;
  counts: Readonly<{ observed: number; unexpected: number; recentInput: number; invalid: number }>;
  maxSession: Readonly<{ value: number; startTime: number; endTime: number; count: number }> | null;
  samples: readonly LayoutShiftSample[];
  limits: Readonly<{ maxSamples: number; retainedSamples: number; droppedSamples: number }>;
  observation: Readonly<{
    startTime: number;
    endTime: number;
    durationMs: number;
    buffered: boolean;
    stopped: boolean;
    stopReason: "manual" | "time-limit" | "document-hidden" | "page-hidden" | "unsupported" | "invalid" | null;
  }> | null;
  findings: readonly QualityFinding[];
}>;
export type LayoutShiftObserverOptions = Readonly<{
  root?: Element | null;
  maxSamples?: number;
  maxDurationMs?: number;
  buffered?: boolean;
  onUpdate?: (report: LayoutShiftReport) => void;
}>;
export type LayoutShiftObserver = Readonly<{
  supported: boolean;
  snapshot: () => LayoutShiftReport;
  stop: () => LayoutShiftReport;
}>;

const MAX_SAMPLES = 512;
const MAX_ENTRIES = 10_000;
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const validId = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,127}$/.test(value);
const validRect = (rect: LayoutRect) => rect && finite(rect.x) && finite(rect.y) && finite(rect.width) && finite(rect.height) && rect.width >= 0 && rect.height >= 0;
const copyRect = (rect: LayoutRect): LayoutRect => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
const issue = (code: string, message: string): QualityFinding => ({ code, targetId: null, severity: "error", message });

function accumulator(maxSamples: number, supported: boolean) {
  const samples: LayoutShiftSample[] = [];
  const findings: QualityFinding[] = [];
  const counts = { observed: 0, unexpected: 0, recentInput: 0, invalid: 0 };
  let unexpected = 0, recent = 0, dropped = 0;
  let session: LayoutShiftReport["maxSession"] = null;
  let maximum: LayoutShiftReport["maxSession"] = null;
  let incomplete = false;
  let lastTime = -1;
  const addIssue = (code: string, message: string) => { if (!findings.some(item => item.code === code)) findings.push(issue(code, message)); };
  function add(entry: LayoutShiftSample) {
    counts.observed++;
    if (!entry || !finite(entry.startTime) || entry.startTime < 0 || !finite(entry.value) || entry.value < 0 || typeof entry.hadRecentInput !== "boolean" || entry.startTime < lastTime) {
      counts.invalid++; incomplete = true;
      addIssue("invalid-shift-sample", "A malformed or out-of-order layout shift was excluded; the score is incomplete."); return;
    }
    lastTime = entry.startTime;
    const sources: LayoutShiftSource[] = [];
    for (const source of (entry.sources ?? []).slice(0, 5)) {
      if (validId(source.targetId) && validRect(source.previousRect) && validRect(source.currentRect)) sources.push({ targetId: source.targetId, previousRect: copyRect(source.previousRect), currentRect: copyRect(source.currentRect) });
    }
    const sample = { startTime: entry.startTime, value: entry.value, hadRecentInput: entry.hadRecentInput, sources };
    if (samples.length === maxSamples) { samples.shift(); dropped++; }
    samples.push(sample);
    if (entry.hadRecentInput) { recent += entry.value; counts.recentInput++; }
    else {
      unexpected += entry.value; counts.unexpected++;
      if (entry.value > 0) {
        if (session && entry.startTime - session.endTime < 1000 && entry.startTime - session.startTime < 5000) session = { ...session, value: session.value + entry.value, endTime: entry.startTime, count: session.count + 1 };
        else session = { value: entry.value, startTime: entry.startTime, endTime: entry.startTime, count: 1 };
        if (!maximum || session.value > maximum.value) maximum = { ...session };
      }
    }
    if (!Number.isFinite(unexpected) || !Number.isFinite(recent) || (maximum && !Number.isFinite(maximum.value))) {
      incomplete = true; addIssue("shift-score-overflow", "Shift samples exceeded finite score arithmetic.");
    }
  }
  function report(observation: LayoutShiftReport["observation"] = null): LayoutShiftReport {
    return {
      status: !supported ? "unsupported" : incomplete ? "incomplete" : "complete", supported, scoreComplete: supported && !incomplete,
      cls: supported && !incomplete ? maximum?.value ?? 0 : null,
      unexpectedShiftValue: supported && Number.isFinite(unexpected) ? unexpected : null,
      recentInputShiftValue: supported && Number.isFinite(recent) ? recent : null,
      counts: { ...counts }, maxSession: supported && !incomplete && maximum ? { ...maximum } : null,
      samples: samples.map(sample => ({ ...sample, sources: (sample.sources ?? []).map(source => ({ targetId: source.targetId, previousRect: copyRect(source.previousRect), currentRect: copyRect(source.currentRect) })) })),
      limits: { maxSamples, retainedSamples: samples.length, droppedSamples: dropped }, observation,
      findings: [...findings, ...(!supported ? [issue("layout-shift-unsupported", "This environment does not expose layout-shift PerformanceObserver entries.")] : [])],
    };
  }
  return { add, report, markIncomplete(code: string, message: string) { incomplete = true; addIssue(code, message); } };
}

export function summarizeLayoutShifts(
  entries: readonly LayoutShiftSample[],
  options: Readonly<{ maxSamples?: number; supported?: boolean }> = {},
): LayoutShiftReport {
  const maxSamples = options.maxSamples ?? 128;
  if (!Number.isInteger(maxSamples) || maxSamples < 1 || maxSamples > MAX_SAMPLES) {
    const empty = accumulator(0, options.supported !== false).report();
    return { ...empty, status: "invalid", scoreComplete: false, cls: null, findings: [issue("invalid-sample-limit", "maxSamples must be an integer from 1 to 512.")] };
  }
  const state = accumulator(maxSamples, options.supported !== false);
  if (options.supported === false) return state.report();
  const bounded = entries.slice(0, MAX_ENTRIES);
  if (entries.length > MAX_ENTRIES) state.markIncomplete("shift-entry-limit", "Only the first 10,000 supplied entries were processed; the score is incomplete.");
  bounded.sort((first, second) => (finite(first?.startTime) ? first.startTime : Infinity) - (finite(second?.startTime) ? second.startTime : Infinity));
  for (const entry of bounded) state.add(entry);
  return state.report();
}

export function observeLayoutShifts(options: LayoutShiftObserverOptions = {}): LayoutShiftObserver {
  const maxSamples = options.maxSamples ?? 128;
  const maxDurationMs = options.maxDurationMs ?? 60_000;
  const validOptions = Number.isInteger(maxSamples) && maxSamples >= 1 && maxSamples <= MAX_SAMPLES && finite(maxDurationMs) && maxDurationMs >= 1 && maxDurationMs <= 300_000;
  const view = options.root?.ownerDocument.defaultView ?? (typeof window !== "undefined" ? window : null);
  const Observer = view && "PerformanceObserver" in view ? view.PerformanceObserver as typeof PerformanceObserver : null;
  const supported = Boolean(validOptions && view && Observer?.supportedEntryTypes?.includes("layout-shift"));
  const state = accumulator(validOptions ? maxSamples : 0, supported);
  const startTime = view?.performance.now() ?? 0;
  let stopped = !supported;
  let stopReason: NonNullable<LayoutShiftReport["observation"]>["stopReason"] = !validOptions ? "invalid" : !supported ? "unsupported" : null;
  let endTime = startTime;
  let observer: PerformanceObserver | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const buffered = options.buffered ?? false;
  const getReport = (): LayoutShiftReport => {
    const end = stopped ? endTime : view?.performance.now() ?? startTime;
    const report = state.report({ startTime, endTime: end, durationMs: Math.max(0, end - startTime), buffered, stopped, stopReason });
    if (stopReason === "unsupported") return { ...report, status: "unsupported", supported: false, scoreComplete: false, cls: null, unexpectedShiftValue: null, recentInputShiftValue: null, maxSession: null };
    return validOptions ? report : { ...report, status: "invalid", findings: [issue("invalid-observer-options", "Use 1–512 samples and an observation duration of 1–300,000 milliseconds.")] };
  };
  function notify() {
    try { options.onUpdate?.(getReport()); }
    catch { state.markIncomplete("observer-callback-error", "The update callback threw; observation continues but its consumer did not accept the report."); }
  }
  function consume(entries: readonly PerformanceEntry[]) {
    const bounded = entries.slice(0, MAX_ENTRIES).sort((a, b) => a.startTime - b.startTime);
    if (entries.length > MAX_ENTRIES) state.markIncomplete("shift-entry-limit", "An observer batch exceeded 10,000 entries; the score is incomplete.");
    for (const raw of bounded) {
      if (raw.entryType !== "layout-shift") continue;
      const entry = raw as PerformanceEntry & { value: number; hadRecentInput: boolean; sources?: readonly { node?: Node | null; previousRect: DOMRectReadOnly; currentRect: DOMRectReadOnly }[] };
      const sources: LayoutShiftSource[] = [];
      for (const source of (entry.sources ?? []).slice(0, 5)) {
        const node = source.node;
        const element = node?.nodeType === 1 ? node as Element : node?.parentElement;
        const probe = element?.closest("[data-layout-probe]");
        const id = probe?.getAttribute("data-layout-probe");
        if (probe && validId(id) && (!options.root || options.root.contains(probe)) && validRect(source.previousRect) && validRect(source.currentRect)) sources.push({ targetId: id, previousRect: copyRect(source.previousRect), currentRect: copyRect(source.currentRect) });
      }
      state.add({ startTime: entry.startTime, value: entry.value, hadRecentInput: entry.hadRecentInput, sources });
    }
  }
  function finish(reason: NonNullable<LayoutShiftReport["observation"]>["stopReason"]) {
    if (!stopped) {
      if (observer) consume(observer.takeRecords());
      observer?.disconnect(); observer = null;
      stopped = true; stopReason = reason; endTime = view?.performance.now() ?? startTime;
      if (timer !== null) clearTimeout(timer);
      view?.document.removeEventListener("visibilitychange", onVisibility);
      view?.removeEventListener("pagehide", onPageHide);
      notify();
    }
    return getReport();
  }
  function onVisibility() { if (view?.document.visibilityState === "hidden") finish("document-hidden"); }
  function onPageHide() { finish("page-hidden"); }
  if (supported && Observer && view) {
    try {
      observer = new Observer(list => { if (!stopped) { consume(list.getEntries()); notify(); } });
      observer.observe({ type: "layout-shift", buffered });
      timer = setTimeout(() => finish("time-limit"), maxDurationMs);
      view.document.addEventListener("visibilitychange", onVisibility);
      view.addEventListener("pagehide", onPageHide);
      onVisibility();
    } catch {
      observer?.disconnect(); observer = null; stopped = true; stopReason = "unsupported";
      state.markIncomplete("observer-start-failed", "The browser rejected layout-shift observation.");
    }
  }
  return {
    supported: supported && stopReason !== "unsupported",
    snapshot() { if (observer && !stopped) consume(observer.takeRecords()); return getReport(); },
    stop() { return finish("manual"); },
  };
}
