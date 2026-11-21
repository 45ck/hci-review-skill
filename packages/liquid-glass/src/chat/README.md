# Chat compositions

Use `LiquidChat`, `LiquidConversationList` and `LiquidPromptTemplatePicker` from `@quantitative-hci/liquid-glass/chat`. Load `@quantitative-hci/liquid-glass/chat.css` after `kit.css`; it includes the assistant composition styles. Reuse the application's existing `LiquidGlassProvider` and single SDK agent bridge. These React compositions remain **Unvalidated** pending human UI/UX review.

## Host state is authoritative

`LiquidChat` accepts controlled `messages`, `status`, `value`, `onValueChange`, `onSubmit` and optional `onStop`, `onRetry` and `error`. Its prompt callbacks use the exact `LiquidPromptComposer` types. `submitted` and `streaming` map to the existing composer's running state; `ready` means ready for input, not proof that the previous request completed. Use `notice` for the host's accepted outcome, including cancellation or a partial response.

The `composer` prop supplies the existing composer's input controller, labels, modes, file/attachment slots, limits and disabled state. `title`, `description`, `author`, `headerActions`, `sidebar`, `templates`, `empty`, `messageActions` and `renderPart` provide composition slots. The package owns no conversation store, provider credentials, transport, persistence or tool executor. A person and an agent use the same genuine SDK controls; a callback Promise resolving is not evidence of host acceptance. Display the published host snapshot.

The host must cancel work, stop subscriptions and isolate late responses when the selected thread changes or the containing view is hidden/disposed. It may preserve partial text, but should label that outcome. Do not conflate browser Stop with an upstream server having stopped execution.

## Message parts

`LiquidChatMessage` has a stable `id`, a `role` (`user`, `assistant` or `system`), optional `author`, and readonly `parts`:

| Part | Fields | Default rendering |
| --- | --- | --- |
| `text` | `text` | Plain text preserving line breaks; no HTML or Markdown execution. |
| `source` | `id`, `title`, `url` | Existing `LiquidSourceList` with safe HTTP(S) SDK links. |
| `attachment` | `id`, `name`, optional `mediaType`, `url` | Existing attachment metadata. The default does not load or fetch the URL. |
| `tool` | `id`, `name`, `status`, optional `input`, `output` | Read-only SDK disclosure of host-reported status and redacted JSON. No execution or approval. |
| `unsupported` | `label` | Visible explanatory fallback instead of silently dropping content. |

Tool status is `pending`, `running`, `complete` or `error`. Hidden reasoning is not a display part. Adapters must deliberately project supported public output and preserve stable tool-call identities. Do not turn partial tool JSON into an executable request. The host can use `renderPart` to compose the existing `AgentToolRequest` with its real authorization and review state. Returning `undefined` uses the built-in renderer; returning `null` deliberately omits a part. `messageActions` can supply actual SDK copy/retry/edit controls without adding a competing action API.

## Threads and templates

`LiquidConversationList` takes `{id,title,description?,disabled?}` records, controlled `value` and the installed SDK Listbox `onValueChange`. Invalid, null and disabled choices are refused before the host callback; valid choices keep the SDK's cancellable details. `onCreate` is a real SDK Button action. Creating/switching threads and storing drafts are host responsibilities. `createDisabled` can enforce a host's conversation limit while leaving existing threads selectable.

`LiquidPromptTemplatePicker` is an actual SDK Menu. It takes `{id,label,prompt,disabled?}` templates and `onChoose(template, details)`. The installed `MenuActionDetails` contains optional `event`, not a `source` or cancellation field; preserve that exact boundary. Invalid or disabled actions are refused; Promise results preserve native pending/error behavior. The host decides whether a template fills a draft or submits it. The showcase fills its real SDK input controller and focuses it, with input attribution supplied by that controller's own change callback.

## Showcase and evidence

The Chat workspace shows the same controlled conversation in full workspace, side-panel and prompt-playground layouts. It keeps per-thread drafts and local history, supports prompt templates, native file selection/removal, bounded streaming fixtures, Stop and a repeatable simulated error/retry path. It reads or uploads no selected file contents and makes no provider call. Each response is explicitly a local demonstration. Changing threads, hiding the view, hiding the document or unmounting cancels outstanding timers and prevents stale output from changing a different thread.

`tests/glass_chat_contract.py` describes the browser evidence for accepted agent and keyboard actions, drafts, refusal, retry/cancellation, hidden-view cleanup and 390px/forced-colour layouts. Only a recorded run establishes whether those checks passed for a revision. The compiled `chat-workspace.tsx` recipe shows the host boundary without claiming a configured backend.
