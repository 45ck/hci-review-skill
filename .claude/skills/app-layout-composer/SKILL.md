---
name: app-layout-composer
description: Design or extend Quantive task-first, responsive application shells, including accounts, organisations, multitenancy and agent-operable business workflows. Use before generating generic dashboard scaffolds.
disable-model-invocation: true
---

Design or extend the application layout for:

$ARGUMENTS

Follow [the Quantive App Layout System](../../../docs/hci/standards/app-layout-system.md), [interface foundations](../../../docs/hci/standards/interface-foundations.md), [agent-first engineering](../../../docs/hci/standards/agent-engineering.md), the repository `AGENTS.md` and `packages/liquid-glass/AGENTS.md`. This is an application-composition workflow **above** the installed Vercel UI SDK, not a replacement component library.

## 1. Read the existing product before designing

Inspect the real routes, navigation, screens, data models, app permissions, UI SDK adapter, existing design system and tests. Identify the task the user actually came to perform, primary actor, critical objects, supporting evidence, first useful action, and credible outcome. State unknowns rather than fabricating domain statistics, testimonials, billing, capacity, security or performance.

If the host already has a strong established design system, preserve it. If this is a new Quantive internal app, use the shared Liquid Glass kit and tokens. All new custom compositions remain **Unvalidated** pending explicit human UI/UX review.

## 2. Pick the application anatomy, not a fashionable dashboard

Choose exactly one primary recipe and justify by the task:
- **Operations console:** current work, queue, inspection and a real decision; optional details inspector.
- **Content/design studio:** real canvas or document, properties, history, selection, export and collaboration when supported.
- **Customer portal:** account, specific customer jobs, documents, billing where applicable, support and status with clear next actions.
- **Field/mobile workflow:** quick target selection, capture/edit, offline pending, upload/sync and recovery.

Map a realistic entity hierarchy and navigation model. Define UWE content, navigation, presentation and process views where useful; model the core state transitions explicitly. List desktop, tablet and mobile regions and what moves or transforms at narrow widths. Do not use equal-weight status cards as a substitute for defining the task.

## 3. Supply the reusable foundations

Use or propose the smallest relevant composition set:
- **App shell:** product identity, route navigation, breadcrumbs/current context, command palette, current task region, optional inspector, notifications, user menu.
- **Account:** profile, security, sessions, notification preferences and account-specific actions.
- **Organisation:** authenticated organisation switcher, members/invitations, roles, audit, tenant settings and billing where authorised.
- **Records:** labelled collection or table, search/filter, detail, review/edit, audit trail, source/time/units where needed.
- **Lifecycle:** loading, empty, no results, errors, stale data, denied, pending, cancellation, undo/retry and successful updates.

Account scope and tenant scope are separate. Never infer permission from a visible role badge or client-side selected workspace. Do not invent user management, Stripe or persistence endpoints.

## 4. Apply the existing SDK and material

Read installed `@ui-sdk/core` and `@ui-sdk/react` docs and actual pinned types. Prefer native SDK controls and compositions. Custom behaviour uses `definePrimitive` and shared cancellable changes when justified. Do not create parallel mutation paths, simulated successful actions or private SDK imports. Use the existing one-agent bridge: meaningful names, discoverable state and choices, actual accepted action result, rejection and cancellation.

Preserve `LiquidGlassProvider` and real WebGPU optics for navigation/control surfaces. Keep data, tables, long copy and forms readable, with solid fallbacks. Do not substitute CSS blur for the required GPU implementation, render fake controls into canvas, or intercept native scroll/selection. Preserve reduced-motion, transparency and forced-colours behaviour.

## 5. Prevent the common app-template failures

Flag and correct:
- Four equal-width KPI cards with invented trends or no supporting decision.
- Repetitive card-in-card borders, random shadows, huge empty gradient heroes and translucent tables with poor contrast.
- Placeholder prose, duplicate subtitles, status labels with no concrete meaning, text→arrow→text pictures presented as explanations.
- Overcrowded navigation, hidden account access, settings mixed with tenant admin, controls without permitted/disabled/pending states.
- Desktop tables shrunk into unreadable mobile overflow; modal sheets with no escape or focus return.
- Multiple custom controls that duplicate SDK semantics, visual-only agent actions and hidden backend authorisation assumptions.

Use product-specific visual identity, density, media and layout hierarchy. The output must not look like a copy-pasted 21st.dev or shadcn default with different colours.

## 6. Verify and hand off

Produce the page/route inventory, one primary task journey, real data/state contract and code with tested interactive outcomes. Test at widths 320, 390, 768, 1024 and 1440 CSS px; check zoom/spacing overrides and keyboard focus. Test workspace switches, identity vs tenant settings, read-only/denied roles, stale responses, multi-tab invalidation where a backend exists, empty/loading/failure/recovery and agent controls with observable state changes.

Run repository `glass:agent-check`, `glass:verify` and relevant browser checks for **runtime** package changes. Record exact commands/results, screenshots and what was not tested. Do not claim human usability, WCAG conformance, production multitenancy or GPU equivalence from a static mock, a CSS preview, an inventory check or agent `act().ok` alone.

Update agent contracts, manifest, recipe registry, documentation and attribution whenever a new public runtime composition ships. Present comparative designs and a recommendation with reasoning; use a single professional default without forcing it on every app.
