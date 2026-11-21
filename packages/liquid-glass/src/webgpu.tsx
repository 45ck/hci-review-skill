"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { createLiquidGlassEngine } from "./webgpu/engine";
import type { LiquidGlassState, LiquidGlassStatus } from "./webgpu/engine";
import type { LiquidGlassMotion } from "./webgpu/motion";
import { DEFAULT_LIQUID_APPEARANCE, LiquidAppearanceProvider } from "./appearance";
import type { LiquidFontSet, LiquidIconSet } from "./appearance";
import type { GlassMaterial, GlassTheme } from "./material";
import { resolveLiquidMaterial } from "./webgpu/policy";
import type { LiquidReducedReason } from "./webgpu/policy";
export type { LiquidGlassStatus } from "./webgpu/engine";
export type { LiquidGlassMotion } from "./webgpu/motion";
export type { GlassMaterial, GlassTheme } from "./material";
export type { LiquidSurfaceIntent, LiquidReducedReason } from "./webgpu/policy";

type LiquidGlassContextValue = LiquidGlassState & {
  refresh: () => Promise<void>;
  motion: LiquidGlassMotion;
  theme: "light" | "dark";
  material: GlassMaterial;
  contrast: "normal" | "more";
  reducedReason: LiquidReducedReason;
};
const LiquidGlassContext = createContext<LiquidGlassContextValue | null>(null);

export function useLiquidGlass() {
  const context = useContext(LiquidGlassContext);
  if (!context)
    throw new Error("useLiquidGlass must be used within LiquidGlassProvider");
  return context;
}

export function LiquidGlassProvider({
  children,
  backdrop,
  refraction = 0.3,
  dispersion = 0.008,
  motion = "system",
  transparency = "system",
  theme = "system",
  material = "regular",
  increaseContrast = false,
  fontSet = DEFAULT_LIQUID_APPEARANCE.fontSet,
  iconSet = DEFAULT_LIQUID_APPEARANCE.iconSet,
  onStatusChange,
}: {
  children: ReactNode;
  backdrop: ReactNode;
  refraction?: number;
  dispersion?: number;
  motion?: boolean | "system";
  transparency?: "system" | "glass" | "solid";
  theme?: GlassTheme;
  material?: GlassMaterial;
  increaseContrast?: boolean;
  fontSet?: LiquidFontSet;
  iconSet?: LiquidIconSet;
  onStatusChange?: (status: LiquidGlassStatus) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const background = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<ReturnType<typeof createLiquidGlassEngine> | null>(
    null,
  );
  const callback = useRef(onStatusChange);
  callback.current = onStatusChange;
  const [preferences, setPreferences] = useState({ motion: false, transparency: false, colours: false, dark: false, contrast: false });
  const policy = resolveLiquidMaterial({ theme, material, increaseContrast, transparency }, preferences);
  const reduced = policy.material === "solid";
  const resolvedMotion: LiquidGlassMotion = motion === false ? "off" :
    motion === "system" && preferences.motion ? "reduced" : "enabled";
  const { reducedReason } = policy;
  const renderedTheme = useRef(policy.theme);
  const [state, setState] = useState<LiquidGlassState>({
    status: "loading",
    surfaceCount: 0,
  });
  const settings = useRef({ refraction, dispersion, motion: resolvedMotion });
  settings.current = {
    refraction: Math.max(
      0.01,
      Math.min(0.8, Number.isFinite(refraction) ? refraction : 0.3),
    ),
    dispersion: Math.max(
      0,
      Math.min(0.05, Number.isFinite(dispersion) ? dispersion : 0.008),
    ),
    motion: resolvedMotion,
  };

  useEffect(() => {
    const queries = {
      motion: matchMedia("(prefers-reduced-motion: reduce)"),
      transparency: matchMedia("(prefers-reduced-transparency: reduce)"),
      colours: matchMedia("(forced-colors: active)"),
      dark: matchMedia("(prefers-color-scheme: dark)"),
      contrast: matchMedia("(prefers-contrast: more)"),
    };
    const update = () => setPreferences({
      motion: queries.motion.matches, transparency: queries.transparency.matches,
      colours: queries.colours.matches,
      dark: queries.dark.matches, contrast: queries.contrast.matches,
    });
    update();
    for (const query of Object.values(queries)) query.addEventListener("change", update);
    return () => { for (const query of Object.values(queries)) query.removeEventListener("change", update); };
  }, []);

  useEffect(() => {
    if (!root.current || !background.current || !canvas.current) return;
    const html = document.documentElement;
    const attributes = [
      "data-liquid-glass-kit",
      "data-liquid-status",
      "data-liquid-surface-count",
      "data-liquid-render-revision",
      "data-liquid-capture-revision",
      "data-liquid-error",
      "data-liquid-motion",
      "data-liquid-motion-state",
      "data-liquid-motion-revision",
      "data-liquid-active-effects",
      "data-liquid-transparency",
      "data-liquid-reduced-reason",
      "data-liquid-theme",
      "data-liquid-material",
      "data-liquid-contrast",
    ];
    const previous = attributes.map((name) => html.getAttribute(name));
    html.dataset.liquidGlassKit = "true";
    html.dataset.liquidTheme = policy.theme;
    html.dataset.liquidMaterial = policy.material;
    html.dataset.liquidContrast = policy.contrast;
    html.dataset.liquidStatus = reduced ? "reduced" : "loading";
    html.dataset.liquidSurfaceCount = "0";
    html.dataset.liquidRenderRevision = "0";
    html.dataset.liquidCaptureRevision = "0";
    html.dataset.liquidMotion = settings.current.motion;
    html.dataset.liquidMotionState = "idle";
    html.dataset.liquidMotionRevision = "0";
    html.dataset.liquidActiveEffects = "0";
    delete html.dataset.liquidError;
    canvas.current.style.visibility = "hidden";
    setState({ status: reduced ? "reduced" : "loading", surfaceCount: 0 });
    engine.current = createLiquidGlassEngine({
      root: root.current,
      backdrop: background.current,
      canvas: canvas.current,
      ...settings.current,
      materialReduced: reduced,
      onChange: setState,
    });
    return () => {
      engine.current?.destroy();
      engine.current = null;
      attributes.forEach((name, index) =>
        previous[index] === null
          ? html.removeAttribute(name)
          : html.setAttribute(name, previous[index]!),
      );
    };
  }, [reduced]);

  useEffect(() => {
    document.documentElement.dataset.liquidMotion = resolvedMotion;
    document.documentElement.dataset.liquidTransparency = transparency;
    document.documentElement.dataset.liquidTheme = policy.theme;
    document.documentElement.dataset.liquidMaterial = policy.material;
    document.documentElement.dataset.liquidContrast = policy.contrast;
    if (reducedReason) document.documentElement.dataset.liquidReducedReason = reducedReason;
    else delete document.documentElement.dataset.liquidReducedReason;
    engine.current?.update(settings.current);
    // Theme tokens can change the supplied backdrop without a mutation inside it.
    if (renderedTheme.current !== policy.theme) {
      renderedTheme.current = policy.theme;
      void engine.current?.refresh();
    }
  }, [refraction, dispersion, resolvedMotion, transparency, reducedReason, reduced, fontSet, iconSet, policy.theme, policy.material, policy.contrast]);
  useEffect(() => {
    callback.current?.(state.status);
  }, [state.status]);
  const refresh = useCallback(async () => {
    await engine.current?.refresh();
  }, []);
  const context = useMemo(() => ({ ...state, refresh, motion: resolvedMotion, ...policy }),
    [state, refresh, resolvedMotion, policy.theme, policy.material, policy.contrast, reducedReason]);
  return (
    <LiquidAppearanceProvider fontSet={fontSet} iconSet={iconSet}>
      <LiquidGlassContext.Provider value={context}>
        <div
          ref={root}
          className="qg-liquid-provider"
          style={{
            position: "relative",
            isolation: "isolate",
            minHeight: "100vh",
          }}
        >
          <div
            ref={background}
            className="qg-liquid-backdrop"
            data-liquid-backdrop=""
            aria-hidden="true"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: -1,
              pointerEvents: "none",
              overflow: "hidden",
            }}
          >
            {backdrop}
          </div>
          <canvas
            ref={canvas}
            className="qg-gpu-canvas"
            data-liquid-canvas="viewport"
            data-html2canvas-ignore=""
            aria-hidden="true"
            style={{
              position: "fixed",
              inset: 0,
              width: "100vw",
              height: "100vh",
              zIndex: 0,
              pointerEvents: "none",
              display: "block",
            }}
          />
          <div
            className="qg-liquid-content"
            style={{ position: "relative", zIndex: 1 }}
          >
            {children}
          </div>
        </div>
      </LiquidGlassContext.Provider>
    </LiquidAppearanceProvider>
  );
}
