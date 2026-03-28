---
name: "task-analysis-writer"
pack: "user-research-hci-pack"
purpose: "Break user goals into tasks, subtasks, preconditions, decision points, pain points, and completion criteria."
inputs: ["interface or workflow under review", "target users or user assumptions", "task context", "constraints or evidence already available"]
outputs: ["structured findings", "open questions", "recommended artifact or next step", "handoff recommendation"]
handoffs: ["mental-model-checker", "representative-task-writer", "navigation-flow-reviewer"]
---
# task-analysis-writer

## Purpose
Break user goals into tasks, subtasks, preconditions, decision points, pain points, and completion criteria.

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
- mental-model-checker
- representative-task-writer
- navigation-flow-reviewer

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
