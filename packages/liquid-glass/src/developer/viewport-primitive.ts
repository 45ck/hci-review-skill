import {
  createChange, createViewport, definePrimitive, live,
  type CanvasRect, type ChangeDetails, type SlotDefinition, type Viewport, type ViewportReason,
} from "@ui-sdk/core";

export type LiquidViewportChangeDetails = ChangeDetails<ViewportReason>;

export interface LiquidViewportOptions {
  width: number;
  height: number;
  resetKey?: string;
  selectionRect?: CanvasRect | null;
  viewport?: Viewport;
  defaultViewport?: Viewport;
  onViewportChange?: (value: Viewport, details: LiquidViewportChangeDetails) => void;
  expanded?: boolean;
  onExpandedChange?: (value: boolean, details: ChangeDetails<"imperative">) => void;
}

const initialViewport: Viewport = { x: 0, y: 0, zoom: 1 };
const isRect = (rect?: CanvasRect | null): rect is CanvasRect => Boolean(rect &&
  [rect.left, rect.top, rect.right, rect.bottom].every(Number.isFinite) &&
  rect.right > rect.left && rect.bottom > rect.top);
const isViewport = (value: Viewport) => value &&
  [value.x, value.y, value.zoom].every(Number.isFinite) && value.zoom > 0 &&
  Math.abs(value.x) <= 10_000_000 && Math.abs(value.y) <= 10_000_000;

type LiquidViewportState = {
  viewport: Viewport;
  width: number;
  height: number;
  fitted: boolean;
  panMode: boolean;
  expanded: boolean;
};
type LiquidViewportApi = {
  viewport: ReturnType<typeof createViewport<LiquidViewportState>>;
  getViewport: () => Viewport;
  setViewport: (value: Viewport) => boolean;
  panBy: (x: number, y: number) => boolean;
  zoomTo: (zoom: number) => boolean;
  zoomBy: (factor: number) => boolean;
  actualSize: () => boolean;
  fit: () => boolean;
  reveal: (rect: CanvasRect) => boolean;
  center: (rect: CanvasRect) => boolean;
  focusSelection: () => boolean;
  setPanMode: (value: boolean) => boolean;
  setExpanded: (value: boolean) => boolean;
  surfaceSize: (width: number, height: number) => void;
  pointerdown: (event: PointerEvent) => void;
  keydown: (event: KeyboardEvent, element?: HTMLElement) => void;
  releasePanKey: (event?: Event) => void;
};
type LiquidViewportSlots = {
  root: SlotDefinition<LiquidViewportState, LiquidViewportApi, { id?: string }>;
  controls: SlotDefinition<LiquidViewportState, LiquidViewportApi, { id?: string }, { zoom: number; panMode: boolean; expanded: boolean }>;
  surface: SlotDefinition<LiquidViewportState, LiquidViewportApi, { id?: string }>;
  world: SlotDefinition<LiquidViewportState, LiquidViewportApi, { id?: string }>;
};

export const liquidViewport: ReturnType<typeof definePrimitive<LiquidViewportOptions, LiquidViewportState, LiquidViewportApi, LiquidViewportSlots>> = definePrimitive<LiquidViewportOptions, LiquidViewportState, LiquidViewportApi, LiquidViewportSlots>({
  name: "liquid-viewport",
  options: {
    width: "number", height: "number", resetKey: "string", selectionRect: "value",
    viewport: "value", defaultViewport: "value", onViewportChange: "callback",
    expanded: "boolean", onExpandedChange: "callback",
  },
  controlled: ["viewport", "expanded"],
  state: (options: LiquidViewportOptions) => ({
    viewport: options.viewport ?? options.defaultViewport ?? initialViewport,
    width: options.width,
    height: options.height,
    fitted: options.viewport === undefined && options.defaultViewport === undefined,
    panMode: false,
    expanded: options.expanded ?? false,
  }),
  live: ["viewport"],
  sync: (options) => ({
    width: options.width, height: options.height,
    ...(options.viewport !== undefined ? { viewport: options.viewport } : {}),
    ...(options.expanded !== undefined ? { expanded: options.expanded } : {}),
  }),
  api: (context) => {
    const change = createChange(context);
    let fitting = false;
    let previousSize: { width: number; height: number } | null = null;
    let heldPanMode: boolean | undefined;
    const viewport = createViewport(context, {
      key: "viewport",
      surface: () => context.element("surface"),
      minZoom: () => 0.1,
      maxZoom: () => 4,
      set(value, details) {
        if (!isViewport(value)) return false;
        const accepted = change("viewport", value, details);
        if (accepted && !fitting) context.store.set({ fitted: false });
        return accepted;
      },
    });
    const bounds = (): CanvasRect => ({ left: 0, top: 0,
      right: Math.max(1, context.options().width), bottom: Math.max(1, context.options().height) });
    const fit = () => {
      fitting = true;
      let accepted = false;
      try { accepted = viewport.fit(bounds(), { padding: 24, maxZoom: 1 }); }
      finally { fitting = false; }
      if (accepted) context.store.set({ fitted: true });
      return accepted;
    };
    let currentKey = `${context.options().resetKey ?? ""}:${context.options().width}:${context.options().height}`;
    context.onOptions((options) => {
      const key = `${options.resetKey ?? ""}:${options.width}:${options.height}`;
      if (key !== currentKey) {
        currentKey = key;
        context.store.set({ fitted: true });
        if (context.element("surface")) fit();
      }
    });
    const releasePanKey = (event?: Event) => {
      if (heldPanMode === undefined) return;
      const panMode = heldPanMode;
      heldPanMode = undefined;
      change("panMode", panMode, { reason: "imperative", event });
    };
    return {
      viewport,
      getViewport: () => viewport.get(),
      setViewport: (value: Viewport) => isViewport(value) && viewport.setViewport(value),
      panBy: (x: number, y: number) => Number.isFinite(x) && Number.isFinite(y) && viewport.panBy(x, y),
      zoomTo: (zoom: number) => Number.isFinite(zoom) && zoom > 0 && viewport.zoomTo(zoom),
      zoomBy: (factor: number) => Number.isFinite(factor) && factor > 0 && viewport.zoomBy(factor),
      actualSize: () => viewport.zoomTo(1),
      fit,
      reveal: (rect: CanvasRect) => isRect(rect) && viewport.reveal(rect, { padding: 24 }),
      center: (rect: CanvasRect) => isRect(rect) && viewport.fit(rect, { padding: 48, maxZoom: 1.5 }),
      focusSelection() {
        const rect = context.options().selectionRect;
        return isRect(rect) && viewport.fit(rect, { padding: 48, maxZoom: 1.5 });
      },
      setPanMode: (value: boolean) => typeof value === "boolean" && change("panMode", value, { reason: "imperative" }),
      setExpanded: (value: boolean) => typeof value === "boolean" && change("expanded", value, { reason: "imperative" }),
      surfaceSize(width: number, height: number) {
        if (width <= 0 || height <= 0) return;
        const last = previousSize;
        previousSize = { width, height };
        if (context.store.get().fitted) fit();
        else if (last) viewport.panBy((width - last.width) / 2, (height - last.height) / 2);
      },
      pointerdown(event: PointerEvent) {
        if (event.defaultPrevented || event.button > 1) return;
        const interactive = event.target instanceof Element && event.target.closest(
          "[data-viewport-interactive],button,input,textarea,select,a,[contenteditable='true']",
        );
        if (interactive && !context.store.get().panMode) return;
        viewport.pointerdown(event);
        if (context.store.get().panMode) event.stopPropagation();
      },
      keydown(event: KeyboardEvent, element?: HTMLElement) {
        if (event.target !== element || event.altKey || event.metaKey || event.ctrlKey) return;
        if (event.key === " ") {
          event.preventDefault();
          if (heldPanMode === undefined) heldPanMode = context.store.get().panMode;
          change("panMode", true, { reason: "imperative", event });
          return;
        }
        const step = event.shiftKey ? 240 : 80;
        const direction = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
        if (direction) {
          event.preventDefault();
          viewport.panBy(direction[0], direction[1], { reason: "imperative", event });
        } else if (event.key.toLowerCase() === "f") {
          event.preventDefault();
          fit();
        } else viewport.keydown(event);
      },
      releasePanKey,
    };
  },
  slots: (slot) => ({
    root: slot({
      role: "region",
      live: live((state) => ({
        "data-viewport-x": String(Number(state.viewport.x.toFixed(3))),
        "data-viewport-y": String(Number(state.viewport.y.toFixed(3))),
        "data-viewport-zoom": String(Number((state.viewport.zoom * 100).toFixed(2))),
      })),
      attrs: (state) => ({ "data-viewport-expanded": String(state.expanded), "data-validation": "unvalidated" }),
    }),
    controls: slot<{}, { zoom: number; panMode: boolean; expanded: boolean }>({
      state: (state) => ({ zoom: Math.round(state.viewport.zoom * 100), panMode: state.panMode, expanded: state.expanded }),
    }),
    surface: slot({
      role: "region",
      attrs: (state) => ({ tabindex: "0", "data-pan-mode": String(state.panMode), "data-liquid-glass": "off" }),
      on: {
        wheel: (event, { api }) => { if (!event.defaultPrevented) api.viewport.wheel(event); },
        keydown: (event, { api, el }) => api.keydown(event, el),
        keyup: (event, { api }) => { if (event.key === " ") api.releasePanKey(event); },
        focusout: (event, { api }) => api.releasePanKey(event),
        focusin: (event, { api, el }) => {
          if (event.target instanceof HTMLElement && event.target !== el)
            api.reveal(api.viewport.rectOf(event.target));
        },
      },
      bind(element, { api }) {
        const down = (event: PointerEvent) => api.pointerdown(event);
        const click = (event: MouseEvent) => {
          if (element.dataset.panMode === "true" && event.target !== element) {
            event.preventDefault(); event.stopPropagation();
          }
        };
        const size = () => api.surfaceSize(element.clientWidth, element.clientHeight);
        const observer = new ResizeObserver(size);
        observer.observe(element);
        element.addEventListener("pointerdown", down, true);
        element.addEventListener("click", click, true);
        window.addEventListener("blur", api.releasePanKey);
        size();
        return () => {
          observer.disconnect();
          element.removeEventListener("pointerdown", down, true);
          element.removeEventListener("click", click, true);
          window.removeEventListener("blur", api.releasePanKey);
          api.releasePanKey();
        };
      },
    }),
    world: slot({
      attrs: (state) => ({ style: `width:${state.width}px;height:${state.height}px;` }),
      live: live((state, { api }) => ({ style: `width:${state.width}px;height:${state.height}px;${api.viewport.style(state)}` })),
    }),
  }),
  agent: { actions: ["setViewport", "panBy", "zoomTo", "zoomBy", "fit", "actualSize", "focusSelection", "setPanMode", "setExpanded"] },
});
