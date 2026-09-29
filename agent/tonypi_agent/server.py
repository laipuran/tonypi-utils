from __future__ import annotations

import json
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from .action_groups import ActionGroupRepository, DEFAULT_SERVO_COUNT, normalize_actions
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
            if mode not in {"mock", "serial"}:
                raise AgentError(f"未知硬件模式：{mode}")
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
            actions = normalize_actions(params["actions"], int(params.get("servo_count", DEFAULT_SERVO_COUNT)))
            self.playback.start(actions, bool(params.get("loop", False)))
            return self.playback.status()
        if method == "playback_stop":
            self.playback.stop()
            return self.playback.status()
        if method == "playback_status":
            return self.playback.status()
        raise AgentError(f"未知方法：{method}")


class AgentRequestHandler(BaseHTTPRequestHandler):
    """Small HTTP adapter exposing the deep Agent interface to browser clients."""

    server_version = "TonyPiAgent/1.0"

    def _agent(self) -> Agent:
        return self.server.agent  # type: ignore[attr-defined]

    def _cors_origin(self) -> str:
        return self.server.cors_origin  # type: ignore[attr-defined]

    def _write_json(self, response: dict[str, Any], status: int = HTTPStatus.OK) -> None:
        payload = json.dumps(response, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Access-Control-Allow-Origin", self._cors_origin())
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._write_json({"ok": True})

    def do_GET(self) -> None:  # noqa: N802
        if self.path != "/api/health":
            self._write_json({"ok": False, "error": "找不到请求路径"}, HTTPStatus.NOT_FOUND)
            return
        self._write_json({"ok": True, "result": self._agent().dispatch("ping", {})})

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/api/call":
            self._write_json({"ok": False, "error": "找不到请求路径"}, HTTPStatus.NOT_FOUND)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            request = json.loads(self.rfile.read(length).decode("utf-8"))
            if self._agent().token and request.get("token") != self._agent().token:
                raise AgentError("访问令牌错误")
            result = self._agent().dispatch(request["method"], request.get("params", {}))
            self._write_json({"ok": True, "result": result})
        except Exception as exc:
            self._write_json({"ok": False, "error": str(exc)})

    def log_message(self, _format: str, *_args: Any) -> None:
        return


class AgentHttpServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True

    def __init__(self, address, agent: Agent, cors_origin: str = "http://127.0.0.1:1420"):
        self.agent = agent
        self.cors_origin = cors_origin
        super().__init__(address, AgentRequestHandler)
