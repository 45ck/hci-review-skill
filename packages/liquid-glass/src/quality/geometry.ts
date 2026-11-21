export type LayoutRect = Readonly<{ x: number; y: number; width: number; height: number }>;
export type LayoutPoint = Readonly<{ x: number; y: number }>;
export type QualityFinding = Readonly<{
  code: string;
  targetId: string | null;
  severity: "error" | "info";
  message: string;
  before?: LayoutRect | null;
  after?: LayoutRect | null;
  values?: Readonly<Record<string, number | string | boolean | null>>;
}>;
export type LayoutContext = Readonly<{
  viewport: LayoutRect;
  scroll: LayoutPoint;
  scale: number;
  devicePixelRatio: number;
  scopeId: string;
  scopeKey: string;
}>;
export type LayoutTarget = Readonly<{
  id: string;
  rect: LayoutRect;
  scroll: LayoutPoint;
  coordinateMode: "document" | "viewport" | "contextual";
  visible: boolean;
}>;
export type LayoutSnapshot = Readonly<{
  version: 1;
  status: "captured" | "unsupported" | "invalid" | "truncated";
  capturedAt: number;
  context: LayoutContext | null;
  targets: readonly LayoutTarget[];
  findings: readonly QualityFinding[];
  limits: Readonly<{ maxTargets: number; captured: number; truncated: boolean }>;
}>;
export type ExpectedLayoutChange = Readonly<{
  id: string;
  properties: readonly (keyof LayoutRect | "presence" | "visibility")[];
  reason: string;
}>;
export type LayoutComparisonOptions = Readonly<{
  positionTolerancePx?: number;
  sizeTolerancePx?: number;
  allowViewportChange?: boolean;
  expectedChanges?: readonly ExpectedLayoutChange[];
  nonOverlapping?: readonly (readonly [string, string])[];
}>;
export type LayoutComparison = Readonly<{
  status: "pass" | "fail" | "incomparable" | "unsupported" | "invalid";
  passed: boolean | null;
  compared: number;
  findings: readonly QualityFinding[];
  budget: Readonly<{ positionTolerancePx: number; sizeTolerancePx: number }>;
  context: Readonly<{ before: LayoutContext | null; after: LayoutContext | null }>;
}>;
export type PopupSide = "top" | "bottom" | "left" | "right";
export type PopupPlacementInput = Readonly<{
  targetId?: string;
  trigger: LayoutRect;
  popup: LayoutRect;
  viewport: LayoutRect;
  actualSide: string | null;
  preferredSide: PopupSide | "inline-start" | "inline-end";
  align?: "start" | "center" | "end";
  actualAlign?: string | null;
  direction?: "ltr" | "rtl";
  gapPx?: number;
  collisionPaddingPx?: number;
  tolerancePx?: number;
  allowFlip?: boolean;
  allowShift?: boolean;
}>;
export type PopupPlacementReport = Readonly<{
  status: "pass" | "fail" | "unsupported" | "invalid";
  passed: boolean | null;
  findings: readonly QualityFinding[];
  budget: Readonly<{ gapPx: number; collisionPaddingPx: number; tolerancePx: number }>;
  measurements: Readonly<{
    resolvedPreferredSide: PopupSide;
    actualSide: PopupSide;
    preferredAlign: "start" | "center" | "end";
    actualAlign: "start" | "center" | "end";
    preferredFits: boolean;
    oppositeFits: boolean;
    expectedRect: LayoutRect;
    actualGapPx: number;
    alignmentDriftPx: number;
    overflow: Readonly<{ top: number; right: number; bottom: number; left: number }>;
  }> | null;
}>;

const maxTargets = 512;
const scopeKeys = new WeakMap<Element, string>();
let nextScopeKey = 0;
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const positive = (value: unknown): value is number => finite(value) && value > 0;
const nonnegative = (value: unknown): value is number => finite(value) && value >= 0;
const validId = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,127}$/.test(value);
const validRect = (rect: LayoutRect | null | undefined): rect is LayoutRect => Boolean(rect && finite(rect.x) && finite(rect.y) && nonnegative(rect.width) && nonnegative(rect.height));
const copyRect = (rect: LayoutRect): LayoutRect => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
const finding = (code: string, message: string, targetId: string | null = null, extra: Partial<QualityFinding> = {}): QualityFinding => ({ code, targetId, severity: "error", message, ...extra });
const validPoint = (point: LayoutPoint) => point && finite(point.x) && finite(point.y);

export function captureLayoutSnapshot(
  root: Element | null,
  options: Readonly<{ maxTargets?: number; scopeId?: string }> = {},
): LayoutSnapshot {
  const limit = options.maxTargets ?? 128;
  const issues: QualityFinding[] = [];
  const empty = (status: LayoutSnapshot["status"], code: string, message: string): LayoutSnapshot => ({
    version: 1, status, capturedAt: 0, context: null, targets: [], findings: [finding(code, message)],
    limits: { maxTargets: Number.isInteger(limit) && limit > 0 ? Math.min(limit, maxTargets) : 0, captured: 0, truncated: false },
  });
  if (!Number.isInteger(limit) || limit < 1 || limit > maxTargets) return empty("invalid", "invalid-target-limit", "maxTargets must be an integer from 1 to 512.");
  if (!root?.ownerDocument?.defaultView || !root.isConnected) return empty("unsupported", "dom-unavailable", "A connected DOM scope and its window are required.");
  const view = root.ownerDocument.defaultView;
  const scopeId = options.scopeId ?? root.getAttribute("data-layout-scope") ?? "layout-scope";
  if (!validId(scopeId)) return empty("invalid", "invalid-scope-id", "Use a stable scope ID of at most 128 ASCII identifier characters.");
  if (!scopeKeys.has(root)) scopeKeys.set(root, `scope-${++nextScopeKey}`);
  const visual = view.visualViewport;
  const context: LayoutContext = {
    viewport: { x: visual?.offsetLeft ?? 0, y: visual?.offsetTop ?? 0, width: visual?.width ?? view.innerWidth, height: visual?.height ?? view.innerHeight },
    scroll: { x: view.scrollX, y: view.scrollY }, scale: visual?.scale ?? 1,
    devicePixelRatio: view.devicePixelRatio, scopeId, scopeKey: scopeKeys.get(root)!,
  };
  const targets: LayoutTarget[] = [];
  const ids = new Set<string>();
  let truncated = false;
  const inspect = (element: Element) => {
    if (!element.hasAttribute("data-layout-probe")) return;
    if (targets.length >= limit) { truncated = true; return; }
    const id = element.getAttribute("data-layout-probe");
    if (!validId(id)) { issues.push(finding("invalid-probe-id", "A probe ID must contain 1–128 ASCII identifier characters.")); return; }
    if (ids.has(id)) { issues.push(finding("duplicate-probe-id", "Probe IDs must be unique within the captured scope.", id)); return; }
    ids.add(id);
    const rect = copyRect(element.getBoundingClientRect());
    let coordinateMode: LayoutTarget["coordinateMode"] = "document";
    let scrollX = 0, scrollY = 0;
    let fixedBoundary: Element | null = null;
    let sticky = false;
    for (let current: Element | null = element; current; current = current.parentElement) {
      const style = view.getComputedStyle(current);
      if (style.position === "sticky") sticky = true;
      if (current !== element && current !== root.ownerDocument.scrollingElement) {
        scrollX += current.scrollLeft; scrollY += current.scrollTop;
      }
      if (style.transform !== "none") coordinateMode = "contextual";
      if (style.position === "fixed") { fixedBoundary = current; break; }
    }
    if (fixedBoundary) {
      if (coordinateMode !== "contextual") coordinateMode = "viewport";
      for (let current = fixedBoundary.parentElement; current; current = current.parentElement) {
        const style = view.getComputedStyle(current);
        if (style.transform !== "none" || style.perspective !== "none" || style.filter !== "none" || /paint|layout|strict|content/.test(style.contain)) coordinateMode = "contextual";
      }
      if (coordinateMode === "contextual") {
        scrollX += view.scrollX; scrollY += view.scrollY;
        for (let current = fixedBoundary.parentElement; current; current = current.parentElement) {
          if (current !== root.ownerDocument.scrollingElement) { scrollX += current.scrollLeft; scrollY += current.scrollTop; }
        }
      }
    } else { scrollX += view.scrollX; scrollY += view.scrollY; }
    if (sticky) coordinateMode = "contextual";
    const style = view.getComputedStyle(element);
    const visible = element.getClientRects().length > 0 && style.visibility !== "hidden" && style.visibility !== "collapse" && !element.closest("[hidden]");
    targets.push({ id, rect, scroll: { x: scrollX, y: scrollY }, coordinateMode, visible: Boolean(visible) });
  };
  inspect(root);
  const walker = root.ownerDocument.createTreeWalker(root, 1, { acceptNode: node => (node as Element).hasAttribute("data-layout-probe") ? 1 : 3 });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    inspect(node as Element);
    if (truncated) break;
    if (issues.length >= limit) { truncated = true; break; }
  }
  if (truncated) issues.push(finding("target-limit", "The target limit was reached; this capture cannot establish full coverage."));
  if (!targets.length) issues.push(finding("no-probes", "The scope contains no valid data-layout-probe targets."));
  return {
    version: 1, status: truncated ? "truncated" : issues.length ? "invalid" : "captured",
    capturedAt: view.performance.now(), context, targets, findings: issues,
    limits: { maxTargets: limit, captured: targets.length, truncated },
  };
}

export function compareLayoutSnapshots(before: LayoutSnapshot, after: LayoutSnapshot, options: LayoutComparisonOptions = {}): LayoutComparison {
  const rawBudget = { positionTolerancePx: options.positionTolerancePx ?? 1, sizeTolerancePx: options.sizeTolerancePx ?? 1 };
  const budget = { positionTolerancePx: nonnegative(rawBudget.positionTolerancePx) ? rawBudget.positionTolerancePx : 1, sizeTolerancePx: nonnegative(rawBudget.sizeTolerancePx) ? rawBudget.sizeTolerancePx : 1 };
  const findings: QualityFinding[] = [];
  let compared = 0;
  const finish = (status: LayoutComparison["status"]): LayoutComparison => ({ status, passed: status === "pass" ? true : status === "fail" ? false : null, compared, findings, budget, context: { before: before.context, after: after.context } });
  if (!nonnegative(rawBudget.positionTolerancePx) || !nonnegative(rawBudget.sizeTolerancePx)) {
    findings.push(finding("invalid-budget", "Geometry tolerances must be finite nonnegative CSS pixels.")); return finish("invalid");
  }
  if (before.status === "unsupported" || after.status === "unsupported") {
    findings.push(finding("unsupported-capture", "Both snapshots require supported DOM captures.")); return finish("unsupported");
  }
  if (before.status !== "captured" || after.status !== "captured" || !before.context || !after.context || !before.targets.length || !after.targets.length || before.targets.length > maxTargets || after.targets.length > maxTargets) {
    findings.push(finding("incomplete-capture", "Missing, invalid or truncated captures cannot establish stability.")); return finish("invalid");
  }
  const a = before.context, b = after.context;
  if (!validRect(a.viewport) || !validRect(b.viewport) || !validPoint(a.scroll) || !validPoint(b.scroll) || !positive(a.scale) || !positive(b.scale) || !positive(a.devicePixelRatio) || !positive(b.devicePixelRatio)) {
    findings.push(finding("invalid-context", "Snapshot context must contain finite viewport and scale values.")); return finish("invalid");
  }
  if (a.scopeKey !== b.scopeKey || a.scopeId !== b.scopeId) {
    findings.push(finding("scope-changed", "Snapshots belong to different DOM scopes.")); return finish("incomparable");
  }
  const viewportChanged = (["x", "y", "width", "height"] as const).some(key => a.viewport[key] !== b.viewport[key]) || a.scale !== b.scale || a.devicePixelRatio !== b.devicePixelRatio;
  if (viewportChanged && !options.allowViewportChange) {
    findings.push(finding("viewport-changed", "A viewport or zoom change needs a new baseline or explicit comparison policy.", null, { before: a.viewport, after: b.viewport })); return finish("incomparable");
  }
  const expected = new Map<string, Set<string>>();
  const allowedProperties = new Set(["x", "y", "width", "height", "presence", "visibility"]);
  if ((options.expectedChanges?.length ?? 0) > maxTargets) { findings.push(finding("expected-change-limit", "At most 512 explicit target exceptions are supported.")); return finish("invalid"); }
  for (const change of options.expectedChanges ?? []) {
    if (!validId(change.id) || !change.reason.trim() || !change.properties.length || change.properties.some(property => !allowedProperties.has(property)) || expected.has(change.id)) {
      findings.push(finding("invalid-expected-change", "Expected changes require a unique ID, properties and a nonempty reason.")); return finish("invalid");
    }
    expected.set(change.id, new Set(change.properties));
  }
  const indexes = [new Map<string, LayoutTarget>(), new Map<string, LayoutTarget>()];
  for (const [index, snapshot] of [before, after].entries()) {
    for (const target of snapshot.targets) {
      if (!validId(target.id) || !validRect(target.rect) || !validPoint(target.scroll) || !["document", "viewport", "contextual"].includes(target.coordinateMode) || typeof target.visible !== "boolean" || indexes[index].has(target.id)) {
        findings.push(finding("invalid-target", "Snapshot targets require unique IDs and finite geometry.")); return finish("invalid");
      }
      indexes[index].set(target.id, target);
    }
  }
  let incomparable = false;
  for (const id of new Set([...indexes[0].keys(), ...indexes[1].keys()])) {
    const first = indexes[0].get(id), last = indexes[1].get(id), changes = expected.get(id);
    if (!first || !last) {
      if (!changes?.has("presence")) findings.push(finding(first ? "target-removed" : "target-added", "A stable probe changed presence without an explicit expected change.", id, { before: first?.rect ?? null, after: last?.rect ?? null }));
      continue;
    }
    if (first.visible !== last.visible) {
      if (!changes?.has("visibility")) findings.push(finding("visibility-changed", "A stable probe changed visibility without an explicit expected change.", id, { before: first.rect, after: last.rect }));
      continue;
    }
    if (!first.visible) continue;
    if (first.coordinateMode !== last.coordinateMode || (first.coordinateMode === "contextual" && (first.scroll.x !== last.scroll.x || first.scroll.y !== last.scroll.y || a.scroll.x !== b.scroll.x || a.scroll.y !== b.scroll.y))) {
      findings.push(finding("scroll-context-changed", "Sticky or transformed fixed positioning needs a new baseline after scrolling.", id, { severity: "info" })); incomparable = true; continue;
    }
    compared++;
    const normalizedFirst = { ...first.rect, x: first.rect.x + first.scroll.x, y: first.rect.y + first.scroll.y };
    const normalizedLast = { ...last.rect, x: last.rect.x + last.scroll.x, y: last.rect.y + last.scroll.y };
    for (const property of ["x", "y", "width", "height"] as const) {
      const delta = normalizedLast[property] - normalizedFirst[property];
      const tolerance = property === "x" || property === "y" ? budget.positionTolerancePx : budget.sizeTolerancePx;
      if (Math.abs(delta) > tolerance && !changes?.has(property)) findings.push(finding(property === "x" || property === "y" ? "position-shift" : "size-shift", "A stable probe exceeded its geometry budget.", id, { before: first.rect, after: last.rect, values: { property, delta, tolerance } }));
    }
  }
  if ((options.nonOverlapping?.length ?? 0) > maxTargets) { findings.push(finding("relation-limit", "At most 512 explicit non-overlap pairs are supported.")); return finish("invalid"); }
  for (const pair of options.nonOverlapping ?? []) {
    if (pair.length !== 2 || !validId(pair[0]) || !validId(pair[1]) || pair[0] === pair[1]) { findings.push(finding("invalid-relation", "Non-overlap relations require two different stable target IDs.")); return finish("invalid"); }
    const first = indexes[1].get(pair[0]), second = indexes[1].get(pair[1]);
    if (!first || !second) { findings.push(finding("relation-target-missing", "A requested non-overlap target is absent from the final capture.", pair[0], { severity: "info", values: { otherTargetId: pair[1] } })); incomparable = true; continue; }
    if (!first.visible || !second.visible) continue;
    const overlapWidth = Math.min(first.rect.x + first.rect.width, second.rect.x + second.rect.width) - Math.max(first.rect.x, second.rect.x);
    const overlapHeight = Math.min(first.rect.y + first.rect.height, second.rect.y + second.rect.height) - Math.max(first.rect.y, second.rect.y);
    if (overlapWidth > budget.positionTolerancePx && overlapHeight > budget.positionTolerancePx) findings.push(finding("target-overlap", "Two explicitly unrelated targets overlap beyond the position tolerance.", pair[0], { before: indexes[0].get(pair[0])?.rect ?? null, after: first.rect, values: { otherTargetId: pair[1], overlapWidth, overlapHeight } }));
  }
  if (findings.some(issue => issue.severity === "error")) return finish("fail");
  if (incomparable || !compared) {
    if (!compared) findings.push(finding("no-comparable-targets", "No visible target geometry was compared.", null, { severity: "info" }));
    return finish("incomparable");
  }
  return finish("pass");
}

export function inspectPopupPlacement(input: PopupPlacementInput): PopupPlacementReport {
  const rawBudget = { gapPx: input.gapPx ?? 8, collisionPaddingPx: input.collisionPaddingPx ?? 8, tolerancePx: input.tolerancePx ?? 1 };
  const budget = { gapPx: nonnegative(rawBudget.gapPx) ? rawBudget.gapPx : 8, collisionPaddingPx: nonnegative(rawBudget.collisionPaddingPx) ? rawBudget.collisionPaddingPx : 8, tolerancePx: nonnegative(rawBudget.tolerancePx) ? rawBudget.tolerancePx : 1 };
  const findings: QualityFinding[] = [];
  const targetId = input.targetId ?? "popup";
  const invalid = (status: "invalid" | "unsupported", code: string, message: string): PopupPlacementReport => ({ status, passed: null, findings: [finding(code, message, validId(targetId) ? targetId : null)], budget, measurements: null });
  const sides: readonly string[] = ["top", "bottom", "left", "right"];
  if (!validId(targetId) || !validRect(input.trigger) || !validRect(input.popup) || !validRect(input.viewport) || !positive(input.trigger.width) || !positive(input.trigger.height) || !positive(input.popup.width) || !positive(input.popup.height) || !positive(input.viewport.width) || !positive(input.viewport.height) || !Object.values(rawBudget).every(nonnegative)) return invalid("invalid", "invalid-placement-input", "Placement requires positive rectangles, a stable ID and finite nonnegative budgets.");
  if (input.actualSide === null) return invalid("unsupported", "placement-side-unavailable", "A settled popup data-side value is required; do not infer a passing placement.");
  if (input.actualAlign === null) return invalid("unsupported", "placement-alignment-unavailable", "A settled popup data-align value is required when actual alignment is requested.");
  if (!sides.includes(input.actualSide) || ![...sides, "inline-start", "inline-end"].includes(input.preferredSide) || !["start", "center", "end"].includes(input.align ?? "start") || !["start", "center", "end"].includes(input.actualAlign ?? input.align ?? "start") || !["ltr", "rtl"].includes(input.direction ?? "ltr")) return invalid("invalid", "invalid-placement-policy", "The popup side, logical alignment or direction is unsupported.");
  const rtl = input.direction === "rtl";
  const preferred: PopupSide = input.preferredSide === "inline-start" ? rtl ? "right" : "left" : input.preferredSide === "inline-end" ? rtl ? "left" : "right" : input.preferredSide;
  const actual = input.actualSide as PopupSide;
  const opposite: Record<PopupSide, PopupSide> = { top: "bottom", bottom: "top", left: "right", right: "left" };
  const trigger = input.trigger, popup = input.popup, viewport = input.viewport;
  const padding = budget.collisionPaddingPx, gap = budget.gapPx, tolerance = budget.tolerancePx;
  const bounds = { left: viewport.x + padding, top: viewport.y + padding, right: viewport.x + viewport.width - padding, bottom: viewport.y + viewport.height - padding };
  if (bounds.right < bounds.left || bounds.bottom < bounds.top) return invalid("invalid", "invalid-placement-padding", "Collision padding consumes the available viewport.");
  const available: Record<PopupSide, number> = { top: trigger.y - gap - bounds.top, bottom: bounds.bottom - (trigger.y + trigger.height + gap), left: trigger.x - gap - bounds.left, right: bounds.right - (trigger.x + trigger.width + gap) };
  const extent = (side: PopupSide) => side === "top" || side === "bottom" ? popup.height : popup.width;
  const fits = (side: PopupSide) => available[side] + tolerance >= extent(side);
  const preferredFits = fits(preferred), oppositeFits = fits(opposite[preferred]);
  if (actual !== preferred) {
    if (input.allowFlip === false) findings.push(finding("flip-disallowed", "The popup flipped despite a no-flip policy.", targetId));
    else if (actual !== opposite[preferred]) findings.push(finding("unexpected-side", "The popup used neither its preferred nor opposite side.", targetId));
    else if (preferredFits) findings.push(finding("unnecessary-flip", "The preferred side had enough space for this popup.", targetId));
    else if (!oppositeFits && available[actual] < available[preferred] - tolerance) findings.push(finding("worse-flip", "The chosen side offers less space than the preferred side.", targetId));
  } else if (!preferredFits && oppositeFits && input.allowFlip !== false) findings.push(finding("missed-flip", "The opposite side fits while the chosen preferred side does not.", targetId));
  const horizontal = actual === "top" || actual === "bottom";
  const align = input.align ?? "start";
  const actualAlign = (input.actualAlign ?? align) as "start" | "center" | "end";
  const start = horizontal ? trigger.x : trigger.y;
  const triggerExtent = horizontal ? trigger.width : trigger.height;
  const popupExtent = horizontal ? popup.width : popup.height;
  const crossMin = horizontal ? bounds.left : bounds.top;
  const crossMax = (horizontal ? bounds.right : bounds.bottom) - popupExtent;
  const ideal = (requested: "start" | "center" | "end") => {
    const resolved = horizontal && rtl && requested !== "center" ? requested === "start" ? "end" : "start" : requested;
    return resolved === "center" ? start + (triggerExtent - popupExtent) / 2 : resolved === "end" ? start + triggerExtent - popupExtent : start;
  };
  const idealCross = ideal(actualAlign);
  if (actualAlign !== align) {
    const preferredCross = ideal(align);
    const preferredOverflow = Math.max(0, crossMin - preferredCross) + Math.max(0, preferredCross - crossMax);
    const actualOverflow = Math.max(0, crossMin - idealCross) + Math.max(0, idealCross - crossMax);
    if (align === "center" || actualAlign === "center") findings.push(finding("unexpected-alignment", "Only opposite start/end collision fallbacks are permitted.", targetId));
    else if (preferredOverflow <= tolerance) findings.push(finding("unnecessary-alignment-flip", "The requested logical alignment fits without flipping.", targetId));
    else if (actualOverflow > preferredOverflow + tolerance) findings.push(finding("worse-alignment-flip", "The chosen alignment overflows more than the requested alignment.", targetId));
  }
  const cross = input.allowShift === false || crossMax < crossMin ? idealCross : Math.min(Math.max(idealCross, crossMin), crossMax);
  const expectedRect: LayoutRect = {
    x: horizontal ? cross : actual === "left" ? trigger.x - gap - popup.width : trigger.x + trigger.width + gap,
    y: !horizontal ? cross : actual === "top" ? trigger.y - gap - popup.height : trigger.y + trigger.height + gap,
    width: popup.width, height: popup.height,
  };
  const actualGapPx = actual === "top" ? trigger.y - popup.y - popup.height : actual === "bottom" ? popup.y - trigger.y - trigger.height : actual === "left" ? trigger.x - popup.x - popup.width : popup.x - trigger.x - trigger.width;
  const alignmentDriftPx = Math.abs((horizontal ? popup.x : popup.y) - cross);
  const overflow = { top: Math.max(0, bounds.top - popup.y), right: Math.max(0, popup.x + popup.width - bounds.right), bottom: Math.max(0, popup.y + popup.height - bounds.bottom), left: Math.max(0, bounds.left - popup.x) };
  if (Object.values(overflow).some(value => value > tolerance)) findings.push(finding("popup-overflow", "The popup exceeds its padded viewport boundary.", targetId, { before: expectedRect, after: popup, values: overflow }));
  const overlapWidth = Math.min(trigger.x + trigger.width, popup.x + popup.width) - Math.max(trigger.x, popup.x);
  const overlapHeight = Math.min(trigger.y + trigger.height, popup.y + popup.height) - Math.max(trigger.y, popup.y);
  if (overlapWidth > tolerance && overlapHeight > tolerance) findings.push(finding("popup-overlap", "The popup overlaps its trigger.", targetId, { before: trigger, after: popup, values: { overlapWidth, overlapHeight } }));
  if (actualGapPx < -tolerance) findings.push(finding("side-geometry-mismatch", "Popup geometry disagrees with its reported data-side.", targetId, { before: expectedRect, after: popup }));
  if (Math.abs(actualGapPx - gap) > tolerance) findings.push(finding("popup-gap", "The trigger-to-popup gap exceeds its placement budget.", targetId, { before: expectedRect, after: popup, values: { actualGapPx, expectedGapPx: gap, tolerance } }));
  if (alignmentDriftPx > tolerance) findings.push(finding("popup-anchor-drift", "The popup does not follow the logical anchor alignment after collision shifting.", targetId, { before: expectedRect, after: popup, values: { alignmentDriftPx, tolerance } }));
  return { status: findings.length ? "fail" : "pass", passed: findings.length === 0, findings, budget, measurements: { resolvedPreferredSide: preferred, actualSide: actual, preferredAlign: align, actualAlign, preferredFits, oppositeFits, expectedRect, actualGapPx, alignmentDriftPx, overflow } };
}
