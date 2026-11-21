"use client";

import { useEffect, useId, useLayoutEffect, useRef } from "react";
import { useLiquidAppearance } from "../appearance";
import { LiquidIcon } from "../icons";
import type { LiquidIconName } from "../icons";
import { useLiquidGlass } from "../webgpu";
import { LIQUID_MORPH_DEFINITIONS, liquidMorphPaths } from "./icon-data";
import type { LiquidIconEffect, LiquidMorphPair } from "./icon-data";
import { useLiquidMotionPolicy } from "./policy";

const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
const semanticTrigger = 'button, a[href], summary, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="switch"], [role="checkbox"], [role="radio"], [data-icon-trigger]';

function visible(root: HTMLElement) {
  const view = root.ownerDocument.defaultView;
  if (!view || root.ownerDocument.hidden || !root.isConnected || !root.getClientRects().length) return false;
  if (root.parentElement?.closest("[hidden], [inert]")) return false;
  const style = view.getComputedStyle(root);
  const bounds = root.getBoundingClientRect();
  return style.visibility !== "hidden" && style.display !== "none" && bounds.width > 0 && bounds.height > 0 &&
    bounds.bottom > 0 && bounds.right > 0 && bounds.top < view.innerHeight && bounds.left < view.innerWidth;
}

function observeAvailability(root: HTMLElement, stop: () => void) {
  const doc = root.ownerDocument;
  const view = doc.defaultView;
  if (!view) return () => {};
  const colours = view.matchMedia("(forced-colors: active)");
  const reduce = view.matchMedia("(prefers-reduced-motion: reduce)");
  const check = () => { if (colours.matches || reduce.matches || !visible(root)) stop(); };
  const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => {
    if (!entries[0]?.isIntersecting) stop();
  });
  observer?.observe(root);
  const ancestry = typeof MutationObserver === "undefined" ? null : new MutationObserver(check);
  for (let node = root.parentElement; node; node = node.parentElement) {
    ancestry?.observe(node, { attributes: true, attributeFilter: ["hidden", "inert", "class", "style", "data-closed", "data-ending-style"] });
  }
  doc.addEventListener("visibilitychange", check);
  colours.addEventListener("change", check);
  reduce.addEventListener("change", check);
  check();
  return () => {
    observer?.disconnect();
    ancestry?.disconnect();
    doc.removeEventListener("visibilitychange", check);
    colours.removeEventListener("change", check);
    reduce.removeEventListener("change", check);
  };
}

function mediaAllowsMotion(root: HTMLElement) {
  const view = root.ownerDocument.defaultView;
  return !!view && !view.matchMedia("(forced-colors: active)").matches &&
    !view.matchMedia("(prefers-reduced-motion: reduce)").matches && visible(root);
}

function boundedSize(size: number) {
  return Number.isFinite(size) ? Math.max(8, Math.min(160, size)) : 24;
}

export type LiquidMorphIconProps = {
  pair: LiquidMorphPair;
  active: boolean;
  size?: number;
  className?: string;
};

export function LiquidMorphIcon({ pair, active, size = 24, className = "" }: LiquidMorphIconProps) {
  const root = useRef<HTMLSpanElement>(null);
  const progress = useRef(active ? 1 : 0);
  const previous = useRef({ pair, active });
  const mounted = useRef(false);
  const { iconSet } = useLiquidAppearance();
  const { motion } = useLiquidGlass();
  const policy = useLiquidMotionPolicy();
  const prefix = `qgm-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const dimension = boundedSize(size);
  const definition = LIQUID_MORPH_DEFINITIONS[pair];
  const statePaths = liquidMorphPaths(pair, active ? 1 : 0);

  useClientLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const view = element.ownerDocument.defaultView;
    if (!view) return;
    const paths = element.querySelectorAll<SVGPathElement>("[data-qgm-part]");
    const target = active ? 1 : 0;
    let frame = 0;
    let live = true;
    const write = (value: number) => {
      progress.current = value;
      const geometry = liquidMorphPaths(pair, value);
      for (const path of paths) {
        const part = geometry[Number(path.dataset.qgmPart)];
        if (!part) continue;
        path.setAttribute("d", part.d);
        path.setAttribute("opacity", String(part.opacity));
        path.setAttribute("fill-opacity", String(part.fillOpacity));
      }
      element.dataset.motionProgress = value.toFixed(4);
    };
    const settle = () => {
      view.cancelAnimationFrame(frame);
      frame = 0;
      write(target);
      element.dataset.motionStatus = "idle";
    };
    const changed = mounted.current && previous.current.pair === pair && previous.current.active !== active;
    previous.current = { pair, active };
    mounted.current = true;
    if (!changed || !policy.enabled || motion !== "enabled" || !mediaAllowsMotion(element)) {
      settle();
      return () => { live = false; view.cancelAnimationFrame(frame); };
    }
    const from = progress.current;
    const duration = Math.max(40, 240 * policy.durationScale * Math.abs(target - from));
    const started = view.performance.now();
    write(from);
    element.dataset.motionStatus = "running";
    const tick = (now: number) => {
      if (!live) return;
      if (!mediaAllowsMotion(element)) { settle(); return; }
      const t = Math.min(1, Math.max(0, (now - started) / duration));
      write(from + (target - from) * (1 - (1 - t) ** 3));
      if (t < 1) frame = view.requestAnimationFrame(tick);
      else settle();
    };
    frame = view.requestAnimationFrame(tick);
    const dispose = observeAvailability(element, settle);
    return () => {
      live = false;
      view.cancelAnimationFrame(frame);
      dispose();
    };
  }, [active, pair, motion, policy.enabled, policy.durationScale]);

  const renderPaths = (surface: "line" | "front" | "depth") => definition.parts.map((part, index) => (
    <path key={index} data-qgm-part={index} data-qgm-solid={part.solid ? "true" : undefined}
      data-qgm-fill={part.fillOpacity ? "vary" : undefined}
      d={statePaths[index].d} opacity={statePaths[index].opacity} fillOpacity={statePaths[index].fillOpacity}
      fill={surface === "line" ? undefined : part.solid ? `url(#${prefix}-${surface})` : "none"}
      stroke={surface === "line" ? undefined : `url(#${prefix}-${surface === "depth" ? "depth" : part.solid ? "rim" : "front"})`} />
  ));

  return <span ref={root} className={`qgm-morph-icon ${className}`.trim()} aria-hidden="true"
    data-liquid-morph={pair} data-motion-active={active ? "true" : "false"}
    data-icon-style={iconSet === "isometric" && dimension >= 20 ? "isometric" : "line"}
    style={{ width: dimension, height: dimension }}>
    <svg viewBox="0 0 24 24" data-qgm-variant="line" focusable="false" aria-hidden="true">{renderPaths("line")}</svg>
    <svg viewBox="0 0 28 28" data-qgm-variant="isometric" focusable="false" aria-hidden="true">
      <defs>
        <linearGradient id={`${prefix}-front`} x1="10%" y1="0%" x2="75%" y2="100%">
          <stop offset="0%" stopColor="#effbff" /><stop offset="26%" stopColor="#b9dce8" />
          <stop offset="68%" stopColor="#5aafbf" /><stop offset="100%" stopColor="#b6f1e8" />
        </linearGradient>
        <linearGradient id={`${prefix}-depth`} x1="0%" y1="0%" x2="100%" y2="85%">
          <stop offset="0%" stopColor="#7ab5ca" /><stop offset="50%" stopColor="#2e7595" /><stop offset="100%" stopColor="#5aaeb7" />
        </linearGradient>
        <linearGradient id={`${prefix}-rim`} x1="0%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" /><stop offset="100%" stopColor="#9ed9df" />
        </linearGradient>
      </defs>
      <g transform="matrix(.88 .26 -.34 .78 7 1)">
        <g data-qgm-depth="" transform="translate(1.2 2.3)">{renderPaths("depth")}</g>
        <g>{renderPaths("front")}</g>
      </g>
    </svg>
  </span>;
}

export type LiquidAnimatedIconProps = {
  name: LiquidIconName;
  effect: LiquidIconEffect;
  trigger?: "hover" | "state";
  active?: boolean;
  revision?: number;
  size?: number;
  className?: string;
};

type IconPlayer = { play: () => void; stop: () => void };

export function LiquidAnimatedIcon({ name, effect, trigger = "hover", active, revision = 0, size = 24, className = "" }: LiquidAnimatedIconProps) {
  const root = useRef<HTMLSpanElement>(null);
  const player = useRef<IconPlayer | null>(null);
  const previous = useRef({ active, revision, name, effect, trigger });
  const { iconSet } = useLiquidAppearance();
  const { motion } = useLiquidGlass();
  const policy = useLiquidMotionPolicy();
  const dimension = boundedSize(size);

  useClientLayoutEffect(() => {
    const element = root.current;
    const graphic = element?.querySelector<HTMLElement>(".qg-icon");
    const view = element?.ownerDocument.defaultView;
    if (!element || !graphic || !view) return;
    const animations = new Set<Animation>();
    let live = true;
    const stop = () => {
      for (const animation of animations) animation.cancel();
      animations.clear();
      element.dataset.motionStatus = "idle";
    };
    const animate = (target: Element, frames: Keyframe[], duration: number, delay = 0) => {
      if (typeof target.animate !== "function") return;
      let animation: Animation;
      try {
        animation = target.animate(frames, {
          duration: Math.max(60, duration * policy.durationScale), delay: delay * policy.durationScale,
          easing: "cubic-bezier(.2,.7,.2,1)", iterations: 1, fill: "none",
        });
      } catch { return; }
      animations.add(animation);
      element.dataset.motionStatus = "running";
      const finished = () => {
        animations.delete(animation);
        if (!animations.size && live) element.dataset.motionStatus = "idle";
      };
      animation.addEventListener("finish", finished, { once: true });
      animation.addEventListener("cancel", finished, { once: true });
    };
    const play = () => {
      stop();
      if (!live || !policy.enabled || motion !== "enabled" || !mediaAllowsMotion(element)) return;
      const parent = element.closest(semanticTrigger);
      if (parent?.closest(':disabled, [aria-disabled="true"], [aria-busy="true"], [data-pending]')) return;
      const svg = Array.from(graphic.querySelectorAll<SVGSVGElement>("svg")).find(node => view.getComputedStyle(node).display !== "none");
      if (!svg) return;
      const shapes = Array.from(svg.children).filter(node => node.tagName.toLowerCase() !== "defs");
      const expressive = policy.preset === "expressive" ? 1.3 : policy.preset === "calm" ? .65 : 1;
      if (effect === "draw") {
        for (const [index, path] of Array.from(svg.querySelectorAll<SVGPathElement>("path")).entries()) {
          if (view.getComputedStyle(path).stroke === "none") continue;
          let length = 0;
          try { length = path.getTotalLength(); } catch { continue; }
          if (!length) continue;
          animate(path, [
            { strokeDasharray: `${length} ${length}`, strokeDashoffset: length },
            { strokeDasharray: `${length} ${length}`, strokeDashoffset: 0 },
          ], 440, Math.min(index * 20, 100));
        }
      } else if (effect === "ring") {
        animate(svg, [0, -15, 11, -6, 3, 0].map(angle => ({ rotate: `${angle * expressive}deg`, transformOrigin: "50% 22%" })), 480);
        const clapper = name === "bell" ? svg.querySelector("ellipse") : null;
        if (clapper) animate(clapper, [0, 2, -1.5, 0].map(x => ({ translate: `${x}px 0` })), 420, 30);
      } else if (effect === "lift" && name === "layers") {
        for (const [index, shape] of shapes.entries()) {
          const rank = shapes.length > 3 ? Math.floor(index / 3) : index;
          animate(shape, [{ translate: "0 0" }, { translate: `0 ${-(rank + 1) * 1.7 * expressive}px` }, { translate: "0 0" }], 440, rank * 28);
        }
      } else if (effect === "pulse" && name === "activity") {
        for (const [index, shape] of shapes.entries()) {
          const rank = shapes.length > 3 ? Math.floor(index / 3) : index;
          animate(shape, [{ scale: "1 1", transformOrigin: "center bottom" }, { scale: "1 .72", transformOrigin: "center bottom" }, { scale: "1 1", transformOrigin: "center bottom" }], 400, rank * 65);
        }
      } else if (effect === "spark" && name === "sparkles") {
        for (const [index, shape] of shapes.entries()) {
          animate(shape, [{ opacity: 1 }, { opacity: .62, scale: String(1 + .12 * expressive) }, { opacity: 1, scale: "1" }], 420, Math.min(index * 45, 160));
        }
      } else {
        const frames: Record<Exclude<LiquidIconEffect, "draw" | "ring">, Keyframe[]> = {
          lift: [0, -3 * expressive, 0].map(y => ({ translate: `0 ${y}px` })),
          spin: [{ rotate: "0deg" }, { rotate: "360deg" }],
          pulse: [1, 1 + .1 * expressive, 1].map(scale => ({ scale: String(scale) })),
          tilt: [0, -9 * expressive, 3 * expressive, 0].map(angle => ({ rotate: `${angle}deg` })),
          bounce: [0, -4 * expressive, 0, -1.5 * expressive, 0].map(y => ({ translate: `0 ${y}px` })),
          shake: [0, -2 * expressive, 2 * expressive, -1 * expressive, 0].map(x => ({ translate: `${x}px 0` })),
          spark: [{ opacity: 1, scale: "1" }, { opacity: .7, scale: String(1 + .13 * expressive) }, { opacity: 1, scale: "1" }],
        };
        animate(graphic, frames[effect], effect === "spin" ? 560 : 420);
      }
    };
    player.current = { play, stop };
    element.dataset.motionStatus = "idle";
    const target = element.closest(semanticTrigger) ?? element;
    const enter = (event: Event) => {
      if ("pointerType" in event && event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      play();
    };
    const leave = () => stop();
    if (trigger === "hover") {
      target.addEventListener("pointerenter", enter);
      target.addEventListener("pointerleave", leave);
      target.addEventListener("focusin", enter);
      target.addEventListener("focusout", leave);
    }
    const dispose = observeAvailability(element, stop);
    return () => {
      live = false;
      dispose();
      target.removeEventListener("pointerenter", enter);
      target.removeEventListener("pointerleave", leave);
      target.removeEventListener("focusin", enter);
      target.removeEventListener("focusout", leave);
      stop();
      player.current = null;
    };
  }, [name, effect, trigger, motion, iconSet, policy.enabled, policy.durationScale, policy.preset]);

  useClientLayoutEffect(() => {
    const old = previous.current;
    previous.current = { active, revision, name, effect, trigger };
    if (old.name !== name || old.effect !== effect || old.trigger !== trigger) return;
    if (trigger === "state" && active === false) { player.current?.stop(); return; }
    if ((trigger === "state" && active === true && old.active !== true) || (Number.isFinite(revision) && revision !== old.revision)) player.current?.play();
  }, [active, revision, name, effect, trigger]);

  return <span ref={root} className={`qgm-animated-icon ${className}`.trim()} aria-hidden="true"
    data-liquid-animated-icon={name} data-motion-effect={effect} data-motion-trigger={trigger}
    data-motion-active={active === undefined ? undefined : String(active)} style={{ width: dimension, height: dimension }}>
    <LiquidIcon name={name} size={dimension} />
  </span>;
}
