# Agent engineering for Liquid Glass

The root `AGENTS.md` applies. Read [`docs/llms.txt`](docs/llms.txt), the relevant entry in [`agent-contracts.json`](agent-contracts.json), and [`docs/agent-engineering.md`](docs/agent-engineering.md) before changing this package.

## Component contract

- Reuse documented `@ui-sdk/react/<component>` entries and public `@ui-sdk/core` behaviours. Inspect the installed **0.1.0-beta.13** docs and types; do not implement against unverified online examples or private imports.
- Classify every public runtime export honestly: an interactive primitive, composition, passive presentation, provider or utility. Every contract names its purpose, inputs/state, discovery path, actual actions, restrictions, source and evidence. Keep aliases visibly attributed to upstream.
- Put reusable interaction logic in a headless primitive. Declare options and controlled synchronization, use cancellable public changes and list agent actions explicitly. Validate custom action arguments and expected revisions in the shared implementation.
- Render with the public React adapter. Keep existing composition boundaries; a composition may expose named SDK children without registering a duplicate root. Passive decoration has no invented actions and must not intercept input.
- Use meaningful accessible names, stable item IDs and discoverable choices. Agent and human operations must reach the same accepted state. Keyboard-only or pointer-only validation is insufficient.
- Preserve secret, hidden, confirmation, read-only and disabled semantics. UI source attribution is not authentication. The host remains responsible for authoritative authorization and persistence.
- Update contract records, docs, examples and targeted tests with every public change. Do not register an action that only returns a success message; verify its observable effect.
- Keep custom action input schemas and valid/invalid examples aligned with the shared implementation. Preserve structural-only preflight, live revision/identity validation and actual controlled acceptance. Pending work needs cancellation and stale-result isolation; a callback failure after accepted props must not be described as an unapplied change.
- Generate hosted metadata from canonical inputs and preserve its schemas, fingerprints and page identity. The production documentation gate must fail for missing, stale or orphan contract files. Content identity and source provenance do not claim test success or human approval.

## Verification and scope

Run `npm run glass:agent-check` and `npm run glass:verify` from the repository root. For interaction changes, run the relevant production-browser contracts required by the root instructions. Assert discovery, valid choices, accepted state, cancellation/rejection and applicable keyboard/focus behaviour. A successful SDK operation is not proof that a controlled host accepted the proposal.

Keep React support explicit. Retain the **Unvalidated** status of every custom component and existing standards/provenance boundaries. Static checks establish inventory consistency; browser tests establish only the tested behaviour; human review requires its own evidence. Do not edit the installed upstream skill or install personal skills as part of package work.

## Native motion

Use the public `/motion` entry with `motion.css` under the existing provider and SDK agent bridge. Read `docs/motion.md` and `motion-recipes.json` before choosing an effect. Preserve meaningful state, synchronous cancellation, finite interruption, stable list keys, focus return and reduced/off behavior. Never infer task completion from animation completion. New graph actions use the public SDK primitive and exact expected source state. Register public exports and action schemas, and include their production browser contract. External renderer adapters must retain fallback and lifecycle cleanup; no engine or asset is bundled by this package. Source analysis lives in `docs/hci/standards/motion-sources.md` from the repository root. All custom motion remains Unvalidated.
