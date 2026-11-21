"use client";

import { useEffect, useRef, useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLiquidGlass } from "../webgpu";

export type LiquidCursorVariant = "glass" | "precision" | "native";
export type LiquidCursorProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  variant?: LiquidCursorVariant;
  disabled?: boolean;
};

const nativeTargets = 'input, textarea, select, canvas, iframe, video[controls], audio[controls], [contenteditable]:not([contenteditable="false"]), [data-cursor="native"], [data-qg-native-cursor], [popover]:popover-open, :disabled, [aria-disabled="true"], [aria-busy="true"], [data-pending]';
const controls = 'button, a[href], [role="button"], [role="radio"], [role="checkbox"], [role="switch"], [role="tab"]';

export function LiquidCursor({ children, variant = "glass", disabled = false, className = "", ...props }: LiquidCursorProps) {
  const scope = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLSpanElement>(null);
  const dot = useRef<HTMLSpanElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const { motion } = useLiquidGlass();

  useEffect(() => { setPortal(scope.current?.ownerDocument.body ?? null); }, []);
  useEffect(() => {
    const root = scope.current;
    const layer = overlay.current;
    const halo = ring.current;
    const point = dot.current;
    const caption = label.current;
    if (!root || !layer || !halo || !point || !caption) return;
    const doc = root.ownerDocument;
    const view = doc.defaultView;
    if (!view) return;
    const fine = view.matchMedia("(hover: hover) and (pointer: fine)");
    const colours = view.matchMedia("(forced-colors: active)");
    const events = new AbortController();
    const { signal } = events;
    let frame = 0;
    let last = 0;
    let seen = false;
    let pressed = false;
    let goalSize = 34;
    let target: Element | null = null;
    let dock: { x: number; y: number } | null = null;
    const pointer = { x: 0, y: 0 };
    const current = { x: 0, y: 0, size: 34, scale: 1 };
    const eligible = () => !disabled && variant !== "native" && motion === "enabled" && fine.matches && !colours.matches && !doc.hidden && root.getClientRects().length > 0;

    const hide = () => {
      if (frame) view.cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      seen = false;
      pressed = false;
      layer.hidden = true;
      root.removeAttribute("data-qg-cursor-active");
      root.dataset.qgCursorState = "native";
    };
    const resolve = () => {
      if (!eligible() || !target || !root.contains(target) || target.closest(nativeTargets)) return false;
      const control = target.closest(controls);
      const intent = target.closest("[data-cursor-label]")?.getAttribute("data-cursor-label")?.trim() ?? "";
      const media = target.closest("[data-cursor-media]");
      if (!control && !intent && !media && target.closest("p, h1, h2, h3, h4, blockquote, code, [data-cursor-prose]")) return false;
      const mode = media ? "media" : intent ? "label" : control ? "control" : "idle";
      goalSize = variant === "precision" ? 28 : media ? 86 : control ? 48 : 34;
      layer.dataset.cursorMode = mode;
      if (caption.textContent !== intent) caption.textContent = intent;
      dock = null;
      if (control && variant === "glass") {
        const rect = control.getBoundingClientRect();
        if (rect.width < 190 && rect.height < 80) dock = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }
      return true;
    };
    const paint = (now: number) => {
      frame = 0;
      if (!eligible()) { hide(); return; }
      const seconds = Math.min(48, now - (last || now - 16)) / 1000;
      last = now;
      const x = pointer.x + (dock ? (dock.x - pointer.x) * 0.22 : 0);
      const y = pointer.y + (dock ? (dock.y - pointer.y) * 0.22 : 0);
      const follow = variant === "precision" ? 1 : 1 - Math.exp(-seconds * 26);
      const ease = 1 - Math.exp(-seconds * 24);
      current.x += (x - current.x) * follow;
      current.y += (y - current.y) * follow;
      current.size += (goalSize - current.size) * ease;
      current.scale += ((pressed ? 0.82 : 1) - current.scale) * ease;
      layer.style.setProperty("--liquid-fx-cursor-size", `${current.size}px`);
      layer.style.setProperty("--liquid-fx-cursor-x", `${current.x}px`);
      layer.style.setProperty("--liquid-fx-cursor-y", `${current.y}px`);
      layer.style.setProperty("--liquid-fx-cursor-scale", String(current.scale));
      layer.style.setProperty("--liquid-fx-pointer-x", `${pointer.x}px`);
      layer.style.setProperty("--liquid-fx-pointer-y", `${pointer.y}px`);
      layer.hidden = false;
      root.setAttribute("data-qg-cursor-active", "");
      const settled = Math.abs(x - current.x) < 0.12 && Math.abs(y - current.y) < 0.12 && Math.abs(goalSize - current.size) < 0.12 && Math.abs((pressed ? 0.82 : 1) - current.scale) < 0.002;
      root.dataset.qgCursorState = settled ? "idle" : "tracking";
      if (!settled) frame = view.requestAnimationFrame(paint);
      else last = 0;
    };
    const wake = () => { if (!frame && eligible()) frame = view.requestAnimationFrame(paint); };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") { hide(); return; }
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      target = event.target instanceof Element ? event.target : null;
      if (!resolve()) { hide(); return; }
      if (!seen) { current.x = pointer.x; current.y = pointer.y; current.size = goalSize; seen = true; }
      wake();
    };
    root.addEventListener("pointermove", move, { passive: true, signal });
    root.addEventListener("pointerleave", hide, { signal });
    root.addEventListener("pointercancel", hide, { signal });
    root.addEventListener("contextmenu", hide, { signal });
    root.addEventListener("pointerdown", event => {
      if (event.pointerType !== "mouse" || event.button !== 0 || !seen) return;
      pressed = true;
      wake();
    }, { passive: true, signal });
    doc.addEventListener("pointerup", () => { pressed = false; if (seen) wake(); }, { passive: true, signal });
    doc.addEventListener("keydown", hide, { signal });
    doc.addEventListener("scroll", () => {
      if (!seen) return;
      target = doc.elementFromPoint(pointer.x, pointer.y);
      if (!resolve()) hide(); else wake();
    }, { capture: true, passive: true, signal });
    doc.addEventListener("visibilitychange", hide, { signal });
    view.addEventListener("resize", () => {
      if (!seen) return;
      target = doc.elementFromPoint(pointer.x, pointer.y);
      if (!resolve()) hide(); else wake();
    }, { passive: true, signal });
    view.addEventListener("blur", hide, { signal });
    view.addEventListener("pagehide", hide, { signal });
    fine.addEventListener("change", hide, { signal });
    colours.addEventListener("change", hide, { signal });
    const visibility = typeof IntersectionObserver === "function" ? new IntersectionObserver(entries => { if (!entries[0]?.isIntersecting) hide(); }) : null;
    visibility?.observe(root);
    const availability = new MutationObserver(() => {
      if (seen && (root.querySelector('[data-slot$="-content"][data-open]') || !resolve())) hide();
    });
    availability.observe(root, { attributes: true, subtree: true, attributeFilter: ["disabled", "aria-disabled", "aria-busy", "data-pending", "inert", "hidden", "data-open"] });
    hide();
    return () => { visibility?.disconnect(); availability.disconnect(); events.abort(); hide(); };
  }, [variant, disabled, motion, portal]);

  return <div {...props} ref={scope} className={`qgi-cursor-scope ${className}`} data-cursor-variant={variant}>
    {children}
    {portal && createPortal(<div ref={overlay} className="qgi-cursor" data-cursor-variant={variant} data-liquid-glass="off" data-html2canvas-ignore="" aria-hidden="true" hidden>
      <span ref={ring} className="qgi-cursor-ring" /><span ref={dot} className="qgi-cursor-dot" /><span ref={label} className="qgi-cursor-label" />
    </div>, portal)}
  </div>;
}
