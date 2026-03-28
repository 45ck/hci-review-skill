---
name: "field-study-planner"
pack: "user-research-hci-pack"
purpose: "Plan contextual or field-based observation to understand real-world workflows, interruptions, environments, and constraints."
inputs: ["interface or workflow under review", "target users or user assumptions", "task context", "constraints or evidence already available"]
outputs: ["structured findings", "open questions", "recommended artifact or next step", "handoff recommendation"]
handoffs: ["persona-synthesizer", "task-analysis-writer", "usability-test-planner"]
---
# field-study-planner

## Purpose
Plan contextual or field-based observation to understand real-world workflows, interruptions, environments, and constraints.

## Trigger this skill when
- You need to understand users, tasks, or interaction problems before building or changing an interface.
- A team is making UX claims without enough structure, evidence, or critique.
- Prototype, flow, or usability work needs a repeatable checklist rather than ad hoc opinions.

## Expected inputs
- interface or workflow under review
- target users or user assumptions
- task context
- constraints or evidence already available

## Deliverables
- structured findings
- open questions
- recommended artifact or next step
- handoff recommendation

## Operating procedure
1. Clarify the user, task, and design question this skill is meant to answer.
2. Separate observed facts, inferred assumptions, and speculative hypotheses.
3. Produce concrete findings tied to user goals and task completion.
4. Surface uncertainty explicitly instead of masking it with confident UX language.
5. Recommend the next most useful research, design, or evaluation step.

## Quality gates
- Findings are tied to a user goal or task, not generic taste.
- Assumptions are marked as assumptions.
- Recommendations are concrete enough to act on.
- Accessibility, clarity, and cognitive load are not ignored when relevant.

## Handoff targets
- persona-synthesizer
- task-analysis-writer
- usability-test-planner

## Output style
- Be concrete and structured.
- Prefer task-based critique over aesthetic vagueness.
- Separate evidence, inference, and recommendation.
- Use severity or priority when useful.

## Failure modes to avoid
- Do not confuse stakeholder preference with user evidence.
- Do not write generic UX advice detached from the scenario.
- Do not assume a persona is real evidence if it is only hypothesized.
- Do not recommend high-fidelity work when the underlying problem is still unclear.

## Minimum output skeleton
```md
## Summary
## Findings
## Evidence vs assumptions
## Open questions
## Recommended next skill
```
