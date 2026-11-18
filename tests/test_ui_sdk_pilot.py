"""Regression checks for evidence preservation in the optional browser pilot."""

import importlib.util
from pathlib import Path
import unittest

PATH = Path(__file__).resolve().parents[1] / "docs/hci/models/run-ui-sdk-pilot.py"
SPEC = importlib.util.spec_from_file_location("ui_sdk_pilot", PATH)
PILOT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PILOT)


def row(arm, success=True, duration=100):
    return {"profile": "desktop", "arm": arm, "task": "T1", "repeat": 1,
            "success": success, "scripted_duration_ms": duration,
            "automation_action_commands": 2, "attempted_semantic_actions": 2}


class EvidencePreservationTest(unittest.TestCase):
    def test_interrupted_pair_preserves_observed_arm(self):
        summary = PILOT.summarise([row("sdk-dom")], ["desktop"])["desktop"]
        self.assertEqual(summary["arms"]["sdk-dom"]["successes"], 1)
        self.assertEqual(summary["arms"]["sdk-bridge"]["attempts"], 0)
        self.assertTrue(summary["sdk_dom_bridge_pairs"][0]["missing_candidate"])
        self.assertIsNone(summary["complete_pair_median_delta_ms"])

    def test_failed_attempt_stays_in_denominator_and_out_of_success_latency(self):
        rows = [row("sdk-dom"), row("sdk-bridge", False, 5000)]
        summary = PILOT.summarise(rows, ["desktop"])["desktop"]
        bridge = summary["arms"]["sdk-bridge"]
        self.assertEqual((bridge["successes"], bridge["attempts"]), (0, 1))
        self.assertIsNone(bridge["successful_scripted_duration_median_ms"])
        self.assertFalse(summary["sdk_dom_bridge_pairs"][0]["complete_pair"])
        self.assertIsNone(summary["complete_pair_median_delta_ms"])


if __name__ == "__main__":
    unittest.main()
