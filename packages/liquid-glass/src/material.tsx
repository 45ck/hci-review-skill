"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

export type GlassTheme = "system" | "light" | "dark";
export type GlassMaterial = "regular" | "clear" | "solid";
export interface GlassPreferences {
  theme: GlassTheme;
  material: GlassMaterial;
  reduceMotion: boolean;
  increaseContrast: boolean;
  /** @deprecated Reserved for compatibility; the CSS material has no optical renderer. */
  refraction: boolean;
  blur: number;
  saturation: number;
}
const defaults: GlassPreferences = {
  theme: "light",
  material: "regular",
  reduceMotion: false,
  increaseContrast: false,
  refraction: false,
  blur: 18,
  saturation: 150,
};
const storageKey = "qg.preferences.v1";
type GlassContextValue = {
  enabled: boolean;
  preferences: GlassPreferences;
  update: (patch: Partial<GlassPreferences>) => void;
  reset: () => void;
  reducedMotion: boolean;
  reducedTransparency: boolean;
  highContrast: boolean;
  theme: "light" | "dark";
};
const GlassContext = createContext<GlassContextValue | null>(null);

function cleanPreferences(value: unknown): GlassPreferences {
  if (!value || typeof value !== "object") return { ...defaults };
  const v = value as Partial<GlassPreferences>;
  return {
    theme: v.theme === "dark" || v.theme === "system" ? v.theme : "light",
    material:
      v.material === "clear" || v.material === "solid" ? v.material : "regular",
    reduceMotion: v.reduceMotion === true,
    increaseContrast: v.increaseContrast === true,
    refraction: v.refraction === true,
    blur:
      typeof v.blur === "number" && Number.isFinite(v.blur)
        ? Math.max(0, Math.min(32, v.blur))
        : defaults.blur,
    saturation:
      typeof v.saturation === "number" && Number.isFinite(v.saturation)
        ? Math.max(100, Math.min(200, v.saturation))
        : defaults.saturation,
  };
}
function readPreferences(): GlassPreferences {
  try {
    return cleanPreferences(
      JSON.parse(localStorage.getItem(storageKey) || "null"),
    );
  } catch {
    return { ...defaults };
  }
}
function useMedia(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof matchMedia === "undefined") return;
    const media = matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}

export function GlassProvider({
  children,
  enabled = true,
}: {
  children: ReactNode;
  enabled?: boolean;
}) {
  const [preferences, setPreferences] = useState<GlassPreferences>(() => ({
    ...defaults,
  }));
  const [storageReady, setStorageReady] = useState(false);
  const systemDark = useMedia("(prefers-color-scheme: dark)");
  const systemMotion = useMedia("(prefers-reduced-motion: reduce)");
  const reducedTransparency = useMedia(
    "(prefers-reduced-transparency: reduce)",
  );
  const systemContrast = useMedia("(prefers-contrast: more)");
  const forcedColors = useMedia("(forced-colors: active)");
  const reducedMotion = preferences.reduceMotion || systemMotion;
  const highContrast =
    preferences.increaseContrast || systemContrast || forcedColors;
  const theme =
    preferences.theme === "system"
      ? systemDark
        ? "dark"
        : "light"
      : preferences.theme;
  const material =
    reducedTransparency || highContrast ? "solid" : preferences.material;

  useEffect(() => {
    setPreferences(readPreferences());
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady || !enabled) return;
    const root = document.documentElement;
    const attrs = {
      "data-qg-material-enabled": "true",
      "data-qg-theme": theme,
      "data-qg-material": material,
      "data-qg-motion": reducedMotion ? "reduced" : "full",
      "data-qg-contrast": highContrast ? "more" : "normal",
      "data-qg-optics": "off",
    };
    const properties = {
      "--qg-blur": `${preferences.blur}px`,
      "--qg-saturation": `${preferences.saturation}%`,
    };
    const previousAttrs = Object.entries(attrs).map(([key, value]) => ({
      key,
      value,
      previous: root.getAttribute(key),
    }));
    const previousProperties = Object.entries(properties).map(
      ([key, value]) => ({
        key,
        value,
        previous: root.style.getPropertyValue(key),
        priority: root.style.getPropertyPriority(key),
      }),
    );
    for (const [key, value] of Object.entries(attrs))
      root.setAttribute(key, value);
    for (const [key, value] of Object.entries(properties))
      root.style.setProperty(key, value);
    try {
      localStorage.setItem(storageKey, JSON.stringify(preferences));
    } catch {
      /* Preferences remain usable when storage is unavailable. */
    }
    return () => {
      for (const { key, value, previous } of previousAttrs) {
        if (root.getAttribute(key) !== value) continue;
        if (previous === null) root.removeAttribute(key);
        else root.setAttribute(key, previous);
      }
      for (const { key, value, previous, priority } of previousProperties) {
        if (root.style.getPropertyValue(key) !== value) continue;
        if (previous) root.style.setProperty(key, previous, priority);
        else root.style.removeProperty(key);
      }
    };
  }, [
    preferences,
    material,
    theme,
    reducedMotion,
    highContrast,
    storageReady,
    enabled,
  ]);

  useEffect(() => {
    if (!enabled || reducedMotion || material === "solid") return;
    let frame = 0;
    let latest: PointerEvent | null = null;
    let active: HTMLElement | null = null;
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      latest = event;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!latest || !(latest.target instanceof Element)) return;
        const next = latest.target.closest<HTMLElement>(
          ".qg-surface, [data-slot='button'], [data-slot$='trigger']",
        );
        if (active && active !== next) {
          active.style.removeProperty("--qg-x");
          active.style.removeProperty("--qg-y");
        }
        active = next;
        if (!active) return;
        const rect = active.getBoundingClientRect();
        active.style.setProperty(
          "--qg-x",
          `${Math.round(latest.clientX - rect.left)}px`,
        );
        active.style.setProperty(
          "--qg-y",
          `${Math.round(latest.clientY - rect.top)}px`,
        );
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(frame);
      if (active) {
        active.style.removeProperty("--qg-x");
        active.style.removeProperty("--qg-y");
      }
    };
  }, [enabled, reducedMotion, material]);

  const value = useMemo<GlassContextValue>(
    () => ({
      enabled,
      preferences,
      update: (patch) =>
        setPreferences((current) => cleanPreferences({ ...current, ...patch })),
      reset: () => setPreferences({ ...defaults }),
      reducedMotion,
      reducedTransparency,
      highContrast,
      theme,
    }),
    [enabled, preferences, reducedMotion, reducedTransparency, highContrast, theme],
  );
  return (
    <GlassContext.Provider value={value}>
      {children}
    </GlassContext.Provider>
  );
}

export function useGlass() {
  const value = useContext(GlassContext);
  if (!value) throw new Error("useGlass must be rendered inside GlassProvider");
  return value;
}

export function GlassSurface({
  children,
  className = "",
  style,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      {...props}
      ref={ref}
      className={`qg-surface ${className}`}
      style={style as CSSProperties}
    >
      {children}
    </div>
  );
}
