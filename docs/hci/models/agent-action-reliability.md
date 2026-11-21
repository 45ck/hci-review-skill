# Agent action reliability

## Task and observed gap

An agent must form a valid action, operate the same component as a person, and determine whether the host accepted the result. The first agent contract release covered the public export inventory and real SDK discovery. Follow-up inspection reproduced a controlled model bug: a host accepted a JSON-cloned proposal with identical content and history, but the primitive reported rejection because the object reference differed.

Two authoring gaps accompanied that bug. Custom action inputs were described by prose signatures only, and generated hosted contracts lacked independent schemas, build identity and an output verification gate.

## Decisions

| Boundary | Decision | Observable result |
| --- | --- | --- |
| Controlled model state | Compare full JSON document values, including selection and history. Keep props authoritative; callback completion alone cannot establish acceptance. | Equivalent serialized props settle to applied. Different host state produces a structured conflict. |
| Delayed acceptance | Add a shared `cancelPending` action, callback AbortSignal, pending revision and request identity checks. | Both people and agents can abandon unpublished work and make a fresh request. Late callbacks cannot settle a newer request. |
| Failure after application | Report `applied-error` with retained accepted content. | The caller can inspect the result before deciding whether a retry is appropriate. |
| Argument discovery | Publish schemas and valid/invalid examples for the custom viewport and model-document action tuples. | CLI preflight produces structured errors without operating a page. Current-state validation remains in the shared runtime. |
| Published documentation | Generate all metadata from canonical sources, give index/envelopes schemas, and fingerprint the exact emitted bytes. | The page identifies its documentation set. Missing, stale, orphaned or mismatched assets fail the build gate. |

No new mutation transport, model-provider integration or diagnostic product section is introduced. Human controls and agent calls continue through the existing UI SDK primitive, validation and host callbacks.

## Evidence and limits

`tests/test_model_controlled.mjs` exercises the real public SDK primitive and document engine without a mocked controller. It covers clone acceptance, delayed props, cancellation, exceptions and Promise rejection, applied-then-failed outcomes, stale callbacks, disposal, source attribution, revision rejection, read-only/disabled rules and history. The original clone-acceptance test failed against the prior implementation. Three isolated deliberate defects were detected: reference-only acceptance, missing abort signalling and a stale callback replacing a newer result.

The production gallery's Standards host accepts cloned document values. `tests/glass_model_document_contract.py` verifies that real React/SDK route, accepted content/history/selection, exposed cancellation and an idle cancellation no-op. The complete existing browser release gate continues to cover all catalogue families, graphics, interactions, sections, keyboard/focus, preferences and GPU contribution.

`tests/test_agent_action_inputs.mjs` checks the schema vocabulary, exact action coverage, valid/invalid inputs and alignment with the real viewport/model validators. `tests/test_agent_documents.mjs` deliberately damages emitted contracts, fingerprints, schema links, byte counts and page identity to show the output gate rejects them. Schema references must remain with the emitted release instead of silently resolving through a moving source branch.

Run `npm run glass:verify`, `python3 -B -m unittest discover -s tests -v` and the full production browser suite under the repository instructions. Report execution results for the exact candidate commit in its PR and CI artifacts. This record describes the decision and check scope, not perpetual passing status.

All custom components remain **Unvalidated** by a human UI/UX team. Automated tests and documentation fingerprints do not establish human comprehension, task speed, accessibility conformance or source authenticity. The next evidence decision is to evaluate real agent tasks and human recovery comprehension with a recorded protocol, rather than infer improvement from inventory size or test counts.
