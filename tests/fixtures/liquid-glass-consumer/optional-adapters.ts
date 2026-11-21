import type { UIMessage } from "ai";
import type { Message as AgUiMessage } from "@ag-ui/core";
import type { Responses } from "openai/resources/responses";
import type { Message as AnthropicMessage } from "@anthropic-ai/sdk/resources/messages";
import { projectVercelMessages } from "@quantitative-hci/liquid-glass/chat/ai-sdk";
import { projectAgUiMessages } from "@quantitative-hci/liquid-glass/chat/ag-ui";
import { projectOpenAIResponse } from "@quantitative-hci/liquid-glass/chat/openai";
import { projectAnthropicMessage } from "@quantitative-hci/liquid-glass/chat/anthropic";
import type { LiquidChatMessage } from "@quantitative-hci/liquid-glass/chat";

export const typedAdapters: [
  (messages: readonly UIMessage[]) => LiquidChatMessage[],
  (messages: readonly AgUiMessage[]) => LiquidChatMessage[],
  (response: Responses.Response) => LiquidChatMessage[],
  (message: AnthropicMessage) => LiquidChatMessage[],
] = [projectVercelMessages, projectAgUiMessages, projectOpenAIResponse, projectAnthropicMessage];

// These must remain errors so a missing provider type cannot silently become any.
// @ts-expect-error Vercel messages require their declared message fields.
projectVercelMessages([{ invalid: true }]);
// @ts-expect-error AG-UI messages require their declared message fields.
projectAgUiMessages([{ invalid: true }]);
// @ts-expect-error A complete OpenAI response type is required.
projectOpenAIResponse({ invalid: true });
// @ts-expect-error An Anthropic message requires its declared message fields.
projectAnthropicMessage({ invalid: true });
