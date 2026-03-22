# hci-review-skill

HCI and UX prototype review skills for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) and [Codex CLI](https://github.com/openai/codex). Run structured usability evaluations on your prototypes without leaving the terminal.

Seven skills covering the core HCI evaluation methods: conceptual modeling, journey mapping, vocabulary normalization, consistency auditing, heuristic evaluation, and cognitive walkthroughs.

## Skills

| Skill | Command | What it does |
|-------|---------|-------------|
| **Prototype HCI Pack** | `/prototype-hci-pack` | Full review pack: conceptual model, journeys, glossary, consistency audit, heuristic evaluation, walkthrough, and summary |
| **Conceptual Model** | `/conceptual-model` | Define actors, objects, actions, states, rules, and transitions |
| **Journey Map** | `/journey-map` | Map primary user flows, branches, decision points, and recovery paths |
| **Vocabulary Audit** | `/vocabulary-audit` | Normalize nouns, verbs, statuses, and labels into a canonical glossary |
| **Heuristic Evaluation** | `/heuristic-eval` | Nielsen-style structured evaluation with severity ranking |
| **Cognitive Walkthrough** | `/cognitive-walkthrough` | Step through a task as a first-time user to find discoverability and feedback breakdowns |
| **Consistency Audit** | `/consistency-audit` | Audit cross-screen invariants: navigation, actions, states, patterns, and interaction rules |

## Install

### Option A: Clone and install globally

```bash
git clone https://github.com/45ck/hci-review-skill.git
cd hci-review-skill
bash install.sh
```

This installs to both `~/.claude/skills/` (Claude Code) and `~/.agents/skills/` (Codex CLI).

### Option B: Copy into your project

Copy the `.claude/skills/` folder into the root of your repo for project-scoped skills.

For Codex CLI support, also copy `.agents/skills/`.

### Uninstall

```bash
bash uninstall.sh
```

## Usage

Each skill takes a scope argument describing what to review:

```bash
/prototype-hci-pack onboarding flow
/conceptual-model approval system
/journey-map first-time user onboarding
/vocabulary-audit approval + request + task terminology
/consistency-audit settings, approvals, and notifications
/heuristic-eval approval dashboard
/cognitive-walkthrough create-new-agent flow
```

## Recommended workflow

Run the skills in this order for best results:

1. `/conceptual-model` -- define what the system is
2. `/journey-map` -- map how users move through it
3. `/vocabulary-audit` -- stabilize the language
4. `/consistency-audit` -- catch cross-screen drift
5. `/heuristic-eval` -- severity-rank usability problems
6. `/cognitive-walkthrough` -- simulate a first-time user
7. `/prototype-hci-pack` -- generate the full artifact set in one pass

## Why these skills

| Skill | Best for |
|-------|----------|
| Conceptual Model | Deciding what the system *is* before designing screens |
| Journey Map | Making the user path visible; catching dead ends and weak recovery |
| Vocabulary Audit | Reducing cognitive load by keeping labels consistent |
| Consistency Audit | Catching accidental variation in buttons, layout, states, and behaviors |
| Heuristic Evaluation | Rigorous solo review using established usability principles |
| Cognitive Walkthrough | First-time-user clarity; detecting where users will get lost |
| Prototype HCI Pack | One command to generate a durable design review pack |

## Output

By default, skills write artifacts to `docs/hci/`. Change the path in the invocation or edit the SKILL.md files if you prefer a different location.

## How skills work

Each skill is a `SKILL.md` file with YAML frontmatter:

- **Claude Code**: `.claude/skills/<skill-name>/SKILL.md`
- **Codex CLI**: `.agents/skills/<skill-name>/SKILL.md` + `agents/openai.yaml`

All skills use `disable-model-invocation: true` so they only run when you explicitly invoke them. They are review passes, not background knowledge.

## Related

- [fagan-inspection-skill](https://github.com/45ck/fagan-inspection-skill) -- Formal Fagan Inspection skill for structured code review with defect logging

## License

[MIT](LICENSE)
