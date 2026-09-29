import { invoke } from "@tauri-apps/api/core";
import type { Action, ActionGroupDocument, AgentStatus, GroupMeta } from "./types";

export function agentCall<T>(method: string, params: Record<string, unknown> = {}) {
  return invoke<T>("agent_call", { method, params });
}

export function configureAgent(host: string, port: number, token: string) {
  return invoke<void>("configure_agent", { host, port, token });
}

export const api = {
  status: () => agentCall<AgentStatus>("status"),
  groups: () => agentCall<GroupMeta[]>("list_groups"),
  load: (name: string) => agentCall<ActionGroupDocument>("load_group", { name }),
  save: (name: string, actions: Action[], servoCount: number) =>
    agentCall<ActionGroupDocument>("save_group", { name, actions, servo_count: servoCount }),
  remove: (name: string) => agentCall<{ deleted: string }>("delete_group", { name }),
  merge: (first: string, second: string, target: string) =>
    agentCall<ActionGroupDocument>("merge_groups", { first, second, target }),
  connectHardware: (mode: "mock" | "serial", device?: string) =>
    agentCall<AgentStatus["hardware"]>("hardware_connect", { mode, device }),
  disconnectHardware: () => agentCall<AgentStatus["hardware"]>("hardware_disconnect"),
  readPose: () => agentCall<{ servos: number[] }>("read_pose"),
  setServo: (id: number, pulse: number, timeMs = 100) =>
    agentCall<{ id: number; pulse: number }>("set_servo", { id, pulse, time_ms: timeMs }),
  setPose: (positions: { id: number; pulse: number }[], timeMs = 100) =>
    agentCall<{ count: number }>("set_pose", { positions, time_ms: timeMs }),
  stopHardware: () => agentCall<{ stopped: boolean }>("stop_hardware"),
  setTorque: (ids: number[], enabled: boolean) => agentCall("set_torque", { ids, enabled }),
  play: (actions: Action[], loop: boolean) => agentCall("playback_start", { actions, loop }),
  stopPlayback: () => agentCall("playback_stop"),
};
