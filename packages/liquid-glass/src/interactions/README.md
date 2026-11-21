# Interactions

**Unvalidated:** these visual adaptations have not been reviewed or approved by a human UI/UX team. Menu behaviour comes from the pinned Vercel UI SDK. Cursor and activation effects are decorative React wrappers around its real controls.

Import components from `@quantitative-hci/liquid-glass/interactions` and styles from `@quantitative-hci/liquid-glass/interactions.css`. Use the existing `LiquidGlassProvider` and `kit.css` once at the application boundary. See the compiling gallery recipes for complete examples.

| Component | Purpose | Main props |
| --- | --- | --- |
| `LiquidCursor` | Scope a precise pointer dot and a settling visual ring to a region. | `variant`: `glass`, `precision`, `native`; `disabled`; normal div attributes. |
| `LiquidClickFeedback` | Add a bounded response to accepted control clicks without owning their actions. | `effect`: `ripple`, `spark`, `none`; normal div attributes. |
| `LiquidContextMenu` | Offer the same object actions through a context area and a visible SDK menu trigger. | `label`, `triggerLabel`, `actions`, `onAction`, `disabled`. |
| `LiquidMagnetic` | Move a decorative icon slightly inside a fixed button or link. | `distance` in CSS pixels, clamped to 0–12; `children`; `className`. |

## Keep meaning in the real controls

Use SDK buttons, fields and menus for every action and mutable value. These decorators add no parallel agent bridge or mutation API. A person, keyboard and SDK agent use the same callbacks. Return a Promise from an SDK action to retain its pending behaviour.

`LiquidContextMenu.actions` has stable `id` and visible `label` values, plus optional `disabled`, `destructive` and `requiresConfirmation` fields. The confirmation string becomes the SDK's `data-agent-confirm` marker; the host's agent policy still decides whether the action is permitted. The wrapper rejects unknown and disabled action IDs. It returns the application's `onAction` result unchanged, including async work and errors.

The context area is tabbable. The SDK owns right-click, long press, Shift+F10, arrow navigation, typeahead, Escape, popup positioning and focus return. The visible trigger remains available for touch and discoverability. Native context menus outside that area stay available; `disabled` preserves the native menu inside the area too. Do not make a required action available only through right-click.

## Cursor hints and geometry

`data-cursor-label` provides a short decorative action hint; it never replaces a control's accessible name. `data-cursor-media` enlarges the glass ring over a media region. `data-cursor="native"` or `data-qg-native-cursor` excludes a subtree. Inputs, editable text, native media controls, canvases, popups and disabled/busy controls retain their normal pointer.

The hotspot follows exact client coordinates. Only the ring eases and docks toward small controls. No hit region, button label or menu target moves. `LiquidMagnetic` is for an **icon inside a real button or link**: its contents are `aria-hidden`, so never place text, controls or essential information inside it.

All effects follow the provider's resolved motion preference. Custom cursors require a fine mouse pointer; touch and pen keep native interaction. Forced colours suppress decoration. Reduced transparency uses an opaque cursor surface. Work settles rather than running a perpetual animation loop, and hidden regions, document visibility changes, preference changes and unmount release active effects. Cursor and magnetic geometry use the shared `--liquid-fx-*` variables so their style changes do not trigger GPU surface rescans. The cursor ring is a decorative highlight, not another WebGPU renderer.

Click feedback follows an unprevented click, including keyboard activation at the control centre. It skips controls already disabled or pending, clips the response to the target, caps simultaneous responses at six, and removes them after 560 ms. It indicates activation, **not success**; show successful completion, rejection or failure in application state.

## Provenance

The visual patterns extend CK.com and Wayrest's shared `packages/ui-portfolio/src/site-cursor.js` and fixed-target interaction approach in `packages/agency-motion/index.js`. The implementation is local to this kit and introduces no interaction dependency. UI SDK's documented `@ui-sdk/react/menu` owns all menu behaviour. External cursor galleries informed visual choices; no React Bits or Motion+ source was redistributed.
