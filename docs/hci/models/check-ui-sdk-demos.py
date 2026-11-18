#!/usr/bin/env python3
"""Exercise the interactive demo hub, separately from the recorded HCI benchmark.

Run against a production build served locally. These are functional integration
checks, not new performance measurements or model/human usability observations.
"""

import argparse
import csv
from datetime import datetime, timezone
import gzip
import hashlib
import io
import json
from pathlib import Path
import re
import sys
from urllib.parse import urljoin


INITIAL = {"region": "sydney", "retention": "30", "digest": False}
FULL = {"region": "singapore", "retention": "90", "digest": True}
EXPECTED = {
    "T1": ({**INITIAL, "region": "frankfurt"}, 1),
    "T2": ({**INITIAL, "retention": "90"}, 1),
    "T3": ({**INITIAL, "digest": True}, 1),
    "T4": (FULL, 1),
    "T5": (INITIAL, 0),
    "T6": ({**FULL, "region": "sydney"}, 2),
}


def read_state(frame):
    """Read the fixture's rendered outcome, never the hub's claimed verdict."""
    return {
        "saved": json.loads(frame.get_by_test_id("saved-state").inner_text()),
        "draft": json.loads(frame.get_by_test_id("draft-state").inner_text()),
        "save_count": int(frame.get_by_test_id("save-count").inner_text()),
        "save_disabled": frame.get_by_role("button", name="Save settings", exact=True).is_disabled(),
        "horizontal_overflow": frame.evaluate(
            "document.documentElement.scrollWidth > innerWidth + 1"
        ),
    }


def frame_ready(page, test_id):
    page.get_by_test_id(test_id).wait_for(state="attached")
    page.get_by_test_id(test_id).scroll_into_view_if_needed()
    page.wait_for_function(
        "id => document.querySelector(`[data-testid=\"${id}\"]`)?.contentWindow?.pilotReady === true",
        arg=test_id,
    )
    frame = page.get_by_test_id(test_id).element_handle().content_frame()
    assert frame is not None, f"No content frame for {test_id}"
    return frame


def assert_outcome(frame, expected, saves):
    actual = read_state(frame)
    assert actual["saved"] == expected, f"Saved state differs: {actual}"
    assert actual["draft"] == expected, f"Draft differs: {actual}"
    assert actual["save_count"] == saves, f"Save count differs: {actual}"
    assert actual["save_disabled"] is True, f"Clean form can still save: {actual}"
    assert not actual["horizontal_overflow"], f"Fixture overflows: {actual}"
    return actual


def await_verdict(page, text):
    from playwright.sync_api import expect

    status = page.get_by_test_id("demo-status")
    expect(status).to_have_attribute("data-demo-state", "passed", timeout=45000)
    expect(status).to_contain_text(text)
    expect(page.get_by_test_id("verification-result")).to_be_visible()
    return status.inner_text()


def routine_task(page, task):
    from playwright.sync_api import expect

    frame_ready(page, "agent-frame")
    page.get_by_test_id("task-select").select_option(task)
    page.get_by_test_id("run-task").click()
    verdict = await_verdict(page, f"Verified · {task} complete")
    frame = frame_ready(page, "agent-frame")
    expected, saves = EXPECTED[task]
    actual = assert_outcome(frame, expected, saves)
    expect(page.get_by_test_id("action-log")).to_contain_text(re.compile(r'"ok":\s*true'))
    return {"task": task, "hub_verdict": verdict, "independent_outcome": actual}


def compare_manual(page):
    native = frame_ready(page, "native-frame")
    sdk = frame_ready(page, "sdk-frame")
    assert_outcome(native, INITIAL, 0)
    assert_outcome(sdk, INITIAL, 0)
    native.get_by_label("Region", exact=True).select_option("frankfurt")
    native.get_by_role("button", name="Save settings", exact=True).click()
    sdk.get_by_role("combobox", name="Region", exact=True).click()
    sdk.get_by_role("option", name="Frankfurt", exact=True).click()
    sdk.get_by_role("button", name="Save settings", exact=True).click()
    expected = {**INITIAL, "region": "frankfurt"}
    return {
        "native": assert_outcome(native, expected, 1),
        "sdk": assert_outcome(sdk, expected, 1),
    }


def inspect_and_reset(page):
    from playwright.sync_api import expect

    frame_ready(page, "agent-frame")
    page.get_by_test_id("inspect-components").click()
    snapshot = page.get_by_test_id("snapshot-output")
    expect(snapshot).to_contain_text("Region")
    expect(snapshot).to_contain_text("Retention")
    expect(snapshot).to_contain_text("Weekly digest")
    before_reset = routine_task(page, "T4")
    page.get_by_test_id("reset-demo").click()
    expect(page.get_by_test_id("demo-status")).to_have_attribute("data-demo-state", "idle")
    expect(page.get_by_test_id("demo-status")).to_contain_text("Ready · initial settings restored")
    frame = frame_ready(page, "agent-frame")
    return {"before_reset": before_reset, "after_reset": assert_outcome(frame, INITIAL, 0)}


def task_suite(page):
    from playwright.sync_api import expect

    frame_ready(page, "agent-frame")
    page.get_by_test_id("run-all-tasks").click()
    verdict = await_verdict(page, "Verified · 6 of 6 tasks complete")
    results = page.get_by_test_id("suite-results")
    expect(results.locator('li[data-passed="true"]')).to_have_count(6)
    for task in EXPECTED:
        expect(results).to_contain_text(task)
    expected, saves = EXPECTED["T6"]
    return {
        "hub_verdict": verdict,
        "suite_text": results.inner_text(),
        "last_task_outcome": assert_outcome(frame_ready(page, "agent-frame"), expected, saves),
    }


def guarded_attempt(page, kind):
    from playwright.sync_api import expect

    frame = frame_ready(page, "agent-frame")
    before = assert_outcome(frame, INITIAL, 0)
    if kind == "readonly":
        for label in ("Region", "Retention"):
            expect(frame.get_by_role("combobox", name=label, exact=True)).to_be_disabled()
        expect(frame.get_by_role("checkbox", name="Weekly digest", exact=True)).to_be_disabled()
    page.get_by_test_id("run-task").click()
    verdict = await_verdict(
        page,
        "Verified · read-only protected" if kind == "readonly"
        else "Verified · rejected change preserved state",
    )
    after = assert_outcome(frame_ready(page, "agent-frame"), INITIAL, 0)
    assert before == after, "Guarded action changed the independently rendered state"
    log = page.get_by_test_id("action-log")
    if kind == "readonly":
        expect(log).to_contain_text(re.compile(r'"ok":\s*false'))
    else:
        expect(log).to_contain_text(re.compile(r'"ok":\s*true'))
        expect(log).to_contain_text(re.compile(r'"result":\s*false'))
    return {"hub_verdict": verdict, "before": before, "after": after, "response_log": log.text_content()}


def served_evidence(page):
    """Check links exposed by the page against the files actually being served."""
    def download(href):
        response = page.request.get(urljoin(page.url, href))
        assert response.ok, f"Evidence download failed: {href} ({response.status})"
        body = response.body()
        assert body, f"Empty evidence download: {href}"
        return body

    raw_href = page.locator('a[download][href$="/results.json.gz"]').first.get_attribute("href")
    assert raw_href, "Raw evidence download link is missing"
    raw = download(raw_href)
    # A server may set Content-Encoding, causing the client to decode gzip first.
    decoded = gzip.decompress(raw) if raw.startswith(b"\x1f\x8b") else raw
    digest = hashlib.sha256(decoded).hexdigest()
    assert digest == "6ae94f8db5c28c30233cde91564493b2d1199d9646f30e931edcd8520da9194a", "Served raw report hash differs from canonical evidence"
    report = json.loads(decoded)
    assert len(report["trials"]) == 162 and len(report["guardrails"]) == 33

    csv_href = page.locator('a[download][href$="/trial-metrics.csv"]').first.get_attribute("href")
    assert csv_href, "CSV download link is missing"
    rows = list(csv.DictReader(io.StringIO(download(csv_href).decode("utf-8-sig"))))
    assert len(rows) == 162 and all(row["success"] == "True" for row in rows), "Served CSV has incomplete or altered results"

    manifest_href = page.locator('a[download][href$="/build-manifest.json"]').first.get_attribute("href")
    assert manifest_href, "Build-manifest download link is missing"
    manifest = json.loads(download(manifest_href))
    assert manifest["baseline.html"]["isEntry"] and manifest["sdk.html"]["isEntry"]

    images = page.locator('.capture-grid img')
    assert images.count() == 6, "Original screenshot gallery does not contain six images"
    captures = []
    for index in range(images.count()):
        source = images.nth(index).get_attribute("src")
        assert source, "Missing screenshot source"
        body = download(source)
        assert body.startswith(b"\x89PNG\r\n\x1a\n") and len(body) > 1000, f"Invalid screenshot payload: {source}"
        captures.append({"source": source, "bytes": len(body)})
    return {"raw_report_sha256": digest, "csv_rows": len(rows), "manifest_entries": ["baseline.html", "sdk.html"], "screenshots": captures}


def results_page(page, verify_downloads=True):
    from playwright.sync_api import expect

    # The historical report is labelled as recorded evidence, not live demo timing.
    body = page.locator("body")
    for text in ("162", "33", "97.3", "171.9", "256.9", "60,031", "73,738"):
        expect(body).to_contain_text(text)
    report = page.locator('a[href$="/docs/hci/models/ui-sdk-pilot-results.md"]')
    assert report.count() >= 1, "Canonical result report link is missing"
    explorer = page.locator(".evidence-explorer")
    expect(explorer.get_by_role("status")).to_contain_text("Showing 162 of 162 trials")
    expect(explorer.locator("tbody tr")).to_have_count(162)
    expect(page.locator(".guardrail-list > details")).to_have_count(33)
    explorer.get_by_label("Profile", exact=True).select_option("mobile")
    explorer.get_by_label("Operation path", exact=True).select_option("sdk-bridge")
    explorer.get_by_label("Task", exact=True).select_option("T6")
    expect(explorer.get_by_role("status")).to_contain_text("Showing 3 of 162 trials")
    expect(explorer.locator("tbody tr")).to_have_count(3)
    expect(page.locator(".guardrail-list > details")).to_have_count(11)
    # Restore the full evidence view for the review screenshot.
    for name in ("Profile", "Operation path", "Task"):
        explorer.get_by_label(name, exact=True).select_option("all")
    expect(explorer.locator("tbody tr")).to_have_count(162)
    result = {
        "recorded_metrics_present": True,
        "canonical_report_url": report.first.get_attribute("href"),
        "all_trials": 162,
        "all_guardrails": 33,
        "filtered_mobile_bridge_t6_trials": 3,
        "filtered_mobile_guardrails": 11,
    }
    if verify_downloads:
        result["served_evidence"] = served_evidence(page)
    return result


def run(args):
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as error:
        raise SystemExit("Install the existing runner dependency: pip install playwright==1.65.2") from error

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    screenshots = Path(args.screenshots) if args.screenshots else None
    if screenshots:
        screenshots.mkdir(parents=True, exist_ok=True)
    report = {
        "schema_version": 1,
        "scope": "Interactive demo functional checks; not a rerun of the recorded HCI benchmark",
        "started_at_utc": datetime.now(timezone.utc).isoformat(),
        "base_url": args.base_url,
        "checks": [],
        "success": False,
    }

    def checkpoint():
        output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    checkpoint()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(**({"executable_path": args.executable} if args.executable else {}))
        report["chromium"] = browser.version

        def check(name, route, operation, mobile=False, screenshot=False):
            record = {"check": name, "route": route, "success": False}
            context = browser.new_context(
                viewport={"width": 390, "height": 844} if mobile else {"width": 1440, "height": 1000},
                reduced_motion="reduce",
                **({"is_mobile": True, "has_touch": True, "device_scale_factor": 2} if mobile else {}),
            )
            page = context.new_page()
            page.set_default_timeout(10000)
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            try:
                page.goto(f"{args.base_url.rstrip('/')}/#{route}", wait_until="networkidle")
                record.update(operation(page))
                overflow = page.evaluate("document.documentElement.scrollWidth > innerWidth + 1")
                assert not overflow, "Demo hub has horizontal page overflow"
                assert not errors, f"Browser errors: {errors}"
                if screenshots and screenshot:
                    image = screenshots / f"{name}.png"
                    page.screenshot(path=str(image), full_page=True)
                    record["screenshot"] = str(image)
                record["success"] = True
            except Exception as error:
                record["error"] = f"{type(error).__name__}: {error}"
                if screenshots:
                    try:
                        page.screenshot(path=str(screenshots / f"{name}-failed.png"), full_page=True)
                    except Exception:
                        pass
            finally:
                record["page_errors"] = errors
                report["checks"].append(record)
                checkpoint()
                context.close()

        check("compare-manual", "compare", compare_manual, screenshot=True)
        for task in EXPECTED:
            check(f"replay-{task.lower()}", "agent", lambda page, task=task: routine_task(page, task), screenshot=task == "T4")
        check("inspect-and-reset", "agent", inspect_and_reset)
        check("six-task-suite", "agent", task_suite)
        check("readonly", "readonly", lambda page: guarded_attempt(page, "readonly"), screenshot=True)
        check("rejection", "rejection", lambda page: guarded_attempt(page, "rejection"), screenshot=True)
        check("recorded-results", "results", results_page, screenshot=True)
        check("mobile-compare", "compare", compare_manual, mobile=True, screenshot=True)
        check("mobile-agent-replay", "agent", lambda page: routine_task(page, "T4"), mobile=True, screenshot=True)
        check("mobile-recorded-results", "results", lambda page: results_page(page, verify_downloads=False), mobile=True, screenshot=True)
        browser.close()

    report["finished_at_utc"] = datetime.now(timezone.utc).isoformat()
    report["passed"] = sum(row["success"] for row in report["checks"])
    report["total"] = len(report["checks"])
    report["success"] = report["passed"] == report["total"]
    checkpoint()
    print(f"Demo integration checks: {report['passed']}/{report['total']} passed; {output}")
    for row in report["checks"]:
        if not row["success"]:
            print(f"FAIL {row['check']}: {row.get('error', 'unknown error')}", file=sys.stderr)
    return 0 if report["success"] else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:4178")
    parser.add_argument("--output", default="/tmp/ui-sdk-demos/checks.json")
    parser.add_argument("--screenshots")
    parser.add_argument("--executable", help="Path to an existing Chromium executable")
    sys.exit(run(parser.parse_args()))
