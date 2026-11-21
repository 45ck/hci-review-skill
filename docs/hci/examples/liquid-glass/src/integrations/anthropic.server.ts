import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { projectAnthropicMessage } from "@quantitative-hci/liquid-glass/chat/anthropic";

// The host authorizes the request and supplies validated history and attachment references.
export async function runAnthropicMessage(options: {
  apiKey: string;
  model: string;
  messages: MessageParam[];
  maxTokens: number;
  signal: AbortSignal;
  onTextDelta: (text: string) => void;
}) {
  if (typeof window !== "undefined") throw new Error("Anthropic credentials belong on the server");
  const client = new Anthropic({ apiKey: options.apiKey });
  const stream = client.messages.stream({ model: options.model, max_tokens: options.maxTokens, messages: options.messages }, { signal: options.signal });
  stream.on("text", text => { if (!options.signal.aborted) options.onTextDelta(text); });
  const message = await stream.finalMessage();
  if (options.signal.aborted) throw new DOMException("Request cancelled", "AbortError");
  if (!message.stop_reason) throw new Error("Anthropic message has no final stop reason");
  const outcome = message.stop_reason === "tool_use" ? "tool-request" as const
    : message.stop_reason === "end_turn" || message.stop_reason === "stop_sequence" ? "complete" as const
    : message.stop_reason === "refusal" ? "refused" as const : "continuation" as const;
  return { message, outcome, stopReason: message.stop_reason, messages: projectAnthropicMessage(message) };
}
