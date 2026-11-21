# Agent-first engineering standard

Quantitative HCI extends Vercel UI SDK with reusable behaviours, visual components and design tools that agents can discover, compose, operate and verify. Accessible human interaction and a predictable documented contract are required together.

This standard applies to every current and future public runtime export in `packages/liquid-glass`. Read the [package guide](../../../packages/liquid-glass/docs/agent-engineering.md) for the working recipe and [agent contract registry](../../../packages/liquid-glass/agent-contracts.json) for the declared surface. React is the kit's supported rendering adapter; compatibility with upstream's other frameworks is not implied.

## Definition of complete

| Responsibility | Required evidence |
| --- | --- |
| Agent authoring | Documented purpose, use cases, imports, typed inputs/state, composition and restrictions. Read the installed SDK version's docs/types before implementation. |
| Runtime operation | A named registered primitive or genuine SDK child controls. Explicit actions on custom primitives; discoverable valid choices; shared validation and change callbacks. |
| Verification | Test the real postcondition and failure paths, including controlled-host acceptance. Check keyboard/focus and relevant browser behaviour. |
| Passive presentation | Explicit classification, inspectable props and lifecycle, appropriate text alternatives or decorative treatment. No fictitious actions. |
| Provenance | Upstream aliases remain unchanged and attributed. Custom components retain **Unvalidated** until recorded human review changes that decision. |

Choose an existing primitive or composition before adding a new one. Put reusable behaviour in headless code and rendering in the adapter. A visual effect, canvas or custom cursor must not become the only way to understand or operate the underlying task. Preserve SVG/data/text alternatives for models and the same controls in material fallbacks.

## Keep the contract current

Add or update the registry in the same change as a public export. Record purpose, `useWhen`, inputs, state, actual runtime discovery and actions, restrictions, documentation and scoped evidence. Classify aliases, utilities, providers and passive presentation honestly. Node-only build publishers use `build-tool`: no live UI discovery, no UI actions, and interface validation `not-applicable`. An evidence path identifies a check; it is not a claim that the check was executed or that it covers every scenario.

Custom primitives also publish positional action input schemas and valid/invalid examples in `packages/liquid-glass/agent-action-inputs.json`. Keep those shapes aligned with the shared runtime validators. Structural preflight never replaces current revision, identity, permission or host acceptance checks. When a controlled host is asynchronous, expose pending state and cancellation, accept equivalent document values, prevent stale callbacks from settling newer requests, and distinguish a failed callback after application from an unapplied proposal.

Generate hosted contracts from the canonical package sources. Preserve schema-linked indexes/envelopes, deterministic documentation identity and source provenance. The build must check every emitted agent file, its fingerprint and the loaded page's matching identity. These fields identify content; they do not certify behavior, authenticity or human approval.

`npm run glass:agent-check` checks the registry/schema, public export inventory, source declarations and declared references. Run `npm run glass:verify` for package changes and the applicable browser checks under the root `AGENTS.md` for interaction changes. A new public control must have a representative task with an observable result; extending only the catalogue or metadata does not complete it.

Do not expose a parallel browser mutation path to avoid SDK confirmation, cancellation, read-only or disabled behaviour. Validate custom arguments, document revisions and atomic edits in the common implementation. Host authorization is separate from UI source attribution. Respect the existing demo policy for actions marked as requiring a person.

## Report what was established

Report actual commands and exit codes, the controls/tasks exercised, accepted state changes and any unavailable paths. Keep static contract coverage, executed runtime checks, standard/profile conformance and human usability evidence separate. Do not claim all components work merely because the inventory is complete, or promote **Unvalidated** because automated tests passed.

The material, standards and research boundaries remain in force: [Liquid Glass](liquid-glass.md), [standards components](standards-components.md), [OMG coverage](omg-coverage.md), [agent-first modeling](agent-first-modeling.md) and [interface foundations](interface-foundations.md).

## Upstream basis

The mission and separation of behaviours, primitives, adapters and agents follow [Vercel UI SDK](https://github.com/vercel-labs/ui). Its [consumer skill](https://github.com/vercel-labs/ui/blob/855bc7fd4df3d61aee33d9d975dc3e4f71debc6c/packages/core/skills/ui-sdk/SKILL.md), [agent-ready guide](https://github.com/vercel-labs/ui/blob/855bc7fd4df3d61aee33d9d975dc3e4f71debc6c/packages/core/skills/ui-sdk/references/agent-ready.md) and [testing guide](https://github.com/vercel-labs/ui/blob/855bc7fd4df3d61aee33d9d975dc3e4f71debc6c/packages/core/skills/ui-sdk/references/testing.md) were inspected at commit `855bc7fd4df3d61aee33d9d975dc3e4f71debc6c`. Installed package documentation and declaration files govern the implementation when online `main` differs.
