"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import {
  SegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from "@ui-sdk/react/segmented-control";
import { ValidationBadge } from "../validation";
import { useLiquidGlass } from "../webgpu";

export interface LiquidSectionProps extends Omit<ComponentPropsWithoutRef<"section">, "title"> {
  title: ReactNode;
  eyebrow?: ReactNode;
  introduction?: ReactNode;
  actions?: ReactNode;
  headingLevel?: 2 | 3;
}

export function LiquidSection({
  title, eyebrow, introduction, actions, children, className = "", headingLevel = 2, ...props
}: LiquidSectionProps) {
  const titleId = useId();
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return <section {...props} className={`qgs-section ${className}`} aria-labelledby={titleId} data-validation="unvalidated">
    <header className="qgs-section-header">
      <div className="qgs-section-heading">
        {eyebrow && <p className="qgs-eyebrow">{eyebrow}</p>}
        <Heading id={titleId}>{title}</Heading>
        {introduction && <div className="qgs-introduction">{introduction}</div>}
      </div>
      <div className="qgs-section-actions"><ValidationBadge />{actions}</div>
    </header>
    {children}
  </section>;
}

export interface LiquidShowcaseSectionProps extends LiquidSectionProps {
  media: ReactNode;
  mediaCaption: ReactNode;
  layout?: "split" | "immersive";
}

export function LiquidShowcaseSection({
  media, mediaCaption, layout = "split", className = "", children, ...props
}: LiquidShowcaseSectionProps) {
  const captionId = useId();
  return <LiquidSection {...props} className={`qgs-showcase ${className}`} data-section-layout={layout}>
    <figure className="qgs-showcase-media" aria-labelledby={captionId}>
      <div className="qgs-showcase-image">{media}</div>
      <figcaption id={captionId}>{mediaCaption}</figcaption>
    </figure>
    {children && <div className="qgs-showcase-detail">{children}</div>}
  </LiquidSection>;
}

export interface LiquidChapter {
  id: string;
  label: string;
  title: ReactNode;
  content: ReactNode;
  media: ReactNode;
  mediaCaption: ReactNode;
}

export interface LiquidChapterChangeDetails {
  source: string;
  reason: "selection" | "scroll";
  cancel: () => void;
}

export interface LiquidChapterSectionProps extends Omit<LiquidSectionProps, "children" | "onChange"> {
  chapters: readonly LiquidChapter[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string, details: LiquidChapterChangeDetails) => void;
  navigationLabel?: string;
  followScroll?: boolean;
}

export function LiquidChapterSection({
  chapters, value, defaultValue, onValueChange, navigationLabel = "Story chapter",
  followScroll = true, className = "", ...props
}: LiquidChapterSectionProps) {
  const [localValue, setLocalValue] = useState(defaultValue ?? chapters[0]?.id ?? "");
  const selected = chapters.find(chapter => chapter.id === (value ?? localValue)) ?? chapters[0];
  const elements = useRef(new Map<string, HTMLElement>());
  const selectedRef = useRef(selected?.id);
  const changeRef = useRef(onValueChange);
  const controlledRef = useRef(value !== undefined);
  const captionId = useId();
  const chapterPrefix = useId();
  selectedRef.current = selected?.id;
  changeRef.current = onValueChange;
  controlledRef.current = value !== undefined;

  useEffect(() => {
    if (!followScroll) return;
    let frame = 0;
    const stop = () => { cancelAnimationFrame(frame); frame = 0; };
    const follow = () => {
      frame = 0;
      const scope = elements.current.values().next().value;
      if (document.hidden || !scope?.getClientRects().length || scope.closest("[hidden], [aria-hidden='true']")) return;
      const midpoint = window.innerHeight * .45;
      let next: string | undefined;
      let distance = Infinity;
      for (const [id, element] of elements.current) {
        const rect = element.getBoundingClientRect();
        if (rect.bottom <= window.innerHeight * .25 || rect.top >= window.innerHeight * .65) continue;
        const candidate = Math.abs(rect.top + rect.height / 2 - midpoint);
        if (candidate < distance) { next = id; distance = candidate; }
      }
      if (!next || next === selectedRef.current) return;
      let cancelled = false;
      changeRef.current?.(next, { source: "scroll", reason: "scroll", cancel: () => { cancelled = true; } });
      if (!cancelled && !controlledRef.current) {
        selectedRef.current = next;
        setLocalValue(next);
      }
    };
    const scroll = (event: Event) => {
      const scope = elements.current.values().next().value;
      if (!scope || !(event.target instanceof Node) || !event.target.contains(scope) || frame) return;
      // Follow actual scrolling; resizing or changing typography alone must preserve selection.
      frame = requestAnimationFrame(follow);
    };
    document.addEventListener("scroll", scroll, { capture: true, passive: true });
    document.addEventListener("visibilitychange", stop);
    return () => { document.removeEventListener("scroll", scroll, true); document.removeEventListener("visibilitychange", stop); stop(); };
  }, [chapters, followScroll]);

  return <LiquidSection {...props} className={`qgs-chapters ${className}`} data-active-chapter={selected?.id ?? ""}>
    {!selected ? <p className="qgs-empty">Add a chapter to show its story and media.</p> : <div className="qgs-chapter-layout">
      <div className="qgs-chapter-stage">
        <SegmentedControl aria-label={navigationLabel} value={selected.id} className="qgs-chapter-navigation" data-liquid-layout="wrap"
          onValueChange={(next, details) => {
            if (!next || !chapters.some(chapter => chapter.id === next)) { details.cancel(); return; }
            let cancelled = false;
            onValueChange?.(next, { source: details.source, reason: "selection", cancel: () => { cancelled = true; details.cancel(); } });
            if (cancelled) return;
            if (value === undefined) setLocalValue(next);
            const target = elements.current.get(next);
            const layout = target?.parentElement?.parentElement;
            // Keep the media in view on small screens; desktop chapters align beside the sticky image.
            if (layout && layout.getBoundingClientRect().width > 680 && window.innerWidth > 900)
              target?.scrollIntoView({ behavior: "instant", block: "center" });
          }}>
          <SegmentedControlIndicator />
          {chapters.map(chapter => <SegmentedControlItem key={chapter.id} value={chapter.id}>{chapter.label}</SegmentedControlItem>)}
        </SegmentedControl>
        <figure className="qgs-chapter-figure" aria-labelledby={captionId}>
          <div className="qgs-chapter-media" key={selected.id}>{selected.media}</div>
          <figcaption id={captionId}>{selected.mediaCaption}</figcaption>
        </figure>
      </div>
      <div className="qgs-chapter-copy">
        {chapters.map(chapter => <article key={chapter.id} id={`${chapterPrefix}-${chapter.id}`}
          ref={element => { if (element) elements.current.set(chapter.id, element); else elements.current.delete(chapter.id); }}
          className="qgs-chapter" data-chapter-id={chapter.id} data-active={chapter.id === selected.id ? "true" : "false"}
          aria-labelledby={`${chapterPrefix}-${chapter.id}-title`}>
          <p className="qgs-eyebrow">{chapter.label}</p>
          <h3 id={`${chapterPrefix}-${chapter.id}-title`}>{chapter.title}</h3>
          <div className="qgs-chapter-body">{chapter.content}</div>
        </article>)}
      </div>
    </div>}
  </LiquidSection>;
}

export interface LiquidSectionContourProps {
  variant?: "wave" | "ridge" | "orbit";
  edge?: "start" | "end";
  className?: string;
}

export function LiquidSectionContour({ variant = "wave", edge = "start", className = "" }: LiquidSectionContourProps) {
  const gradientId = useId();
  const paths = {
    wave: ["M-30 74C240 140 440 20 720 66S1200 130 1470 58", "M-30 100C240 166 440 46 720 92S1200 156 1470 84", "M-30 126C240 192 440 72 720 118S1200 182 1470 110"],
    ridge: ["M-30 170 220 94 420 136 690 40 930 100 1160 58 1470 134", "M-30 194 220 118 420 160 690 64 930 124 1160 82 1470 158", "M-30 218 220 142 420 184 690 88 930 148 1160 106 1470 182"],
    orbit: ["M-30 170C260 170 440 -30 720 38S1150 260 1470 118", "M-30 146C260 146 440 -54 720 14S1150 236 1470 94", "M-30 122C260 122 440 -78 720 -10S1150 212 1470 70"],
  };
  return <svg className={`qgs-contour ${className}`} data-edge={edge} data-contour={variant} viewBox="0 0 1440 220" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs><linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="currentColor" stopOpacity="0" /><stop offset=".5" stopColor="currentColor" stopOpacity=".5" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
    {paths[variant].map(path => <path key={path} d={path} fill="none" stroke={`url(#${gradientId})`} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />)}
  </svg>;
}

export interface LiquidRevealProps extends ComponentPropsWithoutRef<"div"> {
  once?: boolean;
}

export function LiquidReveal({ once = true, children, className = "", ...props }: LiquidRevealProps) {
  const element = useRef<HTMLDivElement>(null);
  const { motion } = useLiquidGlass();
  useEffect(() => {
    const target = element.current;
    if (!target || motion !== "enabled" || typeof IntersectionObserver === "undefined" || typeof target.animate !== "function") return;
    let animation: Animation | undefined;
    const forcedColours = matchMedia("(forced-colors: active)");
    const stop = () => animation?.cancel();
    const observer = new IntersectionObserver(entries => {
      if (document.hidden || forcedColours.matches || target.closest("[hidden], [aria-hidden='true']")) return;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        animation?.cancel();
        animation = target.animate([{ opacity: .4 }, { opacity: 1 }], { duration: 380, easing: "ease-out" });
        if (once) observer.unobserve(target);
      }
    }, { threshold: .15 });
    observer.observe(target);
    document.addEventListener("visibilitychange", stop);
    forcedColours.addEventListener("change", stop);
    return () => { observer.disconnect(); stop(); document.removeEventListener("visibilitychange", stop); forcedColours.removeEventListener("change", stop); };
  }, [once, motion]);
  return <div {...props} ref={element} className={`qgs-reveal ${className}`} data-validation="unvalidated">{children}</div>;
}
