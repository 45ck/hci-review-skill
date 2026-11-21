# Assistant compositions

Familiar prompt, attachment, suggestion, message and source patterns rendered with the installed Vercel UI SDK. Import from `@quantitative-hci/liquid-glass/assistant` and load `@quantitative-hci/liquid-glass/assistant.css` after the shared kit stylesheet. Reuse the host’s `LiquidGlassProvider` and single SDK agent bridge. These custom compositions remain **Unvalidated**.

## Public components

| Component | Inputs and ownership | Actual controls |
| --- | --- | --- |
| `LiquidPromptComposer` | Required `label`, controlled `value`, `onValueChange`, and `onSubmit`. Optional input `controller`, modes, controlled mode callback, status, stop callback, slots, error and labels. | SDK Textarea, Select and Button. |
| `LiquidAttachmentList` | Host records `{id, name, description?, disabled?}` with stable IDs. Optional `onRemove(id, details)`; the host supplies the accepted list. | SDK Button for each removable item. |
| `LiquidSuggestionList` | `{id, label, prompt, disabled?}` records and `onChoose(suggestion, details)`. | SDK Buttons; no synthetic input event or direct DOM mutation. |
| `LiquidMessage` | Stable `id`, `author`, `role: "user" \| "assistant"`, content and optional metadata/actions. | Passive semantic article. The optional action slot accepts genuine SDK controls. |
| `LiquidSourceList` | `{id, title, url, description?}` records; optional controlled or default open state and cancellable `onOpenChange`. | SDK Collapsible and SDK Buttons rendered as semantic links. Invalid or non-HTTP(S) URLs render as unavailable text. |

Supply unique stable item IDs and task-specific labels. `LiquidMessage` does not render untrusted HTML or parse Markdown; the host supplies safe React content. URL validation prevents script and credential-bearing links, but does not establish source reliability or domain authorization.

## Shared state and cancellation

The composer forwards the installed Textarea’s cancellable `onValueChange` and Select’s `onValueChange`. Its `maxLength` defaults to 4,000 code units and applies to agent/controller changes as well as typing. Over-limit proposals call `details.cancel()`. Submission rejects whitespace-only text, invalid/disabled modes and disabled/running state. A shared in-flight guard prevents the SDK Button and textarea shortcut from submitting the same pending request twice.

Use the SDK input controller for a suggestion that fills the composer. Its `setValue` reaches the same validation and host callback as typing or an agent action. `Ctrl/Command+Enter` uses the Textarea’s documented `submitShortcut`; ordinary Enter continues to insert a newline. Button and shortcut submission use the same callback and preserve the SDK source details. The composer catches a thrown/rejected submit callback and displays a field error.

`onSubmit` receives `{text, mode}` and SDK action details. Return asynchronous work so the SDK Button tracks pending state. The host controls `status: "ready" | "running"`, handles execution and cancellation, and passes accepted state back. A dispatched action does not prove a model answered or a host accepted the message. The composer never clears a draft or fabricates a response. Use the input controller to clear it after actual acceptance; `withSource` preserves the original source across an await.

Provide `onStop` to show the Stop control during a running request. It reaches the same host cancellation path for a person and agent. The host owns its AbortController or other cancellation mechanism and must prevent late completions from changing state. Disable attachment actions and unrelated controls while a request owns their inputs when that is appropriate to the host’s task.

## Files and sources

The composer’s `attachments` and `tools` slots fit the installed SDK FileInput composition. The gallery wraps it with `FileInput`/`FileInputDropzone`, shows `FileInputTrigger` in the tools slot, and uses the FileInput controller’s `removeFile` for actual selected files. Picker, drop, paste, file limits and rejection remain upstream behavior. Native picker opening still requires browser user activation. No agent API here can read an arbitrary local path or manufacture a selected file.

The gallery’s project brief is explicitly marked built-in context. Files a person adds remain browser File objects: their contents are neither read nor uploaded. `LiquidAttachmentList` itself only displays supplied metadata and invokes a host removal callback; it does not claim upload completion.

Source disclosure and source links are genuine SDK controls discoverable through the existing bridge. Each link uses the documented Button `render` adapter to retain a navigable anchor with an HTTP(S) URL, safe external-link attributes and a descriptive title. They are references, not proof that a model used them. Host-generated citations must accurately describe the host’s own evidence.

## Pattern provenance

The arrangement follows [AI Elements Prompt Input](https://elements.ai-sdk.dev/components/prompt-input), [Attachments](https://elements.ai-sdk.dev/components/attachments), [Suggestion](https://elements.ai-sdk.dev/components/suggestion), [Message](https://elements.ai-sdk.dev/components/message) and [Sources](https://elements.ai-sdk.dev/components/sources), plus the [21st.dev Aadi prompt input](https://21st.dev/@aadixc0de/components/prompt-input). These are pattern references. This package contains original SDK adapter compositions, no copied third-party implementation and no additional runtime dependency. Existing AgentToolRequest/AgentTaskPanel cover tool and execution review; this module does not duplicate them.

## Demonstration and evidence

`AssistantShowcase` is an explicitly labelled local preview: built-in suggestions fill the actual textarea; an accepted prompt produces one of two fixed responses after a bounded delay. Stop, hiding the collection or hiding the document clears the timer and resolves pending work without a late response. The draft is retained on cancellation. Repeated prompts keep bounded local history.

The compiled recipe is `docs/hci/examples/liquid-glass/src/recipes/assistant-composer.tsx`. The browser scenario `assistant_composition_cancellation_and_sources` in `tests/glass_assistant_contract.py` covers named SDK discovery, valid modes, accepted state, callback source, over-limit and disabled refusal, keyboard submission, duplicate submission, explicit/hidden cancellation, files, source disclosure, 390-pixel layout and forced colours. Evidence paths identify intended scope; only the recorded CI run establishes execution.
