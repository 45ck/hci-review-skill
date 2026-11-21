export type BackdropName = "coast" | "dawn" | "grid";

const palettes = {
  coast: {
    base: "#e4f0f8",
    upper: "#bfd9ef",
    lower: "#9dcfdf",
    wave: "#ead6c5",
    edge: "#69a9c7",
    line: "#effaff",
  },
  dawn: {
    base: "#f0e1dd",
    upper: "#d9c8e8",
    lower: "#d5a7a5",
    wave: "#f4d39c",
    edge: "#9b799b",
    line: "#fff5ea",
  },
  grid: {
    base: "#e4ebef",
    upper: "#d9e3eb",
    lower: "#8cabbd",
    wave: "#e4cbad",
    edge: "#597888",
    line: "#f7fcff",
  },
};

export function KitBackdrop({ variant }: { variant: BackdropName }) {
  const p = palettes[variant];
  return (
    <svg
      className="kit-wallpaper"
      data-backdrop={variant}
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="kit-sky" x1="0" x2="1" y1="0" y2="1">
          <stop stopColor={p.base} />
          <stop offset="1" stopColor={p.upper} />
        </linearGradient>
        <linearGradient id="kit-water" x1="0" x2="0.8" y1="0" y2="1">
          <stop stopColor={p.lower} />
          <stop offset="1" stopColor={p.edge} />
        </linearGradient>
        <linearGradient id="kit-sand" x1="0" x2="0" y1="0" y2="1">
          <stop stopColor={p.wave} />
          <stop offset="1" stopColor={p.base} />
        </linearGradient>
        <radialGradient id="kit-soft-light" cx=".23" cy=".13" r=".82">
          <stop stopColor="#ffffff" stopOpacity=".4" />
          <stop offset=".68" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <pattern
          id="kit-grid"
          width="64"
          height="64"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M64 0H0V64"
            fill="none"
            stroke={p.edge}
            strokeWidth="2"
            opacity=".45"
          />
          <rect
            x="0"
            y="0"
            width="32"
            height="32"
            fill={p.edge}
            opacity=".16"
          />
          <rect
            x="32"
            y="32"
            width="32"
            height="32"
            fill={p.edge}
            opacity=".16"
          />
        </pattern>
      </defs>
      <rect width="1600" height="1000" fill="url(#kit-sky)" />
      <path
        d="M-150 900C180 380 610 980 880 380S1390 40 1800-150V1100H-150Z"
        fill="url(#kit-water)"
      />
      <path
        d="M-100 1120C220 600 640 1110 910 560S1410 180 1750 50V1100Z"
        fill="url(#kit-sand)"
      />
      {Array.from({ length: 5 }, (_, i) => (
        <path
          key={i}
          d={
            "M-160 " +
            (610 + i * 45) +
            "C220 " +
            (125 + i * 45) +
            " 650 " +
            (910 + i * 45) +
            " 1000 " +
            (240 + i * 45) +
            "S1450 " +
            (-260 + i * 45) +
            " 1800 " +
            (-360 + i * 45)
          }
          fill="none"
          stroke={p.line}
          strokeWidth={i === 0 ? "2" : "1"}
          opacity={i === 0 ? ".36" : ".18"}
        />
      ))}
      <ellipse
        cx="130"
        cy="-100"
        rx="900"
        ry="570"
        fill="#ffffff"
        opacity=".21"
      />
      <rect width="1600" height="1000" fill="url(#kit-soft-light)" />
      {variant === "grid" && (
        <rect width="1600" height="1000" fill="url(#kit-grid)" />
      )}
    </svg>
  );
}
