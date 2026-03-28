# hci-review-skill

<p align="center">
  <img src="logo.svg" alt="hci-review-skill logo" width="128" height="128" />
</p>

<p align="center">
  <img src="banner.svg" alt="hci-review-skill banner" width="100%" />
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/skills-34-6366f1" alt="34 skills" />
  <img src="https://img.shields.io/badge/core-24-8b5cf6" alt="24 core skills" />
  <img src="https://img.shields.io/badge/beads-10-a78bfa" alt="10 beads variants" />
</p>

A structured HCI and UX review skill pack for prototypes, flows, interface systems, research planning, and usability evaluation. It focuses on models, journeys, terminology, state handling, consistency, failure paths, heuristics, cognitive walkthroughs, personas, task analysis, prototype planning, and usability studies.

## Included skills

### Core review skills

- `prototype-hci-pack`
- `conceptual-model`
- `state-model`
- `journey-map`
- `vocabulary-audit`
- `information-architecture`
- `consistency-audit`
- `failure-path-audit`
- `heuristic-eval`
- `cognitive-walkthrough`

### Research and prototyping skills

- `accessibility-precheck`
- `cognitive-friction-detector`
- `error-and-time-metrics-analyzer`
- `field-study-planner`
- `high-fidelity-prototype-planner`
- `interaction-type-selector`
- `low-fidelity-prototype-planner`
- `mental-model-checker`
- `persona-synthesizer`
- `representative-task-writer`
- `satisfaction-questionnaire-writer`
- `task-analysis-writer`
- `usability-test-planner`
- `wireframe-critic`

### Beads variants

- `prototype-hci-pack-beads`
- `conceptual-model-beads`
- `state-model-beads`
- `journey-map-beads`
- `vocabulary-audit-beads`
- `information-architecture-beads`
- `consistency-audit-beads`
- `failure-path-audit-beads`
- `heuristic-eval-beads`
- `cognitive-walkthrough-beads`

## Features

- Reviews real interfaces as systems, not isolated screens
- Produces durable markdown artifacts under `docs/hci/`
- Includes diagrams, scorecards, summaries, and structured review outputs
- Adds research-planning and prototyping skills for personas, task analysis, testing, accessibility, and wireframe critique
- Ships both core review skills and Beads-backed issue-generation variants
- Mirrors packaged skills into both `.claude/skills/` and `.agents/skills/`

## Install

### Option A: Install globally

```bash
git clone https://github.com/45ck/hci-review-skill.git
cd hci-review-skill
bash install.sh
```

This installs every packaged skill into both:

- `~/.claude/skills/`
- `~/.agents/skills/`

### Option B: Copy into a project

```bash
cp -R .claude /path/to/your-project/
cp -R .agents /path/to/your-project/
```

### Uninstall

```bash
bash uninstall.sh
```

## Usage

```text
/prototype-hci-pack onboarding flow
/conceptual-model approval system
/state-model request lifecycle
/journey-map first-time user onboarding
/vocabulary-audit approval + request + task terminology
/information-architecture main navigation and settings
/consistency-audit settings, approvals, and notifications
/failure-path-audit checkout flow
/heuristic-eval approval dashboard
/cognitive-walkthrough create-new-agent flow
/persona-synthesizer interview notes for student onboarding
/task-analysis-writer submit expense claim
/mental-model-checker current dashboard concepts
/accessibility-precheck account setup flow
/low-fidelity-prototype-planner early concept for scheduling flow
/wireframe-critic checkout wireframes
/usability-test-planner prototype validation session

/heuristic-eval-beads approval dashboard
/prototype-hci-pack-beads onboarding flow
```

## Repo structure

```text
.claude/skills/<skill>/SKILL.md      packaged skill format
.agents/skills/<skill>/SKILL.md      mirrored packaged skill format
docs/hci/                            templates and generated review artifacts
install.sh                           global installer
uninstall.sh                         global uninstaller
LICENSE                              MIT
```

## Related workflow agents

- [ux-researcher](https://github.com/45ck/workflow-agents) - Plan and critique UX research, usability work, and prototype evaluation
- [system-modeler](https://github.com/45ck/workflow-agents) - Formalize user flows and behavioral models where needed

## Related skill packs

- [business-analysis-skills](https://github.com/45ck/business-analysis-skills) - Business analysis techniques, workflows, and quality checks
- [marketing-product-skills](https://github.com/45ck/marketing-product-skills) - Product strategy, growth, positioning, launch, SEO, and pricing skills
- [fagan-inspection-skill](https://github.com/45ck/fagan-inspection-skill) - Formal inspection and defect-review skills
- [software-architecture-skills](https://github.com/45ck/software-architecture-skills) - Architecture options, views, risks, and tradeoff writing
- [data-structures-algorithmic-reasoning-skills](https://github.com/45ck/data-structures-algorithmic-reasoning-skills) - Data structure selection and algorithmic reasoning skills
- [oop-code-structure-skills](https://github.com/45ck/oop-code-structure-skills) - Object-oriented design and class-structure review skills
- [web-engineering-skills](https://github.com/45ck/web-engineering-skills) - Web request handling, MVC, validation, routing, and navigation skills
- [backend-persistence-skills](https://github.com/45ck/backend-persistence-skills) - Persistence, schema, ORM, query, and migration skills
- [enterprise-architecture-integration-skills](https://github.com/45ck/enterprise-architecture-integration-skills) - Enterprise topology, integration, messaging, and cloud skills
- [uml-analysis-modelling-skills](https://github.com/45ck/uml-analysis-modelling-skills) - UML analysis and modelling skills
- [verification-test-design-skills](https://github.com/45ck/verification-test-design-skills) - Verification, coverage, decision-table, and oracle design skills
- [automation-testing-skills](https://github.com/45ck/automation-testing-skills) - Unit, integration, API, UI, regression, and flaky-test skills
- [non-functional-testing-skills](https://github.com/45ck/non-functional-testing-skills) - Performance, resilience, scalability, soak, stress, and NFR testing skills
- [software-quality-skills](https://github.com/45ck/software-quality-skills) - Quality models, technical debt, maintainability, and reliability skills
- [code-review-inspection-skills](https://github.com/45ck/code-review-inspection-skills) - Formal inspection, checklist-driven review, metrics, and rework planning skills
- [refactoring-code-smells-skills](https://github.com/45ck/refactoring-code-smells-skills) - Refactoring, anti-pattern, duplication, and code smell review skills
- [design-for-testability-skills](https://github.com/45ck/design-for-testability-skills) - Seams, DI, determinism, hidden I/O, and testability design skills
- [security-engineering-skills](https://github.com/45ck/security-engineering-skills) - Threat modeling, boundaries, least privilege, and secure defaults skills
- [authentication-cryptography-skills](https://github.com/45ck/authentication-cryptography-skills) - Authentication, token, certificate, revocation, and MITM review skills
- [pentest-security-testing-skills](https://github.com/45ck/pentest-security-testing-skills) - Pentest scoping, recon, attack-surface mapping, OWASP, and finding-report skills
- [llm-agent-security-skills](https://github.com/45ck/llm-agent-security-skills) - Prompt injection, agent permissions, retrieval trust, memory, and tool-chain security skills
- [deployment-release-skills](https://github.com/45ck/deployment-release-skills) - Deployment strategy, go-live readiness, rollback, and release operations skills
- [maintenance-evolution-skills](https://github.com/45ck/maintenance-evolution-skills) - Maintenance triage, change impact, migration, regression, and deprecation skills
- [project-management-skills](https://github.com/45ck/project-management-skills) - Project chartering, scope, WBS, milestones, estimation, and closure skills
- [agile-delivery-skills](https://github.com/45ck/agile-delivery-skills) - Backlog shaping, sprint goals, retrospectives, blockers, and delivery discipline skills
- [cloud-platform-operations-skills](https://github.com/45ck/cloud-platform-operations-skills) - Cloud placement, rollout readiness, patching, migration waves, and lifecycle operations skills
- [documentation-evidence-skills](https://github.com/45ck/documentation-evidence-skills) - Specifications, rationale, reports, traceability, plans, and evidence quality skills
- [research-literature-review-skills](https://github.com/45ck/research-literature-review-skills) - Search strategy, screening, synthesis, evidence strength, and gap-analysis skills

## License

[MIT](LICENSE)
