"use client";

import type { ReactNode } from "react";
import { createParts, usePart, usePrimitive } from "@ui-sdk/react/primitive";
import { Button } from "@ui-sdk/react/button";
import { liquidMotionState, type LiquidMotionStateOptions } from "./state";

const parts = createParts(liquidMotionState, { content: "div" });

export function LiquidMotionState({ label, className = "", children, ...options }: LiquidMotionStateOptions & {
  label: string;
  className?: string;
  children?: (value: string) => ReactNode;
}) {
  const handle = usePrimitive(liquidMotionState, options);
  return usePart(handle, "root", {}, {
    "aria-label": label, className: `qgm-state ${className}`.trim(),
    children: <parts.Content>{state => <>
      {children?.(state.value)}
      <output className="qgm-state-name" aria-label={`${label} current state`} aria-live="polite">{state.graph.states.find(item => item.id === state.value)?.label ?? state.value}</output>
      <div className="qgm-state-actions">
        {state.graph.transitions.filter(edge => edge.from === state.value).map(edge => <Button key={edge.event}
          disabled={state.disabled || state.readOnly} focusableWhenDisabled onClick={() => handle.api.send(edge.event, state.value)}>{edge.label}</Button>)}
      </div>
    </>}</parts.Content>,
  }, "section");
}
