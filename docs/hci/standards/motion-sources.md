# Motion source studies and implementation boundary

Reviewed 21 November 2026. This document records the primary documentation, public source interfaces and licence files used to design Quantive's native motion layer. It describes pattern coverage, not API compatibility or feature parity with eleven separate products. Public branch URLs can change; recheck the relevant licence and asset notice before importing third-party code or artwork.

The implementation lives in `packages/liquid-glass/src/motion`, with a real gallery at `?collection=motion`. Import its public interface from `@quantitative-hci/liquid-glass/motion` and its styles from `@quantitative-hci/liquid-glass/motion.css`. The gallery uses the existing appearance and glass providers, the original icon catalogue, genuine UI SDK controls, and the existing page agent bridge. Its visible validation status remains **Unvalidated**: implementation checks do not demonstrate improved task completion or other user outcomes.

## Architectural decision

Application state owns the result. Motion explains an accepted state change; finishing an animation cannot make a task succeed, grant permission, save a record, or commit another business operation. Buttons, toggles, selections and overlays retain the UI SDK's semantics, callback cancellation, pending behaviour and agent interface. The motion components are passive compositions except for the explicitly registered state-graph primitive.

This follows the repository's [agent engineering standard](agent-engineering.md), [interface foundations](interface-foundations.md) and [agent-first modelling guidance](agent-first-modeling.md). The SDK API and component specifications are available in the installed `@ui-sdk/core` and `@ui-sdk/react` package documentation. A page creates one bridge; motion does not add a parallel mutation endpoint.

### What is included

| Capability | Quantive implementation | Important boundary |
| --- | --- | --- |
| Controlled icon transitions | `LiquidMorphIcon`, ten authored reversible pairs | Compatible path geometry is authored for these pairs. This is not an arbitrary SVG morphing engine. |
| Icon interaction effects | `LiquidAnimatedIcon`, nine finite effects over the existing seventeen icon names | Hover and keyboard focus use the containing semantic control. Explicit revision changes provide replay. No icon assets from these source libraries are bundled. |
| Finite transition recipes | `LiquidMotion`, `LiquidPresence`, `LiquidTextTransition` | Fade, slide, scale, blur, lift, flip and draw compose existing content. Presence does not retain a stale interactive exit clone. |
| Collection changes | `LiquidMotionList` | Stable item IDs; finite insert and reorder animation. Removal is immediate, so removed content cannot remain actionable. No general DOM observer engine. |
| Selection continuity | `LiquidSharedIndicator` | Genuine SDK `SegmentedControl`, including disabled, read-only and cancellable changes. |
| Numeric changes | `LiquidMotionNumber` | The actual target value is available to assistive technology immediately; any interpolation is visual. |
| Async feedback | `LiquidMotionFeedback` plus SDK Button/Progress | Pending, success and error are supplied state. Cancellation/retry belong to the application. No animation-driven success and no perpetual decorative spinner. |
| Depth and scenes | `LiquidDepth`, `LiquidMotionScene` | Existing artwork with bounded transforms and named poses. No mesh extrusion, material editor or timeline authoring engine. |
| Agent-addressable state graphs | `liquidMotionState`, `LiquidMotionState` | Named states/events, validated edges, expected-current-state checks, disabled/read-only rejection and callback cancellation. No Rive file parser or RML compiler. |
| External animation integration | `LiquidMotionAsset` runtime interface | A lifecycle boundary for a separately provided runtime: mount, update, pause, resume, dispose, abort and fallback. It does not ship a Rive runtime, asset loader or Rive-specific adapter. |
| Agent recipe discovery | Machine-readable recipe registry and JSON schema | Purpose, accepted state, constraints and fallback are recorded. Agents choose from supported recipes, rather than inventing animation endpoints. |
| Motion preferences | `LiquidMotionProvider`, `useLiquidMotionPolicy` | Calm/responsive/expressive presets; system/reduced/off modes; effective preference is observable. The host glass/appearance policy still applies. |

## Licence inventory

These entries distinguish source-component licences from paid products, tutorials, editor services and individual asset rights. A permissive runtime licence does not automatically license every asset shown on a project's website. No third-party implementation or icon geometry was copied into the new native components.

| Source | Licence file or terms reviewed | Consequence for this library |
| --- | --- | --- |
| useAnimations | [MIT source licence](https://github.com/useAnimations/react-useanimations/blob/main/LICENSE); [published licence terms](https://useanimations.com/licencing-and-terms) | The published terms expressly allow UI-kit redistribution. Keep the required notices if code or assets are imported later. |
| Lucide Animated | [MIT component licence](https://github.com/pqoqubbw/icons/blob/main/LICENSE); [repository README](https://github.com/pqoqubbw/icons) | Component code is MIT. The README separately restricts redistribution/resale of tutorials and demos; those are not copied here. |
| PulsoIcon | [ISC and upstream asset notices](https://github.com/CityPulso/PulsoIcon-Package/blob/main/LICENSE) | Runtime/animation permission must be read together with the SVG-source notices. Retain applicable upstream notices for any imported artwork. |
| ItsHover | [Apache License 2.0](https://github.com/itshover/itshover/blob/master/LICENSE) | The actual licence file governs; a stale README reference to MIT must not be treated as the licence. Follow applicable attribution, modification and notice obligations if importing source. |
| Animate UI | [MIT text with Commons Clause restriction](https://github.com/imskyleen/animate-ui/blob/main/LICENSE.md) | This is not an unrestricted MIT distribution. Do not copy its components into this component library under a bare MIT assumption. The new components are independently implemented from interaction concepts. |
| Motion | [MIT engine licence](https://github.com/motiondivision/motion/blob/main/LICENSE.md) | The open engine is MIT. Motion+ is a separate paid offering; paid examples/components are outside this study's source material. |
| Motion Primitives | [MIT licence](https://github.com/ibelick/motion-primitives/blob/main/LICENCE.md) | Public primitives may be reused under their licence with notices. This implementation instead composes the existing SDK controls. |
| FormKit AutoAnimate | [MIT licence](https://github.com/formkit/auto-animate/blob/master/LICENSE) | The layout mechanism may be studied or reused with its notice; the new list implementation is native and bounded to its own keyed items. |
| Flubber | [MIT licence](https://github.com/veltman/flubber/blob/master/LICENSE) | Permission covers the library, not arbitrary third-party SVG inputs. No Flubber code or runtime is included. |
| Rive React | [MIT runtime licence](https://github.com/rive-app/rive-react/blob/main/LICENSE) | The React runtime is open source. Editor access, service terms and individual `.riv` assets are separate; no editor or asset rights are inferred. |
| Glyphrise | [MIT licence](https://github.com/bernaferrari/glyphrise/blob/main/LICENSE) | The source is MIT. Imported SVGs and other external assets retain their own rights. The native layer does not incorporate the Glyphrise engine. |

## Source specifications and mappings

### 1. useAnimations — controlled endpoints and discoverable icons

[Website](https://useanimations.com/) · [Documentation](https://useanimations.com/documentation) · [Source](https://github.com/useAnimations/react-useanimations) · [Agent-readable index](https://useanimations.com/llms.txt)

The current documentation distinguishes interaction triggers from an icon's controlled active state. It documents six triggers, keyboard focus, offscreen loop suspension and immediate reduced-motion endpoints. Its machine-readable catalogue is useful because an agent can discover available icons and their supported behaviour before choosing one.

**Implemented:** a controlled `active` endpoint for morph pairs; explicit `revision` replay for effects; semantic hover/focus; finite effects that stop when unavailable; source metadata naming each pair, its two states and its intended use. The catalogue reuses Quantive's existing icon names and original glyph geometry.

**Boundary:** no external icon catalogue, vendor asset format, Lottie payload or useAnimations-compatible prop API is included. A press does not toggle an internal animation-only state independently of the host control.

### 2. Lucide Animated — purposeful motion within an icon

[Demo](https://lucide-animated.com/) · [Source](https://github.com/pqoqubbw/icons) · [Inspected sparkles implementation](https://github.com/pqoqubbw/icons/blob/main/icons/sparkles.tsx)

The inspected component exposes imperative start/stop behaviour and separately controls parts of a glyph. That supports small effects such as staggered sparks instead of moving every icon as an undifferentiated rectangle. The inspected sample alone did not establish a universal reduced-motion contract for the complete catalogue.

**Implemented:** finite draw, ring, lift, spin, pulse, tilt, bounce, shake and spark effects. Existing layered, bell, activity and sparkles artwork can animate parts appropriate to that icon. Effects remain decorative and do not claim that an operation completed.

**Boundary:** existing Quantive artwork remains the source of geometry. The library does not import the vendor's tutorials, demo pages or full catalogue. Reduced-motion behaviour is supplied by Quantive's policy, not assumed from a source example.

### 3. PulsoIcon — reusable recipes around semantic controls

[Current repository](https://github.com/CityPulso/PulsoIcon-Package) · [Core specification](https://github.com/CityPulso/PulsoIcon-Package/blob/main/packages/core/README.md) · [React specification](https://github.com/CityPulso/PulsoIcon-Package/blob/main/packages/react/README.md)

The core package separates shape data from reusable animation recipes; its documented collection includes 35 recipes. The React layer documents explicit animation controls, automatic animation, awaitable playback, nearest-control hover/focus behaviour and reduced-motion handling.

**Implemented:** one shared recipe vocabulary across original icons; containing-button hover/focus; state and revision triggers; cancellation and cleanup; global character and preference controls. The semantic control retains its stable hit target while only the artwork moves.

**Boundary:** the nine included effects are a selected native vocabulary, not all 35 PulsoIcon recipes or its complete playback API. UI actions await application work, not the completion of decorative icon playback.

### 4. ItsHover — a registry that connects names to behaviour

[Demo](https://itshover.com/) · [Source](https://github.com/itshover/itshover) · [Architecture](https://github.com/itshover/itshover/blob/master/ARCHITECTURE.md)

The architecture documents generated registry metadata, imperative start/stop handles and interaction-driven animation with Motion's animation controls. The registry pattern is useful for keeping the available names, implementation exports and documentation in agreement.

**Implemented:** exported icon-pair and effect enumerations; pair labels, state names and use-when guidance; machine-readable motion recipes and a JSON schema. Agents can select an available pattern from an intent instead of relying on an unverified component name.

**Boundary:** no ItsHover registry payload or implementation files are republished. The source licence is Apache 2.0, even where older descriptive text says otherwise.

### 5. Animate UI — explicit trigger and completion semantics

[Demo](https://animate-ui.com/) · [Icon specification](https://animate-ui.com/docs/icons/get-started) · [Source and licence](https://github.com/imskyleen/animate-ui)

The icon specification separates animate/hover/tap/view triggers, speed/delay/loops and completion policies such as persisting the final frame, returning to the initial frame or completing before stop. Parent-trigger inheritance and reduced-motion behaviour are also documented. These distinctions matter because a repeating flourish and a persistent state icon require different contracts.

**Implemented:** a persistent controlled endpoint for morphs and a finite return-to-rest effect for decorative replay. Hover and focus use the same underlying semantic parent; explicit activation is available through the SDK control. A policy change cancels decoration and preserves the accepted state.

**Boundary:** no source component is copied from the Commons Clause distribution. Tap/view triggers, arbitrary loop counts and every vendor completion mode are not exposed. The native API deliberately has fewer modes so agents cannot accidentally turn a state change into an endless effect.

### 6. Motion — declarative state, interruption and layout ownership

[Source](https://github.com/motiondivision/motion) · [Layout animations](https://motion.dev/docs/react-layout-animations) · [AnimatePresence](https://motion.dev/docs/react-animate-presence) · [SVG animations](https://motion.dev/docs/react-svg-animation) · [Accessibility](https://motion.dev/docs/react-accessibility)

Motion documents declarative target values, keyframes and springs, layout/layout-ID transitions, presence, SVG animation and reduced-motion policy. The layout and accessibility specifications are relevant to preserving final DOM semantics while interpolating presentation. Motion's accessibility guidance also distinguishes transform/layout motion from opacity or colour changes.

**Implemented:** state-driven finite transition components, interruptible morphs, keyed list movement, selection continuity, text/number presentation and policy-aware native Web Animations. A component owns its animation and cleanup; business callbacks remain the SDK's responsibility.

**Boundary:** this layer does not reimplement Motion's general animation engine, spring solver, gesture stack, projection tree or layout-ID system. The card/detail study uses a genuine SDK Dialog with a finite reveal; it is not presented as a shared-geometry morph. Motion+ paid components are not included.

### 7. Motion Primitives — composable interaction studies

[Source](https://github.com/ibelick/motion-primitives) · [Morphing Dialog](https://motion-primitives.com/docs/morphing-dialog) · [Animated Background](https://motion-primitives.com/docs/animated-background) · [Disclosure](https://motion-primitives.com/docs/disclosure) · [Carousel](https://motion-primitives.com/docs/carousel)

The documented patterns compose smaller motion behaviours into disclosure, background selection, dialog and carousel interactions. Their APIs are not uniform: for example, Animated Background documents item IDs and a value-change callback, while controlled disclosure/carousel state is documented separately. The Morphing Dialog page should not be treated as evidence that its root accepts the same controlled-open API as the SDK Dialog.

**Implemented:** shared selection, presence, text/number changes, finite detail reveal and depth selection. The gallery demonstrates these through the actual SDK SegmentedControl, Toggle, Dialog, Progress and Button components rather than replacing their semantics with visual approximations.

**Boundary:** this is a specification and pattern study, not a line-by-line audit of every primitive's source. A full morphing dialog, carousel and all other Motion Primitives examples are not reproduced. The SDK remains the source of focus management, dismissal and agent actions.

### 8. FormKit AutoAnimate — add, remove and move with stable identity

[Documentation and demos](https://auto-animate.formkit.com/) · [Source](https://github.com/formkit/auto-animate) · [Inspected implementation](https://github.com/formkit/auto-animate/blob/master/src/index.ts)

AutoAnimate observes a parent and animates immediate children as they are added, removed or moved. Its documentation calls out stable React keys, reduced-motion handling, positioning and layout caveats. The inspected implementation uses measured positions and native animations; the standard defaults are 250 ms with ease-in-out timing. Plugin paths require their own care rather than assuming every custom plugin has identical policy behaviour.

**Implemented:** `LiquidMotionList` receives explicit stable IDs, animates insertions and position changes, and cancels replaced work. One list owns the relevant layout motion. The gallery allows add, remove and reverse operations so a human or agent can verify the final item order.

**Boundary:** the new component does not attach a general observer to arbitrary DOM or retain removed controls during an exit animation. IDs must remain stable and unique; array positions are not identities. Do not combine two layout animation owners over the same items.

### 9. Flubber — topology is a real morphing constraint

[Source and API](https://github.com/veltman/flubber)

Flubber documents path/ring interpolation and helpers for separating, combining and interpolating multiple shapes. Its API explains the quality/performance tradeoff of segment length and limitations around holes or multiple subpaths. Smoothly interpolating unrelated SVG path strings requires geometry work; a CSS transition does not provide that automatically.

**Implemented:** ten original pairs with deliberately compatible geometry and an intermediate-progress function. A new state can reverse an in-flight transition from the visible progress. Reduced/off modes write the final geometry immediately.

**Boundary:** no arbitrary SVG loader, shape decomposition, hole handling, multi-shape matching or Flubber algorithm is included. New pairs need authored compatible geometry and endpoint tests. This is a controlled icon system, not a claim to solve general SVG interpolation.

### 10. Rive — named state and data binding, with a runtime boundary

[React source](https://github.com/rive-app/rive-react) · [React data binding](https://rive.app/docs/runtimes/react/data-binding) · [Runtime changelog](https://github.com/rive-app/rive-react/blob/main/CHANGELOG.md)

Rive's current React documentation exposes typed view-model binding and state-machine selection through its runtime hooks. The changelog records deprecation of the older state-machine-input hook and plural `stateMachines` API in favour of newer mechanisms. Integrations should follow the installed runtime's current data-binding API, rather than rebuilding an integration from an old tutorial.

**Implemented:** a small SDK-native graph of named states and events; explicit allowed transitions; a current-state precondition that rejects stale actions; cancellation/read-only/disabled semantics; named scene poses derived from accepted state. `LiquidMotionAsset` supplies a typed property record and an abortable, disposable runtime boundary with static fallback. The runtime's output remains presentation; it does not bypass the SDK to mutate application state.

**Boundary:** no Rive editor, RML compiler, `.riv` parser, renderer, asset pipeline, physics system or Rive-specific runtime adapter is supplied. To display a Rive asset later, provide a correctly licensed asset and an actual runtime adapter implementing this lifecycle, and map approved application values to its bindings. A generic mount interface is not a completed Rive integration.

The user's attachment, `Pasted text(20261121-215045).txt`, was contextual input for the interest in agent-readable authoring, visible state and inspectable source. Its marketing claims and installation instructions were not treated as verified specifications or executed. Only the primary runtime documentation and source linked above support the implemented contract.

### 11. Glyphrise — depth as a visual language

[Demo](https://glyphrise.vercel.app/) · [Source](https://github.com/bernaferrari/glyphrise)

Glyphrise turns SVG input into a 3D presentation with depth, bevel, lighting and material controls, animation clips/keyframes, transitions and export options. Its documented export boundaries differ: a GLB or React Three Fiber export cannot be assumed to reproduce every custom shader, wipe, gradient or finish in the editor. SVG sanitisation and graphics capability are part of the engine's responsibilities.

**Implemented:** original isometric morph treatment, a depth component, and typed scenes with bounded position, rotation, scale, opacity and depth values. Artwork sits inside stable semantic controls. Scene state has an accessible textual label and has a usable static endpoint when motion is unavailable.

**Boundary:** no arbitrary SVG extrusion, WebGL material editor, camera/lighting rig, timeline, custom-shader pipeline, video export or GLB export is reimplemented. Native scenes are finite UI compositions over the existing icon catalogue. Use an actual engine when a product needs those authoring or export capabilities.

## Agent decision and acceptance rules

1. Read the accepted business state and supported control actions. Use the existing bridge and the named SDK control. For graph events, include the state the action expects so an outdated event cannot act on a later state.
2. Choose a recipe from its purpose: stateful icon for a binary action; shared indicator for selection; presence for content changes; keyed list motion for collection changes; numeric/text presentation for values; feedback for actual work; depth for emphasis.
3. Commit application state through the original callback. Respect `details.cancel()`, disabled and read-only state. Never use a completed animation as proof the callback accepted the action.
4. Render the new semantic state immediately. The visible interpolation may be shortened, interrupted or omitted. Keep hit targets, labels, focus ownership and machine-readable state stable.
5. Stop decoration on unmount, unavailability and motion-policy changes. Cancel superseded asynchronous work separately and prevent stale callbacks from replacing a later result.
6. Verify the final value/order/open state and any application result. A frame count or a visually attractive transition is not the acceptance criterion.

The gallery's agent-work demonstration is explicitly a **local fixture**. Timers exercise real pending, success, error, cancellation and retry component state; no model call, upload, generated file or external task is performed. Its progress values are fixture steps, not estimated progress for a real agent task.

## Validation targets

Implementation checks should cover endpoint geometry, rapid reversal, genuine SDK invocation, callback cancellation, disabled/read-only rejection, expected-state rejection, item identity/order, dialog dismissal and focus return, hidden-view cleanup, reduced/off preferences, and stale async completion. Keyboard and forced-colour behaviour need direct inspection. User-outcome claims remain unvalidated until a study measures the relevant task, errors and preference constraints.

The gallery's copyable example is a standalone composition with one host provider. When inserting it into an existing Quantive application, reuse that application's glass/appearance provider and agent bridge, then scope the motion provider as needed. Do not create a second page bridge for the example.
