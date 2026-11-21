# Kit customization: models and evaluation

**Decision:** let someone select a font set and icon style while trying real Liquid Glass components, then reuse the kit in a project.

**Status:** this document defines the interaction contract and evaluation plan. Attach the implementing PR's browser evidence before reporting a check as passed. Human recognition, reading and preference outcomes remain unmeasured until a study records them.

The [interface foundations](../standards/interface-foundations.md) explain the reusable method. The [material standard](../standards/liquid-glass.md) supplies the renderer and component requirements.

## Task and success

**Representative task:** “Choose an appearance you would use for an internal project. Try it on a form and its dialog, check that your choice remains after reopening the page, and obtain the starter.”

The participant begins at the overview with a fresh preference state. Success means they can identify **Font set** and **Icon style**, apply a combination, continue using the form, return to the same combination after reload, and obtain the starter. **Copy starter** must include the current font and icon selections.

For an automated state-retention check, enter a project name, select a workspace tab and set an input value before changing the visual options. Those values must remain unchanged. A visual preference must not remount the active specimen or perform a task action.

## Content model

| Object | Identity and values | Relationship or rule |
| --- | --- | --- |
| Component family | Stable manifest ID and label | Selecting it mounts the genuine SDK specimen. The overview is an additional destination. |
| Specimen state | Current form values, selected view and open task | Owned by the specimen; appearance changes preserve it. |
| Font set | `studio`, `editorial`, `system` | Studio uses Manrope; Editorial adds Fraunces headings; System uses native fonts. The choice includes top-layer popups. |
| Icon style | `isometric`, `line` | Selects isometric or line presentation without changing the control's meaning. |
| Appearance preferences | Font set, icon style, material and motion choices | Stored for this app; invalid or unavailable storage returns usable defaults. |
| Starter | Copyable source with its required imports | Uses the same shared package and current font/icon selections. |

The component manifest owns catalogue identity. The shared package owns presentation choices. Local preferences select among those choices; the operating system can still impose forced colours, and system motion/transparency remain respected unless the supported explicit app choice applies.

## Navigation and presentation model

| Surface | What stays visible | Reachable actions | Retained context |
| --- | --- | --- | --- |
| Catalogue and overview | Current component, search and primary controls | Search/select a family, open Material settings, copy starter | Component selection and its in-progress values. |
| Material settings | Named visual choices and current selections | Change typography/icons/material, reset the documented scope, Done | Active specimen and focus return destination. |
| A choice popup | Options and current value | Arrow-key selection, Enter, Escape | The settings surface remains the parent context. |
| A component dialog | Its task title, fields and final action | Submit, correct an error, cancel | Its control semantics and task state use the same visual preset. |

Keep presentation choices together in Material settings. Use labels that describe what changes. An image preview may help distinguish styles; the text label and selected state remain sufficient. Restrict a reset action to the settings its label promises. The catalogue stays focused on the UI kit rather than exposing model calculations or renderer diagnostics.

The UWE presentation view assigns the setting controls and their labels to the settings surface; it does not make typography a separate navigation destination. The [UWE navigation view](https://uwe.pst.ifi.lmu.de/teachingTutorialNavigation.html) allows navigable units within a page, which fits these nested popup contexts.

## Interaction contract

| Event | Result | Recovery or constraint |
| --- | --- | --- |
| First visit | Studio (`fontSet="studio"`) and Isometric (`iconSet="isometric"`) apply | System-font and line-icon alternatives remain available. |
| Choose a font or icon style | The whole kit adopts the choice; control values and action names remain stable | Keep the chooser operable while fonts load or geometry changes. |
| Font unavailable | A readable fallback renders the same content | Do not hide labels or block the task while waiting. Record the actual loaded face when measuring. |
| Close settings | Current choices remain applied | Restore focus through the SDK's normal popup behaviour. |
| Reload | Valid `qg-kit-font` and `qg-kit-icons` preferences are restored | Malformed data or blocked storage uses defaults without breaking the interface. |
| Forced colours | System-colour controls and simple icons remain clear | Decorative transparency and 3D shading cannot override this mode. |
| Keyboard or agent chooses an option | The same callback updates the same preference | Query current SDK choices; do not create a separate mutation route. |
| Rapidly choose another option | The latest choice wins and surfaces align with the final layout | Earlier font work must not restore an obsolete selection. |

## Evidence to collect

Treat the browser matrix as a set of checks, not a population study.

| Check | Setup | Pass condition |
| --- | --- | --- |
| Default and coverage | Fresh storage, each shipped font set and both icon styles | Defaults are declared; every supported choice applies to overview, real specimen and top-layer popup. |
| State retention | Change presentation after entering data and selecting a view | Values, current family and stable accessible action names are unchanged. |
| Persistence and recovery | Reload valid choices; then use malformed and unavailable storage | Valid choices return; unsupported data gives usable defaults without uncaught errors. |
| Input equivalence | Pointer, keyboard and real SDK agent actions | Each input reaches the intended selected value and rendered state. |
| Responsive text | Narrow viewport, long labels, delayed font and text-spacing overrides | No lost controls, clipped essential labels or page-level horizontal overflow. |
| Icon semantics | Isometric, line and forced-colour modes | Labels and selected/error cues remain meaningful; decoration is absent from the accessibility tree. |
| Renderer lifecycle | Font/style change during a popup, then no further input | Surface bounds match final control bounds; the kit settles to idle and does not capture the backdrop every animation frame. |
| Starter accuracy | Copy starter after selecting Editorial and Line | Source is usable and includes `fontSet="editorial"` and `iconSet="line"`. |

The automated suite establishes observed control and rendering behaviour in its recorded environments. It does not establish that a new font or isometric icon is faster to recognise.

## Compare visual options with people

Start with the same content and tasks. Compare two font sets with icons held constant, or two icon styles with the font held constant. Keep the material and layout fixed unless the combined design is the stated experimental comparison. Counterbalance order and use equivalent task instances.

Record first-action correctness, final task success, wrong selections, recovery actions and task time under a predefined timeout policy. Ask about comfort and visual preference after the task. Keep failures in the denominator and inspect whether a preferred style causes more errors. Use task-relevant participants and device/input cohorts; decide sample size from the precision needed rather than treating a fixed small number as proof.

Use the existing models where they answer the question:

- **`affordance`:** correct first actions divided by all eligible attempts, including no action by the time limit.
- **`optical-centre`:** inspect icon balance at shipped sizes; validate a proposed offset visually rather than treating the geometric centre as ideal.
- **`x-height`, `leading`, `tracking`, `line-length`:** describe the rendered font roles alongside reading accuracy and completion time.
- **`progressive-disclosure`:** compare basic component use with advanced customization; use an observed task mix or a stated sensitivity range.

Follow the [comparison protocol](evaluation-protocol.md) for independent units, predefined worthwhile differences and uncertainty. Keep raw observations, exact build IDs and the decision together. Report the selected preset as a design default until human evidence supports a stronger usability claim.
