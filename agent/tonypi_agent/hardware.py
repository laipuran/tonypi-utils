from __future__ import annotations

import importlib
import sys
import threading
from typing import Any


class HardwareError(RuntimeError):
    """A hardware connection or command error."""


PWM_SERVO_COUNT = 4
PWM_MIN_PULSE = 500
PWM_MAX_PULSE = 2500
PHYSICAL_BUS_SERVO_COUNT = 16
DEFAULT_STAND_POSE = [500, 390, 500, 600, 500, 575, 800, 725, 500, 610, 500, 400, 500, 425, 200, 275, 500, 500]


class MockHardware:
    def __init__(self, servo_count: int = 18, initial_pose: list[int] | None = None):
        self.servo_count = servo_count
        self.pose = list(initial_pose or DEFAULT_STAND_POSE[:servo_count])
        self.pwm_pose = [1500, 1435, 1500, 1500]
        self.connected = False
        self.torque_enabled = [True] * servo_count

    def connect(self) -> None:
        self.connected = True

    def disconnect(self) -> None:
        self.connected = False

    def status(self) -> dict[str, Any]:
        return {
            "connected": self.connected,
            "mode": "mock",
            "device": "mock",
            "servo_count": self.servo_count,
            "available_servo_count": self.servo_count,
            "pwm_servo_count": PWM_SERVO_COUNT,
        }

    def read_pose(self) -> list[int]:
        self._require_connected()
        return self.pose[:]

    def read_pwm_pose(self, servo_ids: list[int]) -> list[int]:
        self._require_connected()
        return [self.pwm_pose[servo_id - 1] for servo_id in servo_ids]

    def set_servo(self, servo_id: int, pulse: int, _time_ms: int) -> None:
        self._require_connected()
        self._validate(servo_id, pulse)
        self.pose[servo_id - 1] = pulse

    def set_pwm_servo(self, servo_id: int, pulse: int, time_ms: int) -> None:
        if not 0 <= time_ms <= 9999:
            raise HardwareError("PWM 舵机运动时间必须在 0 到 9999 ms 之间")
        self._validate_pwm(servo_id, pulse)
        self._require_connected()
        self.pwm_pose[servo_id - 1] = pulse

    def set_pose(self, positions: list[tuple[int, int]], time_ms: int) -> None:
        if not 0 <= time_ms <= 9999:
            raise HardwareError("舵机运动时间必须在 0 到 9999 ms 之间")
        for servo_id, pulse in positions:
            self._validate(servo_id, pulse)
        self._require_connected()
        for servo_id, pulse in positions:
            self.pose[servo_id - 1] = pulse

    def stop(self, _ids: list[int] | None = None) -> None:
        self._require_connected()

    def set_torque(self, servo_ids: list[int], enabled: bool) -> dict[str, Any]:
        self._require_connected()
        states: list[dict[str, Any]] = []
        for servo_id in servo_ids:
            if not 1 <= servo_id <= self.servo_count:
                raise HardwareError(f"舵机编号超出范围：{servo_id}")
            self.torque_enabled[servo_id - 1] = enabled
            states.append({"id": servo_id, "enabled": enabled, "raw": int(enabled)})
        return {"enabled": enabled, "requested": servo_ids, "states": states, "unavailable": []}

    def _require_connected(self) -> None:
        if not self.connected:
            raise HardwareError("模拟硬件尚未连接")

    def _validate(self, servo_id: int, pulse: int) -> None:
        if not 1 <= servo_id <= self.servo_count:
            raise HardwareError(f"舵机编号超出范围：{servo_id}")
        if not 0 <= pulse <= 1000:
            raise HardwareError(f"舵机值必须在 0 到 1000 之间：{pulse}")

    def _validate_pwm(self, servo_id: int, pulse: int) -> None:
        if not 1 <= servo_id <= PWM_SERVO_COUNT:
            raise HardwareError(f"PWM 舵机通道超出范围：{servo_id}")
        if not PWM_MIN_PULSE <= pulse <= PWM_MAX_PULSE:
            raise HardwareError(f"PWM 舵机值必须在 {PWM_MIN_PULSE} 到 {PWM_MAX_PULSE} 之间：{pulse}")

class SerialHardware:
    def __init__(self, tonypi_root: str, device: str = "/dev/ttyAMA0", servo_count: int = 18):
        self.tonypi_root = tonypi_root
        self.device = device
        self.servo_count = servo_count
        self.board = None
        self._lock = threading.RLock()

    def connect(self) -> None:
        sdk_path = f"{self.tonypi_root}/HiwonderSDK"
        if sdk_path not in sys.path:
            sys.path.insert(0, sdk_path)
        board = None
        try:
            module = importlib.import_module("hiwonder.ros_robot_controller_sdk")
            board = module.Board(device=self.device)
            board.enable_reception(True)
            self.board = board
        except Exception as exc:
            if board is not None:
                try:
                    board.enable_reception(False)
                    board.port.close()
                except Exception:
                    pass
            self.board = None
            raise HardwareError(f"无法连接舵机控制板：{exc}") from exc

    def disconnect(self) -> None:
        with self._lock:
            if self.board is not None:
                try:
                    self.board.enable_reception(False)
                    self.board.port.close()
                except Exception:
                    pass
            self.board = None

    def status(self) -> dict[str, Any]:
        return {
            "connected": self.board is not None,
            "mode": "serial",
            "device": self.device,
            "servo_count": self.servo_count,
            "available_servo_count": PHYSICAL_BUS_SERVO_COUNT,
            "pwm_servo_count": PWM_SERVO_COUNT,
        }

    def _require_board(self):
        if self.board is None:
            raise HardwareError("舵机控制板尚未连接")
        return self.board

    def read_pose(self) -> list[int | None]:
        with self._lock:
            board = self._require_board()
            values: list[int | None] = []
            for servo_id in range(1, self.servo_count + 1):
                if servo_id > PHYSICAL_BUS_SERVO_COUNT:
                    values.append(None)
                    continue
                try:
                    result = board.bus_servo_read_position(servo_id)
                    if not result:
                        values.append(None)
                        continue
                    position = int(result[0])
                    values.append(position if 0 <= position <= 1000 else None)
                except Exception:
                    values.append(None)
            return values

    def read_pwm_pose(self, servo_ids: list[int]) -> list[int]:
        with self._lock:
            board = self._require_board()
            values: list[int] = []
            for servo_id in servo_ids:
                self._validate_pwm(servo_id, PWM_MIN_PULSE)
                result = board.pwm_servo_read_position(servo_id)
                if result is None:
                    raise HardwareError(f"无法读取 PWM 舵机 {servo_id} 的位置")
                pulse = int(result)
                if not PWM_MIN_PULSE <= pulse <= PWM_MAX_PULSE:
                    raise HardwareError(f"PWM 舵机 {servo_id} 返回了无效位置：{pulse}")
                values.append(pulse)
            return values

    def set_servo(self, servo_id: int, pulse: int, time_ms: int) -> None:
        self.set_pose([(servo_id, pulse)], time_ms)

    def set_pwm_servo(self, servo_id: int, pulse: int, time_ms: int) -> None:
        if not 0 <= time_ms <= 9999:
            raise HardwareError("PWM 舵机运动时间必须在 0 到 9999 ms 之间")
        self._validate_pwm(servo_id, pulse)
        with self._lock:
            self._require_board().pwm_servo_set_position(time_ms / 1000.0, [(servo_id, pulse)])

    def set_pose(self, positions: list[tuple[int, int]], time_ms: int) -> None:
        if not positions:
            return
        if not 0 <= time_ms <= 9999:
            raise HardwareError("舵机运动时间必须在 0 到 9999 ms 之间")
        available_positions = [(servo_id, pulse) for servo_id, pulse in positions if servo_id <= PHYSICAL_BUS_SERVO_COUNT]
        for servo_id, pulse in available_positions:
            self._validate(servo_id, pulse)
        if not available_positions:
            return
        with self._lock:
            board = self._require_board()
            board.bus_servo_set_position(time_ms / 1000.0, available_positions)

    def stop(self, ids: list[int] | None = None) -> None:
        with self._lock:
            available_ids = [servo_id for servo_id in (ids or list(range(1, self.servo_count + 1))) if servo_id <= PHYSICAL_BUS_SERVO_COUNT]
            if available_ids:
                self._require_board().bus_servo_stop(available_ids)

    def set_torque(self, servo_ids: list[int], enabled: bool) -> dict[str, Any]:
        with self._lock:
            board = self._require_board()
            unavailable: list[int] = []
            available_ids: list[int] = []
            for servo_id in servo_ids:
                if not 1 <= servo_id <= self.servo_count:
                    raise HardwareError(f"舵机编号超出范围：{servo_id}")
                if servo_id > PHYSICAL_BUS_SERVO_COUNT:
                    unavailable.append(servo_id)
                    continue
                available_ids.append(servo_id)

                # The TonyPi board SDK has inverted semantics here:
                # enable=True sends the board's unload command (0x0B),
                # while enable=False sends the load command (0x0C).
                board.bus_servo_enable_torque(servo_id, not enabled)

            states: list[dict[str, Any]] = []
            for servo_id in available_ids:
                try:
                    result = board.bus_servo_read_torque_state(servo_id)
                    raw = int(result[0]) if result else None
                    states.append({
                        "id": servo_id,
                        "enabled": None if raw is None else raw == 1,
                        "raw": raw,
                    })
                except Exception:
                    states.append({"id": servo_id, "enabled": None, "raw": None})
            return {
                "enabled": enabled,
                "requested": servo_ids,
                "states": states,
                "unavailable": unavailable,
            }

    def _validate(self, servo_id: int, pulse: int) -> None:
        if not 1 <= servo_id <= self.servo_count:
            raise HardwareError(f"舵机编号超出范围：{servo_id}")
        if not 0 <= pulse <= 1000:
            raise HardwareError(f"舵机值必须在 0 到 1000 之间：{pulse}")

    def _validate_pwm(self, servo_id: int, pulse: int) -> None:
        if not 1 <= servo_id <= PWM_SERVO_COUNT:
            raise HardwareError(f"PWM 舵机通道超出范围：{servo_id}")
        if not PWM_MIN_PULSE <= pulse <= PWM_MAX_PULSE:
            raise HardwareError(f"PWM 舵机值必须在 {PWM_MIN_PULSE} 到 {PWM_MAX_PULSE} 之间：{pulse}")
