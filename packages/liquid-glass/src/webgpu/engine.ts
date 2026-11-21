import html2canvas from "html2canvas-pro";
import { LiquidRenderer } from "./renderer";
import { collectSurfaces } from "./surfaces";
import type { Box, LiquidSurface } from "./surfaces";
import { createLiquidMotion, withoutMotionStyles } from "./motion";
import type { LiquidGlassMotion } from "./motion";

export type LiquidGlassStatus =
  | "loading"
  | "ready"
  | "unavailable"
  | "error"
  | "reduced";
export type LiquidGlassState = {
  status: LiquidGlassStatus;
  surfaceCount: number;
};
type Options = { refraction: number; dispersion: number; motion: LiquidGlassMotion };
type EngineOptions = Options & {
  root: HTMLElement;
  backdrop: HTMLElement;
  canvas: HTMLCanvasElement;
  onChange: (state: LiquidGlassState) => void;
  materialReduced: boolean;
};

export function createLiquidGlassEngine(config: EngineOptions) {
  let options: Options = config;
  let disposed = false;
  let device: GPUDevice | undefined;
  let renderer: LiquidRenderer | undefined;
  let frame = 0;
  let captureTimer = 0;
  let pendingCapture: Promise<void> | null = null;
  let captureAgain = false;
  let hasBackdrop = false;
  let state: LiquidGlassState = { status: config.materialReduced ? "reduced" : "loading", surfaceCount: 0 };
  let captureRevision = 0;
  let renderRevision = 0;
  let motionRevision = 0;
  let ratio = 1;
  let capturedBox: Box = { x: 0, y: 0, width: 1, height: 1 };
  const marked = new Set<HTMLElement>();
  const popups = new Map<HTMLElement, HTMLCanvasElement>();
  const html = document.documentElement;
  let geometryDirty = true;
  let layoutSettlesUntil = 0;
  let surfaces: LiquidSurface[] = [];
  let surfaceMap = new Map<HTMLElement, LiquidSurface>();
  let groups = new Map<HTMLElement, LiquidSurface[]>();
  let viewport: LiquidSurface[] = [];
  const geometryAnimations = new Map<Element, Map<string, number>>();
  const geometryObserved = new Set<Element>();
  const popupGeometry = new Map<HTMLElement, { rect: DOMRect; left: number; top: number; width: number; height: number }>();
  const motion = createLiquidMotion({
    root: config.root,
    backdrop: config.backdrop,
    mode: options.motion,
    schedule,
    surface: (element) => surfaceMap.get(element),
  });

  const publish = (next: LiquidGlassState) => {
    if (disposed) return;
    const changed =
      next.status !== state.status || next.surfaceCount !== state.surfaceCount;
    state = next;
    if (html.dataset.liquidStatus !== next.status)
      html.dataset.liquidStatus = next.status;
    if (html.dataset.liquidSurfaceCount !== String(next.surfaceCount))
      html.dataset.liquidSurfaceCount = String(next.surfaceCount);
    if (changed) config.onChange(next);
  };

  const fail = (error?: unknown) => {
    if (disposed || state.status === "error") return;
    html.dataset.liquidError = String(
      error && typeof error === "object" && "message" in error
        ? error.message
        : (error ?? "The WebGPU renderer failed"),
    ).slice(0, 500);
    hasBackdrop = false;
    config.canvas.style.visibility = "hidden";
    for (const canvas of popups.values()) canvas.style.visibility = "hidden";
    for (const element of marked) delete element.dataset.liquidSurface;
    marked.clear();
    renderer?.destroy();
    renderer = undefined;
    for (const canvas of popups.values()) canvas.remove();
    popups.clear();
    device?.destroy();
    device = undefined;
    publish({ status: "error", surfaceCount: 0 });
  };

  function paint() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (
      disposed ||
      document.visibilityState === "hidden"
    )
      return;
    const now = performance.now();
    let geometryEffects = 0;
    for (const [element, animations] of geometryAnimations) {
      for (const [name, until] of animations)
        if (now >= until || !element.isConnected || options.motion !== "enabled") animations.delete(name);
      if (!animations.size) geometryAnimations.delete(element);
      else geometryEffects += animations.size;
    }
    try {
      if (geometryDirty || geometryEffects || motion.isTravelling()) {
        surfaces = collectSurfaces(config.root, config.backdrop);
        surfaceMap = new Map(surfaces.map((surface) => [surface.element, surface]));
        groups = new Map();
        viewport = [];
        popupGeometry.clear();
        for (const surface of surfaces) {
          if (surface.popup) {
            const group = groups.get(surface.popup) ?? [];
            group.push(surface);
            groups.set(surface.popup, group);
          } else viewport.push(surface);
          if (!geometryObserved.has(surface.element)) {
            geometryResize.observe(surface.element);
            geometryObserved.add(surface.element);
          }
        }
        for (const element of geometryObserved)
          if (!surfaceMap.has(element as HTMLElement)) {
            geometryResize.unobserve(element);
            geometryObserved.delete(element);
          }
        for (const popup of groups.keys()) {
          const style = getComputedStyle(popup);
          popupGeometry.set(popup, {
            rect: popup.getBoundingClientRect(),
            left: -(parseFloat(style.borderLeftWidth) || 0),
            top: -(parseFloat(style.borderTopWidth) || 0),
            width: popup.offsetWidth,
            height: popup.offsetHeight,
          });
        }
        geometryDirty = false;
      }
      const effect = motion.advance(now);
      const active = effect.active + geometryEffects + Number(options.motion === "enabled" && now < layoutSettlesUntil);
      const motionState = active ? "running" : "idle";
      if (html.dataset.liquidMotionState !== motionState) html.dataset.liquidMotionState = motionState;
      if (html.dataset.liquidActiveEffects !== String(active)) html.dataset.liquidActiveEffects = String(active);
      if (active) html.dataset.liquidMotionRevision = String(++motionRevision);
      if (active) schedule();
      if (!renderer || !hasBackdrop) return;
      const current = new Set(surfaces.map((surface) => surface.element));
      for (const element of marked)
        if (!current.has(element)) {
          delete element.dataset.liquidSurface;
          marked.delete(element);
        }
      for (const surface of surfaces) {
        const kind = surface.popup ? "popup" : "viewport";
        if (surface.element.dataset.liquidSurface !== kind)
          surface.element.dataset.liquidSurface = kind;
        marked.add(surface.element);
      }
      for (const [popup, canvas] of popups)
        if (!groups.has(popup) || !popup.isConnected) {
          renderer.removeLayer(canvas);
          canvas.remove();
          popups.delete(popup);
        }
      config.canvas.style.visibility = "visible";
      renderer.draw(
        config.canvas,
        { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },
        capturedBox,
        viewport,
        options.refraction,
        options.dispersion,
        ratio,
        effect.surfaces,
      );
      for (const [popup, surfaces] of groups) {
        let canvas = popups.get(popup);
        if (!canvas) {
          canvas = document.createElement("canvas");
          canvas.className = "qg-gpu-popup-canvas";
          canvas.dataset.liquidCanvas = "popup";
          canvas.setAttribute("aria-hidden", "true");
          canvas.setAttribute("data-html2canvas-ignore", "");
          canvas.style.cssText =
            "position:absolute;pointer-events:none;z-index:-1;border-radius:inherit;display:block;";
          renderer.attach(canvas);
          popup.prepend(canvas);
          popups.set(popup, canvas);
        }
        const geometry = popupGeometry.get(popup)!;
        const rect = geometry.rect;
        canvas.style.left = `${geometry.left}px`;
        canvas.style.top = `${geometry.top}px`;
        canvas.style.width = `${geometry.width}px`;
        canvas.style.height = `${geometry.height}px`;
        canvas.style.visibility = "visible";
        renderer.draw(
          canvas,
          rect,
          capturedBox,
          surfaces,
          options.refraction,
          options.dispersion,
          ratio,
          effect.surfaces,
        );
      }
      html.dataset.liquidRenderRevision = String(++renderRevision);
      publish({ status: "ready", surfaceCount: surfaces.length });
    } catch (error) {
      fail(error);
    }
  }

  function schedule() {
    if (!disposed && !frame) frame = requestAnimationFrame(paint);
  }

  const refresh = (): Promise<void> => {
    if (disposed || !device || !renderer) return Promise.resolve();
    captureAgain = true;
    if (pendingCapture) return pendingCapture;
    pendingCapture = (async () => {
      while (captureAgain && !disposed && device && renderer) {
        captureAgain = false;
        await document.fonts.ready;
        if (disposed) return;
        const box = config.backdrop.getBoundingClientRect();
        if (!box.width || !box.height) return;
        ratio = Math.min(
          window.devicePixelRatio || 1,
          2,
          device.limits.maxTextureDimension2D /
            Math.max(
              box.width,
              box.height,
              window.innerWidth,
              window.innerHeight,
            ),
        );
        const capture = await html2canvas(config.backdrop, {
          backgroundColor: null,
          scale: ratio,
          logging: false,
          allowTaint: false,
          imageTimeout: 3000,
          ignoreElements: (element) =>
            element.hasAttribute("data-liquid-canvas") ||
            (!config.backdrop.contains(element) &&
              !element.contains(config.backdrop) &&
              !document.head.contains(element)),
        });
        if (disposed) return;
        const bitmap = await createImageBitmap(capture);
        try {
          if (disposed) return;
          const size = [bitmap.width, bitmap.height];
          const texture = device.createTexture({
            label: "Liquid Glass supplied backdrop",
            size,
            format: "rgba8unorm",
            usage:
              GPUTextureUsage.TEXTURE_BINDING |
              GPUTextureUsage.COPY_DST |
              GPUTextureUsage.RENDER_ATTACHMENT,
          });
          device.queue.copyExternalImageToTexture(
            { source: bitmap },
            { texture },
            size,
          );
          renderer.setBackdrop(texture);
          capturedBox = {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
          };
          hasBackdrop = true;
          html.dataset.liquidCaptureRevision = String(++captureRevision);
          paint();
          await device.queue.onSubmittedWorkDone();
        } finally {
          bitmap.close();
          capture.width = 0;
          capture.height = 0;
        }
      }
    })()
      .catch((error) => {
        if (!disposed) fail(error);
      })
      .finally(() => {
        pendingCapture = null;
      });
    return pendingCapture;
  };

  const queueCapture = () => {
    geometryDirty = true;
    clearTimeout(captureTimer);
    captureTimer = window.setTimeout(() => {
      void refresh();
    }, 140);
    schedule();
  };
  const invalidate = () => {
    geometryDirty = true;
    if (options.motion === "enabled") layoutSettlesUntil = performance.now() + 80;
    schedule();
  };
  const drag = (event: PointerEvent) => {
    if (event.buttons) invalidate();
  };
  const cssMilliseconds = (value: string) => value.split(",").map((part) => {
    const number = parseFloat(part) || 0;
    return part.trim().endsWith("ms") ? number : number * 1000;
  });
  const trackGeometry = (event: TransitionEvent | AnimationEvent) => {
    if (options.motion !== "enabled" || !(event.target instanceof HTMLElement) ||
        event.target.closest("[data-liquid-canvas],[data-liquid-backdrop]")) return;
    const transition = event instanceof TransitionEvent;
    if (transition && !/^(transform|translate|scale|rotate|left|right|top|bottom|width|height|min-width|max-width|min-height|max-height|margin.*|padding.*|border.*radius)$/.test(event.propertyName)) return;
    if (!transition && !event.target.matches("[data-liquid-travelling],[data-slot$='-content'],[data-slot='drawer'],[data-liquid-glass]")) return;
    const style = getComputedStyle(event.target);
    const durations = cssMilliseconds(transition ? style.transitionDuration : style.animationDuration);
    const delays = cssMilliseconds(transition ? style.transitionDelay : style.animationDelay);
    const duration = Math.max(...durations.map((value, index) => value + (delays[index % delays.length] || 0)), 0);
    const name = transition ? `transition:${event.propertyName}` : `animation:${event.animationName}`;
    const active = geometryAnimations.get(event.target) ?? new Map<string, number>();
    active.set(name, performance.now() + Math.min(1600, duration + 80));
    geometryAnimations.set(event.target, active);
    invalidate();
  };
  const finishGeometry = (event: TransitionEvent | AnimationEvent) => {
    if (!(event.target instanceof Element)) return;
    const name = event instanceof TransitionEvent ? `transition:${event.propertyName}` : `animation:${event.animationName}`;
    geometryAnimations.get(event.target)?.delete(name);
    invalidate();
  };
  const ownMutation = (record: MutationRecord) => {
    if (
      record.target instanceof Element &&
      record.target.closest("[data-liquid-canvas]")
    )
      return true;
    if (record.type === "childList") {
      const changed = [...record.addedNodes, ...record.removedNodes];
      return (
        changed.length > 0 &&
        changed.every(
          (node) =>
            node instanceof Element && node.hasAttribute("data-liquid-canvas"),
        )
      );
    }
    if (record.type === "attributes" && record.attributeName === "style" &&
        record.target instanceof HTMLElement &&
        withoutMotionStyles(record.oldValue) === withoutMotionStyles(record.target.getAttribute("style")))
      return true;
    return false;
  };
  const observer = new MutationObserver((records) => {
    let changed = false;
    for (const record of records) {
      if (ownMutation(record)) continue;
      motion.mutation(record);
      changed = true;
    }
    if (changed) invalidate();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeOldValue: true,
    characterData: true,
    attributeFilter: [
      "class",
      "style",
      "hidden",
      "open",
      "data-state",
      "data-open",
      "data-checked",
      "data-selected",
      "data-pressed",
      "data-disabled",
      "disabled",
      "aria-disabled",
      "readonly",
      "data-readonly",
      "aria-readonly",
      "aria-checked",
      "aria-selected",
      "aria-expanded",
      "data-liquid-glass",
    ],
  });
  const backdropObserver = new MutationObserver(queueCapture);
  backdropObserver.observe(config.backdrop, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });
  const resizeObserver = new ResizeObserver(() => {
    if (!hasBackdrop) return;
    const box = config.backdrop.getBoundingClientRect();
    if (box.width !== capturedBox.width || box.height !== capturedBox.height) queueCapture();
  });
  resizeObserver.observe(config.backdrop);
  const geometryResize = new ResizeObserver(invalidate);
  geometryResize.observe(config.root);
  window.addEventListener("resize", queueCapture);
  document.fonts.addEventListener("loadingdone", queueCapture);
  document.addEventListener("scroll", invalidate, true);
  document.addEventListener("pointermove", drag, { passive: true });
  document.addEventListener("pointerup", invalidate);
  document.addEventListener("focusin", invalidate);
  document.addEventListener("input", invalidate);
  document.addEventListener("toggle", invalidate, true);
  document.addEventListener("transitionrun", trackGeometry, true);
  document.addEventListener("transitionend", finishGeometry, true);
  document.addEventListener("transitioncancel", finishGeometry, true);
  document.addEventListener("animationstart", trackGeometry, true);
  document.addEventListener("animationend", finishGeometry, true);
  document.addEventListener("animationcancel", finishGeometry, true);
  document.addEventListener("visibilitychange", invalidate);
  schedule();

  void (async () => {
    if (config.materialReduced) {
      publish({ status: "reduced", surfaceCount: 0 });
      return;
    }
    if (!navigator.gpu) {
      publish({ status: "unavailable", surfaceCount: 0 });
      return;
    }
    const adapter = await navigator.gpu.requestAdapter();
    if (disposed) return;
    if (!adapter) {
      publish({ status: "unavailable", surfaceCount: 0 });
      return;
    }
    device = await adapter.requestDevice();
    if (disposed) {
      device.destroy();
      return;
    }
    device.addEventListener("uncapturederror", (event) => fail(event.error));
    void device.lost.then((info) => {
      if (!disposed && info.reason !== "destroyed")
        fail(info.message || "The WebGPU device was lost");
    });
    renderer = await LiquidRenderer.create(device);
    if (disposed) {
      renderer.destroy();
      return;
    }
    // html2canvas clones the document and may claim an uninitialised canvas's 2D context.
    renderer.attach(config.canvas);
    await refresh();
  })().catch((error) => {
    if (!disposed) fail(error);
  });

  return {
    refresh,
    update(next: Options) {
      options = next;
      motion.update(next.motion);
      if (next.motion !== "enabled") geometryAnimations.clear();
      geometryDirty = true;
      schedule();
    },
    destroy() {
      disposed = true;
      cancelAnimationFrame(frame);
      clearTimeout(captureTimer);
      observer.disconnect();
      backdropObserver.disconnect();
      resizeObserver.disconnect();
      geometryResize.disconnect();
      motion.destroy();
      window.removeEventListener("resize", queueCapture);
      document.fonts.removeEventListener("loadingdone", queueCapture);
      document.removeEventListener("scroll", invalidate, true);
      document.removeEventListener("pointermove", drag);
      document.removeEventListener("pointerup", invalidate);
      document.removeEventListener("focusin", invalidate);
      document.removeEventListener("input", invalidate);
      document.removeEventListener("toggle", invalidate, true);
      document.removeEventListener("transitionrun", trackGeometry, true);
      document.removeEventListener("transitionend", finishGeometry, true);
      document.removeEventListener("transitioncancel", finishGeometry, true);
      document.removeEventListener("animationstart", trackGeometry, true);
      document.removeEventListener("animationend", finishGeometry, true);
      document.removeEventListener("animationcancel", finishGeometry, true);
      document.removeEventListener("visibilitychange", invalidate);
      for (const element of marked) delete element.dataset.liquidSurface;
      marked.clear();
      renderer?.destroy();
      for (const canvas of popups.values()) canvas.remove();
      popups.clear();
      device?.destroy();
    },
  };
}
