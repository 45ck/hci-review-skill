# Liquid Glass UI kit standard

**Status:** Default component material for new high-fidelity Quantitative HCI internal interfaces without an established product design system. Real UI SDK behaviour and a reusable WebGPU theme form one kit.

The [kit](../examples/liquid-glass/README.md) starts with usable glass controls and keeps all 55 component families in a searchable catalogue. The reference shader is integrated into actual surfaces. A separate optical lab, diagnostic workbench or CSS blur toggle does not satisfy this standard.

The [interface foundations](interface-foundations.md) connect this material to task, content, navigation, presentation and state modelling, with quantitative evaluation. Use Studio typography (Manrope) and Isometric icons by default; provide Editorial (Fraunces headings with Manrope interface text), System fonts and Line icons through `fontSet` and `iconSet` on `LiquidGlassProvider`. Font and icon changes preserve the current task, labels, focus and hit targets. The demo stores validated choices, and its copied starter includes the selected presets. The [customization model](../models/kit-customization-model.md) defines the behaviour and evidence to review.

## Responsibilities

| Layer | Owner | Requirement |
| --- | --- | --- |
| Component behaviour | `@ui-sdk/react` and `@ui-sdk/core` **0.1.0-beta.13** | Preserve composition, keyboard navigation, focus, validation and popup handling. |
| Material | `packages/liquid-glass` | Share optical parameters, tokens, semantic states, focus and fallback rules. |
| Renderer | `LiquidGlassProvider` and its engine | Register actual DOM bounds, sample the supplied backdrop, draw normal and top-layer surfaces, and clean up resources. |
| Agent interface | `@ui-sdk/react/agent` | Expose genuine names, state, choices, actions and notifications through one policy-controlled bridge. |
| Demo | `docs/hci/examples/liquid-glass` | Show a usable overview and one selected family at a time without requiring diagnostic UI. |
| Evidence | Browser contract and HCI protocol | Keep source checks, functional outcomes, rendered pixels and human observations distinct. |

The shader reference is [arya3d/liquid-glass-webgpu at 90cb73931bbaf38bd54b3263cd3fda1daef1869c](https://github.com/arya3d/liquid-glass-webgpu/tree/90cb73931bbaf38bd54b3263cd3fda1daef1869c), linked by the [original video](https://www.youtube.com/watch?v=lq-ikfNVx7g). Retain its MIT notice and identify local multi-surface and React adaptations. This is a web implementation inspired by the reference, not Apple's native renderer.

## Components and state

Follow the official skill at `node_modules/@ui-sdk/core/skills/ui-sdk/SKILL.md` and the installed React documentation before changing composition. Import primitives from explicit `@ui-sdk/react/<component>` entries and helpers from documented core entries. Preserve package re-exports as compatibility aliases, without forking the SDK interaction engine.

Use default or controlled state consistently. Update controlled application state in `onValueChange` or the corresponding SDK callback. Return asynchronous button work so pending/error state and agent actions track completion. Validate values in the shared callback or application action, rather than only in pointer or keyboard handlers.

Give every control a meaningful name. Keep names stable where selected or pressed state already explains the change. Popup titles, triggers and final actions must be distinguishable. A disabled trigger must not leave a contradictory action available to an agent; mount or disable the complete interaction consistently.

The manifest remains the source of truth for **55 families**. Every family needs its real upstream import, package alias and working specimen. Overview is an additional catalogue choice, not a replacement for coverage.

The **Visual components** and **Developer components** collections are additional custom compositions, with a separate [custom manifest](../../../packages/liquid-glass/custom-component-manifest.json). Follow the [developer component standard](developer-components.md) for typed UML/UWE models, exact vector notation, text equivalents and shared human/agent actions. Custom components, icons, glass styling and demo compositions remain visibly **Unvalidated** until a recorded human UI/UX team review approves a defined scope. Label upstream families **SDK foundation** for provenance without implying human approval of the adaptation.

## Optical surfaces

Apply the shared kit stylesheet and `LiquidGlassProvider` at the application boundary. Register intended surfaces with `data-liquid-glass`; `data-liquid-glass="off"` excludes a subtree. One shared viewport canvas and local canvases for actual top-layer popups align with current DOM rectangles after resizing, scrolling, selection and popup changes.

Keep text, input values, focus rings and interaction in the DOM above the decorative renderer. Canvases are `aria-hidden` and have `pointer-events: none`. Never replace an accessible control with a picture. Preserve primary/destructive variants, invalid, selected and disabled states.

The capture boundary is the supplied decorative backdrop. Changing it must refresh the GPU texture. Refraction and dispersion changes should redraw from the current texture without recapturing the whole application. Do not claim automatic refraction of arbitrary live page content.

Share work across controls, bound resolution, draw when material or geometry changes, and release GPU resources and observers on teardown. Do not create an independent continuously running GPU loop for every control.

Keep broad faces clear and concentrate refraction near the bevel. Directional upper and lower reflections, a thin inner rim and separate contact/ambient shadows establish thickness. Avoid broad centre-contraction artifacts and uniform bright outlines. Pointer light, damped activation ripples and short selection springs belong to the shared material. Use `TabsIndicator` and `SegmentedControlIndicator` so selection motion follows the SDK's actual state, including keyboard and agent changes. Text and hit targets stay stable.

Motion is enabled under normal device preferences. A single bounded animation loop follows active light, ripple and geometry responses, then stops; it pauses for hidden documents and never recaptures the backdrop every frame. Disabled/read-only controls must not imply a successful action through a press response.

## Readability and fallbacks

Use glass principally for controls, navigation and compact surfaces. Keep long text and dense data readable. Test final composited contrast against the supported scenes; a token value alone is insufficient. Apple's [materials guidance](https://developer.apple.com/design/human-interface-guidelines/materials) is a design reference.

| Condition | Required behaviour |
| --- | --- |
| WebGPU available | Registered controls and panels receive the GPU material by default. |
| Unsupported adapter or renderer failure | Preserve the DOM interface and fallback surfaces; report the actual renderer state. |
| Reduced transparency | Follow it by default; an explicit per-app Glass choice may opt back into transparency. |
| Forced colours | Always suppress the GPU effect and use system-colour surfaces. |
| Reduced motion | Follow it by default: keep static refraction and remove decoration. An explicit per-app animation choice may opt in. |
| Keyboard input | Keep visible focus, arrows, selection, Escape dismissal and focus restoration. |
| Narrow viewport | Fit the overview and selected specimens without page-level horizontal overflow. |

Fallbacks retain the same actions and state. They are not a separate demo mode that replaces the default kit.

Expose the effective state in controls. An animation switch must be unchecked when the device preference actually suppresses animation. A material selector offers Follow device, Glass and Solid; the kit remembers explicit choices for that demo only. Do not alter operating-system or browser preferences to enable a visual treatment.

## Agent semantics beneath the UI

Create one client-side `createAgent` bridge from the same SDK instance as the controls. Register supported browser tools with an explicit policy and clean them up on disposal. The private verification facade exposes the actual `snapshot`, `query`, `act` and `subscribe` methods. The product interface does not need an inspector, code console or synthetic state registry.

Respect `data-agent-secret`, `data-agent-hidden` and `data-agent-confirm`. Put confirmation on the final action needing a person, while opening or cancelling remains available. The demo refuses marked actions. Password and OTP values stay redacted in snapshots, results and notifications.

Tests discover refs and choices from the bridge and use a fresh ref after replacement or renaming. An `act` success alone does not prove a requested value was accepted: compare rendered state. Sequential action batches do not imply rollback.

## Verification

From the repository root:

```sh
npm ci --ignore-scripts
npm run glass:verify
npm run preview -w @quantitative-hci/glass-gallery
```

With the production preview running:

```sh
python3 tests/test_glass_browser.py --base-url http://127.0.0.1:4185/ \
  --output test-results/liquid-glass.json
```

CI adds `--software-gpu` for the reviewed loopback build using the established Chromium SwiftShader flags and blocked outside requests. The GPU path must reach `ready`; fallback cannot substitute for rendered evidence.

Required checks:

1. Overview plus all 55 catalogue families are discoverable; each specimen mounts and its SDK entries are named.
2. Representative agent actions change DOM state, with disabled refusal, confirmation refusal, secret redaction and `source: "agent"` verified.
3. Keyboard selection, dialog dismissal and focus restoration work.
4. GPU canvases change pixels on at least three actual surface rectangles: button, input and panel. Record matched visible/hidden-canvas screenshots.
5. Refraction strength changes rendered pixels. Backdrop changes advance capture evidence and change rendered output.
6. A real top-layer dialog renders its local GPU surface and retains visible, operable controls.
7. The mobile overview fits; accessibility preferences preserve controls and keyboard focus.
8. Actual shader pixels change during hover/activation while capture revisions stay constant. Effects settle and rendering stops at idle.
9. The native selection indicator travels for pointer, keyboard and agent selection. Disabled controls produce no accepted-activation ripple.
10. System motion/transparency preferences and explicit per-app choices behave distinctly. A missing adapter retains useful CSS feedback and truthful status.

Save desktop overview, desktop popup, mobile overview and GPU comparison screenshots. Report actual browser/version, viewport, status, pixel differences, timing and failures. These checks establish the observed integration; they do not establish optical equivalence, full WCAG conformance or improved human usability.

## Existing research and access

Keep the calculators, [evaluation protocol](../models/evaluation-protocol.md), toolkit skills and recorded studies intact. The archived beta.10 settings pilot remains a separate source fixture; its measurements do not describe this kit, and it is not part of the hosted UI. Keep internal hosting private unless instructed otherwise.
