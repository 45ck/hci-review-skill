"use client";

import { useImperativeHandle, useMemo, useState, type ReactNode, type Ref } from "react";
import { usePart, usePrimitive } from "@ui-sdk/react/primitive";
import { modelDocumentSnapshot } from "./document";
import { liquidModelDocument, type ModelDocumentRenderContext } from "./primitive";
import type { ModelActionResult, ModelDocument, ModelDocumentChangeDetails, ModelDocumentContext, ModelDocumentHandle } from "./types";

export interface LiquidModelDocumentProps extends ModelDocumentContext {
  label: string;
  document?: ModelDocument;
  defaultDocument?: ModelDocument;
  onDocumentChange?: (document: ModelDocument, details: ModelDocumentChangeDetails) => void;
  onResult?: (result: ModelActionResult) => void;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  children: ReactNode | ((context: ModelDocumentRenderContext) => ReactNode);
  ref?: Ref<ModelDocumentHandle>;
}

export function LiquidModelDocument({ label, document, defaultDocument, onDocumentChange, onResult,
  disabled = false, readOnly = false, models, validateModel, className, children, ref }: LiquidModelDocumentProps) {
  const [internal, setInternal] = useState(() => {
    const initial = document ?? defaultDocument;
    if (!initial) throw new Error("LiquidModelDocument needs document or defaultDocument.");
    return initial;
  });
  const current = document ?? internal;
  const value = useMemo(() => modelDocumentSnapshot(current), [current]);
  const handle = usePrimitive(liquidModelDocument, { document: current, value, disabled,
    readOnly: readOnly || (document !== undefined && !onDocumentChange), models, validateModel, onResult,
    onValueChange(_snapshot, details) {
      onDocumentChange?.(details.proposedDocument, details);
      if (!details.canceled && document === undefined) setInternal(details.proposedDocument);
      if (document !== undefined && !onDocumentChange) details.cancel();
    },
  });
  useImperativeHandle(ref, () => ({ inspect: handle.api.inspect, preview: handle.api.preview,
    applyTransaction: handle.api.applyTransaction, undo: handle.api.undo, redo: handle.api.redo, select: handle.api.select }), [handle]);
  return usePart(handle, "root", {}, { className, "aria-label": label,
    children: (state: ModelDocumentRenderContext) => typeof children === "function" ? children(state) : children,
  }, "div");
}
