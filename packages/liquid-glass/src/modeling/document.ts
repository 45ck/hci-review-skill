import { validateDiagramModel } from "../developer/scene";
import type { DiagramEdge, DiagramModel, DiagramNode, DiagramPoint } from "../developer/types";
import { MODEL_DOCUMENT_LIMITS, type ModelChangeSummary, type ModelDocument, type ModelDocumentContext,
  type ModelDocumentInspection, type ModelDocumentResult, type ModelDocumentSnapshot,
  type ModelDocumentTransaction, type ModelHistoryEntry, type ModelIssue } from "./types";

const nodeKeys = new Set(["name", "kind", "description", "x", "y", "width", "height", "stereotype", "abstract", "compartments", "constraints", "parentId", "ownerId", "multiplicity", "marker", "discretionary", "activations", "table", "entityId", "references", "architecture"]);
const edgeKeys = new Set(["source", "target", "kind", "label", "description", "sourceSide", "targetSide", "sourceOffset", "targetOffset", "waypoints", "labelPosition", "sourceMultiplicity", "targetMultiplicity", "directed", "sourcePoint", "targetPoint", "technology", "order"]);
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const finiteRevision = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const validId = (value: unknown): value is string => typeof value === "string" && Boolean(value.trim()) && value.length <= 10000;
const issue = (code: string, message: string, extra: Partial<ModelIssue> = {}): ModelIssue => ({ code, message, severity: "error", ...extra });

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) freeze(item);
  }
  return value;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (record(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value) ?? "undefined";
}

function copyJson<T>(value: T): { value: T } | { issue: ModelIssue } {
  try {
    const text = JSON.stringify(value);
    if (typeof text !== "string") return { issue: issue("invalid-json", "Provide a JSON-compatible value.") };
    if (new TextEncoder().encode(text).byteLength > MODEL_DOCUMENT_LIMITS.bytes) return { issue: issue("size-limit", "Limit each model or transaction to 1 MB of UTF-8 JSON.") };
    const parsed = JSON.parse(text);
    const inspect = (current: unknown, depth: number): boolean => {
      if (depth > 40) return false;
      if (!current || typeof current !== "object") return true;
      return Object.entries(current).every(([key, child]) => !["__proto__", "constructor", "prototype"].includes(key) && inspect(child, depth + 1));
    };
    if (!inspect(parsed, 0)) return { issue: issue("invalid-json-shape", "Use JSON no deeper than 40 levels and no prototype-changing keys.") };
    return { value: parsed as T };
  } catch {
    return { issue: issue("invalid-json", "Provide JSON-compatible data without circular values.") };
  }
}

const summary = (label: string, operationCount = 0): ModelChangeSummary => ({ label, operationCount,
  addedNodeIds: [], updatedNodeIds: [], removedNodeIds: [], addedEdgeIds: [], updatedEdgeIds: [], removedEdgeIds: [], metadataChanged: false, selectionChanged: false });

export function rejectedModelResult(document: ModelDocument, code: string, message: string): ModelDocumentResult {
  return { ok: false, changed: false, revision: document.revision, issues: [issue(code, message)], summary: summary(message), document };
}

function failures(document: ModelDocument, issues: ModelIssue[]): ModelDocumentResult {
  return { ok: false, changed: false, revision: document.revision, issues, summary: summary(issues[0]?.message ?? "The model change was refused."), document };
}

function documentIssues(model: DiagramModel, context: ModelDocumentContext): ModelIssue[] {
  const result: ModelIssue[] = [];
  try { result.push(...validateDiagramModel(model).map(message => issue("invalid-model", message, { modelId: model?.id }))); }
  catch { return [issue("invalid-model", "Provide a valid diagram model.")]; }
  if (result.length) return result;
  if (model.nodes.some(node => node.name.trim().length === 0 || node.name.length > 80 || /[\u0000-\u001f\u007f]/.test(node.name))) result.push(issue("invalid-label", "Enter element labels of 1–80 characters without control characters."));
  if (new Set(model.nodes.map(node => node.name.trim())).size !== model.nodes.length) result.push(issue("duplicate-label", "Use distinct element labels within each model."));
  const map = new Map(model.nodes.map(node => [node.id, node]));
  const visiting = new Set<string>(), complete = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (complete.has(id)) return false;
    const node = map.get(id);
    if (!node) return false;
    visiting.add(id);
    if ([node.parentId, node.ownerId].some(parent => parent ? visit(parent) : false)) return true;
    visiting.delete(id); complete.add(id); return false;
  };
  for (const node of model.nodes) if (visit(node.id)) { result.push(issue("ownership-cycle", "Containment and ownership cannot form a cycle.", { nodeId: node.id })); break; }
  if (context.models) {
    const models = context.models.map(item => item.id === model.id ? model : item);
    if (!models.some(item => item.id === model.id)) models.push(model);
    result.push(...validateModelSetReferences(models));
  }
  if (context.validateModel) {
    try { result.push(...context.validateModel(model).map(value => typeof value === "string" ? issue("profile-validation", value) : { ...value, severity: value.severity ?? "error" })); }
    catch { result.push(issue("validator-failed", "The host model validator could not complete; the document was not changed.")); }
  }
  return result;
}

export function validateModelSetReferences(models: readonly DiagramModel[]): ModelIssue[] {
  const result: ModelIssue[] = [];
  const byId = new Map<string, DiagramModel>();
  for (const model of models) {
    if (byId.has(model.id)) result.push(issue("duplicate-model-id", `Model ID ${model.id} appears more than once.`, { modelId: model.id }));
    byId.set(model.id, model);
  }
  for (const model of models) {
    if (model.parentModelId && !byId.has(model.parentModelId)) result.push(issue("missing-parent-model", `Model ${model.id} refers to missing parent model ${model.parentModelId}.`, { modelId: model.id }));
    const visited = new Set([model.id]);
    let nextId = model.parentModelId;
    while (nextId) {
      if (visited.has(nextId)) { result.push(issue("model-hierarchy-cycle", `Model ${model.id} participates in a parent-model cycle.`, { modelId: model.id })); break; }
      visited.add(nextId);
      nextId = byId.get(nextId)?.parentModelId;
    }
    for (const node of model.nodes) for (const reference of node.references ?? []) {
      const target = byId.get(reference.modelId);
      if (!target || (reference.nodeId && !target.nodes.some(item => item.id === reference.nodeId))) result.push(issue("dangling-model-reference", `${model.name}: ${node.name} points to a missing model or element (${reference.modelId}${reference.nodeId ? ` / ${reference.nodeId}` : ""}).`, { modelId: model.id, nodeId: node.id }));
    }
  }
  return result;
}

export function createModelDocument(model: DiagramModel, selectedId?: string | null): ModelDocument {
  const cloned = copyJson(model);
  const issues = "issue" in cloned ? [cloned.issue] : documentIssues(cloned.value, {});
  if (issues.some(item => item.severity !== "warning")) throw new Error(issues.map(item => item.message).join(" "));
  if ("issue" in cloned) throw new Error(cloned.issue.message);
  if (selectedId !== undefined && selectedId !== null && !cloned.value.nodes.some(node => node.id === selectedId)) throw new Error("Select an existing model element.");
  return freeze({ model: cloned.value, revision: 0, selectedId: selectedId === undefined ? cloned.value.nodes[0]?.id ?? null : selectedId, past: [], future: [] });
}

function descendants(model: DiagramModel, root: string): Set<string> {
  const ids = new Set([root]);
  for (let pass = 0; pass < model.nodes.length; pass++) {
    let added = false;
    for (const node of model.nodes) if (!ids.has(node.id) && ((node.parentId && ids.has(node.parentId)) || (node.ownerId && ids.has(node.ownerId)))) { ids.add(node.id); added = true; }
    if (!added) break;
  }
  return ids;
}

function translate(model: DiagramModel, nodeId: string, dx: number, dy: number) {
  if (!dx && !dy) return;
  const ids = descendants(model, nodeId);
  const point = (value: DiagramPoint): DiagramPoint => ({ x: value.x + dx, y: value.y + dy });
  model.nodes = model.nodes.map(node => ids.has(node.id) && node.id !== nodeId ? { ...node, x: node.x + dx, y: node.y + dy } : node);
  model.edges = model.edges.map(edge => {
    const source = ids.has(edge.source), target = ids.has(edge.target);
    return { ...edge,
      ...(edge.sourcePoint && source ? { sourcePoint: point(edge.sourcePoint) } : {}),
      ...(edge.targetPoint && target ? { targetPoint: point(edge.targetPoint) } : {}),
      ...(source && target && edge.waypoints ? { waypoints: edge.waypoints.map(point) } : {}),
      ...(source && target && edge.labelPosition ? { labelPosition: point(edge.labelPosition) } : {}),
    };
  });
}

function patched<T extends object>(value: T, patch: Record<string, unknown>): T {
  const next = { ...value } as Record<string, unknown>;
  for (const [key, field] of Object.entries(patch)) {
    if (field === null) delete next[key];
    else next[key] = field;
  }
  return next as T;
}

function operation(model: DiagramModel, value: unknown): DiagramModel | ModelIssue {
  if (!record(value) || typeof value.type !== "string") return issue("invalid-operation", "Each operation needs a supported type.");
  if (value.type === "replace-model") {
    if (!record(value.model) || value.model.id !== model.id) return issue("model-identity", `Keep model ID ${model.id} when replacing its content.`);
    return value.model as unknown as DiagramModel;
  }
  if (value.type === "add-node") {
    if (!record(value.node) || !validId(value.node.id)) return issue("invalid-node", "A new element needs a non-empty stable ID.");
    if (model.nodes.some(node => node.id === (value.node as Record<string, unknown>).id)) return issue("duplicate-node-id", `Element ID ${value.node.id} already exists.`);
    model.nodes.push(value.node as unknown as DiagramNode);
  } else if (["rename-node", "update-node", "remove-node"].includes(value.type)) {
    const node = model.nodes.find(item => item.id === value.nodeId);
    if (!node) return issue("missing-node", "The target element no longer exists.");
    if (value.type === "remove-node") {
      const ids = descendants(model, node.id);
      model.nodes = model.nodes.filter(item => !ids.has(item.id));
      model.edges = model.edges.filter(edge => !ids.has(edge.source) && !ids.has(edge.target));
    } else {
      const patch = value.type === "rename-node" ? { name: value.name } : value.patch;
      if (!record(patch) || Object.keys(patch).some(key => !nodeKeys.has(key))) return issue("invalid-node-patch", "Update supported element fields without replacing its stable ID.", { nodeId: node.id });
      if ("name" in patch && typeof patch.name !== "string") return issue("invalid-label", "The element label must be text.", { nodeId: node.id });
      const next = patched(node, patch);
      translate(model, node.id, next.x - node.x, next.y - node.y);
      model.nodes = model.nodes.map(item => item.id === node.id ? next : item);
    }
  } else if (value.type === "add-edge") {
    if (!record(value.edge) || !validId(value.edge.id)) return issue("invalid-edge", "A new relationship needs a non-empty stable ID.");
    if (model.edges.some(edge => edge.id === (value.edge as Record<string, unknown>).id)) return issue("duplicate-edge-id", `Relationship ID ${value.edge.id} already exists.`);
    model.edges.push(value.edge as unknown as DiagramEdge);
  } else if (["update-edge", "remove-edge"].includes(value.type)) {
    const edge = model.edges.find(item => item.id === value.edgeId);
    if (!edge) return issue("missing-edge", "The target relationship no longer exists.");
    if (value.type === "remove-edge") model.edges = model.edges.filter(item => item.id !== edge.id);
    else {
      if (!record(value.patch) || Object.keys(value.patch).some(key => !edgeKeys.has(key))) return issue("invalid-edge-patch", "Update supported relationship fields without replacing its stable ID.", { edgeId: edge.id });
      model.edges = model.edges.map(item => item.id === edge.id ? patched(item, value.patch as Record<string, unknown>) : item);
    }
  } else return issue("unknown-operation", `Unsupported model operation: ${value.type}.`);
  return model;
}

function describeChange(before: ModelDocument, model: DiagramModel, selectedId: string | null, label: string, count: number): ModelChangeSummary {
  const value = summary(label, count);
  const diff = <T extends { id: string }>(previous: T[], next: T[]) => {
    const old = new Map(previous.map(item => [item.id, item]));
    const current = new Set(next.map(item => item.id));
    return { added: next.filter(item => !old.has(item.id)).map(item => item.id),
      updated: next.filter(item => old.has(item.id) && canonical(old.get(item.id)) !== canonical(item)).map(item => item.id),
      removed: previous.filter(item => !current.has(item.id)).map(item => item.id) };
  };
  const nodes = diff(before.model.nodes, model.nodes), edges = diff(before.model.edges, model.edges);
  Object.assign(value, { addedNodeIds: nodes.added, updatedNodeIds: nodes.updated, removedNodeIds: nodes.removed,
    addedEdgeIds: edges.added, updatedEdgeIds: edges.updated, removedEdgeIds: edges.removed });
  const { nodes: _oldNodes, edges: _oldEdges, ...oldMetadata } = before.model;
  const { nodes: _newNodes, edges: _newEdges, ...newMetadata } = model;
  value.metadataChanged = canonical(oldMetadata) !== canonical(newMetadata);
  value.selectionChanged = before.selectedId !== selectedId;
  return value;
}

export function previewModelTransaction(document: ModelDocument, candidate: unknown, context: ModelDocumentContext = {}): ModelDocumentResult {
  if (!record(candidate) || !finiteRevision(candidate.expectedRevision)) return rejectedModelResult(document, "invalid-revision", "Provide the current non-negative integer expectedRevision.");
  if (candidate.expectedRevision !== document.revision) return rejectedModelResult(document, "stale-revision", `Expected revision ${candidate.expectedRevision}; the current revision is ${document.revision}. Inspect the current model and retry.`);
  if (!Array.isArray(candidate.operations) || !candidate.operations.length || candidate.operations.length > MODEL_DOCUMENT_LIMITS.operations) return rejectedModelResult(document, "operation-limit", "Use 1–100 operations in a transaction.");
  if (candidate.label !== undefined && (typeof candidate.label !== "string" || !candidate.label.trim() || candidate.label.length > 160)) return rejectedModelResult(document, "invalid-summary", "Use a transaction label of 1–160 characters.");
  if (candidate.selectedId !== undefined && candidate.selectedId !== null && !validId(candidate.selectedId)) return rejectedModelResult(document, "invalid-selection", "Select a stable element ID or null.");
  const copied = copyJson(candidate);
  if ("issue" in copied) return failures(document, [copied.issue]);
  const cloned = copyJson(document.model);
  if ("issue" in cloned) return failures(document, [cloned.issue]);
  let model = cloned.value;
  const request = copied.value as unknown as ModelDocumentTransaction;
  for (let index = 0; index < request.operations.length; index++) {
    try {
      const next = operation(model, request.operations[index]);
      if ("code" in next) return failures(document, [{ ...next, operationIndex: index }]);
      model = next;
    } catch {
      return failures(document, [issue("invalid-operation", "This operation could not be applied to the proposed model.", { operationIndex: index })]);
    }
  }
  const checked = copyJson(model);
  if ("issue" in checked) return failures(document, [checked.issue]);
  model = freeze(checked.value);
  const issues = documentIssues(model, context);
  if (issues.some(item => item.severity !== "warning")) return failures(document, issues);
  let selectedId = request.selectedId === undefined ? document.selectedId : request.selectedId;
  if (selectedId !== null && !model.nodes.some(node => node.id === selectedId)) {
    if (request.selectedId !== undefined) return rejectedModelResult(document, "missing-selection", "The requested selection is not present after this transaction.");
    selectedId = model.nodes[0]?.id ?? null;
  }
  const changed = canonical(document.model) !== canonical(model) || selectedId !== document.selectedId;
  const change = describeChange(document, model, selectedId, request.label?.trim() ?? "Model updated", request.operations.length);
  if (!changed) return { ok: true, changed: false, revision: document.revision, issues, summary: { ...change, label: "No model changes." }, document };
  if (document.revision >= Number.MAX_SAFE_INTEGER) return rejectedModelResult(document, "revision-limit", "This document reached its revision limit. Export it and start a new document session.");
  return { ok: true, changed: true, revision: document.revision + 1, issues, summary: change,
    document: freeze({ ...document, model, selectedId, revision: document.revision + 1 }) };
}

export function applyModelTransaction(document: ModelDocument, transaction: unknown, context: ModelDocumentContext = {}): ModelDocumentResult {
  const result = previewModelTransaction(document, transaction, context);
  if (!result.ok || !result.changed) return result;
  const checkpoint: ModelHistoryEntry = { model: document.model, selectedId: document.selectedId, label: result.summary.label };
  return { ...result, document: freeze({ ...result.document, past: [...document.past, checkpoint].slice(-MODEL_DOCUMENT_LIMITS.history), future: [] }) };
}

function travel(document: ModelDocument, expectedRevision: number, direction: "past" | "future", context: ModelDocumentContext): ModelDocumentResult {
  if (!finiteRevision(expectedRevision) || expectedRevision !== document.revision) return rejectedModelResult(document, "stale-revision", `Read the current document revision (${document.revision}) before changing history.`);
  const next = document[direction].at(-1);
  if (!next) return { ok: true, changed: false, revision: document.revision, issues: [], summary: summary(direction === "past" ? "Nothing to undo." : "Nothing to redo."), document };
  const label = `${direction === "past" ? "Undo" : "Redo"}: ${next.label}`;
  const result = previewModelTransaction(document, { expectedRevision, operations: [{ type: "replace-model", model: next.model }], selectedId: next.selectedId, label }, context);
  if (!result.ok) return result;
  const opposite = direction === "past" ? "future" : "past";
  return { ...result, document: freeze({ ...result.document, [direction]: document[direction].slice(0, -1),
    [opposite]: [...document[opposite], { model: document.model, selectedId: document.selectedId, label: next.label }].slice(-MODEL_DOCUMENT_LIMITS.history) }) };
}

export const undoModelDocument = (document: ModelDocument, expectedRevision: number, context: ModelDocumentContext = {}) => travel(document, expectedRevision, "past", context);
export const redoModelDocument = (document: ModelDocument, expectedRevision: number, context: ModelDocumentContext = {}) => travel(document, expectedRevision, "future", context);

export function selectModelElement(document: ModelDocument, nodeId: string | null): ModelDocumentResult {
  if (nodeId !== null && (!validId(nodeId) || !document.model.nodes.some(node => node.id === nodeId))) return rejectedModelResult(document, "missing-selection", "Select an existing model element.");
  return { ok: true, changed: nodeId !== document.selectedId, revision: document.revision, issues: [],
    summary: { ...summary(nodeId === null ? "Selection cleared." : `Selected ${nodeId}.`), selectionChanged: nodeId !== document.selectedId },
    document: nodeId === document.selectedId ? document : freeze({ ...document, selectedId: nodeId }) };
}

export function modelDocumentSnapshot(document: ModelDocument): ModelDocumentSnapshot {
  return { modelId: document.model.id, name: document.model.name, notation: document.model.notation, profileId: document.model.profileId,
    revision: document.revision, selectedId: document.selectedId, elements: document.model.nodes.length, relationships: document.model.edges.length,
    undoDepth: document.past.length, redoDepth: document.future.length };
}

export function inspectModelDocument(document: ModelDocument, context: ModelDocumentContext = {}): ModelDocumentInspection {
  const node = document.model.nodes.find(item => item.id === document.selectedId);
  return freeze({ ...modelDocumentSnapshot(document), model: document.model, selectedElement: node ?? null,
    selectedRelationships: node ? document.model.edges.filter(edge => edge.source === node.id || edge.target === node.id) : [],
    crossViewReferences: node?.entityId ? (context.models ?? []).flatMap(model => model.nodes.filter(item => item.entityId === node.entityId && (model.id !== document.model.id || item.id !== node.id)).map(item => ({ modelId: model.id, nodeId: item.id, name: item.name, entityId: item.entityId }))) : [],
    limits: MODEL_DOCUMENT_LIMITS,
    operations: [
      { type: "rename-node", fields: ["nodeId", "name"], description: "Rename an existing element; labels must be distinct within the model." },
      { type: "update-node", fields: ["nodeId", "patch"], description: "Update element fields. Moving a container also moves descendants, owned elements and connected endpoint geometry." },
      { type: "add-node", fields: ["node"], description: "Add a complete diagram node with a new stable ID." },
      { type: "remove-node", fields: ["nodeId"], description: "Remove the element, contained and owned elements, and their relationships. Dangling cross-view references reject the transaction." },
      { type: "add-edge", fields: ["edge"], description: "Add a complete relationship with a new stable ID and valid endpoint IDs." },
      { type: "update-edge", fields: ["edgeId", "patch"], description: "Update relationship fields while preserving its stable ID." },
      { type: "remove-edge", fields: ["edgeId"], description: "Remove an existing relationship." },
      { type: "replace-model", fields: ["model"], description: "Replace model content while preserving the document's model ID." },
    ],
    nodePatchFields: [...nodeKeys], edgePatchFields: [...edgeKeys],
    transactionExample: node ? { expectedRevision: document.revision, operations: [{ type: "rename-node" as const, nodeId: node.id, name: node.name }], label: "Rename the selected element" } : null });
}
