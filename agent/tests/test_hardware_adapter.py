from __future__ import annotations

import types
import unittest
from unittest.mock import patch

from agent.tonypi_agent.hardware import HardwareError, SerialHardware


class FakePort:
    def __init__(self):
        self.closed = False

    def close(self):
        self.closed = True


class FakeBoard:
    def __init__(self, device):
        self.device = device
        self.port = FakePort()
        self.reception = []
        self.positions = []
        self.torque = []
        self.torque_states = {}
        self.stops = []

    def enable_reception(self, enabled):
        self.reception.append(enabled)

    def bus_servo_read_position(self, servo_id):
        return [500]

    def bus_servo_set_position(self, duration, positions):
        self.positions.append((duration, positions))

    def bus_servo_stop(self, servo_ids):
        self.stops.append(servo_ids)

    def bus_servo_enable_torque(self, servo_id, enabled):
        self.torque.append((servo_id, enabled))
        self.torque_states[servo_id] = 0 if enabled else 1

    def bus_servo_read_torque_state(self, servo_id):
        return [self.torque_states.get(servo_id, 1)]

    def pwm_servo_read_position(self, servo_id):
        return 1500 if servo_id == 1 else 1435

    def pwm_servo_set_position(self, duration, positions):
        self.positions.append((duration, positions))


class SerialHardwareAdapterTests(unittest.TestCase):
    def test_matches_sdk_units_and_shapes(self):
        board = FakeBoard("unused")
        module = types.SimpleNamespace(Board=lambda device: board)
        hardware = SerialHardware("/unused", "/dev/ttyAMA0")
        with patch("agent.tonypi_agent.hardware.importlib.import_module", return_value=module):
            hardware.connect()

        hardware.set_servo(1, 620, 100)
        self.assertEqual(board.positions, [(0.1, [(1, 620)])])
        hardware.set_pwm_servo(1, 1600, 200)
        self.assertEqual(board.positions[-1], (0.2, [(1, 1600)]))
        self.assertEqual(hardware.read_pwm_pose([1, 2]), [1500, 1435])
        self.assertEqual(hardware.read_pose(), [500] * 16 + [None, None])
        hardware.stop([1, 2])
        result = hardware.set_torque([1], False)
        self.assertEqual(board.stops, [[1, 2]])
        self.assertEqual(board.torque, [(1, True)])
        self.assertEqual(result["states"], [{"id": 1, "enabled": False, "raw": 0}])
        hardware.disconnect()
        self.assertEqual(board.reception, [True, False])
        self.assertTrue(board.port.closed)

    def test_rejects_values_before_writing_to_sdk(self):
        board = FakeBoard("unused")
        hardware = SerialHardware("/unused")
        hardware.board = board
        with self.assertRaises(HardwareError):
            hardware.set_servo(1, 1001, 100)
        self.assertEqual(board.positions, [])


if __name__ == "__main__":
    unittest.main()
