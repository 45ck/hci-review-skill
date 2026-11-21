"""Actual SDK document commands and shared human editing in the Standards kit."""

from copy import deepcopy

from glass_developer_contract import _select
from glass_optics_contract import _act, _call, _entry, browser_stage


async def verify_model_document_contract(page, expect, *, base_url, output_dir):
    await page.emulate_media(reduced_motion="reduce")
    browser_stage("model document: discover named actions and stable element choices")
    await page.goto(base_url, wait_until="networkidle")
    await _select(page, "listbox", "Component catalogue", value="standards")
    await _select(page, "select", "Diagram model", value="uml-class")
    entry = await _entry(page, "model-document", "Model document")
    assert set(entry["actions"]) == {"inspect", "preview", "applyTransaction", "undo", "redo", "select", "cancelPending"}, entry
    assert "past" not in entry["value"] and "model" not in entry["value"], entry
    root = page.locator('[data-model-id="uml-class"][data-model-revision]')
    await expect(root).to_have_attribute("data-validation", "unvalidated")
    await expect(root).to_have_attribute("data-model-id", "uml-class")

    async def command(action, args=None):
        response = await _act(page, entry, action, args or [])
        result = response["steps"][0].get("result")
        assert isinstance(result, dict), response
        return result

    async def inspect():
        result = await command("inspect")
        await expect(root).to_have_attribute("data-model-revision", str(result["revision"]))
        return result

    initial = await inspect()
    assert initial["modelId"] == "uml-class" and initial["limits"]["operations"] == 100, initial
    idle_cancel = await command("cancelPending")
    assert idle_cancel["ok"] and idle_cancel["status"] == "unchanged" and not idle_cancel["changed"], idle_cancel
    after_cancel = await inspect()
    assert after_cancel["revision"] == initial["revision"] and after_cancel["model"] == initial["model"], after_cancel
    choices = await _call(page, "query", {"within": entry["ref"]})
    assert isinstance(choices, list) and len(choices) == 1, choices
    nodes = {node["id"]: node for node in initial["model"]["nodes"]}
    assert {item["value"] for item in choices[0]["items"]} == set(nodes), choices
    target_id = choices[0]["items"][0]["value"]
    other_id = next(identifier for identifier in nodes if identifier != target_id)
    original = deepcopy(initial["model"])
    revisions = [initial["revision"]]
    await page.evaluate("""() => {
        const events = [];
        const stop = window.quantitativeHciAgent.subscribe(change => {
            if (change.label === 'Model document') events.push(change);
        });
        window.__modelDocumentEvidence = {events, stop};
    }""")
    try:
        browser_stage("model document: preview an atomic batch without mutation")
        transaction = {
            "expectedRevision": initial["revision"],
            "label": "Agent document batch",
            "selectedId": target_id,
            "operations": [
                {"type": "rename-node", "nodeId": target_id, "name": "Agent document edit"},
                {"type": "update-node", "nodeId": target_id,
                 "patch": {"description": "Edited by the named document transaction."}},
            ],
        }
        preview = await command("preview", [transaction])
        assert preview["ok"] and not preview["changed"] and preview["status"] == "unchanged", preview
        assert preview["requestedRevision"] == initial["revision"] + 1, preview
        assert preview["summary"]["updatedNodeIds"] == [target_id], preview
        inspected = await inspect()
        assert inspected["model"] == original and inspected["revision"] == initial["revision"], inspected
        assert inspected["undoDepth"] == initial["undoDepth"], inspected

        browser_stage("model document: accepted batch, structured refusal and history")
        applied = await command("applyTransaction", [transaction, {"source": "mouse"}])
        assert applied["ok"] and applied["status"] in {"requested", "applied"}, applied
        accepted = await inspect()
        assert accepted["lastResult"]["status"] == "applied", accepted
        assert accepted["revision"] == initial["revision"] + 1, accepted
        assert accepted["undoDepth"] == initial["undoDepth"] + 1, accepted
        assert accepted["selectedId"] == target_id, accepted
        assert next(node for node in accepted["model"]["nodes"] if node["id"] == target_id)["name"] == "Agent document edit"
        await expect(page.locator(f'[data-diagram-node="{target_id}"]')).to_have_attribute("aria-label", "Inspect Agent document edit")
        revisions.append(accepted["revision"])
        edited = deepcopy(accepted["model"])

        invalid = {
            "expectedRevision": accepted["revision"],
            "operations": [
                {"type": "rename-node", "nodeId": target_id, "name": "Must roll back"},
                {"type": "update-node", "nodeId": other_id, "patch": {"width": -1}},
            ],
        }
        refused = await command("applyTransaction", [invalid])
        assert not refused["ok"] and refused["status"] == "rejected" and refused["issues"], refused
        after_refusal = await inspect()
        assert after_refusal["model"] == edited and after_refusal["revision"] == accepted["revision"], after_refusal
        assert after_refusal["undoDepth"] == accepted["undoDepth"], after_refusal
        stale = await command("applyTransaction", [transaction])
        assert not stale["ok"] and stale["issues"][0]["code"] == "stale-revision", stale
        assert (await inspect())["model"] == edited

        selected = await command("select", [other_id])
        assert selected["ok"], selected
        selection = await inspect()
        assert selection["revision"] == accepted["revision"] and selection["selectedId"] == other_id, selection
        assert selection["lastResult"]["status"] == "applied", selection
        assert selection["undoDepth"] == accepted["undoDepth"], selection
        no_op = await command("applyTransaction", [{
            "expectedRevision": selection["revision"],
            "operations": [{"type": "rename-node", "nodeId": target_id, "name": "Agent document edit"}],
        }])
        assert no_op["ok"] and no_op["status"] == "unchanged" and not no_op["changed"], no_op
        assert (await inspect())["undoDepth"] == accepted["undoDepth"]

        await command("undo", [accepted["revision"]])
        undone = await inspect()
        assert undone["model"] == original and undone["revision"] == accepted["revision"] + 1, undone
        assert undone["redoDepth"] == 1 and undone["undoDepth"] == initial["undoDepth"], undone
        revisions.append(undone["revision"])
        await command("applyTransaction", [{
            "expectedRevision": undone["revision"],
            "operations": [{"type": "rename-node", "nodeId": target_id, "name": nodes[target_id]["name"]}],
        }])
        assert (await inspect())["redoDepth"] == 1, "A semantic no-op discarded redo history"
        await command("redo", [undone["revision"]])
        redone = await inspect()
        assert redone["model"] == edited and redone["revision"] == undone["revision"] + 1, redone
        revisions.append(redone["revision"])

        browser_stage("model document: a human edit shares the agent's revision and history")
        await command("select", [target_id])
        await page.get_by_role("textbox", name="Element label", exact=True).fill("Document human edit")
        await page.get_by_role("button", name="Apply element label", exact=True).click()
        human = await inspect()
        assert human["revision"] == redone["revision"] + 1, human
        assert next(node for node in human["model"]["nodes"] if node["id"] == target_id)["name"] == "Document human edit"
        assert human["undoDepth"] == redone["undoDepth"] + 1, human
        revisions.append(human["revision"])
        await command("undo", [human["revision"]])
        restored = await inspect()
        assert restored["model"] == edited, "Agent undo failed to reverse the human edit"
        events = await page.evaluate("window.__modelDocumentEvidence.events")
        assert any(event.get("source") == "agent" and event.get("reason") == "model-transaction" for event in events), events
        assert any(event.get("source") != "agent" and event.get("reason") == "model-transaction" for event in events), events
        assert revisions == sorted(set(revisions)), revisions
        assert all("past" not in event.get("value", {}) for event in events if isinstance(event.get("value"), dict)), events
        return {
            "reviewStatus": "Unvalidated", "namedPrimitive": entry["label"],
            "actions": entry["actions"], "discoveredElementIds": sorted(nodes),
            "previewWithoutMutation": True, "atomicBatchSingleCheckpoint": True,
            "acceptedClonedHostDocument": True, "idleCancellationWithoutMutation": True,
            "invalidBatchRollback": True, "staleRevisionRejected": True,
            "selectionSettlesWithoutRevision": True, "noOpPreservesRedo": True,
            "monotonicRevisions": revisions, "humanAgentSharedHistory": True,
            "sourceAttribution": sorted({event.get("source", "unknown") for event in events}),
            "snapshotExcludesHistory": True,
        }
    finally:
        await page.evaluate("""() => {
            window.__modelDocumentEvidence?.stop();
            delete window.__modelDocumentEvidence;
        }""")
