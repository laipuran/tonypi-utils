from __future__ import annotations

import threading
import time
from typing import Any


class PlaybackController:
    def __init__(self, hardware):
        self.hardware = hardware
        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None
        self._status = {"running": False, "loop": False, "action_index": None}

    def status(self) -> dict[str, Any]:
        with self._lock:
            return dict(self._status)

    def start(self, actions: list[dict[str, Any]], loop: bool) -> None:
        with self._lock:
            if self._thread and self._thread.is_alive():
                raise RuntimeError("已有动作组正在播放")
            if not actions:
                raise ValueError("不能播放空动作组")
            self._stop_event.clear()
            self._status = {"running": True, "loop": loop, "action_index": 0}
            self._thread = threading.Thread(target=self._run, args=(actions, loop), daemon=True)
            self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        try:
            self.hardware.stop()
        except Exception:
            pass

    def _run(self, actions: list[dict[str, Any]], loop: bool) -> None:
        try:
            while True:
                for index, action in enumerate(actions):
                    if self._stop_event.is_set():
                        return
                    with self._lock:
                        self._status["action_index"] = index
                    positions = [(servo_id, pulse) for servo_id, pulse in enumerate(action["servos"], start=1)]
                    self.hardware.set_pose(positions, int(action["time"]))
                    if self._stop_event.wait(int(action["time"]) / 1000):
                        return
                if not loop:
                    return
        finally:
            with self._lock:
                self._status = {"running": False, "loop": False, "action_index": None}
