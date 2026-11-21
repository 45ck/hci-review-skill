# Familiar application patterns

Five React compositions on the pinned Vercel UI SDK, using the host's existing LiquidGlassProvider and single createAgent bridge. Import from `@quantitative-hci/liquid-glass/patterns` and load `@quantitative-hci/liquid-glass/patterns.css` after kit.css. Custom visuals remain **Unvalidated**.

These follow the established command palette, table filtering/bulk selection, detail sheet and empty state conventions documented by shadcn/ui. They compose the SDK's actual controls; they do not import another keyboard, focus, popup or selection stack. No third-party component source was copied.

## Components

| Export | Inputs and actual behaviour |
| --- | --- |
| `LiquidCommandPalette` | Supply a title, triggerLabel, searchLabel, grouped commands with stable unique IDs, and `onAction(id, details)`. The genuine SDK Command filters and navigates; the SDK Dialog handles focus/dismissal and `shortcut` (default `mod+k`). A returned Promise keeps the command pending. Successful completion requests closure through the SDK controller; rejection stays visible on the command. Disabled and confirmation marks belong to each command. |
| `LiquidFilterBar` | Controlled query plus `onQueryChange`, and optional facets containing stable option IDs, controlled string-array value and SDK `onValueChange`. Both callbacks retain cancellable SDK change details. `onReset(details)` belongs to the host so resetting several filters is one accepted state update. `resultCount` is derived by the host; this component does not implement a hidden query engine. |
| `LiquidSelectionBar` | Controlled selectedCount, named actions, `onAction(id, details)` and `onClear(details)`. Rendered only while there is a selection. Actual SDK Buttons compose ToolbarButton so navigation and agent presses reach the same callbacks, including returned promises, disabled state and confirmation. The host retains selected business IDs. |
| `LiquidDetailSheet` | title, triggerLabel, children, optional description/footer, and the SDK Drawer `open`, `defaultOpen`, `onOpenChange`, `controller` and `side`. The default logical side is `end`. Dismissal, focus return, touch and controlled acceptance stay with the SDK. Footer slots should contain genuine SDK controls. |
| `LiquidEmptyState` | Passive media/title/description/action-slot structure. Decoration is hidden from assistive technology. Put meaningful SDK controls in actions. It owns no state or invented agent action. |

`LiquidCommandPalette` also accepts controlled query/onQueryChange and open/onOpenChange, defaultOpen, description, placeholder and className. The installed beta13 CommandActionDetails contains an optional event; unlike ButtonActionDetails it does **not** advertise a source field. Do not infer an authenticated actor from either shape. Dialog, Input and Select change callbacks retain their actual SDK source/cancel details.

Supporting copy is optional. An omitted, empty or whitespace-only command description renders no description element; the SDK title still names the dialog. Supply a description only when it adds useful context, such as a consequence or a constraint. `title="Article actions"` needs no subtitle saying "Search the available actions." A supplied description such as "Changes are saved to this draft." belongs only in a host that actually provides that behavior. Follow the [content composition standard](../../../../docs/hci/standards/content-composition.md) for headings, state messages and recovery copy.

The default `shortcut` is `mod+k`; pass `shortcut={null}` to remove that global SDK trigger binding. Hosts that keep inactive pages mounted must disable their shortcuts explicitly, for example `shortcut={active ? "mod+k" : null}`. A hidden ancestor alone does not disable this SDK shortcut. The showcase wires its active collection state to this prop and verifies the dialog remains closed after returning, with the shortcut usable again while active.

## Controlled acceptance and operation

Discover the current named SDK controls with `query`/`snapshot`; read the available actions and choices before using `act`. Observe the accepted visible result, not just dispatch success. The composition itself adds no new browser mutation endpoint. A host can refuse a query or facet change with `details.cancel()`, refuse a command by throwing/rejecting, and keep a controlled dialog open by cancelling its requested close. Reuse the host's existing authorization and persistence rules.

Keep command IDs unique across all groups, facet IDs unique within the bar and option IDs unique in each facet. Do not put essential controls or information in the passive empty-state media slot. Do not treat optional online/share actions as functional without a host callback; the local gallery explicitly disables those actions.

The gallery sample keeps its records and selection in React state. Filtering, keyboard selection, bulk archiving, title edits and restore all update that same state. A search over 80 characters and an empty or overlong record title are refused through the same SDK callbacks for human and agent changes. Records and artwork are fictional local examples. No network or model provider is invoked.

## Example and evidence

`docs/hci/examples/liquid-glass/src/recipes/work-patterns.tsx` is the compiled source offered for copying. Compose its inner content into an existing provider; initialize the agent bridge once at the host boundary.

`tests/glass_patterns_contract.py` checks the production gallery's named SDK discovery, command choices/results, disabled command, controlled query rejection, multiple status choices, selection and one bulk callback, detail title editing, keyboard focus return, hidden collection shortcut isolation and 390-pixel/forced-colour layout. It also checks the supplied description's accessible relationship and the runnable work recipe's title-only palette, accepted command result and focus return. Its existence is a declared scope, not a claim that any particular revision passed.

Use the [before/after task record](../../../../docs/hci/templates/task-comparison.md) when evaluating a complete composition. The [article review example](../../../../docs/hci/examples/article-review-evidence.md) separates a proposed domain task from the existing local review fixture and leaves unmeasured human outcomes explicit. Reuse the application layout and host task state when composing a review/change/return flow; these patterns do not introduce another shell or execution store.

## References

- [shadcn/ui Command](https://ui.shadcn.com/docs/components/radix/command)
- [shadcn/ui Data Table](https://ui.shadcn.com/docs/components/radix/data-table)
- [shadcn/ui Sheet](https://ui.shadcn.com/docs/components/base/sheet)
- [shadcn/ui Empty](https://ui.shadcn.com/docs/components/radix/empty)
- Installed `@ui-sdk/react/docs/components/command.md`, `dialog.md`, `drawer.md`, `select.md`, `input.md` and `toolbar.md` define the implementation's pinned APIs.
