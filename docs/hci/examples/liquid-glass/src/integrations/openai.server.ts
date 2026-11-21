import OpenAI from "openai";
import type { Responses } from "openai/resources/responses";
import { projectOpenAIResponse } from "@quantitative-hci/liquid-glass/chat/openai";

// The host authorizes the request, validates input/files and streams deltas over its existing transport.
export async function runOpenAIResponse(options: {
  apiKey: string;
  model: string;
  input: Responses.ResponseInput;
  signal: AbortSignal;
  onTextDelta: (text: string) => void;
}) {
  if (typeof window !== "undefined") throw new Error("OpenAI credentials belong on the server");
  const client = new OpenAI({ apiKey: options.apiKey });
  const stream = client.responses.stream({ model: options.model, input: options.input }, { signal: options.signal });
  stream.on("response.output_text.delta", event => { if (!options.signal.aborted) options.onTextDelta(event.delta); });
  const response = await stream.finalResponse();
  if (options.signal.aborted) throw new DOMException("Request cancelled", "AbortError");
  if (response.status !== "completed") throw new Error(`OpenAI response did not complete: ${response.status}`);
  return { response, messages: projectOpenAIResponse(response) };
}
