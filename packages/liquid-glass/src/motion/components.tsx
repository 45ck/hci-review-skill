"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import {
  SegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
  type SegmentedControlOptions,
} from "@ui-sdk/react/segmented-control";
import { useLiquidMotionPolicy } from "./policy";

export type LiquidTransitionRecipe = "fade" | "slide" | "scale" | "blur" | "lift" | "flip" | "draw";

const restingFrame: Keyframe = { opacity: 1, transform: "none", filter: "none", clipPath: "inset(0 0 0 0)" };
const entryFrames: Record<LiquidTransitionRecipe, Keyframe> = {
  fade: { opacity: 0, transform: "none" },
  slide: { opacity: 0, transform: "translateY(12px)" },
  scale: { opacity: 0, transform: "scale(.94)" },
  blur: { opacity: 0, filter: "blur(5px)" },
  lift: { opacity: .3, transform: "translateY(8px) scale(.98)" },
  flip: { opacity: 0, transform: "perspective(600px) rotateX(-12deg)", transformOrigin: "50% 0" },
  draw: { opacity: 1, clipPath: "inset(0 100% 0 0)" },
};
const boundedDuration = (duration: number, scale: number) =>
  Math.min(1200, Math.max(0, (Number.isFinite(duration) ? duration : 240) * (Number.isFinite(scale) ? scale : 1)));

function isVisible(element: Element) {
  if (element.ownerDocument.hidden || !element.getClientRects().length || element.closest("[hidden]")) return false;
  const rect = element.getBoundingClientRect();
  const view = element.ownerDocument.defaultView;
  return !!view && view.getComputedStyle(element).visibility === "visible"
    && rect.bottom > 0 && rect.right > 0 && rect.top < view.innerHeight && rect.left < view.innerWidth;
}

function animateFinite(element: HTMLElement, frames: Keyframe[], duration: number, complete?: () => void) {
  if (!duration || typeof element.animate !== "function" || !isVisible(element)) {
    complete?.();
    return () => {};
  }
  let animation: Animation;
  try { animation = element.animate(frames, { duration, easing: "cubic-bezier(.2,.8,.2,1)", iterations: 1 }); }
  catch { complete?.(); return () => {}; }
  const document = element.ownerDocument;
  const events = new AbortController();
  let observer: IntersectionObserver | undefined;
  let ended = false;
  element.dataset.motionRunning = "true";
  const finish = (notify: boolean) => {
    if (ended) return;
    ended = true;
    events.abort();
    observer?.disconnect();
    animation.cancel();
    delete element.dataset.motionRunning;
    if (notify) complete?.();
  };
  animation.addEventListener("finish", () => finish(true), { signal: events.signal });
  document.addEventListener("visibilitychange", () => { if (document.hidden) finish(true); }, { signal: events.signal });
  if (typeof IntersectionObserver !== "undefined") {
    observer = new IntersectionObserver(entries => { if (!entries[0]?.isIntersecting) finish(true); });
    observer.observe(element);
  }
  return () => finish(false);
}

function currentFrame(element: HTMLElement): Keyframe {
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  return style ? { opacity: style.opacity, transform: style.transform, filter: style.filter, clipPath: style.clipPath } : restingFrame;
}

export type LiquidMotionProps = {
  children: ReactNode;
  transitionKey: string | number;
  recipe?: LiquidTransitionRecipe;
  duration?: number;
  className?: string;
  as?: "div" | "span";
};

export function LiquidMotion({ children, transitionKey, recipe = "fade", duration = 260, className = "", as = "div" }: LiquidMotionProps) {
  const root = useRef<HTMLElement>(null);
  const previous = useRef(transitionKey);
  const interrupt = useRef<Keyframe | null>(null);
  const { enabled, durationScale } = useLiquidMotionPolicy();
  useLayoutEffect(() => {
    const element = root.current;
    const changed = previous.current !== transitionKey;
    previous.current = transitionKey;
    if (!element || !enabled || !changed) { interrupt.current = null; return; }
    const stop = animateFinite(element, [interrupt.current ?? entryFrames[recipe], restingFrame], boundedDuration(duration, durationScale));
    interrupt.current = null;
    return () => {
      if (element.dataset.motionRunning) interrupt.current = currentFrame(element);
      stop();
    };
  }, [transitionKey, recipe, duration, enabled, durationScale]);
  const props = {
    className: `qgm-motion ${className}`.trim(),
    "data-motion-recipe": recipe,
    "data-motion-key": String(transitionKey),
    "data-motion-enabled": String(enabled),
  };
  return as === "span"
    ? <span {...props} ref={root as RefObject<HTMLSpanElement | null>}>{children}</span>
    : <div {...props} ref={root as RefObject<HTMLDivElement | null>}>{children}</div>;
}

export type LiquidPresenceProps = {
  present: boolean;
  children: ReactNode;
  recipe?: LiquidTransitionRecipe;
  duration?: number;
  className?: string;
  restoreFocusRef?: RefObject<HTMLElement | null>;
};

export function LiquidPresence({ present, children, recipe = "scale", duration = 220, className = "", restoreFocusRef }: LiquidPresenceProps) {
  const [retained, setRetained] = useState(present);
  const root = useRef<HTMLDivElement>(null);
  const previous = useRef(present);
  const interrupt = useRef<Keyframe | null>(null);
  const focusWithin = useRef(false);
  const { enabled, durationScale } = useLiquidMotionPolicy();
  const mounted = present || retained;
  useLayoutEffect(() => {
    const element = root.current;
    const wasPresent = previous.current;
    previous.current = present;
    if (!element) return;
    if (present) {
      if (!retained) setRetained(true);
      if (wasPresent || !enabled) { interrupt.current = null; return; }
      const stop = animateFinite(element, [interrupt.current ?? entryFrames[recipe], restingFrame], boundedDuration(duration, durationScale));
      interrupt.current = null;
      return () => {
        if (element.dataset.motionRunning) interrupt.current = currentFrame(element);
        stop();
      };
    }
    if (!retained) return;
    const activeElement = element.ownerDocument.activeElement;
    if (focusWithin.current || activeElement instanceof HTMLElement && element.contains(activeElement)) {
      if (restoreFocusRef?.current && !element.contains(restoreFocusRef.current)) restoreFocusRef.current.focus({ preventScroll: true });
      else if (activeElement instanceof HTMLElement) activeElement.blur();
    }
    focusWithin.current = false;
    const finish = () => { interrupt.current = null; setRetained(false); };
    if (!enabled) { finish(); return; }
    const start = interrupt.current ?? restingFrame;
    interrupt.current = null;
    // The outgoing subtree is inert immediately; only its passive image may remain visible.
    const stop = animateFinite(element, [start, entryFrames[recipe]], boundedDuration(duration, durationScale), finish);
    return () => {
      if (element.dataset.motionRunning) interrupt.current = currentFrame(element);
      stop();
    };
  }, [present, recipe, duration, enabled, durationScale, restoreFocusRef]);
  if (!mounted) return null;
  return <div ref={root} className={`qgm-presence ${className}`.trim()} data-motion-recipe={recipe}
    data-presence={present ? "present" : "exiting"} data-motion-enabled={String(enabled)}
    aria-hidden={present ? undefined : true} data-agent-hidden={present ? undefined : ""} inert={!present}
    onFocusCapture={() => { focusWithin.current = true; }}
    onBlurCapture={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) focusWithin.current = false; }}>
    {children}
  </div>;
}

export type LiquidMotionListItem = { id: string; content: ReactNode };
export type LiquidMotionListProps = {
  items: readonly LiquidMotionListItem[];
  label?: string;
  className?: string;
  itemClassName?: string;
};

export function LiquidMotionList({ items, label, className = "", itemClassName = "" }: LiquidMotionListProps) {
  const root = useRef<HTMLUListElement>(null);
  const elements = useRef(new Map<string, HTMLLIElement>());
  const positions = useRef(new Map<string, { left: number; top: number }>());
  const running = useRef(new Map<string, () => void>());
  const initialized = useRef(false);
  const { enabled, durationScale } = useLiquidMotionPolicy();
  const identity = items.map(item => item.id);
  if (new Set(identity).size !== identity.length || identity.some(id => !id.trim())) throw new Error("LiquidMotionList requires unique, nonempty item IDs.");
  useLayoutEffect(() => {
    const container = root.current;
    if (!container) return;
    const previous = new Map(positions.current);
    for (const [id, element] of elements.current) {
      const old = previous.get(id);
      if (old && element.dataset.motionRunning) {
        const transform = element.ownerDocument.defaultView?.getComputedStyle(element).transform;
        if (transform && transform !== "none" && typeof DOMMatrixReadOnly !== "undefined") {
          const matrix = new DOMMatrixReadOnly(transform);
          previous.set(id, { left: old.left + matrix.m41, top: old.top + matrix.m42 });
        }
      }
    }
    running.current.forEach(stop => stop());
    running.current.clear();
    const parent = container.getBoundingClientRect();
    const next = new Map<string, { left: number; top: number }>();
    for (const [id, element] of elements.current) {
      const rect = element.getBoundingClientRect();
      const position = { left: rect.left - parent.left, top: rect.top - parent.top };
      next.set(id, position);
      if (!initialized.current || !enabled) continue;
      const old = previous.get(id);
      if (old) {
        const x = old.left - position.left, y = old.top - position.top;
        if (Math.abs(x) > .5 || Math.abs(y) > .5)
          running.current.set(id, animateFinite(element, [{ transform: `translate(${x}px, ${y}px)` }, { transform: "none" }], boundedDuration(300, durationScale)));
      } else {
        running.current.set(id, animateFinite(element, [entryFrames.slide, restingFrame], boundedDuration(240, durationScale)));
      }
    }
    positions.current = next;
    initialized.current = true;
  }, [items, enabled, durationScale]);
  useEffect(() => () => { running.current.forEach(stop => stop()); running.current.clear(); }, []);
  return <ul ref={root} className={`qgm-list ${className}`.trim()} aria-label={label} data-motion-enabled={String(enabled)}>
    {items.map(item => <li key={item.id} className={`qgm-list-item ${itemClassName}`.trim()} data-motion-item={item.id}
      ref={element => { if (element) elements.current.set(item.id, element); else elements.current.delete(item.id); }}>
      {item.content}
    </li>)}
  </ul>;
}

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const formatNumber = (value: number) => numberFormat.format(value);
export type LiquidMotionNumberProps = {
  value: number;
  format?: (value: number) => string;
  label?: string;
  duration?: number;
  className?: string;
};

export function LiquidMotionNumber({ value, format = formatNumber, label, duration = 450, className = "" }: LiquidMotionNumberProps) {
  const [display, setDisplay] = useState(value);
  const current = useRef(value);
  const root = useRef<HTMLOutputElement>(null);
  const { enabled, durationScale } = useLiquidMotionPolicy();
  useLayoutEffect(() => {
    const element = root.current;
    const view = element?.ownerDocument.defaultView;
    const time = boundedDuration(duration, durationScale);
    const from = current.current;
    const final = () => { current.current = value; setDisplay(value); if (element) delete element.dataset.motionRunning; };
    if (!element || !view || !enabled || !isVisible(element) || !Number.isFinite(value) || !Number.isFinite(from) || from === value || time === 0) { final(); return; }
    let frame = 0, start: number | undefined, stopped = false;
    const events = new AbortController();
    let observer: IntersectionObserver | undefined;
    const stop = (settle: boolean) => {
      if (stopped) return;
      stopped = true;
      view.cancelAnimationFrame(frame);
      events.abort();
      observer?.disconnect();
      delete element.dataset.motionRunning;
      if (settle) final();
    };
    const tick = (now: number) => {
      if (stopped) return;
      start ??= now;
      const t = Math.min(1, (now - start) / time);
      current.current = from + (value - from) * (1 - (1 - t) ** 3);
      setDisplay(current.current);
      if (t < 1) frame = view.requestAnimationFrame(tick); else stop(true);
    };
    element.dataset.motionRunning = "true";
    element.ownerDocument.addEventListener("visibilitychange", () => { if (element.ownerDocument.hidden) stop(true); }, { signal: events.signal });
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(entries => { if (!entries[0]?.isIntersecting) stop(true); });
      observer.observe(element);
    }
    frame = view.requestAnimationFrame(tick);
    return () => stop(false);
  }, [value, duration, enabled, durationScale]);
  const finalText = Number.isFinite(value) ? format(value) : "—";
  const displayText = Number.isFinite(display) ? format(display) : "—";
  return <output ref={root} className={`qgm-number ${className}`.trim()} aria-label={label} data-motion-value={String(value)}>
    <span className="qgm-visually-hidden">{finalText}</span><span aria-hidden="true">{displayText}</span>
  </output>;
}

export type LiquidTextTransitionProps = { text: string; recipe?: LiquidTransitionRecipe; className?: string };

export function LiquidTextTransition({ text, recipe = "slide", className = "" }: LiquidTextTransitionProps) {
  return <span className={`qgm-text ${className}`.trim()} data-motion-text={text}>
    <span className="qgm-visually-hidden">{text}</span>
    <span aria-hidden="true"><LiquidMotion as="span" recipe={recipe} transitionKey={text}>{text}</LiquidMotion></span>
  </span>;
}

export type LiquidSharedIndicatorProps = {
  label: string;
  value: string | null;
  items: readonly { id: string; label: string; disabled?: boolean }[];
  onValueChange: NonNullable<SegmentedControlOptions<string>["onValueChange"]>;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
};

export function LiquidSharedIndicator({ label, value, items, onValueChange, disabled, readOnly, className = "" }: LiquidSharedIndicatorProps) {
  const { enabled, durationScale } = useLiquidMotionPolicy();
  const style = { "--qgm-selection-duration": `${boundedDuration(260, durationScale)}ms` } as CSSProperties;
  return <SegmentedControl aria-label={label} value={value} disabled={disabled} readOnly={readOnly}
    className={`qgm-shared-selection ${className}`.trim()} data-motion-enabled={String(enabled)} style={style}
    onValueChange={(next, details) => {
      if (next !== null && !items.some(item => item.id === next && !item.disabled)) { details.cancel(); return; }
      onValueChange(next, details);
    }}>
    <span className="qgm-shared-indicator-viewport" aria-hidden="true"><SegmentedControlIndicator className="qgm-shared-indicator" /></span>
    {items.map(item => <SegmentedControlItem key={item.id} value={item.id} disabled={item.disabled}>{item.label}</SegmentedControlItem>)}
  </SegmentedControl>;
}

export type LiquidMotionFeedbackProps = {
  status: "idle" | "pending" | "success" | "error";
  label?: string;
  children?: ReactNode;
  className?: string;
};
const statusLabels = { idle: "Ready", pending: "In progress", success: "Complete", error: "Needs attention" };

export function LiquidMotionFeedback({ status, label, children, className = "" }: LiquidMotionFeedbackProps) {
  return <output className={`qgm-feedback ${className}`.trim()} data-motion-status={status} aria-live="polite" aria-atomic="true">
    <LiquidMotion as="span" transitionKey={status} recipe={status === "success" ? "scale" : "fade"}>
      <span className="qgm-feedback-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" focusable="false">
          {status === "success" ? <path d="m5 12 4.5 4.5L19 6" />
            : status === "error" ? <><circle cx="12" cy="12" r="9" /><path d="M12 7v6m0 4v.01" /></>
              : status === "pending" ? <><circle cx="12" cy="12" r="8" opacity=".25" /><path d="M12 4a8 8 0 0 1 8 8" /></>
                : <circle cx="12" cy="12" r="4" />}
        </svg>
      </span>
    </LiquidMotion>
    <span>{label ?? statusLabels[status]}</span>{children}
  </output>;
}

export type LiquidDepthProps = { children: ReactNode; active?: boolean; className?: string };

export function LiquidDepth({ children, active = false, className = "" }: LiquidDepthProps) {
  const { enabled, durationScale } = useLiquidMotionPolicy();
  return <span className={`qgm-depth ${className}`.trim()} aria-hidden="true" data-depth-active={String(active)}
    data-motion-enabled={String(enabled)} style={{ "--qgm-depth-duration": `${boundedDuration(320, durationScale)}ms` } as CSSProperties}>
    <span className="qgm-depth-art">{children}</span>
  </span>;
}
