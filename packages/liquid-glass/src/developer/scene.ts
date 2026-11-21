import type { DiagramEdge, DiagramModel, DiagramNode, DiagramPoint } from "./types";
import { DIAGRAM_ARCHITECTURE_TYPES, DIAGRAM_EDGE_KINDS, DIAGRAM_NODE_KINDS, DIAGRAM_NOTATIONS } from "./types";
import { specialNodeShapes } from "./notations";

export interface DiagramShape {
  tag: "rect" | "line" | "path" | "polyline" | "polygon" | "text" | "g" | "title" | "circle" | "ellipse";
  attrs: Record<string, string | number>;
  text?: string;
  children?: DiagramShape[];
}

const ink = "#304c60";
const muted = "#4e6472";
const paper = "#fcfefd";
const selected = "#176a69";
const round = (value: number) => Math.round(value * 100) / 100;
const point = (value: DiagramPoint) => `${round(value.x)},${round(value.y)}`;

function shape(tag: DiagramShape["tag"], attrs: DiagramShape["attrs"], text?: string): DiagramShape {
  return { tag, attrs, text };
}

function textAt(x: number, y: number, text: string, attrs: DiagramShape["attrs"] = {}) {
  return shape("text", { x, y, fill: ink, fontSize: 13, fontFamily: "Arial, sans-serif", ...attrs }, text);
}

function fittedName(value: string, width: number) {
  const measure = (text: string) => Array.from(text).reduce((sum, letter) => sum + (/[MW@%&]/.test(letter) ? 12 : /[iljtI.,:; !'|]/.test(letter) ? 4 : /[A-Z0-9]/.test(letter) ? 9 : letter.codePointAt(0)! > 255 ? 14 : 7.2), 0);
  let text = value;
  if (measure(text) > width) {
    const letters = Array.from(text);
    while (letters.length && measure(`${letters.join("")}…`) > width) letters.pop();
    text = `${letters.join("")}…`;
  }
  return { text, width: Math.min(width, measure(text)) };
}

function wrappedText(value: string, width: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of value.split(/\s+/)) {
    const next = current ? current + " " + word : word;
    if (fittedName(next, width).text === next) { current = next; continue; }
    if (current) lines.push(current);
    current = "";
    for (const letter of Array.from(word)) {
      if (current && fittedName(current + letter, width).text !== current + letter) {
        lines.push(current);
        current = "";
      }
      current += letter;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function nodeKeyword(node: DiagramNode) {
  return node.stereotype ?? (node.kind === "component" || node.kind === "interface" ? node.kind : "");
}

export function nodeHeaderHeight(node: DiagramNode) {
  if (["c4Boundary", "c4Deployment"].includes(node.kind)) return node.architecture?.technology ? 88 : 64;
  if (node.kind === "c4Person") return 156;
  if (["c4Element", "c4Database"].includes(node.kind)) return 132;
  if (node.kind === "comment") return 72;
  if (node.kind === "table") return 52 + 24 * ((node.table?.rows.length ?? 0) + 1);
  if (["initial", "final", "fork", "startEvent", "endEvent", "criterion", "port", "ifmlEvent", "pool", "planningTable"].includes(node.kind)) return 0;
  if (["package", "casePlan", "device"].includes(node.kind)) return 74;
  if (["stage", "interaction", "lifeline", "ifmlViewContainer"].includes(node.kind)) return 48;
  if (["object", "objectNode", "part"].includes(node.kind)) return 46;
  if (["activity", "state"].includes(node.kind) && node.compartments?.length) return node.stereotype ? 58 : 48;
  if (!["class", "component", "interface", "uwe"].includes(node.kind)) return Math.min(40, node.height);
  return nodeKeyword(node) ? 58 : 44;
}

export function validateDiagramModel(candidate: unknown) {
  const errors: string[] = [];
  const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
  const validText = (value: unknown, max = 2000): value is string => typeof value === "string" && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ud800-\udfff\ufffe\uffff]/u.test(value);
  const strings = (value: unknown) => Array.isArray(value) && value.length <= 100 && value.every(item => validText(item));
  if (!record(candidate) || !Array.isArray(candidate.nodes) || !Array.isArray(candidate.edges)) return ["Provide a model object with nodes and edges arrays."];
  const model = candidate as unknown as DiagramModel;
  if (![model.id, model.name, model.description].every(value => validText(value, 10000) && value.trim())) errors.push("The model needs a text ID, name and description without invalid XML characters.");
  if (!DIAGRAM_NOTATIONS.includes(model.notation)) errors.push("Choose one of the supported notation views.");
  if ([model.profileId, model.parentModelId].some(value => value !== undefined && (!validText(value, 200) || !value.trim()))) errors.push("Profile and parent model IDs must be non-empty text.");
  if (model.parentModelId === model.id) errors.push("A model cannot be its own parent.");
  if (model.legend !== undefined && !strings(model.legend)) errors.push("The notation legend must contain text entries.");
  if (model.nodes.length > 500 || model.edges.length > 1500) errors.push("Use at most 500 elements and 1,500 relationships per model.");
  if (model.standard !== undefined) {
    if (!record(model.standard) || ![model.standard.acronym, model.standard.version, model.standard.sourceUrl, model.standard.scope].every(value => validText(value, 10000) && value.trim()) || !["notation-subset", "concept-projection"].includes(model.standard.coverage)) errors.push("Standard metadata needs a name, version, HTTPS source, coverage and scope.");
    else { try { if (new URL(model.standard.sourceUrl).protocol !== "https:") errors.push("Use an HTTPS specification source URL."); } catch { errors.push("Use a valid HTTPS specification source URL."); } }
  }
  for (const node of model.nodes) {
    if (!record(node) || ![node.id, node.name, node.description].every(value => validText(value, 10000)) || !DIAGRAM_NODE_KINDS.includes(node.kind)) {
      errors.push("Every element needs a supported kind and text ID, name and description.");
      continue;
    }
    if (node.compartments !== undefined && (!Array.isArray(node.compartments) || node.compartments.length > 30 || node.compartments.some(group => !record(group) || !strings(group.entries) || (group.label !== undefined && !validText(group.label))))) errors.push("Element compartments must contain text entries.");
    if (node.constraints !== undefined && !strings(node.constraints)) errors.push("Element constraints must be text entries.");
    if (node.activations !== undefined && (!Array.isArray(node.activations) || node.activations.length > 100 || node.activations.some(value => !record(value) || !Number.isFinite(value.y) || !Number.isFinite(value.height) || value.y < 0 || value.height <= 0 || value.y + value.height > node.height))) errors.push("Lifeline activations must fit inside their element with positive heights.");
    if (node.kind === "table" || node.table !== undefined) {
      if (!record(node.table) || !strings(node.table.columns) || !node.table.columns.length || !Array.isArray(node.table.rows) || node.table.rows.length > 100 || node.table.rows.some(row => !strings(row) || row.length !== node.table!.columns.length)) errors.push("Tables need column names and equally sized text rows.");
      else {
        if (node.table.hitPolicy !== undefined && !validText(node.table.hitPolicy, 80)) errors.push("Table hit policy must be text.");
        if (node.table.inputColumnCount !== undefined && (!Number.isInteger(node.table.inputColumnCount) || node.table.inputColumnCount < 1 || node.table.inputColumnCount > node.table.columns.length - 2)) errors.push("Decision tables need a valid number of input columns and an output column.");
      }
    }
    if ([node.stereotype, node.marker, node.parentId, node.ownerId, node.multiplicity].some(value => value !== undefined && !validText(value))) errors.push("Element metadata must be text.");
    if (node.entityId !== undefined && (!validText(node.entityId, 200) || !node.entityId.trim())) errors.push("Entity IDs must be non-empty text.");
    if (node.references !== undefined && (!Array.isArray(node.references) || node.references.length > 32 || node.references.some(ref => !record(ref) || !validText(ref.modelId, 200) || !ref.modelId.trim() || !validText(ref.label, 200) || !ref.label.trim() || (ref.nodeId !== undefined && (!validText(ref.nodeId, 200) || !ref.nodeId.trim())) || !["refines", "realizes", "traces", "drill-down"].includes(ref.relation)))) errors.push("Element references need a target model, optional element, relation and label.");
    if (node.architecture !== undefined && (!record(node.architecture) || !DIAGRAM_ARCHITECTURE_TYPES.includes(node.architecture.type) || (node.architecture.technology !== undefined && !validText(node.architecture.technology, 200)) || (node.architecture.external !== undefined && typeof node.architecture.external !== "boolean"))) errors.push("Architecture metadata needs a supported element type, text technology and optional external flag.");
    if ([node.abstract, node.discretionary].some(value => value !== undefined && typeof value !== "boolean")) errors.push("Element flags must be boolean.");
  }
  for (const edge of model.edges) {
    if (!record(edge) || ![edge.id, edge.source, edge.target, edge.description].every(value => validText(value, 10000)) || !DIAGRAM_EDGE_KINDS.includes(edge.kind)) { errors.push("Every relationship needs text IDs, a description and a supported kind."); continue; }
    if (edge.waypoints !== undefined && (!Array.isArray(edge.waypoints) || edge.waypoints.length > 100)) errors.push("Relationship waypoints must be an array of at most 100 points.");
    if ([edge.label, edge.sourceMultiplicity, edge.targetMultiplicity].some(value => value !== undefined && !validText(value))) errors.push("Relationship labels must be text.");
    if (edge.technology !== undefined && !validText(edge.technology, 200)) errors.push("Relationship technology must be text.");
    if (edge.order !== undefined && (!Number.isSafeInteger(edge.order) || edge.order < 1 || edge.order > 10000)) errors.push("Relationship order must be an integer between 1 and 10,000.");
    if ([edge.sourceSide, edge.targetSide].some(value => value !== undefined && !["top", "right", "bottom", "left"].includes(value))) errors.push("Relationship sides must be top, right, bottom or left.");
    if (edge.directed !== undefined && typeof edge.directed !== "boolean") errors.push("Relationship direction must be boolean.");
  }
  if (errors.length) return [...new Set(errors)];
  if (![model.width, model.height].every((value) => Number.isFinite(value) && value >= 100 && value <= 20000)) {
    errors.push("The diagram must have finite dimensions between 100 and 20,000 units.");
  }
  const nodes = new Map<string, DiagramNode>();
  for (const node of model.nodes) {
    if (!node.id || nodes.has(node.id)) errors.push("Every element needs a unique, non-empty ID.");
    nodes.set(node.id, node);
    if (!node.name.trim()) errors.push("Every element needs a name.");
    if (![node.x, node.y, node.width, node.height].every(Number.isFinite) || node.width < 8 || node.height < Math.max(8, nodeHeaderHeight(node))) {
      errors.push(`Element ${node.id} has invalid dimensions.`);
    }
    if (node.x < 0 || node.y < 0 || node.x + node.width > model.width || node.y + node.height > model.height) {
      errors.push(`Element ${node.id} is outside the diagram.`);
    }
  }
  for (const node of model.nodes) {
    if (node.ownerId && (!nodes.has(node.ownerId) || node.ownerId === node.id)) errors.push(`Element ${node.id} needs a distinct, existing owner.`);
    if (!node.parentId) continue;
    const parent = nodes.get(node.parentId);
    if (!parent || parent.id === node.id) {
      errors.push(`Element ${node.id} has an invalid parent.`);
      continue;
    }
    if (node.x < parent.x || node.y < parent.y + nodeHeaderHeight(parent) || node.x + node.width > parent.x + parent.width || node.y + node.height > parent.y + parent.height) {
      errors.push(`Element ${node.id} must fit inside its parent below the heading.`);
    }
    const visited = new Set([node.id]);
    let current: DiagramNode | undefined = parent;
    while (current) {
      if (visited.has(current.id)) {
        errors.push("Element containment cannot contain a cycle.");
        break;
      }
      visited.add(current.id);
      current = current.parentId ? nodes.get(current.parentId) : undefined;
    }
  }
  const edges = new Set<string>();
  for (const edge of model.edges) {
    if (!edge.id || edges.has(edge.id)) errors.push("Every relationship needs a unique, non-empty ID.");
    edges.add(edge.id);
    if (!nodes.has(edge.source) || !nodes.has(edge.target) || edge.source === edge.target) {
      errors.push(`Relationship ${edge.id} needs two distinct, existing elements.`);
    }
    if ([edge.sourceOffset, edge.targetOffset].some((value) => value !== undefined && (!Number.isFinite(value) || value < 0 || value > 1))) {
      errors.push(`Relationship ${edge.id} has an invalid connection offset.`);
    }
    if ([...(edge.waypoints ?? []), ...[edge.labelPosition, edge.sourcePoint, edge.targetPoint].filter(value => value !== undefined)].some(value => !record(value) || !Number.isFinite(value.x) || !Number.isFinite(value.y))) {
      errors.push(`Relationship ${edge.id} has invalid coordinates.`);
    }
  }
  return [...new Set(errors)];
}

function anchor(node: DiagramNode, side: NonNullable<DiagramEdge["sourceSide"]>, offset = 0.5): DiagramPoint {
  if (side === "top") return { x: node.x + node.width * offset, y: node.y };
  if (side === "bottom") return { x: node.x + node.width * offset, y: node.y + node.height };
  if (side === "left") return { x: node.x, y: node.y + node.height * offset };
  return { x: node.x + node.width, y: node.y + node.height * offset };
}

function edgePoints(edge: DiagramEdge, nodes: Map<string, DiagramNode>) {
  const source = nodes.get(edge.source)!;
  const target = nodes.get(edge.target)!;
  const dx = target.x + target.width / 2 - source.x - source.width / 2;
  const dy = target.y + target.height / 2 - source.y - source.height / 2;
  const horizontal = Math.abs(dx) > Math.abs(dy);
  const sourceSide = edge.sourceSide ?? (horizontal ? (dx >= 0 ? "right" : "left") : dy >= 0 ? "bottom" : "top");
  const targetSide = edge.targetSide ?? (horizontal ? (dx >= 0 ? "left" : "right") : dy >= 0 ? "top" : "bottom");
  const start = edge.sourcePoint ?? anchor(source, sourceSide, edge.sourceOffset);
  const end = edge.targetPoint ?? anchor(target, targetSide, edge.targetOffset);
  const bends = edge.waypoints ?? (sourceSide === "left" || sourceSide === "right"
    ? [{ x: (start.x + end.x) / 2, y: start.y }, { x: (start.x + end.x) / 2, y: end.y }]
    : [{ x: start.x, y: (start.y + end.y) / 2 }, { x: end.x, y: (start.y + end.y) / 2 }]);
  return [start, ...bends, end].filter((value, index, values) => index === 0 || value.x !== values[index - 1].x || value.y !== values[index - 1].y);
}

function endVector(tip: DiagramPoint, previous: DiagramPoint) {
  const length = Math.hypot(tip.x - previous.x, tip.y - previous.y) || 1;
  const x = (tip.x - previous.x) / length;
  const y = (tip.y - previous.y) / length;
  return (distance: number, offset: number): DiagramPoint => ({ x: tip.x - x * distance - y * offset, y: tip.y - y * distance + x * offset });
}

function edgeShapes(edge: DiagramEdge, nodes: Map<string, DiagramNode>): DiagramShape {
  const points = edgePoints(edge, nodes);
  const start = points[0];
  const end = points.at(-1)!;
  const vector = endVector(end, points.at(-2) ?? end);
  const children: DiagramShape[] = [];
  const dashed = ["dependency", "realization", "messageFlow", "knowledgeRequirement", "authorityRequirement", "caseLink", "sentryOnPart", "returnMessage", "intangibleFlow", "dataFlow", "commentLink"].includes(edge.kind);
  const dashPattern = edge.kind === "sentryOnPart" ? "1.5 4" : edge.kind === "caseLink" ? "8 4 1.5 4 1.5 4" : "7 5";
  children.push(shape("polyline", {
    points: points.map(point).join(" "), fill: "none", stroke: ink, strokeWidth: 1.6,
    strokeLinejoin: "round", ...(dashed ? { strokeDasharray: dashPattern } : {}),
    "data-diagram-edge": edge.id, "data-edge-kind": edge.kind,
  }));
  if (edge.kind === "generalization" || edge.kind === "realization") {
    children.push(shape("polygon", { points: [end, vector(15, 8), vector(15, -8)].map(point).join(" "), fill: paper, stroke: ink, strokeWidth: 1.6, "data-arrowhead": "triangle", className: "qgd-arrow-paper" }));
  } else if (["sequenceFlow", "informationRequirement", "synchronousMessage", "extension", "dataFlow", "navigationFlow", "deliverableFlow", "intangibleFlow", "valuePropositionFlow", "c4Relationship"].includes(edge.kind)) {
    children.push(shape("polygon", { points: [end, vector(12, 6), vector(12, -6)].map(point).join(" "), fill: ink, stroke: ink, "data-arrowhead": "filled-triangle", className: "qgd-arrow-solid" }));
  } else if (edge.kind === "authorityRequirement") {
    const center = vector(4, 0);
    children.push(shape("circle", { cx: center.x, cy: center.y, r: 4, fill: ink, "data-arrowhead": "solid-circle", className: "qgd-arrow-solid" }));
  } else if (edge.kind === "messageFlow") {
    const center = endVector(start, points[1] ?? start)(4, 0);
    children.push(shape("circle", { cx: center.x, cy: center.y, r: 4, fill: paper, stroke: ink, className: "qgd-arrow-paper" }));
    children.push(shape("polygon", { points: [end, vector(12, 6), vector(12, -6)].map(point).join(" "), fill: paper, stroke: ink, "data-arrowhead": "message", className: "qgd-arrow-paper" }));
  } else if (edge.kind === "communicationMessage") {
    const segments = points.slice(1).map((to, index) => ({ from: points[index], to, length: Math.hypot(to.x - points[index].x, to.y - points[index].y) }));
    const segment = segments.reduce((longest, current) => current.length > longest.length ? current : longest, { from: start, to: end, length: 0 });
    const along = endVector(segment.to, segment.from);
    const messageStart = along(segment.length / 2 + 15, -10);
    const messageEnd = along(segment.length / 2 - 15, -10);
    const arrow = endVector(messageEnd, messageStart);
    children.push(shape("line", { x1: messageStart.x, y1: messageStart.y, x2: messageEnd.x, y2: messageEnd.y, stroke: ink, strokeWidth: 1.4, "data-message-arrow": edge.id }));
    children.push(shape("polygon", { points: [messageEnd, arrow(8, 4), arrow(8, -4)].map(point).join(" "), fill: ink, stroke: ink, "data-arrowhead": "communication-message", className: "qgd-arrow-solid" }));
  } else if ((dashed && !["caseLink", "sentryOnPart", "commentLink"].includes(edge.kind)) || ["navigationLink", "processLink", "controlFlow", "objectFlow", "transition"].includes(edge.kind) || (edge.directed && !["caseLink", "sentryOnPart", "commentLink"].includes(edge.kind))) {
    children.push(shape("polyline", { points: [vector(11, 5), end, vector(11, -5)].map(point).join(" "), fill: "none", stroke: ink, strokeWidth: 1.6, "data-arrowhead": "open" }));
  }
  if (edge.kind === "composition" || edge.kind === "aggregation") {
    const fromStart = endVector(start, points[1] ?? start);
    children.push(shape("polygon", {
      points: [start, fromStart(9, 5), fromStart(18, 0), fromStart(9, -5)].map(point).join(" "),
      fill: edge.kind === "composition" ? ink : paper, stroke: ink, strokeWidth: 1.6,
      "data-arrowhead": edge.kind === "composition" ? "filled-diamond" : "hollow-diamond",
      className: edge.kind === "composition" ? "qgd-arrow-solid" : "qgd-arrow-paper",
    }));
  }
  const middle = edge.labelPosition ?? { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 - 10 };
  const label = `${edge.order !== undefined ? `${edge.order}. ` : ""}${edge.label ?? (edge.kind === "navigationLink" || edge.kind === "processLink" ? `«${edge.kind}»` : "")}`;
  if (label) children.push(textAt(middle.x, middle.y, label, { textAnchor: "middle", fontSize: 12, paintOrder: "stroke", stroke: paper, strokeWidth: 5, strokeLinejoin: "round", className: "qgd-edge-label" }));
  if (edge.technology) children.push(textAt(middle.x, middle.y + 17, `[${edge.technology}]`, { textAnchor: "middle", fontSize: 11, paintOrder: "stroke", stroke: paper, strokeWidth: 5, strokeLinejoin: "round", className: "qgd-edge-label" }));
  if (edge.sourceMultiplicity) {
    const near = endVector(start, points[1] ?? start)(25, -12);
    children.push(textAt(near.x, near.y, edge.sourceMultiplicity, { fontSize: 12, textAnchor: "middle" }));
  }
  if (edge.targetMultiplicity) {
    const near = vector(25, 12);
    children.push(textAt(near.x, near.y, edge.targetMultiplicity, { fontSize: 12, textAnchor: "middle" }));
  }
  return { tag: "g", attrs: { "data-relationship": edge.id }, children };
}

function nodeShapes(node: DiagramNode, active: boolean, container: boolean): DiagramShape {
  const special = specialNodeShapes(node, active);
  if (special) return { tag: "g", attrs: { transform: `translate(${node.x} ${node.y})`, "data-notation-node": node.id, "data-node-kind": node.kind }, children: special };
  const keyword = nodeKeyword(node);
  const header = nodeHeaderHeight(node);
  const children: DiagramShape[] = [shape("title", {}, node.name), shape("rect", {
    x: 0, y: 0, width: node.width, height: node.height,
    fill: container ? "#f1f6f5" : paper, stroke: active ? selected : ink,
    strokeWidth: active ? 2.5 : 1.4, className: "qgd-node-box", "data-selected": active ? "true" : "false",
  })];
  if (active) children.push(shape("rect", { x: 1.5, y: 1.5, width: node.width - 3, height: header - 2, fill: "#e3f1ed", className: "qgd-node-highlight" }));
  if (keyword) children.push(textAt(node.width / 2, 20, `«${keyword}»`, { textAnchor: "middle", fontSize: 12, fill: muted }));
  const name = `${node.name}${node.multiplicity ? ` [${node.multiplicity}]` : ""}`;
  const fitted = fittedName(name, node.width - 28);
  children.push(textAt(node.width / 2, keyword ? 41 : 28, fitted.text, { textAnchor: "middle", fontSize: 14, fontWeight: 700, textLength: fitted.width, lengthAdjust: "spacingAndGlyphs", ...(node.abstract ? { fontStyle: "italic" } : {}) }));
  if (node.kind === "component") {
    const x = node.width - 27;
    children.push(shape("rect", { x, y: 9, width: 15, height: 18, fill: paper, stroke: ink, strokeWidth: 1.2 }));
    for (const y of [12, 20]) children.push(shape("rect", { x: x - 4, y, width: 8, height: 4, fill: paper, stroke: ink, strokeWidth: 1.2 }));
  }
  if (container) children.push(shape("line", { x1: 0, y1: header, x2: node.width, y2: header, stroke: ink, strokeWidth: 1.2 }));
  let cursor = header;
  for (const compartment of node.compartments ?? []) {
    children.push(shape("line", { x1: 0, y1: cursor, x2: node.width, y2: cursor, stroke: ink, strokeWidth: 1.2 }));
    cursor += 21;
    if (compartment.label) {
      children.push(textAt(node.width / 2, cursor, compartment.label, { textAnchor: "middle", fontSize: 11, fill: muted }));
      cursor += 20;
    }
    for (const entry of compartment.entries) {
      children.push(textAt(13, cursor, entry, { fontFamily: "ui-monospace, monospace", fontSize: 12 }));
      cursor += 22;
    }
    cursor += 6;
  }
  if (node.constraints?.length) children.push(textAt(node.width / 2, node.height - 13, `{${node.constraints.join(", ")}}`, { textAnchor: "middle", fontSize: 11, fill: muted }));
  return { tag: "g", attrs: { transform: `translate(${node.x} ${node.y})`, "data-notation-node": node.id }, children };
}

export function diagramScene(model: DiagramModel, selectedId?: string): DiagramShape[] {
  const errors = validateDiagramModel(model);
  if (errors.length) throw new Error(errors.join(" "));
  const nodes = new Map(model.nodes.map((node) => [node.id, node]));
  const parents = new Set(model.nodes.map((node) => node.parentId).filter(Boolean));
  function depth(node: DiagramNode): number {
    return node.parentId ? 1 + depth(nodes.get(node.parentId)!) : 0;
  }
  return [
    shape("rect", { x: 0, y: 0, width: model.width, height: model.height, fill: "#f8fbfa", className: "qgd-canvas-paper" }),
    ...[...model.nodes].filter(node => parents.has(node.id)).sort((a, b) => depth(a) - depth(b)).map(node => nodeShapes(node, node.id === selectedId, true)),
    ...model.edges.map((edge) => edgeShapes(edge, nodes)),
    ...[...model.nodes].filter(node => !parents.has(node.id)).sort((a, b) => depth(a) - depth(b)).map(node => nodeShapes(node, node.id === selectedId, false)),
  ];
}

const xmlNames: Record<string, string> = {
  className: "class", strokeWidth: "stroke-width", strokeLinejoin: "stroke-linejoin", strokeDasharray: "stroke-dasharray",
  fontFamily: "font-family", fontSize: "font-size", fontStyle: "font-style", fontWeight: "font-weight", textAnchor: "text-anchor", paintOrder: "paint-order", textDecoration: "text-decoration",
};

function escapeXml(value: string | number) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!);
}

function serializeShape(item: DiagramShape): string {
  const attrs = Object.entries(item.attrs).map(([key, value]) => ` ${xmlNames[key] ?? key}="${escapeXml(value)}"`).join("");
  return `<${item.tag}${attrs}>${item.text === undefined ? "" : escapeXml(item.text)}${item.children?.map(serializeShape).join("") ?? ""}</${item.tag}>`;
}

export function diagramToSvg(model: DiagramModel) {
  const scene = diagramScene(model);
  const byId = new Map(model.nodes.map((node) => [node.id, node]));
  const description = [model.description, ...model.nodes.map((node) => `${node.name}, ${node.architecture?.type || nodeKeyword(node) || node.kind}${node.architecture?.technology ? `, ${node.architecture.technology}` : ""}${node.architecture?.external ? ", external" : ""}: ${node.description} ${(node.compartments ?? []).flatMap((compartment) => compartment.entries).join("; ")}${node.constraints?.length ? ` Constraints: ${node.constraints.join("; ")}.` : ""}`), ...model.edges.map((edge) => `${edge.order ? `${edge.order}. ` : ""}${byId.get(edge.source)!.name} to ${byId.get(edge.target)!.name}, ${edge.kind}${edge.technology ? `, ${edge.technology}` : ""}: ${edge.description}`)].join(" ");
  const legend = (model.legend ?? []).flatMap(value => wrappedText(value, Math.max(40, model.width - 40)));
  const height = model.height + (legend.length ? 46 + legend.length * 22 : 0);
  const legendShapes = legend.length ? [shape("rect", { x: 0, y: model.height, width: model.width, height: height - model.height, fill: paper }), textAt(20, model.height + 25, "Notation key", { fontWeight: 700 }), ...legend.map((line, index) => textAt(20, model.height + 48 + index * 22, line))] : [];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${escapeXml(model.width)}" height="${escapeXml(height)}" viewBox="0 0 ${escapeXml(model.width)} ${escapeXml(height)}" role="img" aria-labelledby="diagram-title diagram-description"><title id="diagram-title">${escapeXml(model.name)}</title><desc id="diagram-description">${escapeXml(description)}</desc>${[...scene, ...legendShapes].map(serializeShape).join("")}</svg>`;
}
