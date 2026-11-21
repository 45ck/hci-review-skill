"use client";

import { useState } from "react";
import { Button } from "@ui-sdk/react/button";
import { LiquidGlassProvider } from "@quantitative-hci/liquid-glass/webgpu";
import { LiquidCursor, LiquidClickFeedback, LiquidMagnetic } from "@quantitative-hci/liquid-glass/interactions";
import "@ui-sdk/core/web.css";
import "@quantitative-hci/liquid-glass/kit.css";
import "@quantitative-hci/liquid-glass/interactions.css";

export default function CursorFeedbackRecipe() {
  const [saved, setSaved] = useState(false);
  return (
    <LiquidGlassProvider backdrop={<div style={{ width: "100%", height: "100%", background: "linear-gradient(140deg,#c5e5ec,#eedcf2)" }} />}>
      <LiquidCursor variant="glass">
        <LiquidClickFeedback effect="ripple" style={{ padding: 32 }}>
          <Button data-cursor-label="Save draft" onClick={() => setSaved(true)}>
            <LiquidMagnetic><svg viewBox="0 0 24 24" width="20" height="20"><path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" strokeWidth="2" /></svg></LiquidMagnetic>
            Save draft
          </Button>
          <output aria-live="polite">{saved ? "Draft saved for this session." : "Draft has not been saved."}</output>
        </LiquidClickFeedback>
      </LiquidCursor>
    </LiquidGlassProvider>
  );
}
