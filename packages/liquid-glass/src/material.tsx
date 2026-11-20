"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
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
  refraction: boolean;
  blur: number;
  saturation: number;
}
const defaults: GlassPreferences = {
  theme: "light",
  material: "regular",
  reduceMotion: false,
  increaseContrast: false,
  refraction: true,
  blur: 18,
  saturation: 150,
};
const storageKey = "qg.preferences.v1";
type GlassContextValue = {
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
    refraction: v.refraction !== false,
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

export function GlassProvider({ children }: { children: ReactNode }) {
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
  const filterId = `qg-refraction-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    setPreferences(readPreferences());
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    const root = document.documentElement;
    const attrs = {
      "data-qg-theme": theme,
      "data-qg-material": material,
      "data-qg-motion": reducedMotion ? "reduced" : "full",
      "data-qg-contrast": highContrast ? "more" : "normal",
      "data-qg-optics":
        preferences.refraction && material !== "solid" ? "on" : "off",
    };
    const properties = {
      "--qg-blur": `${preferences.blur}px`,
      "--qg-saturation": `${preferences.saturation}%`,
      "--qg-refraction-filter": `url(#${filterId})`,
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
    filterId,
    storageReady,
  ]);

  useEffect(() => {
    if (reducedMotion || material === "solid") return;
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
  }, [reducedMotion, material]);

  const value = useMemo<GlassContextValue>(
    () => ({
      preferences,
      update: (patch) =>
        setPreferences((current) => cleanPreferences({ ...current, ...patch })),
      reset: () => setPreferences({ ...defaults }),
      reducedMotion,
      reducedTransparency,
      highContrast,
      theme,
    }),
    [preferences, reducedMotion, reducedTransparency, highContrast, theme],
  );
  return (
    <GlassContext.Provider value={value}>
      <svg
        width="0"
        height="0"
        aria-hidden="true"
        className="qg-filter-definitions"
      >
        <defs>
          <filter
            id={filterId}
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.014 0.018"
              numOctaves="1"
              seed="8"
              result="noise"
            />
            <feGaussianBlur in="noise" stdDeviation="2" result="map" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="map"
              scale="9"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
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
