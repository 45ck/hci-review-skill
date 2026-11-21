#!/usr/bin/env node
/** Static UI-literal gate. Uses the exact pure rules used by the browser review. */
import { readFileSync, readdirSync } from "node:fs";
import { resolve, relative, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseSync } from "rolldown/utils";
import { analyzeReviewSnapshot } from "../packages/liquid-glass/src/review/rules.ts";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const titleTag = /^h[1-6]$/;
const collapse = text => text.replace(/\s+/g, " ").trim();
const jsx = node => node?.type === "JSXElement";
const tag = node => node.openingElement.name.name ?? "";
function attribute(node, key) {
  const attr = node.openingElement.attributes.find(prop => prop.type === "JSXAttribute" && prop.name.name === key);
  if (!attr) return undefined;
  if (!attr.value) return true;
  if (attr.value.type === "Literal") return attr.value.value;
  const expression = attr.value.expression;
  if (expression?.type === "Literal") return expression.value;
  if (expression?.type === "TemplateLiteral" && !expression.expressions.length) return expression.quasis[0].value.cooked;
  return null;
}
function children(node) {
  const result = [];
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) result.push(...value.filter(item => item?.type));
    else if (value?.type) result.push(value);
  }
  return result;
}

/** Parse TSX without executing it. The installed Rolldown parser is shared with the contract gate. */
export function extractSourceSnapshot(source, filename = "fixture.tsx") {
  const parsed = parseSync(filename, source, { lang: "tsx" });
  if (parsed.errors.length) throw new Error(`Cannot parse ${filename}: ${parsed.errors.map(error => error.message).join("; ")}`);
  const parents = new WeakMap();
  const labels = [];
  function mapParents(node) {
    if (jsx(node) && tag(node) === "label") labels.push(node);
    for (const child of children(node)) { parents.set(child, node); mapParents(child); }
  }
  mapParents(parsed.program);
  const sdkButtons = new Set();
  for (const statement of parsed.program.body) {
    if (statement.type !== "ImportDeclaration" || statement.source.value !== "@ui-sdk/react/button") continue;
    for (const item of statement.specifiers) if (item.type === "ImportSpecifier" && item.imported.name === "Button") sdkButtons.add(item.local.name);
  }
  function excluded(node) {
    for (let current = node; current; current = parents.get(current)) {
      if (!jsx(current)) continue;
      for (const name of ["data-agent-secret", "data-agent-hidden", "data-quantive-review-root", "data-review-example", "hidden", "aria-hidden"]) {
        const value = attribute(current, name);
        if (value !== undefined && value !== false && value !== "false") return true;
      }
      const editable = attribute(current, "contentEditable");
      if (editable !== undefined && editable !== false && editable !== "false") return true;
      if (tag(current) === "input" && attribute(current, "type") === "password") return true;
    }
    return false;
  }
  function staticText(node) {
    if (node.type === "JSXText") return { text: node.value, dynamic: false };
    if (node.type === "JSXExpressionContainer") {
      const expression = node.expression;
      if (!expression || expression.type === "JSXEmptyExpression") return { text: "", dynamic: false };
      if (expression.type === "Literal" && ["string", "number"].includes(typeof expression.value)) return { text: String(expression.value), dynamic: false };
      if (expression.type === "TemplateLiteral" && !expression.expressions.length) return { text: expression.quasis[0].value.cooked, dynamic: false };
      return { text: "", dynamic: true };
    }
    if (!jsx(node) && node.type !== "JSXFragment") return { text: "", dynamic: true };
    if (jsx(node)) {
      if (excluded(node)) return { text: "", dynamic: false };
      if (/^(input|textarea|select|script|style|code|pre)$/.test(tag(node))) return { text: "", dynamic: false };
      if (tag(node) === "img") return { text: typeof attribute(node, "alt") === "string" ? attribute(node, "alt") : "", dynamic: attribute(node, "alt") === null };
      if (/^[A-Z]/.test(tag(node))) return { text: "", dynamic: true };
    }
    const parts = (node.children ?? []).map(staticText);
    return { text: collapse(parts.map(part => part.text).join(" ")), dynamic: parts.some(part => part.dynamic) };
  }
  const elements = [];
  let omittedDynamic = 0;
  let omittedExamples = 0;
  function identity(node) {
    const prefix = source.slice(0, node.start);
    return `${filename}:${prefix.split("\n").length}:${node.start - prefix.lastIndexOf("\n")}`;
  }
  function group(node) {
    for (let current = parents.get(node); current; current = parents.get(current)) if (jsx(current) && /^(section|article|nav|header)$/.test(tag(current))) return identity(current);
    return filename;
  }
  function visit(node) {
    if (jsx(node) && attribute(node, "data-review-example") !== undefined) { omittedExamples++; return; }
    if (jsx(node) && !excluded(node)) {
      const name = tag(node);
      const kind = titleTag.test(name) ? "heading" : name === "button" || sdkButtons.has(name) || (name === "a" && attribute(node, "href") !== undefined) ? "control" : name === "p" ? "prose" : null;
      if (kind) {
        const content = sdkButtons.has(name)
          ? (() => { const parts = (node.children ?? []).map(staticText); return { text: collapse(parts.map(p => p.text).join(" ")), dynamic: parts.some(p => p.dynamic) }; })()
          : staticText(node);
        const label = attribute(node, "aria-label");
        const labelledBy = attribute(node, "aria-labelledby");
        const spread = node.openingElement.attributes.some(prop => prop.type === "JSXSpreadAttribute");
        const elementId = attribute(node, "id");
        const associatedLabels = [];
        if (name === "button" || sdkButtons.has(name) && attribute(node, "render") === undefined) {
          for (const candidate of labels) {
            if (excluded(candidate)) continue;
            const target = attribute(candidate, "htmlFor") ?? attribute(candidate, "for");
            if (typeof elementId === "string" && target === elementId) associatedLabels.push(candidate);
          }
          for (let ancestor = parents.get(node); ancestor; ancestor = parents.get(ancestor)) {
            if (!jsx(ancestor) || tag(ancestor) !== "label") continue;
            const target = attribute(ancestor, "htmlFor") ?? attribute(ancestor, "for");
            if (target === undefined || typeof elementId === "string" && target === elementId) associatedLabels.push(ancestor);
            break;
          }
        }
        const labelParts = [...new Set(associatedLabels)].map(staticText);
        const associatedName = collapse(labelParts.map(part => part.text).join(" "));
        const uncertainLabel = labelParts.some(part => part.dynamic) || elementId === null;
        let renderTemplate = false;
        for (let ancestor = parents.get(node); ancestor && !jsx(ancestor); ancestor = parents.get(ancestor)) {
          if (ancestor.type === "JSXAttribute" && ancestor.name.name === "render") renderTemplate = true;
        }
        const known = !renderTemplate && !spread && label !== null && labelledBy === undefined
          && (typeof label === "string" && label.trim() || !uncertainLabel && (!content.dynamic || associatedName));
        if (!known || content.dynamic) omittedDynamic++;
        const entry = { id: identity(node), target: identity(node), kind, text: content.text, group: group(node), nameKnown: Boolean(known) };
        if (kind === "control") entry.name = typeof label === "string" && label.trim() ? label : associatedName || content.text || (typeof attribute(node, "title") === "string" ? attribute(node, "title") : "");
        if (kind === "heading") entry.level = Number(name[1]);
        // ID literals in separate functions/conditional branches do not prove
        // simultaneous DOM duplicates. The browser adapter checks actual IDs.
        const parent = parents.get(node);
        if (kind === "prose" && parent && (jsx(parent) || parent.type === "JSXFragment")) {
          const siblings = parent.children.filter(child => child.type !== "JSXText" || child.value.trim());
          const before = siblings[siblings.indexOf(node) - 1];
          if (before && jsx(before) && titleTag.test(tag(before))) entry.precedingHeadingId = identity(before);
        }
        if (kind === "control" || !content.dynamic) elements.push(entry);
      }
    }
    for (const child of children(node)) visit(child);
  }
  visit(parsed.program);
  return { source: "source", scope: filename, target: filename, viewport: { width: 0, height: 0 }, elements, omittedDynamic, omittedExamples };
}

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? files(path) : path.endsWith(".tsx") ? [path] : [];
  });
}
export function checkSemanticSources(paths) {
  return paths.map(path => {
    const snapshot = extractSourceSnapshot(readFileSync(path, "utf8"), relative(repo, path));
    return { ...analyzeReviewSnapshot(snapshot), sourceCoverage: { omittedDynamic: snapshot.omittedDynamic, omittedExamples: snapshot.omittedExamples } };
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const supplied = args.filter(arg => arg !== "--json");
  const paths = supplied.length ? supplied.map(path => resolve(path)) : [
    ...files(resolve(repo, "packages/liquid-glass/src")),
    ...files(resolve(repo, "docs/hci/examples/liquid-glass/src")),
  ];
  const reports = checkSemanticSources(paths);
  const findings = reports.flatMap(report => report.findings);
  const errors = findings.filter(finding => finding.severity === "error");
  if (args.includes("--json")) console.log(JSON.stringify({ mode: "static-literals", reports }, null, 2));
  else {
    console.log(`Semantic UI literals: ${paths.length} files, ${reports.reduce((sum, report) => sum + report.elementCount, 0)} observed elements, ${errors.length} errors, ${findings.length - errors.length} contextual/advisory findings.`);
    console.log(`Scope exclusions: ${reports.reduce((sum, report) => sum + report.sourceCoverage.omittedDynamic, 0)} unresolved dynamic candidates; ${reports.reduce((sum, report) => sum + report.sourceCoverage.omittedExamples, 0)} explicitly marked deliberate examples.`);
    for (const finding of errors) console.error(`${finding.target} [${finding.ruleId}] ${finding.evidence}`);
    console.log("Dynamic application copy, rendered states and layout require browser review. Advisory wording is not a build failure; contextual review remains separate.");
  }
  process.exitCode = errors.length ? 1 : 0;
}
