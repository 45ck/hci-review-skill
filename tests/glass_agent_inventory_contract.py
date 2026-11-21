"""Require the real specimen, not just the gallery shell, in SDK discovery."""

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
    snapshot = await page.evaluate("window.quantitativeHciAgent.snapshot()")
    discovered = assert_specimen_entries(specimen, snapshot)
    stage = page.locator(f'[data-component-id="{specimen}"] .component-stage')
    unowned = await stage.evaluate("""root => [...root.querySelectorAll(
        'button,input,textarea,select,[contenteditable="true"],[role="button"],[role="switch"],[role="slider"]'
    )].filter(element => element.getClientRects().length > 0 &&
        element.checkVisibility({visibilityProperty: true, opacityProperty: true}) &&
        !element.closest('[aria-hidden="true"],[data-agent-hidden],[hidden],[inert]') &&
        !element.hasAttribute('data-slot')
    ).map(element => ({tag: element.tagName, role: element.getAttribute('role'),
        name: element.getAttribute('aria-label') || element.textContent.trim().slice(0, 100)}))""")
    assert not unowned, f"{specimen}: visible controls lack an SDK part: {unowned}"
    if specimen == "separator":
        await expect(stage.get_by_role("separator", name="Collection summary divider", exact=True)).to_be_visible()
        return {"family": specimen, "mode": "semantic-dom", "reason": "Upstream separator declares agent.shown false.",
                "unownedControls": unowned}
    return {"family": specimen, "mode": "sdk-discovery", "entries": discovered,
            "unownedControls": unowned}
