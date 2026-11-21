# Application layout — conceptual model, state and attention budget

**Scope:** Quantive reusable application compositions. **Status:** design hypothesis with an instrumentable gallery fixture, not validated usability research.  
**Implementation:** `packages/liquid-glass/src/layouts/shell.tsx`, `docs/hci/examples/liquid-glass/src/layouts-showcase.tsx`, `layouts-state.ts`.  
**Standard:** [App layout system](../standards/app-layout-system.md).

## What the person thinks they are doing

They are not "using a dashboard." They are trying to complete one job. In the current fictional example the job is **decide whether a change has been reviewed**. The UI must answer four questions in the order the person needs them:

| User question | UI answer | Avoid |
| --- | --- | --- |
| Where am I working? | Selected organisation beside the app header | Two different organisation labels without a clear active context |
| What needs me? | The review list with specific titles, contextual project and one count | A colourful row of unlabeled KPIs |
| What am I deciding? | Selected review, its evidence and status | A detached inspector without the source record |
| What happened after my action? | Record leaves the open queue, explicit local confirmation and Undo | A toast saying "Success!" without an observable state change |

The user's **account** (person, security, sessions, notifications) exists independently of an **organisation** (members, projects, audit, billing). One belongs in the avatar menu; the other belongs under selected workspace navigation. A workspace switch invalidates the old workspace's selected records, project filters and in-flight detail view.

## Navigation and disclosure

| Scope | Desktop | Phone | Why |
| --- | --- | --- | --- |
| Organisation | Top-left workspace switcher | Same switcher remains visible | The context of every record and permission stays identifiable |
| Main sections | Persistent, labelled rail | Reviews / Projects + More | Most-common tasks are one tap; secondary destinations remain reachable |
| Selected review | Adjacent inspector when it fits | Full task surface with explicit Back | Inspect and decide without microscopic copy or a modal behind the keyboard |
| Personal account | Avatar menu | Avatar menu | Predictable escape hatch, separated from organisation settings |
| Record-specific actions | Detail toolbar and bottom action | Same controls in task view | Actions remain close to their object, not in a global overflow |
| Command search | Search trigger, keyboard shortcut | Search trigger | Accelerate repeat use without forcing recall for first-time users |

Avoid nested dropdowns more than necessary. Every visible menu item is an action or destination, not a decorative grouping. The primary task must remain available without using a global "More" menu.

## Presentation rules: remove subtitles by default

A visible page heading communicates **where** the person is. Add supporting copy only when it answers a new question that the title, control label, or data cannot answer. Do not render an eyebrow plus title plus paraphrased subtitle as default furniture.

- Preferred: **Reviews** with a small, correctly calculated **3 need attention** value, then search/filter and the actual review rows.
- Avoid: **Welcome to your review dashboard** / "Manage and streamline your reviews" / "Your central hub for collaboration." None adds an action, constraint or fact.
- On empty state, explain specifically **why this is empty** (no records vs no search results vs no permission) and offer an appropriate recovery.
- On permission denial, show the current capability boundary and a legitimate next step. Do not hide data after user effort without a reason.
- Title case, labels and menu names must match the domain. Use plain verbs like "Mark reviewed," not "Complete workflow orchestration."

## User-visible state chart

| Event | Precondition | State change | User-visible evidence | Forbidden shortcut |
| --- | --- | --- | --- | --- |
| Select workspace | Item available in approved list | Atomic reset of space, current route, selection, filters, preview scenario | Header changes, record IDs come from the new workspace | Keep prior tenant's detail or optimistic mutation |
| Inspect review | Record exists in current filtered set | Selection and detail view open | Same title and ID in row/detail | Open a detached empty inspector |
| Mark reviewed | Host accepts, role allows, not already done | Move out of open collection; record state changed | Queue count changes, specific confirmation, Undo | Animate success without accepted state change |
| Open account | Any signed-in principal | Personal account route | Name, notification/security sections; no organisation switch side effect | Mix tenant billing with personal security |
| API failure | Fetch/mutation unsuccessful | Preserve prior confirmed data, show error | Retry with specific failure | Clear form or silently complete action |
| Viewer tries review | Organisation grants view-only | No mutation | Action disabled and reason visible | Treat disabled UI as server-side authorisation |
| Phone detail | Record selected | Full task surface; Back returns to list | Title/evidence/action readable without horizontal scrolling | Shrink 3-column desktop inspector into a card |

The demo uses in-memory fixtures and a tiny state reducer; real integrations need server identity, membership, resource scoping, stale request invalidation, audit, retry and multiple-tab handling.

## HCI/decision checks

**First-use tasks** (test with the actual target user, not agents alone): identify selected organisation; locate one review; understand its evidence; determine whether the current user may approve; return to queue; change organisation; find own account settings; recover from unavailable records.

**Measure, don't assume:**

- Correct first action and time-to-first-correct-review; observe mistakes and corrections;
- Correct person-vs-organisation settings classification;
- Cross-workspace contamination tests in data, view selection, browser cache and async responses;
- Repeated unnecessary navigation/reopens/backtracks during the primary task;
- Mobile fit/target accessibility at 320/390/768 CSS px, keyboard focus and zoom; preserve text spacing and reduce-motion preferences;
- Agent discovery, supported actions, postconditions and permission/cancellation refusals through one SDK bridge;
- Actual WebGPU control rectangles and reduced-transparency/forced-colours fallbacks, not a synthetic CSS blur.

Do **not** claim a time saving or mental-load reduction without human task evidence. The current review panel and layout are custom **Unvalidated** components.

## Gate before promotion

A correct production implementation requires: compiled React package exports; actual Vercel UI SDK controls; Quantive's Manrope/Fraunces typography, Isometric/Line icons, theme and WebGPU provider; testable mobile transformation; backend tenancy guarantees and cancellation; meaningful empty/error/pending/recovery paths; real agent inspection/actions; and recorded human UI/UX review. No decorative subtitle or card is accepted merely to fill unused space.
