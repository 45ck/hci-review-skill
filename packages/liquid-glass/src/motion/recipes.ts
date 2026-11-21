import registry from "../../motion-recipes.json";

export const liquidMotionRegistry = registry;
export const liquidMotionRecipes = registry.recipes;
export type LiquidMotionRecipe = (typeof liquidMotionRecipes)[number];
export type LiquidMotionIntent = "state" | "feedback" | "continuity" | "presence" | "progress" | "attention";

export function findLiquidMotionRecipes(query: string): LiquidMotionRecipe[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return liquidMotionRecipes.filter(recipe => {
    const text = [recipe.id, recipe.title, recipe.intent, recipe.component, ...recipe.targets, ...recipe.useWhen].join(" ").toLowerCase();
    return words.every(word => text.includes(word));
  });
}

export function selectLiquidMotionRecipe({ intent, target, meaningfulChange = true, reducedMotion = false, frequent = false }: {
  intent: LiquidMotionIntent; target: string; meaningfulChange?: boolean; reducedMotion?: boolean; frequent?: boolean;
}): { recipe: LiquidMotionRecipe | null; presentation: "animate" | "instant" | "none"; reason: string } {
  if (!meaningfulChange) return { recipe: null, presentation: "none", reason: "No accepted change needs explanation." };
  if (intent === "attention" && frequent) return { recipe: null, presentation: "none", reason: "Repeated decoration would compete with the task." };
  const recipe = liquidMotionRecipes.find(item => item.intent === intent && item.targets.includes(target)) ?? null;
  if (!recipe) return { recipe: null, presentation: "none", reason: "No registered recipe fits this intent and target; retain the existing component state." };
  return { recipe, presentation: reducedMotion || recipe.durationMs === 0 ? "instant" : "animate",
    reason: reducedMotion ? "Show the accepted endpoint immediately under the effective motion preference." : recipe.useWhen[0] };
}
