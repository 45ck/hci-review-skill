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
export type { LiquidGlassStatus } from "./webgpu/engine";

type LiquidGlassContextValue = LiquidGlassState & {
  refresh: () => Promise<void>;
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
  onStatusChange,
}: {
  children: ReactNode;
  backdrop: ReactNode;
  refraction?: number;
  dispersion?: number;
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
  const [reduced, setReduced] = useState(false);
  const [state, setState] = useState<LiquidGlassState>({
    status: "loading",
    surfaceCount: 0,
  });
  const settings = useRef({ refraction, dispersion });
  settings.current = {
    refraction: Math.max(
      0.01,
      Math.min(0.8, Number.isFinite(refraction) ? refraction : 0.3),
    ),
    dispersion: Math.max(
      0,
      Math.min(0.05, Number.isFinite(dispersion) ? dispersion : 0.008),
    ),
  };

  useEffect(() => {
    const preference = matchMedia(
      "(prefers-reduced-transparency: reduce), (forced-colors: active)",
    );
    const update = () => setReduced(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
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
    ];
    const previous = attributes.map((name) => html.getAttribute(name));
    html.dataset.liquidGlassKit = "true";
    html.dataset.liquidStatus = reduced ? "reduced" : "loading";
    html.dataset.liquidSurfaceCount = "0";
    html.dataset.liquidRenderRevision = "0";
    html.dataset.liquidCaptureRevision = "0";
    delete html.dataset.liquidError;
    canvas.current.style.visibility = "hidden";
    setState({ status: reduced ? "reduced" : "loading", surfaceCount: 0 });
    if (!reduced) {
      engine.current = createLiquidGlassEngine({
        root: root.current,
        backdrop: background.current,
        canvas: canvas.current,
        ...settings.current,
        onChange: setState,
      });
    }
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
    engine.current?.update(settings.current);
  }, [refraction, dispersion]);
  useEffect(() => {
    callback.current?.(state.status);
  }, [state.status]);
  const refresh = useCallback(async () => {
    await engine.current?.refresh();
  }, []);
  const context = useMemo(() => ({ ...state, refresh }), [state, refresh]);
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
