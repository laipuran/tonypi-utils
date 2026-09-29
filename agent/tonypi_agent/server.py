from __future__ import annotations

import json
import socketserver
import threading
from typing import Any

from .action_groups import ActionGroupError, ActionGroupRepository, DEFAULT_SERVO_COUNT
from .hardware import HardwareError, MockHardware, SerialHardware
from .playback import PlaybackController


class AgentError(RuntimeError):
    pass


class Agent:
    def __init__(self, root: str, token: str = "", hardware_mode: str = "mock", device: str = "/dev/ttyAMA0"):
        self.repository = ActionGroupRepository(root)
        self.token = token
        self.hardware = MockHardware(DEFAULT_SERVO_COUNT) if hardware_mode == "mock" else SerialHardware(root, device)
        self.hardware_mode = hardware_mode
        self.playback = PlaybackController(self.hardware)

    def dispatch(self, method: str, params: dict[str, Any]) -> Any:
        if method == "ping":
            return {"agent": "tonypi-action-editor", "version": 1}
        if method == "status":
            return {
                "root": str(self.repository.root),
                "action_dir": str(self.repository.action_dir),
                "hardware": self.hardware.status(),
                "playback": self.playback.status(),
            }
        if method == "list_groups":
            return self.repository.list_groups()
        if method == "load_group":
            return self.repository.load_group(params["name"])
        if method == "save_group":
            return self.repository.save_group(params["name"], params["actions"], int(params.get("servo_count", DEFAULT_SERVO_COUNT)))
        if method == "delete_group":
            self.repository.delete_group(params["name"])
            return {"deleted": params["name"]}
        if method == "merge_groups":
            return self.repository.merge_groups(params["first"], params["second"], params["target"])
        if method == "hardware_connect":
            mode = params.get("mode", self.hardware_mode)
            if mode != self.hardware_mode:
                self.playback.stop()
                self.hardware.disconnect()
                self.hardware = MockHardware(DEFAULT_SERVO_COUNT) if mode == "mock" else SerialHardware(str(self.repository.root), params.get("device", "/dev/ttyAMA0"))
                self.playback.hardware = self.hardware
                self.hardware_mode = mode
            self.hardware.connect()
            return self.hardware.status()
        if method == "hardware_disconnect":
            self.playback.stop()
            self.hardware.disconnect()
            return self.hardware.status()
        if method == "read_pose":
            return {"servos": self.hardware.read_pose()}
        if method == "set_servo":
            self.hardware.set_servo(int(params["id"]), int(params["pulse"]), int(params.get("time_ms", 100)))
            return {"id": int(params["id"]), "pulse": int(params["pulse"])}
        if method == "set_pose":
            positions = [(int(item["id"]), int(item["pulse"])) for item in params["positions"]]
            self.hardware.set_pose(positions, int(params.get("time_ms", 100)))
            return {"count": len(positions)}
        if method == "stop_hardware":
            self.hardware.stop()
            return {"stopped": True}
        if method == "set_torque":
            ids = [int(value) for value in params.get("ids", range(1, DEFAULT_SERVO_COUNT + 1))]
            self.hardware.set_torque(ids, bool(params["enabled"]))
            return {"enabled": bool(params["enabled"]), "ids": ids}
        if method == "playback_start":
            if not self.hardware.status()["connected"]:
                raise HardwareError("请先连接硬件，再播放动作组")
            self.playback.start(params["actions"], bool(params.get("loop", False)))
            return self.playback.status()
        if method == "playback_stop":
            self.playback.stop()
            return self.playback.status()
        if method == "playback_status":
            return self.playback.status()
        raise AgentError(f"未知方法：{method}")


class RequestHandler(socketserver.StreamRequestHandler):
    def handle(self) -> None:
        agent: Agent = self.server.agent  # type: ignore[attr-defined]
        for raw_line in self.rfile:
            if not raw_line.strip():
                continue
            request: dict[str, Any] = {}
            try:
                request = json.loads(raw_line.decode("utf-8"))
                if agent.token and request.get("token") != agent.token:
                    raise AgentError("访问令牌错误")
                result = agent.dispatch(request["method"], request.get("params", {}))
                response = {"id": request.get("id"), "ok": True, "result": result}
            except Exception as exc:
                response = {"id": request.get("id"), "ok": False, "error": str(exc)}
            self.wfile.write((json.dumps(response, ensure_ascii=False) + "\n").encode("utf-8"))
            self.wfile.flush()


class AgentServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

    def __init__(self, address, agent: Agent):
        self.agent = agent
        super().__init__(address, RequestHandler)
