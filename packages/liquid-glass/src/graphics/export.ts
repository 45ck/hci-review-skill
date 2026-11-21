import { graphicTextLines, isGraphicAssetSource, validateGraphicDocument } from "./model";
import type { GraphicAsset, GraphicDocument } from "./types";

const xml = (value: string | number) => {
  const text = String(value);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(text)) throw new Error("The SVG contains text that is not valid XML. Update its layer or asset description.");
  return text.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!);
};

export function graphicToSvg(document: GraphicDocument, assets: readonly GraphicAsset[]): string {
  const errors = validateGraphicDocument(document, assets);
  if (errors.length) throw new Error(errors.join(" "));
  const images = new Map(assets.map((asset) => [asset.id, asset]));
  const content = document.layers.filter((layer) => layer.visible).map((layer) => {
    const clip = `clip-${layer.id}`;
    const transform = `translate(${layer.x} ${layer.y}) rotate(${layer.rotation} ${layer.width / 2} ${layer.height / 2})`;
    let body = "";
    if (layer.kind === "image") {
      const asset = images.get(layer.assetId)!;
      body = `<defs><clipPath id="${xml(clip)}"><rect width="${layer.width}" height="${layer.height}" rx="${layer.radius}"/></clipPath></defs><image width="${layer.width}" height="${layer.height}" href="${xml(asset.src)}" preserveAspectRatio="xMidYMid ${layer.fit === "cover" ? "slice" : "meet"}" clip-path="url(#${xml(clip)})"><title>${xml(asset.alt)}</title></image>`;
    } else if (layer.kind === "shape") {
      body = layer.shape === "ellipse" ? `<ellipse cx="${layer.width / 2}" cy="${layer.height / 2}" rx="${layer.width / 2}" ry="${layer.height / 2}" fill="${xml(layer.fill)}"/>` : `<rect width="${layer.width}" height="${layer.height}" rx="${layer.radius}" fill="${xml(layer.fill)}"/>`;
    } else {
      const x = layer.align === "left" ? 0 : layer.align === "center" ? layer.width / 2 : layer.width;
      const anchor = layer.align === "left" ? "start" : layer.align === "center" ? "middle" : "end";
      const lines = graphicTextLines(layer);
      body = `<defs><clipPath id="${xml(clip)}"><rect width="${layer.width}" height="${layer.height}"/></clipPath></defs><text font-family="${layer.fontFamily}" font-size="${layer.fontSize}" font-weight="${layer.fontWeight}" fill="${xml(layer.fill)}" text-anchor="${anchor}" clip-path="url(#${xml(clip)})">${lines.map((line, index) => `<tspan x="${x}" y="${layer.fontSize + index * layer.fontSize * 1.18}">${xml(line)}</tspan>`).join("")}</text>`;
    }
    return `<g id="${xml(layer.id)}" opacity="${layer.opacity}" transform="${transform}"><title>${xml(layer.name)}</title>${body}</g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${document.width}" height="${document.height}" viewBox="0 0 ${document.width} ${document.height}"><title>${xml(document.name)}</title><desc>Editable composition exported from Quantive. Custom component: Unvalidated. Revision ${document.revision}.</desc><rect width="${document.width}" height="${document.height}" fill="${xml(document.background)}"/>${content}</svg>`;
}

export async function graphicToStandaloneSvg(document: GraphicDocument, assets: readonly GraphicAsset[]): Promise<string> {
  const errors = validateGraphicDocument(document, assets);
  if (errors.length) throw new Error(errors.join(" "));
  const used = new Set(document.layers.flatMap((layer) => layer.kind === "image" && layer.visible ? [layer.assetId] : []));
  const embedded = await Promise.all(assets.map(async (asset) => {
    if (!used.has(asset.id) || asset.src.startsWith("data:")) return asset;
    if (!isGraphicAssetSource(asset.src)) throw new Error("The graphic contains an unsupported image source.");
    const response = await fetch(asset.src, { credentials: "same-origin" });
    if (!response.ok) throw new Error(`Could not load ${asset.name} for SVG export.`);
    const blob = await response.blob();
    if (!["image/png", "image/jpeg", "image/webp"].includes(blob.type) || blob.size < 1 || blob.size > 5_000_000) throw new Error(`${asset.name} must be a PNG, JPEG or WebP of at most 5 MB.`);
    const src = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error(`Could not embed ${asset.name}.`));
      reader.readAsDataURL(blob);
    });
    return { ...asset, src };
  }));
  return graphicToSvg(document, embedded);
}
