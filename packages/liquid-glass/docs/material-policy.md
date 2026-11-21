# Theme, material and surface intent

The WebGPU material and the CSS fallback share one theme policy. Use the application's existing `LiquidGlassProvider` and `kit.css`. The compatibility `GlassProvider` remains a separate CSS-only implementation for older prototypes; do not mount both providers to configure the new material.

This is custom, **Unvalidated** design work. Theme tokens and automated checks do not establish full accessibility conformance or a human usability improvement.

## Provider contract

`LiquidGlassProvider` from `@quantitative-hci/liquid-glass/webgpu` accepts:

| Prop | Values | Default | Meaning |
| --- | --- | --- | --- |
| `theme` | `system`, `light`, `dark` | `system` | Colour palette, CSS colour scheme and GPU tint. System follows `prefers-color-scheme`. |
| `material` | `regular`, `clear`, `solid` | `regular` | Regular has stronger face tint; clear exposes more of the supplied backdrop; solid suppresses optics. |
| `increaseContrast` | boolean | `false` | Requests stronger semantic colours and solid surfaces. The device's increased-contrast preference also applies. |
| `transparency` | `system`, `glass`, `solid` | `system` | Existing compatibility preference: Glass may override device reduced transparency; Solid always suppresses optics. |
| `motion` | `system`, boolean | `system` | Existing animation policy. Theme and material choices do not turn motion on. |
| `refraction`, `dispersion` | finite numbers | `0.3`, `0.008` | Existing optical controls, bounded by the provider. |
| `fontSet`, `iconSet` | documented appearance presets | Studio, Isometric | Existing shared typography and icons. |

The policy resolves in this order:

1. Forced colours suppress optics, retain system-colour surfaces and report `forced-colors`.
2. Explicit or system increased contrast suppresses optics and reports `increased-contrast`.
3. `material="solid"` or `transparency="solid"` suppresses optics and reports `solid-choice`.
4. Device reduced transparency suppresses optics under `transparency="system"` and reports `reduced-transparency`.
5. Otherwise the requested regular or clear material remains active. `transparency="glass"` continues to override device reduced transparency.

Choosing a dark theme does not change the host's requested material or controlled values. The host owns preference persistence and its genuine SDK controls. No preference store, second agent bridge or new mutation endpoint is introduced.

The existing `useLiquidGlass()` hook returns renderer `status`, `surfaceCount`, `motion` and `refresh`, plus:

| Field | Meaning |
| --- | --- |
| `theme` | Resolved `light` or `dark`. |
| `material` | Resolved `regular`, `clear` or `solid`, including preference overrides. |
| `contrast` | Resolved `normal` or `more`. |
| `reducedReason` | One of the reasons above, or `null`. |

Renderer status remains independent: `unavailable` or `error` means the requested optical material is using CSS fallback, not that WebGPU rendered successfully. The document exposes the same resolved policy through `data-liquid-theme`, `data-liquid-material`, `data-liquid-contrast` and `data-liquid-reduced-reason`. These are diagnostic presentation attributes, not SDK actions.

## Assign surfaces a purpose

Put `data-liquid-intent` on an existing registered surface. Explicit application surfaces still use `data-liquid-glass`; genuine SDK parts are registered automatically.

| Intent | Use | Treatment |
| --- | --- | --- |
| `control` | Compact action and input surfaces | Shared control tint with readable live DOM labels. |
| `navigation` | Toolbars, navigation and grouped choices | Stronger continuous face and the shared navigation fallback. |
| `reading` | Article text, dense data and diagram/fullscreen content | Stable opaque reading background; broad optical highlights are suppressed. |
| `overlay` | Menus, popovers and compact dialogs | Strong theme-derived tint so a dark popup does not receive a fixed white face. |

SDK toolbar, menubar, tabs and segmented-control groups default to navigation treatment. Actual popup content defaults to overlay treatment. Other registered parts default to control treatment. Explicit intent applies to that surface; it does not change the semantics or state of its SDK children.

```tsx
<section data-liquid-glass="" data-liquid-intent="reading" aria-labelledby="article-title">
  <h2 id="article-title">Review the article</h2>
  <p>Keep the text, source and next action on a stable reading surface.</p>
  <Button>Save review</Button>
</section>
```

The reading container's face uses CSS and is excluded from GPU collection. SDK children keep their behavior and receive a theme-aware CSS material when the reading background covers their rendering plane. This keeps the reading token authoritative. Use reading intent for content containers, rather than overriding a semantic destructive/primary action's state colours. Existing `data-liquid-kind="content"` maps to the reading treatment for compatibility.

The viewport canvas sits below application content. An inline reading panel therefore uses CSS fallback for controls inside it. A native top-layer popup has a local canvas, so controls directly inside its reading root can retain optics: the root's own background paints below that canvas. An additional reading panel nested inside the popup paints above the local canvas, and its controls use fallback again. A nested native top-layer popup creates a new rendering boundary. This policy does not add a canvas for every content panel or try to infer every arbitrary consumer CSS layer.

The engine reports `data-liquid-material-fallback="reading-surface"` on an intentional reading face and `data-liquid-material-fallback="reading-plane"` on a control whose plane is covered by an intervening reading ancestor. Those controls are excluded from GPU collection and surface-count claims; their control, input, navigation and selected backgrounds use the theme's CSS fallback tokens. Markers update after intent changes and are removed on teardown. They are diagnostic metadata, not application inputs or SDK actions. Theme/status and actual pixel evidence remain separate observations.

`data-liquid-glass="off"` continues to exclude a subtree from rendering. It is useful for an application with its own material treatment. It is no longer necessary merely to make a normal dark popup use a dark palette.

`data-liquid-surface` is engine-owned registration metadata. Applications must not set it to express intent.

## Shared colour tokens

The existing `--liquid-ink`, `--liquid-muted`, `--liquid-line`, `--liquid-blue` and state colours now follow the resolved theme. Additional consumer tokens are:

| Token | Use |
| --- | --- |
| `--liquid-reading` | Stable content background. |
| `--liquid-navigation` | Effective navigation background. |
| `--liquid-canvas` | Diagram/editor canvas background. |
| `--liquid-canvas-grid` | Optional diagram grid marks. |
| `--liquid-focus` | Focus indicator colour. |
| `--liquid-success`, `--liquid-warning` | Existing success/warning text, accompanied by words or meaningful icons. |
| `--liquid-reading-fallback`, `--liquid-navigation-fallback` | Theme-aware fallback faces. |
| `--liquid-control-solid`, `--liquid-input-solid`, `--liquid-panel-solid`, `--liquid-popup-solid` | Opaque faces used when preferences suppress transparency. |

The renderer reads the resolved `--liquid-optic-rgb`, `--liquid-optic-opacity` and `--liquid-optic-edge-opacity` from each surface. RGB is exactly three space-separated numeric sRGB channels in the range 0–255; opacities are numbers in the range 0–1. The face keeps its stronger tint under content. Only the curved bevel blends toward the edge tint, exposing the actual displaced backdrop there. This blend follows surface geometry, not the refraction-strength setting: strength still changes sample displacement rather than faking a change in brightness. Navigation edges retain more tint than ordinary controls; overlays retain substantially more, and dark edges retain more tint than light edges. Reading faces remain opaque CSS surfaces outside GPU collection.

The renderer bounds finite values and ignores malformed tint overrides instead of uploading non-finite values. Edge opacity is bounded by face opacity; a missing or invalid edge value retains the face tint. Setting both opacities equal produces a uniform tint. These are advanced presentation overrides: recheck composited contrast if you change them. CSS fallback keeps its stable theme/role face and does not claim to reproduce GPU refraction.

Theme changes trigger one bounded refresh of the supplied decorative backdrop because inherited theme tokens can change its appearance. Material/intent changes redraw existing texture data. Pointer responses continue reusing that texture and stop after settling. The material still does not capture arbitrary live application content.

Clear deliberately exposes more background variation. Check its actual supported scenes, especially muted text, selected states, invalid fields, focus rings and popup edges. Use reading or solid treatment for information whose legibility must not depend on that backdrop. Do not infer a contrast ratio from the token pair alone when compositing is involved.

## Wrapped and stacked groups

Opt into shared geometry with `data-liquid-layout="wrap"` or `data-liquid-layout="stack"` on the genuine SDK group. Default single-row pills remain available.

```tsx
<SegmentedControl
  aria-label="Review chapter"
  value={chapter}
  onValueChange={setChapter}
  data-liquid-layout="wrap"
>
  <SegmentedControlIndicator />
  <SegmentedControlItem value="purpose">Purpose and audience</SegmentedControlItem>
  <SegmentedControlItem value="evidence">Evidence and sources</SegmentedControlItem>
  <SegmentedControlItem value="structure">Structure and reading order</SegmentedControlItem>
  <SegmentedControlItem value="next">Next action</SegmentedControlItem>
</SegmentedControl>
```

Wrapped groups use a modest outer radius, consistent item/indicator corners, wrapping labels and at least 44 CSS pixels of item height. Items retain DOM order and the SDK's linear keyboard model; wrapping does not introduce spatial grid navigation. The SDK measures and moves its own indicator, including after size changes and agent selection. No selection callback or second state store is added.

For a vertical stack, also set the SDK's `orientation="vertical"` on `SegmentedControl`, or on the owning `Tabs` for a tabs list. The layout attribute changes presentation only; it does not secretly change ARIA orientation or key semantics.

```tsx
<SegmentedControl orientation="vertical" data-liquid-layout="stack" aria-label="Review mode">
  <SegmentedControlIndicator />
  <SegmentedControlItem value="outline">Outline</SegmentedControlItem>
  <SegmentedControlItem value="detail">Full detail</SegmentedControlItem>
</SegmentedControl>
```

The geometry also supports toolbar, menubar, navigation-menu-list and pagination-content groups. Use `--liquid-group-radius`, `--liquid-group-item-radius` and `--liquid-group-item-basis` for a documented density adjustment. Avoid visual reordering, hidden destinations and clipped focus rings.

## Decision and evidence boundary

**Task:** review content and use its navigation, popups and diagram viewport inside a dark application. Reading, selection, dismissal and task state must remain reliable when theme, material and device preferences change.

**Decision:** put theme and surface intent in the existing material provider/renderer and CSS fallback. Supply one opt-in group geometry recipe instead of application-specific radius overrides. The originating consumer showed pale dark-theme popups and an oversized oval when a segmented group wrapped.

**Evidence:** `tests/test_material_policy.mjs` checks preference precedence, compatibility of explicit Glass, theme resolution, unchanged caller-owned records, bounded face/edge GPU tint inputs and reading-plane classification for inline content, popup roots and nested reading panels/popups. It does not render a browser. The existing optical/browser contracts remain responsible for genuine GPU pixels, top-layer geometry, accepted state, focus, backdrop capture and eventual idle. Consumer-scene contrast and wrapped-label fixtures need browser evidence from the production build.

**Result and next decision:** implementation provides a shared contract; retain or tune the optical weights based on recorded composited scenes and human review. Do not report improved recognition, reading speed, WCAG conformance or native-renderer equivalence from these source and regression checks.
