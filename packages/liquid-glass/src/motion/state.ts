import { createChange, definePrimitive, type ChangeDetails } from "@ui-sdk/core";

export type LiquidMotionGraph = {
  id: string;
  initial: string;
  states: readonly { id: string; label: string }[];
  transitions: readonly { from: string; event: string; to: string; label: string }[];
};
export type LiquidMotionStateChangeDetails = ChangeDetails<"motion-event">;
export type LiquidMotionStateOptions = {
  graph: LiquidMotionGraph;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  readOnly?: boolean;
  onValueChange?: (value: string, details: LiquidMotionStateChangeDetails) => void;
};

export function validateLiquidMotionGraph(graph: LiquidMotionGraph): readonly string[] {
  const errors: string[] = [];
  const text = (value: unknown) => typeof value === "string" && value.trim().length > 0 && value.length <= 120;
  if (!graph || typeof graph !== "object" || !text(graph.id) || !Array.isArray(graph.states) || !Array.isArray(graph.transitions)) return ["A named graph, states and transitions are required."];
  if (!graph.states.length || graph.states.length > 64 || graph.transitions.length > 256) errors.push("A graph supports 1–64 states and at most 256 transitions.");
  const ids = new Set<string>();
  for (const state of graph.states) {
    if (!state || !text(state.id) || !text(state.label) || ids.has(state.id)) errors.push("State IDs and labels must be nonempty; IDs must be unique.");
    else ids.add(state.id);
  }
  if (!ids.has(graph.initial)) errors.push("The initial state must exist.");
  const events = new Set<string>();
  for (const edge of graph.transitions) {
    if (!edge || !ids.has(edge.from) || !ids.has(edge.to) || !text(edge.event) || !text(edge.label)) { errors.push("Every transition must connect existing states and name its event and label."); continue; }
    const key = JSON.stringify([edge.from, edge.event]);
    if (events.has(key)) errors.push("An event must have one target from a given state.");
    events.add(key);
  }
  return errors;
}

const validGraph = (graph: LiquidMotionGraph) => {
  const errors = validateLiquidMotionGraph(graph);
  if (errors.length) throw new Error(errors.join(" "));
  return graph;
};
const validValue = (graph: LiquidMotionGraph, value?: string) => graph.states.some(state => state.id === value) ? value! : graph.initial;

export const liquidMotionState = definePrimitive({
  name: "liquid-motion-state",
  options: { graph: "value", value: "string", defaultValue: "string", disabled: "boolean", readOnly: "boolean", onValueChange: "callback" },
  controlled: ["value"],
  state: (options: LiquidMotionStateOptions) => ({
    graph: validGraph(options.graph), value: validValue(options.graph, options.value ?? options.defaultValue),
    disabled: options.disabled ?? false, readOnly: options.readOnly ?? false,
  }),
  sync: options => ({ graph: validGraph(options.graph), disabled: options.disabled ?? false, readOnly: options.readOnly ?? false,
    ...(options.value !== undefined ? { value: validValue(options.graph, options.value) } : {}),
  }),
  api: context => {
    const change = createChange(context);
    context.onOptions(options => {
      const graph = validGraph(options.graph);
      const value = context.store.get().value;
      if (!graph.states.some(state => state.id === value) && options.value === undefined) context.store.set({
        graph, value: graph.initial, disabled: options.disabled ?? false, readOnly: options.readOnly ?? false,
      });
    });
    return {
      send(event: string, expectedState: string) {
        const state = context.store.get();
        if (typeof event !== "string" || !event.trim() || event.length > 120 || typeof expectedState !== "string" || expectedState !== state.value || state.disabled || state.readOnly) return false;
        const edge = state.graph.transitions.find(item => item.from === state.value && item.event === event);
        return Boolean(edge && change("value", edge.to, { reason: "motion-event" }));
      },
      getEvents: () => context.store.get().graph.transitions.filter(edge => edge.from === context.store.get().value).map(edge => ({ value: edge.event, label: edge.label })),
    };
  },
  slots: slot => ({
    root: slot({
      role: "region",
      attrs: state => ({ "data-motion-state": state.value, "data-motion-graph": state.graph.id, "data-readonly": state.readOnly ? "" : undefined, "data-disabled": state.disabled ? "" : undefined, "data-validation": "unvalidated" }),
    }),
    content: slot<{}, { value: string; graph: LiquidMotionGraph; disabled: boolean; readOnly: boolean }>({ state: state => state }),
  }),
  agent: { actions: ["send"], items: api => api.getEvents() },
});
