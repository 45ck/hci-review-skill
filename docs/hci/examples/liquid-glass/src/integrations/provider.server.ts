import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { convertToModelMessages, streamText, validateUIMessages } from "ai";
import type { LanguageModel } from "ai";

export type ProviderId = "openai" | "anthropic" | "openrouter";
export type ProviderConfiguration = Partial<Record<ProviderId, { apiKey: string; model: string }>>;

export function createProviderModel(configuration: ProviderConfiguration, provider: ProviderId): LanguageModel {
  if (typeof window !== "undefined") throw new Error("Provider credentials belong on the server");
  const selected = configuration[provider];
  if (!selected?.apiKey || !selected.model.trim()) throw new Error("Provider is not configured");
  if (provider === "openai") return createOpenAI({ apiKey: selected.apiKey })(selected.model);
  if (provider === "anthropic") return createAnthropic({ apiKey: selected.apiKey })(selected.model);
  return createOpenRouter({ apiKey: selected.apiKey })(selected.model);
}

// Supply credentials and approved model IDs from the host's server environment.
export function createChatRoute(configuration: {
  providers: ProviderConfiguration;
  provider: ProviderId;
  instructions: string;
  authorize: (request: Request) => Promise<boolean>;
}) {
  return async function POST(request: Request): Promise<Response> {
    if (typeof window !== "undefined") throw new Error("This handler is server-only");
    if (!await configuration.authorize(request)) return new Response("Unauthorized", { status: 401 });
    let body: unknown;
    try {
      const encoded = await request.text();
      if (encoded.length > 1_000_000) return new Response("Conversation too large", { status: 413 });
      body = JSON.parse(encoded);
    } catch { return new Response("Invalid JSON", { status: 400 }); }
    if (!body || typeof body !== "object" || !("messages" in body) || !Array.isArray(body.messages) || body.messages.length > 100) {
      return new Response("Invalid conversation", { status: 400 });
    }
    let messages;
    try { messages = await validateUIMessages({ messages: body.messages }); }
    catch { return new Response("Invalid messages", { status: 400 }); }
    if (messages.some(message => message.role === "system")) return new Response("Instructions are server-owned", { status: 400 });
    if (messages.some(message => message.parts.some(part => part.type !== "text" || part.text.length > 16_000))) {
      return new Response("This starter accepts text only; the host must authorize attachments and tools", { status: 400 });
    }
    const result = streamText({
      model: createProviderModel(configuration.providers, configuration.provider),
      instructions: configuration.instructions,
      messages: await convertToModelMessages(messages),
      abortSignal: request.signal,
    });
    return result.toUIMessageStreamResponse({ originalMessages: messages, onError: () => "The response could not finish." });
  };
}
