import type { DiagramNode } from "./types";
import type { DiagramShape } from "./scene";

const ink = "#304c60";
const paper = "#fcfefd";
const text = (x: number, y: number, value: string, attrs: DiagramShape["attrs"] = {}): DiagramShape => ({
  tag: "text", attrs: { x, y, fill: ink, fontFamily: "Arial, sans-serif", fontSize: 14, ...attrs }, text: value,
});
const item = (tag: DiagramShape["tag"], attrs: DiagramShape["attrs"]): DiagramShape => ({ tag, attrs });
const compact = (value: string, width: number) => {
  const letters = Array.from(value), limit = Math.floor(width / 7.2);
  return letters.length > limit ? letters.slice(0, Math.max(1, limit - 1)).join("") + "…" : value;
};
const wrap = (value: string, width: number, limit: number) => {
  const max = Math.max(10, Math.floor(width / 7.2)), lines: string[] = [];
  for (const word of value.split(/\s+/)) {
    const previous = lines.at(-1);
    if (previous !== undefined && previous.length + word.length + 1 <= max) lines[lines.length - 1] = `${previous} ${word}`;
    else lines.push(word);
  }
  return lines.slice(0, limit).map((value, index) => compact(index === limit - 1 && lines.length > limit ? `${value}…` : value, width));
};

export function specialNodeShapes(node: DiagramNode, active: boolean): DiagramShape[] | null {
  const w = node.width, h = node.height;
  const border = { stroke: active ? "#176a69" : ink, strokeWidth: active ? 2.5 : 1.5, fill: active ? "#e3f1ed" : paper, className: "qgd-node-box" };
  const line = { stroke: ink, strokeWidth: 1.5, fill: "none" };
  const label = (y = h / 2 + 5, width = w - 26) => text(w / 2, y, compact(node.name, width), { textAnchor: "middle", fontWeight: 600 });
  const externalLabel = (offset = 23) => text(w / 2, h + offset, node.name, { textAnchor: "middle", paintOrder: "stroke", stroke: paper, strokeWidth: 4, className: "qgd-edge-label" });
  const keyword = () => node.stereotype ? text(w / 2, 22, "«" + node.stereotype + "»", { textAnchor: "middle", fontSize: 12 }) : null;
  const head = (): DiagramShape[] => [item("line", { x1: 0, y1: 48, x2: w, y2: 48, ...line }), label(30)];
  const values = (): DiagramShape[] => (node.compartments ?? []).flatMap(group => group.entries).map((value, i) => text(16, 76 + i * 23, compact(value, w - 32), { fontSize: 13, fontFamily: "ui-monospace, monospace" }));
  let shapes: DiagramShape[];
  switch (node.kind) {
    case "c4Boundary": case "c4Deployment": {
      const deployment = node.kind === "c4Deployment";
      shapes = deployment
        ? [item("path", { d: `M 0 14 L 16 0 H ${w} V ${h - 14} L ${w - 16} ${h} H 0 Z M 0 14 H ${w - 16} L ${w} 0 M ${w - 16} 14 V ${h}`, ...border, fill: "#f1f6f5" })]
        : [item("rect", { x: 0, y: 0, width: w, height: h, rx: 4, ...border, fill: "#f3f8f7", strokeDasharray: "8 5" })];
      shapes.push(text(18, deployment ? 36 : 25, compact(node.name, w - 48), { fontWeight: 700, fontSize: 15 }),
        text(18, deployment ? 55 : 47, `[${node.architecture?.type ?? "Software System"}]`, { fontSize: 11 }));
      if (node.architecture?.technology) shapes.push(text(18, deployment ? 74 : 66, compact(node.architecture.technology, w - 48), { fontSize: 11 }));
      break;
    }
    case "c4Person": case "c4Element": case "c4Database": {
      const person = node.kind === "c4Person", database = node.kind === "c4Database";
      const top = person ? 40 : database ? 22 : 0;
      const fill = node.architecture?.external ? "#edf0f3" : "#e7f2ef";
      if (person) shapes = [item("circle", { cx: w / 2, cy: 24, r: 22, ...border, fill }), item("path", { d: `M 0 ${top + 20} Q 0 ${top} 22 ${top} H ${w - 22} Q ${w} ${top} ${w} ${top + 20} V ${h} H 0 Z`, ...border, fill })];
      else if (database) shapes = [item("path", { d: `M 0 18 C 0 -6 ${w} -6 ${w} 18 V ${h - 18} C ${w} ${h + 6} 0 ${h + 6} 0 ${h - 18} Z`, ...border, fill }), item("path", { d: `M 0 18 C 0 42 ${w} 42 ${w} 18`, ...line })];
      else shapes = [item("rect", { x: 0, y: 0, width: w, height: h, rx: 7, ...border, fill })];
      shapes.push(text(w / 2, top + 27, compact(node.name, w - 28), { textAnchor: "middle", fontWeight: 700, fontSize: 15 }),
        text(w / 2, top + 47, `[${node.architecture?.type ?? "Software System"}${node.architecture?.external ? " · external" : ""}]`, { textAnchor: "middle", fontSize: 11 }));
      if (node.architecture?.technology) shapes.push(text(w / 2, top + 65, compact(node.architecture.technology, w - 28), { textAnchor: "middle", fontSize: 11 }));
      const descriptionY = top + (node.architecture?.technology ? 88 : 72);
      shapes.push(...wrap(node.description, w - 30, Math.max(1, Math.floor((h - descriptionY - 8) / 18) + 1)).map((line, index) => text(w / 2, descriptionY + index * 18, line, { textAnchor: "middle", fontSize: 12 })));
      break;
    }
    case "comment":
      shapes = [item("path", { d: `M 0 0 H ${w - 18} L ${w} 18 V ${h} H 0 Z M ${w - 18} 0 V 18 H ${w}`, ...border, fill: "#fffcf1" }),
        text(w / 2, 21, node.stereotype ? `«${node.stereotype}»` : node.name, { textAnchor: "middle", fontSize: 12 }),
        ...wrap(node.description, w - 30, Math.max(1, Math.floor((h - 32) / 19))).map((line, index) => text(15, 44 + index * 19, line, { fontSize: 12 }))];
      break;
    case "actor":
      shapes = [item("circle", { cx: w / 2, cy: 17, r: 12, ...border }),
        item("path", { d: "M " + w / 2 + " 29 V 61 M 12 42 H " + (w - 12) + " M " + w / 2 + " 61 L 16 85 M " + w / 2 + " 61 L " + (w - 16) + " 85", ...line }), label(h - 8)];
      break;
    case "useCase": case "role":
      shapes = [item("ellipse", { cx: w / 2, cy: h / 2, rx: w / 2, ry: h / 2, ...border }), label(node.stereotype ? h / 2 + 14 : h / 2 + 5)];
      if (node.kind === "useCase" && node.stereotype) shapes.push(text(w / 2, h / 2 - 8, `«${node.stereotype}»`, { textAnchor: "middle", fontSize: 12 }));
      break;
    case "initial":
      shapes = [item("circle", { cx: w / 2, cy: h / 2, r: Math.min(w, h) / 2 - 2, ...border, fill: ink, className: "qgd-arrow-solid" }), externalLabel()];
      break;
    case "final":
      shapes = [item("circle", { cx: w / 2, cy: h / 2, r: Math.min(w, h) / 2 - 2, ...border }), item("circle", { cx: w / 2, cy: h / 2, r: Math.min(w, h) / 2 - 7, fill: ink, className: "qgd-arrow-solid" }), externalLabel()];
      break;
    case "startEvent": case "endEvent": case "eventListener": case "ifmlEvent":
      shapes = [item("circle", { cx: w / 2, cy: h / 2, r: Math.min(w, h) / 2 - 2, ...border, strokeWidth: node.kind === "endEvent" ? 4 : border.strokeWidth, ...(node.marker === "filled" ? { fill: ink, className: "qgd-arrow-solid" } : {}) }), externalLabel()];
      if (node.kind === "eventListener") shapes.push(item("circle", { cx: w / 2, cy: h / 2, r: Math.min(w, h) / 2 - 7, ...line }));
      if (node.marker && node.marker !== "filled") shapes.push(text(w / 2, h / 2 + 5, node.marker, { textAnchor: "middle", fontWeight: 700 }));
      break;
    case "decision": case "merge": case "gateway": case "criterion":
      shapes = [item("polygon", { points: w / 2 + ",0 " + w + "," + h / 2 + " " + w / 2 + "," + h + " 0," + h / 2, ...border, ...(node.marker === "exit" ? { fill: ink, className: "qgd-arrow-solid" } : {}) })];
      if (node.kind === "criterion") shapes.push(externalLabel(33));
      else if (node.kind !== "merge") shapes.push(text(w / 2, -11, node.name, { textAnchor: "middle" }));
      if (node.kind === "gateway") shapes.push(text(w / 2, h / 2 + 7, node.marker || "×", { fontSize: 25, textAnchor: "middle", fontWeight: 700 }));
      break;
    case "fork":
      shapes = [item("rect", { x: 0, y: 0, width: w, height: h, ...border, fill: ink, className: "qgd-arrow-solid" })];
      break;
    case "activity": case "task": case "state": case "milestone": case "ifmlViewComponent":
      shapes = [item("rect", { x: 0, y: 0, width: w, height: h, rx: node.kind === "milestone" ? h / 2 : node.kind === "state" ? 18 : 12, ...border, ...(node.discretionary ? { strokeDasharray: "7 4" } : {}) })];
      if (node.compartments?.length) {
        if (node.stereotype && ["activity", "state"].includes(node.kind)) shapes.push(item("line", { x1: 0, y1: 58, x2: w, y2: 58, ...line }), label(41), ...values());
        else shapes.push(...head(), ...values());
      } else shapes.push(label(node.stereotype && ["activity", "state"].includes(node.kind) ? h / 2 + 14 : h / 2 + 5));
      if (node.stereotype && ["activity", "state"].includes(node.kind)) shapes.push(text(w / 2, node.compartments?.length ? 17 : h / 2 - 9, `«${node.stereotype}»`, { textAnchor: "middle", fontSize: 12 }));
      if (node.constraints?.length) shapes.push(text(w / 2, h - 13, compact(`{${node.constraints.join(", ")}}`, w - 26), { textAnchor: "middle", fontSize: 11 }));
      if (node.marker) shapes.push(text(node.marker === "!" ? w / 2 : 15, h - 10, node.marker, { fontSize: 15, fontWeight: 700, ...(node.marker === "!" ? { textAnchor: "middle" } : {}) }));
      break;
    case "objectNode":
      shapes = [item("rect", { x: 0, y: 0, width: w, height: h, ...border }), label()];
      break;
    case "object": case "part":
      shapes = [item("rect", { x: 0, y: 0, width: w, height: h, ...border }), item("line", { x1: 0, y1: 46, x2: w, y2: 46, ...line }), text(w / 2, 28, compact(node.name, w - 24), { textAnchor: "middle", fontWeight: 600, ...(node.kind === "object" ? { textDecoration: "underline" } : {}) }), ...values()];
      break;
    case "ifmlViewContainer":
      shapes = [item("rect", { x: 0, y: 0, width: w, height: h, ...border }), ...head()];
      break;
    case "package": case "casePlan":
      shapes = [item("path", { d: "M 0 26 V 0 H " + Math.min(w * .6, 180) + " V 26 H " + w + " V " + h + " H 0 Z", ...border }), label(58)];
      if (node.stereotype) shapes.push(text(12, 18, "«" + node.stereotype + "»", { fontSize: 12 }));
      break;
    case "artifact":
      shapes = [item("path", { d: "M 0 0 H " + (w - 20) + " L " + w + " 20 V " + h + " H 0 Z M " + (w - 20) + " 0 V 20 H " + w, ...border }), text(w / 2, 25, "«artifact»", { textAnchor: "middle", fontSize: 12 }), label(49), ...values()];
      break;
    case "device":
      shapes = [item("path", { d: "M 0 16 L 20 0 H " + w + " V " + (h - 16) + " L " + (w - 20) + " " + h + " H 0 Z M 0 16 H " + (w - 20) + " L " + w + " 0 M " + (w - 20) + " 16 V " + h, ...border }), text((w - 20) / 2, 40, "«" + (node.stereotype || "device") + "»", { textAnchor: "middle", fontSize: 12 }), text((w - 20) / 2, 63, compact(node.name, w - 50), { textAnchor: "middle", fontWeight: 600 })];
      break;
    case "lifeline":
      shapes = [item("rect", { x: 0, y: 0, width: w, height: 48, ...border }), label(29), item("line", { x1: w / 2, y1: 48, x2: w / 2, y2: h, ...line, strokeDasharray: "6 5" })];
      for (const activation of node.activations ?? []) shapes.push(item("rect", { x: w / 2 - 7, y: activation.y, width: 14, height: activation.height, ...border }));
      break;
    case "interaction":
      shapes = [item("rect", { x: 0, y: 0, width: w, height: h, ...border }), item("path", { d: "M 0 28 H 54 L 66 16 V 0", ...line }), text(12, 19, node.marker || "ref", { fontSize: 12 }), label(h / 2 + 12)];
      break;
    case "timing": {
      const mid = Math.round(h / 2), a = Math.round(w * .28), b = Math.round(w * .7);
      shapes = [item("rect", { x: 0, y: 0, width: w, height: h, ...border }), label(28), text(13, 65, "active", { fontSize: 12 }), text(13, mid + 46, "idle", { fontSize: 12 }),
        item("path", { d: "M 80 " + (mid + 40) + " H " + a + " V 62 H " + b + " V " + (mid + 40) + " H " + (w - 20), ...line, strokeWidth: 2.2 }),
        item("line", { x1: 80, y1: h - 30, x2: w - 20, y2: h - 30, ...line }), text(80, h - 10, "0", { fontSize: 12 }), text(w - 70, h - 10, "time →", { fontSize: 12 })];
      break;
    }
    case "port":
      shapes = [item("rect", { x: 0, y: 0, width: w, height: h, ...border })];
      if (node.stereotype) shapes.push(text(w + 12, h + 6, node.name, { fontSize: 12 }), text(w + 12, h + 24, `«${node.stereotype}»`, { fontSize: 11 }));
      else shapes.push(externalLabel());
      break;
    case "pool":
      shapes = [item("rect", { x: 0, y: 0, width: w, height: h, ...border, fill: "#f5f9f8" }), item("line", { x1: 42, y1: 0, x2: 42, y2: h, ...line }), text(0, 0, node.name, { transform: "translate(26 " + h / 2 + ") rotate(-90)", textAnchor: "middle", fontWeight: 600 })];
      break;
    case "dmnDecision":
      shapes = [item("rect", { x: 0, y: 0, width: w, height: h, ...border }), label()];
      break;
    case "inputData":
      shapes = [item("rect", { x: 0, y: 0, width: w, height: h, rx: h / 2, ...border }), label()];
      break;
    case "businessKnowledge":
      shapes = [item("polygon", { points: "18,0 " + w + ",0 " + w + "," + (h - 18) + " " + (w - 18) + "," + h + " 0," + h + " 0,18", ...border }), label()];
      break;
    case "knowledgeSource":
      shapes = [item("path", { d: "M 0 0 H " + w + " V " + (h - 14) + " C " + w * .66 + " " + (h - 36) + " " + w * .34 + " " + (h + 9) + " 0 " + (h - 14) + " Z", ...border }), label(h / 2)];
      break;
    case "stage": case "ifmlAction":
      shapes = [item("polygon", { points: "16,0 " + (w - 16) + ",0 " + w + ",16 " + w + "," + (h - 16) + " " + (w - 16) + "," + h + " 16," + h + " 0," + (h - 16) + " 0,16", ...border })];
      if (node.kind === "ifmlAction") shapes = [item("polygon", { points: "18,0 " + (w - 18) + ",0 " + w + "," + h / 2 + " " + (w - 18) + "," + h + " 18," + h + " 0," + h / 2, ...border })];
      shapes.push(label(node.kind === "stage" ? 29 : h / 2 + 5));
      if (node.kind === "stage") {
        shapes.push(item("rect", { x: w / 2 - 8, y: h - 22, width: 16, height: 16, ...border }));
        shapes.push(item("line", { x1: w / 2 - 4, y1: h - 14, x2: w / 2 + 4, y2: h - 14, ...line }));
        if (node.marker === "+") shapes.push(item("line", { x1: w / 2, y1: h - 18, x2: w / 2, y2: h - 10, ...line }));
      }
      break;
    case "planningTable":
      shapes = [item("rect", { x: 0, y: 0, width: w, height: h, ...border }),
        item("line", { x1: 0, y1: h / 2, x2: w, y2: h / 2, ...line }),
        item("line", { x1: w / 3, y1: 0, x2: w / 3, y2: h, ...line }),
        item("line", { x1: w * 2 / 3, y1: 0, x2: w * 2 / 3, y2: h, ...line }),
        item("line", { x1: w / 2 - 3, y1: h * .75, x2: w / 2 + 3, y2: h * .75, ...line })];
      if (node.marker === "+") shapes.push(item("line", { x1: w / 2, y1: h * .75 - 3, x2: w / 2, y2: h * .75 + 3, ...line }));
      break;
    case "valueProposition":
      shapes = [item("rect", { x: 0, y: 0, width: w, height: h, ...border }), externalLabel()];
      break;
    case "table": {
      const data = node.table;
      if (!data) return null;
      const rowHeight = (h - 52) / (data.rows.length + 1);
      const decisionTable = data.inputColumnCount !== undefined;
      const ruleWidth = Math.min(64, w / data.columns.length);
      const widths = data.columns.map((_, column) => decisionTable ? column === 0 ? ruleWidth : (w - ruleWidth) / (data.columns.length - 1) : w / data.columns.length);
      const starts = widths.map((_, column) => widths.slice(0, column).reduce((sum, width) => sum + width, 0));
      shapes = [item("rect", { x: 0, y: 0, width: w, height: h, ...border }), label(29)];
      for (let row = 0; row <= data.rows.length + 1; row++) {
        const y = 52 + row * rowHeight;
        const offsets = decisionTable && row === 1 ? [-1.5, 1.5] : [0];
        for (const offset of offsets) shapes.push(item("line", { x1: 0, y1: y + offset, x2: w, y2: y + offset, ...line, ...(offset ? { "data-dmn-separator": "clauses-entries" } : {}) }));
      }
      for (let column = 1; column < data.columns.length; column++) {
        const offsets = decisionTable && column === 1 + data.inputColumnCount! ? [-1.5, 1.5] : [0];
        for (const offset of offsets) shapes.push(item("line", { x1: starts[column] + offset, y1: 52, x2: starts[column] + offset, y2: h, ...line, ...(offset ? { "data-dmn-separator": "inputs-outputs" } : {}) }));
      }
      const headers = decisionTable ? [data.hitPolicy || "U", ...data.columns.slice(1)] : data.columns;
      [headers, ...data.rows].forEach((row, rowIndex) => row.forEach((value, column) => shapes.push(text(starts[column] + 12, 52 + (rowIndex + .5) * rowHeight + 5, compact(value, widths[column] - 24), { fontSize: 13, ...(rowIndex === 0 ? { fontWeight: 700 } : {}), ...(decisionTable && rowIndex === 0 && column === 0 ? { "data-dmn-hit-policy": value } : {}) }))));
      if (data.hitPolicy && !decisionTable) shapes.push(text(12, 29, data.hitPolicy, { fontWeight: 700 }));
      break;
    }
    default: return null;
  }
  const mark = keyword();
  if (mark && ["task", "dmnDecision", "role"].includes(node.kind)) shapes.push(mark);
  return [{ tag: "title", attrs: {}, text: node.name }, ...shapes];
}
