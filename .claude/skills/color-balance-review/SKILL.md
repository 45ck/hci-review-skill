---
name: color-balance-review
description: Review color hierarchy using the 60-30-10 design heuristic and independent accessibility checks. Use for competing accent colors, noisy palettes, unclear primary actions, theme inconsistencies, or color-balance requests involving light, dark, or glass interfaces.
---

# Color Balance Review

Use dominant, supporting, and accent roles to clarify the task. Treat 60-30-10 as a flexible composition guide, never an exact pixel quota, scientific law, or accessibility score.

## Work from evidence

Inspect existing theme tokens and a rendered view when available. State the task, theme, viewport, state, and evidence limitations. A token list can establish defined colors; it cannot establish their rendered area or visual balance. Do not invent palette measurements from an unavailable screenshot.

## Review

1. Map current tokens to base surfaces, structural surfaces/text, task emphasis, and semantic states. Keep success, warning, error, focus, disabled, and data-visualization roles explicit; they need not fit three literal colors.
2. Inspect the task's local hierarchy. Identify unnecessary accent competition, emphasis on decorative elements, inconsistent interactive colors, and a primary action lost among peers. Preserve brand and global theme configuration.
3. Propose the smallest token or component-variant adjustment. Do not hardcode new per-page colors or demand that a brand's primary token cover 60% of the viewport. Keep meaningful status/data distinctions and useful links visible.
4. Check contrast separately from composition using rendered foreground/background values and the applicable WCAG criterion. Normal text generally requires 4.5:1 and qualifying large text 3:1 under SC 1.4.3, subject to its exceptions. Inspect relevant non-text UI contrast under SC 1.4.11. Do not infer compliance from palette proportions.
5. Check light/dark themes, relevant hover/focus/selected/error states, and representative small/large viewports. For transparent or glass surfaces, check the effective background over representative content and provide a stable fallback when contrast cannot be maintained. Inspect a forced-colors mode when available. Pair meaningful colors with visible labels, shapes, or another sufficient cue; screen-reader-only text does not help a sighted user distinguish hues.
6. When asked to implement, reuse the theme system. Capture matched before/after states and report real contrast measurements with their method. Any optional area estimate must name its region, theme, image exclusions, and method, and stay descriptive rather than pass/fail.

## Return

Write `docs/hci/color-balance-review.md` when requested, or return:

| Element/state | Current role and token | Observed hierarchy or contrast issue | Proposed role/token change | Evidence after change | Remaining checks |
| --- | --- | --- | --- | --- | --- |

Separate visual hierarchy judgments from measured contrast failures. Include preserved semantic colors, evidence limitations, and checks actually run. If no supported problem is found, say so. A screenshot-only review must not claim all interaction states were verified.

## Sources

- [Vision Australia, 60-30-10 design guidance](https://www.visionaustralia.org/business-consulting/digital-access/Creating-accessible-digital-colour-palettes-60-30-10-design-rule): expert composition guidance, not experimental proof of an optimum.
- [W3C SC 1.4.3: text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [SC 1.4.11: non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), and [SC 1.4.1: use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).
