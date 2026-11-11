#!/usr/bin/env python3
"""Compare paired baseline and candidate observations for one HCI model metric."""

import argparse
import json
import math
from pathlib import Path
from statistics import median
import sys

from measure import MODELS, calculate


def median_interval_95(ordered):
    """Return a two-sided, distribution-free interval using binomial tails."""
    count = len(ordered)
    outcomes = 2 ** count
    coefficient = 1
    tail = rank = 0

    # At 95% confidence each tail must contain at most 1/40 of outcomes.
    while 40 * (tail + coefficient) <= outcomes:
        tail += coefficient
        rank += 1
        coefficient = coefficient * (count - rank + 1) // rank

    if rank == 0:
        return None
    return {
        "lower": ordered[rank - 1],
        "upper": ordered[-rank],
        "coverage_at_least": (outcomes - 2 * tail) / outcomes,
    }


def finite_number(value, label):
    if type(value) not in (int, float) or not math.isfinite(value):
        raise ValueError(f"{label} must be a finite number")
    return value


def metric_value(model, metric, observations):
    result = calculate({model: observations})[model]
    if metric not in result:
        raise ValueError(f"{model}: unknown metric '{metric}'. Available metrics: {', '.join(result)}")
    return result[metric]


def improvement(baseline, candidate, direction, target):
    if direction == "higher":
        return candidate - baseline
    if direction == "lower":
        return baseline - candidate
    return abs(baseline - target) - abs(candidate - target)


def compare(study):
    required = {"analysis", "model", "metric", "direction", "min_improvement", "pairs"}
    if not isinstance(study, dict) or not required <= study.keys() or study.keys() - required - {"target"}:
        raise ValueError("expected analysis, model, metric, direction, min_improvement, pairs and an optional target")
    analysis = study["analysis"]
    if analysis not in ("paired", "descriptive"):
        raise ValueError("analysis must be paired or descriptive")
    model, metric, direction = study["model"], study["metric"], study["direction"]
    if not isinstance(model, str) or model not in MODELS:
        raise ValueError("unknown model ID")
    if not isinstance(metric, str) or not metric.strip():
        raise ValueError("metric must be a calculator output key")
    if direction not in ("higher", "lower", "closer-to-target"):
        raise ValueError("direction must be higher, lower or closer-to-target")
    if ("target" in study) != (direction == "closer-to-target"):
        raise ValueError("target is required only with closer-to-target")
    target = finite_number(study["target"], "target") if "target" in study else None
    minimum = finite_number(study["min_improvement"], "min_improvement")
    if minimum <= 0:
        raise ValueError("min_improvement must be positive")

    pairs = study["pairs"]
    if not isinstance(pairs, list) or not pairs:
        raise ValueError("pairs must contain at least one complete baseline/candidate pair")

    seen = set()
    results = []
    for index, pair in enumerate(pairs, 1):
        if not isinstance(pair, dict) or pair.keys() != {"id", "baseline", "candidate"}:
            raise ValueError(f"pair {index} requires id, baseline and candidate")
        pair_id = pair["id"]
        if not isinstance(pair_id, str) or not pair_id.strip() or pair_id in seen:
            raise ValueError(f"pair {index} requires a unique, non-empty ID")
        seen.add(pair_id)
        try:
            baseline = metric_value(model, metric, pair["baseline"])
            candidate = metric_value(model, metric, pair["candidate"])
            gain = finite_number(improvement(baseline, candidate, direction, target), "improvement")
        except (ValueError, ArithmeticError) as error:
            raise ValueError(f"pair '{pair_id}': {error}") from error
        results.append({"id": pair_id, "baseline": baseline, "candidate": candidate, "improvement": gain})

    changes = sorted(pair["improvement"] for pair in results)
    interval = median_interval_95(changes) if analysis == "paired" else None
    decision = "inconclusive" if analysis == "paired" else "descriptive"
    if interval and interval["lower"] >= minimum:
        decision = "meets-threshold"
    elif interval and interval["upper"] < minimum:
        decision = "below-threshold"

    return {
        "analysis": analysis,
        "model": model,
        "metric": metric,
        "direction": direction,
        **({"target": target} if target is not None else {}),
        "min_improvement": minimum,
        "n_pairs": len(results),
        "median_improvement": median(changes),
        "median_improvement_interval_95": interval,
        "decision": decision,
        "pairs": results,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("study", help="JSON study file, or '-' for standard input")
    args = parser.parse_args()
    try:
        raw = sys.stdin.read() if args.study == "-" else Path(args.study).read_text(encoding="utf-8")
        print(json.dumps(compare(json.loads(raw)), indent=2, allow_nan=False))
    except (OSError, ValueError, ArithmeticError) as error:
        parser.exit(2, f"{parser.prog}: {error}\n")


if __name__ == "__main__":
    main()
