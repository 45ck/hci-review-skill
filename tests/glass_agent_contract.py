"""Browser contract for the Liquid Glass kit's real UI SDK agent bridge."""

import asyncio
import json
from pathlib import Path


MANIFEST = Path(__file__).resolve().parents[1] / "packages/liquid-glass/component-manifest.json"
TIMEOUT_MS = 5000


async def verify_agent_contract(page, expect):
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    families = {item["id"]: item["name"] for item in manifest["components"]}
    assert len(families) == 55, "Update the agent contract when component coverage changes"
    await page.wait_for_function(
        "() => typeof window.quantitativeHciAgent?.snapshot === 'function'",
        timeout=TIMEOUT_MS,
    )
    facade = await page.evaluate("""() => ({
        frozen: Object.isFrozen(window.quantitativeHciAgent),
        writable: Object.getOwnPropertyDescriptor(window, 'quantitativeHciAgent').writable,
        methods: ['snapshot', 'query', 'act', 'subscribe'].every(
            key => typeof window.quantitativeHciAgent[key] === 'function')
    })""")
    assert facade == {"frozen": True, "writable": False, "methods": True}, facade

    async def call(method, arguments=None):
        try:
            return await asyncio.wait_for(
                page.evaluate("""async ({method, arguments: input}) => {
                    const bridge = window.quantitativeHciAgent;
                    if (method === 'snapshot') return bridge.snapshot();
                    if (method === 'query') return bridge.query(input);
                    if (method === 'act') return bridge.act(input);
                    throw new Error('Unknown contract operation');
                }""", {"method": method, "arguments": arguments}),
                timeout=TIMEOUT_MS / 1000,
            )
        except TimeoutError as error:
            raise AssertionError(f"SDK {method} exceeded {TIMEOUT_MS} ms") from error

    async def entry(kind, label):
        result = await call("query", {"kind": kind, "text": label})
        assert isinstance(result, list), f"Query failed for {label}: {result}"
        matches = [item for item in result if item.get("component") == kind
                   and item.get("label") == label and not item.get("offPage")]
        assert len(matches) == 1, f"Expected one named {kind} '{label}', got {matches}"
        return matches[0]

    async def choices(control, text=None):
        query = {"within": control["ref"]}
        if text is not None:
            query["text"] = text
        result = await call("query", query)
        assert isinstance(result, list), f"Choice query failed: {result}"
        matches = [item for item in result if item["ref"] == control["ref"]]
        assert len(matches) == 1, f"Missing queried control {control['ref']}: {result}"
        return matches[0]

    async def choice(control, label):
        result = await choices(control, label)
        matches = [item for item in result.get("items", []) if item["label"] == label]
        assert len(matches) == 1, f"Choice '{label}' is not discoverable: {result}"
        return matches[0]

    async def act(control, action, args, succeeds=True):
        if succeeds:
            assert action in control["actions"], f"{control} does not offer {action}"
        result = await call("act", {"steps": [{
            "ref": control["ref"], "action": action, "args": args,
        }]})
        assert result["ok"] is succeeds, f"Unexpected SDK action result: {result}"
        return result

    async def select_family(family):
        catalogue = await entry("listbox", "Component catalogue")
        option = await choice(catalogue, "Overview" if family == "overview" else families[family])
        await act(catalogue, "setValue", [option["value"]])
        if family == "overview":
            await expect(page.locator("[data-component-id]")).to_have_count(0, timeout=TIMEOUT_MS)
            stage = page.locator("[data-kit-view='overview']")
        else:
            await expect(page.locator("[data-component-id]")).to_have_count(1, timeout=TIMEOUT_MS)
            stage = page.locator(f"[data-component-id={json.dumps(family)}] .component-stage")
        await expect(stage).to_be_visible(timeout=TIMEOUT_MS)
        await expect(stage.locator(".demo-error")).to_have_count(0, timeout=TIMEOUT_MS)
        return stage

    await page.evaluate("""() => {
        const state = { events: [] };
        state.stop = window.quantitativeHciAgent.subscribe(change => {
            state.events.push(change);
            if (state.events.length > 200) state.events.shift();
        });
        window.__glassAgentContract = state;
    }""")
    verified_changes = []
    outcomes = {}
    try:
        search = await entry("input", "Search components")
        await act(search, "setValue", [""])
        catalogue = await entry("listbox", "Component catalogue")
        first_page = await choices(catalogue)
        available = {item["value"]: item["label"] for item in first_page.get("items", [])}
        expected_choices = {"overview": "Overview", **families}
        for family, label in expected_choices.items():
            if family not in available:
                item = await choice(catalogue, label)
                available[item["value"]] = item["label"]
        assert available == expected_choices, f"Agent catalogue differs from the manifest plus Overview: {available}"
        outcomes["catalogue"] = {
            "discoverableFamilies": len(families),
            "overviewAvailable": available.get("overview") == "Overview",
            "firstQueryChoices": len(first_page.get("items", [])),
            "queriedBeyondFirstPage": len(first_page.get("items", [])) < len(available),
        }

        stage = await select_family("overview")
        shell = {
            "Search components": "input",
            "Component catalogue": "listbox",
            "Material settings": "popover",
            "Copy starter": "button",
        }
        overview_names = {
            "Project name": "input", "Project access": "select",
            "Notifications": "switch", "Sound": "switch", "Volume": "slider",
            "Workspace view": "segmented-control", "Create project": "button",
            "New collection": "dialog", "More actions": "menu",
        }
        for label, kind in {**shell, **overview_names}.items():
            await entry(kind, label)
        snapshot = await call("snapshot")
        mounted = [item for item in snapshot if not item.get("offPage") and item["component"] != "more"]
        unnamed = [(item["ref"], item["component"]) for item in mounted if not item.get("label", "").strip()]
        assert not unnamed, f"Unnamed mounted SDK components: {unnamed}"
        await expect(page.locator(".agent-inspector, .agent-command-console, .reference-lens-stage")).to_have_count(0)
        outcomes["shellNames"] = list(shell)

        project = await entry("input", "Project name")
        project_value = "Agent-created studio"
        await act(project, "setValue", [project_value])
        await expect(stage.get_by_label("Project name", exact=True)).to_have_value(project_value, timeout=TIMEOUT_MS)
        verified_changes.append((project["ref"], "value", project_value))
        access = await entry("select", "Project access")
        team = await choice(access, "Team")
        await act(access, "setValue", [team["value"]])
        await expect(stage.get_by_role("combobox", name="Project access", exact=True)).to_contain_text(team["label"], timeout=TIMEOUT_MS)
        verified_changes.append((access["ref"], "value", team["value"]))
        notifications = await entry("switch", "Notifications")
        target = not notifications["checked"]
        await act(notifications, "setChecked", [target])
        await expect(stage.get_by_role("switch", name="Notifications", exact=True)).to_have_attribute("aria-checked", str(target).lower(), timeout=TIMEOUT_MS)
        verified_changes.append((notifications["ref"], "checked", target))
        workspace = await entry("segmented-control", "Workspace view")
        activity = await choice(workspace, "Activity")
        await act(workspace, "setValue", [activity["value"]])
        await expect(stage.get_by_text("No recent changes", exact=True)).to_be_visible(timeout=TIMEOUT_MS)
        verified_changes.append((workspace["ref"], "value", activity["value"]))
        await act(await entry("button", "Create project"), "press", [])
        await expect(stage.get_by_label("Project result", exact=True)).to_have_text("Created " + project_value, timeout=TIMEOUT_MS)

        collection = await entry("dialog", "New collection")
        await act(collection, "setOpen", [True])
        collection_dialog = page.get_by_role("dialog", name="Create a collection", exact=True)
        await expect(collection_dialog).to_be_visible(timeout=TIMEOUT_MS)
        collection_name = await entry("input", "Collection name")
        await act(collection_name, "setValue", ["Agent collection"])
        await expect(collection_dialog.get_by_label("Collection name", exact=True)).to_have_value("Agent collection", timeout=TIMEOUT_MS)
        await act(await entry("button", "Create collection"), "press", [])
        await expect(collection_dialog).not_to_be_visible(timeout=TIMEOUT_MS)
        await expect(stage.get_by_label("Collection result", exact=True)).to_have_text("Created Agent collection", timeout=TIMEOUT_MS)
        verified_changes.append((collection_name["ref"], "value", "Agent collection"))
        outcomes["overview"] = {"namedControls": list(overview_names), "projectCreated": True, "accessApplied": True, "notificationApplied": True, "workspaceChanged": True, "collectionCreated": True}

        search = await entry("input", "Search components")
        await act(search, "setValue", ["password"])
        await expect(page.get_by_label("Search components", exact=True)).to_have_value("password", timeout=TIMEOUT_MS)
        filtered = await choices(await entry("listbox", "Component catalogue"))
        assert [item["label"] for item in filtered.get("items", [])] == [families["password-input"]], filtered
        await act(await entry("input", "Search components"), "setValue", [""])
        outcomes["search"] = {"valueApplied": True, "catalogueFiltered": True}

        stage = await select_family("input")
        project = await entry("input", "Project name")
        project_value = "Agent contract project"
        await act(project, "setValue", [project_value])
        await expect(stage.get_by_label("Project name", exact=True)).to_have_value(project_value, timeout=TIMEOUT_MS)
        assert (await entry("input", "Project name"))["value"] == project_value
        verified_changes.append((project["ref"], "value", project_value))
        outcomes["input"] = {"domAndSnapshotAgree": True}

        stage = await select_family("select")
        surface = await entry("select", "Surface treatment")
        options = await choices(surface)
        if not options.get("items"):
            await act(surface, "setOpen", [True])
        solid = await choice(surface, "Solid surface")
        await act(surface, "setValue", [solid["value"]])
        await expect(stage.locator("[data-slot='select-trigger']")).to_contain_text(solid["label"], timeout=TIMEOUT_MS)
        assert (await entry("select", "Surface treatment"))["value"] == solid["value"]
        verified_changes.append((surface["ref"], "value", solid["value"]))
        outcomes["select"] = {"choiceFromQuery": solid, "domAndSnapshotAgree": True}

        stage = await select_family("switch")
        ambient = await entry("switch", "Ambient light")
        assert isinstance(ambient.get("checked"), bool), ambient
        target = not ambient["checked"]
        await act(ambient, "setChecked", [target])
        await expect(stage.get_by_role("switch", name="Ambient light", exact=True)).to_have_attribute("aria-checked", str(target).lower(), timeout=TIMEOUT_MS)
        assert (await entry("switch", "Ambient light"))["checked"] is target
        verified_changes.append((ambient["ref"], "checked", target))
        locked = await entry("switch", "Locked setting")
        assert locked.get("disabled") is True and locked["actions"] == [], locked
        await expect(stage.get_by_role("switch", name="Locked setting", exact=True)).to_be_disabled(timeout=TIMEOUT_MS)
        refused = await act(locked, "setChecked", [not locked["checked"]], succeeds=False)
        await expect(stage.get_by_role("switch", name="Locked setting", exact=True)).to_have_attribute("aria-checked", str(locked["checked"]).lower(), timeout=TIMEOUT_MS)
        assert (await entry("switch", "Locked setting"))["checked"] is locked["checked"]
        outcomes["switch"] = {"changed": True, "disabledRefused": True, "refusal": refused["error"]["message"]}

        stage = await select_family("dialog")
        dialog_entry = await entry("dialog", "Save a preset")
        await act(dialog_entry, "setOpen", [True])
        dialog = page.get_by_role("dialog", name="Save your material", exact=True)
        await expect(dialog).to_be_visible(timeout=TIMEOUT_MS)
        preset = await entry("input", "Preset name")
        preset_value = "Agent contract preset"
        await act(preset, "setValue", [preset_value])
        await expect(dialog.get_by_label("Preset name", exact=True)).to_have_value(preset_value, timeout=TIMEOUT_MS)
        open_dialog = await entry("dialog", "Save your material")
        save_button = next((label for label in open_dialog.get("buttons", []) if label == "Save preset"), None)
        assert save_button, f"Save action absent from dialog snapshot: {open_dialog}"
        await act(open_dialog, "press", [save_button])
        await expect(dialog).not_to_be_visible(timeout=TIMEOUT_MS)
        await expect(stage.locator("output")).to_have_text(f"Saved “{preset_value}” in this specimen.", timeout=TIMEOUT_MS)
        verified_changes.append((preset["ref"], "value", preset_value))
        outcomes["dialog"] = {"opened": True, "presetSaved": True, "closed": True}

        stage = await select_family("password-input")
        password = await entry("password-input", "Sample password")
        assert password.get("value") == "[redacted]", password
        sample = "agent-contract-sample-47"
        password_result = await act(password, "setValue", [sample])
        await expect(stage.get_by_label("Sample password", exact=True)).to_have_value(sample, timeout=TIMEOUT_MS)
        await act(await entry("password-input", "Sample password"), "setVisible", [True])
        await expect(stage.get_by_label("Sample password", exact=True)).to_have_attribute("type", "text", timeout=TIMEOUT_MS)
        assert (await entry("password-input", "Sample password"))["value"] == "[redacted]"
        assert sample not in json.dumps(password_result), "Act result exposed the password"
        assert sample not in json.dumps(await call("snapshot")), "Snapshot exposed a revealed password"
        events = await page.evaluate("window.__glassAgentContract.events")
        assert sample not in json.dumps(events), "Subscription exposed the password"
        verified_changes.append((password["ref"], "value", "[redacted]"))
        outcomes["password"] = {"snapshotRedacted": True, "actRedacted": True, "subscriptionRedacted": True, "redactedWhenRevealed": True}

        stage = await select_family("alert-dialog")
        alert_entry = await entry("alert-dialog", "Reset this specimen")
        before = await stage.locator("output").inner_text()
        await act(alert_entry, "setOpen", [True])
        alert = page.get_by_role("alertdialog", name="Reset the specimen?", exact=True)
        await expect(alert).to_be_visible(timeout=TIMEOUT_MS)
        confirm_button = alert.get_by_role("button", name="Reset specimen", exact=True)
        await expect(confirm_button).to_be_enabled(timeout=TIMEOUT_MS)
        mark = await confirm_button.get_attribute("data-agent-confirm")
        assert mark, "Final confirmation lacks a data-agent-confirm consequence"
        open_alert = await entry("alert-dialog", "Reset the specimen?")
        assert "Reset specimen" in open_alert.get("buttons", []), open_alert
        refusal = await act(open_alert, "press", ["Reset specimen"], succeeds=False)
        assert mark in refusal["error"]["message"], f"Refusal did not identify the marked consequence: {refusal}"
        await expect(stage.locator("output")).to_have_text(before, timeout=TIMEOUT_MS)
        await expect(alert).to_be_visible(timeout=TIMEOUT_MS)
        await act(await entry("alert-dialog", "Reset the specimen?"), "press", ["Keep it"])
        await expect(alert).not_to_be_visible(timeout=TIMEOUT_MS)
        await expect(stage.locator("output")).to_have_text(before, timeout=TIMEOUT_MS)
        outcomes["confirmation"] = {"mark": mark, "refused": True, "stateUnchanged": True, "cancelAvailable": True, "refusal": refusal["error"]["message"]}

        events = await page.evaluate("window.__glassAgentContract.events")
        for ref, key, value in verified_changes:
            matches = [event for event in events if event["ref"] == ref
                       and event["key"] == key and event["value"] == value]
            assert matches, f"No subscription change for {ref}.{key}"
            assert any(event["source"] == "agent" for event in matches), matches
        assert not any(event["ref"] == locked["ref"] and event["key"] == "checked" for event in events), "Disabled action emitted a state change"
        outcomes["changeSources"] = {
            "verifiedAgentChanges": len(verified_changes),
            "observedSources": sorted({event["source"] for event in events}),
        }
        await select_family("overview")
        return {"facade": facade, "perOperationTimeoutMs": TIMEOUT_MS, **outcomes}
    finally:
        await page.evaluate("""() => {
            window.__glassAgentContract?.stop();
            delete window.__glassAgentContract;
        }""")
