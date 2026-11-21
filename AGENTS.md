# Quantitative HCI Liquid Glass standard

## Build the actual kit

Use the shared Liquid Glass kit for new high-fidelity internal interfaces without an established product design system. The default theme combines real UI SDK controls with the reusable WebGPU material. Keep the same control semantics and layout in the solid fallback. Read `docs/hci/standards/liquid-glass.md` before changing the material or renderer.

Use Studio typography (Manrope) and the custom Isometric icon set as the shared defaults. Keep Editorial (Fraunces headings with Manrope interface text), System fonts, and Line icons selectable through the same provider. The demo persists validated choices and Copy starter includes the current selection. Keep conventional micro-icons simple, decorative art outside the accessibility tree, and line icons available in forced colours. Preserve live control values and focus when presentation choices change.

Keep custom components and compositions visibly labelled **Unvalidated**: no human UI/UX team has reviewed or approved them. Use `ValidationBadge` and the custom component manifest. This includes standards adapters, the shared canvas, graphics/media components, custom glass theme and icons. Label the 55 upstream families **SDK foundation** to identify Vercel UI SDK provenance; do not imply that upstream behaviour or automated tests validate our visual adaptations. Promotion requires recorded human review evidence, its scope, reviewers, date, findings and decision.

Read `docs/hci/standards/standards-components.md`, `docs/hci/standards/omg-coverage.md` and `docs/hci/standards/agent-first-modeling.md` before changing Standards, Graphics or Agents. Keep all 46 registered views and the complete versioned OMG catalogue with honest per-version coverage. Preserve exact notation, text alternatives, stable identities, shared SDK actions, pan/zoom/fit/fullscreen and validated edits. Treat BMM/SBVR/BACM and agent views as concept projections, SysML 1.7 separately from 2.0, UWE as an LMU profile, and C4 as a separately attributed architecture method. Keep diagrams as SVG generated from data. Model edits go through the revisioned `LiquidModelDocument` transaction path with atomic validation, cancellation and bounded history; preserve links between views and the additive profile registry. Graphics uses editable layers, revision-checked operations, undo/redo, inspectable AI context, local artwork and provenance. Never imply the demo called an AI backend when it only prepared a request or ran a local fixture. Retain all three custom collections alongside all 55 SDK families; `/developer` stays a compatibility API, not a product section name.

Read `docs/hci/standards/interface-foundations.md` for interface design work. Identify the real task and observable outcome, model the relevant content/navigation/presentation/state decisions, and choose the matching quantitative HCI checks before changing layout or styling. Reuse existing models. Keep a concise task, decision, evidence, result and next-decision record; automated geometry and pixel evidence do not establish human recognition or speed gains.

Keep Interactions and Sections as additive collections alongside Standards, Graphics and Agents. Read `docs/hci/standards/interaction-sections.md` and `packages/liquid-glass/docs/llms.txt` before extending their components. Keep cursor/click/magnetic effects decorative, native text entry intact, context actions on the real SDK Menu, chapter text readable and hit targets stationary. Preserve finite motion, hidden-region cleanup and shared cancellable selection. Update the custom component manifest and recipe registry when exports change; copyable examples must remain compiled TSX, and the hosted registry and agent guide must be generated from the canonical package files. Reuse the host's existing provider and single SDK agent bridge.

Before using UI SDK, follow `node_modules/@ui-sdk/core/skills/ui-sdk/SKILL.md`, read `node_modules/@ui-sdk/react/docs/llms.txt`, and read the relevant component and agent pages. The kit pins `@ui-sdk/react` and `@ui-sdk/core` to **0.1.0-beta.13**. Import primitives directly from documented `@ui-sdk/react/<component>` entries. Existing `@quantitative-hci/liquid-glass/<component>` exports remain compatibility aliases; do not fork SDK behaviour.

Use `LiquidGlassProvider` from the shared package and its kit stylesheet. Mark intended optical surfaces with `data-liquid-glass`; `data-liquid-glass="off"` excludes a subtree. Reuse the renderer and supplied backdrop texture across normal surfaces, with local canvases for top-layer popups. Keep labels, text, focus, input handling and ARIA in the real DOM. Decorative canvases must never intercept input or enter the accessibility tree.

Do not replace the kit with a component workbench, diagnostic inspector, standalone lens page or CSS-only blur presentation. The hosted demo starts with a usable overview and keeps all **55** component families discoverable. A selected family mounts its genuine SDK specimen. Preserve the manifest, public component aliases and source attribution.

## Material and accessibility

Put shared colours, radii, optical parameters, focus and fallback rules in the package. Keep text and dense content readable over the supported backdrops. Preserve primary, destructive, invalid, disabled, selected and pending states.

Follow reduced transparency and reduced motion by default. Offer explicit per-app Glass and Animate glass choices when the user wants to preview the full material; never change device settings. Forced colours always suppress the GPU material and retain system-colour controls. Report the effective motion/material state accurately. Keyboard actions, Escape dismissal, focus restoration and pointer hit targets must work with or without WebGPU. A shader must not replace a control with a painted imitation.

Enable the shared pointer light, bounded activation ripple, native selection-indicator travel, switch motion and popup response under normal preferences. Stop work after the response settles and while the document is hidden. Reuse the captured backdrop during animation; do not recapture it every frame. Keep labels and hit targets steady.

The renderer samples the supplied decorative backdrop. Do not claim that it automatically refracts arbitrary live application content. Retain the source attribution and MIT notice for `arya3d/liquid-glass-webgpu` at `90cb73931bbaf38bd54b3263cd3fda1daef1869c`, and identify local adaptations. This is a web implementation inspired by the reference, not Apple's native renderer.

## SDK agent semantics beneath the UI

Create one client-side `createAgent` bridge from `@ui-sdk/react/agent`, register browser tools with an explicit policy when supported, and retain cleanup. Use SDK controls and change callbacks so a person and an agent update the same application state. Give every control a meaningful accessible name.

Keep `snapshot`, `query`, `act` and subscriptions as the actual SDK APIs. The private `window.quantitativeHciAgent` facade supports verification; it does not need a diagnostic interface in the product. Respect secret, hidden and confirmation marks. This demo refuses actions marked as requiring a person. Do not add an alternative mutation path to bypass that policy.

## Required evidence

Run `npm run glass:verify` for kit changes and `python3 tests/test_glass_browser.py` against the production preview for interaction, agent, rendering, preference or layout changes. CI uses the documented software-WebGPU flags only for the reviewed loopback build and blocks outside requests.

Verify GPU contribution on actual button, input and panel rectangles, optical-strength changes, backdrop recapture, top-layer popup visibility and focus, all 55 catalogue specimens, and the narrow overview layout. Verify changing motion pixels, constant capture revisions during interaction, eventual idle, and both system and explicit app preferences. Save screenshots of the overview, desktop popup, mobile overview and GPU comparisons. A `ready` attribute by itself is insufficient rendering evidence.

Report actual commands, exit codes, browser, viewports, pixel checks and any unavailable path. Automated checks do not establish optical equivalence, WCAG conformance or improved human usability. Preserve original HCI calculators, protocols and recorded pilot results as independent research; the old workbench and pilot are not part of the hosted kit. Keep internal access private unless the user instructs otherwise.
