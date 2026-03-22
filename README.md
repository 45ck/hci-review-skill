# hci-review-skill

Structured HCI and UX prototype review skills for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) and [Codex CLI](https://github.com/openai/codex).

Most confusing prototypes happen when each screen is designed locally, but user journeys, terminology, states, and interaction patterns are never defined globally. These skills force you to treat the UI as a **system with rules** -- not a set of disconnected screens -- by running the same evaluation methods used in university-level HCI courses and professional usability practice.

Seven skills. Each one runs a specific evaluation method against your actual codebase, routes, components, and screenshots. No generic advice -- every finding is anchored to real files.

## Skills included

| Skill | Command | What it does |
|---|---|---|
| **Prototype HCI Pack** | `/prototype-hci-pack` | Full review pack. Runs all six methods below in one pass and writes a complete artifact set. |
| **Conceptual Model** | `/conceptual-model` | Define actors, objects, actions, states, rules, and transitions. Prevents screen-by-screen design drift. |
| **Journey Map** | `/journey-map` | Map 3-7 primary user flows with branches, decision points, error paths, and recovery. |
| **Vocabulary Audit** | `/vocabulary-audit` | Normalize nouns, verbs, statuses, and labels into a canonical glossary. Catches terminology drift. |
| **Consistency Audit** | `/consistency-audit` | Audit cross-screen invariants: navigation, actions, states, modals, forms, and interaction rules. |
| **Heuristic Evaluation** | `/heuristic-eval` | Nielsen-style structured evaluation with severity ranking (0-4) and fix recommendations. |
| **Cognitive Walkthrough** | `/cognitive-walkthrough` | Step through a task as a first-time user. Tests intent, discoverability, feedback, and interpretation at every step. |

## Features

- Works from your actual codebase: routes, components, screenshots, docs
- Outputs durable markdown artifacts to `docs/hci/` (configurable)
- Mermaid diagrams for state models and user flows
- Severity-ranked issue tables with concrete fix recommendations
- Explicit-only invocation (no accidental triggers)
- Dual platform: Claude Code and Codex CLI

## Install

### Option A: Install globally

```bash
git clone https://github.com/45ck/hci-review-skill.git
cd hci-review-skill
bash install.sh
```

Installs to both `~/.claude/skills/` (Claude Code) and `~/.agents/skills/` (Codex CLI).

### Option B: Clone into your project

```bash
# From your project root
git clone https://github.com/45ck/hci-review-skill.git /tmp/hci-skill
cp -r /tmp/hci-skill/.claude .claude
cp -r /tmp/hci-skill/.agents .agents
```

### Uninstall

```bash
bash uninstall.sh
```

## Usage

### Claude Code

```
/prototype-hci-pack onboarding flow
/conceptual-model approval system
/journey-map first-time user onboarding
/vocabulary-audit approval + request + task terminology
/consistency-audit settings, approvals, and notifications
/heuristic-eval approval dashboard
/cognitive-walkthrough create-new-agent flow
```

### Codex CLI

```
/skills
# select from the list
```

## What you get

### Conceptual Model

| Section | Contents |
|---|---|
| Actors | Who uses the system, their goals and tasks |
| Objects | What entities exist, their attributes and relationships |
| Actions | What can be done, preconditions and results |
| States | Lifecycle of each object with entry/exit transitions |
| Rules | Constraints, permissions, and guardrails |
| Ambiguities | Overloaded concepts and simplification recommendations |

### Journey Map

| Section | Contents |
|---|---|
| Journeys | 3-7 primary flows: first-time, happy path, edit/undo, error recovery, returning user |
| Steps | Goal, entry point, decisions, branches, errors, exit state |
| Diagrams | Mermaid flowcharts for critical journeys |
| Friction | Cross-journey themes and confusion risks |

### Vocabulary Audit

| Section | Contents |
|---|---|
| Glossary | Canonical terms with type, meaning, and usage location |
| Merges | Terms to ban or consolidate |
| Status model | Every status with meaning and transition triggers |
| Naming problems | Vague verbs, inconsistent labels, domain jargon |

### Consistency Audit

| Section | Contents |
|---|---|
| Invariants | Expected vs observed behavior for navigation, actions, states, forms, modals |
| Screen inventory | Every screen/route with purpose, main action, and state coverage |
| Breaks | Top consistency violations with risk and recommendation |

### Heuristic Evaluation

| Section | Contents |
|---|---|
| Issues table | ID, heuristic violated, location, evidence, severity (0-4), fix |
| Heuristics | All 10 Nielsen heuristics: visibility, match, control, consistency, prevention, recognition, flexibility, minimalism, recovery, help |
| Synthesis | Top 5 problems, quickest wins, structural vs cosmetic issues |

### Cognitive Walkthrough

| Section | Contents |
|---|---|
| Step log | For each step: goal, visible cues, likely action, 4-question walkthrough analysis |
| Breakdowns | Hidden prerequisites, unclear affordances, weak feedback, dead ends |
| Synthesis | Steps most likely to fail, hesitation reasons, highest-impact design changes |

## Recommended workflow

Run the skills in this order for best results:

1. **`/conceptual-model`** -- define what the system *is*
2. **`/journey-map`** -- map how users move through it
3. **`/vocabulary-audit`** -- stabilize the language
4. **`/consistency-audit`** -- catch cross-screen drift
5. **`/heuristic-eval`** -- severity-rank usability problems
6. **`/cognitive-walkthrough`** -- simulate a first-time user

Or run **`/prototype-hci-pack`** to generate the full artifact set in one pass.

That order matters. It keeps structure ahead of polish:

- The conceptual model prevents screen-by-screen drift by forcing clarity on objects, actions, and states
- Journey maps make the user path visible and catch dead ends before they become implementation problems
- Vocabulary audits reduce cognitive load by keeping the language stable across screens
- Consistency audits catch accidental variation that makes similar things behave differently
- Heuristic evaluation gives you a structured issue log using established usability principles
- Cognitive walkthroughs detect where first-time users will miss the right action or misread feedback

## How it works

These skills encode established HCI evaluation methods as AI-executable instructions:

**Conceptual modeling** (Norman, 1988) forces the designer to articulate what exists in the system, what users can do, and what state things are in. If the conceptual model is unclear, the interface will be unclear.

**Journey mapping** traces the user's path through the system and reveals dead ends, branch explosions, and weak recovery paths that are invisible when designing screen by screen.

**Vocabulary auditing** prevents the terminology drift that happens naturally over time -- when the same concept gets called different names in different places, users perceive a harder system than it is.

**Consistency auditing** checks the invariants that should hold across every screen: navigation placement, action treatment, status presentation, state coverage. This is one of Nielsen's strongest heuristics.

**Heuristic evaluation** (Nielsen & Molich, 1990) is the most widely used discount usability method. Each issue is rated on a 0-4 severity scale so you can prioritize what to fix first.

**Cognitive walkthroughs** (Wharton et al., 1994) simulate a first-time user at every step. For each action, the evaluator asks: will the user form the right goal? Notice the action? Understand the result? This catches problems that heuristic evaluation misses.

## Repo structure

```
.claude/skills/
  prototype-hci-pack/SKILL.md          # Claude Code: full review pack
  conceptual-model/SKILL.md            # Claude Code: conceptual model
  journey-map/SKILL.md                 # Claude Code: journey map
  vocabulary-audit/SKILL.md            # Claude Code: vocabulary audit
  consistency-audit/SKILL.md           # Claude Code: consistency audit
  heuristic-eval/SKILL.md              # Claude Code: heuristic evaluation
  cognitive-walkthrough/SKILL.md       # Claude Code: cognitive walkthrough
.agents/skills/
  prototype-hci-pack/
    SKILL.md                           # Codex CLI: full review pack
    agents/openai.yaml                 # Codex metadata
  conceptual-model/                    # ... same structure for all skills
  journey-map/
  vocabulary-audit/
  consistency-audit/
  heuristic-eval/
  cognitive-walkthrough/
install.sh                             # Global install (both platforms)
uninstall.sh                           # Global uninstall
LICENSE                                # MIT
```

## Related

- [fagan-inspection-skill](https://github.com/45ck/fagan-inspection-skill) -- Formal Fagan Inspection skill for structured code review with defect logging

## License

[MIT](LICENSE)
