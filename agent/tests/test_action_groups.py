from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from agent.tonypi_agent.action_groups import ActionGroupRepository, ActionGroupError
from agent.tonypi_agent.server import Agent
from agent.tonypi_agent.hardware import HardwareError


class ActionGroupRepositoryTests(unittest.TestCase):
    def test_save_load_round_trip(self):
        with tempfile.TemporaryDirectory() as directory:
            repository = ActionGroupRepository(directory)
            actions = [{"time": 300, "servos": [500] * 18}, {"time": 450, "servos": list(range(18))}]
            repository.save_group("round_trip", actions)
            loaded = repository.load_group("round_trip")
            self.assertEqual(loaded["servo_count"], 18)
            self.assertEqual(loaded["actions"], [{"index": 1, "time": 300, "servos": [500] * 18}, {"index": 2, "time": 450, "servos": list(range(18))}])

    def test_rejects_invalid_pulse(self):
        with tempfile.TemporaryDirectory() as directory:
            repository = ActionGroupRepository(directory)
            with self.assertRaises(ActionGroupError):
                repository.save_group("bad", [{"time": 500, "servos": [1001] + [500] * 17}])

    def test_existing_groups_can_be_loaded(self):
        sample = Path(__file__).parents[3] / "TonyPi" / "ActionGroups" / "0.d6a"
        if not sample.exists():
            self.skipTest("开发机未提供 ../TonyPi")
        repository = ActionGroupRepository(sample.parents[1])
        document = repository.load_group("0")
        self.assertEqual(document["servo_count"], 18)
        self.assertGreater(len(document["actions"]), 0)

    def test_playback_requires_connected_hardware(self):
        with tempfile.TemporaryDirectory() as directory:
            agent = Agent(directory, hardware_mode="mock")
            with self.assertRaises(HardwareError):
                agent.dispatch("playback_start", {"actions": [{"time": 100, "servos": [500] * 18}]})


if __name__ == "__main__":
    unittest.main()
