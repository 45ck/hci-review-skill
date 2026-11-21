"use client";

import { useEffect, useRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { useLiquidGlass } from "../webgpu";

export type LiquidClickEffect = "ripple" | "spark" | "none";
export type LiquidClickFeedbackProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  effect?: LiquidClickEffect;
};

export function LiquidClickFeedback({ children, effect = "ripple", className = "", ...props }: LiquidClickFeedbackProps) {
  const scope = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const { motion } = useLiquidGlass();

  useEffect(() => {
    const root = scope.current;
    const overlay = layer.current;
    if (!root || !overlay || effect === "none" || motion !== "enabled") return;
    const doc = root.ownerDocument;
    const view = doc.defaultView;
    if (!view) return;
    const colours = view.matchMedia("(forced-colors: active)");
    const active = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
    let live = true;
    const remove = (node: HTMLElement) => {
      clearTimeout(active.get(node));
      active.delete(node);
      node.remove();
      root.dataset.qgActiveClicks = String(active.size);
    };
    const clear = () => { for (const node of active.keys()) remove(node); };
    const click = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('button, a[href], [role="button"], [role="radio"], [role="checkbox"], [role="switch"], [role="tab"]') : null;
      if (!target || !root.contains(target) || event.button !== 0 || colours.matches || doc.hidden || target.closest(':disabled, [aria-disabled="true"], [aria-busy="true"], [data-pending], [data-click-feedback="off"]')) return;
      queueMicrotask(() => {
        if (!live || event.defaultPrevented || !target.isConnected || doc.hidden || colours.matches || !root.getClientRects().length) return;
        const bounds = root.getBoundingClientRect();
        const rect = target.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const node = doc.createElement("span");
        node.className = "qgi-click-burst";
        node.dataset.effect = effect;
        node.style.left = `${rect.left - bounds.left + root.scrollLeft}px`;
        node.style.top = `${rect.top - bounds.top + root.scrollTop}px`;
        node.style.width = `${rect.width}px`;
        node.style.height = `${rect.height}px`;
        node.style.borderRadius = view.getComputedStyle(target).borderRadius;
        const x = event.detail === 0 ? rect.width / 2 : Math.max(0, Math.min(rect.width, event.clientX - rect.left));
        const y = event.detail === 0 ? rect.height / 2 : Math.max(0, Math.min(rect.height, event.clientY - rect.top));
        node.style.setProperty("--qgi-click-x", `${x}px`);
        node.style.setProperty("--qgi-click-y", `${y}px`);
        if (effect === "spark") {
          for (let i = 0; i < 8; i++) {
            const ray = doc.createElement("i");
            ray.style.setProperty("--qgi-ray-angle", `${i * 45}deg`);
            node.append(ray);
          }
        } else node.append(doc.createElement("i"));
        while (active.size >= 6) remove(active.keys().next().value!);
        overlay.append(node);
        active.set(node, setTimeout(() => remove(node), 560));
        root.dataset.qgActiveClicks = String(active.size);
      });
    };
    const visibility = () => { if (doc.hidden) clear(); };
    root.addEventListener("click", click);
    doc.addEventListener("visibilitychange", visibility);
    colours.addEventListener("change", clear);
    const observer = typeof IntersectionObserver === "function" ? new IntersectionObserver(entries => { if (!entries[0]?.isIntersecting) clear(); }) : null;
    observer?.observe(root);
    return () => {
      live = false;
      observer?.disconnect();
      root.removeEventListener("click", click);
      doc.removeEventListener("visibilitychange", visibility);
      colours.removeEventListener("change", clear);
      clear();
    };
  }, [effect, motion]);

  return <div {...props} ref={scope} className={`qgi-click-scope ${className}`} data-click-effect={effect}>
    {children}<div ref={layer} className="qgi-click-layer" data-liquid-glass="off" data-html2canvas-ignore="" aria-hidden="true" />
  </div>;
}
