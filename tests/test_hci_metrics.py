import json
import math
from pathlib import Path
import re
import subprocess
import sys
import unittest


MODEL_DIR = Path(__file__).resolve().parents[1] / "docs" / "hci" / "models"
CALCULATOR = MODEL_DIR / "measure.py"


def run_calculator(argument, input_text=None):
    return subprocess.run(
        [sys.executable, str(CALCULATOR), str(argument)],
        input=input_text,
        capture_output=True,
        text=True,
    )


class HciMetricsTest(unittest.TestCase):
    def test_all_twenty_worked_examples(self):
        completed = run_calculator(MODEL_DIR / "example-measurements.json")
        self.assertEqual(completed.returncode, 0, completed.stderr)
        actual = json.loads(completed.stdout)
        expected = {
            "kerning": {"pair_adjustment_em": -0.10},
            "optical-centre": {"normalised_centre_offset": 1 / 32},
            "tabular-numbers": {"digit_advance_spread_px": 0, "decimal_drift_px": 0},
            "layout-shift": {"p75_cls": 0.12, "p95_target_drift_px": 36},
            "tracking": {"tracking_em": 0.03},
            "optimistic-update": {"feedback_ms": 40, "confirmation_gap_ms": 440, "reconciliation_rate": 0.03},
            "x-height": {"x_height_ratio": 0.55},
            "touch-target": {"index_of_difficulty_bits": math.log2(3), "predicted_movement_ms": 80 + 60 * math.log2(3)},
            "leading": {"line_height_ratio": 1.5},
            "origin-aware-animation": {"normalised_origin_error": 0.10},
            "oklch": {"oklch_lightness_spread": 0.02, "wcag_contrast_ratio": 5},
            "widow": {"one_word_final_line_rate": 0.15},
            "safe-area": {"minimum_clearance_px": 16},
            "stagger": {"onset_spread_ms": 105, "readiness_delay_ms": 180},
            "line-length": {"median_graphemes": 63, "p90_graphemes": 74},
            "affordance": {"correct_first_action_rate": 0.85},
            "combobox": {"correct_selection_rate": 0.9, "p95_input_to_results_ms": 160, "stale_query_rate": 0},
            "interruptible-animation": {"retarget_latency_ms": 16, "position_jump_px": 1},
            "progressive-disclosure": {"expected_task_time_s": 26, "advanced_completion_rate": 0.9},
            "shared-element-transition": {"handoff_error_px": 2, "task_latency_ms": 220},
        }
        self.assertEqual(len(actual), 20)
        catalogue = (MODEL_DIR / "interface-design-models.md").read_text(encoding="utf-8")
        documented_models = re.findall(r"^\| \d{2}:\d{2} \| [^|]+ · `([^`]+)` \|", catalogue, re.MULTILINE)
        self.assertEqual(documented_models, list(expected))
        self.assertEqual(actual.keys(), expected.keys())
        for model, metrics in expected.items():
            with self.subTest(model=model):
                self.assertEqual(actual[model].keys(), metrics.keys())
                for metric, expected_value in metrics.items():
                    self.assertAlmostEqual(actual[model][metric], expected_value)

    def test_signed_clearance_and_confirmation_gap_from_stdin(self):
        observations = {
            "safe-area": {"target_ltrb_px": [0, 5, 15, 25], "safe_ltrb_px": [0, 0, 20, 20]},
            "optimistic-update": {
                "action_ms": 10, "paint_ms": 30, "settled_ms": 20, "reconciled": 0, "settled_mutations": 1,
            },
        }
        completed = run_calculator("-", json.dumps(observations))
        self.assertEqual(completed.returncode, 0, completed.stderr)
        actual = json.loads(completed.stdout)
        self.assertEqual(actual["safe-area"]["minimum_clearance_px"], -5)
        self.assertEqual(actual["optimistic-update"]["confirmation_gap_ms"], -10)

    def test_reject_invalid_observations(self):
        cases = [
            ("affordance", {"correct_first_actions": 2, "attempts": 1}),
            ("interruptible-animation", {
                "input_ms": 40, "first_retargeted_frame_ms": 30, "before_px": [2, 3], "after_px": [4, 5],
            }),
            ("interruptible-animation", {
                "input_ms": 30, "first_retargeted_frame_ms": 40, "before_px": [2], "after_px": [4],
            }),
        ]
        for model, inputs in cases:
            with self.subTest(model=model, inputs=inputs):
                completed = run_calculator("-", json.dumps({model: inputs}))
                self.assertEqual(completed.returncode, 2)
                self.assertIn(model, completed.stderr)
                self.assertEqual(completed.stdout, "")


if __name__ == "__main__":
    unittest.main()
