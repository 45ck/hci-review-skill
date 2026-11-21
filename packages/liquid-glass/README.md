# Liquid Glass UI kit

`@quantitative-hci/liquid-glass` combines reusable WebGPU optics with real [UI SDK](https://github.com/vercel-labs/ui) components. The SDK supplies behaviour, keyboard interaction, focus, validation and the agent interface. The kit supplies the captured backdrop, refractive surface renderer and shared appearance.

The workspace pins `@ui-sdk/core` and `@ui-sdk/react` to **0.1.0-beta.13**. Import the SDK's components directly. Existing package component re-exports remain compatibility aliases.

**Agent engineering comes first.** Choose components by their task, typed inputs, state and observable result. Start with [docs/llms.txt](docs/llms.txt), the [agent engineering guide](docs/agent-engineering.md) and [agent-contracts.json](agent-contracts.json), validated against [its schema](agent-contracts.schema.json). The contracts distinguish primitives with their own SDK actions, compositions of SDK controls, passive presentation and pure utilities. React is the supported rendering adapter for this kit.

**Review status:** custom Quantive components, glass styling, icons and compositions are **Unvalidated**: no human UI/UX team has reviewed or approved them. **SDK foundation** identifies upstream behaviour provenance; it is not an approval of this adaptation. The [custom component manifest](custom-component-manifest.json) records this distinction. Automated checks do not promote review status.

## Standards

`LiquidDiagram` renders precise SVG from typed model data, with selection, readable element/relationship alternatives and a shared canvas. `LiquidViewport` uses the pinned UI SDK's `createViewport` behavior for drag pan, wheel pan, anchored pinch/Ctrl-wheel zoom, keyboard movement, fit, actual size, focus selection and full-window mode. Its named SDK controls and agent actions follow the same cancellable change path. Glass stays on the surrounding interface; exact notation stays crisp.

The demo provides **46 editable views**: all 14 UML diagram kinds; 11 UWE views; seven C4 view types; three agent-model views; BPMN process; DMN requirements/table; CMMN case; VDML value delivery; IFML interaction; SysML 1.7 blocks/requirements; and explicit BMM, SBVR and BACM concept projections. Each adapter declares its implemented scope and source. [The full coverage registry](../../docs/hci/standards/omg-coverage.md) distinguishes 9 notation subsets, 5 concept projections and 277 reference-only records. The complete current OMG catalogue is indexed; indexing does not implement a specification's language, runtime or interchange format.
```tsx
import { useState } from "react";
import { LiquidDiagram, type DiagramModel } from "@quantitative-hci/liquid-glass/standards";
import "@quantitative-hci/liquid-glass/standards.css";

export function Architecture({ model }: { model: DiagramModel }) {
  const [selectedId, setSelectedId] = useState(model.nodes[0]?.id);
  return <LiquidDiagram model={model} selectedId={selectedId} onSelectionChange={setSelectedId} />;
}
```

Use within the same `LiquidGlassProvider` and `kit.css` shown below. `DiagramModel` contains stable IDs, names, kinds, positions, compartments, stereotypes, containment, ownership, table rules, routing points, relationships, profile metadata and cross-view references. `validateDiagramModel(candidate)` performs runtime structural/geometric checks; `validateDiagramProfile` adds bounded profile checks. `diagramToSvg(model)` generates vector SVG with escaped labels and a notation key. Changes persist across collection navigation for the page session; export before reloading.

`StandardsWorkbench` is a reusable controlled composition, with separate `ModelNavigator`, `ModelReferences`, `ModelInspector`, `ModelToolbar`, `ModelHistory`, `ModelValidationPanel`, `ModelDataEditor` and `StandardsCatalogue` exports. It accepts `documents`, `onDocumentsChange`, optional controlled model selection, read-only/disabled state and an additive profile registry. Create documents with `createModelDocument` from `/modeling`. Use `LiquidModelDocument` independently when composing another editing experience. Atomic operations, revision checks, previews, cancellation and undo/redo share the real SDK command path. Read the [modeling API](src/modeling/README.md) and [architecture guide](../../docs/hci/standards/agent-first-modeling.md).

```ts
import { findStandards, catalogueCounts } from "@quantitative-hci/liquid-glass/standards";
const businessNotation = findStandards({ category: "business", coverage: "notation-subset" });
```

The `/developer` and `/developer.css` entries remain compatibility aliases. Prefer `/standards` for new work. Read the [component contract](../../docs/hci/standards/standards-components.md), [combined sample models](../../docs/hci/examples/liquid-glass/src/model-catalogue.ts) and [exploration model](../../docs/hci/models/developer-model-exploration.md) before extending the adapters.

## Agent task components

```tsx
import { AgentCapabilityCard, AgentTaskPanel, AgentToolRequest, AgentArtifactCard } from "@quantitative-hci/liquid-glass/agents";
import "@quantitative-hci/liquid-glass/agents.css";
```

The package also exports `AgentTaskStatus`, `AgentTaskTimeline`, `AgentContextPanel`, types and a bounded task reducer. Task states use the pinned A2A 0.3.0 enum; tool presentation draws on MCP concepts. Components keep arguments, proposed changes, progress and returned artifacts inspectable through existing SDK controls. The demo runs a labelled local fixture with real state changes and actual resulting JSON. It does not call a provider or implement either protocol transport. See the [agent API](src/agents/README.md) for callbacks, source/review policy, validation, replay semantics and limits.

## Shared canvas

```tsx
import { LiquidViewport } from "@quantitative-hci/liquid-glass/viewport";
import "@quantitative-hci/liquid-glass/viewport.css";
```

Provide `label`, world `width`/`height` and children. Optional `selectionRect` enables Focus selection. Use controlled `viewport` and `onViewportChange` for application-owned camera state, or a ref for coordinate conversion, fit, reveal, center, pan and zoom. Zoom is bounded to 10–400%; initial fit never requires dragging to find the model. A full-window SDK Dialog retains Escape dismissal and focus return.

## Graphics studio

```tsx
import { LiquidGraphicStudio, type GraphicDocument } from "@quantitative-hci/liquid-glass/graphics";
import "@quantitative-hci/liquid-glass/graphics.css";
```

`LiquidGraphicStudio` owns no remote service: the host supplies the document, assets and change callbacks. It supports image/text/shape layers, transform fields and dragging, ordering, visibility/locking, image fit, upload, undo/redo, saved directions, revision-checked JSON and self-contained SVG. Its optional `onImageRequest` integration receives an inspectable brief, selected-layer context and the document. The demo prepares that handoff; it does not call an image model or imply a generated image has returned. See the [graphics API](src/graphics/README.md) for the exact callback and context contract.

The graphics `onModelChange` callback receives the SDK interaction source, event and cancellable details. The editor waits for the controlled host to return the proposed document before advancing history, selection or success feedback. Pending changes can be cancelled through a named SDK control; asynchronous hosts should observe `details.signal`. Asset imports wait for the separate asset callback and supplied asset props before proposing a model replacement. See the graphics guide for rejection, cancellation and host responsibilities.

## Image components


```tsx
import { LiquidImageCard, LiquidMediaGallery, LiquidImageComparison } from "@quantitative-hci/liquid-glass/media";
import "@quantitative-hci/liquid-glass/media.css";
```

| Component | Controlled data and actions |
| --- | --- |
| `LiquidImageCard` | `asset`, optional `headline`, `summary`, `eyebrow`; a named SDK Dialog opens the image story. |
| `LiquidMediaGallery` | `assets`, `selectedId`, `onSelectedIdChange`, `savedIds`, `onSavedChange`, optional `label`; SDK Carousel and thumbnail indicators select an image, a Dialog shows details, and Toggle changes saved state. |
| `LiquidImageComparison` | `before`, `after`, `value`, `onValueChange`, optional `beforeLabel`, `afterLabel`, `label`; Slider and named preset Buttons control the reveal without requiring dragging. |

`LiquidMediaAsset` includes `id`, `title`, `src`, optional `srcSet`, `alt`, `description`, `kind`, `width`, `height` and optional `credit`. Supply meaningful alternatives, local optimized assets and an honest credit. The demo bundles three original generated artworks at two responsive sizes; [asset provenance](../../docs/hci/examples/liquid-glass/public/media/sources.json) records prompts, dimensions and hashes. All custom media components show **Unvalidated**. There is no autoplay or remote media dependency.

## Start with real controls

```tsx
import { Button } from "@ui-sdk/react/button";
import { Input } from "@ui-sdk/react/input";
import { LiquidGlassProvider } from "@quantitative-hci/liquid-glass/webgpu";
import "@ui-sdk/core/web.css";
import "@quantitative-hci/liquid-glass/kit.css";

export function App() {
  return (
    <LiquidGlassProvider
      backdrop={
        <div
          style={{
            width: "100%",
            height: "100%",
            background:
              "repeating-linear-gradient(110deg, #c3e5ec 0 160px, #f9cbb4 160px 320px, #8daed7 320px 480px)",
          }}
        />
      }
    >
      <section data-liquid-glass data-liquid-kind="panel">
        <h1>Create a project</h1>
        <label>
          Project name
          <Input defaultValue="Atlas" />
        </label>
        <Button data-variant="solid">Create project</Button>
      </section>
    </LiquidGlassProvider>
  );
}
```

The supplied backdrop fills a fixed viewport region. The renderer captures this region into a texture, then bends its sampling coordinates separately for each visible surface. Buttons, inputs, navigation, panels and popups retain their live DOM content above the optical layer. Canvas pixels never replace the SDK's semantic controls.

Keep your content and controls outside the `backdrop` prop. Supply a fully painted background: CSS gradients, shapes or local SVG work well. The provider does not capture or transmit the rest of your application.

## Provider and hook

```tsx
<LiquidGlassProvider
  backdrop={<YourBackdrop />}
  refraction={0.3}
  dispersion={0.008}
  motion="system"
  transparency="system"
  fontSet="studio"
  iconSet="isometric"
  onStatusChange={(status) => console.info(status)}
>
  <YourInterface />
</LiquidGlassProvider>
```

| API              | Meaning                                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `children`       | Live UI content.                                                                                                                                              |
| `backdrop`       | The only DOM region captured for the optical texture.                                                                                                         |
| `refraction`     | Bevel/lens strength; defaults to `0.3`, bounded to `0.01–0.8`. Zero is not a no-effect mode because the model also has independent colour and lighting terms. |
| `dispersion`     | RGB separation; defaults to `0.008`, bounded to `0–0.05`.                                                                                                     |
| `motion`         | `"system"` by default: animate unless the device requests reduced motion. `true` explicitly enables animation for this app; `false` keeps static optics. |
| `transparency`   | `"system"` by default: follow reduced transparency. `"glass"` explicitly requests glass; `"solid"` suppresses refraction. Forced colours always use the solid treatment. |
| `fontSet`        | `"studio"` by default: Manrope throughout. `"editorial"` uses Fraunces headings with Manrope controls and body copy. `"system"` uses the device's native sans serif stack. |
| `iconSet`        | `"isometric"` by default for the kit's decorative object icons; `"line"` selects their simpler line treatment. Labels and SDK control affordances retain their semantics. |
| `onStatusChange` | Receives the actual renderer status when it changes.                                                                                                          |

Inside the provider:

```tsx
const { status, surfaceCount, motion, refresh } = useLiquidGlass();
```

Import `useLiquidGlass` from the same `/webgpu` entry. `surfaceCount` counts currently visible registered surfaces. `refresh()` returns a promise for a backdrop capture and submitted render work when a GPU renderer exists; it does not enable unsupported hardware.

| Status        | Behaviour                                                                      |
| ------------- | ------------------------------------------------------------------------------ |
| `loading`     | Preparing the device, pipeline and capture. Readable CSS faces remain visible. |
| `ready`       | The renderer has captured a backdrop and drawn the measured surfaces.          |
| `unavailable` | No WebGPU API or usable adapter; controls use the CSS fallback.                |
| `error`       | Initialization, capture or rendering failed; controls use the CSS fallback.    |
| `reduced`     | Solid appearance, forced colours or reduced transparency has suppressed optics. |

The hook's `motion` is the effective state: `"enabled"`, `"reduced"` or `"off"`. Use it to show an accurate animation control. A system preference can otherwise make an apparently enabled toggle misleading. Explicit app choices override only that preference; they never change the device's settings. Forced colours remain authoritative.

With motion enabled, pointer light follows the active surface, activation produces a bounded ripple, and the SDK's actual tabs and segmented indicators travel with a short spring. Switch thumbs and popup surfaces use the same motion vocabulary. Reduced motion keeps static optics and requested control/layout updates. Animation stops after the response settles; the backdrop is not recaptured per frame.

The motion option controls this material layer. Drawer retains the SDK's own drag/snap physics and device motion handling; the kit follows its moving geometry even when decorative motion is off, without replacing its engine-owned positioning.

## Typography and icon preferences

The default appearance is exported as `DEFAULT_LIQUID_APPEARANCE` from `@quantitative-hci/liquid-glass/appearance`. `useLiquidAppearance()` returns `{ fontSet, iconSet }`; the same entry exports `LiquidFontSet`, `LiquidIconSet` and `LiquidAppearance` types. Change the controlled props on `LiquidGlassProvider` to update the whole interface without remounting its controls or recreating the renderer.

| Font set | Headings | Controls and body | Intended use |
| --- | --- | --- | --- |
| Studio | Manrope | Manrope | Default product interface. |
| Editorial | Fraunces with optical sizing | Manrope | A more expressive heading style with familiar control typography. |
| System | Native system sans serif | Native system sans serif | Device-native appearance with no custom font requirement. |

`kit.css` includes `fonts.css` and local WOFF2 assets. Manrope and Fraunces are unchanged Google Fonts distributions, licensed under SIL OFL 1.1. Latin and Latin-ext subsets are included; characters outside those subsets use the fallback stack. Fonts are served with the app, and unused font faces are not requested. Original download URLs, sizes and SHA-256 hashes are recorded in [`src/assets/fonts/sources.json`](src/assets/fonts/sources.json). Keep the [Manrope](LICENSES/Manrope-OFL.txt) and [Fraunces](LICENSES/Fraunces-OFL.txt) notices with redistributed fonts.

The provider applies `data-liquid-font` and `data-liquid-icons` to the document so native top-layer popups share the selected appearance. Previous values are restored when it unmounts. Use one provider per document, as for the WebGPU material. The shared CSS exposes `--liquid-font-body`, `--liquid-font-heading` and `--liquid-heading-tracking` for custom content; technical code keeps its existing monospace font.

The demo exposes **Font set** and **Icon style** in Material settings. It stores only validated values under `qg-kit-font` and `qg-kit-icons`. Reset material restores Studio and Isometric, while Copy starter includes the currently selected font and icon props. These are visual preferences: they do not change the task model, labels, focus order or current form values. Choose typography through representative reading and task tests; a font change by itself is not evidence of improved usability.

## Registering surfaces

The renderer detects supported SDK visual parts through their `data-slot` attributes. The exact list is exported as `LIQUID_SURFACE_SLOTS` in [`src/webgpu/surfaces.ts`](src/webgpu/surfaces.ts). It skips duplicate inner fields inside framed inputs and a calendar already enclosed by a date-picker popup.

Mark a custom visual container with `data-liquid-glass`. `data-liquid-kind="panel"`, `"control"` or `"popup"` lets the shared stylesheet choose its treatment. Apply `data-liquid-glass="off"` to exclude an entire subtree and retain readable fallback styling.

The provider owns these diagnostic attributes on `html`:

- `data-liquid-glass-kit="true"`
- `data-liquid-status`
- `data-liquid-surface-count`
- `data-liquid-render-revision`
- `data-liquid-capture-revision`
- `data-liquid-error`, present after a renderer failure
- `data-liquid-motion`, the effective animation preference
- `data-liquid-transparency`, the requested material preference
- `data-liquid-reduced-reason`, when a solid preference suppresses the renderer
- `data-liquid-motion-state`, `data-liquid-motion-revision` and `data-liquid-active-effects`, for bounded animation verification

An actual registered element receives `data-liquid-surface="viewport"` or `"popup"`. These are renderer-owned markers; application code should not set them. The stylesheet makes a face clear only when it is registered and the renderer is ready.

One transparent viewport canvas renders ordinary surfaces. Native top-layer popups receive a local decorative canvas sharing the same GPU device and pipeline, so popup glass follows the browser's top-layer ordering. All canvases have `pointer-events: none` and `aria-hidden="true"`. Popup isolation and semantic variants, invalid, focus and disabled states are handled by `kit.css`.

Use one provider per document. Avoid putting it under a transformed or clipped application ancestor, which changes fixed-position containment.

## Agent operation

Initialize the actual SDK bridge once in browser code. This example follows the demo policy of refusing marked actions:

```ts
import { createAgent, registerTools, type AgentAction } from "@ui-sdk/react/agent";

const allow = (step: AgentAction) => !step.confirm;
export const agent = createAgent({ allow });
const unregister = registerTools(agent, { allow });

if (import.meta.hot) import.meta.hot.dispose(unregister);
```

The agent uses the SDK's `snapshot`, `query`, `act` and `subscribe` APIs against the same controls and callbacks a person uses. `registerTools` is optional and does nothing when WebMCP is unavailable; dispose its registration when the application lifecycle ends. The existing `/agent` package entry is an upstream compatibility re-export, not another bridge. The SDK bridge itself has no `destroy` method.

Give every control a meaningful accessible name. Standalone native controls do not become registered SDK controls merely by having labels or `data-agent-*` attributes. Keep shared validation in the change path, since imperative agent actions need not run keyboard or pointer listeners. Preserve confirmation, secret and hidden marks. Verify actual values or document revisions: a successful `act` call can still contain a cancelled or host-pending change. See the [operating and verification recipe](docs/agent-engineering.md#operate-and-verify) and [existing browser contract](../../tests/glass_agent_contract.py).

Run `npm run glass:agent-check` from the repository root to check export inventory, contract structure and declared references. Run `npm run glass:verify` and the relevant browser contracts for implementation changes. A static contract record is documentation and a coverage gate; it does not prove that an interface works in a browser or that a person can use it successfully.

## Capture, performance and limits

Backdrop mutations and resizing trigger a debounced recapture. Scrolling, dragging, focus and component-state mutations redraw surface geometry without recapturing the backdrop. Pointer-light and ripple frames reuse cached geometry; moving indicators and popup transitions update their measured positions. The renderer supports **256 visible surfaces**, with pixel ratio capped at **2** and the device texture limit. Offscreen surfaces are omitted. Hidden documents pause motion. Textures, buffers, canvases, device, observers and queued work are released on unmount; renderer failures release GPU resources and retain functional CSS controls.

The capture is a snapshot created by html2canvas-pro. Live video, protected cross-origin content, some embedded media and unsupported DOM/CSS need another rendering strategy. This implementation samples the supplied backdrop, so it does not refract arbitrary live foreground controls into one another. The shader is a visual approximation derived from the reference, not physical ray tracing or Apple's implementation.

CSS fallback keeps the interface functional when WebGPU is unavailable. Report it as fallback; it is not evidence of GPU rendering. Real pixel probes should compare optical settings on buttons, fields, panels and popups. A successful build or screenshot does not establish optical equivalence, WCAG conformance or improved human usability.

## Compatibility material

`GlassProvider`, `GlassSurface`, `useGlass`, `styles.css` and `tokens.css` remain for older frosted prototypes. That provider supplies scoped CSS tint and blur with stored preferences. It is independent of the WebGPU provider; new kit interfaces use `/webgpu` and `/kit.css`.

## Provenance and licences

The refractive model began as an adaptation of [arya3d/liquid-glass-webgpu](https://github.com/arya3d/liquid-glass-webgpu), commit `90cb73931bbaf38bd54b3263cd3fda1daef1869c`, linked by the [reference video](https://www.youtube.com/watch?v=lq-ikfNVx7g). The current material confines displacement to the local bevel and adds responsive directional light. Retain the [MIT notice](LICENSES/arya3d-MIT.txt) with redistributed substantial portions. [`src/webgpu/NOTICE.md`](src/webgpu/NOTICE.md) records the changes from its single-pill renderer.

The motion and layered-light direction also draws on the user-supplied [Nimbus Liquid Glass Navbar](https://21st.dev/@gughigug/components/liquid-glass-navbar) by Guglielmo Giannattasio and [Coffee Pour Menu](https://21st.dev/@aakashmehra/components/coffee-pour-menu) by Aakash. Both preview pages identify their source as MIT. Their WebGL/SVG component implementations are not substituted for UI SDK; this kit implements the interaction cues in its shared WebGPU/CSS material.

UI SDK remains Apache-2.0; html2canvas-pro and the original material code retain their licences. See [third-party notices](../../THIRD_PARTY_NOTICES.md). Apple is a visual reference, not an endorser or supplier of this kit.
