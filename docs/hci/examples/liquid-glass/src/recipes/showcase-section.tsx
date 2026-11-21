"use client";

import { useState } from "react";
import { Button } from "@ui-sdk/react/button";
import { LiquidGlassProvider } from "@quantitative-hci/liquid-glass/webgpu";
import { LiquidShowcaseSection, LiquidSectionContour, LiquidReveal } from "@quantitative-hci/liquid-glass/sections";
import "@ui-sdk/core/web.css";
import "@quantitative-hci/liquid-glass/kit.css";
import "@quantitative-hci/liquid-glass/sections.css";

export default function ShowcaseSectionRecipe() {
  const [saved, setSaved] = useState(false);
  return (
    <LiquidGlassProvider backdrop={<div style={{ width: "100%", height: "100%", background: "#d8e9ef" }} />}>
      <LiquidReveal>
        <LiquidShowcaseSection
          title="A place for your next project."
          introduction="Show the work, explain the decision, and give the reader one useful next action."
          layout="split"
          media={<svg viewBox="0 0 640 440" role="img" aria-label="Abstract teal landscape"><rect width="640" height="440" fill="#c4e7e8" /><path d="M0 310Q180 80 360 270T640 180V440H0Z" fill="#187b81" /><circle cx="490" cy="100" r="45" fill="#fff3c2" /></svg>}
          mediaCaption="Original illustrative landscape. Replace with your own project media."
          actions={<Button onClick={() => setSaved(true)}>Save this direction</Button>}
        >
          <output aria-live="polite">{saved ? "Direction saved for this session." : ""}</output>
        </LiquidShowcaseSection>
      </LiquidReveal>
      <LiquidSectionContour variant="wave" />
    </LiquidGlassProvider>
  );
}
