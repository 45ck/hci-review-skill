#!/usr/bin/env python3
"""Run the Quantitative HCI fixtures and emit raw inputs and model results as JSON."""

import argparse
import hashlib
import json
import statistics
from pathlib import Path

from measure import calculate, percentile

HERE = Path(__file__).resolve().parent / 'browser'


PROFILES = {
    "desktop": {"viewport": {"width": 1280, "height": 800}},
    "mobile": {
        "viewport": {"width": 390, "height": 844},
        "device_scale_factor": 2,
        "is_mobile": True,
        "has_touch": True,
    },
    "reduced-motion": {
        "viewport": {"width": 390, "height": 844},
        "device_scale_factor": 2,
        "is_mobile": True,
        "has_touch": True,
        "reduced_motion": "reduce",
    },
}
VARIANTS = ("baseline", "candidate")


def collect_trial(context, variant):
    page = context.new_page()
    try:
        page.goto(f"{(HERE / 'fixture.html').as_uri()}?variant={variant}", wait_until="load")
        measurements = page.evaluate("() => window.runMeasurements()")
        return {"measurements": measurements, "metrics": calculate(measurements)}
    finally:
        page.close()


def summarise(trials):
    summary = {}
    for model, metrics in trials[0]["metrics"].items():
        summary[model] = {
            name: statistics.median(trial["metrics"][model][name] for trial in trials)
            for name in metrics
        }

    layout_samples = {
        name: [
            value
            for trial in trials
            for value in trial["measurements"]["layout-shift"][name]
        ]
        for name in ("page_view_cls", "target_drift_px")
    }
    summary["layout-shift"] = calculate({"layout-shift": layout_samples})["layout-shift"]
    feedback_samples = [trial["metrics"]["optimistic-update"]["feedback_ms"] for trial in trials]
    summary["optimistic-update"]["p95_feedback_ms"] = percentile(feedback_samples, 0.95)
    return summary


def run_profile(browser, settings, repeats):
    context = browser.new_context(**settings)
    try:
        trials = {variant: [] for variant in VARIANTS}
        for index in range(repeats):
            order = VARIANTS if index % 2 == 0 else tuple(reversed(VARIANTS))
            for variant in order:
                trials[variant].append(collect_trial(context, variant))
    finally:
        context.close()

    return {
        "settings": settings,
        "variants": {
            variant: {"summary": summarise(samples), "trials": samples}
            for variant, samples in trials.items()
        },
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", choices=["all", *PROFILES], default="all")
    parser.add_argument("--repeats", type=int, default=3, help="fresh page loads per variant and profile")
    parser.add_argument("--executable", help="path to a system Chromium executable")
    args = parser.parse_args()
    if args.repeats < 1:
        parser.error("--repeats must be at least 1")
    try:
        from playwright.sync_api import sync_playwright
    except ModuleNotFoundError:
        parser.exit(2, "Install the Python playwright package and its Chromium browser first.\n")

    selected = list(PROFILES) if args.profile == "all" else [args.profile]
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=args.executable)
        try:
            report = {
                "evidence": "controlled Chromium fixture",
                "chromium": browser.version,
                "repeats_per_variant": args.repeats,
                "fixture_sha256": {
                    name: hashlib.sha256((HERE / name).read_bytes()).hexdigest()
                    for name in ("fixture.html", "measure.js")
                },
                "profiles": {
                    name: run_profile(browser, PROFILES[name], args.repeats)
                    for name in selected
                },
            }
        finally:
            browser.close()
    print(json.dumps(report, indent=2, allow_nan=False))


if __name__ == "__main__":
    main()
