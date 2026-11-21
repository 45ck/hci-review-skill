import { useEffect, useState } from "react";
import { Button } from "@ui-sdk/react/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@ui-sdk/react/collapsible";
import { Tabs, TabsList, TabsPanel, TabsTab, TabsIndicator } from "@ui-sdk/react/tabs";
import { ChevronDown } from "lucide-react";
import { liquidComponentRegistry, liquidComponentRecipes } from "@quantitative-hci/liquid-glass/recipes";
import { exampleSource } from "./example-preview";

export function RecipePanel({ collection, onNavigate }: { collection: string; onNavigate?: (id: string) => void }) {
  const [result, setResult] = useState("");
  useEffect(() => setResult(""), [collection]);
  const recipes = liquidComponentRecipes.filter(recipe => recipe.collection === collection);
  if (!recipes.length) return null;
  const copy = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setResult(message);
    } catch {
      setResult("Clipboard unavailable. Select the example below to copy it.");
    }
  };
  return (
    <section className="kit-recipe-panel" aria-label={`${collection} recipes`} data-liquid-glass="off">
      {onNavigate && <div className="kit-recipe-links">{recipes.map(recipe => <Button key={recipe.id} onClick={() => onNavigate(`example:${recipe.id}`)}>Try {recipe.title}</Button>)}</div>}
      <Collapsible>
        <CollapsibleTrigger>Use these components in a project <ChevronDown size={18} aria-hidden="true" /></CollapsibleTrigger>
        <CollapsiblePanel>
          <p>Copy a complete example or give your agent the composition brief. These examples compile against this kit.</p>
          <Tabs key={collection} defaultValue={recipes[0].id} onValueChange={() => setResult("")}>
            <TabsList aria-label="Component recipes">
              {recipes.map(recipe => <TabsTab key={recipe.id} value={recipe.id}>{recipe.title}</TabsTab>)}
              <TabsIndicator />
            </TabsList>
            {recipes.map(recipe => <TabsPanel key={recipe.id} value={recipe.id}>
              <p>{recipe.purpose}</p>
              <div className="kit-recipe-actions">
                <Button disabled={!exampleSource(recipe.id)} onClick={() => copy(exampleSource(recipe.id) ?? "", `${recipe.title} example copied`)}>Copy example</Button>
                <Button disabled={!exampleSource(recipe.id)} onClick={() => copy(JSON.stringify({ ...recipe, foundation: liquidComponentRegistry.foundation, distribution: liquidComponentRegistry.distribution, policy: liquidComponentRegistry.policy, exampleSource: exampleSource(recipe.id) }, null, 2), `${recipe.title} agent brief copied`)}>Copy agent brief</Button>
                <a href="/registry/components.json" target="_blank" rel="noreferrer">Component registry</a>
                <a href="/llms.txt" target="_blank" rel="noreferrer">Agent guide</a>
              </div>
              <pre tabIndex={0} aria-label={`${recipe.title} source`}><code>{exampleSource(recipe.id)}</code></pre>
            </TabsPanel>)}
          </Tabs>
          <output className="kit-recipe-result" aria-live="polite">{result}</output>
        </CollapsiblePanel>
      </Collapsible>
    </section>
  );
}
