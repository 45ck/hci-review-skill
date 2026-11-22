---
name: hicks-law-review
description: Review choice complexity using Hick-Hyman law. Use for competing calls to action, overwhelming menus, noisy dashboards, long setup flows, ambiguous options, or requests to reduce decision burden without hiding essential actions.
---

# Hick's Law Review

Reduce avoidable uncertainty at a specific decision while preserving the actions users need. Reuse the current navigation, menu, search, and disclosure components.

## Work from evidence

State the task, decision point, audience expertise, viewport, and available screenshot/code/interaction evidence. Separate observed facts from an agent's prediction of difficulty. If probabilities or user timings are absent, report them as unknown.

## Review

1. Identify one decision: what must the user choose now? List only alternatives competing for that decision, not every link, icon, table row, or DOM node on the screen. Separate task actions from navigation, required recovery, and unrelated content.
2. Inspect labels and consequences. Find duplicate routes, unclear differences, several equally prominent primary actions, irrelevant choices, and missing information needed to decide. A large searchable catalogue is not automatically a defect.
3. Consider grouping, clearer labels, context-appropriate defaults, search/filtering, and progressive disclosure. Keep frequent expert actions reachable and preserve cancel, help, and recovery. Do not default consent, purchases, or destructive choices merely to reduce choice count.
4. Compare the entire task before and after the proposed change: discovery, decisions, navigation depth, keyboard operations, information available, and recovery. Exposing fewer buttons can add steps or conceal necessary actions.
5. If quantitative comparison helps, report the counted competing alternatives and assumptions. Use entropy `H = -sum(p_i * log2(p_i))` only with explicit probabilities; an equal-probability scenario gives `H = log2(n)`. Label this a model scenario, not measured cognitive load. Do not infer seconds or percentage speedups without task-specific fitted timing data. Do not mistake this entropy expression for every variant of the Hick-Hyman reaction-time model.
6. When implementation is requested, make the smallest change using existing components. Repeat the original task on relevant desktop/mobile and keyboard paths. Record whether secondary actions remain discoverable; recommend a bounded human comparison for any claim about decision time or completion.

## Return

Write `docs/hci/hicks-law-review.md` when requested, or return:

| Decision and task | Competing options and evidence | Source of uncertainty | Proposed change | Whole-task tradeoff | Verification |
| --- | --- | --- | --- | --- | --- |

Report important findings, retained necessary choices, assumptions, and checks actually performed. Use concrete labels and routes. If no choice problem is supported, report that outcome. Keep proposed changes separate from implemented results.

## Boundaries

- The original experiments concern choice reaction time under controlled conditions. Screen search, learned categories, unequal likelihoods, and expertise can change the task.
- Do not impose a universal maximum option count or one-button-per-screen rule.
- Do not turn a model calculation or lint result into proof of human usability.
- Use `information-architecture` when the underlying grouping/navigation model needs review, rather than expanding this into a second full IA audit.

## Sources

- [Hick (1952), On the Rate of Gain of Information](https://doi.org/10.1080/17470215208416600).
- [Hyman (1953), Stimulus information as a determinant of reaction time](https://pubmed.ncbi.nlm.nih.gov/13052851/).
