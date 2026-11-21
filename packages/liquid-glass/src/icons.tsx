import { createElement, useId, type CSSProperties } from "react";
import { useLiquidAppearance } from "./appearance";

/** Original vector redraws of the generated Quantive Glass art direction.
 * Shapes remain ordinary decorative SVG above the shared WebGPU material. */

const artwork = {
  "layers": [
    {"tag":"path","props":{"d":"M7 20L29 32Q32 34 35 32L57 20V25Q57 28 54 30L35 40Q32 42 29 40L10 30Q7 28 7 25Z","fill":"side","transform":"translate(0 22)"}},
    {"tag":"path","props":{"d":"M10 11L29 1Q32-1 35 1L54 11Q60 14 54 17L35 27Q32 29 29 27L10 17Q4 14 10 11Z","fill":"front","transform":"translate(0 26)","stroke":"rim","strokeWidth":1.35}},
    {"tag":"path","props":{"d":"M10 15L29 25Q32 27 35 25L54 15","fill":"none","stroke":"rim","strokeWidth":1.4,"strokeLinecap":"round","strokeLinejoin":"round","transform":"translate(0 26)","opacity":0.7}},
    {"tag":"path","props":{"d":"M7 20L29 32Q32 34 35 32L57 20V25Q57 28 54 30L35 40Q32 42 29 40L10 30Q7 28 7 25Z","fill":"side","transform":"translate(0 11)"}},
    {"tag":"path","props":{"d":"M10 11L29 1Q32-1 35 1L54 11Q60 14 54 17L35 27Q32 29 29 27L10 17Q4 14 10 11Z","fill":"peach","transform":"translate(0 15)","stroke":"rim","strokeWidth":1.35}},
    {"tag":"path","props":{"d":"M10 15L29 25Q32 27 35 25L54 15","fill":"none","stroke":"rim","strokeWidth":1.4,"strokeLinecap":"round","strokeLinejoin":"round","transform":"translate(0 15)","opacity":0.7}},
    {"tag":"path","props":{"d":"M7 20L29 32Q32 34 35 32L57 20V25Q57 28 54 30L35 40Q32 42 29 40L10 30Q7 28 7 25Z","fill":"side","transform":"translate(0 0)"}},
    {"tag":"path","props":{"d":"M10 11L29 1Q32-1 35 1L54 11Q60 14 54 17L35 27Q32 29 29 27L10 17Q4 14 10 11Z","fill":"top","transform":"translate(0 4)","stroke":"rim","strokeWidth":1.35}},
    {"tag":"path","props":{"d":"M10 15L29 25Q32 27 35 25L54 15","fill":"none","stroke":"rim","strokeWidth":1.4,"strokeLinecap":"round","strokeLinejoin":"round","transform":"translate(0 4)","opacity":0.7}},
  ],
  "folder": [
    {"tag":"path","props":{"d":"M13 11Q13 7 18 8L29 11Q31 12 32 15L34 18L51 23Q56 24 56 30L58 49Q58 53 53 56L46 59L12 47Z","fill":"side","stroke":"edge","strokeWidth":1}},
    {"tag":"path","props":{"d":"M10 15Q10 11 14 12L26 15Q28 16 29 19L31 22L48 27Q52 28 52 33L53 53L10 45Z","fill":"front","stroke":"rim","strokeWidth":1.4}},
    {"tag":"path","props":{"d":"M20 21Q20 18 23 19L44 25Q47 26 47 29L46 48L20 42Z","fill":"peach","stroke":"rim","strokeWidth":1}},
    {"tag":"path","props":{"d":"M8 28Q8 24 13 26L45 35Q49 36 50 40L54 54Q55 58 50 58L13 48Q9 47 9 43Z","fill":"front","stroke":"rim","strokeWidth":1.5}},
    {"tag":"path","props":{"d":"M12 28L44 37Q47 38 48 41","fill":"none","stroke":"rim","strokeWidth":1.4,"strokeLinecap":"round","strokeLinejoin":"round"}},
  ],
  "grid": [
    {"tag":"path","props":{"d":"M7 11L18.0 17V33L7 27Q6 26 6 24V13Q6 12 7 11Z","fill":"front","stroke":"rim","strokeWidth":0.9}},
    {"tag":"path","props":{"d":"M18.0 17L29 11V25Q29 27 27 28L18.0 33Z","fill":"side","stroke":"edge","strokeWidth":0.8}},
    {"tag":"path","props":{"d":"M7 11L16.0 6Q18.0 5 20.0 6L29 11L20.0 16Q18.0 17 16.0 16Z","fill":"top","stroke":"rim","strokeWidth":1}},
    {"tag":"path","props":{"d":"M35 11L46.0 17V33L35 27Q34 26 34 24V13Q34 12 35 11Z","fill":"front","stroke":"rim","strokeWidth":0.9}},
    {"tag":"path","props":{"d":"M46.0 17L57 11V25Q57 27 55 28L46.0 33Z","fill":"side","stroke":"edge","strokeWidth":0.8}},
    {"tag":"path","props":{"d":"M35 11L44.0 6Q46.0 5 48.0 6L57 11L48.0 16Q46.0 17 44.0 16Z","fill":"top","stroke":"rim","strokeWidth":1}},
    {"tag":"path","props":{"d":"M7 37L18.0 43V59L7 53Q6 52 6 50V39Q6 38 7 37Z","fill":"front","stroke":"rim","strokeWidth":0.9}},
    {"tag":"path","props":{"d":"M18.0 43L29 37V51Q29 53 27 54L18.0 59Z","fill":"side","stroke":"edge","strokeWidth":0.8}},
    {"tag":"path","props":{"d":"M7 37L16.0 32Q18.0 31 20.0 32L29 37L20.0 42Q18.0 43 16.0 42Z","fill":"top","stroke":"rim","strokeWidth":1}},
    {"tag":"path","props":{"d":"M35 37L46.0 43V59L35 53Q34 52 34 50V39Q34 38 35 37Z","fill":"front","stroke":"rim","strokeWidth":0.9}},
    {"tag":"path","props":{"d":"M46.0 43L57 37V51Q57 53 55 54L46.0 59Z","fill":"side","stroke":"edge","strokeWidth":0.8}},
    {"tag":"path","props":{"d":"M35 37L44.0 32Q46.0 31 48.0 32L57 37L48.0 42Q46.0 43 44.0 42Z","fill":"top","stroke":"rim","strokeWidth":1}},
  ],
  "settings": [
    {"tag":"path","props":{"d":"M17 5L49 14Q57 17 57 25V50Q57 57 50 59L15 47Q10 45 10 38V13Q10 7 17 5Z","fill":"side","stroke":"edge","strokeWidth":1}},
    {"tag":"path","props":{"d":"M14 9L46 18Q53 20 53 27V51Q53 57 47 55L15 46Q9 44 9 38V15Q9 8 14 9Z","fill":"front","stroke":"rim","strokeWidth":1.5}},
    {"tag":"path","props":{"d":"M18 20L43 27M18 30L43 37M18 40L43 47","fill":"none","stroke":"side","strokeWidth":4.5,"strokeLinecap":"round"}},
    {"tag":"path","props":{"d":"M18 18L43 25M18 28L43 35M18 38L43 45","fill":"none","stroke":"rim","strokeWidth":1.4,"strokeLinecap":"round","strokeLinejoin":"round","opacity":0.75}},
    {"tag":"ellipse","props":{"cx":36,"cy":24.5,"rx":4.4,"ry":5,"fill":"peach","stroke":"rim","strokeWidth":1}},
    {"tag":"ellipse","props":{"cx":24,"cy":31.3,"rx":4.4,"ry":5,"fill":"peach","stroke":"rim","strokeWidth":1}},
    {"tag":"ellipse","props":{"cx":38,"cy":45,"rx":4.4,"ry":5,"fill":"peach","stroke":"rim","strokeWidth":1}},
  ],
  "bell": [
    {"tag":"path","props":{"d":"M29 15V11Q29 5 35 7Q41 9 40 17","fill":"side","stroke":"edge","strokeWidth":1.2}},
    {"tag":"path","props":{"d":"M26 15V10Q26 5 31 6Q36 7 36 14","fill":"front","stroke":"rim","strokeWidth":1.3}},
    {"tag":"path","props":{"d":"M18 45Q23 39 23 29Q23 14 36 15Q49 16 50 31Q50 42 56 48Q58 52 52 55L19 50Z","fill":"side","stroke":"edge","strokeWidth":1}},
    {"tag":"ellipse","props":{"cx":32,"cy":50,"rx":6.2,"ry":7.5,"fill":"peach","stroke":"rim","strokeWidth":1.1}},
    {"tag":"path","props":{"d":"M10 43Q16 37 17 26Q18 12 31 14Q44 16 44 30Q45 42 51 48Q53 51 49 52L12 48Q7 47 10 43Z","fill":"front","stroke":"rim","strokeWidth":1.6}},
    {"tag":"path","props":{"d":"M11 44Q28 39 49 48Q52 49 48 51Q27 46 11 48Z","fill":"top","stroke":"rim","strokeWidth":1}},
    {"tag":"path","props":{"d":"M20 24Q21 15 30 17","fill":"none","stroke":"rim","strokeWidth":1.4,"strokeLinecap":"round","strokeLinejoin":"round","opacity":0.72}},
  ],
  "volume": [
    {"tag":"path","props":{"d":"M35 11Q38 8 42 12V53Q42 59 37 57L18 41L8 38V26L18 23Z","fill":"side","stroke":"edge","strokeWidth":1.1}},
    {"tag":"path","props":{"d":"M8 26L18 29L36 14Q38 12 38 17V54Q38 58 35 55L18 41L8 38Z","fill":"front","stroke":"rim","strokeWidth":1.5}},
    {"tag":"path","props":{"d":"M8 26L18 29V41L8 38Z","fill":"top","stroke":"rim","strokeWidth":1.2}},
    {"tag":"path","props":{"d":"M47 24Q58 34 48 45M53 16Q69 34 54 53","fill":"none","stroke":"side","strokeWidth":5,"strokeLinecap":"round"}},
    {"tag":"path","props":{"d":"M45 23Q55 33 46 44M51 16Q66 33 52 51","fill":"none","stroke":"front","strokeWidth":4.2,"strokeLinecap":"round"}},
    {"tag":"path","props":{"d":"M45 22Q54 31 48 41M51 15Q64 29 58 42","fill":"none","stroke":"rim","strokeWidth":1,"strokeLinecap":"round"}},
  ],
  "bookmark": [
    {"tag":"path","props":{"d":"M19 5L45 12Q51 14 51 20V54Q51 60 46 58L33 45L21 50Q15 53 15 47V12Q15 7 19 5Z","fill":"side","stroke":"edge","strokeWidth":1}},
    {"tag":"path","props":{"d":"M17 9L41 16Q47 17 47 23V54Q47 58 43 54L30 42L18 48Q13 51 13 46V14Q13 8 17 9Z","fill":"front","stroke":"rim","strokeWidth":1.6}},
    {"tag":"path","props":{"d":"M18 12L40 18Q43 19 44 22","fill":"none","stroke":"rim","strokeWidth":1.4,"strokeLinecap":"round","strokeLinejoin":"round","opacity":0.78}},
  ],
  "sparkles": [
    {"tag":"path","props":{"d":"M32 9Q37 27 49 31Q57 34 49 37Q37 41 32 56Q30 61 27 55Q22 42 10 38Q5 35 10 32Q24 28 28 12Q30 5 32 9Z","fill":"side","transform":"translate(3 1)"}},
    {"tag":"path","props":{"d":"M31 8Q35 24 47 29Q54 32 47 35Q35 39 31 53Q29 59 26 53Q22 39 10 35Q4 32 10 29Q23 25 26 11Q28 3 31 8Z","fill":"front","stroke":"rim","strokeWidth":1.5}},
    {"tag":"path","props":{"d":"M28 14Q27 29 12 32Q28 34 29 49Q31 35 44 32Q32 28 28 14Z","fill":"peach","opacity":0.4}},
    {"tag":"path","props":{"d":"M51 7Q53 14 58 16Q61 17 58 18Q53 20 51 27Q49 20 44 18Q41 17 44 16Q49 14 51 7Z","fill":"top","stroke":"rim","strokeWidth":1}},
    {"tag":"path","props":{"d":"M52 43Q54 49 59 51Q54 53 52 59Q50 53 45 51Q50 49 52 43Z","fill":"peach","stroke":"rim","strokeWidth":1}},
  ],
  "activity": [
    {"tag":"path","props":{"d":"M5 40L12.0 46V57L5 51Q4 50 4 48V42Q4 41 5 40Z","fill":"front","stroke":"rim","strokeWidth":0.9}},
    {"tag":"path","props":{"d":"M12.0 46L19 40V49Q19 51 17 52L12.0 57Z","fill":"side","stroke":"edge","strokeWidth":0.8}},
    {"tag":"path","props":{"d":"M5 40L10.0 35Q12.0 34 14.0 35L19 40L14.0 45Q12.0 46 10.0 45Z","fill":"top","stroke":"rim","strokeWidth":1}},
    {"tag":"path","props":{"d":"M24 28L31.0 34V60L24 54Q23 53 23 51V30Q23 29 24 28Z","fill":"peach","stroke":"rim","strokeWidth":0.9}},
    {"tag":"path","props":{"d":"M31.0 34L38 28V52Q38 54 36 55L31.0 60Z","fill":"peachSide","stroke":"edge","strokeWidth":0.8}},
    {"tag":"path","props":{"d":"M24 28L29.0 23Q31.0 22 33.0 23L38 28L33.0 33Q31.0 34 29.0 33Z","fill":"peach","stroke":"rim","strokeWidth":1}},
    {"tag":"path","props":{"d":"M43 11L50.0 17V62L43 56Q42 55 42 53V13Q42 12 43 11Z","fill":"front","stroke":"rim","strokeWidth":0.9}},
    {"tag":"path","props":{"d":"M50.0 17L57 11V54Q57 56 55 57L50.0 62Z","fill":"side","stroke":"edge","strokeWidth":0.8}},
    {"tag":"path","props":{"d":"M43 11L48.0 6Q50.0 5 52.0 6L57 11L52.0 16Q50.0 17 48.0 16Z","fill":"top","stroke":"rim","strokeWidth":1}},
  ],
  "code": [
    {"tag":"path","props":{"d":"M22 15L9 28Q6 31 9 35L22 49Q25 52 28 49Q31 46 28 43L18 32L28 22Q31 18 28 15Q25 12 22 15Z","fill":"side","transform":"translate(2 -1)"}},
    {"tag":"path","props":{"d":"M20 16L7 29Q4 32 7 36L20 50Q23 53 26 50Q29 47 26 44L16 33L26 23Q29 19 26 16Q23 13 20 16Z","fill":"front","stroke":"rim","strokeWidth":1.4}},
    {"tag":"path","props":{"d":"M45 15L58 29Q61 32 58 36L45 50Q42 53 39 50Q36 47 39 44L49 33L39 23Q36 19 39 16Q42 13 45 15Z","fill":"side","transform":"translate(2 -1)"}},
    {"tag":"path","props":{"d":"M43 16L56 30Q59 33 56 37L43 51Q40 54 37 51Q34 48 37 45L47 34L37 24Q34 20 37 17Q40 14 43 16Z","fill":"front","stroke":"rim","strokeWidth":1.4}},
    {"tag":"path","props":{"d":"M34 10Q35 5 39 6Q43 7 42 12L32 54Q31 59 27 58Q23 57 24 52Z","fill":"peach","stroke":"rim","strokeWidth":1.4}},
  ],
  "copy": [
    {"tag":"path","props":{"d":"M31 7L46 11L58 25V49Q58 54 53 53L30 47Q26 46 26 41V12Q26 6 31 7Z","fill":"side","stroke":"edge","strokeWidth":1}},
    {"tag":"path","props":{"d":"M29 10L43 14L54 27V48Q54 52 50 51L28 45Q24 44 24 40V15Q24 9 29 10Z","fill":"front","stroke":"rim","strokeWidth":1.3}},
    {"tag":"path","props":{"d":"M43 14V23Q43 26 47 27L54 28Z","fill":"top","stroke":"rim","strokeWidth":1}},
    {"tag":"path","props":{"d":"M15 22L30 26L44 41V57Q44 62 38 60L13 53Q9 52 9 47V27Q9 21 15 22Z","fill":"side","transform":"translate(3 -2)"}},
    {"tag":"path","props":{"d":"M13 24L28 28L41 42V56Q41 60 37 59L13 52Q9 51 9 47V29Q9 23 13 24Z","fill":"front","stroke":"rim","strokeWidth":1.5}},
    {"tag":"path","props":{"d":"M28 28V37Q28 40 32 41L41 43Z","fill":"top","stroke":"rim","strokeWidth":1}},
    {"tag":"path","props":{"d":"M15 44L30 48","fill":"none","stroke":"rim","strokeWidth":1.4,"strokeLinecap":"round","strokeLinejoin":"round","opacity":0.8}},
  ],
  "inbox": [
    {"tag":"path","props":{"d":"M8 31L37 17Q40 16 43 18L57 27L57 50Q57 53 53 55L29 62L8 48Z","fill":"side","stroke":"edge","strokeWidth":1}},
    {"tag":"path","props":{"d":"M10 31L38 19L53 28L28 42Z","fill":"top","stroke":"rim","strokeWidth":1.3}},
    {"tag":"path","props":{"d":"M24 7Q24 3 28 4L48 10Q52 11 51 15L47 40L22 34Z","fill":"peach","stroke":"rim","strokeWidth":1.4}},
    {"tag":"path","props":{"d":"M29 13L43 17M28 20L42 24M27 27L39 31","fill":"none","stroke":"#fff0dc","strokeWidth":2,"strokeLinecap":"round","opacity":0.85}},
    {"tag":"path","props":{"d":"M8 31L20 37Q23 38 24 42Q27 46 31 43L35 39L55 29V49Q55 53 51 54L30 60Q27 61 24 59L11 50Q8 48 8 44Z","fill":"front","stroke":"rim","strokeWidth":1.5}},
    {"tag":"path","props":{"d":"M11 33L20 38Q23 39 24 42Q27 47 32 44L35 40L52 31","fill":"none","stroke":"rim","strokeWidth":1.4,"strokeLinecap":"round","strokeLinejoin":"round"}},
  ],
} as const;

const linePaths = {
  "layers": ["M12 3 3 8l9 5 9-5-9-5Z","m3 12 9 5 9-5","m3 16 9 5 9-5"],
  "folder": ["M3 7V6a2 2 0 0 1 2-2h4l3 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"],
  "grid": ["M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"],
  "settings": ["M4 6h16M4 12h16M4 18h16","M9 3v6M15 9v6M8 15v6"],
  "bell": ["M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9","M10 21h4"],
  "volume": ["M11 4 6 8H3v8h3l5 4V4Z","M15 8a6 6 0 0 1 0 8","M18 5a10 10 0 0 1 0 14"],
  "bookmark": ["M6 3h12v18l-6-4-6 4V3Z"],
  "sparkles": ["m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z","M20 2v4M18 4h4"],
  "activity": ["M4 20v-5M12 20V9M20 20V3"],
  "code": ["m7 5-6 7 6 7","m17 5 6 7-6 7","m14 3-4 18"],
  "copy": ["M9 9h12v12H9z","M15 5V3H3v12h2"],
  "inbox": ["M4 4h16l2 11v5H2v-5L4 4Z","M2 15h6l2 3h4l2-3h6"],
  "plus": ["M12 5v14M5 12h14"],
  "check": ["m5 12 4 4L19 6"],
  "search": ["M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z","m15 15 6 6"],
  "more": ["M5 12h.01M12 12h.01M19 12h.01"],
  "reset": ["M3 10a9 9 0 1 1 1.5 7","M3 4v6h6"],
} as const;

const gradients = {
  "front": {"x1":"10%","y1":"0%","x2":"75%","y2":"100%","stops":[["0%","#effbff"],["26%","#b9dce8"],["68%","#5aafbf"],["100%","#b6f1e8"]]},
  "side": {"x1":"0%","y1":"0%","x2":"100%","y2":"85%","stops":[["0%","#7ab5ca"],["50%","#2e7595"],["100%","#5aaeb7"]]},
  "top": {"x1":"15%","y1":"0%","x2":"80%","y2":"100%","stops":[["0%","#f9feff"],["45%","#bfdde7"],["100%","#84d7d6"]]},
  "peach": {"x1":"10%","y1":"0%","x2":"90%","y2":"100%","stops":[["0%","#fff4df"],["45%","#ffd1ad"],["100%","#e99d82"]]},
  "peachSide": {"x1":"0%","y1":"0%","x2":"100%","y2":"100%","stops":[["0%","#f6c6ac"],["100%","#c98870"]]},
  "rim": {"x1":"0%","y1":"0%","x2":"80%","y2":"100%","stops":[["0%","#ffffff"],["42%","#f4ffff"],["100%","#9ed9df"]]},
  "edge": {"x1":"0%","y1":"0%","x2":"100%","y2":"100%","stops":[["0%","#d9eef9"],["100%","#528ca1"]]},
} as const;

export type LiquidIconName = keyof typeof linePaths;
export const LIQUID_ICON_NAMES = Object.keys(linePaths) as LiquidIconName[];
export const LIQUID_ISOMETRIC_ICON_NAMES = Object.keys(artwork) as (keyof typeof artwork)[];
export type LiquidIconProps = {
  name: LiquidIconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
};

type Shape = { tag: string; props: Record<string, string | number> };
const paint = (value: string | number, prefix: string) =>
  typeof value === "string" && value in gradients ? `url(#${prefix}-${value})` : value;

/** Decorative only: name the containing control or provide adjacent text. */
export function LiquidIcon({ name, size = 24, className = "", style }: LiquidIconProps) {
  const { iconSet } = useLiquidAppearance();
  const prefix = `qg-icon-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const object = name in artwork ? artwork[name as keyof typeof artwork] : undefined;
  const variant = iconSet === "isometric" && object && size >= 20 ? "isometric" : "line";
  return (
    <span
      className={`qg-icon ${className}`.trim()}
      data-liquid-icon={name}
      data-liquid-icon-set={iconSet}
      data-icon-style={variant}
      aria-hidden="true"
      style={{ width: size, height: size, ...style }}
    >
      {object && (
        <svg className="qg-icon-object" data-icon-variant="isometric" viewBox="0 0 64 64" fill="none" focusable="false" aria-hidden="true">
          <defs>
            {Object.entries(gradients).map(([key, gradient]) => (
              <linearGradient key={key} id={`${prefix}-${key}`} x1={gradient.x1} y1={gradient.y1} x2={gradient.x2} y2={gradient.y2}>
                {gradient.stops.map(([offset, color]) => <stop key={offset} offset={offset} stopColor={color} />)}
              </linearGradient>
            ))}
          </defs>
          {(object as readonly Shape[]).map(({ tag, props }, index) => createElement(tag, {
            ...props,
            key: index,
            fill: paint(props.fill ?? "none", prefix),
            stroke: paint(props.stroke ?? "none", prefix),
            strokeLinejoin: "round",
          }))}
        </svg>
      )}
      <svg className="qg-icon-line" data-icon-variant="line" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === "more" ? 3 : 1.7} strokeLinecap="round" strokeLinejoin="round" focusable="false" aria-hidden="true">
        {linePaths[name].map((d) => <path key={d} d={d} />)}
      </svg>
    </span>
  );
}
