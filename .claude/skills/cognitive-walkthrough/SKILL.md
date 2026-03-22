---
name: cognitive-walkthrough
description: Step through a task as a first-time user and identify where intent, discoverability, feedback, or interpretation will break down.
disable-model-invocation: true
---

Run a cognitive walkthrough for this task or flow:

$ARGUMENTS

Act like a plausible first-time user with only the cues available in the interface. Use the actual prototype and codebase context.

## Output
Write `docs/hci/cognitive-walkthrough.md` unless the user asked for another path.

## Required questions at every step
1. Will the user form the right goal here?
2. Will the user notice the correct action?
3. Will the user understand that the action leads toward the goal?
4. After acting, will the feedback make sense?

## Required format
For each step include:
- step number
- user goal
- visible cues
- likely action
- walkthrough answers for Q1 to Q4
- breakdowns / confusion risks
- recommendation

## Extra checks
Also flag:
- hidden prerequisites
- unclear affordances
- weak or missing feedback
- misleading labels
- dead ends
- unclear recovery path

## Synthesis
End with:
- steps most likely to fail
- reasons first-time users may hesitate
- design changes most likely to improve task completion
