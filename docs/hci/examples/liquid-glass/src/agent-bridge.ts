"use client";

import {
  createAgent,
  registerTools,
  type AgentAction,
} from "@ui-sdk/react/agent";

export type {
  AgentAction,
  AgentComponent,
  AgentStep,
  ObservedChange,
} from "@ui-sdk/react/agent";

export type GalleryAgent = ReturnType<typeof createAgent>;
export type GalleryAgentFacade = Readonly<
  Pick<GalleryAgent, "snapshot" | "query" | "act" | "subscribe">
>;

declare global {
  interface Window {
    readonly quantitativeHciAgent: GalleryAgentFacade;
  }
}

const allowDemoAction = (step: AgentAction) => !step.confirm;

// Reuse the page registry across hot updates; the SDK bridge has no destroy method.
export const galleryAgent: GalleryAgent =
  (import.meta.hot?.data.galleryAgent as GalleryAgent | undefined) ??
  createAgent({ allow: allowDemoAction });

export const hasWebMcp =
  typeof document !== "undefined" &&
  typeof (
    document as Document & {
      modelContext?: { registerTool?: unknown };
    }
  ).modelContext?.registerTool === "function";

const unregisterTools = hasWebMcp
  ? registerTools(galleryAgent, { allow: allowDemoAction })
  : () => {};

const facade: GalleryAgentFacade = Object.freeze({
  snapshot: galleryAgent.snapshot,
  query: galleryAgent.query,
  act: galleryAgent.act,
  subscribe: galleryAgent.subscribe,
});

if (typeof window !== "undefined") {
  Object.defineProperty(window, "quantitativeHciAgent", {
    value: facade,
    writable: false,
    configurable: Boolean(import.meta.hot),
  });
}

if (import.meta.hot) {
  import.meta.hot.dispose((data) => {
    data.galleryAgent = galleryAgent;
    unregisterTools();
    if (
      typeof window !== "undefined" &&
      window.quantitativeHciAgent === facade
    ) {
      Reflect.deleteProperty(window, "quantitativeHciAgent");
    }
  });
}
