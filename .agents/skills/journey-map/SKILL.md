---
name: journey-map
description: Map the key user journeys for a prototype, including happy paths, edge cases, decision points, and recovery flows.
disable-model-invocation: true
---

Map the key user journeys for this scope:

$ARGUMENTS

Use ultrathink. Work from the current prototype, routes, components, docs, screenshots, and any existing flows. Infer missing pieces conservatively.

## Output
Write `docs/hci/user-journeys.md` unless the user asked for another path.
Create the directory if it does not exist.

## Required process
1. Identify the 3 to 7 most important journeys.
2. Prioritize first-time use, core task completion, edit/undo, failure recovery, and returning user behavior.
3. For each journey, document:
   - goal
   - trigger / entry point
   - steps
   - decision points
   - alternate branches
   - errors and recovery
   - exit state
   - likely confusion points
4. Add Mermaid flowcharts for the most important journeys.
5. Summarize cross-journey friction themes.

## Output structure
For each journey use:
- Journey name
- User goal
- Preconditions
- Main flow
- Alternative flow(s)
- Error path(s)
- Exit state
- Confusion risks
- Design recommendation(s)

## Synthesis
End with:
- journeys most likely to fail for first-time users
- shared friction points across multiple journeys
- dead ends and missing recovery paths
- design changes with the highest impact on task completion

## Quality bar
- Keep the flow specific to the actual prototype.
- Focus on what the user must perceive and decide, not just backend events.
- Flag hidden dependencies, missing feedback, dead ends, and branch explosions.

## Deliverable style
- Clear headings
- Markdown tables
- Mermaid diagrams where useful
- Direct language
- No filler
