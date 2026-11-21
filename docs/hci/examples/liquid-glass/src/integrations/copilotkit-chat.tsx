"use client";

import { useEffect, useRef, useState } from "react";
import { useAgent, useCopilotKit } from "@copilotkit/react-core/v2/headless";
import { LiquidChat } from "@quantitative-hci/liquid-glass/chat";
import { projectAgUiMessages } from "@quantitative-hci/liquid-glass/chat/ag-ui";

// Mount under the host's CopilotKit provider. localAgentId must be unique to this thread surface.
export function CopilotKitChatExample({ localAgentId, runtimeAgentId, threadId }: {
  localAgentId: string; runtimeAgentId: string; threadId: string;
}) {
  const { agent, isReady } = useAgent({ agentId: localAgentId, runtimeAgentId, threadId });
  const { copilotkit } = useCopilotKit();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const runEpoch = useRef(0);
  useEffect(() => () => { runEpoch.current++; copilotkit.stopAgent({ agent }); }, [agent, copilotkit]);
  return <LiquidChat title="Chat" messages={projectAgUiMessages(agent.messages)}
    status={agent.isRunning ? "streaming" : error ? "error" : "ready"}
    value={draft} onValueChange={setDraft} error={error}
    description={!isReady ? "Connecting to the agent" : agent.pendingInterrupts.length ? "The host needs to resolve an agent interruption" : undefined}
    composer={{ disabled: !isReady || agent.pendingInterrupts.length > 0 }}
    onSubmit={async request => {
      if (!isReady || agent.isRunning) throw new Error("The agent is not ready");
      const epoch = ++runEpoch.current;
      let complete = false;
      setError(undefined);
      agent.addMessage({ id: crypto.randomUUID(), role: "user", content: request.text });
      const observation = agent.subscribe({
        onRunStartedEvent: () => { complete = false; },
        onRunFinishedEvent: event => { complete = event.outcome === "success"; },
        onRunErrorEvent: () => { complete = false; },
      });
      try {
        await copilotkit.runAgent({ agent });
        if (runEpoch.current === epoch && complete) setDraft(value => value === request.text ? "" : value);
      } catch {
        if (runEpoch.current === epoch) setError("The agent could not finish. Your draft is kept.");
      } finally { observation.unsubscribe(); }
    }}
    onStop={() => { runEpoch.current++; copilotkit.stopAgent({ agent }); }} />;
}
