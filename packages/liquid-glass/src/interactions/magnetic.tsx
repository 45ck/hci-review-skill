"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useLiquidGlass } from "../webgpu";

export type LiquidMagneticProps = { children: ReactNode; distance?: number; className?: string };

export function LiquidMagnetic({ children, distance = 6, className = "" }: LiquidMagneticProps) {
  const root = useRef<HTMLSpanElement>(null);
  const { motion } = useLiquidGlass();
  useEffect(() => {
    const element = root.current;
    const target = element?.closest("button, a[href], [role=button]") ?? element;
    if (!element || !target || motion !== "enabled") return;
    const view = element.ownerDocument.defaultView;
    if (!view) return;
    const fine = view.matchMedia("(hover: hover) and (pointer: fine)");
    const colours = view.matchMedia("(forced-colors: active)");
    const limit = Number.isFinite(distance) ? Math.max(0, Math.min(distance, 12)) : 6;
    const events = new AbortController();
    let frame = 0;
    let x = 0;
    let y = 0;
    const reset = () => {
      if (frame) view.cancelAnimationFrame(frame);
      frame = 0;
      element.style.removeProperty("--liquid-fx-magnetic-x");
      element.style.removeProperty("--liquid-fx-magnetic-y");
    };
    const move = (event: Event) => {
      const pointer = event as PointerEvent;
      if (pointer.pointerType !== "mouse" || !fine.matches || colours.matches || target.matches(':disabled, [aria-disabled="true"], [aria-busy="true"], :focus-visible')) { reset(); return; }
      x = pointer.clientX;
      y = pointer.clientY;
      if (frame) return;
      frame = view.requestAnimationFrame(() => {
        frame = 0;
        const rect = target.getBoundingClientRect();
        if (!rect.width || !rect.height || !element.getClientRects().length) { reset(); return; }
        element.style.setProperty("--liquid-fx-magnetic-x", `${Math.max(-1, Math.min(1, (x - rect.left) / rect.width * 2 - 1)) * limit}px`);
        element.style.setProperty("--liquid-fx-magnetic-y", `${Math.max(-1, Math.min(1, (y - rect.top) / rect.height * 2 - 1)) * limit}px`);
      });
    };
    target.addEventListener("pointermove", move, { passive: true, signal: events.signal });
    for (const name of ["pointerleave", "pointercancel", "focusin"]) target.addEventListener(name, reset, { signal: events.signal });
    view.addEventListener("blur", reset, { signal: events.signal });
    element.ownerDocument.addEventListener("visibilitychange", reset, { signal: events.signal });
    fine.addEventListener("change", reset, { signal: events.signal });
    colours.addEventListener("change", reset, { signal: events.signal });
    const visibility = typeof IntersectionObserver === "function" ? new IntersectionObserver(entries => { if (!entries[0]?.isIntersecting) reset(); }) : null;
    visibility?.observe(element);
    const availability = new MutationObserver(() => { if (target.matches(':disabled, [aria-disabled="true"], [aria-busy="true"], [data-pending]')) reset(); });
    availability.observe(target, { attributes: true, attributeFilter: ["disabled", "aria-disabled", "aria-busy", "data-pending"] });
    return () => { visibility?.disconnect(); availability.disconnect(); events.abort(); reset(); };
  }, [distance, motion]);
  return <span ref={root} className={`qgi-magnetic ${className}`} aria-hidden="true"><span className="qgi-magnetic-art">{children}</span></span>;
}
