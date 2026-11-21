# Interactions and sections

**Decision:** extend the shared Liquid Glass kit with scoped cursor/click decoration, SDK context actions and reusable semantic page sections. The core remains Vercel UI SDK `0.1.0-beta.13`. The package adds composition and presentation; it does not fork menu, selection, focus or agent behavior.

## Task and observable outcome

A developer or coding agent should be able to find a pattern, try it using more than one input route, and copy an example that compiles against the real package. A person using the resulting interface should still be able to find actions, select text, enter data, dismiss a popup and read a story without the decorative effects.

Success is observable: a scene action changes the same scene state whether invoked through the visible control, context menu, keyboard or SDK agent. A selected chapter changes the corresponding image and caption. Copy example returns the source included in the build. Copy agent brief returns the same recipe, imports, restrictions and source. These are correctness claims, not measured improvements in human performance.

## Content and navigation model

| Object | Identity | Ownership |
| --- | --- | --- |
| SDK family | Existing component manifest ID | Upstream controls and behavior remain unchanged. |
| Collection | `interactions`, `sections` | Additive catalogue destinations alongside Graphics, Standards and Agents. |
| Scene | A name, palette, saved flag and bounded copy count | Demo React state, changed only through shared application callbacks. |
| Context action | Stable `id` and visible label | SDK Menu controls availability, focus, pending and dispatch; the host owns business authorization. |
| Chapter | Stable ID, label, title, content, media and caption | One selected value; optional scroll observer and SDK selection request the same change. |
| Recipe | Stable recipe ID, imports, constraints and source file | `component-recipes.json`; TypeScript-checked source examples. |

The overview links directly to the two new collections, and catalogue search includes their task vocabulary. Explicit catalogue selection updates `?collection=<id>` so a collection can be bookmarked; browser Back restores the selected destination. Search results remain a temporary view. Visited custom collections retain their local state while hidden, with decoration suspended.

## Presentation and interaction contract

| Component | Purpose | Input, fallback and boundary |
| --- | --- | --- |
| `LiquidCursor` | Exact hotspot with glass or precision accent and optional short context label | Scoped fine mouse input. Native input/editable/canvas/popup regions stay native. Keyboard, motion-off and forced colours remove decoration. No pointer interception. |
| `LiquidClickFeedback` | Bounded ripple or spark after an accepted activation | Never supplies an action or completion status. Disabled/pending/cancelled controls do not show accepted-feedback. Responses settle and are cleaned up. |
| `LiquidMagnetic` | Move a decorative icon toward the pointer | The outer target, label and focus ring remain stationary. Content is aria-hidden; never nest a functional control inside it. |
| `LiquidContextMenu` | Scoped right-click/long-press actions with a visible trigger | SDK handles context gesture, Shift+F10, arrows, typeahead, collision, Escape and focus recovery. Application callbacks validate availability and preserve confirmation marks. |
| `LiquidSection` | A semantic section, heading and action area | Real reading order and heading hierarchy, including without visual effects. |
| `LiquidShowcaseSection` | Split or immersive media presentation | A caption and accessible alternative travel with the media. Preserve actual task actions. |
| `LiquidChapterSection` | Readable chapters with related persistent media | Controlled/uncontrolled value, cancellable shared callback, explicit SDK selection, optional natural-scroll following. All chapter text remains in the DOM. |
| `LiquidSectionContour` | Decorative transition between sections | SVG with no interactive or information-bearing role; suppressed in forced colours. |
| `LiquidReveal` | Brief entrance emphasis | Progressive enhancement: content starts readable and remains readable when effects cannot run. |

Custom components and compositions remain visibly **Unvalidated**. Keep the existing provider's effective motion setting, current font/icon preferences, glass surfaces and fallbacks. The cursor accent is DOM decoration; it does not claim to refract arbitrary live page content or implement the GPU material itself.

## Agent composition

Use `/interactions`, `/sections` and their corresponding CSS exports. The recipe metadata is available through `/recipes`; the hosted app emits `/registry/components.json` and `/llms.txt` from the repository files during its build. This registry is descriptive, not an action server or an installable npm registry.

The examples are ordinary TSX source inside the gallery compilation. The visible Copy example button uses those exact files, rather than an independently maintained snippet. Copy agent brief includes their source and the package policy. Reuse one `createAgent` bridge. Discover real controls with `snapshot` and `query`, call their documented actions, and verify the resulting DOM/application value. Decorative effects do not require or expose synthetic agent actions.

The package remains private and workspace-based. No new runtime dependency was added. Applications still supply persistence, network actions and permissions; the showcase is a clearly labelled local sample. A delayed save in the showcase demonstrates SDK pending state only.

## Provenance and external research

Internal reference checkout: `45ck/portfolio-monorepo` at `21b9a48db79f81600ff9981812a6aa7528bfb6b8`.

| Reference | Reused idea and treatment |
| --- | --- |
| `packages/ui-portfolio/src/site-cursor.js` | CK/Wayrest modes, exact hotspot plus damped accent, native exclusions, idle behavior. Reimplemented as scoped React composition. |
| `packages/agency-motion/index.js` | Fixed target with decorative child movement, visible-state cleanup. The new implementation is original and does not vendor its Corsair-derived source. |
| `apps/wayrest/src/components/home/SectionContour.astro` | Continuous decorative SVG boundaries, excluded from the accessibility tree. Original paths in this package. |
| `apps/wayrest/src/lib/home-motion.mjs` | Natural, reversible scroll association without intercepting scrolling. Implemented here with an observer and the SDK selection control. |
| [Vercel UI SDK Menu](https://ui-sdk.dev/docs/react/components/menu) | Actual pinned `MenuContextTrigger`, `MenuTrigger`, `MenuContent` and `MenuItem`. Installed docs and types are authoritative for implementation. |
| [21st Liquid Glass Wordmark Footer](https://21st.dev/@automate_flows/components/liquid-glass-wordmark-footer) | Complete section composition, lens/click response and readable content. Public listing marks MIT; source was not downloaded or copied. |
| [Magic UI Pointer](https://magicui.design/docs/components/pointer), [Ripple Button](https://magicui.design/docs/components/ripple-button) | Scoped decoration and bounded feedback references. Original implementation around SDK controls; no second button stack. |
| [Motion Cursor](https://motion.dev/docs/cursor) | State-aware cursor design reference; premium component source not included. |
| [React Bits licence](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md) | Current terms restrict redistribution of its components. No React Bits source or ports are included. |

Research was checked on 21 November 2026. Record a fresh licence/source check before importing any external component in a later change. Existing shader, font, icon and generated-artwork provenance remains in its original manifests and notices. New demonstrations reuse the kit's existing fictional artwork.

## Evidence and next decision

Implementation gates: package source contracts, strict TypeScript, production build, existing HCI calculator tests, full baseline browser contract, plus new interaction and section scenarios. The new scenarios exercise real SDK agent state, pointer/keyboard alternatives, reduced motion/forced colours, narrow layout and finite effects. Keep their screenshots and JSON with the CI run.

Quantitative diagnostics: check stationary target rectangles under magnetic motion, pointer-dot distance from the actual pointer, page overflow at 390 CSS pixels, bounded active click effects and settled cursor work. Human outcomes remain hypotheses: action discoverability, missed clicks, context-menu discovery, reading continuity and comfort need observed tasks with representative people. The next decision is whether to promote a composition after that review; automated checks alone do not change its Unvalidated status.
