import html2canvas from "html2canvas-pro";
import { LiquidRenderer } from "./renderer";
import { collectSurfaces } from "./surfaces";
import type { Box, LiquidSurface } from "./surfaces";

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
type Options = { refraction: number; dispersion: number };
type EngineOptions = Options & {
  root: HTMLElement;
  backdrop: HTMLElement;
  canvas: HTMLCanvasElement;
  onChange: (state: LiquidGlassState) => void;
};

export function createLiquidGlassEngine(config: EngineOptions) {
  let options: Options = config;
  let disposed = false;
  let device: GPUDevice | undefined;
  let renderer: LiquidRenderer | undefined;
  let frame = 0;
  let captureTimer = 0;
  let animationUntil = 0;
  let pendingCapture: Promise<void> | null = null;
  let captureAgain = false;
  let hasBackdrop = false;
  let state: LiquidGlassState = { status: "loading", surfaceCount: 0 };
  let captureRevision = 0;
  let renderRevision = 0;
  let ratio = 1;
  let capturedBox: Box = { x: 0, y: 0, width: 1, height: 1 };
  const marked = new Set<HTMLElement>();
  const popups = new Map<HTMLElement, HTMLCanvasElement>();
  const html = document.documentElement;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

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
      !renderer ||
      !hasBackdrop ||
      document.visibilityState === "hidden"
    )
      return;
    try {
      const surfaces = collectSurfaces(config.root, config.backdrop);
      const current = new Set(surfaces.map((surface) => surface.element));
      for (const element of marked)
        if (!current.has(element)) {
          delete element.dataset.liquidSurface;
          marked.delete(element);
        }
      const groups = new Map<HTMLElement, LiquidSurface[]>();
      const viewport: LiquidSurface[] = [];
      for (const surface of surfaces) {
        const kind = surface.popup ? "popup" : "viewport";
        if (surface.element.dataset.liquidSurface !== kind)
          surface.element.dataset.liquidSurface = kind;
        marked.add(surface.element);
        if (surface.popup) {
          const group = groups.get(surface.popup) ?? [];
          group.push(surface);
          groups.set(surface.popup, group);
        } else viewport.push(surface);
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
      );
      for (const [popup, surfaces] of groups) {
        let canvas = popups.get(popup);
        if (!canvas) {
          canvas = document.createElement("canvas");
          canvas.className = "qg-gpu-popup-canvas";
          canvas.dataset.liquidCanvas = "popup";
          canvas.setAttribute("aria-hidden", "true");
          canvas.style.cssText =
            "position:absolute;pointer-events:none;z-index:-1;border-radius:inherit;display:block;";
          popup.prepend(canvas);
          popups.set(popup, canvas);
        }
        const rect = popup.getBoundingClientRect();
        const style = getComputedStyle(popup);
        canvas.style.left = `${-(parseFloat(style.borderLeftWidth) || 0)}px`;
        canvas.style.top = `${-(parseFloat(style.borderTopWidth) || 0)}px`;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        canvas.style.visibility = "visible";
        renderer.draw(
          canvas,
          rect,
          capturedBox,
          surfaces,
          options.refraction,
          options.dispersion,
          ratio,
        );
      }
      html.dataset.liquidRenderRevision = String(++renderRevision);
      publish({ status: "ready", surfaceCount: surfaces.length });
    } catch (error) {
      fail(error);
    }
    if (!reducedMotion.matches && performance.now() < animationUntil)
      schedule();
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
    clearTimeout(captureTimer);
    captureTimer = window.setTimeout(() => {
      void refresh();
    }, 140);
    schedule();
  };
  const onTransition = () => {
    if (!reducedMotion.matches)
      animationUntil = Math.max(animationUntil, performance.now() + 350);
    schedule();
  };
  const onPointerMove = (event: PointerEvent) => {
    if (event.buttons) schedule();
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
    return false;
  };
  const observer = new MutationObserver((records) => {
    if (records.some((record) => !ownMutation(record))) onTransition();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
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
  const resizeObserver = new ResizeObserver(queueCapture);
  resizeObserver.observe(config.backdrop);
  window.addEventListener("resize", queueCapture);
  document.fonts.addEventListener("loadingdone", queueCapture);
  document.addEventListener("scroll", schedule, true);
  document.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("pointerup", schedule);
  document.addEventListener("focusin", schedule);
  document.addEventListener("input", schedule);
  document.addEventListener("toggle", onTransition, true);
  document.addEventListener("transitionrun", onTransition, true);
  document.addEventListener("transitionend", schedule, true);
  document.addEventListener("visibilitychange", schedule);

  void (async () => {
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
    await refresh();
  })().catch((error) => {
    if (!disposed) fail(error);
  });

  return {
    refresh,
    update(next: Options) {
      options = next;
      schedule();
    },
    destroy() {
      disposed = true;
      cancelAnimationFrame(frame);
      clearTimeout(captureTimer);
      observer.disconnect();
      backdropObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", queueCapture);
      document.fonts.removeEventListener("loadingdone", queueCapture);
      document.removeEventListener("scroll", schedule, true);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", schedule);
      document.removeEventListener("focusin", schedule);
      document.removeEventListener("input", schedule);
      document.removeEventListener("toggle", onTransition, true);
      document.removeEventListener("transitionrun", onTransition, true);
      document.removeEventListener("transitionend", schedule, true);
      document.removeEventListener("visibilitychange", schedule);
      for (const element of marked) delete element.dataset.liquidSurface;
      marked.clear();
      renderer?.destroy();
      for (const canvas of popups.values()) canvas.remove();
      popups.clear();
      device?.destroy();
    },
  };
}
