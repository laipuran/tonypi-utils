import type { Action, ActionGroupDocument, AgentStatus, GroupMeta } from "./types";

export type AgentSettings = {
  url: string;
  token: string;
};

const defaultSettings: AgentSettings = {
  url: "http://127.0.0.1:8765",
  token: "",
};

function loadSettings(): AgentSettings {
  try {
    const stored = localStorage.getItem("tonypi-agent-settings");
    if (stored) return { ...defaultSettings, ...JSON.parse(stored) };
  } catch {
    // localStorage is unavailable in some preview environments.
  }
  return defaultSettings;
}

let settings = loadSettings();

export function getAgentSettings(): AgentSettings {
  return { ...settings };
}

export function configureAgent(url: string, token: string): void {
  settings = { url: url.replace(/\/$/, ""), token };
  try {
    localStorage.setItem("tonypi-agent-settings", JSON.stringify(settings));
  } catch {
    // Keep the in-memory setting for private browsing contexts.
  }
}

export async function agentCall<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  let response: Response;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    response = await fetch(`${settings.url}/api/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, params, token: settings.token }),
      signal: controller.signal,
    });
  } catch (error) {
    const reason = error instanceof DOMException && error.name === "AbortError" ? "请求超时" : String(error);
    throw new Error(`无法连接 Agent ${settings.url}：${reason}`);
  } finally {
    window.clearTimeout(timeout);
  }
  const payload = await response.json() as { ok: boolean; result?: T; error?: string };
  if (!response.ok || !payload.ok) throw new Error(payload.error ?? `Agent HTTP 错误 ${response.status}`);
  return payload.result as T;
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
  readHeadPose: () => agentCall<{ servos: number[] }>("read_head_pose"),
  setServo: (id: number, pulse: number, timeMs = 100) =>
    agentCall<{ id: number; pulse: number }>("set_servo", { id, pulse, time_ms: timeMs }),
  setHeadServo: (id: number, pulse: number, timeMs = 100) =>
    agentCall<{ id: number; pulse: number }>("set_head_servo", { id, pulse, time_ms: timeMs }),
  setPose: (positions: { id: number; pulse: number }[], timeMs = 100) =>
    agentCall<{ count: number }>("set_pose", { positions, time_ms: timeMs }),
  stopHardware: () => agentCall<{ stopped: boolean }>("stop_hardware"),
  setTorque: (ids: number[], enabled: boolean) => agentCall("set_torque", { ids, enabled }),
  play: (actions: Action[], loop: boolean) => agentCall("playback_start", { actions, loop }),
  stopPlayback: () => agentCall("playback_stop"),
};
