---
name: von-restorff-review
description: Review visual distinctiveness using the von Restorff or isolation effect. Use for competing emphasis, invisible primary actions, pricing-card highlights, status salience, or interfaces where everything looks equally important.
---

# Von Restorff Review

Make a task-relevant item distinguishable within its local peer group. Use the isolation effect to form a review question, not to predict gaze, clicks, memory, or conversion without evidence.

## Work from evidence

State the user's task, the peer group, and available rendered/code/interaction evidence. Name the important item and explain whose goal its emphasis serves. Treat a visual priority judgment as reviewer inference unless user observations support it.

## Review

1. Identify comparable items: actions in a toolbar, plans in a pricing comparison, statuses in a queue, or steps in a task. Distinguish the primary task action from a business upsell. A screen can contain several unrelated groups with different priorities.
2. Inspect how peers differ in weight, shape, position, wording, spacing, color, and motion. Note repeated high-emphasis treatments, decorative competition, or a genuinely important item that has no meaningful distinction.
3. Check whether distinction communicates truth. Do not invent popularity labels, fabricate urgency, preselect paid upgrades, hide cancellation, or emphasize deletion as the routine path. Important warnings may appropriately compete with the usual primary action.
4. Propose a restrained change through existing component variants, typography, spacing, or icon treatments. Reuse the custom icon family and global motion settings. Preserve semantic status meaning. Provide a visible non-color cue and the appropriate accessible name/state; do not rely solely on hue or animation.
5. Check normal, focus, selected, disabled, loading, and error states where relevant. Ensure emphasis does not change hit targets, introduce layout shifts, steal focus, or obscure other valid actions. Check small screens and reduced motion if the design uses movement.
6. When asked to implement, compare the same task and state before/after. Verify interaction and access paths separately. To claim better first-click accuracy, noticeability, recall, or completion, propose a matching human measure rather than substituting the agent's visual judgment.

## Return

Write `docs/hci/von-restorff-review.md` when requested, or return:

| Peer group and task | Intended priority | Observed distinction and evidence | User benefit or conflict | Proposed change | Verification |
| --- | --- | --- | --- | --- | --- |

Prioritize supported problems and explain any deliberate multiple emphases. Include no-change decisions, uncertainty, and actual checks. Separate a recommended treatment from a verified implementation.

## Boundaries

- The original isolation research concerns memory for items among similar material. It does not establish that a brightly colored CTA will increase conversion.
- Do not optimize distinction at the expense of understanding, consent, or recovery.
- Use `color-balance-review` for palette-wide roles and contrast; use this skill for the relative priority within a peer group.

## Sources

- [Von Restorff (1933), original study and abstract](https://link.springer.com/article/10.1007/BF02409636).
- [W3C SC 1.4.1: use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).
