import { readLiquidEdgeOpacity, readLiquidTint } from "./policy";

export const LIQUID_SURFACE_SLOTS = [
  "button",
  "toggle",
  "input",
  "textarea",
  "input-group",
  "number-input-group",
  "password-input",
  "date-input",
  "time-input",
  "select-trigger",
  "combobox-trigger",
  "combobox-input",
  "autocomplete-input",
  "segmented-control",
  "segmented-control-indicator",
  "toolbar",
  "tabs-list",
  "tabs-indicator",
  "accordion",
  "collapsible",
  "menu-content",
  "select-content",
  "combobox-content",
  "autocomplete-content",
  "dialog-content",
  "alert-dialog-content",
  "drawer-content",
  "popover-content",
  "hover-card-content",
  "tooltip-content",
  "toast",
  "calendar",
  "date-picker-content",
  "color-picker-content",
  "color-picker-input",
  "navigation-menu-content",
  "navigation-menu-viewport",
  "dialog-trigger",
  "alert-dialog-trigger",
  "drawer-trigger",
  "popover-trigger",
  "menu-trigger",
  "tooltip-trigger",
  "dialog-close",
  "alert-dialog-close",
  "drawer-close",
  "popover-close",
  "command",
  "command-content",
  "trigger-menu-content",
  "listbox",
  "tree",
  "scroll-area",
  "resizable",
  "pagination-content",
  "menubar",
  "file-input-dropzone",
  "file-input-trigger",
  "otp-input-slot",
  "token-input-editor",
  "rating-item",
  "switch",
  "slider-thumb",
] as const;

export const SURFACE_SELECTOR = [
  "[data-liquid-glass]:not([data-liquid-glass='off'])",
  ...LIQUID_SURFACE_SLOTS.map((slot) => `[data-slot='${slot}']`),
].join(",");

export type Box = { x: number; y: number; width: number; height: number };
export type LiquidSurface = {
  element: HTMLElement;
  rect: Box;
  clip: Box;
  radius: number;
  popup: HTMLElement | null;
  tint: [number, number, number, number];
  edgeOpacity: number;
  reflection: number;
};
export type ReadingFallbackReason = "reading-surface" | "reading-plane";

export function getReadingFallbackReason(element: HTMLElement, plane: HTMLElement): ReadingFallbackReason | null {
  const reading = (node: HTMLElement) => node.dataset.liquidIntent === "reading" || node.dataset.liquidKind === "content";
  if (reading(element)) return "reading-surface";
  if (element === plane) return null;
  // A plane's own background paints below its canvas; opaque descendants paint above it.
  for (let ancestor = element.parentElement; ancestor && ancestor !== plane; ancestor = ancestor.parentElement)
    if (reading(ancestor)) return "reading-plane";
  return null;
}

function intersection(a: Box, b: Box): Box {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(0, Math.min(a.x + a.width, b.x + b.width) - x),
    height: Math.max(0, Math.min(a.y + a.height, b.y + b.height) - y),
  };
}

export function collectSurfaces(
  root: HTMLElement,
  backdrop: HTMLElement,
  fallbacks?: Map<HTMLElement, ReadingFallbackReason>,
): LiquidSurface[] {
  const viewport = {
    x: 0,
    y: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  };
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(SURFACE_SELECTOR),
  );
  const result: LiquidSurface[] = [];
  for (const element of elements) {
    if (result.length >= 256) break;
    if (
      backdrop.contains(element) ||
      element.closest("[data-liquid-glass='off']") ||
      element.closest("[data-liquid-canvas]") ||
      !element.isConnected
    )
      continue;
    let popup: HTMLElement | null = null;
    try {
      popup = element.closest<HTMLElement>(":popover-open, dialog:modal");
    } catch {
      /* Older browsers have no top-layer selectors. */
    }
    if (!root.contains(element) && !popup) continue;
    const fallbackReason = getReadingFallbackReason(element, popup ?? root);
    if (fallbackReason) {
      fallbacks?.set(element, fallbackReason);
      continue;
    }
    if (
      element.dataset.slot === "input" &&
      element.parentElement?.closest(
        "[data-slot='input-group'],[data-slot='number-input'],[data-slot='password-input'],[data-slot='date-input'],[data-slot='time-input'],[data-slot='token-input']",
      )
    )
      continue;
    if (
      element.dataset.slot === "calendar" &&
      element.parentElement?.closest("[data-slot='date-picker-content']")
    )
      continue;
    const rect = element.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2 || !element.getClientRects().length)
      continue;
    if (
      element.checkVisibility &&
      !element.checkVisibility({ checkOpacity: !popup, checkVisibilityCSS: true })
    )
      continue;
    const style = getComputedStyle(element);
    if (
      style.visibility !== "visible" ||
      style.display === "none" ||
      (element !== popup && Number(style.opacity) === 0)
    )
      continue;
    // A local canvas inherits its top-layer host's opening/closing opacity.
    // Keep that host registered at opacity 0 so its first visible frame has
    // glass even if the fade completes between geometry invalidations.
    // Opacity-zero descendants inside the host still have no visible surface.
    let clip = intersection(rect, viewport);
    let ancestor = element === popup ? null : element.parentElement;
    let transparent = false;
    while (ancestor && ancestor !== document.documentElement) {
      const ancestorStyle = getComputedStyle(ancestor);
      if (ancestor !== popup && Number(ancestorStyle.opacity) === 0) {
        transparent = true;
        break;
      }
      if (
        /(hidden|clip|auto|scroll)/.test(
          `${ancestorStyle.overflowX} ${ancestorStyle.overflowY}`,
        )
      )
        clip = intersection(clip, ancestor.getBoundingClientRect());
      if (ancestor === popup) break;
      ancestor = ancestor.parentElement;
    }
    if (transparent || clip.width < 1 || clip.height < 1) continue;
    const corner = style.borderTopLeftRadius.split(" ")[0];
    const radius = corner.endsWith("%")
      ? (Math.min(rect.width, rect.height) * parseFloat(corner)) / 100
      : parseFloat(corner) || 0;
    const reflection = Number(style.getPropertyValue("--liquid-optic-reflection") || 1);
    const tint = readLiquidTint(style.getPropertyValue("--liquid-optic-rgb"), style.getPropertyValue("--liquid-optic-opacity"));
    result.push({
      element,
      rect,
      clip,
      radius: Math.min(radius, rect.width / 2, rect.height / 2),
      popup,
      tint,
      edgeOpacity: readLiquidEdgeOpacity(style.getPropertyValue("--liquid-optic-edge-opacity"), tint[3]),
      reflection: Number.isFinite(reflection) ? Math.max(0, Math.min(1, reflection)) : 1,
    });
  }
  return result;
}
