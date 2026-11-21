import { analyzeReviewSnapshot } from "./rules";
import type { ReviewElement, ReviewReport } from "./rules";

const privateSelector = '[data-quantive-review-root], [data-agent-secret]:not([data-agent-secret="false"]), [data-agent-hidden]:not([data-agent-hidden="false"]), input[type="password"], [contenteditable]:not([contenteditable="false"])';
const controlSelector = 'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="combobox"], [role="slider"], [role="spinbutton"], [role="textbox"], [role="tab"], [role="menuitem"]';
const contentSelector = `h1,h2,h3,h4,h5,h6,[role="heading"],p,${controlSelector}`;

function isPrivate(element: Element): boolean { return Boolean(element.closest(privateSelector)); }

function textExcluded(element: Element, root: HTMLElement): boolean {
  if (isPrivate(element)) return true;
  // A modal dev drawer can make this entire region inert/aria-hidden. Neither means
  // its painted layout disappeared. Real hidden descendants still stay excluded.
  for (let node: Element | null = element; node; node = node.parentElement) {
    if (node.hasAttribute("hidden")) return true;
    if (node !== root && !node.contains(root) && node.getAttribute("aria-hidden") === "true") return true;
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse" || style.opacity === "0") return true;
  }
  return false;
}

function visible(element: Element, root: HTMLElement): boolean {
  if (textExcluded(element, root)) return false;
  const rect = element.getBoundingClientRect();
  return element.getClientRects().length > 0 && rect.width > 2 && rect.height > 2;
}

function safeText(element: Element, root: HTMLElement): string {
  if (textExcluded(element, root) || element.matches("input,textarea,select,script,style,pre,code")) return "";
  const pieces: string[] = [];
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) pieces.push(node.textContent ?? "");
    else if (node instanceof Element) pieces.push(safeText(node, root));
  }
  return pieces.join(" ").replace(/\s+/g, " ").trim().slice(0, 1200);
}

function nameOf(element: Element, root: HTMLElement): { name: string; known: boolean } {
  const named = (name: string) => ({ name, known: true });
  const unresolved = () => ({ name: "", known: false });
  const refs = element.getAttribute("aria-labelledby")?.trim().split(/\s+/).filter(Boolean) ?? [];
  const targets = refs.map(id => element.ownerDocument.getElementById(id));
  // The browser can legitimately use a hidden referenced label. Respect the
  // review's exclusion boundary without declaring that live control unnamed.
  if (targets.some(target => !target || textExcluded(target, root))) return unresolved();
  const referenced = targets.map(target => safeText(target!, root)).join(" ").trim();
  if (referenced) return named(referenced);
  if (element.getAttribute("aria-label")?.trim()) return named(element.getAttribute("aria-label")!.trim());
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement || element instanceof HTMLButtonElement) {
    const targets = [...(element.labels ?? [])];
    if (targets.some(target => textExcluded(target, root))) return unresolved();
    const labels = targets.map(target => safeText(target, root)).join(" ").trim();
    if (labels) return named(labels);
    if (element instanceof HTMLInputElement && ["submit", "reset"].includes(element.type)) return named(element.type === "submit" ? "Submit" : "Reset");
  }
  const text = safeText(element, root);
  if (text) return named(text);
  const image = element.querySelector("img[alt]");
  if (image && !textExcluded(image, root) && image.getAttribute("alt")?.trim()) return named(image.getAttribute("alt")!.trim());
  return named(element.getAttribute("title")?.trim() ?? "");
}

function selector(element: Element): string {
  const path: string[] = [];
  for (let node: Element | null = element; node; node = node.parentElement) {
    if (node.id && node.ownerDocument.querySelectorAll(`#${CSS.escape(node.id)}`).length === 1) {
      path.unshift(`#${CSS.escape(node.id)}`); break;
    }
    const tag = node.localName;
    const siblings = node.parentElement ? [...node.parentElement.children].filter(sibling => sibling.localName === tag) : [node];
    path.unshift(`${tag}:nth-of-type(${siblings.indexOf(node) + 1})`);
    if (tag === "body") break;
  }
  return path.join(" > ");
}

/** Inspect the current rendered region without reading field values or changing the page. */
export function scanReview(root: HTMLElement): ReviewReport {
  if (!root.isConnected) throw new Error("Choose a connected rendered region for review.");
  if (!visible(root, root)) throw new Error("The chosen review region is hidden or has no painted area. Choose a visible region.");
  const rootTarget = selector(root);
  const bounds = root.getBoundingClientRect();
  const elements: ReviewElement[] = [];
  const nodes = [...(root.matches(contentSelector) ? [root] : []), ...root.querySelectorAll(contentSelector)];
  const headingIds = new Map<Element, string>();
  let omittedElements = 0;
  for (const node of nodes) {
    if (!visible(node, root)) continue;
    if (elements.length >= 1000) { omittedElements++; continue; }
    const tag = node.localName;
    const kind = /^h[1-6]$/.test(tag) || node.getAttribute("role") === "heading" ? "heading" : node.matches(controlSelector) ? "control" : "prose";
    const target = selector(node);
    const rect = node.getBoundingClientRect();
    let scrollX = 0, scrollY = 0;
    for (let ancestor = node.parentElement; ancestor && root.contains(ancestor); ancestor = ancestor.parentElement) {
      scrollX += ancestor.scrollLeft; scrollY += ancestor.scrollTop;
      if (ancestor === root) break;
    }
    const section = node.closest('section,article,nav,[role="region"],[data-review-scope]');
    const element: ReviewElement = { id: target, target, kind, text: safeText(node, root),
      group: section && root.contains(section) ? selector(section) : rootTarget,
      width: Math.round(rect.width * 2) / 2, height: Math.round(rect.height * 2) / 2,
      x: Math.round(rect.left - bounds.left + scrollX), y: Math.round(rect.top - bounds.top + scrollY) };
    if (node.id) element.domId = node.id;
    if (kind === "heading") {
      element.level = /^h[1-6]$/.test(tag) ? Number(tag[1]) : Number(node.getAttribute("aria-level")) || undefined;
      headingIds.set(node, element.id);
    }
    if (kind === "control") {
      const name = nameOf(node, root);
      element.name = name.name;
      element.nameKnown = name.known;
      element.checkTargetSize = !(tag === "a" && node.closest("p,li"));
      // A select's option text is content, not its accessible name. User-entered
      // field values never enter text, evidence or the snapshot fingerprint.
      if (["input", "select", "textarea"].includes(tag)) element.text = "";
    }
    if (kind === "prose") {
      const preceding = node.previousElementSibling;
      if (preceding && headingIds.has(preceding)) element.precedingHeadingId = headingIds.get(preceding);
    }
    elements.push(element);
  }
  return analyzeReviewSnapshot({ source: "dom", scope: root.getAttribute("data-review-scope") || root.getAttribute("aria-label") || root.id || "Current page",
    target: rootTarget, viewport: { width: window.innerWidth, height: window.innerHeight }, elements,
    overflowPixels: Math.max(0, root.scrollWidth - root.clientWidth), omittedElements });
}
