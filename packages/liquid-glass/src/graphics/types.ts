export type GraphicLayerKind = "image" | "text" | "shape";

export interface GraphicAsset {
  id: string;
  name: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  provenance?: string;
}

export interface GraphicLayerBase {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
}

export interface GraphicImageLayer extends GraphicLayerBase {
  kind: "image";
  assetId: string;
  fit: "cover" | "contain";
  radius: number;
}

export interface GraphicTextLayer extends GraphicLayerBase {
  kind: "text";
  text: string;
  fontSize: number;
  fontFamily: "sans-serif" | "serif" | "monospace";
  fontWeight: 400 | 600 | 700;
  fill: string;
  align: "left" | "center" | "right";
}

export interface GraphicShapeLayer extends GraphicLayerBase {
  kind: "shape";
  shape: "rectangle" | "ellipse";
  fill: string;
  radius: number;
}

export type GraphicLayer = GraphicImageLayer | GraphicTextLayer | GraphicShapeLayer;

export interface GraphicDocument {
  schemaVersion: 1;
  id: string;
  name: string;
  revision: number;
  width: number;
  height: number;
  background: string;
  layers: GraphicLayer[];
}

export interface GraphicVariant {
  id: string;
  name: string;
  document: GraphicDocument;
}

export interface GraphicChangeDetails {
  reason: "properties" | "move" | "resize" | "add" | "duplicate" | "delete" | "reorder" | "visibility" | "lock" | "artboard" | "undo" | "redo" | "variant" | "json" | "image-import";
  layerId?: string;
}

export interface GraphicAgentContext {
  schemaVersion: 1;
  operation: "compose" | "edit-image";
  baseRevision: number;
  brief: string;
  selectedLayerId: string | null;
  document: GraphicDocument;
  assets: Array<Omit<GraphicAsset, "src"> & { source: string }>;
  instructions: string[];
}
