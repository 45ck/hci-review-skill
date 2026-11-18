#!/usr/bin/env python3
"""Measure a fixed UI SDK fixture. No model calls or human usability claims."""

import argparse
from datetime import datetime, timezone
import gzip
import hashlib
import importlib.metadata
import json
from pathlib import Path
import platform
from statistics import median
import subprocess
import sys
from time import perf_counter

ROOT = Path(__file__).resolve().parents[3]
APP = ROOT / "docs/hci/examples/ui-sdk-pilot"
INITIAL = {"region": "sydney", "retention": "30", "digest": False}
FULL = {"region": "singapore", "retention": "90", "digest": True}
SET_FULL = [("region", "singapore"), ("retention", "90"), ("digest", True)]
SAVE = ("save", None)
CASES = [
    ("T1", [("region", "frankfurt"), SAVE], {**INITIAL, "region": "frankfurt"}, 1),
    ("T2", [("retention", "90"), SAVE], {**INITIAL, "retention": "90"}, 1),
    ("T3", [("digest", True), SAVE], {**INITIAL, "digest": True}, 1),
    ("T4", [*SET_FULL, SAVE], FULL, 1),
    ("T5", [*SET_FULL, *INITIAL.items()], INITIAL, 0),
    ("T6", [*SET_FULL, SAVE, ("region", "sydney"), SAVE], {**FULL, "region": "sydney"}, 2),
]
ARMS = ("native-dom", "sdk-dom", "sdk-bridge")
PROFILES = {
    "desktop": {"viewport": {"width": 1280, "height": 800}},
    "mobile": {"viewport": {"width": 390, "height": 844}, "is_mobile": True, "has_touch": True, "device_scale_factor": 2},
    "reduced-motion": {"viewport": {"width": 390, "height": 844}, "is_mobile": True, "has_touch": True, "device_scale_factor": 2, "reduced_motion": "reduce"},
}
LABELS = {"region": "Region", "retention": "Retention", "digest": "Weekly digest", "save": "Save settings"}
OPTIONS = {"sydney": "Sydney", "frankfurt": "Frankfurt", "singapore": "Singapore", "30": "30 days", "90": "90 days", "365": "365 days"}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def command_output(args):
    try:
        return subprocess.check_output(args, cwd=ROOT, text=True, stderr=subprocess.DEVNULL).strip()
    except (OSError, subprocess.CalledProcessError):
        return None


def read_state(page):
    """Observe rendered application output without consulting the bridge result."""
    return page.evaluate("""() => ({
        draft: JSON.parse(document.querySelector('[data-testid="draft-state"]').textContent),
        saved: JSON.parse(document.querySelector('[data-testid="saved-state"]').textContent),
        save_count: Number(document.querySelector('[data-testid="save-count"]').textContent),
        save_disabled: document.querySelector('button[aria-label="Save settings"]')?.disabled
            ?? [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Save settings')?.disabled,
        horizontal_overflow: document.documentElement.scrollWidth > innerWidth + 1
    })""")


def bridge_step(field, value):
    if field == "save":
        return {"ref": LABELS[field], "action": "press"}
    return {"ref": LABELS[field], "action": "setChecked" if field == "digest" else "setValue", "args": [value]}


def bridge_act(page, step):
    return page.evaluate("""async step => {
        let timer;
        try {
            return await Promise.race([
                window.uiSdkAgent.act({steps: [step]}),
                new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Bridge action exceeded 20 seconds')), 20000); })
            ]);
        } finally { clearTimeout(timer); }
    }""", step)


def operate(page, arm, field, value, event=None):
    """Return the explicit action calls made here, not protocol or model calls."""
    event = event if event is not None else {}
    event["automation_action_commands"] = 1
    if arm == "sdk-bridge":
        event["act_steps"] = 1
        response = bridge_act(page, bridge_step(field, value))
        return {"automation_action_commands": 1, "bridge_response": response, "act_steps": 1}
    if field == "save":
        page.get_by_role("button", name=LABELS[field], exact=True).click()
    elif field == "digest":
        page.get_by_role("checkbox", name=LABELS[field], exact=True).set_checked(value)
    elif arm == "native-dom":
        page.get_by_label(LABELS[field], exact=True).select_option(value)
    else:
        page.get_by_role("combobox", name=LABELS[field], exact=True).click()
        event["automation_action_commands"] = 2
        page.get_by_role("option", name=OPTIONS[value], exact=True).click()
        return {"automation_action_commands": 2}
    return {"automation_action_commands": 1}


def open_fixture(browser, base_url, arm, settings, query=""):
    context = browser.new_context(**settings)
    page = context.new_page()
    page.set_default_timeout(5000)
    page.set_default_navigation_timeout(15000)
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    entry = "baseline.html" if arm == "native-dom" else "sdk.html"
    try:
        page.goto(f"{base_url}/{entry}{query}", wait_until="networkidle")
        page.wait_for_function("window.pilotReady === true")
        return context, page, errors
    except Exception:
        context.close()
        raise


def collect_trial(browser, args, profile, arm, case, repeat, order):
    case_id, steps, expected, saves = case
    row = {"profile": profile, "arm": arm, "task": case_id, "repeat": repeat,
           "arm_order": list(order), "expected_state": expected, "expected_saves": saves,
           "planned_semantic_actions": len(steps), "trace": [], "success": False}
    context = None
    started = None
    try:
        context, page, errors = open_fixture(browser, args.base_url, arm, PROFILES[profile])
        row["initial_state"] = read_state(page)
        assert row["initial_state"]["saved"] == INITIAL and row["initial_state"]["draft"] == INITIAL
        assert row["initial_state"]["save_count"] == 0
        observation = (page.evaluate("() => window.uiSdkAgent.snapshot()") if arm == "sdk-bridge"
                       else page.get_by_role("form", name="Project settings").aria_snapshot())
        row["initial_observation"] = observation
        row["observation_utf8_bytes"] = len(json.dumps(observation, ensure_ascii=False).encode("utf-8"))
        row["observation_commands"] = 1
        row["verification_commands"] = 2  # initial + final independent read_state calls
        started = perf_counter()
        for field, value in steps:
            event = {"field": field, "value": value}
            row["trace"].append(event)  # preserve attempted steps even if the call fails
            event.update(operate(page, arm, field, value, event))
            if arm == "sdk-bridge" and event["bridge_response"].get("ok") is not True:
                raise AssertionError(f"Bridge rejected routine step: {event['bridge_response']}")
        # Same render-settlement command in every arm, separate from counted action commands.
        page.evaluate("""() => new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Render settlement exceeded 5 seconds')), 5000);
            requestAnimationFrame(() => requestAnimationFrame(() => {clearTimeout(timer); resolve();}));
        })""")
        row["settlement_commands"] = 1
        row["final_state"] = read_state(page)
        row["page_errors"] = errors
        final = row["final_state"]
        row["success"] = (final["saved"] == expected and final["draft"] == expected
                          and final["save_count"] == saves and final["save_disabled"] is True
                          and not final["horizontal_overflow"] and not errors)
        if not row["success"]:
            row["error"] = "Independent final-state or layout/error check did not match."
    except Exception as error:
        row["error"] = f"{type(error).__name__}: {error}"
        if context:
            try:
                row["final_state"] = read_state(page)
                row["page_errors"] = errors
            except Exception:
                pass
    finally:
        row["scripted_duration_ms"] = round((perf_counter() - started) * 1000, 3) if started else None
        row["attempted_semantic_actions"] = len(row["trace"])
        row["automation_action_commands"] = sum(e.get("automation_action_commands", 0) for e in row["trace"])
        row["act_requests"] = sum("act_steps" in e for e in row["trace"])
        if context:
            context.close()
    return row


def guardrails(browser, args, profiles):
    results = []

    def check(name, arm, profile, operation, query=""):
        result = {"check": name, "arm": arm, "profile": profile, "success": False}
        context = None
        try:
            context, page, errors = open_fixture(browser, args.base_url, arm, PROFILES[profile], query)
            result.update(operation(page))
            result["page_errors"] = errors
            result["success"] = result.get("success", False) and not errors
        except Exception as error:
            result["error"] = f"{type(error).__name__}: {error}"
        finally:
            if context:
                context.close()
        results.append(result)

    def unchanged_attempt(page, step, require_denial=True):
        before = read_state(page)
        response = bridge_act(page, step)
        after = read_state(page)
        return {"step": step, "response": response, "before": before, "after": after,
                "success": before == after and (not require_denial or response.get("ok") is False)}

    for profile in profiles:
        for name, step, query in [
            ("readonly-save", bridge_step("save", None), "?readonly=1"),
            ("readonly-edit", bridge_step("region", "frankfurt"), "?readonly=1"),
            ("unknown-reference", {"ref": "Missing control", "action": "press"}, ""),
            ("unsupported-action", {"ref": "Region", "action": "delete"}, ""),
            ("invalid-option", bridge_step("region", "invalid-region"), ""),
        ]:
            check(name, "sdk-bridge", profile, lambda page, step=step: unchanged_attempt(page, step), query)

        def cancelled(page):
            result = unchanged_attempt(page, bridge_step("retention", "365"), False)
            result["requested_value_applied"] = result["after"]["draft"]["retention"] == "365"
            result["success"] = result["success"] and not result["requested_value_applied"]
            return result

        check("cancelled-change-verifier", "sdk-bridge", profile, cancelled, "?reject=1")

        def repeat_save(page):
            operate(page, "sdk-bridge", "region", "frankfurt")
            operate(page, "sdk-bridge", "save", None)
            before = read_state(page)
            response = bridge_act(page, bridge_step("save", None))
            after = read_state(page)
            return {"before": before, "response": response, "after": after,
                    "success": before == after and after["save_count"] == 1 and after["save_disabled"] is True}

        check("repeat-save", "sdk-bridge", profile, repeat_save)

        for arm in ("native-dom", "sdk-dom"):
            def keyboard(page, arm=arm):
                focus_order = []
                for label in ("Region", "Retention"):
                    page.keyboard.press("Tab")
                    control = page.get_by_role("combobox", name=label, exact=True)
                    focused = control.evaluate("el => document.activeElement === el")
                    focus_order.append({"label": label, "focused": focused})
                    assert focused, f"Tab did not reach {label}"
                    if arm == "sdk-dom":
                        page.keyboard.press("Enter")
                    page.keyboard.press("Home")
                    page.keyboard.press("ArrowDown")
                    if arm == "sdk-dom":
                        page.keyboard.press("Enter")
                digest = page.get_by_role("checkbox", name="Weekly digest", exact=True)
                page.keyboard.press("Tab")
                focus = digest.evaluate("el => {const s=getComputedStyle(el); return {focused:document.activeElement===el, outline:s.outlineStyle, width:s.outlineWidth, shadow:s.boxShadow}}")
                focus_order.append({"label": "Weekly digest", "focused": focus["focused"]})
                assert focus["focused"], "Tab did not reach Weekly digest"
                page.keyboard.press("Space")
                save = page.get_by_role("button", name="Save settings", exact=True)
                page.keyboard.press("Tab")
                focused = save.evaluate("el => document.activeElement === el")
                focus_order.append({"label": "Save settings", "focused": focused})
                assert focused, "Tab did not reach Save settings"
                page.keyboard.press("Enter")
                final = read_state(page)
                expected = {"region": "frankfurt", "retention": "90", "digest": True}
                focus_visible = focus["focused"] and ((focus["outline"] != "none" and focus["width"] != "0px") or focus["shadow"] != "none")
                return {"after": final, "focus": focus, "focus_order": focus_order,
                        "success": final["saved"] == expected and final["draft"] == expected
                        and final["save_count"] == 1 and final["save_disabled"] is True and focus_visible}

            check("keyboard-traversal-and-save", arm, profile, keyboard)

            def layout(page, arm=arm, profile=profile):
                controls = []
                for role, label in [("combobox", "Region"), ("combobox", "Retention"), ("checkbox", "Weekly digest"), ("button", "Save settings")]:
                    control = page.get_by_role(role, name=label, exact=True)
                    controls.append({"label": label, "visible": control.is_visible(), "bounds": control.bounding_box()})
                final = read_state(page)
                screenshot = None
                if args.screenshots:
                    args.screenshots.mkdir(parents=True, exist_ok=True)
                    path = args.screenshots / f"{profile}-{arm}.png"
                    page.screenshot(path=str(path), full_page=True)
                    screenshot = path.name
                return {"controls": controls, "after": final, "screenshot": screenshot,
                        "success": all(c["visible"] and c["bounds"]["width"] > 0 and c["bounds"]["height"] > 0 for c in controls) and not final["horizontal_overflow"]}

            check("layout-and-labels", arm, profile, layout)
    return results


def bundle_sizes():
    manifest_path = APP / "dist/.vite/manifest.json"
    if not manifest_path.exists():
        return {"error": "Build manifest unavailable; run npm run build."}
    manifest = json.loads(manifest_path.read_text())
    result = {"method": "Initial unique static entry JS/CSS assets plus separate all-reachable totals including dynamic imports; sum of gzip.compress(level=9, mtime=0) per asset; HTML/source maps excluded. Reachable assets need not all load in a trial."}
    for entry in ("baseline.html", "sdk.html"):
        seen, files = set(), set()

        def visit(key, dynamic=False):
            if key in seen:
                return
            seen.add(key)
            chunk = manifest[key]
            files.add(chunk["file"])
            files.update(chunk.get("css", []))
            for dep in chunk.get("imports", []) + (chunk.get("dynamicImports", []) if dynamic else []):
                visit(dep, dynamic)

        visit(entry)
        assets = []
        for name in sorted(files):
            raw = (APP / "dist" / name).read_bytes()
            assets.append({"file": name, "bytes": len(raw), "gzip_bytes": len(gzip.compress(raw, compresslevel=9, mtime=0)), "sha256": hashlib.sha256(raw).hexdigest()})
        result[entry] = {"assets": assets, "bytes": sum(x["bytes"] for x in assets), "gzip_bytes": sum(x["gzip_bytes"] for x in assets)}
        seen, files = set(), set()
        visit(entry, True)
        reachable = [(APP / "dist" / name).read_bytes() for name in sorted(files)]
        result[entry]["all_reachable_files"] = sorted(files)
        result[entry]["all_reachable_bytes"] = sum(map(len, reachable))
        result[entry]["all_reachable_gzip_bytes"] = sum(len(gzip.compress(raw, compresslevel=9, mtime=0)) for raw in reachable)
    result["sdk_increment_bytes"] = result["sdk.html"]["bytes"] - result["baseline.html"]["bytes"]
    result["sdk_increment_gzip_bytes"] = result["sdk.html"]["gzip_bytes"] - result["baseline.html"]["gzip_bytes"]
    result["sdk_all_reachable_increment_gzip_bytes"] = result["sdk.html"]["all_reachable_gzip_bytes"] - result["baseline.html"]["all_reachable_gzip_bytes"]
    return result


def summarise(trials, profiles):
    summary = {}
    for profile in profiles:
        by_arm = {}
        for arm in ARMS:
            rows = [x for x in trials if x["profile"] == profile and x["arm"] == arm]
            successes = [x for x in rows if x["success"]]
            by_arm[arm] = {
                "attempts": len(rows), "successes": len(successes),
                "successful_scripted_duration_median_ms": median(x["scripted_duration_ms"] for x in successes) if successes else None,
                "automation_action_commands": sum(x["automation_action_commands"] for x in rows),
                "attempted_semantic_actions": sum(x["attempted_semantic_actions"] for x in rows),
            }
        pairs = []
        for baseline in [x for x in trials if x["profile"] == profile and x["arm"] == "sdk-dom"]:
            candidate = next((x for x in trials if x["profile"] == profile and x["arm"] == "sdk-bridge" and x["task"] == baseline["task"] and x["repeat"] == baseline["repeat"]), None)
            complete = bool(candidate and baseline["success"] and candidate["success"])
            pairs.append({"task": baseline["task"], "repeat": baseline["repeat"], "complete_pair": complete,
                          "missing_candidate": candidate is None,
                          "dom_minus_bridge_ms": round(baseline["scripted_duration_ms"] - candidate["scripted_duration_ms"], 3) if complete else None})
        gains = [x["dom_minus_bridge_ms"] for x in pairs if x["complete_pair"]]
        summary[profile] = {"arms": by_arm, "sdk_dom_bridge_pairs": pairs, "complete_pair_median_delta_ms": median(gains) if gains else None}
    return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:4178")
    parser.add_argument("--repeats", type=int, default=3)
    parser.add_argument("--profile", choices=["all", *PROFILES], default="all")
    parser.add_argument("--executable", help="Optional existing Chromium executable")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--screenshots", type=Path)
    args = parser.parse_args()
    if args.repeats < 1:
        parser.error("--repeats must be positive")
    from playwright.sync_api import sync_playwright
    profiles = list(PROFILES) if args.profile == "all" else [args.profile]
    files = [p for p in APP.rglob("*") if p.is_file() and not set(p.relative_to(APP).parts) & {"node_modules", "dist", "results"}]
    files += [Path(__file__), Path(__file__).with_name("ui-sdk-pilot-protocol.md")]
    report = {
        "schema_version": 1, "evidence": "controlled scripted Chromium fixture; descriptive only",
        "started_at_utc": datetime.now(timezone.utc).isoformat(),
        "source_commit": command_output(["git", "rev-parse", "HEAD"]),
        "tracked_source_dirty": bool(command_output(["git", "status", "--porcelain", "--untracked-files=no"])),
        "file_sha256": {str(p.relative_to(ROOT)): sha(p) for p in sorted(files)},
        "python": platform.python_version(), "playwright": importlib.metadata.version("playwright"),
        "node": command_output(["node", "--version"]), "platform": platform.platform(),
        "command": ["python3", "docs/hci/models/run-ui-sdk-pilot.py", *sys.argv[1:]],
        "profiles": {name: PROFILES[name] for name in profiles}, "repeats": args.repeats,
        "counting_boundary": "Explicit harness action calls only; setup, observation, settlement and independent verification are separate. Every bridge act contains one step. No model calls.",
        "unmeasured": ["LLM tokens", "LLM task success", "model or API cost", "coding productivity", "human task time", "screen reader", "backend persistence", "full WCAG conformance"],
        "trials": [], "guardrails": [], "bundle": bundle_sizes(),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False, allow_nan=False) + "\n")
    raw_path = args.output.with_suffix(".jsonl")
    raw_path.write_text("")
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path=args.executable)
            report["chromium"] = browser.version
            try:
                for profile in profiles:
                    for repeat in range(args.repeats):
                        order = ARMS[repeat % 3:] + ARMS[:repeat % 3]
                        for case in CASES:
                            for arm in order:
                                row = collect_trial(browser, args, profile, arm, case, repeat + 1, order)
                                report["trials"].append(row)
                                with raw_path.open("a") as log:
                                    log.write(json.dumps({"record": "trial", **row}, ensure_ascii=False, allow_nan=False) + "\n")
                                print(f"{profile} {repeat+1} {case[0]} {arm}: {'PASS' if row['success'] else 'FAIL'}", file=sys.stderr)
                report["guardrails"] = guardrails(browser, args, profiles)
            finally:
                browser.close()
    except Exception as error:
        report["infrastructure_error"] = f"{type(error).__name__}: {error}"
    report["finished_at_utc"] = datetime.now(timezone.utc).isoformat()
    if report["trials"]:
        report["summary"] = summarise(report["trials"], profiles)
    expected = len(profiles) * args.repeats * len(CASES) * len(ARMS)
    report["scheduled_attempts"] = expected
    report["success"] = (len(report["trials"]) == expected and all(x["success"] for x in report["trials"])
                         and len(report["guardrails"]) == len(profiles) * 11 and all(x["success"] for x in report["guardrails"])
                         and "error" not in report["bundle"] and "infrastructure_error" not in report)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False, allow_nan=False) + "\n")
    print(json.dumps({"success": report["success"], "routine_passed": sum(x["success"] for x in report["trials"]), "scheduled": expected,
                      "guardrails_passed": sum(x["success"] for x in report["guardrails"]), "guardrails_run": len(report["guardrails"]), "output": str(args.output)}))
    return 0 if report["success"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
