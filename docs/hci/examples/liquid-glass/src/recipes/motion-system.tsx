"use client";

import { useState } from "react";
import { Toggle } from "@ui-sdk/react/toggle";
import { Button } from "@ui-sdk/react/button";
import { LiquidGlassProvider } from "@quantitative-hci/liquid-glass/webgpu";
import { LiquidMotionProvider, LiquidMorphIcon, LiquidSharedIndicator, LiquidMotionList, LiquidTextTransition } from "@quantitative-hci/liquid-glass/motion";
import "@ui-sdk/core/web.css";
import "@quantitative-hci/liquid-glass/kit.css";
import "@quantitative-hci/liquid-glass/motion.css";

export default function MotionSystemRecipe() {
  const [playing, setPlaying] = useState(false);
  const [view, setView] = useState<string | null>("overview");
  const [rows, setRows] = useState([{ id: "study-1", content: "Material study" }]);
  const [sequence, setSequence] = useState(1);
  return <LiquidGlassProvider backdrop={<div style={{ width: "100%", height: "100%", background: "#d8e9ef" }} />}>
    <LiquidMotionProvider preset="responsive" mode="system">
      <section aria-label="Motion example" data-liquid-glass>
        <h2>Study preview</h2>
        <Toggle aria-label="Preview playback" pressed={playing} onPressedChange={setPlaying}>
          <LiquidMorphIcon pair="play-pause" active={playing} size={24} />
          Preview playback
        </Toggle>
        <LiquidTextTransition text={playing ? "Playing" : "Paused"} />
        <LiquidSharedIndicator label="Study view" value={view}
          items={[{ id: "overview", label: "Overview" }, { id: "activity", label: "Activity" }]}
          onValueChange={setView} />
        <Button disabled={rows.length >= 8} onClick={() => {
          const next = sequence + 1;
          setSequence(next);
          setRows(current => [...current, { id: `study-${next}`, content: `Study ${next}` }]);
        }}>Add study</Button>
        <LiquidMotionList label="Studies" items={rows} />
      </section>
    </LiquidMotionProvider>
  </LiquidGlassProvider>;
}
