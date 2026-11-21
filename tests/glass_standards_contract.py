"""Standards catalogue, notation smoke checks and shared model editing evidence."""

import json
from pathlib import Path

from glass_developer_contract import _choices, _diagram_fits, _named_controls, _select
from glass_optics_contract import SCREENSHOT_TIMEOUT_MS, _act, _entry, browser_stage, settled_motion


ROOT = Path(__file__).resolve().parents[1]
EXPECTED_VIEWS = {
    "uml-class", "uml-component", "uml-object", "uml-package", "uml-deployment", "uml-composite",
    "uml-profile", "uml-use-case", "uml-activity", "uml-state", "uml-sequence", "uml-communication",
    "uml-interaction-overview", "uml-timing", "uwe-navigation", "uwe-presentation", "bpmn-process",
    "dmn-requirements", "dmn-table", "cmmn-case", "bmm-motivation", "sbvr-vocabulary", "vdml-value",
    "ifml-interaction", "sysml-block", "sysml-requirements", "bacm-capabilities",
}


async def verify_standards_contract(page, expect, *, base_url, output_dir):
    output = Path(output_dir)
    browser_stage("standards: discover all 27 editable views")
    await page.emulate_media(reduced_motion="reduce")
    await page.goto(base_url, wait_until="networkidle")
    await _select(page, "listbox", "Component catalogue", value="standards")
    await expect(page.locator('[data-kit-view="standards"]')).to_be_visible()
    models = await _choices(page, await _entry(page, "select", "Diagram model"))
    assert {item["value"] for item in models} == EXPECTED_VIEWS, models
    named = await _named_controls(page)
    await page.evaluate("""() => Object.defineProperty(navigator, 'clipboard', {
        configurable: true, value: {writeText: async value => {window.__standardsClipboard = value;}}
    })""")

    async def copy_model():
        await _act(page, await _entry(page, "button", "Copy diagram JSON"), "press", [])
        value = await page.evaluate("window.__standardsClipboard")
        assert isinstance(value, str), "The normal copy action produced no model"
        return json.loads(value)

    async def press(label):
        await _act(page, await _entry(page, "button", label), "press", [])

    smoke = []
    for item in models:
        browser_stage("standards: rendered notation and model identity", model=item["value"])
        await _select(page, "select", "Diagram model", value=item["value"])
        viewer = page.locator(f'[data-diagram-id="{item["value"]}"]')
        await expect(viewer).to_be_visible()
        await expect(viewer).to_have_attribute("data-validation", "unvalidated")
        await expect(viewer.get_by_role("alert")).to_have_count(0)
        artwork = viewer.locator("svg[data-diagram-artwork]")
        await expect(artwork).to_be_visible()
        await expect(artwork.locator("script, foreignObject, image")).to_have_count(0)
        model = await copy_model()
        assert model["id"] == item["value"] and model["standard"]["scope"], model
        assert model["standard"]["coverage"] in {"notation-subset", "concept-projection"}, model
        await expect(viewer.locator(".qgd-standard-source a")).to_have_attribute("href", model["standard"]["sourceUrl"])
        await expect(viewer.locator(".qgd-standard-source")).to_contain_text(model["standard"]["version"])
        nodes = await viewer.locator("[data-diagram-node]").evaluate_all("""nodes => nodes.map(node => ({
            id: node.dataset.diagramNode, label: node.getAttribute('aria-label'),
            width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height
        }))""")
        assert {node["id"] for node in nodes} == {node["id"] for node in model["nodes"]}, model
        assert all(node["width"] > 0 and node["height"] > 0 for node in nodes), nodes
        assert all(node["label"] == "Inspect " + next(item["name"] for item in model["nodes"] if item["id"] == node["id"]) for node in nodes), nodes
        choices = await _choices(page, await _entry(page, "select", "Diagram element"))
        assert {choice["value"] for choice in choices} == {node["id"] for node in model["nodes"]}, choices
        await expect(viewer.locator("[data-diagram-relation]")).to_have_count(len(model["edges"]))
        await expect(artwork.locator("[data-diagram-edge]")).to_have_count(len(model["edges"]))
        await _diagram_fits(viewer)
        if model["id"] in {"dmn-table", "sbvr-vocabulary"}:
            table_node = next(node for node in model["nodes"] if node.get("table"))
            await _select(page, "select", "Diagram element", value=table_node["id"])
            table = viewer.get_by_role("table")
            await expect(table).to_be_visible()
            assert await table.get_by_role("columnheader").all_text_contents() == table_node["table"]["columns"]
            assert await table.get_by_role("cell").all_text_contents() == [cell for row in table_node["table"]["rows"] for cell in row]
        for node in model["nodes"]:
            if node.get("ownerId"):
                owner_text = await viewer.locator(f'[data-diagram-owner="{node["id"]}"]').inner_text()
                owner = next(item for item in model["nodes"] if item["id"] == node["ownerId"])
                assert node["name"] in owner_text and owner["name"] in owner_text, owner_text
        smoke.append({"id": model["id"], "notation": model["notation"], "nodes": len(nodes),
                      "links": len(model["edges"]), "standard": model["standard"]["acronym"],
                      "version": model["standard"]["version"], "coverage": model["standard"]["coverage"]})

    browser_stage("standards: full official catalogue and exact version provenance")
    browse = page.get_by_role("button", name="Browse all standards", exact=True)
    await browse.click()
    catalogue = page.get_by_role("dialog", name="Standards catalogue", exact=True)
    await expect(catalogue).to_be_visible()
    cards = catalogue.locator("[data-standard-id]")
    await expect(cards).to_have_count(288)
    inventory = await cards.evaluate_all("""nodes => nodes.map(node => ({
        id: node.dataset.standardId, coverage: node.dataset.standardCoverage,
        text: node.textContent, source: node.querySelector('.standards-entry-meta a').href,
        actions: [...node.querySelectorAll('button')].map(button => button.textContent.trim())
    }))""")
    actual = {item["id"]: item for item in inventory}
    source = json.loads((ROOT / "packages/liquid-glass/src/standards/catalogue.snapshot.json").read_text(encoding="utf-8"))
    assert source["source"]["entryCount"] == len(source["entries"]) == 286
    assert len(actual) == len(inventory) == 288
    assert set(actual) == {entry["id"] for entry in source["entries"]} | {"SysML@1.7", "UWE@profile"}, actual.keys()
    for entry in source["entries"]:
        rendered = actual[entry["id"]]
        assert rendered["source"] == entry["versionUrl"], (entry, rendered)
        assert entry["version"] in rendered["text"] and entry["name"] in rendered["text"], (entry, rendered)
    assert actual["SysML@2.0"]["coverage"] == "reference-only" and not actual["SysML@2.0"]["actions"]
    assert actual["SysML@1.7"]["coverage"] == "notation-subset" and actual["SysML@1.7"]["source"].endswith("/SysML/1.7")
    assert actual["DMN@1.7 beta"]["coverage"] == "reference-only" and not actual["DMN@1.7 beta"]["actions"]
    assert actual["DMN@1.6"]["coverage"] == "notation-subset"
    assert actual["BACM@1.2 beta"]["coverage"] == "reference-only"
    assert actual["BACM@1.1"]["coverage"] == "concept-projection"
    assert sum(len(item["actions"]) for item in inventory) == 27, inventory
    browser_stage("standards: SDK category, coverage and text filters")
    await _select(page, "select", "Standard category", value="business")
    business_ids = await cards.evaluate_all("nodes => nodes.map(node => node.dataset.standardId)")
    assert {"BPMN@2.0.2", "BMM@1.3", "SBVR@1.5", "BACM@1.1"}.issubset(business_ids) and "UML@2.5.1" not in business_ids, business_ids
    await _select(page, "select", "Standard coverage", value="reference-only")
    reference_ids = await cards.evaluate_all("nodes => nodes.map(node => ({id: node.dataset.standardId, coverage: node.dataset.standardCoverage}))")
    assert reference_ids and all(item["coverage"] == "reference-only" for item in reference_ids), reference_ids
    search = await _entry(page, "input", "Search standards")
    await _act(page, search, "setValue", ["DMN"])
    await expect(catalogue.locator('[data-standard-id="DMN@1.7 beta"]')).to_be_visible()
    await expect(catalogue.locator('[data-standard-id="DMN@1.6"]')).to_have_count(0)
    await _select(page, "select", "Standard category", value="all")
    await _select(page, "select", "Standard coverage", value="all")
    await _act(page, search, "setValue", ["no-such-standard-quantive-qa"])
    await expect(cards).to_have_count(0)
    await expect(catalogue.get_by_text("No standards match these filters.", exact=True)).to_be_visible()
    await _act(page, search, "setValue", ["SysML"])
    await expect(catalogue.locator('[data-standard-id="SysML@1.7"]')).to_be_visible()
    await expect(catalogue.locator('[data-standard-id="SysML@2.0"]')).to_be_visible()
    await page.keyboard.press("Escape")
    await expect(catalogue).to_be_hidden()
    await expect(browse).to_be_focused()
    await _act(page, await _entry(page, "dialog", ["Browse all standards", "Standards catalogue"]), "setOpen", [True])
    await expect(catalogue).to_be_visible()
    await _act(page, await _entry(page, "input", "Search standards"), "setValue", ["BPMN"])
    await press("Open BPMN process")
    await expect(catalogue).to_be_hidden()
    await expect(page.locator('[data-diagram-id="bpmn-process"]')).to_be_visible()

    browser_stage("standards: geometry, add/remove and reversible shared model state")
    await _select(page, "select", "Diagram model", value="uml-class")
    await _select(page, "select", "Diagram element", value="asset")
    original = await copy_model()
    asset = next(node for node in original["nodes"] if node["id"] == "asset")
    await _act(page, await _entry(page, "number-input", "Element x"), "setValue", [asset["x"] - 10])
    await press("Apply element geometry")
    moved = await copy_model()
    moved_asset = next(node for node in moved["nodes"] if node["id"] == "asset")
    assert moved_asset["x"] == asset["x"] - 10 and moved["edges"] == original["edges"], moved
    await press("Undo diagram change")
    assert await copy_model() == original
    await press("Redo diagram change")
    assert await copy_model() == moved
    await press("Undo diagram change")
    await _act(page, await _entry(page, "number-input", "Element x"), "setValue", [20000])
    await press("Apply element geometry")
    await expect(page.locator("[data-developer-error]")).to_be_visible()
    assert await copy_model() == original, "Invalid geometry changed the model"
    await _act(page, await _entry(page, "number-input", "Element x"), "setValue", [asset["x"]])
    await press("Apply element geometry")
    await _act(page, await _entry(page, "collapsible", "Add elements and relationships"), "setOpen", [True])
    await _act(page, await _entry(page, "input", "New element label"), "setValue", ["Agent authored element"])
    await press("Add diagram element")
    added = await copy_model()
    new_nodes = [node for node in added["nodes"] if node["id"] not in {old["id"] for old in original["nodes"]}]
    assert len(new_nodes) == 1 and new_nodes[0]["name"] == "Agent authored element", added
    node_id = new_nodes[0]["id"]
    await _select(page, "select", "Relationship source", value=node_id)
    await _select(page, "select", "Relationship target", value="asset")
    await _select(page, "select", "Relationship kind", value="dependency")
    await _act(page, await _entry(page, "input", "Relationship label"), "setValue", ["supports"])
    await press("Add diagram relationship")
    linked = await copy_model()
    assert len(linked["edges"]) == len(original["edges"]) + 1
    assert linked["edges"][-1]["source"] == node_id and linked["edges"][-1]["target"] == "asset"
    await press("Delete selected element")
    assert await copy_model() == original, "Removing the custom element did not remove its related edge"
    await press("Undo diagram change")
    assert await copy_model() == linked
    await press("Redo diagram change")
    assert await copy_model() == original

    browser_stage("standards: structured edits and validation share the normal command path")
    await _act(page, await _entry(page, "collapsible", "Model data"), "setOpen", [True])
    await press("Load current model into editor")
    draft = await _entry(page, "textarea", "Import diagram JSON")
    assert json.loads(draft["value"]) == original
    structured = json.loads(json.dumps(original))
    structured["nodes"][0]["description"] = "Description edited through the same SDK controls."
    await _act(page, draft, "setValue", [json.dumps(structured)])
    await press("Apply diagram JSON")
    assert await copy_model() == structured
    rejected = []
    wrong_id = json.loads(json.dumps(structured))
    wrong_id["id"] = "different-model"
    broken_edge = json.loads(json.dumps(structured))
    broken_edge["edges"][0]["target"] = "missing-element"
    for label, value in [("wrong model identity", wrong_id), ("missing edge endpoint", broken_edge), ("malformed JSON", "{not-json")]:
        await _act(page, draft, "setValue", [value if isinstance(value, str) else json.dumps(value)])
        await press("Apply diagram JSON")
        await expect(page.locator("[data-developer-error]")).to_be_visible()
        assert await copy_model() == structured, f"Rejected {label} mutated the model"
        rejected.append(label)
    await press("Undo diagram change")
    assert await copy_model() == original
    await press("Redo diagram change")
    assert await copy_model() == structured
    await _act(page, await _entry(page, "collapsible", "Model data"), "setOpen", [False])
    screenshots = []
    for model_id in ["bpmn-process", "dmn-table", "uml-sequence"]:
        await _select(page, "select", "Diagram model", value=model_id)
        viewer = page.locator(f'[data-diagram-id="{model_id}"]')
        await viewer.locator(".qgv-surface").scroll_into_view_if_needed()
        await page.mouse.move(1, 1)
        await settled_motion(page)
        filename = f"standards-{model_id}.png"
        await page.screenshot(path=str(output / filename), animations="allow", timeout=SCREENSHOT_TIMEOUT_MS)
        screenshots.append(filename)
    return {"reviewStatus": "Unvalidated", "models": smoke, "namedControls": named,
            "catalogue": {"officialEntries": 286, "totalEntries": 288, "versionSourcesVerified": True,
                          "businessIds": business_ids, "referenceFilterCount": len(reference_ids),
                          "betaDoesNotInheritCoverage": True, "legacySysMLExplicit": True, "emptySearch": True},
            "editing": {"geometry": True, "invalidGeometryRefused": True, "newElementId": node_id,
                        "relationshipAdded": True, "deleteCleansEdges": True, "undoRedo": True,
                        "structuredEdit": True, "rejectedWithoutMutation": rejected},
            "screenshots": screenshots}
