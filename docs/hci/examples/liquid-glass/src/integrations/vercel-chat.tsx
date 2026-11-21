"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { LiquidChat } from "@quantitative-hci/liquid-glass/chat";
import { projectVercelMessages } from "@quantitative-hci/liquid-glass/chat/ai-sdk";

// Mount inside the application's existing LiquidGlassProvider and SDK agent bridge.
export function VercelChatExample({ endpoint = "/api/chat", threadId }: { endpoint?: string; threadId: string }) {
  const [draft, setDraft] = useState("");
  const submittedDraft = useRef("");
  const transport = useMemo(() => new DefaultChatTransport({ api: endpoint }), [endpoint]);
  const chat = useChat({ id: threadId, transport,
    onFinish: ({ isAbort, isError, isDisconnect }) => {
      if (!isAbort && !isError && !isDisconnect) setDraft(value => value === submittedDraft.current ? "" : value);
    } });
  useEffect(() => () => { chat.stop(); }, [chat.stop]);
  return <LiquidChat title="Chat" messages={projectVercelMessages(chat.messages)} status={chat.status}
    value={draft} onValueChange={setDraft} error={chat.error ? "The response could not finish. Try again." : undefined}
    onSubmit={async request => { submittedDraft.current = request.text; await chat.sendMessage({ text: request.text }); }}
    onStop={() => chat.stop()} onRetry={() => chat.regenerate().then(() => undefined)} />;
}
