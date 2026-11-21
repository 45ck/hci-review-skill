"use client";

import { useState } from "react";
import { LiquidGlassProvider } from "@quantitative-hci/liquid-glass/webgpu";
import { LiquidContextMenu } from "@quantitative-hci/liquid-glass/interactions";
import "@ui-sdk/core/web.css";
import "@quantitative-hci/liquid-glass/kit.css";
import "@quantitative-hci/liquid-glass/interactions.css";

export default function ContextActionsRecipe() {
  const [copies, setCopies] = useState(0);
  const [pinned, setPinned] = useState(false);
  return (
    <LiquidGlassProvider backdrop={<div style={{ width: "100%", height: "100%", background: "#d8e9ef" }} />}>
      <LiquidContextMenu
        label="Project preview"
        triggerLabel="Project actions"
        actions={[
          { id: "duplicate", label: "Duplicate project" },
          { id: "pin", label: "Pin project", disabled: pinned },
        ]}
        onAction={id => {
          if (id === "duplicate") setCopies(count => count + 1);
          if (id === "pin") setPinned(true);
        }}
      >
        <article style={{ padding: 32 }}>
          <h2>Project preview</h2>
          <p>Right-click here, use Shift+F10, or open Project actions.</p>
          <output aria-live="polite">{copies} copies. {pinned ? "Pinned." : "Not pinned."}</output>
        </article>
      </LiquidContextMenu>
    </LiquidGlassProvider>
  );
}
