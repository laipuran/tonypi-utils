from __future__ import annotations

import os
import re
import sqlite3
import tempfile
from pathlib import Path
from typing import Any


DEFAULT_SERVO_COUNT = 18
MIN_PULSE = 0
MAX_PULSE = 1000
MIN_TIME_MS = 20
MAX_TIME_MS = 9999
_SAFE_NAME = re.compile(r"^[^/\\\x00]+$")


class ActionGroupError(ValueError):
    """A user-correctable action group error."""


def _validate_name(name: str) -> str:
    clean = str(name).strip()
    if clean.endswith(".d6a"):
        clean = clean[:-4]
    if not clean or not _SAFE_NAME.fullmatch(clean) or clean in {".", ".."}:
        raise ActionGroupError("动作组名称不能为空，且不能包含路径分隔符")
    return clean


def _int_value(value: Any, label: str) -> int:
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ActionGroupError(f"{label} 必须是整数") from exc


def normalize_actions(actions: list[dict[str, Any]], servo_count: int) -> list[dict[str, Any]]:
    if not 1 <= servo_count <= 32:
        raise ActionGroupError("舵机数量必须在 1 到 32 之间")

    normalized: list[dict[str, Any]] = []
    for position, action in enumerate(actions, start=1):
        if not isinstance(action, dict):
            raise ActionGroupError(f"第 {position} 个动作格式错误")
        duration = _int_value(action.get("time", action.get("Time", 500)), f"第 {position} 个动作的时间")
        if not MIN_TIME_MS <= duration <= MAX_TIME_MS:
            raise ActionGroupError(f"第 {position} 个动作时间必须在 {MIN_TIME_MS} 到 {MAX_TIME_MS} ms 之间")
        values = action.get("servos", action.get("servo_values"))
        if not isinstance(values, list) or len(values) != servo_count:
            raise ActionGroupError(f"第 {position} 个动作必须包含 {servo_count} 个舵机值")
        pulses = [_int_value(value, f"第 {position} 个动作的舵机值") for value in values]
        if any(value < MIN_PULSE or value > MAX_PULSE for value in pulses):
            raise ActionGroupError(f"第 {position} 个动作的舵机值必须在 {MIN_PULSE} 到 {MAX_PULSE} 之间")
        normalized.append({"index": position, "time": duration, "servos": pulses})
    return normalized


class ActionGroupRepository:
    """Deep module for compatible .d6a persistence and action validation."""

    def __init__(self, tonypi_root: str | Path):
        self.root = Path(tonypi_root).expanduser().resolve()
        self.action_dir = self.root / "ActionGroups"
        self.action_dir.mkdir(parents=True, exist_ok=True)

    def _path(self, name: str) -> Path:
        return self.action_dir / f"{_validate_name(name)}.d6a"

    @staticmethod
    def _servo_columns(columns: list[str]) -> list[str]:
        servo_columns = [column for column in columns if column.lower().startswith("servo")]
        servo_columns.sort(key=lambda column: int(column[5:]) if column[5:].isdigit() else 0)
        return servo_columns

    def list_groups(self) -> list[dict[str, Any]]:
        result: list[dict[str, Any]] = []
        for path in sorted(self.action_dir.glob("*.d6a"), key=lambda item: item.name.lower()):
            try:
                document = self.load_group(path.stem)
                result.append(
                    {
                        "name": path.stem,
                        "action_count": len(document["actions"]),
                        "total_time": sum(action["time"] for action in document["actions"]),
                        "servo_count": document["servo_count"],
                    }
                )
            except (sqlite3.Error, ActionGroupError, OSError):
                result.append({"name": path.stem, "action_count": None, "total_time": None, "servo_count": None})
        return result

    def load_group(self, name: str) -> dict[str, Any]:
        path = self._path(name)
        if not path.exists():
            raise ActionGroupError(f"找不到动作组：{_validate_name(name)}")
        with sqlite3.connect(path) as connection:
            columns = [row[1] for row in connection.execute("PRAGMA table_info(ActionGroup)")]
            servo_columns = self._servo_columns(columns)
            if not servo_columns or "Time" not in columns:
                raise ActionGroupError(f"动作组文件缺少有效的 ActionGroup 表：{path.name}")
            rows = connection.execute(
                f"SELECT [Index], [Time], {', '.join(servo_columns)} FROM ActionGroup ORDER BY [Index]"
            ).fetchall()
        actions = [
            {"index": int(row[0]), "time": int(row[1]), "servos": [int(value) for value in row[2:]]}
            for row in rows
        ]
        return {"name": path.stem, "servo_count": len(servo_columns), "actions": actions}

    def save_group(self, name: str, actions: list[dict[str, Any]], servo_count: int = DEFAULT_SERVO_COUNT) -> dict[str, Any]:
        clean_name = _validate_name(name)
        normalized = normalize_actions(actions, servo_count)
        destination = self._path(clean_name)
        fd, temporary_name = tempfile.mkstemp(prefix=f".{clean_name}.", suffix=".d6a", dir=self.action_dir)
        os.close(fd)
        temporary = Path(temporary_name)
        try:
            with sqlite3.connect(temporary) as connection:
                servo_columns = ", ".join(f"Servo{i} INTEGER NOT NULL" for i in range(1, servo_count + 1))
                connection.execute(
                    f"CREATE TABLE ActionGroup ("
                    f"[Index] INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE, "
                    f"Time INTEGER NOT NULL, {servo_columns})"
                )
                columns = ", ".join(["Time", *[f"Servo{i}" for i in range(1, servo_count + 1)]])
                placeholders = ", ".join("?" for _ in range(servo_count + 1))
                connection.executemany(
                    f"INSERT INTO ActionGroup ({columns}) VALUES ({placeholders})",
                    [(action["time"], *action["servos"]) for action in normalized],
                )
                connection.commit()
            os.replace(temporary, destination)
        finally:
            if temporary.exists():
                temporary.unlink()
        return {"name": clean_name, "servo_count": servo_count, "actions": normalized}

    def delete_group(self, name: str) -> None:
        path = self._path(name)
        if not path.exists():
            raise ActionGroupError(f"找不到动作组：{_validate_name(name)}")
        path.unlink()

    def merge_groups(self, first: str, second: str, target: str) -> dict[str, Any]:
        left = self.load_group(first)
        right = self.load_group(second)
        if left["servo_count"] != right["servo_count"]:
            raise ActionGroupError("两个动作组的舵机数量不一致，无法合并")
        return self.save_group(target, [*left["actions"], *right["actions"]], left["servo_count"])
