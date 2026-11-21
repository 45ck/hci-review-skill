# Native motion

Quantive motion is a native React/DOM/SVG layer on the installed Vercel UI SDK, with the existing glass material, fonts and isometric icons. Import from `@quantitative-hci/liquid-glass/motion` and load `@quantitative-hci/liquid-glass/motion.css` after `kit.css`. Reuse the application's `LiquidGlassProvider` and single `createAgent` bridge.

The library contains ten geometric icon pairs, nine finite icon effects, reusable interface transitions, a guarded named-state primitive, native layered scenes and an optional external-renderer lifecycle adapter. The 42-record [motion recipe registry](/motion-recipes.json) makes the design rules available to authoring agents. All custom components remain **Unvalidated**: automated checks do not replace human UI/UX review.

## Choose the purpose first

| Intent | Use | Rule |
| --- | --- | --- |
| State | Play/Pause, expanded/collapsed, saved/unsaved | The icon follows the accepted state; animate between authored endpoints. |
| Feedback | One press, a completed save, a rejected request | Trigger a finite response from the real action/result. Keep the control's label and hit target stationary. |
| Continuity | Reordered work, changed selection or number | Keep stable IDs and relate old and new accepted values. |
| Presence | Panel appears or leaves | Preserve SDK focus/dismissal behavior; an exiting subtree becomes unavailable immediately. |
| Progress | Pending work and real progress values | Display the task state; an animation ending cannot mark work complete. |
| Attention | A rare, meaningful change | Avoid repeated effects and competing motion. |

`selectLiquidMotionRecipe({intent, target, meaningfulChange, reducedMotion, frequent})` returns `{recipe, presentation, reason}`. `presentation` is `animate`, `instant` or `none`. An unchanged value or unmatched target produces `none`; reduced motion yields the final endpoint; frequent attention effects produce `none`. `findLiquidMotionRecipes(query)` searches all words against IDs, titles, component names, targets and use guidance.

Recipes describe `useWhen`, `avoidWhen`, requirements, trigger, nominal duration, interruption behavior and source links. They distinguish `native`, `existing-sdk` and `host-adapter` implementations. Selection is guidance for composition, not an authorization or mutation API. The exact props and effective preference still decide execution.

## Policy

`LiquidMotionProvider({children, mode?, preset?})` scopes motion. Modes are `system`, `reduced` and `off`. Presets are `calm`, `responsive` and `expressive`; responsive is the default. `useLiquidMotionPolicy()` returns `mode`, `preset`, `enabled`, `reducedMotion`, `effective` and `durationScale`.

The effective setting combines the existing material's motion preference, the device's reduced-motion/forced-colour preference and nested motion providers. A child cannot relax an ancestor's reduced/off setting. The scope also suppresses existing SDK CSS transitions when reduced/off. A portal outside the scope follows the enclosing material/device policy; place a policy provider inside an independently portalled surface if it needs the local override.

Effects are finite, clean up on unmount and stop when hidden or offscreen. Suppression preserves a readable final state. Presets change bounded timing, not business state. Do not add an indefinite decorative loop to indicate whether an agent is actually working.

## Icons

```tsx
import { useState } from "react";
import { Toggle } from "@ui-sdk/react/toggle";
import { LiquidMorphIcon } from "@quantitative-hci/liquid-glass/motion";

function Playback() {
  const [playing, setPlaying] = useState(false);
  return <Toggle aria-label="Playback" pressed={playing} onPressedChange={setPlaying}>
    <LiquidMorphIcon pair="play-pause" active={playing} size={40} />
    {playing ? "Pause" : "Play"}
  </Toggle>;
}
```

`LiquidMorphIcon({pair, active, size?, className?})` renders one of ten original matched-path pairs: `play-pause`, `menu-close`, `plus-minus`, `chevron`, `volume-mute`, `lock-unlock`, `bookmark-saved`, `eye-hidden`, `expand-restore`, `heart-saved`. `active=false` is the first state in `LIQUID_MORPH_DEFINITIONS[pair].states`, and `active=true` is the second. The initial render is already at the correct endpoint. Rapid reversal interpolates from the displayed progress. Play is two adjacent triangle pieces which become separate Pause bars.

`LiquidAnimatedIcon({name, effect, trigger?, active?, revision?, size?, className?})` reuses all 17 existing `LiquidIcon` names. Effects are `draw`, `ring`, `lift`, `spin`, `pulse`, `tilt`, `bounce`, `shake`, `spark`. `trigger="hover"` follows the nearest semantic control's hover and keyboard focus. `trigger="state"` responds when `active` becomes true; setting it false stops it. A changed finite `revision` replays in either mode. Bell, layers, activity and sparkles have part-level choreography where applicable; other cases animate the decoration as a whole.

Icons are passive and `aria-hidden`. The enclosing SDK control supplies the accessible name and actual state. Isometric/line appearance remains controlled by the existing provider; small sizes and forced colours use the line fallback. There is no second hidden icon action endpoint.

## Interface components

| Component | Inputs and behavior |
| --- | --- |
| `LiquidMotion` | `children`, `transitionKey`, optional `recipe`, `duration`, `className`, `as`. A changed key replays a finite content transition; initial mounting does not imply a task change. |
| `LiquidPresence` | `present`, `children`, optional `recipe`, `duration`, `className`, `restoreFocusRef`. Retains a visual exit while immediately marking the subtree inert, aria-hidden and data-agent-hidden. Supply a focus-return ref when interactive content can leave. |
| `LiquidMotionList` | `items: {id, content}[]`, optional `label`, `className`, `itemClassName`. Uses stable keyed nodes and FLIP continuity for insertion/reordering. Removed rows are removed immediately, so stale actions do not remain. |
| `LiquidMotionNumber` | `value`, optional `format`, `label`, `duration`, `className`. Accessible text gets the accepted value immediately; an aria-hidden display interpolates. |
| `LiquidTextTransition` | `text`, optional `recipe`, `className`. Semantic final text changes immediately while the decorative copy transitions. |
| `LiquidSharedIndicator` | `label`, `items: {id,label,disabled?}[]`, controlled `value`, `onValueChange`, optional `disabled`, `readOnly`, `className`. Composes real SDK SegmentedControl parts and forwards SDK details/cancellation. |
| `LiquidMotionFeedback` | `status: idle|pending|success|error`, optional `label`, `children`, `className`. Finite feedback follows the supplied task state; it never starts work or fabricates progress. |
| `LiquidDepth` | `children`, optional `active`, `className`. Decorative depth response. The whole wrapper is aria-hidden: keep essential content and controls outside it. |

Content transition recipes are `fade`, `slide`, `scale`, `blur`, `lift`, `flip`, `draw`. Do not layer multiple layout-animation owners on the same list. Existing SDK Dialog, Drawer, Popover, Accordion, Switch, Progress and Toast retain their existing kit transitions and behavior. Compose those parts instead of recreating focus management or adding another popup system.

## Guarded states for people and agents

`LiquidMotionState` renders the public `liquidMotionState` SDK primitive. A graph declares `{id, initial, states: {id,label}[], transitions: {from,event,to,label}[]}`. It supports 1–64 states and at most 256 transitions. Identifiers/labels are nonempty and at most 120 characters, IDs are unique, endpoints exist and an event has one target from a source state. `validateLiquidMotionGraph(graph)` reports invalid definitions before mounting; the primitive rejects an invalid graph.

The React component accepts `label`, `graph`, `value` or `defaultValue`, `disabled`, `readOnly`, `onValueChange`, optional `children(state)` and `className`. Its outgoing human controls are real SDK Buttons. The shared agent primitive exposes one action:

```json
{"contract":"liquid-motion-state","action":"send","args":["start","idle"]}
```

The second argument is the exact expected source state. Unknown events, stale states, disabled/read-only states and cancelled callbacks do not mutate the graph. Discover the current root and its outgoing event items, dispatch `send(event, expectedState)`, then inspect the accepted `value` and rendered result. A dispatch response alone is not a postcondition. `onValueChange(next, details)` supports synchronous `details.cancel()`; retaining controlled props can also decline a proposed change. Do not await before cancellation. Host work and permissions stay in the application.

The gallery's workflow is a local graph with Ready, Running, Paused, Complete and Needs attention states. The separate agent-work study uses a bounded local Promise, explicit cancellation, retry and a deliberate failure path. Neither calls an AI backend or represents an actual production task.

## Scenes and optional runtimes

`LiquidMotionScene({scene, state, className?})` maps a named state to original existing-icon layers. `scene` supplies `{id,label,states,layers}`; each layer has `{id,icon,poses}`. Poses supply optional `x`, `y`, `rotation`, `scale`, `opacity`, `depth`. Values are finite and bounded; rapid state changes retarget from the visible frame. The scene has one accessible image label and decorative layers. This supplies lightweight isometric choreography, not arbitrary SVG extrusion, GLB import/export or a 3D editor.

`LiquidMotionAsset({label, runtime, properties, fallback, className?, onError?})` is a generic adapter for a renderer the host already has. `runtime.mount(element, AbortSignal)` returns, or resolves to, a controller with `update(properties)`, `pause()`, `resume()`, `dispose()`. Properties are string, number or boolean values. Keep the runtime object stable. The adapter creates a distinct mount host per generation, applies current properties, pauses when hidden/offscreen, disposes stale/failed renderers and shows fallback under reduced/off policy. Diagnostic `onError` exceptions cannot interrupt cleanup.

No Rive, Lottie or 3D runtime and no external artwork is bundled. A consuming application must install/configure its chosen engine, implement the controller, supply an accessible fallback and ensure the engine and asset licences fit. The adapter is a useful integration boundary, not a claim that any particular third-party file has been tested.

## Provenance and verification

The [source analysis](https://github.com/45ck/hci-review-skill/blob/feat/quantive-native-motion/docs/hci/standards/motion-sources.md) maps eleven reviewed libraries to the native implementation and records licences and boundaries. New motion source and path geometry are original Quantive work; no upstream component source or artwork was bundled. The installed Vercel UI SDK continues to supply interactive semantics.

Run `npm run glass:verify` for the static contract, real primitive/geometry/recipe tests, TypeScript and production/document build. `tests/glass_motion_contract.py`, included in the required production browser suite, checks actual controls and accepted state, not just action dispatch. Release metadata fingerprints the hosted recipes, schema and this guide with the rest of the agent documents. Test evidence remains separate from human validation.
