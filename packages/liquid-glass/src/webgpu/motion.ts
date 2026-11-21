import { SURFACE_SELECTOR } from "./surfaces";
import type { Box, LiquidSurface } from "./surfaces";

export type LiquidGlassMotion = "enabled" | "reduced" | "off";
export type SurfaceMotion = {
  x: number;
  y: number;
  light: number;
  press: number;
  rippleX: number;
  rippleY: number;
  rippleAge: number;
  rippleStrength: number;
};
type Spring = { value: number; velocity: number; target: number };
type Ripple = { x: number; y: number; start: number };
type Entry = {
  element: HTMLElement;
  x: Spring;
  y: Spring;
  light: Spring;
  press: Spring;
  hover: boolean;
  focus: boolean;
  lastChanged: number;
  lastActivation: number;
  releaseAt: number;
  ripple?: Ripple;
};

const RIPPLE_MS = 1100;
const TRAVEL_MS = 460;
const DISABLED =
  ":disabled,[aria-disabled='true'],[data-disabled]:not([data-disabled='false']),[inert]";
const READONLY = "[readonly],[aria-readonly='true'],[data-readonly]:not([data-readonly='false'])";
const INDICATOR =
  "[data-slot='tabs-indicator'],[data-slot='segmented-control-indicator']";
const FX_PROPERTIES = [
  "x", "y", "light", "ripple-x", "ripple-y", "ripple-radius", "ripple-opacity",
];
const spring = (value: number): Spring => ({ value, velocity: 0, target: value });

function step(s: Spring, dt: number, snap: boolean, epsilon = 0.001) {
  if (snap) {
    s.value = s.target;
    s.velocity = 0;
    return false;
  }
  const steps = Math.max(1, Math.ceil(dt * 120));
  const delta = dt / steps;
  for (let index = 0; index < steps; index++) {
    s.velocity += (420 * (s.target - s.value) - 34 * s.velocity) * delta;
    s.value += s.velocity * delta;
  }
  if (Math.abs(s.target - s.value) < epsilon && Math.abs(s.velocity) < epsilon * 8) {
    s.value = s.target;
    s.velocity = 0;
    return false;
  }
  return true;
}

export function withoutMotionStyles(style: string | null) {
  return (style ?? "").split(";").map((part) => part.trim())
    .filter((part) => part && !part.startsWith("--liquid-fx-")).join(";");
}

export function createLiquidMotion(config: {
  root: HTMLElement;
  backdrop: HTMLElement;
  mode: LiquidGlassMotion;
  schedule: () => void;
  surface: (element: HTMLElement) => LiquidSurface | undefined;
}) {
  let mode = config.mode;
  let previousFrame = performance.now();
  let hover: HTMLElement | null = null;
  let focus: HTMLElement | null = null;
  let pressed: HTMLElement | null = null;
  const entries = new Map<HTMLElement, Entry>();
  const travels = new Map<HTMLElement, number>();
  const snapshots = new Map<HTMLElement, SurfaceMotion>();
  const indicatorGeometry = new WeakMap<HTMLElement, string>();

  const eligible = (element: HTMLElement) => {
    if (
      !element.isConnected || config.backdrop.contains(element) ||
      element.closest("[data-liquid-glass='off'],[data-liquid-canvas]") ||
      element.closest(DISABLED)
    ) return false;
    if (config.root.contains(element)) return true;
    try { return !!element.closest(":popover-open,dialog:modal"); }
    catch { return false; }
  };
  const target = (node: EventTarget | null) => {
    if (!(node instanceof Element) || node.closest(DISABLED)) return null;
    const element = node.closest<HTMLElement>(SURFACE_SELECTOR);
    return element && eligible(element) ? element : null;
  };
  const rect = (element: HTMLElement): Box =>
    config.surface(element)?.rect ?? element.getBoundingClientRect();
  const get = (element: HTMLElement) => {
    let entry = entries.get(element);
    if (!entry) {
      const box = rect(element);
      entry = {
        element, x: spring(box.width * 0.5), y: spring(box.height * 0.5),
        light: spring(0), press: spring(0), hover: false, focus: false,
        lastChanged: performance.now(), lastActivation: -Infinity, releaseAt: 0,
      };
      entries.set(element, entry);
    }
    return entry;
  };
  const setPoint = (entry: Entry, x?: number, y?: number) => {
    const box = rect(entry.element);
    const nextX = Math.max(0, Math.min(box.width, (x ?? box.x + box.width * 0.5) - box.x));
    const nextY = Math.max(0, Math.min(box.height, (y ?? box.y + box.height * 0.5) - box.y));
    if (Math.abs(nextX - entry.x.target) < 0.2 && Math.abs(nextY - entry.y.target) < 0.2) return false;
    entry.x.target = nextX;
    entry.y.target = nextY;
    entry.lastChanged = performance.now();
    return true;
  };
  const setActive = (element: HTMLElement | null, kind: "hover" | "focus", value: boolean) => {
    if (!element) return;
    const entry = get(element);
    entry[kind] = value;
    entry.light.target = entry.hover || entry.focus ? 1 : 0;
    entry.lastChanged = performance.now();
    if (entry.light.target) element.dataset.liquidActive = "";
    else delete element.dataset.liquidActive;
  };
  const clean = (element: HTMLElement) => {
    delete element.dataset.liquidActive;
    delete element.dataset.liquidPressed;
    delete element.dataset.liquidRipple;
    for (const property of FX_PROPERTIES) element.style.removeProperty(`--liquid-fx-${property}`);
    entries.delete(element);
    snapshots.delete(element);
  };
  const activate = (element: HTMLElement, x?: number, y?: number, deduplicate = true) => {
    if (mode !== "enabled" || !eligible(element) || element.closest(READONLY)) return;
    const now = performance.now();
    const entry = get(element);
    if (deduplicate && now - entry.lastActivation < 180) return;
    setPoint(entry, x, y);
    entry.lastChanged = now;
    entry.lastActivation = now;
    entry.press.target = 1;
    entry.releaseAt = now + 100;
    element.dataset.liquidPressed = "";
    element.dataset.liquidRipple = element.dataset.liquidRipple === "a" ? "b" : "a";
    const box = rect(element);
    entry.ripple = {
      x: entry.x.target / Math.max(1, box.width),
      y: entry.y.target / Math.max(1, box.height),
      start: now,
    };
    const waves = [...entries.values()].filter((item) => item.ripple)
      .sort((a, b) => a.ripple!.start - b.ripple!.start);
    while (waves.length > 4) {
      const oldest = waves.shift()!;
      oldest.ripple = undefined;
      delete oldest.element.dataset.liquidRipple;
    }
    config.schedule();
  };
  const onPointerMove = (event: PointerEvent) => {
    if (mode !== "enabled" || event.pointerType === "touch") return;
    const next = target(event.target);
    let changed = false;
    if (next !== hover) {
      setActive(hover, "hover", false);
      hover = next;
      setActive(hover, "hover", true);
      changed = true;
    }
    if (next) changed = setPoint(get(next), event.clientX, event.clientY) || changed;
    if (changed) config.schedule();
  };
  const onPointerOut = (event: PointerEvent) => {
    if (mode !== "enabled") return;
    const next = target(event.relatedTarget);
    if (next !== hover) {
      setActive(hover, "hover", false);
      hover = next;
      setActive(hover, "hover", true);
      config.schedule();
    }
  };
  const onPointerDown = (event: PointerEvent) => {
    if (mode !== "enabled" || event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest(READONLY)) return;
    pressed = target(event.target);
    if (pressed) {
      activate(pressed, event.clientX, event.clientY, false);
      get(pressed).releaseAt = Infinity;
    }
  };
  const release = () => {
    if (!pressed) return;
    const entry = entries.get(pressed);
    if (entry) {
      entry.press.target = 0;
      entry.releaseAt = 0;
      entry.lastChanged = performance.now();
    }
    delete pressed.dataset.liquidPressed;
    pressed = null;
    config.schedule();
  };
  const onClick = (event: MouseEvent) => {
    if (event.target instanceof Element && event.target.closest(READONLY)) return;
    const element = target(event.target);
    if (!element || mode !== "enabled") return;
    const entry = entries.get(element);
    if (entry && performance.now() - entry.lastActivation < 600) return;
    activate(element, event.detail ? event.clientX : undefined, event.detail ? event.clientY : undefined);
  };
  const onFocusIn = (event: FocusEvent) => {
    if (mode !== "enabled") return;
    const next = target(event.target);
    if (next !== focus) {
      setActive(focus, "focus", false);
      focus = next;
      setActive(focus, "focus", true);
      if (focus && focus !== hover) setPoint(get(focus));
      config.schedule();
    }
  };
  const onFocusOut = (event: FocusEvent) => {
    if (mode !== "enabled") return;
    const next = target(event.relatedTarget);
    if (next !== focus) {
      setActive(focus, "focus", false);
      focus = next;
      setActive(focus, "focus", true);
      config.schedule();
    }
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (mode !== "enabled" || event.repeat || !["Enter", " "].includes(event.key)) return;
    if (event.target instanceof Element && event.target.closest(READONLY)) return;
    if (!(event.target instanceof Element) || !event.target.closest(
      "button,[role='button'],[role='tab'],[role='radio'],[role='switch'],[role='checkbox']",
    )) return;
    const element = target(event.target);
    if (element) activate(element);
  };
  const listeners = [
    ["pointermove", onPointerMove], ["pointerout", onPointerOut],
    ["pointerdown", onPointerDown], ["pointerup", release], ["pointercancel", release],
    ["click", onClick], ["focusin", onFocusIn], ["focusout", onFocusOut], ["keydown", onKeyDown],
  ] as const;
  for (const [name, listener] of listeners)
    document.addEventListener(name, listener as EventListener, { passive: true });
  window.addEventListener("blur", release);

  return {
    isTravelling: () => travels.size > 0,
    update(next: LiquidGlassMotion) {
      if (mode === next) return;
      mode = next;
      for (const element of entries.keys()) clean(element);
      for (const element of travels.keys()) delete element.dataset.liquidTravelling;
      travels.clear();
      hover = focus = pressed = null;
      config.schedule();
    },
    mutation(record: MutationRecord) {
      if (mode !== "enabled" || !(record.target instanceof HTMLElement)) return;
      const element = record.target;
      if (record.attributeName === "style" && element.matches(INDICATOR) &&
          element.dataset.activationDirection !== "none" && eligible(element)) {
        const geometry = (value: string | null) => (value ?? "").match(
          /--(?:active-tab|segmented-control-indicator)-(?:top|left|width|height)\s*:[^;]+/g,
        )?.sort().join(";") ?? "";
        const current = geometry(element.getAttribute("style"));
        if (geometry(record.oldValue) && geometry(record.oldValue) !== current && indicatorGeometry.get(element) !== current) {
          indicatorGeometry.set(element, current);
          element.dataset.liquidTravelling = element.dataset.liquidTravelling === "a" ? "b" : "a";
          travels.set(element, performance.now() + TRAVEL_MS);
          activate(element);
          config.schedule();
        }
      }
      if (["data-checked", "data-selected", "data-pressed", "aria-checked", "aria-selected"].includes(record.attributeName ?? "") &&
          record.oldValue !== element.getAttribute(record.attributeName!)) {
        if (record.attributeName === "data-pressed" && element.dataset.slot !== "toggle" && !element.hasAttribute("data-pressed")) return;
        const surface = target(element);
        if (surface) activate(surface);
      }
    },
    advance(now: number) {
      const dt = Math.min(0.05, Math.max(0.001, (now - previousFrame) / 1000));
      previousFrame = now;
      let active = 0;
      for (const [element, until] of travels) {
        if (now >= until || !eligible(element) || mode !== "enabled") {
          delete element.dataset.liquidTravelling;
          travels.delete(element);
        } else active++;
      }
      for (const [element, entry] of entries) {
        if (!eligible(element) || mode !== "enabled") { clean(element); continue; }
        if (element.closest(READONLY)) {
          entry.ripple = undefined;
          entry.press.target = entry.press.value = entry.press.velocity = 0;
          delete element.dataset.liquidPressed;
          delete element.dataset.liquidRipple;
        }
        if (entry.releaseAt && now >= entry.releaseAt) {
          entry.press.target = 0;
          entry.releaseAt = 0;
          entry.lastChanged = now;
          delete element.dataset.liquidPressed;
        }
        const snap = now - entry.lastChanged > 700;
        const moving = [
          step(entry.x, dt, snap, 0.02), step(entry.y, dt, snap, 0.02),
          step(entry.light, dt, snap), step(entry.press, dt, snap),
        ].some(Boolean);
        if (moving) active++;
        if (entry.ripple && now - entry.ripple.start >= RIPPLE_MS) {
          entry.ripple = undefined;
          delete element.dataset.liquidRipple;
        }
        if (entry.ripple) active++;
        const box = rect(element);
        const age = entry.ripple ? (now - entry.ripple.start) / 1000 : 0;
        const waveX = (entry.ripple?.x ?? 0.5) * box.width;
        const waveY = (entry.ripple?.y ?? 0.5) * box.height;
        const amplitude = entry.ripple ? Math.exp(-age * 2.6) * Math.max(0, 1 - age / 1.1) : 0;
        const radius = Math.min(220, Math.hypot(box.width, box.height) * 0.82) * (1 - Math.exp(-age * 2.7));
        const values = [entry.x.value, entry.y.value, Math.max(0, entry.light.value), waveX, waveY, radius, amplitude * 0.3];
        FX_PROPERTIES.forEach((property, index) => {
          const unit = property === "light" || property === "ripple-opacity" ? "" : "px";
          const value = `${values[index].toFixed(3)}${unit}`;
          if (element.style.getPropertyValue(`--liquid-fx-${property}`) !== value)
            element.style.setProperty(`--liquid-fx-${property}`, value);
        });
        snapshots.set(element, {
          x: box.x + entry.x.value, y: box.y + entry.y.value,
          light: Math.max(0, entry.light.value), press: Math.max(0, entry.press.value),
          rippleX: box.x + waveX, rippleY: box.y + waveY,
          rippleAge: age, rippleStrength: entry.ripple ? 1 : 0,
        });
        if (!moving && !entry.ripple && !entry.hover && !entry.focus && !entry.press.target) clean(element);
      }
      return { active, travelling: travels.size > 0, surfaces: snapshots };
    },
    destroy() {
      for (const [name, listener] of listeners)
        document.removeEventListener(name, listener as EventListener);
      window.removeEventListener("blur", release);
      for (const element of entries.keys()) clean(element);
      for (const element of travels.keys()) delete element.dataset.liquidTravelling;
      travels.clear();
    },
  };
}
