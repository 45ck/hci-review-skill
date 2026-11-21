"use client";

import { useState } from "react";
import { createInputController } from "@ui-sdk/react/textarea";
import { LiquidGlassProvider } from "@quantitative-hci/liquid-glass/webgpu";
import { LiquidMessage, LiquidPromptComposer, LiquidSuggestionList } from "@quantitative-hci/liquid-glass/assistant";
import "@ui-sdk/core/web.css";
import "@quantitative-hci/liquid-glass/kit.css";
import "@quantitative-hci/liquid-glass/assistant.css";

export default function AssistantComposerRecipe() {
  const [input] = useState(createInputController);
  const [draft, setDraft] = useState("");
  const [accepted, setAccepted] = useState("");
  return <LiquidGlassProvider backdrop={<div style={{ width: "100%", height: "100%", background: "#e3f0f3" }} />}>
    <section style={{ maxWidth: 720, marginInline: "auto", padding: 24 }} aria-label="Local prompt example">
      <h2>Prepare a project brief</h2>
      <p>This example stores a local request. Connect onSubmit to the host application’s execution and cancellation flow.</p>
      {accepted && <LiquidMessage id="accepted-request" author="You" role="user"><p>{accepted}</p></LiquidMessage>}
      <LiquidSuggestionList suggestions={[{ id: "review", label: "Review my component plan", prompt: "Review my component plan for a coastal studio." }]}
        onChoose={suggestion => { input.setValue(suggestion.prompt); input.focus(); }} />
      <LiquidPromptComposer label="Project prompt" controller={input} value={draft} onValueChange={setDraft}
        onSubmit={request => { setAccepted(request.text); input.clear(); }}
        submitLabel="Keep local request" hint="No model or remote service is called." />
    </section>
  </LiquidGlassProvider>;
}
