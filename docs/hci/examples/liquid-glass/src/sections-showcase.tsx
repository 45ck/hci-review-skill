import { useState } from "react";
import { Button } from "@ui-sdk/react/button";
import { Field, FieldLabel } from "@ui-sdk/react/field";
import { Switch, SwitchThumb } from "@ui-sdk/react/switch";
import {
  SegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from "@ui-sdk/react/segmented-control";
import {
  LiquidChapterSection,
  LiquidReveal,
  LiquidSection,
  LiquidSectionContour,
  LiquidShowcaseSection,
  type LiquidChapter,
} from "@quantitative-hci/liquid-glass/sections";
import "@quantitative-hci/liquid-glass/sections.css";
import "./sections-showcase.css";

const chapters: readonly LiquidChapter[] = [
  {
    id: "place", label: "Place", title: "Start with a place.",
    content: <><p>A wide view establishes where the story happens. Let the image answer that first question, then add the detail someone needs to continue.</p><p>This fictional coastline introduces the setting without asking the reader to decode a diagram.</p></>,
    media: <img src="/media/emerald-coast.webp" srcSet="/media/emerald-coast-small.webp 600w, /media/emerald-coast.webp 1200w" sizes="(max-width: 900px) 90vw, 45vw" alt="Emerald water meets limestone cliffs and dense coastal forest." width="1200" height="800" />,
    mediaCaption: "Emerald coast · Original generated artwork, fictional location.",
  },
  {
    id: "material", label: "Material", title: "Move closer to the detail.",
    content: <><p>Change the scale as the question changes. A material study brings colour, shape and light into view.</p><p>The chapter keeps its own title, image description and caption. The story remains readable when motion is off.</p></>,
    media: <img src="/media/glass-study.webp" srcSet="/media/glass-study-small.webp 600w, /media/glass-study.webp 1200w" sizes="(max-width: 900px) 90vw, 45vw" alt="Lavender, emerald and clear glass objects cast light across a lilac studio surface." width="1200" height="800" />,
    mediaCaption: "Glass study · Original generated artwork, illustrative material.",
  },
  {
    id: "space", label: "Space", title: "Show where it belongs.",
    content: <><p>Return to the whole scene. Here, the stone, light and reflecting pool make the spatial idea visible.</p><p>Scroll naturally, select a chapter or use the keyboard. Each route selects the same image and caption.</p></>,
    media: <img src="/media/quiet-pavilion.webp" srcSet="/media/quiet-pavilion-small.webp 600w, /media/quiet-pavilion.webp 1200w" sizes="(max-width: 900px) 90vw, 45vw" alt="Sunlit stone arches frame an olive tree over a shallow reflecting pool." width="1200" height="800" />,
    mediaCaption: "Quiet pavilion · Original generated artwork, fictional architecture.",
  },
];

export function SectionsShowcase() {
  const [layout, setLayout] = useState<"split" | "immersive">("split");
  const [chapter, setChapter] = useState("place");
  const [contour, setContour] = useState<"wave" | "ridge" | "orbit">("wave");
  const [followScroll, setFollowScroll] = useState(true);

  return <div className="qgs-demo" data-showcase="sections">
    <div className="qgs-demo-toolbar">
      <SegmentedControl aria-label="Section layout" value={layout} onValueChange={next => {
        if (next === "split" || next === "immersive") setLayout(next);
      }}>
        <SegmentedControlIndicator />
        <SegmentedControlItem value="split">Split</SegmentedControlItem>
        <SegmentedControlItem value="immersive">Immersive</SegmentedControlItem>
      </SegmentedControl>
      <Field className="qgs-demo-follow"><Switch checked={followScroll} onCheckedChange={setFollowScroll}><SwitchThumb /></Switch><FieldLabel>Follow story scroll</FieldLabel></Field>
    </div>
    <LiquidShowcaseSection
      className="qgs-demo-hero"
      title="Give the story room."
      eyebrow="Sections for stories, products and places"
      introduction={<p>Move from an opening image to a closer look. The layout follows the content, with controls for people and agents.</p>}
      layout={layout}
      actions={<Button render={<a href="#qg-section-story" />} data-variant="primary">Explore the chapters</Button>}
      media={<img src="/media/quiet-pavilion.webp" srcSet="/media/quiet-pavilion-small.webp 600w, /media/quiet-pavilion.webp 1200w" sizes="(max-width: 900px) 90vw, 60vw" alt="Warm stone arches surround an olive tree and a reflecting pool." width="1200" height="800" fetchPriority="high" />}
      mediaCaption="Original generated artwork · Fictional pavilion"
    />
    <LiquidSectionContour variant={contour} />
    <LiquidChapterSection
      id="qg-section-story"
      title="One scene leads to the next."
      introduction={<p>Scroll to follow the story, or choose a chapter. The image stays beside the text on a wide screen.</p>}
      chapters={chapters}
      value={chapter}
      onValueChange={setChapter}
      navigationLabel="Story chapter"
      followScroll={followScroll}
    />
    <LiquidSectionContour variant={contour} edge="end" />
    <LiquidReveal>
      <LiquidSection title="A softer change of scene." className="qgs-demo-contour-section"
        introduction={<p>Use a contour between sections to connect the page visually. It stays decorative, leaving reading order and navigation intact.</p>}
        actions={<SegmentedControl aria-label="Section contour" value={contour} onValueChange={next => {
          if (next === "wave" || next === "ridge" || next === "orbit") setContour(next);
        }}>
          <SegmentedControlIndicator />
          <SegmentedControlItem value="wave">Wave</SegmentedControlItem>
          <SegmentedControlItem value="ridge">Ridge</SegmentedControlItem>
          <SegmentedControlItem value="orbit">Orbit</SegmentedControlItem>
        </SegmentedControl>}>
        <div className="qgs-demo-contour-preview" data-liquid-glass="off"><LiquidSectionContour variant={contour} /></div>
      </LiquidSection>
    </LiquidReveal>
    <p className="qgs-demo-note">Reusable compositions from Wayrest and CK.com patterns. Chapter controls use the Vercel UI SDK. Custom composition review is pending.</p>
  </div>;
}
