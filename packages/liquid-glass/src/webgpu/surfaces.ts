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
  "toolbar",
  "tabs-list",
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
};

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
      !element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
    )
      continue;
    const style = getComputedStyle(element);
    if (
      style.visibility !== "visible" ||
      style.display === "none" ||
      Number(style.opacity) === 0
    )
      continue;
    let clip = intersection(rect, viewport);
    let ancestor = element === popup ? null : element.parentElement;
    while (ancestor && ancestor !== document.documentElement) {
      const ancestorStyle = getComputedStyle(ancestor);
      if (
        /(hidden|clip|auto|scroll)/.test(
          `${ancestorStyle.overflowX} ${ancestorStyle.overflowY}`,
        )
      )
        clip = intersection(clip, ancestor.getBoundingClientRect());
      if (ancestor === popup) break;
      ancestor = ancestor.parentElement;
    }
    if (clip.width < 1 || clip.height < 1) continue;
    const corner = style.borderTopLeftRadius.split(" ")[0];
    const radius = corner.endsWith("%")
      ? (Math.min(rect.width, rect.height) * parseFloat(corner)) / 100
      : parseFloat(corner) || 0;
    result.push({
      element,
      rect,
      clip,
      radius: Math.min(radius, rect.width / 2, rect.height / 2),
      popup,
    });
  }
  return result;
}
