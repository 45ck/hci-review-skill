# Archived UI SDK settings demo guide

The former five-view settings demo is retained as a reproducible local source fixture. The hosted site now serves the Liquid Glass kit. Run the archived example using its [local instructions](../examples/ui-sdk-pilot/README.md); its recorded results remain unchanged.

## Start here

1. Open **Compare**. Change the same settings and save on the native and SDK forms. Both use the existing validated settings model and save only to page memory.
2. Open **Agent lab**. Inspect the registered components, choose **T4**, and run it. The demo requests Singapore, 90-day retention and a weekly digest, then saves once.
3. Inspect the action log and verified outcome. The log contains real bridge requests and responses. The verifier reads rendered application output separately.
4. Run all six tasks. Each starts fresh, so previous manual edits cannot silently alter the expected result.
5. Try **Read-only** and **Rejected change**, then open **Results** for the complete original experiment.

## Views

| View | Direct link | Purpose |
| --- | --- | --- |
| Compare | Local `/#compare` | Independently usable native and SDK forms, with full-page links |
| Agent lab | Local `/#agent` | Real structured component inspection and one-step-per-request task replay |
| Read-only | Local `/#readonly` | Disabled controls and unchanged state after an attempted bridge mutation |
| Rejected change | Local `/#rejection` | Expected application cancellation of 365-day retention |
| Results | Local `/#results` | All 162 routine attempts, all 33 checks, original captures, metrics and source files |

## Six tasks and expected outcomes

Each task starts with Sydney, 30 days, digest off, and zero saves.

| Task | Actions | Final saved settings | Saves |
| --- | --- | --- | ---: |
| T1 | Change region and save | Frankfurt / 30 days / digest off | 1 |
| T2 | Change retention and save | Sydney / 90 days / digest off | 1 |
| T3 | Enable the digest and save | Sydney / 30 days / digest on | 1 |
| T4 | Change all three fields and save | Singapore / 90 days / digest on | 1 |
| T5 | Change all three fields, then restore them without saving | Sydney / 30 days / digest off | 0 |
| T6 | Complete T4, then change region to Sydney and save again | Sydney / 90 days / digest on | 2 |

The expected final draft equals the saved state, and Save is disabled after every task. T5 demonstrates a clean draft without an unnecessary save. T6 demonstrates two distinct saves.

## What the guard demos prove

**Read-only:** attempting an edit must leave draft, saved state and save count unchanged. The UI remains disabled. This is a browser fixture check; it does not establish server authorization.

**Rejected change:** the application deliberately cancels retention `365`. In the original recorded run, the bridge returned top-level `ok: true` with a step result of `false`; actual retention remained `30`. The demo shows the response and independently checks the state. A completed transport request is not sufficient evidence that the intended change happened.

## Recorded evidence versus live demonstrations

The Results view presents the fixed experiment measured on **19 November 2026, 08:31:43–08:34:10 AEDT**. Its canonical [CI run](https://github.com/45ck/hci-review-skill/actions/runs/44400965977), [report](ui-sdk-pilot-results.md) and [protocol](ui-sdk-pilot-protocol.md) remain authoritative.

The original experiment passed 162/162 routine attempts and 33/33 additional checks. In that build, native controls were faster and smaller. No model inference ran; tokens, cash cost, engineering productivity and human usability were not measured.

Live replays are deterministic scripts with visible progress. Their pacing and the extra hub UI are for inspection. They do not reproduce the timing boundary of the original benchmark. The original bundle sizes are historical build measurements, not the current demo hub's transfer weight.

The app includes a compact evidence index derived from the canonical raw JSON, the exact gzip report and CSV, the original build manifest, and all six original screenshot files. The raw JSON SHA-256 is `6ae94f8db5c28c30233cde91564493b2d1199d9646f30e931edcd8520da9194a` after decompression. These assets contain synthetic fixture data.

## Verification and scope

[`check-ui-sdk-demos.py`](check-ui-sdk-demos.py) checks the comparison forms, six individual task replays, suite execution, inspection/reset, read-only and rejection cases, recorded-evidence presentation, and mobile layout/interactions. It reads the actual embedded application's DOM rather than trusting the hub's success message. Screenshots and a machine-readable report are retained by CI separately from the matched benchmark results.

The original native and SDK component implementations, shared reducer, dependency versions, fixed protocol and canonical raw evidence are preserved. The demo changes the landing page and adds a presentation/controller layer. It does not integrate the SDK into production projects or connect to customer data.

## Acceptance record

The [demo acceptance record](ui-sdk-demo-results.md) contains the final 15/15 browser checks, source/publication provenance, retained screenshots, and the initial 13/15 result plus its label correction.
