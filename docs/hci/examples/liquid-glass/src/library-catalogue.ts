import foundation from "../../../../../packages/liquid-glass/component-manifest.json";
import custom from "../../../../../packages/liquid-glass/custom-component-manifest.json";
import contracts from "../../../../../packages/liquid-glass/agent-contracts.json";
import { liquidComponentRecipes } from "@quantitative-hci/liquid-glass/recipes";
import type { LiquidIconName } from "@quantitative-hci/liquid-glass/icons";

type ManifestItem = { id: string; name: string; category: string; exportPath?: string };
type Contract = {
  id: string; kind: string; purpose: string; inputs: string[]; state: string[];
  restrictions: string[]; useWhen: string[]; docs: string[]; sources: string[];
  exports: { path: string; symbols: string[] }[];
  runtime: { discovery: string; mutationPath: string; outcome: string; actions: string[] };
};

const tasks: Record<string, string> = {
  button: "Run an action, with pending and disabled states.", toggle: "Keep an action visibly on or off.", toolbar: "Group related actions with one keyboard entry point.",
  "segmented-control": "Switch between a few visible choices.", input: "Enter and edit a short text value.", textarea: "Write prompts, notes and longer messages.",
  field: "Connect a control with its label, help and errors.", label: "Give a control a visible, accessible name.", checkbox: "Choose independent options or selected records.",
  switch: "Change a setting immediately.", radio: "Choose exactly one option from a visible group.", select: "Choose from a compact list of options.",
  slider: "Adjust a value or range with pointer or keyboard.", "number-input": "Enter and step through a numeric value.", "password-input": "Enter a secret with controlled reveal.",
  "otp-input": "Enter a one-time verification code.", "file-input": "Select, drop or paste files through the browser.", combobox: "Search a list and choose an item.",
  autocomplete: "Enter text with suggested completions.", "token-input": "Combine text with removable tokens.", listbox: "Choose from an always-visible list.",
  rating: "Choose a score on a bounded scale.", dialog: "Complete a focused task in a modal.", "alert-dialog": "Review and confirm a consequential action.",
  drawer: "Open a panel from the edge of the interface.", popover: "Inspect or edit beside a trigger.", "hover-card": "Preview supporting content beside a link.",
  tooltip: "Show a short hint for an existing control.", menu: "Choose an action from a button or right-click menu.", menubar: "Organise application commands in menus.",
  command: "Search and run named commands.", "trigger-menu": "Open suggestions while typing a trigger such as @.", toast: "Announce a recent result without blocking work.",
  tabs: "Switch between related content panels.", "navigation-menu": "Browse site sections and navigation panels.", pagination: "Move between pages of results.",
  tree: "Browse and select a hierarchy.", accordion: "Expand related sections independently.", collapsible: "Show or hide one supporting section.",
  calendar: "Choose dates from a month grid.", "date-input": "Enter a date by its individual parts.", "date-picker": "Choose a date with a field and calendar.",
  "time-input": "Enter a time using bounded parts.", "color-picker": "Choose and adjust a colour.", avatar: "Show a person or a meaningful fallback.",
  carousel: "Move through a sequence of slides.", "image-cropper": "Select and adjust an image crop.", meter: "Show a measured value within a known range.",
  progress: "Show how far a task has progressed.", resizable: "Adjust the space between panels.", "scroll-area": "Scroll overflowing content with consistent controls.",
  separator: "Divide related groups with a semantic boundary.", timeline: "Inspect events in their temporal order.", waterfall: "Compare spans and request timings.",
  preferences: "Read the device's motion, colour and contrast preferences.",
};

const collectionsByCategory: Record<string, string> = {
  Patterns: "patterns", Assistant: "assistant", Chat: "chat", "App layouts": "layouts", Interactions: "interactions", Sections: "sections",
  Graphics: "visual", Standards: "standards", Agents: "agents", "Shared canvas": "standards", "Shared modeling": "standards",
  Appearance: "overview", Demo: "overview",
};
export const collectionLabels: Record<string, string> = {
  patterns: "Saved work", assistant: "Prompt composer", chat: "Chat workspace", layouts: "App layouts", interactions: "Cursors and context actions",
  sections: "Showcase and story sections", visual: "Graphics studio", standards: "Standards workbench", agents: "Agent task review", overview: "Overview",
};
const categoryIcons: Record<string, LiquidIconName> = {
  Patterns: "folder", Assistant: "sparkles", Chat: "sparkles", "App layouts": "layers", Interactions: "activity", Sections: "layers", Graphics: "grid",
  Standards: "grid", Agents: "activity", "Shared canvas": "grid", "Shared modeling": "layers", Appearance: "settings", Demo: "grid",
  Actions: "sparkles", Inputs: "code", Overlays: "layers", Navigation: "folder", "Date & colour": "settings", Display: "grid",
};

export type LibraryComponent = {
  id: string; route: string; name: string; title: string; category: string; foundation: boolean; purpose: string;
  importLine: string; collection: string; icon: LiquidIconName; contract?: Contract; recipeIds: string[];
  graphicsView?: "images";
};
export type LibraryNavigationOptions = { graphicsView?: "canvas" | "images" };

const entries = contracts.entries as Contract[];
export const libraryComponents: LibraryComponent[] = [
  ...foundation.components.map(item => ({
    id: item.id, route: item.id, name: item.name, title: item.name, category: item.category, foundation: true,
    purpose: tasks[item.id] ?? `Use the ${item.name} SDK component.`,
    importLine: `import { ${item.name.replaceAll(" ", "")} } from "@ui-sdk/react/${item.id}";`,
    collection: item.id, icon: categoryIcons[item.category] ?? "grid", contract: entries.find(entry => entry.id === `sdk-${item.id}`), recipeIds: [],
  })),
  ...(custom.components as ManifestItem[]).map(item => {
    const contract = entries.find(entry => entry.id === item.id) ?? entries.find(entry => entry.exports.some(binding => binding.symbols.includes(item.name)));
    const binding = contract?.exports.find(entry => entry.path === item.exportPath) ?? contract?.exports[0];
    const symbol = binding?.symbols.find(name => name === item.name) ?? binding?.symbols.find(name => name[0] === name[0]?.toUpperCase());
    return {
      id: item.id, route: `custom:${item.id}`, name: item.name,
      title: item.name.replace(/^Liquid(?=[A-Z])/, "").replace(/([a-z])([A-Z])/g, "$1 $2"), category: item.category, foundation: false,
      purpose: contract?.purpose ?? "Working gallery compositions built from the shared kit.",
      importLine: symbol && binding ? `import { ${symbol} } from "${binding.path}";` : "Gallery example; no standalone package export.",
      collection: collectionsByCategory[item.category] ?? "chat", icon: categoryIcons[item.category] ?? "grid", contract,
      ...(["image-card", "media-gallery", "image-comparison"].includes(item.id) ? { graphicsView: "images" as const } : {}),
      recipeIds: liquidComponentRecipes.filter(recipe => recipe.components.includes(item.name)).map(recipe => recipe.id),
    };
  }),
];

export const libraryCounts = {
  foundation: foundation.components.length,
  custom: custom.components.length,
  examples: liquidComponentRecipes.length,
};

export function matchesLibrarySearch(item: Pick<LibraryComponent, "name" | "title" | "category" | "purpose">, query: string) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const haystack = `${item.name} ${item.title} ${item.category} ${item.purpose}`.toLowerCase();
  return terms.every(term => haystack.includes(term));
}

export function isLibraryRoute(id: string) {
  return ["overview", "catalogue", "examples", "integrations", "chat", ...Object.keys(collectionLabels)].includes(id)
    || libraryComponents.some(component => component.route === id)
    || liquidComponentRecipes.some(recipe => `example:${recipe.id}` === id);
}
