import type { DiagramEdge, DiagramModel, DiagramNode, DiagramPoint } from "./types";

export interface DiagramShape {
  tag: "rect" | "line" | "path" | "polyline" | "polygon" | "text" | "g" | "title";
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

export function nodeKeyword(node: DiagramNode) {
  return node.stereotype ?? (node.kind === "component" || node.kind === "interface" ? node.kind : "");
}

export function nodeHeaderHeight(node: DiagramNode) {
  return nodeKeyword(node) ? 58 : 44;
}

export function validateDiagramModel(model: DiagramModel) {
  const errors: string[] = [];
  if (![model.width, model.height].every((value) => Number.isFinite(value) && value > 0)) {
    errors.push("The diagram must have positive, finite dimensions.");
  }
  const nodes = new Map<string, DiagramNode>();
  for (const node of model.nodes) {
    if (!node.id || nodes.has(node.id)) errors.push("Every element needs a unique, non-empty ID.");
    nodes.set(node.id, node);
    if (!node.name.trim()) errors.push("Every element needs a name.");
    if (![node.x, node.y, node.width, node.height].every(Number.isFinite) || node.width <= 0 || node.height < nodeHeaderHeight(node)) {
      errors.push(`Element ${node.id} has invalid dimensions.`);
    }
    if (node.x < 0 || node.y < 0 || node.x + node.width > model.width || node.y + node.height > model.height) {
      errors.push(`Element ${node.id} is outside the diagram.`);
    }
  }
  for (const node of model.nodes) {
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
    if ([...(edge.waypoints ?? []), ...(edge.labelPosition ? [edge.labelPosition] : [])].some(({ x, y }) => !Number.isFinite(x) || !Number.isFinite(y))) {
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
  const start = anchor(source, sourceSide, edge.sourceOffset);
  const end = anchor(target, targetSide, edge.targetOffset);
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
  const vector = endVector(end, points.at(-2)!);
  const children: DiagramShape[] = [];
  const dashed = edge.kind === "dependency" || edge.kind === "realization";
  children.push(shape("polyline", {
    points: points.map(point).join(" "), fill: "none", stroke: ink, strokeWidth: 1.6,
    strokeLinejoin: "round", ...(dashed ? { strokeDasharray: "7 5" } : {}),
    "data-diagram-edge": edge.id, "data-edge-kind": edge.kind,
  }));
  if (edge.kind === "generalization" || edge.kind === "realization") {
    children.push(shape("polygon", { points: [end, vector(15, 8), vector(15, -8)].map(point).join(" "), fill: paper, stroke: ink, strokeWidth: 1.6, "data-arrowhead": "triangle", className: "qgd-arrow-paper" }));
  } else if (dashed || edge.kind === "navigationLink" || edge.kind === "processLink" || edge.directed) {
    children.push(shape("polyline", { points: [vector(11, 5), end, vector(11, -5)].map(point).join(" "), fill: "none", stroke: ink, strokeWidth: 1.6, "data-arrowhead": "open" }));
  }
  if (edge.kind === "composition" || edge.kind === "aggregation") {
    const fromStart = endVector(start, points[1]);
    children.push(shape("polygon", {
      points: [start, fromStart(9, 5), fromStart(18, 0), fromStart(9, -5)].map(point).join(" "),
      fill: edge.kind === "composition" ? ink : paper, stroke: ink, strokeWidth: 1.6,
      "data-arrowhead": edge.kind === "composition" ? "filled-diamond" : "hollow-diamond",
      className: edge.kind === "composition" ? "qgd-arrow-solid" : "qgd-arrow-paper",
    }));
  }
  const middle = edge.labelPosition ?? { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 - 10 };
  const label = edge.label ?? (edge.kind === "navigationLink" || edge.kind === "processLink" ? `«${edge.kind}»` : "");
  if (label) children.push(textAt(middle.x, middle.y, label, { textAnchor: "middle", fontSize: 12, paintOrder: "stroke", stroke: paper, strokeWidth: 5, strokeLinejoin: "round", className: "qgd-edge-label" }));
  if (edge.sourceMultiplicity) {
    const near = endVector(start, points[1])(25, -12);
    children.push(textAt(near.x, near.y, edge.sourceMultiplicity, { fontSize: 12, textAnchor: "middle" }));
  }
  if (edge.targetMultiplicity) {
    const near = vector(25, 12);
    children.push(textAt(near.x, near.y, edge.targetMultiplicity, { fontSize: 12, textAnchor: "middle" }));
  }
  return { tag: "g", attrs: { "data-relationship": edge.id }, children };
}

function nodeShapes(node: DiagramNode, active: boolean, container: boolean): DiagramShape {
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
    ...model.edges.map((edge) => edgeShapes(edge, nodes)),
    ...[...model.nodes].sort((a, b) => depth(a) - depth(b)).map((node) => nodeShapes(node, node.id === selectedId, parents.has(node.id))),
  ];
}

const xmlNames: Record<string, string> = {
  className: "class", strokeWidth: "stroke-width", strokeLinejoin: "stroke-linejoin", strokeDasharray: "stroke-dasharray",
  fontFamily: "font-family", fontSize: "font-size", fontStyle: "font-style", fontWeight: "font-weight", textAnchor: "text-anchor", paintOrder: "paint-order",
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
  const description = [model.description, ...model.nodes.map((node) => `${node.name}, ${nodeKeyword(node) || node.kind}: ${node.description} ${(node.compartments ?? []).flatMap((compartment) => compartment.entries).join("; ")}`), ...model.edges.map((edge) => `${byId.get(edge.source)!.name} to ${byId.get(edge.target)!.name}, ${edge.kind}: ${edge.description}`)].join(" ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${escapeXml(model.width)}" height="${escapeXml(model.height)}" viewBox="0 0 ${escapeXml(model.width)} ${escapeXml(model.height)}" role="img" aria-labelledby="diagram-title diagram-description"><title id="diagram-title">${escapeXml(model.name)}</title><desc id="diagram-description">${escapeXml(description)}</desc>${scene.map(serializeShape).join("")}</svg>`;
}
