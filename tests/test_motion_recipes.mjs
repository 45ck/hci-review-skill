import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

// Keep the real registry and selection code; only add Node's required JSON
// import attribute to the package's bundler-facing import.
const registryURL = new URL("../packages/liquid-glass/motion-recipes.json", import.meta.url);
const source = stripTypeScriptTypes(readFileSync(new URL("../packages/liquid-glass/src/motion/recipes.ts", import.meta.url), "utf8"))
  .replace(/from (["'])\.\.\/\.\.\/motion-recipes\.json\1/g, `from ${JSON.stringify(registryURL.href)} with { type: "json" }`);
const { liquidMotionRegistry, liquidMotionRecipes, findLiquidMotionRecipes, selectLiquidMotionRecipe } =
  await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

const select = (intent, target, options = {}) => selectLiquidMotionRecipe({ intent, target, ...options });

test("the agent registry has 42 uniquely addressable recipes and no ambiguous intent/target pair", () => {
  assert.equal(liquidMotionRegistry.schemaVersion, 1);
  assert.equal(liquidMotionRegistry.policy.unvalidated, true);
  assert.equal(liquidMotionRecipes.length, 42);
  assert.equal(new Set(liquidMotionRecipes.map(recipe => recipe.id)).size, 42);
  const addresses = new Set();
  for (const recipe of liquidMotionRecipes) {
    assert.ok(recipe.targets.length > 0, recipe.id);
    for (const target of recipe.targets) {
      const address = JSON.stringify([recipe.intent, target]);
      assert.ok(!addresses.has(address), `${recipe.id} collides at ${address}`);
      addresses.add(address);
      assert.equal(select(recipe.intent, target).recipe?.id, recipe.id);
    }
  }
});

test("selection requires both semantic intent and target, including shared menu targets", () => {
  assert.equal(select("state", "playback").recipe?.id, "icon.play-pause");
  assert.equal(select("state", "menu").recipe?.id, "icon.menu-close");
  assert.equal(select("presence", "menu").recipe?.id, "sdk.popup");
  assert.equal(select("feedback", "save").recipe?.id, "feedback.result");
  assert.equal(select("continuity", "task-history").recipe?.id, "collection.reflow");
  assert.equal(select("progress", "metric").recipe?.id, "data.number");
  for (const [intent, target] of [["progress", "playback"], ["state", "unknown"], ["missing-intent", "playback"], ["state", "Playback"], ["state", ""]]) {
    const result = select(intent, target);
    assert.equal(result.recipe, null);
    assert.equal(result.presentation, "none");
    assert.ok(result.reason.length > 0);
  }
});

test("no meaningful accepted change suppresses every recipe even when motion is otherwise allowed", () => {
  for (const recipe of liquidMotionRecipes) for (const reducedMotion of [false, true]) {
    const result = select(recipe.intent, recipe.targets[0], { meaningfulChange: false, reducedMotion });
    assert.equal(result.recipe, null, recipe.id);
    assert.equal(result.presentation, "none", recipe.id);
    assert.match(result.reason, /No accepted change/);
  }
});

test("reduced motion preserves the chosen meaning while presenting every endpoint instantly", () => {
  for (const recipe of liquidMotionRecipes) {
    const normal = select(recipe.intent, recipe.targets[0]);
    const reduced = select(recipe.intent, recipe.targets[0], { reducedMotion: true });
    assert.equal(normal.recipe?.id, recipe.id);
    assert.equal(normal.presentation, recipe.durationMs === 0 ? "instant" : "animate");
    assert.equal(reduced.recipe?.id, recipe.id);
    assert.equal(reduced.presentation, "instant");
    assert.match(reduced.reason, /endpoint immediately/);
  }
});

test("frequent attention effects are suppressed without hiding real state, feedback or continuity", () => {
  const attention = liquidMotionRecipes.filter(recipe => recipe.intent === "attention");
  assert.equal(attention.length, 9);
  for (const recipe of attention) {
    assert.equal(select(recipe.intent, recipe.targets[0]).presentation, "animate");
    const result = select(recipe.intent, recipe.targets[0], { frequent: true });
    assert.equal(result.recipe, null);
    assert.equal(result.presentation, "none");
    assert.match(result.reason, /Repeated decoration/);
  }
  for (const [intent, target, id] of [["state", "playback", "icon.play-pause"], ["feedback", "save", "feedback.result"], ["continuity", "list", "collection.reflow"]]) {
    const result = select(intent, target, { frequent: true });
    assert.equal(result.recipe?.id, id);
    assert.equal(result.presentation, "animate");
  }
});

test("zero-duration graph and asset bindings never promise a synthetic animation", () => {
  for (const [target, id, implementation] of [["workflow", "workflow.graph", "native"], ["state-machine", "workflow.graph", "native"], ["rive", "asset.binding", "host-adapter"], ["lottie", "asset.binding", "host-adapter"], ["r3f", "asset.binding", "host-adapter"]]) {
    const result = select("state", target);
    assert.equal(result.recipe?.id, id);
    assert.equal(result.recipe?.implementation, implementation);
    assert.equal(result.recipe?.durationMs, 0);
    assert.equal(result.presentation, "instant");
  }
});

test("recipe discovery searches all words, ignores case/spacing and returns actual matching records", () => {
  assert.deepEqual(findLiquidMotionRecipes("  PLAYBACK   state ").map(recipe => recipe.id), ["icon.play-pause"]);
  assert.deepEqual(findLiquidMotionRecipes("state PLAYBACK").map(recipe => recipe.id), ["icon.play-pause"]);
  assert.deepEqual(findLiquidMotionRecipes("playback progress"), []);
  assert.deepEqual(findLiquidMotionRecipes("a-target-that-is-not-in-this-catalogue"), []);
  assert.deepEqual(findLiquidMotionRecipes(" \n\t"), liquidMotionRecipes);
  for (const recipe of liquidMotionRecipes) {
    assert.ok(findLiquidMotionRecipes(recipe.id).includes(recipe), recipe.id);
    assert.ok(findLiquidMotionRecipes(`${recipe.component} ${recipe.targets[0]}`).includes(recipe), recipe.id);
  }
});

test("every recipe treats motion as presentation and retains explicit state and accessibility prerequisites", () => {
  for (const recipe of liquidMotionRecipes) {
    assert.equal(recipe.completionMeaning, "presentation-only", recipe.id);
    assert.equal(recipe.reducedMotion, "instant-final-state", recipe.id);
    assert.ok(Number.isFinite(recipe.durationMs) && recipe.durationMs >= 0, recipe.id);
    assert.ok(recipe.requires.includes("Authoritative component or host state"), recipe.id);
    assert.ok(recipe.requires.includes("Accessible text or named SDK control"), recipe.id);
    assert.ok(recipe.requires.includes("Stable identity and no moving hit target"), recipe.id);
    assert.ok(recipe.useWhen.length > 0 && recipe.avoidWhen.length > 0, recipe.id);
    assert.ok(recipe.sources.length > 0 && recipe.sources.every(source => new URL(source).protocol === "https:"), recipe.id);
  }
});
