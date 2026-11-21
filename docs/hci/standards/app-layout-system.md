# Quantive application layout system — architecture and decision record

**Updated:** 22 November 2026
**Status:** Implemented React package and gallery study; production application flows remain a roadmap. **Unvalidated** by human UI/UX review. Automated results belong to the matching build and browser reports.
**Repository:** `45ck/hci-review-skill`, alongside the existing [interface foundations](interface-foundations.md), [Liquid Glass standard](liquid-glass.md) and [agent engineering standard](agent-engineering.md).

## Purpose

Quantive should provide **application-level compositions** so new business software does not start as an unstructured collection of widgets. The product designer or agent should begin from a task model and one of several layouts; then supply domain terminology, data and permitted actions. The same resulting UI must be understandable to people **and** discoverable, operable and verifiable by agents through the existing UI SDK.

This is a layer **above** the 55 pinned Vercel UI SDK families, existing Quantive materials, model/graphics tooling, sections and interactions. Do **not** fork their behaviours, introduce a second agent API or transplant an entire 21st.dev dashboard as a hidden dependency.

## Research findings used for the decision

| Source | What to reuse | What not to inherit |
| --- | --- | --- |
| [21st.dev dashboard catalogue](https://docs.21st.dev/community/components/s/dashboard) and [dashboard composition guide](https://mcp.21st.dev/blog/react-dashboard-components) | Proven sidebar variations, data tables, chart anatomy, shell patterns and inspectable small parts | Aesthetic-only KPI grids or task-free mock data |
| [21st.dev Adjustable Glass Dashboard](https://docs.21st.dev/%40automate_flows/components/adjustable-glass-dashboard) | Material parameters, layout density and responsive glass treatment as research inspiration | Importing whole unverified code or GSAP without a concrete motion requirement |
| [shadcn/ui dashboard](https://ui.shadcn.com/blocks/dashboard) and [sidebars](https://ui.shadcn.com/blocks/sidebar) | Responsive shell, mobile sheet, shortcut patterns, composable chart/table regions | Replacing UI SDK controls with a second competing behaviour library |
| [Apple materials guidance](https://developer.apple.com/design/human-interface-guidelines/materials) | Put glass in a functional layer around navigation and controls, preserve content readability | Applying blur to every data cell, form and page background |
| [Clerk organisations](https://clerk.com/docs/guides/organizations/overview) | Distinct identity/organisation context, organisation switcher, membership, roles and multi-tab considerations | Treating the selected tenant in local UI state as authorisation |
| [Reddit UI library discussion](https://www.reddit.com/r/Frontend/comments/1opi3h3/is_anyone_else_tired_of_every_tailwindshadcn_app/) | Community warning that uncustomised defaults look alike | Treating anecdotal complaints as measured quantitative outcomes |
| [Vercel UI SDK](https://github.com/vercel-labs/ui) | Typed behaviours, ARIA, keyboard, focus and one agent bridge | DOM-only actions with invented agent metadata |

## Layout families and roadmap

1. **Operations console — implemented study.** Persistent workspace navigation on desktop; review queue and contextual detail; compact top context, bottom navigation and drill-down detail. The gallery records reversible decisions against fictional local records.
2. **Content studio — future recipe.** Navigation + central document/canvas + optionally docked properties, history and collaborator presence; mobile focuses on one editing operation at a time. Keep pan/zoom behaviour with the existing Quantive canvas.
3. **Customer portal — future recipe.** Clear current account, task status, documents, subscriptions, notifications, support and recovery; few navigation levels and no gratuitous administrative dashboard.
4. **Mobile/field workflow — future recipe.** Task list, capture/upload, offline/pending state, explicit synchronization, human confirmation and one-hand reachable primary actions.

Templates specify **regions, navigation, state, density and task affordances**, not hardcoded colours, fake metrics or domain copy. Use a single responsive design model rather than a mini desktop rendered on a phone.

## Public composition inventory

All nine layout exports are available from `@quantitative-hci/liquid-glass/layouts`, with `@quantitative-hci/liquid-glass/layouts.css` loaded after `kit.css`.

| Family | Implemented public exports | Responsibility |
| --- | --- | --- |
| Shell | `LiquidAppShell`, `LiquidAppRail`, `LiquidAppWorkarea` | Grid boundary, workspace navigation region and flexible central column |
| Task regions | `LiquidAppHeader`, `LiquidAppContent`, `LiquidAppInspector`, `LiquidAppDock` | Semantic content and navigation surfaces; host-owned content, visibility and focus |
| Navigation | `LiquidAppNavigation` | Controlled current page, optional icons/counts and disabled destinations on real SDK Buttons |
| Workspace context | `LiquidWorkspaceSwitcher` | Controlled membership choice on the real SDK Menu; stable item IDs and host-owned acceptance |

Reuse the existing `/patterns` components for command search, filtering, selection, detail sheets and empty states: `LiquidCommandPalette`, `LiquidFilterBar`, `LiquidSelectionBar`, `LiquidDetailSheet` and `LiquidEmptyState`. Account/security/session management, membership invitations and roles, billing, audit, API keys and integrations are future product flows; the local gallery pages do not supply their backend implementations.

Reuse the existing UI SDK `Dialog`, `Menu`, `Tabs`, `Popover`, `Field`, `Input` and `Button` as documented by the **installed 0.1.0-beta.13** version. Data tables can use appropriate native table semantics; this pinned SDK does not publish a `Table` family. A composition can expose genuine SDK children and need not invent its own `definePrimitive` if no new behaviour exists. Keep the existing `LiquidGlassProvider` and one host `createAgent` bridge.

## Layout API and composition

The seven passive regions accept `children`, `className` and their standard HTML attributes. `LiquidAppContent` defaults to a `main` element; choose `as="section"` and a meaningful accessible label when embedding it inside an existing main landmark. The wrappers do not register fictitious agent actions.

`LiquidAppNavigation` accepts `items: { id, label, icon?, count?, disabled? }[]`, `activeId`, `onNavigate(id, details)`, optional `label` and `className`. The callback receives the SDK's `ButtonActionDetails`, including its input source. The host supplies the resulting active ID. Return asynchronous work so the Button retains its actual pending/error state.

`LiquidWorkspaceSwitcher` accepts `items: { id, name, role?, shortLabel? }[]`, `value`, `onValueChange(id, details)`, optional `disabled` and `className`. Supply only approved memberships. The current item is disabled; remaining items use stable SDK Menu values. The callback receives the SDK's `MenuActionDetails` unchanged, and its returned Promise participates in the Menu's pending/error lifecycle. That type exposes the event; do not assume it provides the Button's source or a cancellable change object. Keep the controlled value unchanged when the host refuses a transition, and report the actual result.

The shared CSS uses a 224px rail and optional 300px inspector, adjustable with `--qg-app-rail-width` and `--qg-app-inspector-width`. At viewport widths up to 920px the rail narrows and the inspector is hidden; `data-open="true"` displays it over the shell. At widths up to 600px the rail hides, the dock appears and an open inspector spans the shell. These are layout rules, not modal behaviour: the host owns focus restoration, dismissal and preventing interaction with covered content. Use the SDK-backed `LiquidDetailSheet` when the task needs a drawer's focus and dismissal behaviour. The embedded gallery adapts to its own container width and manages its compact detail view in application state.

The [compiled application-shell recipe](../examples/liquid-glass/src/recipes/application-shell.tsx) is a small complete example with its own provider, navigation, workspace choice and reversible local review decision. Reuse the inner composition under an existing provider and bridge in an established app. The full gallery study adds projects, people, account pages, filtering and an inspector. The canonical `liquid-app-shell-regions` and `liquid-app-navigation` entries in [agent-contracts.json](../../../packages/liquid-glass/agent-contracts.json) describe discovery and evidence.

## Explicit app layout contract

This is the host integration model, rather than one object passed to `LiquidAppShell`. A product provides:

- `identity`: authenticated principal, account route and account capability descriptor; **not** a client-side credential;
- `workspaces`: stable id, display name, membership summary, active id and server-authorised switch handler;
- `navigation`: grouped stable route IDs, labels, icons, destinations, available/cannot-access state and page hierarchy;
- `regions`: main, optional inspector, details, mobile alternate, dialogs and notifications;
- `actions`: typed, permitted, cancellable commands with pending state, revision/context, actual accepted result and error;
- `presentation`: font, icon, density, material and theme presets, screen and input preferences;
- `data`: status, source, units, timestamp, empty/error cases and access level;
- `agentContract`: public discoverable controls and state, declared choices, observed outcomes, confirmation/hidden/secret boundaries.

Account routes remain **principal-scoped**. Organisation settings, billing, members, projects and other tenant-owned resources remain **tenant-scoped**. A navigation route must not become an authorisation boundary.

## Multitenancy acceptance boundary

A real implementation requires all of the following, none supplied by a visual shell:

- Authenticate the principal on the backend; verify membership and permission on **every query and mutation**, including background fetches, exports, file downloads, webhooks, subscriptions and agent tools.
- Scope persisted resources to a tenant ID; reject cross-tenant object IDs even when the UI displays the correct active organisation.
- Invalidate, cancel or revalidate in-flight queries and optimistic updates after workspace switches, role changes, logouts and revoked memberships. Verify multi-tab behaviour explicitly.
- Confirm sensitive operations, preserve server-side audit records (principal, tenant, action, timestamp, result), and never reveal passwords, tokens or OTPs in agent snapshots.
- Present real denial, pending, stale-version, retry and cancellation outcomes; a disabled UI control alone is not a security guarantee.

## Responsive design rules

| Available width | Primary layout | Data/display adaptation |
| --- | --- | --- |
| 320–599 CSS px | Compact context header, bottom dock or task tabs, overflow drawer; safe area | Records become complete named rows/cards; selected detail becomes a separate task view or frontmost sheet |
| 600–1023 px | Collapsible rail or sidebar sheet, compact toolbar | One main column; inspector overlays or follows the selected record; keep keyboard order |
| 1024–1599 px | Persistent sidebar and content pane | Optional contextual inspector; bounded line lengths, high-density data when useful |
| 1600+ px | Constrained content width with optional extra inspector | Do not stretch tables and copy indefinitely just because there is room |

Use **content/container constraints and real task affordances**, not just width breakpoints. Include 200%/400% zoom, large labels, localisation, text-spacing overrides, reduced transparency/motion, forced colours and keyboard-only paths. Preserve control identity and action semantics across device layouts.

## Material and design-smell gates

- Apply the **actual shared Quantive WebGPU provider** to intended controls and navigation, using the existing `data-liquid-glass` / exclusion conventions and solid fallback. Avoid independently implementing liquid-glass shaders or blur-only facsimiles inside production layouts.
- Dense tables, forms and long text use readable content surfaces. Glass must not compete with meaning; it needs actual composited contrast testing and deterministic fallback.
- Reject repetitive unlabelled KPI grids, visually impressive but empty boxes/arrows, invented scorecards without data/source, headings restating the control, meaningless status badges, seven competing hero cards and mobile pages made by horizontally scrolling the desktop.
- A custom cursor, shader or animation must not take over native text selection, focus, hit targets or scroll. Motion settles, respects system choices, and never conveys essential state only through colour or glow.
- Prefer one dominant task and evidence-rich work collection over a fake universal 'Overview' with equal-weight placeholder cards.
- Require non-artificial microcopy: the selected entity, why it matters, what action the user can take and the confirmed result.

## UWE/information-architecture baseline

**Content model:** `Principal` ↔ `Membership(role)` ↔ `Organisation` → `Project` → `Release` → `ReviewItem` → `ReviewDecision`; principal-scoped `Profile`, `Session`, `NotificationPreference`; tenant-scoped `Billing`, `AuditEvent`. Relations and server constraints require actual domain modelling before code generation.

**Navigation model:** app context → selected workspace → operations/projects/releases/people/workspace settings; independent avatar → personal account. The selected record opens its detail and bounded action. Mobile dock reduces primary routes without removing reachable destinations.

**Presentation model:** shell context + primary work surface + conditional inspector; on mobile, a compact context + one task + task navigation. A material layer floats only where it improves control location.

**Process model:** choose organisation → membership checked → selected context reloaded → choose review item → evidence inspected → permitted review proposed → server accepts/rejects → queue and audit reflect the actual outcome. Model pending, stale, denied and recovery branches, not just the happy path.

## Implementation order and quality gates

1. **Foundation:** exact navigation/identity data models; a responsive shell using actual UI SDK controls and provider; compile, keyboard, mobile and agent-discovery checks.
2. **Tenant boundary:** real workspace switcher and membership/role model with one shared authorisation path; two-tab and stale-request tests.
3. **Settings:** account profile/security/sessions/notifications plus organisation members/billing/audit, with permission and form lifecycle.
4. **Data workflows:** task-first queue, selection, filter, command palette, detail/action and responsive collections.
5. **Templates:** operations, content studio, customer portal, field workflow; each has a task story, UWE views, meaningful fixtures and device matrix.
6. **Review:** update package manifest, recipe registry, agent contracts, source licences and `glass:agent-check` / `glass:verify`; production browser tests for rendered GPU pixels, keyboard, agent accepted result and mobile. Human approval is **separate**.

## Implemented application foundation and evidence boundary

The source baseline is the React package and gallery composition described above.

**Current implementation:**

- Reusable package exports at `@quantitative-hci/liquid-glass/layouts`: `LiquidAppShell`, `LiquidAppRail`, `LiquidAppWorkarea`, `LiquidAppHeader`, `LiquidAppContent`, `LiquidAppInspector`, `LiquidAppDock`, `LiquidAppNavigation`, and `LiquidWorkspaceSwitcher`; import the companion `@quantitative-hci/liquid-glass/layouts.css`.
- An actual Vercel UI SDK composition (`@ui-sdk/react` Button/Menu/Field/Input/Tabs/SegmentedControl/Switch/Dialog), using the gallery's real `LiquidGlassProvider`, Manrope/Fraunces font presets and Quantive Isometric/Line icon set.
- Task-first gallery view: `?collection=layouts` on the existing Quantive gallery. It demonstrates review work, organisational switching, person vs organisation settings, mobile detail, denied viewer operations, search/filter and recoverable states.
- Explicit local state model in `docs/hci/examples/liquid-glass/src/layouts-state.ts` and tests in `tests/test_app_layout_state.mjs` and `tests/glass_layouts_contract.py`.
- [Conceptual model and attention budget](../models/app-layout-conceptual-attention.md): labels, menus, task hierarchy, state invariants and what to measure.

**Verification gate:** record the matching source commit and results of `npm run glass:agent-check`, `npm run glass:verify` and `python3 tests/test_glass_browser.py` against its production preview. The layout browser contract is `layouts_real_sdk_responsive_tenant_and_state`; screenshots must come from the actual React gallery. This document describes the required evidence and does not certify a particular run. Screen-reader/zoom evaluation and human HCI review need their own recorded scope and findings.

The fixture has no production authentication, persistence, server tenancy, tenant revocation or payments. Package regions and SDK navigation are reusable code; product integration supplies those services. Keep status **Unvalidated** until the separate human review is recorded.
