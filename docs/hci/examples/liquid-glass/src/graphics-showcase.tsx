import { useState } from "react";
import { LiquidGraphicStudio, type GraphicAsset, type GraphicChangeDetails, type GraphicDocument } from "@quantitative-hci/liquid-glass/graphics";
import { visualAssets } from "./visual-showcase";
import "@quantitative-hci/liquid-glass/graphics.css";
import "./graphics-showcase.css";

export const initialGraphicAssets: readonly GraphicAsset[] = visualAssets.map((asset) => ({
  id: asset.id, name: asset.title, src: asset.src, alt: asset.alt,
  width: asset.width, height: asset.height, provenance: asset.credit,
}));

export const initialGraphicDocument: GraphicDocument = {
  schemaVersion: 1,
  id: "material-studies",
  name: "Material studies",
  revision: 0,
  width: 1200,
  height: 800,
  background: "#f2f0eb",
  layers: [
    { id: "image", name: "Glass image", kind: "image", assetId: "glass-study", x: 480, y: 160, width: 660, height: 440, rotation: 0, opacity: 1, visible: true, locked: false, fit: "cover", radius: 28 },
    { id: "accent", name: "Edition label", kind: "shape", shape: "rectangle", x: 64, y: 100, width: 222, height: 44, rotation: 0, opacity: 1, visible: true, locked: false, fill: "#d6e6dc", radius: 22 },
    { id: "eyebrow", name: "Edition text", kind: "text", text: "STUDIO / 03", x: 86, y: 112, width: 184, height: 25, rotation: 0, opacity: 1, visible: true, locked: false, fontSize: 16, fontFamily: "monospace", fontWeight: 600, fill: "#285143", align: "left" },
    { id: "headline", name: "Headline", kind: "text", text: "Material\nstudies.", x: 64, y: 210, width: 416, height: 240, rotation: 0, opacity: 1, visible: true, locked: false, fontSize: 82, fontFamily: "serif", fontWeight: 400, fill: "#153a32", align: "left" },
    { id: "caption", name: "Caption", kind: "text", text: "The shape of light,\nmade tangible.", x: 68, y: 500, width: 350, height: 100, rotation: 0, opacity: 1, visible: true, locked: false, fontSize: 26, fontFamily: "sans-serif", fontWeight: 400, fill: "#44635c", align: "left" },
    { id: "footer", name: "Collection footer", kind: "text", text: "QUANTIVE  /  COLOUR, FORM & LIGHT", x: 68, y: 704, width: 800, height: 40, rotation: 0, opacity: 1, visible: true, locked: false, fontSize: 16, fontFamily: "monospace", fontWeight: 400, fill: "#44635c", align: "left" },
  ],
};

export interface GraphicsShowcaseProps {
  model?: GraphicDocument;
  assets?: readonly GraphicAsset[];
  onModelChange?: (model: GraphicDocument, details: GraphicChangeDetails) => void;
  onAssetsChange?: (assets: GraphicAsset[]) => void;
}

export function GraphicsShowcase({ model, assets, onModelChange, onAssetsChange }: GraphicsShowcaseProps) {
  const [localModel, setLocalModel] = useState(() => structuredClone(initialGraphicDocument));
  const [localAssets, setLocalAssets] = useState<readonly GraphicAsset[]>(initialGraphicAssets);
  const [selectedId, setSelectedId] = useState("headline");
  return <div className="qg-graphics-showcase" data-showcase="graphics">
    <div className="qg-graphics-intro"><div><span>Images & composition</span><h2>A studio you can work in.</h2></div><p>Arrange images, shape the typography, and save a direction. People and agents edit the same layers through the same controls.</p></div>
    <LiquidGraphicStudio model={model ?? localModel} assets={assets ?? localAssets} selectedId={selectedId} onSelectionChange={setSelectedId}
      onModelChange={(next, details) => { setLocalModel(next); onModelChange?.(next, details); }}
      onAssetsChange={(next) => { setLocalAssets(next); onAssetsChange?.(next); }} />
  </div>;
}
