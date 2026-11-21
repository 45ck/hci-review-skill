"use client";

import { useState } from "react";
import { createInputController } from "@ui-sdk/react/textarea";
import { LiquidGlassProvider } from "@quantitative-hci/liquid-glass/webgpu";
import { LiquidChat, LiquidConversationList, LiquidPromptTemplatePicker, type LiquidChatMessage } from "@quantitative-hci/liquid-glass/chat";
import "@ui-sdk/core/web.css";
import "@quantitative-hci/liquid-glass/kit.css";
import "@quantitative-hci/liquid-glass/chat.css";

interface LocalThread { id: string; title: string; draft: string; messages: LiquidChatMessage[] }

export default function ChatWorkspaceRecipe() {
  const [input] = useState(createInputController);
  const [threads, setThreads] = useState<LocalThread[]>([{ id: "project", title: "Project notes", draft: "", messages: [] }]);
  const [selected, setSelected] = useState("project");
  const thread = threads.find(item => item.id === selected)!;
  const update = (change: (value: LocalThread) => LocalThread) => setThreads(current => current.map(item => item.id === selected ? change(item) : item));
  return <LiquidGlassProvider backdrop={<div style={{ width: "100%", height: "100%", background: "#e3f0f3" }} />}>
    <div style={{ maxWidth: 1080, marginInline: "auto", padding: 24 }}>
      <LiquidChat title={thread.title} description="Local request notebook · No model connected" messages={thread.messages} status="ready" value={thread.draft}
        onValueChange={draft => update(current => ({ ...current, draft }))}
        onSubmit={request => update(current => ({ ...current, draft: "", messages: [...current.messages.slice(-19), { id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text: request.text }] }] }))}
        sidebar={<LiquidConversationList conversations={threads} value={selected} onValueChange={id => { if (id) setSelected(id); }} createDisabled={threads.length >= 8} onCreate={() => {
          if (threads.length >= 8) return;
          const id = crypto.randomUUID();
          setThreads(current => [...current, { id, title: `Notes ${current.length + 1}`, draft: "", messages: [] }]);
          setSelected(id);
        }} />}
        templates={<LiquidPromptTemplatePicker templates={[{ id: "brief", label: "Prepare a brief", prompt: "Prepare a short project brief with the goal, audience and next action." }]}
          onChoose={template => { input.setValue(template.prompt); input.focus(); }} />}
        composer={{ label: "Project request", controller: input, submitLabel: "Keep local request", hint: "This example stores your text in page state. No model or network request is involved." }}
        notice="Requests stay in this page until it reloads."
      />
    </div>
  </LiquidGlassProvider>;
}
