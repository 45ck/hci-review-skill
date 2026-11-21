# Liquid Glass UI kit

A private UI kit that applies a shared WebGPU material to real Vercel UI SDK components. Its default overview contains working buttons, fields, choices, switches, sliders and a collection dialog. The searchable catalogue includes all **55 component families**, with one selected specimen shown at a time.

Two custom collections extend that catalogue: **Visual components** for image cards, a gallery, detail dialogs and image comparison; **Developer components** for interactive UML class/component and UWE navigation/presentation diagrams. Custom components, theme and compositions are **Unvalidated**: no human UI/UX team has reviewed or approved them. **SDK foundation** marks upstream behaviour provenance and makes no human approval claim about Quantive's adaptation.

The GPU treatment and animation are enabled under normal device preferences. Refraction and colour dispersion are adjustable in **Material settings**, and **Backdrop** changes the scene sampled by the glass. **Appearance** offers Follow device, Glass and Solid. **Animate glass** shows the effective motion state; turning it on explicitly enables animation for this kit. These choices are remembered locally without changing device settings. Labels and interaction stay in the DOM.

## Run

Use Node 22.12 or later. From the repository root:

```sh
npm ci --ignore-scripts
npm run glass:dev
```

For a production preview:

```sh
npm run glass:verify
npm run preview -w @quantitative-hci/glass-gallery
```

Open the local address printed by Vite. The hosted site opens the kit directly; `/glass/` remains a compatibility redirect. The former workbench, agent inspector, command console and settings pilot are not part of the hosted interface.

## What to exercise

| Area | Interaction |
| --- | --- |
| Overview | Edit Project name, choose Project access, change Notifications or Sound, and adjust Volume. |
| Collection dialog | Open New collection, enter Collection name, create or cancel, and check keyboard focus. |
| Material settings | Choose Glass if Follow device is showing Solid material, enable Animate glass, compare refraction and switch Backdrop. |
| Motion | Move across a control, press it, switch Workspace view, toggle Sound and open New collection. Reflections, ripples, selection and popup depth respond. |
| Catalogue | Search a family and select it from Component catalogue. Every item uses the real upstream component. |
| Visual components | Browse three original images using thumbnails or previous/next controls, inspect details, save an artwork for the current section visit, and compare two directions with a slider or preset. |
| Developer components | Select one of four UML/UWE examples, select an element, inspect its relationships, zoom/reset, edit its label, copy current JSON or download exact vector SVG. |
| Popups | Open menus, dialogs, popovers and drawers; their controls must remain above the backdrop and operable. |
| Accessibility preferences | Check forced colours, reduced transparency and reduced motion with the same labels, state and actions. |

All data and state changes belong to the demonstration. There is no form backend, account connection, upload service or purchase flow.

Model label edits survive switching models and leaving/returning to the Developer section in this page session. A reload starts with the supplied examples. **Model data** exposes the exact JSON to people and agents through a read-only SDK field. The diagram renderer supports the documented notation subset; it is not an XMI parser, semantic UML validator or complete modelling tool. Images are fictional generated artwork, separately credited; exact diagram geometry is generated from typed data.

## Material implementation

`LiquidGlassProvider` coordinates the supplied backdrop, registered DOM surfaces and renderer. A shared viewport canvas draws ordinary controls and panels; local canvases keep GPU surfaces visible inside top-layer popups. The provider tracks real element bounds, so glass follows actual controls rather than a separate optical specimen.

The integration adapts the shader from [arya3d/liquid-glass-webgpu](https://github.com/arya3d/liquid-glass-webgpu/tree/90cb73931bbaf38bd54b3263cd3fda1daef1869c), the project linked by the [reference video](https://www.youtube.com/watch?v=lq-ikfNVx7g). Its attribution and MIT notice are retained. The renderer samples the supplied decorative backdrop; it does not automatically capture arbitrary live application content and is not Apple's native renderer.

Follow device respects reduced motion and reduced transparency. Explicit app choices can enable those effects for this demo; forced colours always retain the system treatment. Unsupported adapters have a usable CSS fallback with corresponding interaction feedback, and verification reports that path separately from successful GPU rendering. Reset material restores automatic device preferences.

## Behaviour and agent integration

Primitives import directly from `@ui-sdk/react/<component>` and retain upstream keyboard, focus, validation and state APIs. Both SDK packages are pinned to **0.1.0-beta.13**. The official skill and documentation ship with the installed packages.

One real SDK agent bridge remains underneath the UI. Its private `window.quantitativeHciAgent` facade exposes `snapshot`, `query`, `act` and `subscribe` for development and automated verification. Browser tools are registered only when `document.modelContext` is supported; detection is not evidence of a connected agent.

Tests discover actual refs and choices before calling actions, then check rendered results. They verify disabled controls, confirmation refusal, secret redaction and change source. The bridge retains the SDK's filtering and permission semantics. The kit requires no inspector or command console.

## Verification

```sh
python3 -m pip install playwright==1.65.2
python3 -m playwright install chromium
python3 tests/test_glass_browser.py --base-url http://127.0.0.1:4185/ \
  --output test-results/liquid-glass.json
```

CI adds `--software-gpu`. This uses the established Chromium SwiftShader flags only against the reviewed loopback build and blocks outside requests. CI requires the GPU path to reach `ready`; an unavailable adapter does not pass the rendering requirement.

| Evidence | What the suite checks |
| --- | --- |
| Catalogue | Overview plus all 55 families are discoverable; each family mounts without a render error and exposes named SDK entries. |
| Custom components | Two new catalogue collections, model/node selection, validation and label identity, current JSON/SVG export, keyboard and real agent actions, loaded media, responsive and forced-colour views. |
| Interaction | Real agent actions, keyboard selection, dialog dismissal and focus restoration. |
| Optical contribution | Actual button, input and panel rectangles with GPU canvases visible and hidden. |
| Material changes | Pixel changes after refraction-strength changes; a new capture revision and changed pixels after a backdrop change. |
| Motion | Actual changing frames, selection travel, eventual idle and a constant backdrop capture revision during interaction. |
| Popup rendering | A real top-layer dialog has a visible local GPU canvas and operable controls. |
| Responsive layout | The default mobile overview has no page-level horizontal overflow. |
| Preferences | Static reduced-motion rendering and the forced-colour fallback preserve controls and focus. |

The JSON report records browser metadata, status, pixel differences, timing and per-check outcomes. Screenshots include the desktop overview, desktop popup, mobile overview and GPU comparisons. Software rendering is functional evidence, not a hardware performance benchmark.

`npm run glass:check` verifies source coverage, pins, direct imports, renderer integration and attribution. `npm run glass:build` typechecks and builds. The path-filtered CI job has bounded runtime, cancellation of superseded runs and seven-day artifacts.

## Related material

- [Implementation standard](../../standards/liquid-glass.md)
- [Reusable package](../../../../packages/liquid-glass/README.md)
- [Developer and media component standard](../../standards/developer-components.md)
- [Worked model exploration task](../../models/developer-model-exploration.md)
- [HCI evaluation protocol](../../models/evaluation-protocol.md)

Visual fidelity and human usability require their own comparison evidence. The kit does not inherit results from the archived settings pilot or toolbar study.
