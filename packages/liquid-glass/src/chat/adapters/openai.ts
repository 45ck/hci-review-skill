import type { Responses } from "openai/resources/responses";
import type { LiquidChatMessage, LiquidChatPart } from "../types";
import { record, string, array, unsupported, reasoning, parseArguments, citations } from "./helpers";

function outputParts(value: unknown, prefix: string): LiquidChatPart[] {
  return array(value).map((entry, index) => {
    const part = record(entry), id = string(part.file_id) ?? `${prefix}:part:${index}`;
    if (part.type === "input_text") return { type: "text", text: string(part.text) ?? "" };
    if (part.type === "input_image") return { type: "attachment", id, name: "Image result", url: string(part.image_url) };
    if (part.type === "input_file") return { type: "attachment", id, name: string(part.filename) ?? "File result", url: string(part.file_url) };
    return unsupported(`Unsupported OpenAI tool output: ${string(part.type) ?? "unknown"}`);
  });
}
const resultStatus = (status: unknown) => status === "completed" ? "complete" as const : status === "incomplete" ? "error" as const : "running" as const;

export function projectOpenAIResponse(response: Responses.Response): LiquidChatMessage[] {
  const parts: LiquidChatPart[] = [];
  const results = new Map(response.output.map(record).filter(item => item.type === "function_call_output" && string(item.call_id)).map(item => [string(item.call_id), item]));
  const callIds = new Set(response.output.map(record).filter(item => item.type === "function_call").map(item => string(item.call_id)));
  for (const [index, value] of response.output.entries()) {
    const item = record(value), type = string(item.type) ?? "unknown", id = string(item.id) ?? `${response.id}:item:${index}`;
    if (type === "message") {
      for (const [contentIndex, content] of array(item.content).entries()) {
        const part = record(content);
        if (part.type === "output_text") parts.push({ type: "text", text: string(part.text) ?? "" }, ...citations(part.annotations, `${id}:${contentIndex}`));
        else if (part.type === "refusal") parts.push({ type: "text", text: string(part.refusal) ?? "Request refused" });
        else parts.push(unsupported(`Unsupported OpenAI content: ${string(part.type) ?? "unknown"}`));
      }
    } else if (type === "function_call") {
      // A completed argument stream is a requested tool call, not completed execution.
      const result = results.get(string(item.call_id)), content = result ? outputParts(result.output, String(result.id)) : [];
      parts.push({ type: "tool", id: string(item.call_id) ?? id, name: string(item.name) ?? "Function",
        status: result ? resultStatus(result.status) : "pending", input: parseArguments(item.arguments),
        output: result ? typeof result.output === "string" ? result.output : "Structured tool result" : undefined }, ...content);
    } else if (type === "function_call_output") {
      if (!callIds.has(string(item.call_id))) parts.push({ type: "tool", id: string(item.call_id) ?? id, name: "Tool result", status: resultStatus(item.status),
        output: typeof item.output === "string" ? item.output : "Structured tool result" }, ...outputParts(item.output, id));
    } else if (type === "reasoning") parts.push(reasoning());
    else if (["web_search_call", "file_search_call", "code_interpreter_call"].includes(type)) {
      parts.push({ type: "tool", id, name: type.replaceAll("_", " "), status: item.status === "completed" ? "complete" : item.status === "failed" || item.status === "incomplete" ? "error" : "running" });
    } else parts.push(unsupported(`Unsupported OpenAI output: ${type}`));
  }
  if (response.status !== "completed") parts.push(unsupported(`Response is ${response.status ?? "not complete"}; completion is not confirmed`));
  return [{ id: response.id, role: "assistant", parts }];
}

