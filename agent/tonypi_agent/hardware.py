from __future__ import annotations

import importlib
import sys
import threading
from typing import Any


class HardwareError(RuntimeError):
    """A hardware connection or command error."""


class MockHardware:
    def __init__(self, servo_count: int = 18):
        self.servo_count = servo_count
        self.pose = [500] * servo_count
        self.connected = False
        self.torque_enabled = [True] * servo_count

    def connect(self) -> None:
        self.connected = True

    def disconnect(self) -> None:
        self.connected = False

    def status(self) -> dict[str, Any]:
        return {"connected": self.connected, "mode": "mock", "device": "mock", "servo_count": self.servo_count}

    def read_pose(self) -> list[int]:
        self._require_connected()
        return self.pose[:]

    def set_servo(self, servo_id: int, pulse: int, _time_ms: int) -> None:
        self._require_connected()
        self._validate(servo_id, pulse)
        self.pose[servo_id - 1] = pulse

    def set_pose(self, positions: list[tuple[int, int]], _time_ms: int) -> None:
        for servo_id, pulse in positions:
            self.set_servo(servo_id, pulse, _time_ms)

    def stop(self, _ids: list[int] | None = None) -> None:
        self._require_connected()

    def set_torque(self, servo_ids: list[int], enabled: bool) -> None:
        self._require_connected()
        for servo_id in servo_ids:
            if not 1 <= servo_id <= self.servo_count:
                raise HardwareError(f"舵机编号超出范围：{servo_id}")
            self.torque_enabled[servo_id - 1] = enabled

    def _require_connected(self) -> None:
        if not self.connected:
            raise HardwareError("模拟硬件尚未连接")

    def _validate(self, servo_id: int, pulse: int) -> None:
        if not 1 <= servo_id <= self.servo_count:
            raise HardwareError(f"舵机编号超出范围：{servo_id}")
        if not 0 <= pulse <= 1000:
            raise HardwareError(f"舵机值必须在 0 到 1000 之间：{pulse}")


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
        try:
            module = importlib.import_module("hiwonder.ros_robot_controller_sdk")
            self.board = module.Board(device=self.device)
            self.board.enable_reception(True)
        except Exception as exc:
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
        }

    def _require_board(self):
        if self.board is None:
            raise HardwareError("舵机控制板尚未连接")
        return self.board

    def read_pose(self) -> list[int]:
        with self._lock:
            board = self._require_board()
            values: list[int] = []
            for servo_id in range(1, self.servo_count + 1):
                result = board.bus_servo_read_position(servo_id)
                values.append(int(result[0]) if result else 500)
            return values

    def set_servo(self, servo_id: int, pulse: int, time_ms: int) -> None:
        self.set_pose([(servo_id, pulse)], time_ms)

    def set_pose(self, positions: list[tuple[int, int]], time_ms: int) -> None:
        if not positions:
            return
        if not 0 <= time_ms <= 9999:
            raise HardwareError("舵机运动时间必须在 0 到 9999 ms 之间")
        with self._lock:
            board = self._require_board()
            board.bus_servo_set_position(time_ms / 1000.0, positions)

    def stop(self, ids: list[int] | None = None) -> None:
        with self._lock:
            self._require_board().bus_servo_stop(ids or list(range(1, self.servo_count + 1)))

    def set_torque(self, servo_ids: list[int], enabled: bool) -> None:
        with self._lock:
            board = self._require_board()
            for servo_id in servo_ids:
                board.bus_servo_enable_torque(servo_id, enabled)
