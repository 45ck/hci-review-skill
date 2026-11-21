# Chat above an existing runtime

**Decision:** Quantive supplies the interface. An existing chat or agent runtime owns messages and execution, and the application server owns credentials, model selection, files, persistence and authorization. Reuse the Vercel UI SDK controls and the existing single agent bridge. Do not introduce a second stream parser or tool executor.

## Task and observable result

A developer should be able to find a chat component, run its compiled example, choose an integration and copy the exact source. A person or agent should be able to choose a conversation, keep its draft, select a prompt template, submit, stop or recover from a failed local response. Accepted state must correspond to the selected conversation; a stale completion must not write into another thread.

The library now separates **All components**, **Examples**, **Chat workspace** and **AI integrations**. All components is generated from the existing SDK and custom manifests. Custom details explain their real API and link to a working context. Examples run the registered TSX source in separate same-origin documents with their own provider and bridge. Their source is part of the normal TypeScript build. A source-only card is not represented as a live preview.

Sidebar filtering does not change the selected destination. Catalogue filters survive a detail/Back round trip. Direct collection, custom-component and example links use the same selected state as visible SDK navigation. See the [navigation model](../models/library-discovery-model.md).

## Layers and responsibilities

| Layer | Supplied here | Host responsibility |
| --- | --- | --- |
| UI | `LiquidChat`, `LiquidConversationList`, `LiquidPromptTemplatePicker`; existing prompt, message, attachment and source components | Accepted draft, selected thread, labels and application content. |
| Display projection | Four pure projectors for supported Vercel AI SDK, AG-UI, OpenAI Responses and Claude Messages parts | Preserve the authoritative runtime snapshot; deliberately render additional parts. |
| Runtime | Compiled Vercel `useChat`, CopilotKit headless, AG-UI subscription and controlled-host examples | Configure the existing runtime, thread identity, endpoints and authorized tools. |
| Provider | Compiled OpenAI, Anthropic and OpenRouter server-provider recipe; direct OpenAI/Claude server examples | Secrets, allowed model IDs, request validation, quotas, file ingestion and completion policy. |

OpenAI, Anthropic and OpenRouter are provider choices in the Vercel runtime example. CopilotKit and AG-UI represent different runtime/protocol boundaries. They are not interchangeable items in a model-provider selector. OpenAI Agents SDK and Claude Agent SDK are distinct harnesses; this release does not claim dedicated adapters for them. A custom runtime can supply the controlled interface without changing Quantive's UI.

## Reusable components

`LiquidChat` accepts readonly messages, a controlled draft, status (`ready`, `submitted`, `streaming`, `error`) and real host callbacks. It forwards submission through the existing `LiquidPromptComposer`; Stop remains independent from an in-flight Send. Optional retry, header, sidebar, template, message-action and part-rendering slots preserve application composition. It owns no conversation store.

`LiquidConversationList` composes the SDK Listbox and Button. Stable enabled IDs are required; invalid, disabled and null proposals are refused. Accepted thread selection and per-thread storage remain host-owned. `LiquidPromptTemplatePicker` composes an SDK Menu and forwards its actual callback shape. Its installed `MenuActionDetails` has optional `event`, not invented source or cancellation fields. The gallery template action fills the real textarea controller.

Messages contain text, sources, attachment metadata, tool status/data or explicit unsupported labels. Text remains plain text; arbitrary HTML is not executed. The default attachment display does not fetch supplied URLs. Source links reuse the existing safe SDK anchor composition. Tool disclosures display redacted host-reported data; they neither execute nor approve a tool. Use the existing `AgentToolRequest` in `renderPart` for a runtime's actual review state and callbacks. Reasoning payloads are not copied into rendered content.

## Optional integration entries

| Import | Input authority | Output |
| --- | --- | --- |
| `@quantitative-hci/liquid-glass/chat/ai-sdk` | Vercel `UIMessage[]` | `projectVercelMessages` returns supported display parts. |
| `@quantitative-hci/liquid-glass/chat/ag-ui` | AG-UI `Message[]` | `projectAgUiMessages` links tool results to their call IDs. |
| `@quantitative-hci/liquid-glass/chat/openai` | OpenAI Responses snapshot | `projectOpenAIResponse` projects public output items. |
| `@quantitative-hci/liquid-glass/chat/anthropic` | Claude Messages snapshot | `projectAnthropicMessage` projects public content blocks. |

Each entry imports only its matching SDK types. The core `/chat` UI has no provider SDK runtime dependency. External packages are optional peers for the adapter entries and pinned development dependencies for the compiled examples. Import the entry that matches the runtime being used.

The projectors do not claim complete modality or protocol coverage. Unknown parts remain visible as unsupported. Preserve original runtime data for specialized renderers and future adapters. Tool request projection does not establish execution, approval or successful completion. Do not execute partial JSON arguments. Treat browser cancellation, server cancellation and model completion as separate observed facts.

The direct OpenAI example requires an actual completed response before reporting success. The Anthropic example retains the SDK's own stream accumulation and cancellation. The Vercel example uses its native UI-message stream response and `DefaultChatTransport`; the AG-UI example subscribes to the SDK instead of parsing events again. Server example factories require the application's own configuration; they are not deployed endpoints in this gallery.

## Exact dependency evidence

Inspected official documentation and the installed package declarations on **22 November 2026**. The examples compile against these pinned versions:

| Package | Version |
| --- | --- |
| `ai` / `@ai-sdk/react` | `7.0.179` / `4.0.183` |
| `@ai-sdk/openai` / `@ai-sdk/anthropic` | `4.0.122` / `4.0.107` |
| `@openrouter/ai-sdk-provider` | `3.1.0` |
| `openai` / `@anthropic-ai/sdk` | `7.62.0` / `1.12.0` |
| `@ag-ui/core` / `@ag-ui/client` | `1.0.5` / `1.0.5` |
| `@copilotkit/react-core` | `1.90.0` |

Installed declarations govern code where documentation examples differ. In particular, older OpenRouter examples are not a reason to use obsolete AI SDK tool or step-limit options. Model names are supplied by the host instead of being guessed or frozen into the UI.

## Verification boundary

The gallery is explicitly a **local demo with no model connected**. It exercises bounded streaming, cancellation, per-thread drafts, source display, native file selection and a repeatable error/retry path. Selected file contents are not read or uploaded. Integration selectors choose displayed recipes and configuration guidance; they do not silently start a provider connection.

`tests/test_chat_adapters.mjs` covers protocol-shaped display projections and failure/unknown cases without live API requests. `tests/glass_chat_contract.py`, `tests/glass_catalogue_navigation.py` and `tests/glass_integrations_contract.py` check the real SDK controls, accepted local outcomes, source copying, routes and narrow/forced-colour layout. Their existence describes intended scope; a saved passing run establishes execution. Provider credentials and a tested endpoint are required before claiming a live integration.

All custom work remains **Unvalidated** pending recorded human UI/UX review. Automated geometry does not prove faster component discovery or improved human task completion. The next human comparison should measure whether a developer can find a specified component and run/copy the correct example with fewer wrong destinations.

## Primary references

- [Vercel useChat](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat), [transport](https://ai-sdk.dev/docs/ai-sdk-ui/transport), [streamText](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text).
- [OpenAI Responses streaming](https://developers.openai.com/api/docs/guides/streaming-responses), [official Node stream helper](https://github.com/openai/openai-node/blob/main/docs/streaming.md).
- [Anthropic TypeScript SDK](https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript), [Messages streaming](https://platform.claude.com/docs/en/build-with-claude/streaming).
- [OpenRouter AI SDK provider](https://openrouter.ai/docs/guides/community/vercel-ai-sdk).
- [CopilotKit headless UI](https://docs.copilotkit.ai/custom-look-and-feel/headless-ui), [thread-aware useAgent](https://docs.copilotkit.ai/reference/hooks/useAgent).
- [AG-UI AbstractAgent](https://docs.ag-ui.com/sdk/js/client/abstract-agent).
