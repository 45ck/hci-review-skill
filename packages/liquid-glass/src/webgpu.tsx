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
export type { LiquidGlassStatus } from "./webgpu/engine";
export type { LiquidGlassMotion } from "./webgpu/motion";

type LiquidGlassContextValue = LiquidGlassState & {
  refresh: () => Promise<void>;
  motion: LiquidGlassMotion;
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
  onStatusChange,
}: {
  children: ReactNode;
  backdrop: ReactNode;
  refraction?: number;
  dispersion?: number;
  motion?: boolean | "system";
  transparency?: "system" | "glass" | "solid";
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
  const [preferences, setPreferences] = useState({ motion: false, transparency: false, colours: false });
  const reduced = preferences.colours || transparency === "solid" ||
    (transparency === "system" && preferences.transparency);
  const resolvedMotion: LiquidGlassMotion = motion === false ? "off" :
    motion === "system" && preferences.motion ? "reduced" : "enabled";
  const reducedReason = preferences.colours ? "forced-colors" :
    transparency === "solid" ? "solid-choice" : reduced ? "reduced-transparency" : null;
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
    };
    const update = () => setPreferences({
      motion: queries.motion.matches, transparency: queries.transparency.matches,
      colours: queries.colours.matches,
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
    ];
    const previous = attributes.map((name) => html.getAttribute(name));
    html.dataset.liquidGlassKit = "true";
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
    if (reducedReason) document.documentElement.dataset.liquidReducedReason = reducedReason;
    else delete document.documentElement.dataset.liquidReducedReason;
    engine.current?.update(settings.current);
  }, [refraction, dispersion, resolvedMotion, transparency, reducedReason, reduced]);
  useEffect(() => {
    callback.current?.(state.status);
  }, [state.status]);
  const refresh = useCallback(async () => {
    await engine.current?.refresh();
  }, []);
  const context = useMemo(() => ({ ...state, refresh, motion: resolvedMotion }), [state, refresh, resolvedMotion]);
  return (
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
  );
}
