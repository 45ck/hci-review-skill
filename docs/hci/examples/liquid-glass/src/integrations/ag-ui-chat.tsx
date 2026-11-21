"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import type { AbstractAgent } from "@ag-ui/client";
import { LiquidChat } from "@quantitative-hci/liquid-glass/chat";
import { projectAgUiMessages } from "@quantitative-hci/liquid-glass/chat/ag-ui";

// The host supplies one HttpAgent/AbstractAgent for this surface and its authenticated endpoint.
export function AgUiChatExample({ agent }: { agent: AbstractAgent }) {
  const [, render] = useReducer(value => value + 1, 0);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const runEpoch = useRef(0);
  useEffect(() => {
    const subscription = agent.subscribe({
      onMessagesChanged: () => render(), onRunInitialized: () => render(),
      onRunStartedEvent: () => render(), onRunFinalized: () => render(),
    });
    return () => { runEpoch.current++; agent.abortRun(); subscription.unsubscribe(); };
  }, [agent]);
  return <LiquidChat title="Chat" messages={projectAgUiMessages(agent.messages)}
    status={agent.isRunning ? "streaming" : error ? "error" : "ready"}
    value={draft} onValueChange={setDraft} error={error}
    description={agent.pendingInterrupts.length ? "The host needs to resolve an agent interruption" : undefined}
    composer={{ disabled: agent.pendingInterrupts.length > 0 }}
    onSubmit={async request => {
      if (agent.isRunning) throw new Error("The agent is already running");
      const epoch = ++runEpoch.current;
      let complete = false;
      setError(undefined);
      agent.addMessage({ id: crypto.randomUUID(), role: "user", content: request.text });
      try {
        await agent.runAgent(undefined, {
          onRunFinishedEvent: event => { complete = event.outcome === "success"; },
          onRunErrorEvent: () => { if (runEpoch.current === epoch) setError("The agent could not finish. Your draft is kept."); },
        });
        if (runEpoch.current === epoch && complete) setDraft(value => value === request.text ? "" : value);
      } catch {
        if (runEpoch.current === epoch) setError("The agent could not finish. Your draft is kept.");
      }
      if (runEpoch.current === epoch) render();
    }}
    onStop={() => { runEpoch.current++; agent.abortRun(); }} />;
}
