#!/usr/bin/env python3
"""Calculate HCI diagnostics from measured inputs. See interface-design-models.md."""

import argparse
import json
import math
import statistics
import sys
from pathlib import Path


def divide(numerator, denominator):
    if denominator <= 0:
        raise ValueError("a measurement denominator must be positive")
    return numerator / denominator


def rate(count, total):
    if type(count) is not int or type(total) is not int or not 0 <= count <= total:
        raise ValueError("counts must be integers with 0 <= count <= total")
    return divide(count, total)


def spread(samples):
    return max(samples) - min(samples)


def percentile(samples, fraction):
    if not samples:
        raise ValueError("percentiles require at least one sample")
    return sorted(samples)[math.ceil(fraction * len(samples)) - 1]


def point_distance(a, b):
    if len(a) != 2 or len(b) != 2:
        raise ValueError("points require exactly two coordinates")
    return math.dist(a, b)


def elapsed(start_ms, end_ms):
    if end_ms < start_ms:
        raise ValueError("end timestamp precedes start timestamp")
    return end_ms - start_ms


def kerning(kerned_px, unkerned_px, font_size_px):
    return {"pair_adjustment_em": divide(kerned_px - unkerned_px, font_size_px)}


def optical_centre(ink_centroid_px, container_centre_px, container_short_side_px):
    offset = point_distance(ink_centroid_px, container_centre_px)
    return {"normalised_centre_offset": divide(offset, container_short_side_px)}


def tabular_numbers(digit_advances_px, decimal_positions_px):
    if len(digit_advances_px) != 10:
        raise ValueError("provide one advance for each of the ten digits")
    return {
        "digit_advance_spread_px": spread(digit_advances_px),
        "decimal_drift_px": spread(decimal_positions_px),
    }


def layout_shift(page_view_cls, target_drift_px):
    return {
        "p75_cls": percentile(page_view_cls, 0.75),
        "p95_target_drift_px": percentile(target_drift_px, 0.95),
    }


def tracking(letter_spacing_px, font_size_px):
    return {"tracking_em": divide(letter_spacing_px, font_size_px)}


def optimistic_update(action_ms, paint_ms, settled_ms, reconciled, settled_mutations):
    elapsed(action_ms, settled_ms)
    return {
        "feedback_ms": elapsed(action_ms, paint_ms),
        "confirmation_gap_ms": settled_ms - paint_ms,
        "reconciliation_rate": rate(reconciled, settled_mutations),
    }


def x_height(x_height_px, font_size_px):
    return {"x_height_ratio": divide(x_height_px, font_size_px)}


def touch_target(distance_px, target_width_px, intercept_ms, slope_ms_per_bit):
    index = math.log2(1 + divide(distance_px, target_width_px))
    return {
        "index_of_difficulty_bits": index,
        "predicted_movement_ms": intercept_ms + slope_ms_per_bit * index,
    }


def leading(baseline_distance_px, font_size_px):
    return {"line_height_ratio": divide(baseline_distance_px, font_size_px)}


def origin_aware_animation(first_anchor_px, trigger_anchor_px, trigger_diagonal_px):
    offset = point_distance(first_anchor_px, trigger_anchor_px)
    return {"normalised_origin_error": divide(offset, trigger_diagonal_px)}


def oklch(palette_lightness, foreground_luminance, background_luminance):
    if not all(0 <= value <= 1 for value in (*palette_lightness, foreground_luminance, background_luminance)):
        raise ValueError("lightness and relative luminance must be in [0, 1]")
    darker, lighter = sorted((foreground_luminance, background_luminance))
    return {
        "oklch_lightness_spread": spread(palette_lightness),
        "wcag_contrast_ratio": (lighter + 0.05) / (darker + 0.05),
    }


def widow(one_word_endings, multiline_blocks):
    return {"one_word_final_line_rate": rate(one_word_endings, multiline_blocks)}


def safe_area(target_ltrb_px, safe_ltrb_px):
    left, top, right, bottom = target_ltrb_px
    safe_left, safe_top, safe_right, safe_bottom = safe_ltrb_px
    if left >= right or top >= bottom or safe_left >= safe_right or safe_top >= safe_bottom:
        raise ValueError("rectangles require positive width and height in left, top, right, bottom order")
    return {
        "minimum_clearance_px": min(
            left - safe_left, top - safe_top, safe_right - right, safe_bottom - bottom
        ),
    }


def stagger(onsets_ms, content_ready_ms, all_items_usable_ms):
    return {
        "onset_spread_ms": spread(onsets_ms),
        "readiness_delay_ms": elapsed(content_ready_ms, all_items_usable_ms),
    }


def line_length(full_line_graphemes):
    return {
        "median_graphemes": statistics.median(full_line_graphemes),
        "p90_graphemes": percentile(full_line_graphemes, 0.90),
    }


def affordance(correct_first_actions, attempts):
    return {"correct_first_action_rate": rate(correct_first_actions, attempts)}


def combobox(correct_selections, attempts, input_to_results_ms, stale_queries, queries):
    return {
        "correct_selection_rate": rate(correct_selections, attempts),
        "p95_input_to_results_ms": percentile(input_to_results_ms, 0.95),
        "stale_query_rate": rate(stale_queries, queries),
    }


def interruptible_animation(input_ms, first_retargeted_frame_ms, before_px, after_px):
    return {
        "retarget_latency_ms": elapsed(input_ms, first_retargeted_frame_ms),
        "position_jump_px": point_distance(before_px, after_px),
    }


def progressive_disclosure(advanced_share, mean_basic_s, mean_advanced_s, advanced_successes, advanced_attempts):
    if not 0 <= advanced_share <= 1:
        raise ValueError("advanced task share must be in [0, 1]")
    return {
        "expected_task_time_s": (1 - advanced_share) * mean_basic_s + advanced_share * mean_advanced_s,
        "advanced_completion_rate": rate(advanced_successes, advanced_attempts),
    }


def shared_element_transition(animated_corners_px, live_corners_px, input_ms, destination_ready_ms):
    if len(animated_corners_px) != 4 or len(live_corners_px) != 4:
        raise ValueError("provide four matching corners for each box")
    return {
        "handoff_error_px": max(point_distance(before, after) for before, after in zip(animated_corners_px, live_corners_px)),
        "task_latency_ms": elapsed(input_ms, destination_ready_ms),
    }


MODELS = {
    "kerning": kerning,
    "optical-centre": optical_centre,
    "tabular-numbers": tabular_numbers,
    "layout-shift": layout_shift,
    "tracking": tracking,
    "optimistic-update": optimistic_update,
    "x-height": x_height,
    "touch-target": touch_target,
    "leading": leading,
    "origin-aware-animation": origin_aware_animation,
    "oklch": oklch,
    "widow": widow,
    "safe-area": safe_area,
    "stagger": stagger,
    "line-length": line_length,
    "affordance": affordance,
    "combobox": combobox,
    "interruptible-animation": interruptible_animation,
    "progressive-disclosure": progressive_disclosure,
    "shared-element-transition": shared_element_transition,
}


def calculate(measurements):
    if not isinstance(measurements, dict) or not measurements:
        raise ValueError("expected a non-empty JSON object keyed by model ID")

    results = {}
    for name, inputs in measurements.items():
        if name not in MODELS:
            raise ValueError(f"unknown model '{name}'")
        try:
            metrics = MODELS[name](**inputs)
            if not all(math.isfinite(value) for value in metrics.values()):
                raise ValueError("all computed measurements must be finite")
            results[name] = metrics
        except (ArithmeticError, TypeError, ValueError) as error:
            raise ValueError(f"{name}: {error}") from error
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("measurements", help="JSON measurements file, or '-' for standard input")
    args = parser.parse_args()
    try:
        raw = sys.stdin.read() if args.measurements == "-" else Path(args.measurements).read_text(encoding="utf-8")
        results = calculate(json.loads(raw))
    except (OSError, ValueError) as error:
        parser.exit(2, f"{parser.prog}: {error}\n")
    print(json.dumps(results, indent=2, allow_nan=False))


if __name__ == "__main__":
    main()
