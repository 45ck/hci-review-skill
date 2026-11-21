import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { transformSync } from "rolldown/utils";

const source = readFileSync(new URL("../packages/liquid-glass/src/motion/icon-data.ts", import.meta.url), "utf8");
const { LIQUID_MORPH_PAIRS, LIQUID_MORPH_DEFINITIONS, LIQUID_ICON_EFFECTS, interpolateLiquidIconPath, liquidMorphPaths } =
  await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`);

const packageRoot = new URL("../packages/liquid-glass/src/", import.meta.url).href;
const loader = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && context.parentURL?.startsWith(packageRoot)) {
      const candidate = new URL(specifier, context.parentURL);
      for (const suffix of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
        const url = `${candidate.href}${suffix}`;
        if (existsSync(fileURLToPath(url))) return { url, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith(packageRoot) && /\.(ts|tsx)$/.test(url)) {
      const path = fileURLToPath(url);
      const result = transformSync(path, readFileSync(path, "utf8"), { jsx: { runtime: "automatic" }, target: "es2022" });
      if (result.errors.length) throw result.errors[0];
      return { format: "module", shortCircuit: true, source: result.code };
    }
    return nextLoad(url, context);
  },
});
let LiquidGlassProvider, LiquidMorphIcon, LiquidAnimatedIcon;
try {
  ({ LiquidGlassProvider } = await import("../packages/liquid-glass/src/webgpu.tsx"));
  ({ LiquidMorphIcon, LiquidAnimatedIcon } = await import("../packages/liquid-glass/src/motion/icons.tsx"));
} finally {
  loader.deregister();
}

const numbers = path => (path.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? []).map(Number);
const commands = path => path.match(/[MLCQZ]/g);
const render = (component, props, iconSet = "line") => renderToStaticMarkup(createElement(LiquidGlassProvider,
  { motion: false, transparency: "solid", iconSet, backdrop: null }, createElement(component, props)));
const linePaths = html => {
  const line = html.match(/<svg[^>]*data-qgm-variant="line"[^>]*>(.*?)<\/svg>/s)?.[1];
  assert.ok(line, "server markup has a line fallback");
  return [...line.matchAll(/<path\s[^>]*>/g)].map(([path]) => ({
    d: path.match(/\sd="([^"]+)"/)?.[1],
    opacity: Number(path.match(/\sopacity="([^"]+)"/)?.[1]),
    fillOpacity: Number(path.match(/\sfill-opacity="([^"]+)"/)?.[1]),
  }));
};

test("the icon catalogue contains ten distinct semantic pairs and nine finite effect choices", () => {
  assert.deepEqual([...LIQUID_MORPH_PAIRS], ["play-pause", "menu-close", "plus-minus", "chevron", "volume-mute", "lock-unlock", "bookmark-saved", "eye-hidden", "expand-restore", "heart-saved"]);
  assert.deepEqual([...LIQUID_ICON_EFFECTS], ["draw", "ring", "lift", "spin", "pulse", "tilt", "bounce", "shake", "spark"]);
  assert.deepEqual(Object.keys(LIQUID_MORPH_DEFINITIONS), [...LIQUID_MORPH_PAIRS]);
  for (const definition of Object.values(LIQUID_MORPH_DEFINITIONS)) {
    assert.equal(definition.states.length, 2);
    assert.notEqual(definition.states[0], definition.states[1]);
    assert.ok(definition.useWhen.length > 20);
  }
});

test("every morph preserves exact endpoint paths and bounded opacity", () => {
  for (const pair of LIQUID_MORPH_PAIRS) {
    const definition = LIQUID_MORPH_DEFINITIONS[pair];
    const before = liquidMorphPaths(pair, 0), after = liquidMorphPaths(pair, 1);
    assert.equal(before.length, definition.parts.length);
    assert.equal(after.length, definition.parts.length);
    for (let i = 0; i < definition.parts.length; i++) {
      const part = definition.parts[i];
      assert.equal(before[i].d, part.from, `${pair} initial part ${i}`);
      assert.equal(after[i].d, part.to, `${pair} final part ${i}`);
      assert.equal(before[i].opacity, part.opacity?.[0] ?? 1);
      assert.equal(after[i].opacity, part.opacity?.[1] ?? 1);
      assert.equal(before[i].fillOpacity, part.fillOpacity?.[0] ?? 1);
      assert.equal(after[i].fillOpacity, part.fillOpacity?.[1] ?? 1);
    }
  }
});

test("intermediate geometry is finite, matched in topology and reversible for every pair", () => {
  for (const pair of LIQUID_MORPH_PAIRS) {
    assert.notDeepEqual(liquidMorphPaths(pair, .5), liquidMorphPaths(pair, 0), `${pair} has actual intermediate change`);
    for (const t of [.01, .1, .25, .5, .75, .9, .99]) {
      for (const [i, frame] of liquidMorphPaths(pair, t).entries()) {
        const part = LIQUID_MORPH_DEFINITIONS[pair].parts[i];
        const reversed = interpolateLiquidIconPath(part.to, part.from, 1 - t);
        assert.deepEqual(commands(frame.d), commands(part.from));
        assert.deepEqual(commands(frame.d), commands(part.to));
        assert.deepEqual(numbers(frame.d), numbers(reversed));
        assert.ok(numbers(frame.d).every(Number.isFinite));
        assert.ok(frame.opacity >= 0 && frame.opacity <= 1);
        assert.ok(frame.fillOpacity >= 0 && frame.fillOpacity <= 1);
      }
    }
  }
});

test("interpolation has independently known coordinates and clamps finite progress", () => {
  const from = "M0 0 L10 10", to = "M10 20 L20 30";
  assert.equal(interpolateLiquidIconPath(from, to, .5), "M 5 10 L 15 20");
  assert.equal(interpolateLiquidIconPath(from, to, -.2), from);
  assert.equal(interpolateLiquidIconPath(from, to, 4), to);
  assert.deepEqual(liquidMorphPaths("play-pause", -1), liquidMorphPaths("play-pause", 0));
  assert.deepEqual(liquidMorphPaths("play-pause", 3), liquidMorphPaths("play-pause", 1));
});

test("malformed topology, non-finite progress and unknown names cannot produce invalid SVG", () => {
  for (const bad of [NaN, Infinity, -Infinity, undefined, null, "0.5", {}]) {
    assert.throws(() => liquidMorphPaths("play-pause", bad), /finite/);
    assert.throws(() => interpolateLiquidIconPath("M0 0 L1 1", "M1 1 L2 2", bad), /finite/);
  }
  for (const bad of ["", "unknown", "__proto__", "constructor", null]) assert.throws(() => liquidMorphPaths(bad, .5), /Unknown/);
  assert.throws(() => interpolateLiquidIconPath("M0 0 L1 1", "M0 0 Q1 1 2 2", .5), /topology/);
  assert.throws(() => interpolateLiquidIconPath("M0 0 L1 1", "M0 0", .5), /topology/);
  for (const bad of ["", "L1 1", "M0", "M0 0 L1", "M0 0 A1 1 0 0 0 1 1", "M0 0 <script>", "M1e999 0 L1 1"]) {
    assert.throws(() => interpolateLiquidIconPath(bad, "M0 0 L1 1", .5), TypeError);
  }
});

test("rendering accepted active state emits its endpoint immediately without an animation phase", () => {
  for (const pair of LIQUID_MORPH_PAIRS) for (const active of [false, true]) {
    const html = render(LiquidMorphIcon, { pair, active });
    assert.deepEqual(linePaths(html), liquidMorphPaths(pair, active ? 1 : 0), `${pair} active=${active}`);
    assert.match(html, new RegExp(`data-motion-active="${active}"`));
    assert.doesNotMatch(html, /data-motion-status="running"|tabindex|role="button"/);
    assert.match(html, /class="qgm-morph-icon" aria-hidden="true"/);
  }
});

test("initial media geometry is a filled triangle or two separate pause bars, not overlapping icons", () => {
  const play = linePaths(render(LiquidMorphIcon, { pair: "play-pause", active: false }));
  const pause = linePaths(render(LiquidMorphIcon, { pair: "play-pause", active: true }));
  assert.equal(play.length, 2);
  assert.equal(pause.length, 2);
  assert.deepEqual(numbers(play[0].d).slice(0, 2), [7, 4]);
  assert.ok(play[1].d.includes("L20 12"), "both triangle parts meet at the play tip");
  assert.deepEqual(numbers(pause[0].d), [6, 5, 10, 5, 10, 19, 6, 19]);
  assert.deepEqual(numbers(pause[1].d), [14, 5, 18, 5, 18, 19, 14, 19]);
  assert.ok([...play, ...pause].every(part => part.opacity === 1));
});

test("appearance changes retain accepted geometry and small controls keep a line fallback", () => {
  const iso = render(LiquidMorphIcon, { pair: "bookmark-saved", active: true, size: 40 }, "isometric");
  assert.match(iso, /data-icon-style="isometric"/);
  assert.deepEqual(linePaths(iso), liquidMorphPaths("bookmark-saved", 1));
  const small = render(LiquidMorphIcon, { pair: "bookmark-saved", active: true, size: 16 }, "isometric");
  assert.match(small, /data-icon-style="line"/);
  assert.deepEqual(linePaths(small), linePaths(iso));
  assert.equal(linePaths(render(LiquidMorphIcon, { pair: "heart-saved", active: false }))[0].fillOpacity, 0);
  assert.equal(linePaths(render(LiquidMorphIcon, { pair: "heart-saved", active: true }))[0].fillOpacity, 1);
});

test("finite effects render the existing LiquidIcon artwork and add no independent control", () => {
  const names = ["layers", "folder", "grid", "settings", "bell", "volume", "bookmark", "sparkles", "activity", "code", "copy", "inbox", "plus", "check", "search", "more", "reset"];
  for (const name of names) {
    const html = render(LiquidAnimatedIcon, { name, effect: "lift", trigger: "state", active: true, revision: 3 });
    assert.match(html, new RegExp(`data-liquid-icon="${name}"`));
    assert.match(html, /class="qgm-animated-icon" aria-hidden="true"/);
    assert.doesNotMatch(html, /data-motion-status="running"|tabindex|role="button"/);
  }
});
