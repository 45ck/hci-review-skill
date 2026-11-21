import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

const base = new URL("../packages/liquid-glass/src/chat/adapters/", import.meta.url);
const asModule = source => `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`;
const helpers = asModule(readFileSync(new URL("helpers.ts", base), "utf8"));
const load = name => import(asModule(readFileSync(new URL(name, base), "utf8").replace('from "./helpers"', `from "${helpers}"`)));
const [{ projectVercelMessages }, { projectAgUiMessages }, { projectOpenAIResponse }, { projectAnthropicMessage }] = await Promise.all([
  load("ai-sdk.ts"), load("ag-ui.ts"), load("openai.ts"), load("anthropic.ts"),
]);

test("Vercel projection preserves file, citation and message identities without changing the runtime snapshot", () => {
  const input = [{ id: "message-1", role: "assistant", parts: [
    { type: "text", text: "A supported claim", citations: [{ source: { type: "source", sourceType: "url", id: "citation-1", title: "Evidence", url: "https://example.test/evidence" } }] },
    { type: "file", filename: "plan.pdf", mediaType: "application/pdf", url: "https://example.test/plan.pdf" },
    { type: "source-url", sourceId: "source-2", title: "Reference", url: "https://example.test/reference" },
    { type: "source-document", sourceId: "document-3", title: "Project specification", mediaType: "application/pdf" },
  ] }];
  const before = structuredClone(input), [message] = projectVercelMessages(input);
  assert.equal(message.id, "message-1");
  assert.equal(message.parts[0].text, "A supported claim");
  assert.equal(message.parts[1].id, "citation-1");
  assert.equal(message.parts[1].url, "https://example.test/evidence");
  assert.equal(message.parts[2].name, "plan.pdf");
  assert.equal(message.parts[2].mediaType, "application/pdf");
  assert.equal(message.parts[3].id, "source-2");
  assert.equal(message.parts[4].id, "document-3");
  assert.deepEqual(input, before);
});

test("Vercel approval and argument completion cannot masquerade as successful tool execution", () => {
  const states = ["input-streaming", "input-available", "approval-requested", "approval-responded", "output-available", "output-error", "output-denied"];
  const parts = projectVercelMessages([{ id: "turn", role: "assistant", parts: states.map((state, index) => ({
    type: "dynamic-tool", toolName: "save", toolCallId: `call-${index}`, state, input: { target: "draft" },
    approval: { approved: false }, output: "Saved", errorText: "Write failed",
  })) }])[0].parts;
  assert.deepEqual(parts.map(part => part.status), ["pending", "pending", "pending", "error", "complete", "error", "error"]);
  assert.equal(parts[3].output, "Tool execution was declined");
  assert.equal(parts[5].output, "Write failed");
  const preliminary = projectVercelMessages([{ id: "partial", role: "assistant", parts: [{ type: "tool-search", toolCallId: "search-1", state: "output-available", preliminary: true, output: [1] }] }]);
  assert.equal(preliminary[0].parts[0].status, "running");
});

test("future Vercel states and payloads remain visible without guessing success or exposing reasoning", () => {
  const [message] = projectVercelMessages([{ id: "future", role: "assistant", parts: [
    { type: "reasoning", text: "PRIVATE_REASONING" }, { type: "reasoning-file", url: "PRIVATE_REASONING" },
    { type: "tool-action", toolCallId: "call", state: "future-success" },
    { type: "data-future", data: { secret: "PRIVATE_REASONING" } },
  ] }]);
  assert.ok(message.parts.every(part => part.type === "unsupported"));
  assert.match(message.parts[2].label, /future-success/);
  assert.match(message.parts[3].label, /data-future/);
  assert.ok(!JSON.stringify(message).includes("PRIVATE_REASONING"));
});

test("AG-UI associates reversed tool results with their exact calls and retains failures and unresolved work", () => {
  const input = [{ id: "assistant", role: "assistant", content: "Working", toolCalls: [
    { id: "one", type: "function", function: { name: "read", arguments: '{"id":"a"}' } },
    { id: "two", type: "function", function: { name: "write", arguments: '{"id":"b"}' } },
    { id: "three", type: "function", function: { name: "pending", arguments: '{"partial":' } },
  ] }, { id: "result-two", role: "tool", toolCallId: "two", content: "Partial output", error: "Denied" },
  { id: "result-one", role: "tool", toolCallId: "one", content: "Read output" }];
  const before = structuredClone(input), result = projectAgUiMessages(input);
  assert.equal(result.length, 1);
  const tools = result[0].parts.filter(part => part.type === "tool");
  assert.deepEqual(tools.map(part => part.id), ["one", "two", "three"]);
  assert.deepEqual(tools.map(part => part.status), ["complete", "error", "pending"]);
  assert.equal(tools[0].output, "Read output");
  assert.deepEqual(tools[1].output, { error: "Denied", content: "Partial output" });
  assert.equal(tools[2].input, '{"partial":');
  assert.deepEqual(input, before);
});

test("AG-UI media handles remain metadata and unknown activity and reasoning are explicit", () => {
  const result = projectAgUiMessages([
    { id: "user", role: "user", content: [
      { type: "image", id: "image-a", source: { type: "url", value: "https://example.test/image.png", mimeType: "image/png" } },
      { type: "document", id: "file-b", source: { type: "file", value: "provider-secret-handle", provider: "openai", mimeType: "application/pdf" } },
      { type: "audio", id: "audio-c", source: { type: "data", value: "PRIVATE_BYTES", mimeType: "audio/wav" } },
    ] },
    { id: "orphan", role: "tool", toolCallId: "unmatched", content: "Recovered output" },
    { id: "thought", role: "reasoning", content: "PRIVATE_REASONING", encryptedValue: "PRIVATE_REASONING" },
    { id: "activity", role: "activity", activityType: "custom-widget", content: { secret: "PRIVATE_REASONING" } },
  ]);
  assert.equal(result[0].parts[0].url, "https://example.test/image.png");
  assert.equal(result[0].parts[1].url, undefined);
  assert.equal(result[0].parts[1].id, "file-b");
  assert.equal(result[1].parts[0].id, "unmatched");
  assert.equal(result[1].parts[0].output, "Recovered output");
  assert.equal(result[2].parts[0].type, "unsupported");
  assert.match(result[3].parts[0].label, /custom-widget/);
  assert.ok(!JSON.stringify(result).includes("PRIVATE_"));
});

test("OpenAI completed function arguments remain a pending host tool and final text retains its citations", () => {
  const response = { id: "response-1", status: "completed", output: [
    { type: "message", id: "output-1", content: [{ type: "output_text", text: "See the specification", annotations: [{ type: "url_citation", title: "Specification", url: "https://example.test/spec" }] }] },
    { type: "function_call", id: "item-1", call_id: "call-1", name: "save", status: "completed", arguments: '{"title":"Draft"}' },
    { type: "reasoning", id: "reasoning-1", summary: [{ text: "PRIVATE_REASONING" }], encrypted_content: "PRIVATE_REASONING" },
  ] };
  const [message] = projectOpenAIResponse(response);
  assert.equal(message.id, "response-1");
  assert.equal(message.parts[0].text, "See the specification");
  assert.equal(message.parts[1].url, "https://example.test/spec");
  assert.equal(message.parts[2].id, "call-1");
  assert.equal(message.parts[2].status, "pending");
  assert.deepEqual(message.parts[2].input, { title: "Draft" });
  assert.ok(!JSON.stringify(message).includes("PRIVATE_REASONING"));
});

test("OpenAI partial and unfamiliar output is never silently called complete", () => {
  const [message] = projectOpenAIResponse({ id: "partial", status: "incomplete", output: [{ type: "future_output", secret: "PRIVATE_PAYLOAD" }] });
  assert.equal(message.parts.length, 2);
  assert.match(message.parts[0].label, /future_output/);
  assert.match(message.parts[1].label, /incomplete/);
  assert.ok(!JSON.stringify(message).includes("PRIVATE_PAYLOAD"));
});

test("OpenAI actual function results complete only matching calls and preserve file references", () => {
  const [message] = projectOpenAIResponse({ id: "result", status: "completed", output: [
    { type: "function_call", id: "item", call_id: "call", name: "export", status: "completed", arguments: "{}" },
    { type: "function_call_output", id: "output", call_id: "call", status: "completed", output: [{ type: "input_file", file_id: "file-1", filename: "report.pdf" }] },
    { type: "function_call_output", id: "orphan", call_id: "other", status: "incomplete", output: "Partial result" },
  ] });
  const tools = message.parts.filter(part => part.type === "tool");
  assert.deepEqual(tools.map(part => [part.id, part.status]), [["call", "complete"], ["other", "error"]]);
  assert.equal(message.parts.find(part => part.type === "attachment").id, "file-1");
  assert.equal(message.parts.find(part => part.type === "attachment").name, "report.pdf");
});

test("Anthropic pairs server results, keeps client tools pending and hides opaque reasoning and search bytes", () => {
  const [message] = projectAnthropicMessage({ id: "msg-1", stop_reason: "tool_use", content: [
    { type: "text", text: "A cited answer", citations: [{ type: "web_search_result_location", title: "Evidence", url: "https://example.test/evidence" }] },
    { type: "tool_use", id: "client-call", name: "save", input: { title: "Draft" } },
    { type: "server_tool_use", id: "server-call", name: "web_search", input: { query: "Evidence" } },
    { type: "web_search_tool_result", tool_use_id: "server-call", content: [{ type: "web_search_result", title: "Source", url: "https://example.test/source", encrypted_content: "PRIVATE_BYTES" }] },
    { type: "thinking", thinking: "PRIVATE_REASONING" }, { type: "redacted_thinking", data: "PRIVATE_REASONING" },
  ] });
  const tools = message.parts.filter(part => part.type === "tool");
  assert.deepEqual(tools.map(part => [part.id, part.status]), [["client-call", "pending"], ["server-call", "complete"]]);
  assert.equal(message.parts.filter(part => part.type === "source").length, 2);
  assert.ok(!JSON.stringify(message).includes("PRIVATE_"));
});

test("Anthropic truncated output and tool failure remain observable", () => {
  const [message] = projectAnthropicMessage({ id: "msg-failed", stop_reason: "max_tokens", content: [
    { type: "server_tool_use", id: "call", name: "web_search", input: {} },
    { type: "web_search_tool_result", tool_use_id: "call", content: { type: "web_search_tool_result_error", error_code: "unavailable" } },
    { type: "future", hidden: "PRIVATE_DATA" },
  ] });
  assert.equal(message.parts[0].status, "error");
  assert.equal(message.parts[0].output.error_code, "unavailable");
  assert.match(message.parts.at(-1).label, /max_tokens/);
  assert.ok(!JSON.stringify(message).includes("PRIVATE_DATA"));
});

test("Anthropic generated and uploaded files retain their provider IDs without inventing URLs", () => {
  const [message] = projectAnthropicMessage({ id: "files", stop_reason: "end_turn", content: [
    { type: "container_upload", file_id: "input-file" },
    { type: "server_tool_use", id: "execution", name: "code_execution", input: {} },
    { type: "code_execution_tool_result", tool_use_id: "execution", content: { type: "code_execution_result", stdout: "done", content: [{ type: "code_execution_output", file_id: "output-file" }] } },
  ] });
  const files = message.parts.filter(part => part.type === "attachment");
  assert.deepEqual(files.map(file => file.id), ["input-file", "output-file"]);
  assert.ok(files.every(file => file.url === undefined));
});
