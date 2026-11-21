"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { LiquidIcon, type LiquidIconName } from "../icons";
import { useLiquidMotionPolicy } from "./policy";

export type LiquidMotionPose = { x?: number; y?: number; rotation?: number; scale?: number; opacity?: number; depth?: number };
export type LiquidMotionLayer = { id: string; icon: LiquidIconName; poses: Record<string, LiquidMotionPose> };
export type LiquidMotionSceneDefinition = { id: string; label: string; states: readonly string[]; layers: readonly LiquidMotionLayer[] };

const finite = (value: number | undefined, fallback: number, min: number, max: number) => Number.isFinite(value) ? Math.max(min, Math.min(max, value!)) : fallback;
const poseStyle = (pose: LiquidMotionPose) => ({
  transform: `translate(${finite(pose.x, 0, -1000, 1000)}px, ${finite(pose.y, 0, -1000, 1000)}px) rotate(${finite(pose.rotation, 0, -3600, 3600)}deg) scale(${finite(pose.scale, 1, 0, 4)})`,
  opacity: String(finite(pose.opacity, 1, 0, 1)),
  filter: `drop-shadow(0 ${finite(pose.depth, 0, 0, 24)}px ${finite(pose.depth, 0, 0, 24) * 1.5}px rgba(19,54,64,.2))`,
});

function SceneLayer({ layer, state }: { layer: LiquidMotionLayer; state: string }) {
  const element = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation | null>(null);
  const interrupted = useRef<Keyframe | null>(null);
  const previous = useRef<string | null>(null);
  const policy = useLiquidMotionPolicy();
  const pose = poseStyle(layer.poses[state] ?? {});
  const key = JSON.stringify(pose);
  useLayoutEffect(() => {
    const node = element.current;
    if (!node) return;
    const visible = !node.ownerDocument.hidden && !node.closest("[hidden], [inert]") && node.getClientRects().length > 0;
    const before = getComputedStyle(node);
    const start = interrupted.current ?? { transform: before.transform, opacity: before.opacity, filter: before.filter };
    interrupted.current = null;
    animation.current?.cancel();
    Object.assign(node.style, pose);
    if (previous.current !== null && previous.current !== key && policy.enabled && visible && typeof node.animate === "function") {
      animation.current = node.animate([start, pose], { duration: 360 * policy.durationScale, easing: "cubic-bezier(.2,.8,.2,1)" });
    }
    previous.current = key;
    const stop = () => { animation.current?.cancel(); animation.current = null; };
    const onVisibility = () => { if (node.ownerDocument.hidden) stop(); };
    node.ownerDocument.addEventListener("visibilitychange", onVisibility);
    const observer = typeof IntersectionObserver === "function" ? new IntersectionObserver(entries => { if (!entries[0]?.isIntersecting) stop(); }) : null;
    observer?.observe(node);
    return () => {
      if (animation.current?.playState === "running") {
        const frame = getComputedStyle(node);
        interrupted.current = { transform: frame.transform, opacity: frame.opacity, filter: frame.filter };
      }
      observer?.disconnect(); node.ownerDocument.removeEventListener("visibilitychange", onVisibility); stop();
    };
  }, [key, policy.enabled, policy.durationScale]);
  return <div ref={element} className="qgm-scene-layer" data-motion-layer={layer.id}><LiquidIcon name={layer.icon} size={64} /></div>;
}

export function LiquidMotionScene({ scene, state, className = "" }: { scene: LiquidMotionSceneDefinition; state: string; className?: string }) {
  const known = scene.states.includes(state);
  return <div className={`qgm-scene ${className}`.trim()} role="img" aria-label={`${scene.label}: ${known ? state : "unavailable"}`}
    data-motion-scene={scene.id} data-scene-state={state} data-validation="unvalidated">
    <div aria-hidden="true">{known && scene.layers.map(layer => <SceneLayer key={layer.id} layer={layer} state={state} />)}</div>
    {!known && <span>Scene state unavailable</span>}
  </div>;
}

export type LiquidMotionAssetProperties = Readonly<Record<string, string | number | boolean>>;
export type LiquidMotionAssetController = {
  update: (properties: LiquidMotionAssetProperties) => void;
  pause: () => void;
  resume: () => void;
  dispose: () => void;
};
export type LiquidMotionAssetRuntime = {
  mount: (element: HTMLElement, signal: AbortSignal) => LiquidMotionAssetController | Promise<LiquidMotionAssetController>;
};

export function LiquidMotionAsset({ label, runtime, properties, fallback, className = "", onError }: {
  label: string;
  runtime: LiquidMotionAssetRuntime;
  properties: LiquidMotionAssetProperties;
  fallback: ReactNode;
  className?: string;
  onError?: (error: unknown) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const controller = useRef<{ instance: LiquidMotionAssetController; fail: (error: unknown) => void } | null>(null);
  const current = useRef(properties);
  const errorHandler = useRef(onError);
  const policy = useLiquidMotionPolicy();
  current.current = properties;
  errorHandler.current = onError;
  useEffect(() => {
    const element = container.current;
    if (!element || !policy.enabled) return;
    const abort = new AbortController();
    const host = element.ownerDocument.createElement("div");
    element.append(host);
    let visible = true;
    let disposed = false;
    let instance: LiquidMotionAssetController | null = null;
    // Reporting failures must not interrupt renderer disposal or leave a stale host alive.
    const report = (error: unknown) => { try { errorHandler.current?.(error); } catch { /* host diagnostic callback */ } };
    const dispose = (value: LiquidMotionAssetController | null) => {
      try { value?.dispose(); } catch (error) { report(error); }
    };
    const stop = () => {
      if (disposed) return;
      disposed = true;
      if (controller.current?.instance === instance) controller.current = null;
      dispose(instance);
      instance = null;
      host.remove();
      element.dataset.ready = "false";
    };
    const failure = (error: unknown) => { stop(); report(error); };
    const visibility = () => {
      if (disposed || !instance) return;
      try {
        if (!visible || element.ownerDocument.hidden || element.closest("[hidden], [inert]")) instance.pause(); else instance.resume();
      } catch (error) { failure(error); }
    };
    Promise.resolve().then(() => runtime.mount(host, abort.signal)).then(mounted => {
      if (abort.signal.aborted) { dispose(mounted); host.remove(); return; }
      instance = mounted;
      controller.current = { instance, fail: failure };
      instance.update(current.current);
      element.dataset.ready = "true";
      visibility();
    }).catch(error => { if (!abort.signal.aborted) failure(error); });
    const observer = typeof IntersectionObserver === "function" ? new IntersectionObserver(entries => { visible = Boolean(entries[0]?.isIntersecting); visibility(); }) : null;
    observer?.observe(element);
    element.ownerDocument.addEventListener("visibilitychange", visibility);
    return () => { abort.abort(); observer?.disconnect(); element.ownerDocument.removeEventListener("visibilitychange", visibility); stop(); };
  }, [runtime, policy.enabled]);
  useEffect(() => {
    try { controller.current?.instance.update(properties); }
    catch (error) { controller.current?.fail(error); }
  }, [properties]);
  return <div className={`qgm-asset ${className}`.trim()} role="img" aria-label={label} data-motion-asset="external" data-motion-policy={policy.effective}>
    <div ref={container} className="qgm-asset-canvas" aria-hidden="true" data-ready="false" />
    <div className="qgm-asset-fallback" aria-hidden="true">{fallback}</div>
  </div>;
}
