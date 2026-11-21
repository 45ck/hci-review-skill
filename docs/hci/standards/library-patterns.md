# Established library patterns

**Decision:** compose familiar work and assistant patterns from the existing Vercel UI SDK `0.1.0-beta.13` controls. Keep the recognisable control arrangement and interaction vocabulary of the inspected libraries, with Quantive's shared material, typography and agent contract. Reuse upstream behaviour before creating another primitive.

## Task and observable outcome

A person or coding agent should be able to find a document, narrow the list, act on a selection and inspect its details. In the assistant example, they should be able to choose a suggestion, edit a draft, manage attachments, submit or stop the local demonstration and inspect its references. An application developer should be able to copy a compiled example and connect these controls to existing application state.

Success means an accepted action changes the intended state: the visible result set matches the filters; a bulk action changes the selected records; the detail sheet shows the chosen record; the draft contains the chosen suggestion; removing an attachment changes the attachment list; submitting or stopping updates the displayed lifecycle. A successful SDK action response alone does not prove the controlled host accepted a proposal.

## Content and navigation

The additive collections are **Patterns** (`?collection=patterns`) and **Assistant** (`?collection=assistant`). Preserve the existing SDK catalogue and Interactions, Sections, Graphics, Standards and Agents collections. Use stable record, command, attachment, suggestion, message and source IDs. Keep task names consistent in visible copy, accessible names and agent discovery.

Records, selected IDs, filters, draft text, attachments and message lifecycle belong to the host. The reusable components provide composition and presentation around genuine SDK controls. They do not supply a second application store, persistence layer, model provider or agent bridge.

## Components and established patterns

| Component | Familiar structure | SDK foundation and boundary |
| --- | --- | --- |
| `LiquidCommandPalette` | Search above grouped actions, optional shortcut hints, empty results and a modal palette. | `Command` inside `Dialog`; SDK filtering, keyboard navigation, dismissal and focus recovery. Stable command IDs dispatch through the host callback. |
| `LiquidFilterBar` | Text search and compact facet controls above results, with a clear action. | SDK `Input`, `Select` and `Button`; the host owns the filtered data and accepted filter state. |
| `LiquidSelectionBar` | Selected count beside available bulk actions. | SDK `Toolbar` and real action controls; host selection remains authoritative. Do not confuse a selected-row bar with a text-selection floating toolbar. |
| `LiquidDetailSheet` | Edge panel with a title, description, readable detail content and actions. | SDK drawer/dialog behaviour owns opening, dismissal and focus. Keep the chosen record and controls usable at narrow widths. |
| `LiquidEmptyState` | A small visual, meaningful title, explanation and recovery action. | Passive semantic presentation with a slot for genuine SDK controls; it has no invented agent actions. |
| `LiquidPromptComposer` | Growing message field, attachment area, model/options controls and Send/Stop action. | SDK `Textarea`, `Select` and `Button`; compose SDK `FileInput` in the host when local file selection is needed. The host supplies callbacks and lifecycle; the component does not call a model. |
| `LiquidAttachmentList` | Compact file chips or rows with name/type and an explicit remove control. | Stable attachment IDs and SDK buttons, for selected files or explicitly supplied project context. Selecting a local file does not upload it; display only the metadata/content the host supplies. |
| `LiquidSuggestionList` | Short, wrapping suggestion buttons near the message field. | SDK buttons invoke one shared host callback. The host decides whether a suggestion fills the draft or submits it; the example must make that choice visible. |
| `LiquidMessage` | Separate user and assistant presentation, response content and optional actions. | Passive message structure with genuine SDK children. Supplying message markup does not imply a markdown parser, response branching, streaming transport or AI service. |
| `LiquidSourceList` | A compact reference disclosure opening to named sources. | SDK `Collapsible` and SDK Buttons rendered as meaningful links. Sources are host-provided references, not evidence that the component performed a search. |

Reuse the existing `AgentToolRequest` and task components when an assistant flow needs tool input, result, review or task history. Preserve their revision, review, pending, error and cancellation rules; do not create a parallel tool-execution model.

## Shared human and agent operation

Reuse the host's single `createAgent` bridge from `@ui-sdk/react/agent`. Discover controls with `snapshot` and `query`, read current actions and choices, use `act`, and inspect the accepted application state. Subscriptions may observe changes; the recipe registry and agent contracts are documentation, not another mutation endpoint.

Use meaningful control names, stable values and the installed SDK callbacks. Forward cancellable changes and their source; a refused change must leave the accepted host value intact. Keep disabled, read-only, hidden, secret and confirmation semantics on the actual controls. Hosts that retain an inactive page must pass null for its command-palette shortcut; hiding the page alone does not remove the SDK global shortcut. Verify the modal remains closed when returning and the shortcut works again while active. A person and an agent must reach the same validation path. Input source is attribution, not authentication, and the host still owns authorization.

Native file selection remains mediated by the browser and host. Do not add an agent action that claims to acquire arbitrary local files. Attachment removal, draft editing and submission use the same accepted state as their visible controls. Return asynchronous work from action callbacks where the SDK supports it, keep pending/error feedback observable, and preserve a usable stop/cancel path when the host exposes one.

All custom components remain **Unvalidated** pending recorded human UI/UX review. Preserve the shared provider, selectable font/icon preferences, solid and forced-colour fallbacks, reduced motion, stationary hit targets and bounded animation. Keep text, selection and focus in real DOM controls. Familiar appearance does not establish accessibility conformance or a human performance gain.

## Provenance and reuse

The following public documentation and listings were inspected on **21 November 2026**. They establish pattern provenance; installed SDK documentation and declarations govern the implementation. These additions are original SDK compositions; no third-party component source was copied. No new interaction dependency is needed for the behaviours already provided by the SDK.

| Source | Pattern used | Licence observed and treatment |
| --- | --- | --- |
| [shadcn/ui Command](https://ui.shadcn.com/docs/components/radix/command) | Grouped command search and modal palette. | [shadcn/ui MIT](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md), copyright 2023 shadcn. Reference the arrangement; use SDK `Command` rather than importing its `cmdk` stack. |
| [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/radix/data-table) | Filters, row selection and contextual actions. | Same shadcn/ui MIT source. Reference the visible composition; do not imply this package includes its TanStack table implementation. |
| [shadcn/ui Sheet](https://ui.shadcn.com/docs/components/base/sheet), [Empty](https://ui.shadcn.com/docs/components/radix/empty) | Complementary detail panel and recoverable empty state. | Same shadcn/ui MIT source. Keep existing SDK popup behaviour and passive empty-state structure. |
| [Vercel AI Elements Prompt Input](https://elements.ai-sdk.dev/components/prompt-input), [Attachments](https://elements.ai-sdk.dev/components/attachments) | Message composer, model/options area, named removable attachments. | [AI Elements Apache-2.0](https://github.com/vercel/ai-elements/blob/main/LICENSE), copyright 2023 Vercel, Inc. Pattern references; not an AI Elements runtime dependency. |
| [Vercel AI Elements Suggestion](https://elements.ai-sdk.dev/components/suggestion), [Message](https://elements.ai-sdk.dev/components/message), [Sources](https://elements.ai-sdk.dev/components/sources) | Suggested prompts, user/assistant turns and disclosed references. | Same AI Elements Apache-2.0 source. Implement only documented package features; broader upstream features are not implied. |
| [21st.dev — Aadi Prompt Input](https://21st.dev/@aadixc0de/components/prompt-input) | Compact attachment/model/tool controls and Send-to-Stop presentation. | Public listing identifies MIT. The public description/demo was inspected; account-gated component source was not retrieved. |
| [21st.dev — Kokonut AI Input With File](https://21st.dev/@kokonutd/components/ai-input-with-file) | Growing text field, attachment preview and explicit file limits. | Listing identifies MIT; [Kokonut repository licence](https://github.com/kokonut-labs/kokonutui/blob/main/LICENSE) is MIT, copyright 2025 kokonutUI. Public pattern reference. |

At the research date, the AI Elements documentation announces a move to [shadcn/ui AI Elements](https://ui.shadcn.com/docs/ai-elements) and deprecation of the former project at the end of November 2026. These references record the inspected patterns; Quantive retains its pinned UI SDK foundation. Check the current source and licence before any later direct source import. Preserve the applicable notices and identify modifications if code is actually copied or adapted. Existing renderer, fonts, icons and artwork keep their original provenance in `THIRD_PARTY_NOTICES.md` and their asset manifests.

## Evidence, result and next decision

**Implementation evidence required:** run `npm run glass:agent-check` and `npm run glass:verify`, then the production browser contracts through the existing CI workflow. Extend the runtime evidence with representative Patterns and Assistant tasks: actual filtering and selection results, command dispatch, details and focus recovery, suggestion-to-draft state, attachment removal, submission/stop state, refused or disabled changes, and applicable keyboard alternatives. Preserve baseline scenarios. Record the exact source commit, browser, viewport, preferences, screenshots, errors and JSON results with the run; this document is not a test-pass record.

The intended scenario names are `patterns_commands_filters_selection_and_details` in `tests/glass_patterns_contract.py` and `assistant_composition_cancellation_and_sources` in the Assistant browser contract. The package sources live under `packages/liquid-glass/src/patterns/` and `packages/liquid-glass/src/assistant/`; the gallery uses `patterns-showcase.tsx` and `assistant-showcase.tsx`. A scenario's presence is separate from its execution result.

**Quantitative checks:** verify page width at 390 CSS pixels, usable popup bounds, stationary controls and settled work under normal/reduced motion and forced colours. Test accepted postconditions and rejection paths through the real SDK bridge. These observations establish implementation behaviour only.

**Result boundary:** familiar library patterns have been selected and mapped to existing controls; human recognition, discoverability, completion speed and comfort remain unmeasured. **Next decision:** retain or revise the compositions after automated correctness evidence, then compare representative human tasks before changing their Unvalidated status. Record failed attempts and recovery alongside successful outcomes, following the existing [interface foundations](interface-foundations.md) and [agent engineering standard](agent-engineering.md).
