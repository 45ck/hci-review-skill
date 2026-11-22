# Design principle skills: validation record

## Scope

Validation covers packaging and how agents apply the seven focused methods to [authored synthetic evidence](../../tests/fixtures/principle-review-evidence.md). It does not establish human usability, attention, satisfaction, memory, conversion, or production behavior.

## Package checks

Run:

```bash
bash -n install.sh uninstall.sh scripts/skill_inventory.sh
python3 scripts/verify_skill_pack.py
```

The required CI job runs the same commands. Checks cover platform inventories, frontmatter, non-Beads mirror consistency, Codex descriptors, local links, supporting assets, repeated installation/removal into a temporary target, unrelated-skill preservation, and rejection of invalid/incomplete packages before mutation.

## Agent review exercises

Two independent agents completed the exercise on 22 November 2026 in fresh task contexts, with only the assigned skill files, repository instructions, and input fixture. Neither reviewer received expected findings or a diagnosis. The fixture clearly labels its code and traces as synthetic evidence and keeps a second screenshot-only case separate.

The first agent used Jakob, Hick, and Zeigarnik reviews. The second used color balance, von Restorff, aesthetic usability, and peak-end reviews. The task was to review both cases, return actionable findings and verification status, and make no edits. These were evidence-review exercises, not browser execution or real user research.

| Skill | Observed behavior in the agent's response |
| --- | --- |
| Jakob | Identified that More save options submits instead of disclosing choices, and that the supplied save-success message contradicts the traced failure. Kept expected meaning separate from human observation. |
| Hick | Identified duplicate start routes and competing primary variants; retained help/cancel access and did not treat all six controls or 120 templates as equivalent decision alternatives. |
| Color balance | Separated color roles from contrast; calculated 2.803:1 for the declared solid white/orange pair while explicitly withholding a rendered compliance claim. Identified color-only errors. |
| Von Restorff | Questioned the unsupported recommended-plan emphasis and color-only distinction; proposed visible meaning and a justified priority rather than stronger upselling. |
| Aesthetic usability | Identified local font overrides and separated visual coherence from the functional save/disclosure problem. Preserved existing icons and global configuration. |
| Peak-end | Prioritized truthful persistence feedback over celebration. Identified the eight-second overlay as a potential obstruction while leaving focus and reduced-motion behavior unverified. |
| Zeigarnik progress | Distinguished four of four completed required items from an optional invitation, identified the incorrect completion gate, and limited the resumption finding to checklist marks shown resetting in the fixture. |

Both agents kept Case B independent: neither imported Case A's save failure, declared its 85/12/3 palette invalid, claimed its searchable table was inherently overloaded, nor claimed its footer proved persistence. Both marked changes as proposed and reported unavailable runtime/human checks.

These observations support the methods' usefulness on these two authored cases. They do not establish a general accuracy rate or prove the skills improve production user outcomes.

## Recorded local result

All seven new skills passed the skill-creator frontmatter validator. Shell syntax and whitespace checks passed. The final package verifier reported:

```text
Verified 41 skills on each platform, 19 templates and 27 Codex descriptors
Passed isolated install/remove roundtrip, repeat runs, preservation, and invalid-bundle checks
```

The package verifier uses Python's standard library and temporary directories; it needs no browser, model API, private runtime, or added dependency. CI reruns package checks on pull requests. Agent review exercises are recorded here and are not silently represented as automated CI assertions.
