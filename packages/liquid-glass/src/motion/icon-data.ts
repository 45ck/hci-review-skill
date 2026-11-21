export const LIQUID_MORPH_PAIRS = [
  "play-pause", "menu-close", "plus-minus", "chevron", "volume-mute",
  "lock-unlock", "bookmark-saved", "eye-hidden", "expand-restore", "heart-saved",
] as const;

export const LIQUID_ICON_EFFECTS = [
  "draw", "ring", "lift", "spin", "pulse", "tilt", "bounce", "shake", "spark",
] as const;

export type LiquidMorphPair = typeof LIQUID_MORPH_PAIRS[number];
export type LiquidIconEffect = typeof LIQUID_ICON_EFFECTS[number];
export type LiquidMorphPart = {
  readonly from: string;
  readonly to: string;
  readonly solid?: boolean;
  readonly opacity?: readonly [number, number];
  readonly fillOpacity?: readonly [number, number];
};
export type LiquidMorphDefinition = {
  readonly label: string;
  readonly states: readonly [string, string];
  readonly useWhen: string;
  readonly parts: readonly LiquidMorphPart[];
};

// Original matched topology: interpolation changes geometry, not a crossfade between icons.
export const LIQUID_MORPH_DEFINITIONS: Readonly<Record<LiquidMorphPair, LiquidMorphDefinition>> = {
  "play-pause": {
    label: "Play / pause", states: ["paused", "playing"],
    useWhen: "Reflect accepted playback state on the host's media control.",
    parts: [
      { from: "M7 4 L12 7.08 L12 16.92 L7 20 Z", to: "M6 5 L10 5 L10 19 L6 19 Z", solid: true },
      { from: "M12 7.08 L20 12 L20 12 L12 16.92 Z", to: "M14 5 L18 5 L18 19 L14 19 Z", solid: true },
    ],
  },
  "menu-close": {
    label: "Menu / close", states: ["closed", "open"],
    useWhen: "Reflect the accepted open state of the adjacent SDK menu or drawer.",
    parts: [
      { from: "M5 7 L19 7", to: "M6 6 L18 18" },
      { from: "M5 12 L19 12", to: "M12 12 L12 12", opacity: [1, 0] },
      { from: "M5 17 L19 17", to: "M6 18 L18 6" },
    ],
  },
  "plus-minus": {
    label: "Plus / minus", states: ["collapsed", "expanded"],
    useWhen: "Reinforce an expandable group with its text and SDK expanded state.",
    parts: [
      { from: "M5 12 L19 12", to: "M5 12 L19 12" },
      { from: "M12 5 L12 19", to: "M12 12 L12 12", opacity: [1, 0] },
    ],
  },
  chevron: {
    label: "Disclosure", states: ["collapsed", "expanded"],
    useWhen: "Indicate disclosure direction beside an SDK accordion or collapsible trigger.",
    parts: [{ from: "M6 9 L12 15 L18 9", to: "M6 15 L12 9 L18 15" }],
  },
  "volume-mute": {
    label: "Sound / mute", states: ["audible", "muted"],
    useWhen: "Reflect accepted mute state without implying an audio action has completed.",
    parts: [
      { from: "M11 4 L6 8 L3 8 L3 16 L6 16 L11 20 Z", to: "M11 4 L6 8 L3 8 L3 16 L6 16 L11 20 Z" },
      { from: "M15 8 C17 10 17 14 15 16", to: "M15 9 C17 11 19 13 21 15" },
      { from: "M18 5 C23 9 23 15 18 19", to: "M21 9 C19 11 17 13 15 15" },
    ],
  },
  "lock-unlock": {
    label: "Lock / unlock", states: ["locked", "unlocked"],
    useWhen: "Reflect a host-confirmed lock state; the icon never grants permission.",
    parts: [
      { from: "M5 10 L19 10 L19 21 L5 21 Z", to: "M5 10 L19 10 L19 21 L5 21 Z" },
      { from: "M8 10 L8 7 C8 1.7 16 1.7 16 7 L16 10", to: "M8 10 L8 7 C8 1.7 17 1.7 17 7 L17 7" },
      { from: "M12 14 L12 17", to: "M12 14 L12 17" },
    ],
  },
  "bookmark-saved": {
    label: "Bookmark / saved", states: ["unsaved", "saved"],
    useWhen: "Confirm the host's accepted saved state beside a named bookmark control.",
    parts: [
      { from: "M6 3 L18 3 L18 21 L12 17 L6 21 Z", to: "M6 3 L18 3 L18 21 L12 17 L6 21 Z" },
      { from: "M11 11 L11 11 L11 11", to: "M8 11 L11 14 L16 8", opacity: [0, 1] },
    ],
  },
  "eye-hidden": {
    label: "Visible / hidden", states: ["visible", "hidden"],
    useWhen: "Reflect a host-controlled visibility choice; never expose secret content in metadata.",
    parts: [
      { from: "M2 12 C7 4 17 4 22 12 C17 20 7 20 2 12 Z", to: "M2 12 C7 5 17 5 22 12 C17 19 7 19 2 12 Z" },
      { from: "M15 12 C15 16 9 16 9 12 C9 8 15 8 15 12 Z", to: "M12 12 C12 12 12 12 12 12 C12 12 12 12 12 12 Z", opacity: [1, 0] },
      { from: "M12 12 L12 12", to: "M3 3 L21 21", opacity: [0, 1] },
    ],
  },
  "expand-restore": {
    label: "Expand / restore", states: ["contained", "expanded"],
    useWhen: "Reflect accepted detail or fullscreen expansion on the existing SDK control.",
    parts: [
      { from: "M3 9 L3 3 L9 3", to: "M9 3 L9 9 L3 9" },
      { from: "M15 3 L21 3 L21 9", to: "M21 9 L15 9 L15 3" },
      { from: "M21 15 L21 21 L15 21", to: "M15 21 L15 15 L21 15" },
      { from: "M9 21 L3 21 L3 15", to: "M3 15 L9 15 L9 21" },
    ],
  },
  "heart-saved": {
    label: "Favourite", states: ["unselected", "selected"],
    useWhen: "Reflect a favourite toggle while preserving its stable accessible name.",
    parts: [{
      from: "M12 21 C9 18 3 14 3 8 C3 2 9 2 12 6 C15 2 21 2 21 8 C21 14 15 18 12 21 Z",
      to: "M12 21 C8 18 2.5 13.5 2.5 8 C2.5 1.5 9.5 1.5 12 5.5 C14.5 1.5 21.5 1.5 21.5 8 C21.5 13.5 16 18 12 21 Z",
      solid: true, fillOpacity: [0, 1],
    }],
  },
};

type PathToken = string | number;
const PATH_COMMAND_ARITY: Record<string, number> = { M: 2, L: 2, C: 6, Q: 4, Z: 0 };

function parsePath(path: string): PathToken[] {
  const tokens = path.match(/[MLCQZ]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [];
  if (!tokens.length || path.replace(/[MLCQZ]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g, "").replace(/[\s,]/g, "")) {
    throw new TypeError("Morph paths require explicit absolute M, L, C, Q or Z commands.");
  }
  if (tokens[0] !== "M") throw new TypeError("A morph path must start with M.");
  const result: PathToken[] = [];
  for (let i = 0; i < tokens.length;) {
    const command = tokens[i++];
    const arity = PATH_COMMAND_ARITY[command];
    if (arity === undefined) throw new TypeError("Invalid morph path command.");
    result.push(command);
    for (let n = 0; n < arity; n++) {
      const value = Number(tokens[i++]);
      if (!Number.isFinite(value)) throw new TypeError("Morph coordinates must be finite and match command arity.");
      result.push(value);
    }
  }
  return result;
}

function preparePaths(from: string, to: string) {
  const a = parsePath(from);
  const b = parsePath(to);
  if (a.length !== b.length || a.some((part, i) => typeof part !== typeof b[i] || (typeof part === "string" && part !== b[i]))) {
    throw new TypeError("Morph paths must have the same command topology.");
  }
  return { a, b };
}

function interpolatePrepared(a: PathToken[], b: PathToken[], progress: number) {
  return a.map((value, i) => typeof value === "string" ? value : Number((value + ((b[i] as number) - value) * progress).toFixed(4))).join(" ");
}

export function interpolateLiquidIconPath(from: string, to: string, progress: number): string {
  if (!Number.isFinite(progress)) throw new TypeError("Morph progress must be finite.");
  const { a, b } = preparePaths(from, to);
  if (progress <= 0) return from;
  if (progress >= 1) return to;
  return interpolatePrepared(a, b, progress);
}

const preparedDefinitions = Object.fromEntries(LIQUID_MORPH_PAIRS.map(pair => [pair,
  LIQUID_MORPH_DEFINITIONS[pair].parts.map(part => ({ ...part, ...preparePaths(part.from, part.to) })),
])) as Record<LiquidMorphPair, (LiquidMorphPart & { a: PathToken[]; b: PathToken[] })[]>;

export function liquidMorphPaths(pair: LiquidMorphPair, progress: number) {
  if (!Number.isFinite(progress)) throw new TypeError("Morph progress must be finite.");
  if (!Object.hasOwn(preparedDefinitions, pair)) throw new TypeError("Unknown morph pair.");
  const t = Math.max(0, Math.min(1, progress));
  return preparedDefinitions[pair].map(part => ({
    d: t === 0 ? part.from : t === 1 ? part.to : interpolatePrepared(part.a, part.b, t),
    opacity: part.opacity ? part.opacity[0] + (part.opacity[1] - part.opacity[0]) * t : 1,
    fillOpacity: part.fillOpacity ? part.fillOpacity[0] + (part.fillOpacity[1] - part.fillOpacity[0]) * t : 1,
  }));
}
