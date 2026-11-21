# Chat integrations

These examples compose the existing Quantive chat UI above established chat runtimes. The gallery displays their exact source using Vite `?raw` imports; TypeScript checks every example against the locked dependency versions. They do not publish an API route or call a model in the gallery.

Reuse the application's existing `LiquidGlassProvider`, kit/assistant/chat stylesheets and single UI SDK agent bridge. Keep the UI SDK agent (which operates controls) separate from the model or agent service (which answers prompts).

## Choose the layer

| Example | Owns conversation and execution | Connection supplied by the host |
| --- | --- | --- |
| `vercel-chat.tsx` | `useChat` and `DefaultChatTransport` from Vercel AI SDK | An authenticated `/api/chat`-style endpoint. Mount with `key={threadId}` when changing threads so drafts and pending UI belong to one thread. |
| `provider.server.ts` | Vercel AI SDK `streamText` | Server credentials, approved model ID, instructions and an authorization callback. Select OpenAI, Anthropic or OpenRouter in server configuration. |
| `copilotkit-chat.tsx` | Existing CopilotKit runtime and its private thread-scoped AG-UI agent | Existing CopilotKit provider, unique local agent ID, runtime agent ID and thread ID. Stop uses `copilotkit.stopAgent` so its tool/continuation lifecycle is cancelled too. |
| `ag-ui-chat.tsx` | Existing `AbstractAgent`/`HttpAgent` | One agent instance owned by this chat surface and its authenticated endpoint. Subscription cleanup and `abortRun` stay with that instance. |
| `custom-chat.tsx` | The application's existing harness | Controlled messages, status, draft and real send/stop/retry callbacks. |
| `openai.server.ts` | Official OpenAI Responses streaming helper | Server credentials, model ID, validated input, AbortSignal and a text-delta callback connected to the host's existing transport. |
| `anthropic.server.ts` | Official Anthropic Messages streaming helper | Server credentials, model ID, validated history, token limit, AbortSignal and the host's text-delta callback. |

The common Vercel route is deliberately a **text-only starter**. It refuses client-supplied system messages, oversized history/text and non-text parts. Add attachment authorization and tool policy in the host before accepting them. A selected browser file is not an uploaded file. Do not put provider API keys into React props or a client environment variable. Server examples throw if called in a browser.

The direct-provider helpers expose final snapshots as well as projected messages. OpenAI requires `status === "completed"`; a clean transport EOF is insufficient. A completed function-call argument stream still describes a pending tool request. Anthropic returns the actual stop reason and an explicit complete/tool-request/refused/continuation outcome. Neither helper implements a tool loop, file upload, persistence, authentication, or a replacement SSE protocol.

## Pure display projectors

Import only the adapter matching the application's dependency:

```ts
import { projectVercelMessages } from "@quantitative-hci/liquid-glass/chat/ai-sdk";
import { projectAgUiMessages } from "@quantitative-hci/liquid-glass/chat/ag-ui";
import { projectOpenAIResponse } from "@quantitative-hci/liquid-glass/chat/openai";
import { projectAnthropicMessage } from "@quantitative-hci/liquid-glass/chat/anthropic";
```

Each accepts the corresponding official SDK type and returns Quantive `LiquidChatMessage[]`. External SDK imports in these projectors are type-only. They do not operate an agent, execute tools, fetch a URL or change the input snapshot. There is no combined adapter barrel requiring every optional SDK.

The projectors retain text, supported attachment/reference metadata, source URLs, tool identities and reported results. AG-UI and OpenAI tool results join their exact call IDs. Missing results stay pending; refused, errored, preliminary and incomplete outputs remain distinct. Provider file handles remain opaque identifiers, with no invented download URL. Attachments describe metadata; encoded file contents are not copied into a download or image renderer.

Known reasoning and redacted/encrypted thinking are omitted from the display projection, with a readable placeholder. Unrecognised content and activity types have an explicit unsupported marker. Raw reasoning, arbitrary activity payloads and provider metadata are not rendered. The host retains the original runtime message for continuation and may supply a deliberate renderer for supported custom data. Do not infer that a source list establishes factual accuracy.

Tool cards are read-only. The host must connect actual tool approval/output methods and its authorization policy, using the runtime's original approval IDs. A projected pending card does not authorize an operation. CopilotKit/AG-UI interruptions remain host-owned; the starter disables another prompt while an interruption needs resolution.

## Checked versions and evidence

The examples are compiled with `ai@7.0.179`, `@ai-sdk/react@4.0.183`, `@ai-sdk/openai@4.0.122`, `@ai-sdk/anthropic@4.0.107`, `@openrouter/ai-sdk-provider@3.1.0`, `openai@7.62.0`, `@anthropic-ai/sdk@1.12.0`, `@ag-ui/core@1.0.5`, `@ag-ui/client@1.0.5` and `@copilotkit/react-core@1.90.0`. The lockfile is authoritative. CopilotKit's `/v2/headless` is an export path in that package version.

`tests/test_chat_adapters.mjs` uses authored protocol fixtures to check identity, multipart projection, tool-result correlation, rejection/incomplete states, input immutability and reasoning omission. It does not send live model requests. Compilation and fixtures establish their stated scope; credentials, deployed endpoints, model-specific modalities, tool execution and human usability require application-level verification.

## Official references

Inspected on 22 November 2026:

- [Vercel useChat](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat), [transport](https://ai-sdk.dev/docs/ai-sdk-ui/transport) and [streamText](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text).
- [OpenAI TypeScript SDK](https://developers.openai.com/api/reference/typescript) and [streaming helper](https://github.com/openai/openai-node/blob/main/docs/streaming.md).
- [Anthropic TypeScript SDK](https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript) and [streaming](https://platform.claude.com/docs/en/build-with-claude/streaming).
- [OpenRouter Vercel integration](https://openrouter.ai/docs/guides/community/vercel-ai-sdk). Its older tool examples are not copied; the installed AI SDK types govern this recipe.
- [CopilotKit headless UI](https://docs.copilotkit.ai/custom-look-and-feel/headless-ui), [useAgent](https://docs.copilotkit.ai/reference/hooks/useAgent) and [AG-UI AbstractAgent](https://docs.ag-ui.com/sdk/js/client/abstract-agent).
