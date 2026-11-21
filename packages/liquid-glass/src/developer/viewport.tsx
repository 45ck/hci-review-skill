"use client";

import { useId, useImperativeHandle, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { createParts, usePart, usePrimitive } from "@ui-sdk/react/primitive";
import { Button } from "@ui-sdk/react/button";
import { Toggle } from "@ui-sdk/react/toggle";
import { NumberInput, NumberInputControl, NumberInputGroup } from "@ui-sdk/react/number-input";
import { Dialog, DialogBackdrop, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@ui-sdk/react/dialog";
import type { CanvasRect, Viewport } from "@ui-sdk/core";
import { liquidViewport, type LiquidViewportChangeDetails } from "./viewport-primitive";
import { ValidationBadge } from "../validation";
import type { LiquidSurfaceIntent } from "../webgpu";

export type { CanvasRect, Viewport, LiquidViewportChangeDetails };

export interface LiquidViewportHandle {
  getViewport: () => Viewport;
  toCanvas: (clientX: number, clientY: number) => { x: number; y: number };
  fit: () => boolean;
  reveal: (rect: CanvasRect) => boolean;
  center: (rect: CanvasRect) => boolean;
  setViewport: (value: Viewport) => boolean;
  panBy: (x: number, y: number) => boolean;
  zoomTo: (zoom: number) => boolean;
}

export interface LiquidViewportProps {
  label: string;
  width: number;
  height: number;
  children: ReactNode;
  selectionRect?: CanvasRect | null;
  resetKey?: string;
  className?: string;
  worldClassName?: string;
  slotProps?: {
    controls?: { className?: string; style?: CSSProperties };
    canvas?: { className?: string; style?: CSSProperties };
    hint?: { className?: string; style?: CSSProperties };
    fullscreen?: {
      className?: string;
      style?: CSSProperties;
      "data-liquid-glass"?: "" | "off";
      "data-liquid-intent"?: LiquidSurfaceIntent;
    };
  };
  viewport?: Viewport;
  defaultViewport?: Viewport;
  onViewportChange?: (value: Viewport, details: LiquidViewportChangeDetails) => void;
  ref?: Ref<LiquidViewportHandle>;
}

const parts = createParts(liquidViewport, { controls: "div", surface: "div", world: "div" });

export function LiquidViewport({
  label, width, height, children, selectionRect, resetKey, className = "", worldClassName = "",
  viewport, defaultViewport, onViewportChange, ref, slotProps = {},
}: LiquidViewportProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedContent, setExpandedContent] = useState(false);
  const hintId = useId();
  const lowerLabel = label.toLowerCase();
  const handle = usePrimitive(liquidViewport, {
    width, height, resetKey, selectionRect, viewport, defaultViewport, onViewportChange, expanded,
    onExpandedChange(value) { setExpanded(value); if (value) setExpandedContent(true); },
  });
  useImperativeHandle(ref, () => ({
    getViewport: handle.api.getViewport,
    toCanvas: handle.api.viewport.toCanvas,
    fit: handle.api.fit,
    reveal: handle.api.reveal,
    center: handle.api.center,
    setViewport: handle.api.setViewport,
    panBy: handle.api.panBy,
    zoomTo: handle.api.zoomTo,
  }), [handle]);

  const body = <div className="qgv-body">
    <parts.Controls className={`qgv-controls ${slotProps.controls?.className ?? ""}`} style={slotProps.controls?.style}>
      {({ zoom, panMode }) => <>
        <div className="qgv-zoom-controls">
          <Button aria-label={`Zoom out ${lowerLabel}`} disabled={zoom <= 10} focusableWhenDisabled onClick={() => handle.api.zoomBy(1 / 1.25)}>−</Button>
          <NumberInput value={zoom} min={10} max={400} step={5} onValueChange={(value) => { if (value !== null) handle.api.zoomTo(value / 100); }}>
            <NumberInputGroup className="qgv-zoom-input">
              <NumberInputControl aria-label={`${label} zoom percent`} inputMode="numeric" />
              <span aria-hidden="true">%</span>
            </NumberInputGroup>
          </NumberInput>
          <Button aria-label={`Zoom in ${lowerLabel}`} disabled={zoom >= 400} focusableWhenDisabled onClick={() => handle.api.zoomBy(1.25)}>+</Button>
        </div>
        <div className="qgv-view-controls">
          <Button onClick={() => handle.api.fit()}>Fit {lowerLabel}</Button>
          <Button aria-label={`${label} actual size`} onClick={() => handle.api.actualSize()}>100%</Button>
          <Button aria-label={`${label} focus selection`} disabled={!selectionRect} focusableWhenDisabled onClick={() => handle.api.focusSelection()}>Focus selection</Button>
        </div>
        <div className="qgv-pan-controls">
          <Toggle aria-label={`Pan ${lowerLabel} tool`} pressed={panMode} onPressedChange={(value) => handle.api.setPanMode(value)}>Hand</Toggle>
          <Button aria-label={`Pan ${lowerLabel} left`} onClick={() => handle.api.panBy(-80, 0)}>←</Button>
          <Button aria-label={`Pan ${lowerLabel} up`} onClick={() => handle.api.panBy(0, -80)}>↑</Button>
          <Button aria-label={`Pan ${lowerLabel} down`} onClick={() => handle.api.panBy(0, 80)}>↓</Button>
          <Button aria-label={`Pan ${lowerLabel} right`} onClick={() => handle.api.panBy(80, 0)}>→</Button>
        </div>
      </>}
    </parts.Controls>
    <parts.Surface className={`qgv-surface ${slotProps.canvas?.className ?? ""}`} style={slotProps.canvas?.style} aria-label={`${label} canvas`} aria-describedby={hintId}>
      <parts.World className={`qgv-world ${worldClassName}`}>{children}</parts.World>
    </parts.Surface>
    <p className={`qgv-hint ${slotProps.hint?.className ?? ""}`} style={slotProps.hint?.style} id={hintId}>Drag empty space to pan. Scroll to move; pinch or Ctrl/⌘ + scroll to zoom. Focus the canvas for arrow keys, +/− zoom, 0 actual size and F fit. Hold Space or use Hand to move over elements.</p>
  </div>;

  return usePart(handle, "root", {}, {
    className: `qgv-viewport ${className}`,
    "aria-label": `${label} viewport`,
    children: <Dialog open={expanded} onOpenChange={(value) => handle.api.setExpanded(value)}
      onOpenChangeComplete={(value) => { if (!value) setExpandedContent(false); }}>
      <div className="qgv-expand-row">
        <DialogTrigger>Fullscreen {lowerLabel}</DialogTrigger>
      </div>
      {!expandedContent && body}
      <DialogBackdrop />
      <DialogContent className={`qgv-expanded ${slotProps.fullscreen?.className ?? ""}`} style={slotProps.fullscreen?.style} data-liquid-glass={slotProps.fullscreen?.["data-liquid-glass"]} data-liquid-intent={slotProps.fullscreen?.["data-liquid-intent"] ?? "reading"} initialFocus="content" keepMounted>
        <header className="qgv-expanded-heading">
          <div className="qgv-expanded-title"><DialogTitle>{label} fullscreen</DialogTitle><ValidationBadge /></div>
          <DialogClose aria-label={`Close fullscreen ${lowerLabel}`}>Close fullscreen</DialogClose>
        </header>
        {expandedContent && body}
      </DialogContent>
    </Dialog>,
  }, "div");
}
