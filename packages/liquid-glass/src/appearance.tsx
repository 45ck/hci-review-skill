import { createContext, useContext, useEffect, useMemo } from "react";
import type { ReactNode } from "react";

export type LiquidFontSet = "studio" | "editorial" | "system";
export type LiquidIconSet = "isometric" | "line";
export type LiquidAppearance = { fontSet: LiquidFontSet; iconSet: LiquidIconSet };

export const DEFAULT_LIQUID_APPEARANCE: Readonly<LiquidAppearance> = Object.freeze({
  fontSet: "studio",
  iconSet: "isometric",
});

const LiquidAppearanceContext = createContext<LiquidAppearance>(
  DEFAULT_LIQUID_APPEARANCE,
);

export function useLiquidAppearance() {
  return useContext(LiquidAppearanceContext);
}

export function LiquidAppearanceProvider({
  fontSet,
  iconSet,
  children,
}: LiquidAppearance & { children: ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    const previousFont = html.getAttribute("data-liquid-font");
    const previousIcons = html.getAttribute("data-liquid-icons");
    html.dataset.liquidFont = fontSet;
    html.dataset.liquidIcons = iconSet;
    return () => {
      if (previousFont === null) delete html.dataset.liquidFont;
      else html.setAttribute("data-liquid-font", previousFont);
      if (previousIcons === null) delete html.dataset.liquidIcons;
      else html.setAttribute("data-liquid-icons", previousIcons);
    };
  }, [fontSet, iconSet]);
  const value = useMemo(() => ({ fontSet, iconSet }), [fontSet, iconSet]);
  return (
    <LiquidAppearanceContext.Provider value={value}>
      {children}
    </LiquidAppearanceContext.Provider>
  );
}
