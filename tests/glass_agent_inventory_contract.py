"""Require the real specimen, not just the gallery shell, in SDK discovery."""

import asyncio
import json


# Field/Label/Preferences expose their task controls; Separator is explicitly
# hidden by the pinned upstream primitive and has a semantic DOM assertion.
SPECIMEN_NAMES = {
    "accordion": [("Material questions",)],
    "alert-dialog": [("Reset this specimen",)],
    "autocomplete": [("Find a destination",)],
    "avatar": [("Illustrated team member",), ("Design team",), ("Research team",)],
    "button": [("Add to collection",), ("Unavailable",)],
    "calendar": [("Review calendar",)],
    "carousel": [("Material moodboard",)],
    "checkbox": [("Keyboard navigation",), ("Touch interactions",), ("Screen reader labels",)],
    "collapsible": [("Material details",)],
    "color-picker": [("Accent colour",)],
    "combobox": [("Search materials",)],
    "command": [("Specimen commands", "Search specimen commands")],
    "date-input": [("Review date",)],
    "date-picker": [("Choose a review date", "Open review calendar")],
    "dialog": [("Save a preset",)],
    "drawer": [("Arrange workspace",)],
    "field": [("Email address",), ("Check address",)],
    "file-input": [("Local sample files",)],
    "hover-card": [("Quantitative HCI",)],
    "image-cropper": [("Crop illustrated landscape",)],
    "input": [("Project name",), ("Workspace",)],
    "label": [("Click this label to focus the name",)],
    "listbox": [("Preview backgrounds",)],
    "menu": [("Collection actions",)],
    "menubar": [("Specimen document menus",), ("File",), ("Edit",), ("View",)],
    "meter": [("Specimen storage",), ("Add sample asset",)],
    "navigation-menu": [("Library specimen navigation",)],
    "number-input": [("Corner radius",)],
    "otp-input": [("Six-digit preview code",)],
    "pagination": [("Specimen pages",)],
    "password-input": [("Sample password",)],
    "popover": [("Quick settings",)],
    "preferences": [("Comfortable",), ("Compact",)],
    "progress": [("Sample export",), ("Advance export",)],
    "radio": [("Rendering preference",)],
    "rating": [("Rate this material",)],
    "resizable": [("Library and canvas layout",)],
    "scroll-area": [("Material collection scroller",)],
    "segmented-control": [("Preview lighting",)],
    "separator": [],
    "select": [("Surface treatment",)],
    "slider": [("Frost intensity",)],
    "switch": [("Ambient light",), ("Edge highlights",), ("Locked setting",)],
    "tabs": [("Specimen details",)],
    "textarea": [("Design notes",)],
    "time-input": [("Review time",)],
    "timeline": [("Illustrative design session",), ("Show final step",)],
    "toast": [("Save and notify",)],
    "toggle": [("Save material",)],
    "token-input": [("Component note",)],
    "toolbar": [("Sample text formatting",), ("Bold sample",), ("Italic sample",), ("Underline sample",)],
    "tooltip": [("Bookmark specimen",)],
    "tree": [("Specimen library files",)],
    "trigger-menu": [("Draft note with mentions",)],
    "waterfall": [("Illustrative resource loading, milliseconds",)],
}


def assert_specimen_entries(specimen, snapshot):
    assert specimen in SPECIMEN_NAMES, f"Add a reviewed discovery expectation for {specimen}"
    assert not any(entry.get("component") == "more" for entry in snapshot), (
        f"{specimen}: a truncated snapshot cannot establish complete naming coverage; "
        "split the specimen or query each expected component explicitly"
    )
    entries = [entry for entry in snapshot if not entry.get("offPage")]
    unnamed = [{"component": entry.get("component"), "ref": entry.get("ref")}
               for entry in entries if not str(entry.get("label", "")).strip()]
    assert not unnamed, f"{specimen}: unnamed SDK entries: {json.dumps(unnamed)}"
    names = {" ".join(entry["label"].split()) for entry in entries}
    missing = [list(alternatives) for alternatives in SPECIMEN_NAMES[specimen]
               if not any(label in names for label in alternatives)]
    assert not missing, (
        f"{specimen}: specimen controls are absent from SDK discovery: {missing}; "
        f"available labels: {sorted(names)}"
    )
    expected = {label for alternatives in SPECIMEN_NAMES[specimen] for label in alternatives}
    return [{"component": entry["component"], "label": entry["label"],
             "actions": entry.get("actions", []), "disabled": entry.get("disabled", False)}
            for entry in entries if " ".join(entry["label"].split()) in expected]


async def verify_foundation_specimen(page, expect, specimen):
    observation = None
    names = set()

    async def registered_specimen():
        nonlocal observation, names
        while True:
            # React may paint the specimen before its SDK registration. Batch
            # read-only evidence, but require both within the existing 5 s bound.
            observation = await page.evaluate("""specimen => {
                const mounted = [...document.querySelectorAll('[data-component-id]')];
                const root = mounted.find(node => node.dataset.componentId === specimen);
                const stage = root?.querySelector('.component-stage');
                const box = root?.getBoundingClientRect();
                const visible = Boolean(box?.width && box.height &&
                    root.checkVisibility({visibilityProperty: true}));
                const snapshot = window.quantitativeHciAgent?.snapshot?.() ?? null;
                const unowned = stage ? [...stage.querySelectorAll(
                    'button,input,textarea,select,[contenteditable="true"],[role="button"],[role="switch"],[role="slider"]'
                )].filter(element => element.getClientRects().length > 0 &&
                    element.checkVisibility({visibilityProperty: true, opacityProperty: true}) &&
                    !element.closest('[aria-hidden="true"],[data-agent-hidden],[hidden],[inert]') &&
                    !element.hasAttribute('data-slot')
                ).map(element => ({tag: element.tagName, role: element.getAttribute('role'),
                    name: element.getAttribute('aria-label') || element.textContent.trim().slice(0, 100)})) : [];
                return {mounted: mounted.map(node => node.dataset.componentId), visible,
                    stageFound: Boolean(stage), snapshot, unowned,
                    errors: [...document.querySelectorAll('.demo-error')].map(node => node.textContent)};
            }""", specimen)
            snapshot = observation["snapshot"]
            names = {" ".join(entry.get("label", "").split()) for entry in snapshot or []
                     if not entry.get("offPage")}
            if (observation["mounted"] == [specimen] and observation["visible"]
                    and observation["stageFound"] and not observation["errors"]
                    and snapshot is not None
                    and all(any(label in names for label in alternatives)
                            for alternatives in SPECIMEN_NAMES[specimen])):
                return observation
            await asyncio.sleep(0.025)

    try:
        observation = await asyncio.wait_for(registered_specimen(), timeout=5)
    except TimeoutError as error:
        state = {key: observation[key] for key in ("mounted", "visible", "stageFound", "errors")} if observation else None
        raise AssertionError(
            f"{specimen}: specimen DOM and SDK registration did not become ready within 5000 ms; "
            f"state={state}; available labels={sorted(names)}"
        ) from error
    assert observation["mounted"] == [specimen], observation
    assert observation["visible"] and observation["stageFound"], observation
    assert not observation["errors"], observation["errors"]
    discovered = assert_specimen_entries(specimen, observation["snapshot"])
    unowned = observation["unowned"]
    assert not unowned, f"{specimen}: visible controls lack an SDK part: {unowned}"
    if specimen == "separator":
        stage = page.locator(f'[data-component-id="{specimen}"] .component-stage')
        await expect(stage.get_by_role("separator", name="Collection summary divider", exact=True)).to_be_visible()
        return {"family": specimen, "mode": "semantic-dom", "reason": "Upstream separator declares agent.shown false.",
                "unownedControls": unowned}
    return {"family": specimen, "mode": "sdk-discovery", "entries": discovered,
            "unownedControls": unowned}
