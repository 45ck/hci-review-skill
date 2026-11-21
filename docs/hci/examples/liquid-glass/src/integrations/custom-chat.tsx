"use client";

import { LiquidChat } from "@quantitative-hci/liquid-glass/chat";
import type { LiquidChatMessage, LiquidChatProps, LiquidChatStatus } from "@quantitative-hci/liquid-glass/chat";

export interface HostChatBindings {
  messages: readonly LiquidChatMessage[];
  status: LiquidChatStatus;
  draft: string;
  setDraft: LiquidChatProps["onValueChange"];
  send: LiquidChatProps["onSubmit"];
  stop?: LiquidChatProps["onStop"];
  retry?: LiquidChatProps["onRetry"];
  error?: string;
}

// Bind these props to the existing harness; it remains the conversation's source of truth.
export function CustomHarnessChatExample({ runtime }: { runtime: HostChatBindings }) {
  return <LiquidChat title="Chat" messages={runtime.messages} status={runtime.status}
    value={runtime.draft} onValueChange={runtime.setDraft} onSubmit={runtime.send}
    onStop={runtime.stop} onRetry={runtime.retry} error={runtime.error} />;
}
