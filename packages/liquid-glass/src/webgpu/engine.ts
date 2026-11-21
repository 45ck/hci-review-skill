import html2canvas from "html2canvas-pro";
import { LiquidRenderer } from "./renderer";
import { collectSurfaces, SURFACE_SELECTOR } from "./surfaces";
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
const GEOMETRY_TRANSITION = /^(transform|translate|scale|rotate|left|right|top|bottom|width|height|min-width|max-width|min-height|max-height|margin.*|padding.*|border.*radius)$/;

export function createLiquidGlassEngine(config: EngineOptions) {
  let options: Options = config;
  let disposed = false;
  let device: GPUDevice | undefined;
  let renderer: LiquidRenderer | undefined;
  let frame = 0;
  let captureTimer = 0;
  let pendingCapture: Promise<void> | null = null;
  let resolveCaptureFrame: (() => void) | null = null;
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
  const debugAttributes = ["data-liquid-motion-work", "data-liquid-last-invalidation"];
  const previousDebug = debugAttributes.map((name) => html.getAttribute(name));
  let geometryDirty = true;
  let layoutSettlesUntil = 0;
  let surfaces: LiquidSurface[] = [];
  let surfaceMap = new Map<HTMLElement, LiquidSurface>();
  let groups = new Map<HTMLElement, LiquidSurface[]>();
  let viewport: LiquidSurface[] = [];
  const geometryAnimations = new Map<Element, Map<string, number>>();
  const popupEntries = new Map<HTMLElement, { duration: number; limit: number; until: number | null }>();
  const nativeAnimations = new Map<Animation, { target: Element; deadline: number; complete: () => void }>();
  const expiredAnimations = new WeakSet<Animation>();
  const geometryObserved = new Set<Element>();
  const popupGeometry = new Map<HTMLElement, DOMRect>();
  const motion = createLiquidMotion({
    root: config.root,
    backdrop: config.backdrop,
    mode: options.motion,
    schedule,
    surface: (element) => surfaceMap.get(element),
  });

  function settleCaptureFrame() {
    const resolve = resolveCaptureFrame;
    resolveCaptureFrame = null;
    resolve?.();
  }

  function untrackNative(animation: Animation) {
    const tracked = nativeAnimations.get(animation);
    if (!tracked) return;
    animation.removeEventListener("finish", tracked.complete);
    animation.removeEventListener("cancel", tracked.complete);
    nativeAnimations.delete(animation);
  }

  function discoverNativeAnimations(now: number) {
    const candidates = new Set<Element>();
    for (const element of document.querySelectorAll<HTMLElement>(SURFACE_SELECTOR)) {
      if (!element.isConnected || config.backdrop.contains(element) ||
          element.closest("[data-liquid-glass='off'],[data-liquid-canvas]") || !element.getClientRects().length)
        continue;
      let owned = config.root.contains(element);
      try { owned ||= !!element.closest(":popover-open,dialog:modal"); } catch { /* No top-layer selector support. */ }
      if (!owned) continue;
      let ancestor: Element | null = element;
      while (ancestor && !candidates.has(ancestor)) {
        candidates.add(ancestor);
        ancestor = ancestor.parentElement;
      }
    }
    for (const element of candidates) {
      if (typeof element.getAnimations !== "function") continue;
      for (const animation of element.getAnimations()) {
        // Follow finite CSS geometry animations too: a popup can finish its
        // entry between document transition events, leaving cached draw bounds
        // at the starting translate. The Animation itself gives a final refresh.
        if (nativeAnimations.has(animation) || expiredAnimations.has(animation) ||
            (animation.playState !== "running" && !animation.pending)) continue;
        const effect = animation.effect;
        if (!(effect instanceof KeyframeEffect) || !(effect.target instanceof Element)) continue;
        const geometry = effect.getKeyframes().some((keyframe) => Object.keys(keyframe).some((property) =>
          /^(transform|translate|scale|rotate|left|right|top|bottom|width|height|minWidth|maxWidth|minHeight|maxHeight|margin.*|padding.*|border.*Radius)$/.test(property),
        ));
        const end = Number(effect.getComputedTiming().endTime);
        const current = Number(animation.currentTime ?? 0);
        const speed = Math.abs(animation.playbackRate);
        if (!geometry || !Number.isFinite(end) || !Number.isFinite(current) || !speed) continue;
        const remaining = Math.max(0, animation.playbackRate < 0 ? current : end - current) / speed;
        const complete = () => {
          untrackNative(animation);
          if (!disposed) { geometryDirty = true; schedule(); }
        };
        nativeAnimations.set(animation, {
          target: effect.target,
          deadline: now + Math.min(10_160, remaining + 160),
          complete,
        });
        animation.addEventListener("finish", complete);
        animation.addEventListener("cancel", complete);
      }
    }
  }

  const publishRenderRect = (element: HTMLElement, rect: Box) => {
    const value = JSON.stringify([rect.x, rect.y, rect.width, rect.height]);
    if (element.dataset.liquidRenderRect !== value) element.dataset.liquidRenderRect = value;
  };

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
    for (const element of marked) {
      delete element.dataset.liquidSurface;
      if (element.dataset.slot === "drawer-content") delete element.dataset.liquidRenderRect;
    }
    marked.clear();
    renderer?.destroy();
    renderer = undefined;
    for (const canvas of popups.values()) canvas.remove();
    popups.clear();
    device?.destroy();
    device = undefined;
    publish({ status: "error", surfaceCount: 0 });
    settleCaptureFrame();
  };

  function paint() {
    frame = 0;
    if (
      disposed ||
      document.visibilityState === "hidden"
    ) {
      settleCaptureFrame();
      return;
    }
    const now = performance.now();
    for (const [animation, tracked] of nativeAnimations) {
      if (now >= tracked.deadline || !tracked.target.isConnected ||
          (animation.playState !== "running" && !animation.pending)) {
        if (now >= tracked.deadline) expiredAnimations.add(animation);
        untrackNative(animation);
        geometryDirty = true;
      }
    }
    for (const [popup, entry] of popupEntries) {
      if (entry.until === null && !popup.hasAttribute("data-starting-style"))
        entry.until = Math.min(entry.limit, now + entry.duration);
      if (!popup.isConnected || options.motion !== "enabled" || now >= entry.limit ||
          (entry.until !== null && now >= entry.until)) {
        popupEntries.delete(popup);
        geometryDirty = true; // Take the final position before reporting idle.
      }
    }
    let geometryEffects = popupEntries.size;
    for (const [element, animations] of geometryAnimations) {
      for (const [name, until] of animations)
        if (now >= until || !element.isConnected || options.motion !== "enabled") {
          animations.delete(name);
          geometryDirty = true;
        }
      if (!animations.size) geometryAnimations.delete(element);
      else geometryEffects += animations.size;
    }
    try {
      if (geometryDirty || geometryEffects || nativeAnimations.size || motion.isTravelling()) {
        const discoverAnimations = geometryDirty || popupEntries.size > 0;
        surfaces = collectSurfaces(config.root, config.backdrop);
        surfaceMap = new Map(surfaces.map((surface) => [surface.element, surface]));
        const previousGroups = groups;
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
        if (options.motion === "enabled") {
          for (const popup of groups.keys()) {
            if (previousGroups.has(popup)) continue;
            const style = getComputedStyle(popup);
            const durations = cssMilliseconds(style.transitionDuration);
            const delays = cssMilliseconds(style.transitionDelay);
            const duration = Math.max(...durations.map((value, index) => value + (delays[index % delays.length] || 0)), 0);
            if (!duration) continue;
            // Registration may precede the SDK's first-frame style reset.
            // Reconcile throughout that entry without relying on CSS events,
            // and give a delayed reset its full duration within a hard bound.
            const span = Math.min(1600, duration + 80);
            if (!popupEntries.has(popup)) geometryEffects++;
            popupEntries.set(popup, {
              duration: span,
              limit: now + 1600,
              until: popup.hasAttribute("data-starting-style") ? null : now + span,
            });
          }
        }
        geometryDirty = false;
        if (discoverAnimations) discoverNativeAnimations(now);
      }
      const effect = motion.advance(now);
      const layout = Number(options.motion === "enabled" && now < layoutSettlesUntil);
      const active = effect.active + geometryEffects + layout;
      const running = active + nativeAnimations.size;
      const work = JSON.stringify({ effects: effect.active, css: geometryEffects, native: nativeAnimations.size, layout });
      if (html.dataset.liquidMotionWork !== work) html.dataset.liquidMotionWork = work;
      const motionState = running ? "running" : "idle";
      if (html.dataset.liquidMotionState !== motionState) html.dataset.liquidMotionState = motionState;
      if (html.dataset.liquidActiveEffects !== String(running)) html.dataset.liquidActiveEffects = String(running);
      if (running && options.motion === "enabled") html.dataset.liquidMotionRevision = String(++motionRevision);
      if (running) schedule();
      if (!renderer || !hasBackdrop) return;
      const current = new Set(surfaces.map((surface) => surface.element));
      for (const element of marked)
        if (!current.has(element)) {
          delete element.dataset.liquidSurface;
          if (element.dataset.slot === "drawer-content") delete element.dataset.liquidRenderRect;
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
      for (const surface of viewport)
        if (surface.element.dataset.slot === "drawer-content") publishRenderRect(surface.element, surface.rect);
      for (const [popup, surfaces] of groups) {
        let canvas = popups.get(popup);
        if (!canvas) {
          canvas = document.createElement("canvas");
          canvas.className = "qg-gpu-popup-canvas";
          canvas.dataset.liquidCanvas = "popup";
          canvas.setAttribute("aria-hidden", "true");
          canvas.setAttribute("data-html2canvas-ignore", "");
          canvas.style.cssText =
            "position:absolute;left:0;top:0;width:100%;height:100%;border:0;padding:0;margin:0;pointer-events:none;z-index:-1;border-radius:inherit;display:block;";
          renderer.attach(canvas);
          popups.set(popup, canvas);
        }
        if (canvas.parentElement !== popup) {
          popup.prepend(canvas);
          popupGeometry.delete(popup);
        }
        let rect = popupGeometry.get(popup);
        if (!rect) {
          // Fill the padding viewport without adding border/rounding overflow.
          // Native scrolling keeps working; only the decoration follows its
          // visible viewport. Measure after placement to retain exact transforms.
          canvas.style.left = `${popup.scrollLeft}px`;
          canvas.style.top = `${popup.scrollTop}px`;
          rect = canvas.getBoundingClientRect();
          popupGeometry.set(popup, rect);
        }
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
        publishRenderRect(canvas, rect);
        for (const surface of surfaces)
          if (surface.element.dataset.slot === "drawer-content") publishRenderRect(surface.element, surface.rect);
      }
      html.dataset.liquidRenderRevision = String(++renderRevision);
      publish({ status: "ready", surfaceCount: surfaces.length });
    } catch (error) {
      fail(error);
    } finally {
      settleCaptureFrame();
    }
  }

  function schedule() {
    if (!disposed && !frame && document.visibilityState !== "hidden") {
      if (html.dataset.liquidMotionState !== "running") html.dataset.liquidMotionState = "running";
      frame = requestAnimationFrame(paint);
    }
  }

  function waitForCaptureFrame(): Promise<void> {
    geometryDirty = true;
    return new Promise((resolve) => {
      // Capture awaits can cross a hide, failure or unmount before registration.
      if (disposed || !device || !renderer || document.visibilityState === "hidden") {
        resolve();
        return;
      }
      resolveCaptureFrame = resolve;
      schedule();
    });
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
          // Upload can block while the document animation clock stays fixed.
          // Measure and draw on the shared RAF after that clock advances.
          await waitForCaptureFrame();
          if (disposed || !device || !renderer) return;
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
  const invalidate = (source?: Event | ResizeObserverEntry[] | string) => {
    geometryDirty = true;
    if (options.motion === "enabled") layoutSettlesUntil = performance.now() + 80;
    const reason = typeof source === "string" ? source : source instanceof Event
      ? `${source.type}:${source.target instanceof HTMLElement ? source.target.dataset.slot ?? source.target.tagName.toLowerCase() : "document"}`
      : Array.isArray(source) ? "resize-observer" : "layout";
    if (html.dataset.liquidLastInvalidation !== reason) html.dataset.liquidLastInvalidation = reason;
    schedule();
  };
  const drag = (event: PointerEvent) => {
    if (event.buttons) invalidate();
  };
  const visibilityChanged = () => {
    if (document.visibilityState === "hidden") {
      cancelAnimationFrame(frame);
      frame = 0;
      settleCaptureFrame();
      for (const animation of nativeAnimations.keys()) untrackNative(animation);
      geometryAnimations.clear();
      popupEntries.clear();
      html.dataset.liquidMotionState = "idle";
      html.dataset.liquidActiveEffects = "0";
      html.dataset.liquidMotionWork = JSON.stringify({ effects: 0, css: 0, native: 0, layout: 0 });
      geometryDirty = true;
    } else invalidate();
  };
  const cssMilliseconds = (value: string) => value.split(",").map((part) => {
    const number = parseFloat(part) || 0;
    return part.trim().endsWith("ms") ? number : number * 1000;
  });
  const trackGeometry = (event: TransitionEvent | AnimationEvent) => {
    if (options.motion !== "enabled" || !(event.target instanceof HTMLElement) ||
        event.target.closest("[data-liquid-canvas],[data-liquid-backdrop]")) return;
    const transition = event instanceof TransitionEvent;
    if (transition && event.propertyName !== "opacity" && !GEOMETRY_TRANSITION.test(event.propertyName)) return;
    if (!transition && !event.target.matches("[data-liquid-travelling],[data-slot$='-content'],[data-slot='drawer'],[data-liquid-glass]")) return;
    const style = getComputedStyle(event.target);
    const durations = cssMilliseconds(transition ? style.transitionDuration : style.animationDuration);
    const delays = cssMilliseconds(transition ? style.transitionDelay : style.animationDelay);
    const duration = Math.max(...durations.map((value, index) => value + (delays[index % delays.length] || 0)), 0);
    const name = transition ? `transition:${event.propertyName}` : `animation:${event.animationName}`;
    const active = geometryAnimations.get(event.target) ?? new Map<string, number>();
    active.set(name, performance.now() + Math.min(1600, duration + 80));
    geometryAnimations.set(event.target, active);
    invalidate(`animation-start:${event.target.dataset.slot ?? event.target.tagName.toLowerCase()}:${name}`);
  };
  const finishGeometry = (event: TransitionEvent | AnimationEvent) => {
    if (!(event.target instanceof Element)) return;
    const target = event.target;
    const transition = event instanceof TransitionEvent;
    const name = transition ? `transition:${event.propertyName}` : `animation:${event.animationName}`;
    const tracked = geometryAnimations.get(target)?.delete(name);
    // A compositor transition may finish after the bounded tracker expires.
    // Its final geometry still needs one read; unrelated decorative ends do not.
    const ownedGeometryEnd = transition && GEOMETRY_TRANSITION.test(event.propertyName) &&
      target.isConnected && !target.closest("[data-liquid-canvas],[data-liquid-backdrop]") &&
      surfaces.some((surface) => target.contains(surface.element));
    if (!tracked && !ownedGeometryEnd) return;
    invalidate(`animation-end:${event.target instanceof HTMLElement ? event.target.dataset.slot ?? event.target.tagName.toLowerCase() : "element"}:${name}`);
  };
  const ownMutation = (record: MutationRecord) => {
    if (
      record.target instanceof Element &&
      record.target.closest("[data-liquid-canvas]")
    )
      return true;
    if (record.type === "attributes" && record.attributeName && record.target instanceof Element &&
        record.oldValue === record.target.getAttribute(record.attributeName)) return true;
    if (record.type === "childList") {
      const changed = [...record.addedNodes, ...record.removedNodes];
      // Framework reconciliation may remove an injected layer while keeping
      // its host. Our own cleanup deletes the map entry before delivery.
      if (record.target instanceof HTMLElement && record.target.isConnected &&
          [...record.removedNodes].some((node) =>
            popups.get(record.target as HTMLElement) === node && node.parentElement !== record.target))
        return false;
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
    if (changed) {
      const record = records.find((item) => !ownMutation(item))!;
      invalidate(`mutation:${record.attributeName ?? record.type}:${record.target instanceof HTMLElement ? record.target.dataset.slot ?? record.target.tagName.toLowerCase() : "text"}`);
    }
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
      "data-starting-style",
      "data-ending-style",
      "inert",
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
  document.addEventListener("visibilitychange", visibilityChanged);
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
      if (next.motion !== "enabled") {
        geometryAnimations.clear();
        popupEntries.clear();
      }
      geometryDirty = true;
      schedule();
    },
    destroy() {
      disposed = true;
      cancelAnimationFrame(frame);
      settleCaptureFrame();
      clearTimeout(captureTimer);
      observer.disconnect();
      backdropObserver.disconnect();
      resizeObserver.disconnect();
      geometryResize.disconnect();
      motion.destroy();
      popupEntries.clear();
      for (const animation of nativeAnimations.keys()) untrackNative(animation);
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
      document.removeEventListener("visibilitychange", visibilityChanged);
      for (const element of marked) {
        delete element.dataset.liquidSurface;
        if (element.dataset.slot === "drawer-content") delete element.dataset.liquidRenderRect;
      }
      marked.clear();
      renderer?.destroy();
      for (const canvas of popups.values()) canvas.remove();
      popups.clear();
      device?.destroy();
      debugAttributes.forEach((name, index) => previousDebug[index] === null
        ? html.removeAttribute(name) : html.setAttribute(name, previousDebug[index]!));
    },
  };
}
