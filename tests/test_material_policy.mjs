import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

const source = readFileSync(new URL("../packages/liquid-glass/src/webgpu/policy.ts", import.meta.url), "utf8");
const policyModule = `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`;
const { resolveLiquidMaterial, readLiquidTint, readLiquidEdgeOpacity } = await import(policyModule);
const surfaceSource = readFileSync(new URL("../packages/liquid-glass/src/webgpu/surfaces.ts", import.meta.url), "utf8").replace('from "./policy"', `from "${policyModule}"`);
const { getReadingFallbackReason } = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(surfaceSource)).toString("base64")}`);
const request = { theme: "system", material: "regular", increaseContrast: false, transparency: "system" };
const device = { dark: false, contrast: false, transparency: false, colours: false };

test("system theme follows the device while an explicit theme remains authoritative", () => {
  assert.equal(resolveLiquidMaterial(request, { ...device, dark: true }).theme, "dark");
  assert.equal(resolveLiquidMaterial({ ...request, theme: "light" }, { ...device, dark: true }).theme, "light");
  assert.equal(resolveLiquidMaterial({ ...request, theme: "dark" }, device).theme, "dark");
});

test("explicit Glass still opts into optics under reduced transparency for regular and clear", () => {
  for (const material of ["regular", "clear"]) {
    const result = resolveLiquidMaterial({ ...request, material, transparency: "glass" }, { ...device, transparency: true });
    assert.equal(result.material, material);
    assert.equal(result.reducedReason, null);
  }
  const followed = resolveLiquidMaterial(request, { ...device, transparency: true });
  assert.equal(followed.material, "solid");
  assert.equal(followed.reducedReason, "reduced-transparency");
});

test("solid material and the compatible Solid transparency choice agree", () => {
  for (const input of [{ ...request, material: "solid", transparency: "glass" }, { ...request, material: "clear", transparency: "solid" }]) {
    const result = resolveLiquidMaterial(input, device);
    assert.equal(result.material, "solid");
    assert.equal(result.reducedReason, "solid-choice");
  }
});

test("app and system contrast preserve the chosen theme and suppress optics despite Glass", () => {
  for (const theme of ["light", "dark"]) for (const viaApp of [true, false]) {
    const result = resolveLiquidMaterial({ ...request, theme, increaseContrast: viaApp, transparency: "glass" }, { ...device, contrast: !viaApp });
    assert.equal(result.theme, theme);
    assert.equal(result.contrast, "more");
    assert.equal(result.material, "solid");
    assert.equal(result.reducedReason, "increased-contrast");
  }
});

test("forced colours always wins and reports its actual reason", () => {
  const result = resolveLiquidMaterial({ ...request, material: "clear", transparency: "glass", increaseContrast: true }, { ...device, dark: true, colours: true, transparency: true, contrast: true });
  assert.deepEqual(result, { theme: "dark", material: "solid", contrast: "more", reducedReason: "forced-colors" });
});

test("changing a presentation preference leaves the caller-owned request and device records intact", () => {
  const input = Object.freeze({ ...request, material: "clear" });
  const system = Object.freeze({ ...device, transparency: true });
  resolveLiquidMaterial(input, system);
  assert.equal(input.material, "clear");
  assert.equal(input.transparency, "system");
  assert.equal(system.transparency, true);
  assert.equal(resolveLiquidMaterial(input, device).material, "clear");
});

test("GPU tint uses the supplied theme channels and clamps finite overrides", () => {
  assert.deepEqual(readLiquidTint("17 34 52", ".96"), [17 / 255, 34 / 255, 52 / 255, .96]);
  assert.deepEqual(readLiquidTint("300 -10 127.5", "2"), [1, 0, .5, 1]);
  assert.deepEqual(readLiquidTint("250 253 255", "-1"), [250 / 255, 253 / 255, 1, 0]);
});

test("malformed optical overrides do not upload NaN or substitute a bright popup tint", () => {
  for (const [rgb, opacity] of [["", ""], ["17 34", ".9"], ["17 NaN 52", ".9"], ["#112234", ".9"], ["17 34 52", ""], ["17 34 52", "Infinity"]]) {
    assert.deepEqual(readLiquidTint(rgb, opacity), [0, 0, 0, 0]);
  }
});

test("edge tint stays bounded by the face, and invalid overrides retain that face tint", () => {
  assert.equal(readLiquidEdgeOpacity(".22", .86), .22);
  assert.equal(readLiquidEdgeOpacity("2", .86), .86);
  assert.equal(readLiquidEdgeOpacity("-1", .86), 0);
  assert.equal(readLiquidEdgeOpacity(".22", 0), 0);
  for (const invalid of ["", " ", "NaN", "Infinity", ".2 .4", "20%"])
    assert.equal(readLiquidEdgeOpacity(invalid, .86), .86);
});

const node = (parentElement = null, dataset = {}) => ({ parentElement, dataset });

test("inline reading content and its covered controls select fallback without affecting siblings", () => {
  const plane = node(), reading = node(plane, { liquidIntent: "reading" });
  assert.equal(getReadingFallbackReason(reading, plane), "reading-surface");
  assert.equal(getReadingFallbackReason(node(node(reading)), plane), "reading-plane");
  assert.equal(getReadingFallbackReason(node(plane), plane), null);
  const legacy = node(plane, { liquidKind: "content" });
  assert.equal(getReadingFallbackReason(legacy, plane), "reading-surface");
  assert.equal(getReadingFallbackReason(node(legacy), plane), "reading-plane");
});

test("a local popup canvas paints above its own reading background and ignores ancestors outside its plane", () => {
  const outerReading = node(null, { liquidIntent: "reading" });
  const popup = node(outerReading, { liquidIntent: "reading" });
  assert.equal(getReadingFallbackReason(popup, popup), "reading-surface");
  assert.equal(getReadingFallbackReason(node(popup), popup), null);
  assert.equal(getReadingFallbackReason(node(node(popup)), popup), null);
  const overlay = node(outerReading);
  assert.equal(getReadingFallbackReason(overlay, overlay), null);
  assert.equal(getReadingFallbackReason(node(overlay), overlay), null);
});

test("nested reading panels occlude a popup canvas, while a nested top-layer popup gets its own plane", () => {
  const popup = node(), panel = node(popup, { liquidIntent: "reading" });
  const button = node(panel);
  assert.equal(getReadingFallbackReason(button, popup), "reading-plane");
  const nestedPopup = node(panel);
  assert.equal(getReadingFallbackReason(nestedPopup, nestedPopup), null);
  assert.equal(getReadingFallbackReason(node(nestedPopup), nestedPopup), null);
});

test("the viewport provider background is outside the content's occlusion boundary", () => {
  const outsideReading = node(null, { liquidIntent: "reading" });
  const plane = node(outsideReading, { liquidIntent: "reading" });
  assert.equal(getReadingFallbackReason(node(plane), plane), null);
});
