export interface DiagramPoint {
  x: number;
  y: number;
}

export interface DiagramCompartment {
  label?: string;
  entries: string[];
}

export const DIAGRAM_NODE_KINDS = [
  "class", "component", "interface", "uwe", "object", "package", "device", "artifact",
  "actor", "useCase", "activity", "decision", "initial", "final", "fork", "state",
  "lifeline", "interaction", "timing", "port", "task", "startEvent", "endEvent", "gateway",
  "pool", "dmnDecision", "inputData", "businessKnowledge", "knowledgeSource",
  "casePlan", "stage", "milestone", "eventListener", "criterion", "role", "valueProposition", "table", "ifmlAction", "ifmlEvent",
  "part", "merge", "ifmlViewContainer", "ifmlViewComponent", "planningTable",
  "comment", "objectNode", "c4Person", "c4Element", "c4Boundary", "c4Database", "c4Deployment",
] as const;
export type DiagramNodeKind = typeof DIAGRAM_NODE_KINDS[number];

export interface DiagramTable {
  columns: string[];
  rows: string[][];
  hitPolicy?: string;
  inputColumnCount?: number;
}

export interface DiagramNode {
  id: string;
  name: string;
  kind: DiagramNodeKind;
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
  ownerId?: string;
  multiplicity?: string;
  marker?: string;
  discretionary?: boolean;
  activations?: { y: number; height: number }[];
  table?: DiagramTable;
  entityId?: string;
  references?: DiagramReference[];
  architecture?: DiagramArchitecture;
}

export interface DiagramReference {
  modelId: string;
  nodeId?: string;
  relation: "refines" | "realizes" | "traces" | "drill-down";
  label: string;
}

export const DIAGRAM_ARCHITECTURE_TYPES = ["Person", "Software System", "Container", "Component", "Deployment Node", "Infrastructure Node", "Container Instance", "Software System Instance"] as const;

export interface DiagramArchitecture {
  type: typeof DIAGRAM_ARCHITECTURE_TYPES[number];
  technology?: string;
  external?: boolean;
}

export type DiagramEdgeKind =
  | "association"
  | "composition"
  | "aggregation"
  | "generalization"
  | "dependency"
  | "realization"
  | "navigationLink"
  | "processLink"
  | "sequenceFlow" | "messageFlow" | "informationRequirement" | "knowledgeRequirement"
  | "authorityRequirement" | "caseLink" | "synchronousMessage" | "returnMessage"
  | "controlFlow" | "transition" | "extension" | "deliverableFlow" | "intangibleFlow" | "dataFlow"
  | "navigationFlow" | "sentryOnPart" | "valuePropositionFlow" | "communicationMessage" | "c4Relationship" | "commentLink" | "objectFlow";

export const DIAGRAM_EDGE_KINDS: readonly DiagramEdgeKind[] = [
  "association", "composition", "aggregation", "generalization", "dependency", "realization",
  "navigationLink", "processLink", "sequenceFlow", "messageFlow", "informationRequirement",
  "knowledgeRequirement", "authorityRequirement", "caseLink", "synchronousMessage", "returnMessage",
  "controlFlow", "transition", "extension", "deliverableFlow", "intangibleFlow", "dataFlow", "navigationFlow", "sentryOnPart", "valuePropositionFlow", "communicationMessage", "c4Relationship", "commentLink", "objectFlow",
];

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
  sourcePoint?: DiagramPoint;
  targetPoint?: DiagramPoint;
  technology?: string;
  order?: number;
}

export const DIAGRAM_NOTATIONS = [
  "UML class", "UML component", "UML object", "UML package", "UML deployment", "UML composite structure",
  "UML profile", "UML use case", "UML activity", "UML state machine", "UML sequence", "UML communication",
  "UML interaction overview", "UML timing", "UWE navigation", "UWE presentation", "BPMN process",
  "DMN requirements", "DMN decision table", "CMMN case", "BMM motivation", "SBVR vocabulary",
  "VDML value delivery", "IFML interaction", "SysML block", "SysML requirements", "BACM capabilities",
  "UWE requirements", "UWE requirement activity", "UWE content", "UWE process structure", "UWE process flow",
  "UWE user and roles", "UWE basic rights", "UWE navigation states", "UWE application modes",
  "C4 system landscape", "C4 system context", "C4 container", "C4 component", "C4 code", "C4 dynamic", "C4 deployment",
] as const;
export type DiagramNotation = typeof DIAGRAM_NOTATIONS[number];

export interface DiagramModel {
  id: string;
  name: string;
  notation: DiagramNotation;
  description: string;
  width: number;
  height: number;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  standard?: { acronym: string; version: string; sourceUrl: string; coverage: "notation-subset" | "concept-projection"; scope: string };
  profileId?: string;
  parentModelId?: string;
  legend?: string[];
}

export interface DiagramSelectionDetails {
  source: string;
  reason: "node-press" | "element-select";
}

export interface LiquidDiagramProps {
  model: DiagramModel;
  selectedId?: string | null;
  disabled?: boolean;
  onSelectionChange?: (nodeId: string, details: DiagramSelectionDetails) => void;
  className?: string;
  details?: "inline" | "disclosure" | "none";
}
