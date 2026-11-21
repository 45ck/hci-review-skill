import registry from "../component-recipes.json";

export const liquidComponentRegistry = registry;
export const liquidComponentRecipes = registry.recipes;
export type LiquidComponentRecipe = (typeof liquidComponentRecipes)[number];

export function findLiquidRecipes(query: string) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return liquidComponentRecipes.filter(recipe => {
    const text = [recipe.id, recipe.collection, recipe.title, recipe.purpose, ...recipe.components].join(" ").toLowerCase();
    return terms.every(term => text.includes(term));
  });
}
