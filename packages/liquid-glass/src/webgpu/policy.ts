import type { GlassMaterial, GlassTheme } from "../material";

export type LiquidSurfaceIntent = "control" | "navigation" | "reading" | "overlay";
export type LiquidReducedReason = "forced-colors" | "increased-contrast" | "solid-choice" | "reduced-transparency" | null;
export type LiquidSystemPreferences = {
  dark: boolean;
  contrast: boolean;
  transparency: boolean;
  colours: boolean;
};

export function resolveLiquidMaterial(
  requested: { theme: GlassTheme; material: GlassMaterial; increaseContrast: boolean; transparency: "system" | "glass" | "solid" },
  system: LiquidSystemPreferences,
) {
  const theme: "light" | "dark" = requested.theme === "system" ? system.dark ? "dark" : "light" : requested.theme;
  const contrast = requested.increaseContrast || system.contrast || system.colours ? "more" : "normal";
  const reducedReason: LiquidReducedReason = system.colours ? "forced-colors"
    : contrast === "more" ? "increased-contrast"
    : requested.material === "solid" || requested.transparency === "solid" ? "solid-choice"
    : requested.transparency === "system" && system.transparency ? "reduced-transparency" : null;
  const material: GlassMaterial = reducedReason ? "solid" : requested.material;
  return { theme, material, contrast, reducedReason } as const;
}

// Custom properties use three sRGB channels and a separate opacity, not arbitrary CSS colour syntax.
export function readLiquidTint(rgb: string, opacity: string): [number, number, number, number] {
  const channels = rgb.trim().split(/\s+/).map(Number);
  const alpha = opacity.trim() ? Number(opacity) : NaN;
  if (channels.length !== 3 || channels.some(value => !Number.isFinite(value)) || !Number.isFinite(alpha))
    return [0, 0, 0, 0];
  return [...channels.map(value => Math.max(0, Math.min(255, value)) / 255), Math.max(0, Math.min(1, alpha))] as [number, number, number, number];
}
