"""Keep gallery discovery evidence from passing on absent or stale specimens."""

import unittest

from glass_agent_inventory_contract import assert_specimen_entries


def entry(label, **overrides):
    return {"ref": label, "component": "input", "label": label,
            "actions": ["setValue"], **overrides}


class AgentInventoryEvidenceTest(unittest.TestCase):
    def setUp(self):
        self.shell = [entry("Search components"), entry("Component catalogue", component="listbox")]
        self.specimen = [entry("Project name"), entry("Workspace", disabled=True)]

    def test_named_gallery_shell_cannot_stand_in_for_the_specimen(self):
        with self.assertRaisesRegex(AssertionError, "specimen controls are absent"):
            assert_specimen_entries("input", self.shell)

    def test_previous_specimen_entries_cannot_prove_current_discovery(self):
        remembered = [{**item, "offPage": True} for item in self.specimen]
        with self.assertRaisesRegex(AssertionError, "specimen controls are absent"):
            assert_specimen_entries("input", self.shell + remembered)

    def test_truncated_snapshot_cannot_prove_complete_naming(self):
        with self.assertRaisesRegex(AssertionError, "truncated snapshot"):
            assert_specimen_entries("input", self.specimen + [{"component": "more", "more": 1}])

    def test_an_additional_unnamed_control_is_not_ignored(self):
        with self.assertRaisesRegex(AssertionError, "unnamed SDK entries"):
            assert_specimen_entries("input", self.specimen + [entry("   ")])

    def test_current_named_specimen_records_real_actions_and_disabled_state(self):
        observed = assert_specimen_entries("input", self.shell + self.specimen)
        self.assertEqual([item["label"] for item in observed], ["Project name", "Workspace"])
        self.assertEqual(observed[0]["actions"], ["setValue"])
        self.assertTrue(observed[1]["disabled"])

    def test_new_family_requires_a_reviewed_discovery_expectation(self):
        with self.assertRaisesRegex(AssertionError, "Add a reviewed discovery expectation"):
            assert_specimen_entries("future-family", self.shell)


if __name__ == "__main__":
    unittest.main()
