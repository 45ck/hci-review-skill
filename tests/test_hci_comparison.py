import copy
import json
import math
from pathlib import Path
import subprocess
import sys
import unittest


MODEL_DIR = Path(__file__).resolve().parents[1] / "docs" / "hci" / "models"


def run_script(script, argument, payload=None):
    completed = subprocess.run(
        [sys.executable, "-B", str(MODEL_DIR / script), str(argument)],
        capture_output=True,
        text=True,
        input=json.dumps(payload) if payload is not None else None,
    )
    return completed


class HciComparisonTest(unittest.TestCase):
    def setUp(self):
        self.example_path = MODEL_DIR / "example-comparison.json"
        self.study = json.loads(self.example_path.read_text(encoding="utf-8"))

    def result(self, study):
        completed = run_script("compare.py", "-", study)
        self.assertEqual(completed.returncode, 0, completed.stderr)
        return json.loads(completed.stdout)

    def test_synthetic_example_and_decision_boundaries(self):
        completed = run_script("compare.py", self.example_path)
        self.assertEqual(completed.returncode, 0, completed.stderr)
        result = json.loads(completed.stdout)
        self.assertEqual(result["n_pairs"], 6)
        self.assertEqual(result["median_improvement"], 19)
        self.assertEqual(result["median_improvement_interval_95"], {
            "lower": 11, "upper": 22, "coverage_at_least": 0.96875,
        })
        self.assertEqual(result["decision"], "meets-threshold")
        for minimum, decision in [(11, "meets-threshold"), (22, "inconclusive"), (23, "below-threshold")]:
            with self.subTest(minimum=minimum):
                self.assertEqual(self.result({**self.study, "min_improvement": minimum})["decision"], decision)

    def test_insufficient_pairs_and_fixed_fixture_matrix(self):
        few_pairs = {**self.study, "pairs": self.study["pairs"][:5]}
        result = self.result(few_pairs)
        self.assertIsNone(result["median_improvement_interval_95"])
        self.assertEqual(result["decision"], "inconclusive")

        result = self.result({**self.study, "analysis": "descriptive"})
        self.assertIsNone(result["median_improvement_interval_95"])
        self.assertEqual(result["decision"], "descriptive")
        self.assertEqual(result["median_improvement"], 19)

    def test_larger_sample_uses_interior_order_statistics(self):
        pairs = [
            {
                "id": str(i),
                "baseline": {"letter_spacing_px": 0, "font_size_px": 1},
                "candidate": {"letter_spacing_px": i, "font_size_px": 1},
            }
            for i in range(10)
        ]
        result = self.result({
            "analysis": "paired", "model": "tracking", "metric": "tracking_em",
            "direction": "higher", "min_improvement": 1, "pairs": pairs,
        })
        self.assertEqual(result["median_improvement_interval_95"], {
            "lower": 1, "upper": 8,
            "coverage_at_least": 1 - 2 * (math.comb(10, 0) + math.comb(10, 1)) / 2**10,
        })

    def test_all_twenty_models_accept_their_existing_observations(self):
        fixture = MODEL_DIR / "example-measurements.json"
        completed = run_script("measure.py", fixture)
        self.assertEqual(completed.returncode, 0, completed.stderr)
        expected = json.loads(completed.stdout)
        inputs = json.loads(fixture.read_text(encoding="utf-8"))
        self.assertEqual(len(inputs), 20)
        for model, observations in inputs.items():
            with self.subTest(model=model):
                metric, expected_value = next(iter(expected[model].items()))
                result = self.result({
                    "analysis": "descriptive", "model": model, "metric": metric,
                    "direction": "higher", "min_improvement": 0.01,
                    "pairs": [{"id": "fixture", "baseline": observations, "candidate": observations}],
                })
                self.assertEqual(result["median_improvement"], 0)
                self.assertEqual(result["pairs"][0]["candidate"], expected_value)

    def test_target_distance_accounts_for_overshoot(self):
        result = self.result({
            "analysis": "descriptive", "model": "tracking", "metric": "tracking_em",
            "direction": "closer-to-target", "target": 1, "min_improvement": 0.1,
            "pairs": [{
                "id": "sample",
                "baseline": {"letter_spacing_px": 0.5, "font_size_px": 1},
                "candidate": {"letter_spacing_px": 2, "font_size_px": 1},
            }],
        })
        self.assertEqual(result["median_improvement"], -0.5)

    def test_reject_invalid_studies(self):
        duplicated = copy.deepcopy(self.study)
        duplicated["pairs"][1]["id"] = duplicated["pairs"][0]["id"]
        missing = copy.deepcopy(self.study)
        del missing["pairs"][0]["candidate"]
        cases = [
            (duplicated, "unique"),
            (missing, "requires id, baseline and candidate"),
            ({**self.study, "metric": "missing_metric"}, "unknown metric"),
            ({**self.study, "min_improvement": 0}, "must be positive"),
            ({**self.study, "direction": "closer-to-target"}, "target is required"),
        ]
        for study, message in cases:
            with self.subTest(message=message):
                completed = run_script("compare.py", "-", study)
                self.assertEqual(completed.returncode, 2)
                self.assertIn(message, completed.stderr)
                self.assertEqual(completed.stdout, "")


if __name__ == "__main__":
    unittest.main()
