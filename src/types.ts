export type Action = {
  index: number;
  time: number;
  servos: number[];
};

export type ActionGroupDocument = {
  name: string;
  servo_count: number;
  actions: Action[];
};

export type GroupMeta = {
  name: string;
  action_count: number | null;
  total_time: number | null;
  servo_count: number | null;
};

export type HardwareStatus = {
  connected: boolean;
  mode: string;
  device: string;
  servo_count: number;
};

export type AgentStatus = {
  root: string;
  action_dir: string;
  hardware: HardwareStatus;
  playback: {
    running: boolean;
    loop: boolean;
    action_index: number | null;
  };
};

export const SERVO_COUNT = 18;

export const defaultServoNames = [
  "头部水平",
  "头部俯仰",
  "左肩",
  "左肘",
  "左腕",
  "右肩",
  "右肘",
  "右腕",
  "左髋",
  "左膝",
  "左踝",
  "右髋",
  "右膝",
  "右踝",
  "左脚",
  "右脚",
  "辅助 17",
  "辅助 18",
];

export function blankAction(): Action {
  return { index: 1, time: 500, servos: Array(SERVO_COUNT).fill(500) };
}
