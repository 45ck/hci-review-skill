import type { Message as AnthropicMessage } from "@anthropic-ai/sdk/resources/messages";
import type { LiquidChatMessage, LiquidChatPart } from "../types";
import { record, string, array, unsupported, reasoning, citations } from "./helpers";

function visibleResult(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map(entry => {
    const result = record(entry);
    return result.type === "web_search_result" ? { type: result.type, title: result.title, url: result.url, page_age: result.page_age } : entry;
  });
}

export function projectAnthropicMessage(message: AnthropicMessage): LiquidChatMessage[] {
  const parts: LiquidChatPart[] = [], blocks = message.content.map(record);
  const results = new Map(blocks.filter(block => string(block.tool_use_id)).map(block => [string(block.tool_use_id), block]));
  for (const [index, block] of blocks.entries()) {
    const type = string(block.type) ?? "unknown", id = string(block.id) ?? `${message.id}:block:${index}`;
    if (type === "text") parts.push({ type: "text", text: string(block.text) ?? "" }, ...citations(block.citations, id));
    else if (type === "thinking" || type === "redacted_thinking") parts.push(reasoning());
    else if (type === "container_upload") parts.push({ type: "attachment", id: string(block.file_id) ?? id, name: "Container file" });
    else if (type === "tool_use" || type === "server_tool_use") {
      const result = results.get(string(block.id)), resultContent = result?.content;
      const failed = string(record(resultContent).type)?.includes("error") === true || result?.is_error === true;
      parts.push({ type: "tool", id, name: string(block.name) ?? "Tool", input: block.input,
        status: result ? failed ? "error" : "complete" : "pending", output: visibleResult(resultContent) });
    } else if (type.endsWith("_tool_result")) {
      const nested = record(block.content);
      for (const result of Array.isArray(block.content) ? block.content : [block.content, ...array(nested.content)]) {
        const source = record(result), url = string(source.url);
        if (url) parts.push({ type: "source", id: string(source.id) ?? `${id}:source:${parts.length}`, title: string(source.title) ?? url, url });
        if (source.type === "code_execution_output" && string(source.file_id)) parts.push({ type: "attachment", id: String(source.file_id), name: "Generated file" });
      }
      if (!blocks.some(candidate => candidate.id === block.tool_use_id)) parts.push(unsupported(`Unmatched tool result: ${type}`));
    } else parts.push(unsupported(`Unsupported Anthropic content: ${type}`));
  }
  if (!message.stop_reason || ["max_tokens", "model_context_window_exceeded", "pause_turn"].includes(message.stop_reason)) {
    parts.push(unsupported(`Response stopped with ${message.stop_reason ?? "no final stop reason"}; the host must handle continuation`));
  }
  return [{ id: message.id, role: "assistant", parts }];
}
