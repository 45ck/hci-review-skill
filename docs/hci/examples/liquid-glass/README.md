# UI SDK workbench

A private workbench for **55 Vercel UI SDK component families**, their actual agent interface, and a separate source-based WebGPU refraction study. The catalogue remains at the existing `/glass/` URL for compatibility.

## The three things you can compare

| View | What it implements |
| --- | --- |
| UI SDK default | Direct `@ui-sdk/react/<component>` imports and upstream `@ui-sdk/core/web.css`. One specimen is mounted at a time. |
| Frosted CSS | The same controls with optional shared tint, blur and highlights. This is not the video's refraction technique. |
| Video refraction | The original WGSL shader from arya3d's linked source, applied to a captured local DOM backdrop. Real SDK buttons remain above the canvas. |

The earlier gallery's “Optical refraction” switch applied a turbulence filter to decorative surfaces. It did not implement the video's page texture, shape-derived refraction, colour separation or edge-lighting pipeline. That misleading switch and effect have been removed.

## Run

Use Node 22.12 or later, from the repository root:

```sh
npm ci --ignore-scripts
npm run glass:dev
```

Open the URL printed by Vite. For a production preview:

```sh
npm run glass:verify
npm run preview -w @quantitative-hci/glass-gallery
```

## Use it as an agent

The application initializes one `createAgent` bridge from the same installed SDK as its components. It registers `snapshot`, `query` and `act` through `registerTools` when the browser exposes `document.modelContext`.

- **Snapshot:** read current component names, state, constraints and actions.
- **Query:** discover all component families through `Component catalogue`, or the valid options for a selected control.
- **Act:** run a discovered action through the SDK. The rendered control and application callbacks receive the change.
- **Agent view:** inspect the actual snapshot and recent changes. It is diagnostic output, excluded from its own registry.
- **Run SDK command:** use the visible diagnostic console when native browser tools are unavailable. It accepts JSON arguments for the three SDK methods; it does not evaluate JavaScript or connect an LLM.

For example, from the browser console during development:

```js
const agent = window.quantitativeHciAgent;
const catalogue = await agent.query({ within: "Component catalogue" });
// Read the returned choices before choosing one.
await agent.act({ steps: [
  { ref: "Component catalogue", action: "setValue", args: ["switch"] }
] });
agent.snapshot();
```

Use a fresh component `ref` from the returned snapshot when names are ambiguous. `act.ok` alone is insufficient: verify the resulting state, because application validation can cancel a requested change. Batches are sequential, not transactions.

Actions carrying `data-agent-confirm` are refused by this demonstration. Password/OTP values are redacted by the SDK. The console uses the same bridge and policy. There is no backend, model service or API credential in this application.

## Reference optics

The [video](https://www.youtube.com/watch?v=lq-ikfNVx7g) links [arya3d/liquid-glass-webgpu](https://github.com/arya3d/liquid-glass-webgpu). The integration pins commit `90cb73931bbaf38bd54b3263cd3fda1daef1869c`, retains its unchanged WGSL shader, and ships the author's MIT notice.

Only the demonstration scene is captured with `html2canvas-pro`. It is captured on initialization, resizing, sample changes and explicit refresh. Lens motion and strength changes redraw from that texture; they do not continuously recapture the entire application. The sliders provide keyboard and agent alternatives to dragging. Reduced transparency and forced colours show solid controls. Unsupported WebGPU reports the limitation explicitly.

This does not apply GPU refraction to all 55 controls or capture arbitrary live application content. A production material system needs explicit capture boundaries, dynamic-content synchronization, contrast and performance evidence before broader adoption. See [source and adaptation details](src/reference-optics/README.md).

## Verification

```sh
python3 -m pip install playwright==1.65.2
python3 -m playwright install chromium
python3 tests/test_glass_browser.py --base-url http://127.0.0.1:4185/ \
  --output test-results/liquid-glass.json
```

The suite opens every manifest family, checks exposed names, performs real SDK agent actions and verifies the rendered outcomes, exercises keyboard/focus behaviour, checks material cleanup and preferences, and checks narrow layout. Agent checks cover disabled controls, confirmation refusal and secret redaction.

CI additionally passes `--software-gpu`. This enables Chromium's software renderer only for the reviewed loopback build and blocks external requests. It requires the reference lens to reach `ready`, captures its canvas at two strengths, and checks that rendered pixels change. Its screenshots are rendering evidence, not hardware performance measurements.

`npm run glass:check` enforces version pins, direct SDK imports, coverage, optional material and bridge integration. `npm run glass:build` typechecks and builds. The path-filtered CI job has a ten-minute cap, cancellation for superseded runs and seven-day artifacts.

## Related work

- [Component and material standard](../../standards/liquid-glass.md)
- [Optional material package](../../../../packages/liquid-glass/README.md)
- [Independent beta.10 settings pilot](../ui-sdk-pilot/README.md)

Automated correctness, readable agent state, visual fidelity and human usability are separate questions. This workbench does not reuse the older pilot's measured performance claims.
