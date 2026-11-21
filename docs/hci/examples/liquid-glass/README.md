# Liquid Glass UI kit

A private UI kit that applies a shared WebGPU material to real Vercel UI SDK components. Its default overview contains working buttons, fields, choices, switches, sliders and a collection dialog. The searchable catalogue includes all **55 component families**, with one selected specimen shown at a time.

Seven custom collections extend that catalogue: **Patterns** for command search, filtering, selection, detail sheets and empty states; **Assistant** for prompt composition, attachments, suggestions, messages and sources; **Interactions** for cursors, click responses and genuine context actions; **Sections** for reusable showcases, natural-scroll chapters, contours and reveals; **Graphics** for an editable design canvas, AI brief/context handoff and image components; **Standards** for 46 editable models and the complete current OMG specification catalogue; **Agents** for capability cards, task history, proposed tool changes and produced artifacts. Graphics and Standards share the SDK pan/zoom/fit/fullscreen canvas. Custom components, theme and compositions are **Unvalidated**: no human UI/UX team has reviewed or approved them. **SDK foundation** marks upstream behaviour provenance and makes no human approval claim about Quantive's adaptation.

Open `?collection=patterns`, `?collection=assistant`, `?collection=interactions` or `?collection=sections` for direct access. Each composition collection includes **Use these components in a project**, with compiled TSX examples, copyable agent briefs and links to `/registry/components.json` and `/llms.txt`. The package remains a private workspace dependency.

The GPU treatment and animation are enabled under normal device preferences. Refraction and colour dispersion are adjustable in **Material settings**, and **Backdrop** changes the scene sampled by the glass. **Appearance** offers Follow device, Glass and Solid. **Animate glass** shows the effective motion state; turning it on explicitly enables animation for this kit. These choices are remembered locally without changing device settings. Labels and interaction stay in the DOM.

## Run

Use Node 24 or later. From the repository root:

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
| Patterns | Search and filter saved work, select records, apply bulk actions, inspect a detail sheet and use grouped commands through the real SDK palette. |
| Assistant | Choose a suggestion, edit the prompt, manage local attachment metadata and send or stop a local preview; inspect the resulting message and sources. No model provider is called. |
| Interactions | Compare Glass/Precision/Native cursors and Ripple/Spark/None feedback; right-click the coastal study or use Scene actions; operate the same menu with keyboard/agent actions; edit Study name and observe the local pending-save result. |
| Sections | Compare Split/Immersive layouts, choose or scroll between chapters, toggle Follow story scroll and change the decorative contour. All chapter text remains readable. |
| Graphics | Edit image/text/shape layers; change geometry, typography, fit and ordering; undo/redo, save directions, import raster images, export JSON/self-contained SVG and prepare an image-agent request. Image components retains the gallery, cards, details and comparison. |
| Standards | Search/filter 46 views, follow UWE/C4 cross-view links, pan/zoom/fit/fullscreen, inspect elements, edit labels/geometry/properties, add/delete elements and relationships, preview atomic transactions, undo/redo, import validated JSON, and export JSON/SVG. Browse 291 attributed entries with exact coverage. |
| Agents | Start the local sample, inspect its proposed change, approve it with the human control or reject/cancel it, then inspect the actual resulting artifact and task context. The demo uses fixture data and calls no provider. |
| Popups | Open menus, dialogs, popovers and drawers; their controls must remain above the backdrop and operable. |
| Accessibility preferences | Check forced colours, reduced transparency and reduced motion with the same labels, state and actions. |

All data and state changes belong to the demonstration. There is no form backend, account connection, upload service or purchase flow.

Model edits, canvas state, graphics history and variants survive collection navigation in this page session. A reload starts with the supplied examples. **Model data and structured edits** exposes current JSON and a validated editor through SDK fields. Catalogue entries distinguish notation subsets, concept projections and reference-only metadata. This release does not provide XMI/BPMN/DMN interchange or a standards execution engine. Images are fictional generated artwork, separately credited; exact diagram geometry is generated from typed data.

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
| Custom components | All seven custom collections; model/node selection, validation and label identity, JSON/SVG export, keyboard and real agent actions, loaded media, responsive and forced-colour views. |
| Library patterns | Accepted query/facet state, row selection and bulk effects, command actions, sheet focus/dismissal, empty recovery and narrow layout. |
| Assistant | Shared prompt and suggestion state, attachments, accepted local responses, cancellation and refusal paths, source disclosure and narrow layout. |
| Cursors and clicks | Exact pointer hotspot, fixed hit targets, finite effects and idle cleanup, context-menu focus return, disabled/pending actions, native input and hidden-region fallbacks. |
| Sections | Actual scroll-follow, shared keyboard/agent chapter selection, visible media/captions, narrow-screen focus retention and presentation preferences. |
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
- [Standards and graphics component contract](../../standards/standards-components.md)
- [Interaction and section contract](../../standards/interaction-sections.md)
- [Established library patterns](../../standards/library-patterns.md)
- [Agent composition guide](../../../../packages/liquid-glass/docs/llms.txt)
- [Complete OMG coverage](../../standards/omg-coverage.md)
- [Worked model exploration task](../../models/developer-model-exploration.md)
- [HCI evaluation protocol](../../models/evaluation-protocol.md)

Visual fidelity and human usability require their own comparison evidence. The kit does not inherit results from the archived settings pilot or toolbar study.
