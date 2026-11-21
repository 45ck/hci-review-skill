"use client";

import { useState } from "react";
import { LiquidGlassProvider } from "@quantitative-hci/liquid-glass/webgpu";
import { LiquidChapterSection, type LiquidChapter } from "@quantitative-hci/liquid-glass/sections";
import "@ui-sdk/core/web.css";
import "@quantitative-hci/liquid-glass/kit.css";
import "@quantitative-hci/liquid-glass/sections.css";

const chapters: readonly LiquidChapter[] = [
  { id: "context", label: "Context", title: "Begin with the place.", content: <p>Explain what the reader is seeing and why it matters to their task.</p>, media: <svg viewBox="0 0 640 440" role="img" aria-label="Teal landscape study"><rect width="640" height="440" fill="#b9e3e6" /><path d="M0 310Q240 100 640 230V440H0Z" fill="#187b81" /></svg>, mediaCaption: "Illustrative scene: context." },
  { id: "detail", label: "Detail", title: "Bring the detail closer.", content: <p>Keep the explanation beside the relevant media. A reader can select a chapter without scrolling through the entire story.</p>, media: <svg viewBox="0 0 640 440" role="img" aria-label="Close detail of an emerald shape"><rect width="640" height="440" fill="#122e3c" /><circle cx="320" cy="220" r="150" fill="#64c6b7" /><circle cx="320" cy="220" r="88" fill="#122e3c" /></svg>, mediaCaption: "Illustrative scene: detail." },
];

export default function ChapterStoryRecipe() {
  const [chapter, setChapter] = useState("context");
  return (
    <LiquidGlassProvider backdrop={<div style={{ width: "100%", height: "100%", background: "#d8e9ef" }} />}>
      <LiquidChapterSection
        title="From context to detail."
        chapters={chapters}
        navigationLabel="Project story chapter"
        value={chapter}
        onValueChange={setChapter}
      />
    </LiquidGlassProvider>
  );
}
