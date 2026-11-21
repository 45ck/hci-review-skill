import type { UIMessage } from "ai";
import type { LiquidChatMessage, LiquidChatPart } from "../types";
import { record, string, unsupported, reasoning, citations } from "./helpers";

function vercelPart(value: unknown, id: string): LiquidChatPart[] {
  const part = record(value), type = string(part.type) ?? "unknown";
  if (type === "text") return [{ type: "text", text: string(part.text) ?? "" }, ...citations(part.citations, id)];
  if (type === "reasoning" || type === "reasoning-file") return [reasoning()];
  if (type === "file") return [{ type: "attachment", id, name: string(part.filename) ?? "Attachment", mediaType: string(part.mediaType), url: string(part.url) }];
  if (type === "source-url") return [{ type: "source", id: string(part.sourceId) ?? id, title: string(part.title) ?? string(part.url) ?? "Source", url: string(part.url) ?? "" }];
  if (type === "source-document") return [{ type: "attachment", id: string(part.sourceId) ?? id, name: string(part.title) ?? string(part.filename) ?? "Source document", mediaType: string(part.mediaType) }];
  if (type === "step-start") return [];
  if (type === "dynamic-tool" || type.startsWith("tool-")) {
    const state = string(part.state), approval = record(part.approval);
    const denied = state === "output-denied" || (state === "approval-responded" && approval.approved === false);
    const status = denied || state === "output-error" ? "error"
      : state === "output-available" ? part.preliminary === true ? "running" : "complete" : "pending";
    const knownStates = ["input-streaming", "input-available", "approval-requested", "approval-responded", "output-available", "output-error", "output-denied"];
    if (!state || !knownStates.includes(state)) return [unsupported(`Unsupported tool state: ${state ?? "unknown"}`)];
    return [{ type: "tool", id: string(part.toolCallId) ?? id,
      name: type === "dynamic-tool" ? string(part.toolName) ?? "Tool" : type.slice(5), status,
      input: part.input, output: denied ? "Tool execution was declined" : state === "output-error" ? string(part.errorText) ?? "Tool failed" : part.output }];
  }
  return [unsupported(`Unsupported Vercel message part: ${type}`)];
}

export function projectVercelMessages(messages: readonly UIMessage[]): LiquidChatMessage[] {
  return messages.map(message => ({ id: message.id, role: message.role,
    parts: message.parts.flatMap((part, index) => vercelPart(part, `${message.id}:part:${index}`)) }));
}

