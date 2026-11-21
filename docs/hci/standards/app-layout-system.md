# Quantive application layout system — architecture and decision record

**Date:** 21 November 2026  
**Status:** Design proposal / interactive offline concept. **Unvalidated** by human UI/UX review.  
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

## First-class layout recipes

1. **Operations console** — persistent workspace navigation on desktop; review queue or data collection with contextual detail; mobile top context, bottom navigation, drill-down detail. Prioritise decisions and recorded outcomes.
2. **Content studio** — navigation + central document/canvas + optionally docked properties, history and collaborator presence; mobile focuses on one editing operation at a time. Keep pan/zoom behaviour with the existing Quantive canvas.
3. **Customer portal** — clear current account, task status, documents, subscriptions, notifications, support and recovery; few navigation levels and no gratuitous administrative dashboard.
4. **Mobile/field workflow** — task list, capture/upload, offline/pending state, explicit synchronization, human confirmation and one-hand reachable primary actions.

Templates specify **regions, navigation, state, density and task affordances**, not hardcoded colours, fake metrics or domain copy. Use a single responsive design model rather than a mini desktop rendered on a phone.

## Proposed reusable composition inventory

| Family | Proposed names, not yet public exports | Required behaviour |
| --- | --- | --- |
| Shell | `AppShell`, `WorkspaceRail`, `TopBar`, `ContentRegion`, `ContextInspector`, `MobileDock` | Slot composition, responsive adaptation, current route, keyboard paths, focus, safe areas |
| Account | `AccountMenu`, `AccountSettings`, `SecuritySettings`, `SessionList` | Profile, security, notification and session flows; redaction for secrets; verified server changes |
| Organisations | `WorkspaceSwitcher`, `OrganisationProfile`, `MemberDirectory`, `InviteDialog`, `RoleMatrix` | Active organisation, identity vs membership separation, permissions and clear switches |
| Data/workflow | `DataCollection`, `RecordDetail`, `FilterBar`, `DecisionQueue`, `ReviewInspector`, `AuditTimeline` | Stable IDs, real tables/list transformations, editable review state, revision and error handling |
| Feedback | `CommandPalette`, `NotificationCenter`, `LoadingBoundary`, `ErrorRecovery`, `EmptyState` | Observable loading, no-result, error, pending, success, denial and recovery states |
| Administration | `BillingSettings`, `APIKeyManager`, `WebhookList`, `IntegrationManager`, `UsageView` | Sensitive action confirmation, masked keys, lifecycle, real usage units and sources |

Reuse the existing UI SDK `Dialog`, `Menu`, `Tabs`, `Popover`, `Field`, `Input`, `Button`, `Table` where documented by the **installed 0.1.0-beta.13** version. A composition can expose the genuine SDK children and need not invent its own `definePrimitive` if no new behaviour exists. Keep the existing `LiquidGlassProvider` and one host `createAgent` bridge.

## Explicit app layout contract

A product provides:

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

**Decision:** keep the first functional UI prototype as an offline, CSS-only layout study until it is translated into compiled React/SDK compositions with a real provider and runtime tests. An offline screenshot is not a released component and must never be labelled a working security boundary.
