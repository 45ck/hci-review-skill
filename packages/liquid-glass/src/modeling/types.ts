import type { ChangeDetails } from "@ui-sdk/core";
import type { DiagramEdge, DiagramModel, DiagramNode } from "../developer/types";

export const MODEL_DOCUMENT_LIMITS = Object.freeze({ bytes: 1_000_000, operations: 100, history: 50 });
export type ModelDocumentReason = "model-transaction" | "model-undo" | "model-redo" | "model-select";
export type ModelDocumentChangeDetails = ChangeDetails<ModelDocumentReason> & { signal: AbortSignal };
export interface ModelDocumentInput { event?: Event }
export type ModelNodePatch = { [Key in keyof Omit<DiagramNode, "id">]?: DiagramNode[Key] | null };
export type ModelEdgePatch = { [Key in keyof Omit<DiagramEdge, "id">]?: DiagramEdge[Key] | null };

export type ModelDocumentOperation =
  | { type: "rename-node"; nodeId: string; name: string }
  | { type: "update-node"; nodeId: string; patch: ModelNodePatch }
  | { type: "add-node"; node: DiagramNode }
  | { type: "remove-node"; nodeId: string }
  | { type: "add-edge"; edge: DiagramEdge }
  | { type: "update-edge"; edgeId: string; patch: ModelEdgePatch }
  | { type: "remove-edge"; edgeId: string }
  | { type: "replace-model"; model: DiagramModel };

export interface ModelDocumentTransaction {
  expectedRevision: number;
  operations: readonly ModelDocumentOperation[];
  label?: string;
  selectedId?: string | null;
}

export interface ModelIssue {
  code: string;
  message: string;
  severity?: "error" | "warning";
  operationIndex?: number;
  nodeId?: string;
  edgeId?: string;
  modelId?: string;
}

export interface ModelChangeSummary {
  label: string;
  operationCount: number;
  addedNodeIds: string[];
  updatedNodeIds: string[];
  removedNodeIds: string[];
  addedEdgeIds: string[];
  updatedEdgeIds: string[];
  removedEdgeIds: string[];
  metadataChanged: boolean;
  selectionChanged: boolean;
}

export interface ModelHistoryEntry {
  model: DiagramModel;
  selectedId: string | null;
  label: string;
}

export interface ModelDocument {
  model: DiagramModel;
  revision: number;
  selectedId: string | null;
  past: readonly ModelHistoryEntry[];
  future: readonly ModelHistoryEntry[];
}

export interface ModelDocumentContext {
  models?: readonly DiagramModel[];
  validateModel?: (model: DiagramModel) => readonly (ModelIssue | string)[];
}

export interface ModelDocumentResult {
  ok: boolean;
  changed: boolean;
  revision: number;
  issues: ModelIssue[];
  summary: ModelChangeSummary;
  document: ModelDocument;
}

export interface ModelActionResult extends Omit<ModelDocumentResult, "document"> {
  status: "applied" | "applied-error" | "requested" | "unchanged" | "rejected";
  requestedRevision?: number;
}

export interface ModelDocumentSnapshot {
  modelId: string;
  name: string;
  notation: string;
  profileId?: string;
  revision: number;
  selectedId: string | null;
  elements: number;
  relationships: number;
  undoDepth: number;
  redoDepth: number;
}

export interface ModelDocumentInspection extends ModelDocumentSnapshot {
  readOnly?: boolean;
  disabled?: boolean;
  pendingRevision?: number;
  lastResult?: ModelActionResult | null;
  model: DiagramModel;
  selectedElement: DiagramNode | null;
  selectedRelationships: DiagramEdge[];
  crossViewReferences: { modelId: string; nodeId: string; name: string; entityId?: string }[];
  limits: typeof MODEL_DOCUMENT_LIMITS;
  operations: { type: ModelDocumentOperation["type"]; fields: string[]; description: string }[];
  nodePatchFields: string[];
  edgePatchFields: string[];
  transactionExample: ModelDocumentTransaction | null;
}

export interface ModelDocumentHandle {
  inspect: () => ModelDocumentInspection;
  preview: (transaction: unknown) => ModelActionResult;
  applyTransaction: (transaction: unknown, input?: ModelDocumentInput) => ModelActionResult;
  undo: (expectedRevision: number, input?: ModelDocumentInput) => ModelActionResult;
  redo: (expectedRevision: number, input?: ModelDocumentInput) => ModelActionResult;
  select: (nodeId: string | null, input?: ModelDocumentInput) => ModelActionResult;
  cancelPending: () => ModelActionResult;
}
