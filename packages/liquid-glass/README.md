# Liquid Glass UI kit

`@quantitative-hci/liquid-glass` combines reusable WebGPU optics with real [UI SDK](https://github.com/vercel-labs/ui) components. The SDK supplies behaviour, keyboard interaction, focus, validation and the agent interface. The kit supplies the captured backdrop, refractive surface renderer and shared appearance.

The workspace pins `@ui-sdk/core` and `@ui-sdk/react` to **0.1.0-beta.13**. Import the SDK's components directly. Existing package component re-exports remain compatibility aliases.

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
| `onStatusChange` | Receives the actual renderer status when it changes.                                                                                                          |

Inside the provider:

```tsx
const { status, surfaceCount, refresh } = useLiquidGlass();
```

Import `useLiquidGlass` from the same `/webgpu` entry. `surfaceCount` counts currently visible registered surfaces. `refresh()` returns a promise for a backdrop capture and submitted render work when a GPU renderer exists; it does not enable unsupported hardware.

| Status        | Behaviour                                                                      |
| ------------- | ------------------------------------------------------------------------------ |
| `loading`     | Preparing the device, pipeline and capture. Readable CSS faces remain visible. |
| `ready`       | The renderer has captured a backdrop and drawn the measured surfaces.          |
| `unavailable` | No WebGPU API or usable adapter; controls use the CSS fallback.                |
| `error`       | Initialization, capture or rendering failed; controls use the CSS fallback.    |
| `reduced`     | Forced colours or reduced transparency has suppressed optics.                  |

Reduced motion keeps static optics and user-requested redraws while suppressing transition-following animation. There is no perpetual capture or rendering loop.

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

An actual registered element receives `data-liquid-surface="viewport"` or `"popup"`. These are renderer-owned markers; application code should not set them. The stylesheet makes a face clear only when it is registered and the renderer is ready.

One transparent viewport canvas renders ordinary surfaces. Native top-layer popups receive a local decorative canvas sharing the same GPU device and pipeline, so popup glass follows the browser's top-layer ordering. All canvases have `pointer-events: none` and `aria-hidden="true"`. Popup isolation and semantic variants, invalid, focus and disabled states are handled by `kit.css`.

Use one provider per document. Avoid putting it under a transformed or clipped application ancestor, which changes fixed-position containment.

## Agent operation

Initialize the actual SDK bridge once in browser code:

```ts
import { createAgent, registerTools } from "@ui-sdk/react/agent";

const allow = (step) => !step.confirm;
export const agent = createAgent({ allow });
const unregister = registerTools(agent, { allow });

if (import.meta.hot) import.meta.hot.dispose(unregister);
```

The agent uses the SDK's `snapshot`, `query` and `act` APIs against the same controls and callbacks a person uses. Give every control a meaningful accessible name. Preserve confirmation, secret and hidden annotations and application validation. Importing a shader or registering browser tools alone does not prove an agent completed a task; verify resulting state.

## Capture, performance and limits

Backdrop mutations and resizing trigger a debounced recapture. Scrolling, dragging, focus and component-state mutations redraw surface geometry without recapturing the backdrop. Idle pointer movement does not rescan the page. The renderer supports **256 visible surfaces**, with pixel ratio capped at **2** and the device texture limit. Offscreen surfaces are omitted. Textures, buffers, canvases, device, observers and queued work are released on unmount; renderer failures release GPU resources and retain functional CSS controls.

The capture is a snapshot created by html2canvas-pro. Live video, protected cross-origin content, some embedded media and unsupported DOM/CSS need another rendering strategy. This implementation samples the supplied backdrop, so it does not refract arbitrary live foreground controls into one another. The shader is a visual approximation derived from the reference, not physical ray tracing or Apple's implementation.

CSS fallback keeps the interface functional when WebGPU is unavailable. Report it as fallback; it is not evidence of GPU rendering. Real pixel probes should compare optical settings on buttons, fields, panels and popups. A successful build or screenshot does not establish optical equivalence, WCAG conformance or improved human usability.

## Compatibility material

`GlassProvider`, `GlassSurface`, `useGlass`, `styles.css` and `tokens.css` remain for older frosted prototypes. That provider supplies scoped CSS tint and blur with stored preferences. It is independent of the WebGPU provider; new kit interfaces use `/webgpu` and `/kit.css`.

## Provenance and licences

The refractive model is adapted from [arya3d/liquid-glass-webgpu](https://github.com/arya3d/liquid-glass-webgpu), commit `90cb73931bbaf38bd54b3263cd3fda1daef1869c`, linked by the [reference video](https://www.youtube.com/watch?v=lq-ikfNVx7g). Retain the [MIT notice](LICENSES/arya3d-MIT.txt) with redistributed substantial portions. [`src/webgpu/NOTICE.md`](src/webgpu/NOTICE.md) records the changes from its single-pill renderer.

UI SDK remains Apache-2.0; html2canvas-pro and the original material code retain their licences. See [third-party notices](../../THIRD_PARTY_NOTICES.md). Apple is a visual reference, not an endorser or supplier of this kit.
