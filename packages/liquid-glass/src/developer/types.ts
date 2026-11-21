export interface DiagramPoint {
  x: number;
  y: number;
}

export interface DiagramCompartment {
  label?: string;
  entries: string[];
}

export interface DiagramNode {
  id: string;
  name: string;
  kind: "class" | "component" | "interface" | "uwe";
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  stereotype?: string;
  abstract?: boolean;
  compartments?: DiagramCompartment[];
  constraints?: string[];
  parentId?: string;
  multiplicity?: string;
}

export type DiagramEdgeKind =
  | "association"
  | "composition"
  | "aggregation"
  | "generalization"
  | "dependency"
  | "realization"
  | "navigationLink"
  | "processLink";

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  kind: DiagramEdgeKind;
  label?: string;
  description: string;
  sourceSide?: "top" | "right" | "bottom" | "left";
  targetSide?: "top" | "right" | "bottom" | "left";
  sourceOffset?: number;
  targetOffset?: number;
  waypoints?: DiagramPoint[];
  labelPosition?: DiagramPoint;
  sourceMultiplicity?: string;
  targetMultiplicity?: string;
  directed?: boolean;
}

export interface DiagramModel {
  id: string;
  name: string;
  notation: "UML class" | "UML component" | "UWE navigation" | "UWE presentation";
  description: string;
  width: number;
  height: number;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface DiagramSelectionDetails {
  source: string;
  reason: "node-press" | "element-select";
}

export interface LiquidDiagramProps {
  model: DiagramModel;
  selectedId?: string;
  onSelectionChange?: (nodeId: string, details: DiagramSelectionDetails) => void;
  className?: string;
}
