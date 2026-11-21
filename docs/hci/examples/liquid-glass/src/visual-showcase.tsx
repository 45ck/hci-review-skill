import { useState } from "react";
import {
  LiquidImageCard,
  LiquidImageComparison,
  LiquidMediaGallery,
  type LiquidMediaAsset,
} from "@quantitative-hci/liquid-glass/media";
import { ValidationBadge } from "@quantitative-hci/liquid-glass/validation";
import "@quantitative-hci/liquid-glass/media.css";
import "./visual-showcase.css";

export const visualAssets: readonly LiquidMediaAsset[] = [
  {
    id: "emerald-coast",
    title: "Emerald coast",
    src: "/media/emerald-coast.webp",
    srcSet: "/media/emerald-coast-small.webp 600w, /media/emerald-coast.webp 1200w",
    alt: "Aerial view of clear emerald water beside pale limestone cliffs and a forested coastline.",
    description: "A quiet fictional coastline, with warm limestone, deep green forest, and layers of translucent water. A landscape direction for travel stories, collections, and immersive editorial cards.",
    kind: "Landscape",
    width: 1200,
    height: 800,
    credit: "Original AI-generated artwork for Quantive. Fictional scene; not a documented location.",
  },
  {
    id: "glass-study",
    title: "Glass study",
    src: "/media/glass-study.webp",
    srcSet: "/media/glass-study-small.webp 600w, /media/glass-study.webp 1200w",
    alt: "A lavender glass ring, emerald rounded cube, and clear blue hemisphere casting caustic light on a lilac plinth.",
    description: "An editorial still life exploring thickness, tint, and light through three glass objects. A product-image direction for feature cards, material libraries, and visual browsing.",
    kind: "Studio",
    width: 1200,
    height: 800,
    credit: "Original AI-generated artwork for Quantive. The artwork depicts glass; interactive UI material is rendered separately.",
  },
  {
    id: "quiet-pavilion",
    title: "Quiet pavilion",
    src: "/media/quiet-pavilion.webp",
    srcSet: "/media/quiet-pavilion-small.webp 600w, /media/quiet-pavilion.webp 1200w",
    alt: "Three sunlit travertine arches frame an olive tree above a shallow reflecting pool.",
    description: "A fictional pavilion built from warm stone, repeating arches, and reflected light. An architectural direction for project portfolios, case studies, and collection covers.",
    kind: "Architecture",
    width: 1200,
    height: 800,
    credit: "Original AI-generated artwork for Quantive. Fictional architecture; not a documented building.",
  },
];

export function VisualShowcase() {
  const [selectedId, setSelectedId] = useState(visualAssets[0].id);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [reveal, setReveal] = useState(50);

  return (
    <div className="qg-visual-showcase" data-showcase="visual">
      <div className="qg-visual-intro">
        <div><span className="qg-media-eyebrow">Images, stories & collections</span><h2>Give content room to shine.</h2></div>
        <p>Explore original imagery in an editorial card, a browsable gallery, and a reveal comparison. Every interaction is available through the same UI SDK controls for people and agents.</p>
      </div>
      <LiquidImageCard asset={visualAssets[0]} headline="A quieter kind of discovery." summary="An image leads. A short story adds context. A clear action opens the details, while the glass surface keeps the interface close." />
      <div className="qg-visual-grid">
        <LiquidMediaGallery
          assets={visualAssets}
          selectedId={selectedId}
          onSelectedIdChange={setSelectedId}
          savedIds={savedIds}
          onSavedChange={(id, saved) => setSavedIds((current) => saved ? [...new Set([...current, id])] : current.filter((value) => value !== id))}
        />
        <LiquidImageComparison before={visualAssets[0]} after={visualAssets[2]} beforeLabel="Landscape" afterLabel="Architecture" label="Landscape reveal" value={reveal} onValueChange={setReveal} />
      </div>
      <aside className="qg-visual-footnote"><ValidationBadge /><p>These custom compositions have not been reviewed or approved by a human UI/UX team. Their controls use the SDK foundation. Artwork is generated demo content; saved choices last for this visit to this section.</p></aside>
    </div>
  );
}
