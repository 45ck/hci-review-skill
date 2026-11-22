---
name: aesthetic-usability-review
description: Review visual polish while separating apparent usability from demonstrated task performance. Use for interfaces that look unfinished, inconsistent typography or icons, requests to make an app feel better designed, or polished screens whose actual usability is uncertain.
---

# Aesthetic Usability Review

Improve visual coherence using the existing design system, then evaluate task behavior separately. Do not prescribe a new visual style or equate an attractive screenshot with a working interface.

## Work from evidence

State the task, available views/states, and whether the evidence is a screenshot, design file, source code, interaction trace, or executed interface. Read the current component library, tokens, fonts, custom icons, and global motion/theme controls before recommending changes.

## Review

1. Inspect hierarchy, alignment, spacing rhythm, readable typography, grouping, icon consistency, contrast, and density. Tie each finding to an identifiable element or relationship rather than adjectives such as modern, premium, or ugly.
2. Identify unnecessary explanatory copy, repeated subtitles, decoration that competes with the task, and excessive container nesting. Retain labels or guidance needed for understanding. A sparse interface and a dense expert interface can each be appropriate.
3. Propose the smallest coherent correction with existing tokens and variants. Do not replace custom icons with a generic set, introduce per-screen font stacks, or make glass/gradients/motion mandatory. Respect theme and motion preferences.
4. Run a separate functional pass where evidence permits: task completion, keyboard/focus behavior, error and loading states, data persistence, responsive overflow, and interaction-induced movement. Do not claim performance or behavior from static images; report missing evidence explicitly.
5. When asked to implement, compare the same viewport, theme, state, and data before/after. Verify that the visual change preserves important actions and behavior. Use existing tests for relevant risks; do not build a scoring engine or a browser suite solely to decorate a review.
6. For claims about perceived ease, trust, or satisfaction, propose a short human comparison. Keep perception ratings separate from completion, errors, and time measurements. Account for familiarity and order effects when interpreting a comparison.

## Return

Write `docs/hci/aesthetic-usability-review.md` when requested, or return:

| Element and evidence | Visual-coherence finding | Proposed design-system change | Functional check and result | Uncertainty |
| --- | --- | --- | --- | --- |

Report visual findings and functional findings separately, with a small number of prioritized changes. Link matched screenshots when available. State no supported issue when appropriate. Mark work as proposed, implemented, or verified accurately; never fabricate a polish score or a user preference.

## Boundaries

- The aesthetic-usability effect concerns perceived or apparent usability; it does not establish that visual polish fixes task failures.
- Make functional blockers and accessibility failures visible even if the screen looks refined.
- Do not treat a particular aesthetic as universally better or change the design system without a task-based reason.
- Use `wireframe-critic` for structural layout work and `accessibility-precheck` for a broader accessibility pass.

## Sources

- [Kurosu and Kashimura (1995), Apparent Usability vs. Inherent Usability](https://chi1995.acm.org/proceedings/shortppr/mk_bdy.htm): original study distinguishes aesthetic judgments and apparent usability from inherent usability measures.
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/): evaluate relevant requirements independently of aesthetic preference.
