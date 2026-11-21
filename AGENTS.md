# Specialist HCI review skills

This repository owns the public HCI and UX review skills, research-planning workflows, and supporting templates. Keep the skill pack independently installable.

Quantive's design system, quantitative modelling tools, component library, material renderer, internal standards, examples, and benchmarks belong in the private `45ck/quantitative-hci-and-internal-components` repository. Make changes to those systems there. Do not add their implementation or internal policy back to this repository.

## Skill changes

- Maintain both `.claude/skills/` and `.agents/skills/` variants and the installer inventory. Preserve intentional platform differences, including the Beads variants.
- Keep supporting templates under `docs/hci/templates/` and preserve the existing public MIT licence and source attribution.
- Change specialist review methods only when the task calls for it. Public skills must not require access to the private Quantive repository or its runtime.

## Verification

Every pull request must pass the required `verify` job. It checks shell syntax and skill-pack integrity without installing skills into a contributor's home directory. Keep the workflow active for every pull request and preserve repository protection settings.

Runtime, browser, WebGPU, and component-contract checks belong with their source in the private repository. Record the actual checks run and any checks that could not run; do not claim automated checks establish human usability validation.
