# Quantive interface foundations

**Default:** use the shared Liquid Glass UI kit for new high-fidelity internal interfaces without an established product design system. `LiquidGlassProvider` defaults to `fontSet="studio"` and `iconSet="isometric"`. Retain its selectable alternatives and preserve real UI SDK behaviour. The [material standard](liquid-glass.md) defines rendering, motion and fallbacks.

The design goal is a recognisable interface that helps someone complete a real task confidently. Model the task and its information first; use glass, typography, icons and motion to make that structure visible. The [kit customization model](../models/kit-customization-model.md) demonstrates this approach on the working kit.

## Model the decisions that affect the task

Use these views together. A small feature can express them in one short document; reuse established domain and navigation models instead of redrawing them. UWE separates content, navigation, presentation and processes so these decisions can be examined independently.[1][2][7]

| View | Question it answers | Design decision it should produce |
| --- | --- | --- |
| Task and context | Who is trying to achieve what, with which device, knowledge and constraints? | A representative goal, starting state, observable success condition and important failure case. |
| Domain and content | Which objects, values and relationships must the person understand? | Stable nouns, meaningful groupings, essential information and valid actions. |
| Navigation | Where can someone go, and what context survives the move? | Entry points, destinations, search, return paths, selected-object retention and permissions. |
| Presentation | Which information and actions belong together on each surface? | Reading order, hierarchy, control placement, density, type roles, icon roles and glass boundaries. |
| Interaction and state | What happens after input, delay, rejection, cancellation or interruption? | Shared callbacks, visible feedback, recoverable errors, keyboard/focus rules and complete state transitions. |
| Evaluation | Which observation would justify changing the design? | A relevant outcome, matched comparison, constraints that must continue to pass, and reproducible evidence. |

Keep task, object and action names consistent in visible copy, accessible names and agent snapshots. For example, **Collection** names the object, **New collection** starts creation, and **Create collection** submits it. A change of icon or typeface must not change the action's meaning or agent identity.

Follow the [content composition standard](content-composition.md) for optional supporting copy, action labels and state/recovery messages. A heading does not require a subtitle; add context only when it helps someone understand a constraint, consequence or next step.

## Give each visual layer a job

### Glass establishes surfaces and depth

Use glass for navigation, controls and compact groups where boundaries help people act. Give long explanations, dense tables and critical values a stable, readable background. Measure contrast against the final composited scene, including selected, focused and invalid states. Refraction samples the supplied decorative backdrop; it does not capture arbitrary live foreground content.

Motion communicates focus, selection, activation or the relationship between a trigger and its popup. Keep text and hit regions steady, honour effective motion preferences, and allow another action while a decorative response settles. Animation should not delay access to a ready control.

### Typography establishes hierarchy

The selected font set assigns roles through shared tokens. Preserve these roles when changing the set:

| Role | Use | Check in the actual UI |
| --- | --- | --- |
| Interface | Buttons, fields, navigation, values and descriptions | Labels remain recognisable, controls fit, and common characters are distinguishable. |
| Display | Page titles and short section headings | Hierarchy remains clear at narrow widths and with long realistic titles. |
| Numeric or code | Comparable values, identifiers and code examples | Decimal anchors and changing values stay stable; use tabular numerals where alignment matters. |

The **Font set** selector offers these presets:

| Preset | Provider value | Type roles |
| --- | --- | --- |
| Studio — Manrope | `studio` | Manrope for interface text and headings; the default. |
| Editorial — Fraunces | `editorial` | Fraunces for headings, Manrope for interface text. |
| System | `system` | The native system font stack. |

Keep a system-font option available. Load bundled, licensed fonts locally; record their source, version and licence. A blocked or delayed font must leave readable text and operable controls. Set the typeface once through the shared theme, including native top-layer popups. Avoid per-component font overrides that make a preset only partly apply.

Changing a font can alter wrapping and control geometry. Re-measure glass surfaces after the change and after font loading. Verify realistic long labels, zoom, narrow layouts and the text-spacing override in WCAG 2.2: 1.5× line height, 2× paragraph spacing, 0.12em letter spacing and 0.16em word spacing together, with no content or functionality lost. These are override test values, not compulsory authored typography.[3]

### Icons identify objects and reinforce actions

Use the custom isometric set for recognisable objects and section identity: files, collections, components and similar concepts. Keep perspective, light direction, colour accents, depth and optical weight consistent. The icon is decoration beside the label; its silhouette should still make sense at its shipped size.

Keep conventional small controls, such as close, chevron, check and disclosure indicators, visually simple. The **Icon style** selector offers **Isometric** (`iconSet="isometric"`, the default) and **Line** (`iconSet="line"`). Use line icons when forced colours remove the visual treatment. Dense views should prefer the simpler glyph through a documented component choice. Switching icon style must preserve layout, accessible names, hit targets and state cues.

Image generation establishes the visual concept; this set translates that art direction into simplified SVG geometry. Document that redraw rather than claiming an automatic trace. Production SVG assets must contain real vector geometry, with a stable viewBox, no scripts or external image dependencies, and no embedded raster pretending to be an SVG conversion. Decorative SVGs are hidden from assistive technology; the containing live control carries its name.

Do not require people to infer critical status from colour, shine or perspective alone. Meaningful icons and control-state cues need the applicable non-text contrast; WCAG 2.2 specifies 3:1 against adjacent colours for the relevant visual information.[4]

### Preferences belong to the app

The demo validates and stores the selected font and icon IDs under `qg-kit-font` and `qg-kit-icons`. Missing or invalid values return to Studio and Isometric. A storage error must leave the current interface usable. **Copy starter** includes the current selected font and icon presets so the copied code reproduces that choice. A forced-colour override changes the effective rendering while retaining the requested preference for normal display.

## Measure what the design is supposed to improve

Use the existing [20-model catalogue](../models/interface-design-models.md) and [comparison protocol](../models/evaluation-protocol.md). Select the models relevant to the decision. A better geometric proxy is useful diagnostic evidence; a claim about easier recognition or faster work needs observations of that outcome.

| Decision | Diagnostic or implementation evidence | Human outcome to investigate |
| --- | --- | --- |
| Choose a font set | Loaded face, wrapping, `x-height`, `leading`, `tracking`, `line-length`, `tabular-numbers`; no clipping or unusable controls under overrides | Reading or value-recognition accuracy, completion time, reported comfort. |
| Choose isometric or line icons | `optical-centre`, silhouette at actual size, unchanged labels/hit regions, meaningful-state contrast | Correct first action, object recognition, mistakes and preference. |
| Place or enlarge an action | Effective hit rectangle, `touch-target`, `safe-area`, occlusion and target drift | Misses, corrections and observed pointing time on the intended device. |
| Group settings or hide advanced options | Reachable paths, focus order, `progressive-disclosure`, basic and advanced completion coverage | Discoverability and task time for both groups, weighted by a justified task mix. |
| Add responsive glass or motion | Actual changing pixels, matched canvas bounds, `origin-aware-animation`, `interruptible-animation`, final state, constant capture count during motion and eventual idle | Association of feedback with the action, errors, distraction and comfort. |

Fitts' model can compare pointing geometry using `log₂(1 + D/W)`. Predicted milliseconds require coefficients fitted to the relevant task/device; the repository's example coefficients are synthetic. Measure actual mistakes and timing before presenting a human speed gain. Review target-size requirements independently: WCAG 2.2 AA uses a 24×24 CSS-pixel minimum with defined exceptions. A generous touch target is a design choice above that minimum, not proof of conformance.[5]

For text, check the applicable 4.5:1 or large-text 3:1 contrast requirement against the composited background, without rounding a failing ratio upward. Record exceptions and actual states; a successful contrast sample does not establish full WCAG conformance.[6]

## Use a short handoff for each meaningful change

Add the following to the feature's existing issue, PR or model document:

1. **Task:** representative goal, starting state, success condition and important failure case.
2. **Decision:** affected model view, baseline, candidate and the reason for trying it.
3. **Evidence:** exact commit, scenario, content, viewport/device, input mode, preferences and measurement boundary.
4. **Result:** task correctness, relevant raw measurements, failed attempts and any unmeasured hypothesis.
5. **Next decision:** retain, revise, compare with users, or defer—with the reason.

Use the [before/after task record](../templates/task-comparison.md) when a change needs a comparison, and the [HCI scorecard](../templates/hci-scorecard.md) for observations and task-specific guardrails. The [article review example](../examples/article-review-evidence.md) shows how to plan this without fabricating participant data. Keep implementation checks, measured task outcomes and human review as separate evidence; do not convert subjective dimension ratings into a readiness total.

Choose a primary human outcome and a worthwhile difference before a study. Keep correctness, accessibility and recovery requirements visible even if the primary measure improves. Use fixed browser matrices as descriptive coverage; frames and rerenders from one session are not independent users. For human comparisons, counterbalance order, retain failed attempts, and follow the existing protocol's sampling and uncertainty guidance.

Run the kit's required build and browser contracts for implementation changes. Add checks for a new risk rather than copying every visual detail into tests. Store the compact model, raw evidence and result beside the feature. The selected theme is a reusable default; change it when the task and evidence justify a different treatment.

## Sources

1. [LMU UWE — Navigation Model](https://uwe.pst.ifi.lmu.de/teachingTutorialNavigation.html)
2. [LMU UWE — Presentation Model](https://uwe.pst.ifi.lmu.de/teachingTutorialPresentation.html)
3. [W3C — Understanding Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html)
4. [W3C — Understanding Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
5. [W3C — Understanding Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
6. [W3C — Understanding Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
7. [LMU — About UWE](https://uwe.pst.ifi.lmu.de/aboutUwe.html)
