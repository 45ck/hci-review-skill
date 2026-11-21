import type { Message as AgUiMessage } from "@ag-ui/core";
import type { LiquidChatMessage, LiquidChatPart } from "../types";
import { record, string, array, unsupported, reasoning, parseArguments } from "./helpers";

function agUiContent(value: unknown, prefix: string): LiquidChatPart[] {
  if (typeof value === "string") return value ? [{ type: "text", text: value }] : [];
  return array(value).map((entry, index) => {
    const part = record(entry), type = string(part.type) ?? "unknown";
    if (type === "text") return { type: "text", text: string(part.text) ?? "" };
    if (["image", "audio", "video", "document"].includes(type)) {
      const source = record(part.source), metadata = record(part.metadata);
      return { type: "attachment", id: string(part.id) ?? `${prefix}:part:${index}`,
        name: string(metadata.filename) ?? string(metadata.name) ?? `${type[0].toUpperCase()}${type.slice(1)} attachment`,
        mediaType: string(source.mimeType), url: source.type === "url" ? string(source.value) : undefined };
    }
    return unsupported(`Unsupported AG-UI content: ${type}`);
  });
}

export function projectAgUiMessages(messages: readonly AgUiMessage[]): LiquidChatMessage[] {
  const results = new Map(messages.filter(message => message.role === "tool").map(message => [message.toolCallId, message]));
  const callIds = new Set(messages.flatMap(message => message.role === "assistant" ? (message.toolCalls ?? []).map(call => call.id) : []));
  return messages.flatMap((message): LiquidChatMessage[] => {
    if (message.role === "tool" && callIds.has(message.toolCallId)) return [];
    if (message.role === "reasoning") return [{ id: message.id, role: "assistant", parts: [reasoning()] }];
    if (message.role === "activity") return [{ id: message.id, role: "assistant", parts: [unsupported(`Activity requires a host renderer: ${message.activityType}`)] }];
    const parts = agUiContent(message.content, message.id);
    if (message.role === "tool") return [{ id: message.id, role: "assistant", author: "Tool result",
      parts: [{ type: "tool", id: message.toolCallId, name: "Tool result", status: message.error ? "error" : "complete",
        output: message.error ? { error: message.error, content: typeof message.content === "string" ? message.content : undefined } : typeof message.content === "string" ? message.content : "Media result" },
      ...parts.filter(part => part.type !== "text")] }];
    if (message.role === "assistant") for (const call of message.toolCalls ?? []) {
      const result = results.get(call.id);
      parts.push({ type: "tool", id: call.id, name: call.function.name, input: parseArguments(call.function.arguments),
        status: result ? result.error ? "error" : "complete" : "pending",
        output: result?.error ? { error: result.error, content: typeof result.content === "string" ? result.content : undefined }
          : result ? typeof result.content === "string" ? result.content : "Media result" : undefined });
      if (result && Array.isArray(result.content)) parts.push(...agUiContent(result.content, result.id));
    }
    return [{ id: message.id, role: message.role === "developer" ? "system" : message.role,
      author: message.name, parts }];
  });
}

