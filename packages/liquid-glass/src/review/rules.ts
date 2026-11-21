/** Shared, bounded review rules. A review candidate is not a human quality score. */
export const REVIEW_RULE_VERSION = "1.0.1";

export type ReviewSeverity = "error" | "warning" | "review";
export type ReviewCertainty = "measured" | "heuristic" | "contextual";
export interface ReviewOption { id: number; label: string; description: string; preview: string }
export interface ReviewFinding {
  id: string; ruleId: string; severity: ReviewSeverity; certainty: ReviewCertainty;
  target: string; targetId: string; title: string; evidence: string; suggestion: string;
  options: ReviewOption[];
}
export interface ReviewElement {
  id: string; target: string; kind: "heading" | "control" | "prose";
  text: string; name?: string; level?: number; group?: string; domId?: string;
  precedingHeadingId?: string; nameKnown?: boolean;
  width?: number; height?: number; x?: number; y?: number; checkTargetSize?: boolean;
}
export interface ReviewSnapshot {
  scope: string; target?: string; viewport: { width: number; height: number };
  elements: ReviewElement[]; overflowPixels?: number; source?: "dom" | "source";
  omittedDynamic?: number; omittedElements?: number; omittedExamples?: number;
}
export interface ReviewReport {
  fingerprint: string; ruleVersion: string; viewport: { width: number; height: number };
  scope: string; elementCount: number; findings: ReviewFinding[];
  summary: Record<ReviewSeverity, number>; limitations: string[];
}
export interface ReviewSelections { fingerprint: string; choices: Record<string, number> }
export interface ReviewPacket {
  schemaVersion: 1; status: "selection-only"; fingerprint: string; ruleVersion: string;
  scope: string; viewport: { width: number; height: number }; OPTIONS: number[];
  decisions: { findingId: string; ruleId: string; target: string; optionId: number; label: string }[];
  unresolved: number;
}

const normalise = (value: string) => value.normalize("NFKC").toLocaleLowerCase("en").replace(/[\p{P}\p{S}]+/gu, " ").replace(/\s+/g, " ").trim();
// A deterministic change detector, not a signature or an authorization credential.
function hash(value: string): string {
  let a = 2166136261, b = 2246822519;
  for (let i = 0; i < value.length; i++) {
    a = Math.imul(a ^ value.charCodeAt(i), 16777619);
    b = Math.imul(b ^ value.charCodeAt(i), 3266489917);
  }
  return (a >>> 0).toString(16).padStart(8, "0") + (b >>> 0).toString(16).padStart(8, "0");
}

function choices(change: string, preview: string, retain = "Keep after checking the surrounding task"): ReviewOption[] {
  return [
    { id: 1, label: change, description: "Ask the developing agent to make this change and run the review again.", preview },
    { id: 2, label: retain, description: "Record a contextual decision; this choice does not clear a measured error or certify the interface.", preview: "Retain the current interface with a task-specific explanation in the implementation review." },
  ];
}

/** Analyze supplied, already redacted observations. This function never reads a DOM or calls a model. */
export function analyzeReviewSnapshot(snapshot: ReviewSnapshot): ReviewReport {
  const elements = snapshot.elements.slice(0, 1000);
  const omittedElements = (snapshot.omittedElements ?? 0) + Math.max(0, snapshot.elements.length - elements.length);
  if (!snapshot.scope.trim() || !Array.isArray(elements) || new Set(elements.map(e => e.id)).size !== elements.length) {
    throw new Error("Review snapshots need a scope and unique element IDs.");
  }
  if (![snapshot.viewport.width, snapshot.viewport.height].every(n => Number.isFinite(n) && n >= 0)) {
    throw new Error("Review viewport dimensions must be finite and nonnegative.");
  }
  const findings: ReviewFinding[] = [];
  let omittedFindings = 0;
  function add(element: ReviewElement, ruleId: string, severity: ReviewSeverity, certainty: ReviewCertainty,
    title: string, evidence: string, suggestion: string, options: ReviewOption[]) {
    if (findings.length >= 200) { omittedFindings++; return; }
    findings.push({ id: `${ruleId}-${hash(element.id + "\n" + evidence)}`, ruleId, severity, certainty,
      target: element.target, targetId: element.id, title, evidence, suggestion, options });
  }
  const headings = new Map<string, ReviewElement>();
  const domIds = new Map<string, ReviewElement>();
  let previousHeading: ReviewElement | undefined;
  for (const element of elements) {
    const text = normalise(element.text);
    if (element.domId) {
      const previous = domIds.get(element.domId);
      if (previous) add(element, "duplicate-id", "error", "measured", "The same element ID is used twice",
        `ID ${JSON.stringify(element.domId)} also identifies ${previous.target}.`,
        "Give these elements distinct IDs and update any label or description references.", choices("Give each element its own ID", "Use stable, unique IDs for the two elements.", "Inspect the duplicate before changing it"));
      else domIds.set(element.domId, element);
    }
    if (element.kind === "control") {
      if (element.nameKnown !== false && !element.name?.trim()) add(element, "control-name", "error", "measured", "A control has no detected accessible name",
        `No label was found for ${element.target}.`,
        "Give the real control a visible task-specific label or a meaningful accessible name. Verify the browser accessibility tree.",
        choices("Name the action", "Use an action and its object, such as “Save profile”.", "Inspect browser name calculation"));
      const name = normalise(element.name ?? element.text);
      if (element.nameKnown !== false && /^(click here|learn more|read more|submit|continue|next|ok)$/.test(name)) add(element, "generic-action", "review", "heuristic", "Check whether this action is clear in context",
        `The control is labelled ${JSON.stringify(element.name || element.text)}.`,
        "Name the result when it is unclear from the nearby task. Keep conventional Next or Continue labels when the step makes the result clear.",
        choices("Name the result", "For example, “Review order” describes the next screen more precisely than “Continue”."));
      if (element.checkTargetSize && element.width != null && element.height != null && (element.width < 24 || element.height < 24)) {
        add(element, "small-target", "review", "measured", "Check this compact hit target",
          `Observed bounds: ${element.width} × ${element.height} CSS pixels.`,
          "Check effective hit area, spacing and the applicable exceptions before enlarging it. Bounds alone do not establish a WCAG failure.",
          choices("Increase the hit area", "Keep the visible icon size and add space around its interactive element."));
      }
    }
    if (element.kind === "heading") {
      const key = `${element.group ?? snapshot.scope}\n${element.level ?? 0}\n${text}`;
      const previous = text ? headings.get(key) : undefined;
      if (previous) add(element, "duplicate-heading", "review", "heuristic", "A nearby heading repeats the same wording",
        `${JSON.stringify(element.text)} also appears at ${previous.target}.`,
        "Check whether both headings identify distinct regions. Give different tasks distinct names or remove the redundant heading.",
        choices("Remove or distinguish the repetition", "Use one heading for one region, or name the distinct object in each heading."));
      if (text) headings.set(key, element);
      if (/^(a rule|what matters|the solution|unlock your potential)$/.test(text)) add(element, "generic-heading", "review", "heuristic", "The heading does not identify a concrete task",
        `The heading is ${JSON.stringify(element.text)}.`,
        "Name the actual object, decision or result if this wording does not help the intended reader navigate.",
        choices("Name the task or subject", "For example, use “Review pending releases” when the section contains a release queue."));
      if (previousHeading?.level && element.level && element.level > previousHeading.level + 1) add(element, "heading-order", "warning", "heuristic", "Heading levels skip a step",
        `Heading level ${previousHeading.level} is followed by level ${element.level}.`,
        "Check the section hierarchy. Choose the level for the content structure, independently of the visual font size.",
        choices("Use the next heading level", `Consider h${previousHeading.level + 1} after checking the surrounding section.`));
      previousHeading = element;
    }
    if (element.kind === "prose" && element.precedingHeadingId && text) {
      const heading = elements.find(e => e.id === element.precedingHeadingId && e.kind === "heading");
      if (heading && text === normalise(heading.text)) add(element, "repeated-subtitle", "review", "heuristic", "The subtitle repeats its heading",
        `Heading and following text both say ${JSON.stringify(element.text)}.`,
        "Remove the subtitle if it adds no information. Keep a short explanation only when it changes what the reader understands or does.",
        choices("Remove the repeated subtitle", "Keep the heading and move directly into the useful content."));
    }
  }
  if ((snapshot.overflowPixels ?? 0) > 4) {
    add({ id: "review-scope", kind: "prose", target: snapshot.target ?? ":scope", text: "" }, "horizontal-overflow", "warning", "measured", "This region extends beyond its available width",
      `Horizontal overflow: ${Math.round(snapshot.overflowPixels!)} CSS pixels.`,
      "Check the narrow layout. A deliberate scrolling table or canvas can be valid; page content should remain reachable and readable.",
      choices("Adapt the region to its width", "Stack the task regions, wrap long labels or use an explicitly labelled scrolling surface."));
  }
  const identity = { ...snapshot, elements, omittedElements, ruleVersion: REVIEW_RULE_VERSION };
  const summary: Record<ReviewSeverity, number> = { error: 0, warning: 0, review: 0 };
  const unresolvedNames = elements.filter(element => element.kind === "control" && element.nameKnown === false).length;
  findings.forEach(finding => summary[finding.severity]++);
  return { fingerprint: `qgr-${hash(JSON.stringify(identity))}`, ruleVersion: REVIEW_RULE_VERSION,
    viewport: { ...snapshot.viewport }, scope: snapshot.scope, elementCount: elements.length, findings, summary,
    limitations: [
      ...(omittedElements || omittedFindings ? [`Scope limit reached: ${omittedElements} additional elements and ${omittedFindings} findings are omitted. Narrow the reviewed region; this is incomplete coverage.`] : []),
      snapshot.source === "source"
        ? `Static JSX literals only; ${snapshot.omittedDynamic ?? 0} dynamic candidates were not evaluated and ${snapshot.omittedExamples ?? 0} explicitly marked deliberate examples were excluded. Browser states and layout are not covered.`
        : "Only the supplied rendered region and current state are inspected. Hidden views, secret content and editable values are excluded.",
      ...(snapshot.source !== "source" && unresolvedNames ? [`${unresolvedNames} control ${unresolvedNames === 1 ? "name was" : "names were"} not inspected because a referenced label was hidden, protected or unavailable. Verify those names in the browser accessibility tree; no unnamed-control failure is inferred.`] : []),
      "Wording, repetition, heading order and task relevance need contextual review. There is no LLM, semantic inference or automatic rewriting.",
      "These checks do not establish full accessibility conformance, factual accuracy or human usability. Choices request work; they do not apply changes.",
    ] };
}

/** Export selected decisions bound to this exact observation. No mutation or approval is implied. */
export function createReviewPacket(report: ReviewReport, selections: ReviewSelections): ReviewPacket {
  if (selections.fingerprint !== report.fingerprint) throw new Error("The review changed. Scan again and choose against the current findings.");
  if (!selections.choices || typeof selections.choices !== "object" || Array.isArray(selections.choices)) throw new Error("Review choices must map finding IDs to option IDs.");
  const byId = new Map(report.findings.map(finding => [finding.id, finding]));
  for (const [id, option] of Object.entries(selections.choices)) {
    const finding = byId.get(id);
    if (!finding || !Number.isInteger(option) || !finding.options.some(candidate => candidate.id === option)) throw new Error(`Unknown review choice: ${id}.`);
  }
  const decisions = report.findings.flatMap(finding => {
    const optionId = selections.choices[finding.id];
    const option = finding.options.find(candidate => candidate.id === optionId);
    return option ? [{ findingId: finding.id, ruleId: finding.ruleId, target: finding.target, optionId, label: option.label }] : [];
  });
  return { schemaVersion: 1, status: "selection-only", fingerprint: report.fingerprint, ruleVersion: report.ruleVersion,
    scope: report.scope, viewport: { ...report.viewport }, OPTIONS: decisions.map(decision => decision.optionId),
    decisions, unresolved: report.findings.length - decisions.length };
}
