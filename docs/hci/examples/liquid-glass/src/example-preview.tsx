import { lazy, Suspense, type ComponentType } from "react";
import { liquidComponentRecipes } from "@quantitative-hci/liquid-glass/recipes";

const sourceModules = import.meta.glob<string>("./recipes/*.tsx", { query: "?raw", import: "default", eager: true });
const previewModules = import.meta.glob<{ default: ComponentType }>("./recipes/*.tsx");
const previews = Object.fromEntries(Object.entries(previewModules).map(([path, load]) => [path, lazy(load)]));

export function exampleSource(id: string) {
  const recipe = liquidComponentRecipes.find(item => item.id === id);
  return recipe ? sourceModules[`./recipes/${recipe.example.split("/").at(-1)}`] : undefined;
}

export function ExamplePreview({ id }: { id: string }) {
  const recipe = liquidComponentRecipes.find(item => item.id === id);
  const Preview = recipe ? previews[`./recipes/${recipe.example.split("/").at(-1)}`] : undefined;
  if (!recipe || !Preview) return <main className="kit-embed-unavailable"><h1>Example unavailable</h1><p>Choose an example from the component library.</p><a href="?collection=examples" target="_top">Open examples</a></main>;
  return <div className="kit-example-document" data-example-document={id}>
    <Suspense fallback={<p role="status">Loading {recipe.title}…</p>}><Preview /></Suspense>
  </div>;
}
