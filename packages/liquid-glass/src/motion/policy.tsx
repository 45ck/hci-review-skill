"use client";

import { createContext, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useLiquidGlass } from "../webgpu";

export type LiquidMotionPreset = "calm" | "responsive" | "expressive";
export type LiquidMotionMode = "system" | "reduced" | "off";
export type LiquidMotionPolicy = {
  mode: LiquidMotionMode;
  preset: LiquidMotionPreset;
  enabled: boolean;
  reducedMotion: boolean;
  effective: "enabled" | "reduced" | "off";
  durationScale: number;
};

const MotionContext = createContext<{ mode: LiquidMotionMode; preset: LiquidMotionPreset }>({ mode: "system", preset: "responsive" });

export function useLiquidMotionPolicy(): LiquidMotionPolicy {
  const inherited = useContext(MotionContext);
  const { motion } = useLiquidGlass();
  const [device, setDevice] = useState({ reduced: true, forced: false });
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const forced = matchMedia("(forced-colors: active)");
    const update = () => setDevice({ reduced: reduced.matches, forced: forced.matches });
    update();
    reduced.addEventListener("change", update);
    forced.addEventListener("change", update);
    return () => { reduced.removeEventListener("change", update); forced.removeEventListener("change", update); };
  }, []);
  const effective = inherited.mode === "off" || motion === "off" || device.forced ? "off"
    : inherited.mode === "reduced" || motion === "reduced" || device.reduced ? "reduced" : "enabled";
  return useMemo(() => ({ ...inherited, effective, enabled: effective === "enabled", reducedMotion: effective !== "enabled",
    durationScale: inherited.preset === "calm" ? 1.25 : inherited.preset === "expressive" ? 1.1 : 1,
  }), [inherited, effective]);
}

function MotionScope({ children, className }: { children: ReactNode; className: string }) {
  const policy = useLiquidMotionPolicy();
  return <div className={`qgm-scope ${className}`.trim()} data-motion-preset={policy.preset} data-motion-policy={policy.effective}
    style={{ "--qgm-duration-scale": policy.durationScale } as CSSProperties}>{children}</div>;
}

export function LiquidMotionProvider({ children, mode = "system", preset = "responsive", className = "" }: {
  children: ReactNode; mode?: LiquidMotionMode; preset?: LiquidMotionPreset; className?: string;
}) {
  const parent = useContext(MotionContext);
  const safeMode = ["system", "reduced", "off"].includes(mode) ? mode : "system";
  const safePreset = ["calm", "responsive", "expressive"].includes(preset) ? preset : "responsive";
  const inheritedMode = parent.mode === "off" ? "off" : parent.mode === "reduced" && safeMode === "system" ? "reduced" : safeMode;
  const value = useMemo(() => ({ mode: inheritedMode, preset: safePreset }), [inheritedMode, safePreset]);
  return <MotionContext.Provider value={value}><MotionScope className={className}>{children}</MotionScope></MotionContext.Provider>;
}
