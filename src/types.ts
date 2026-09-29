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
  pwm_servo_count: number;
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
export const HEAD_SERVO_DEFAULTS = [1500, 1435];

export const defaultServoNames = [
  "左脚左右",
  "左脚前后",
  "左小腿",
  "左大腿",
  "左胯",
  "左小臂",
  "左肩左右",
  "左肩前后",
  "右脚左右",
  "右脚前后",
  "右小腿",
  "右大腿",
  "右胯",
  "右小臂",
  "右肩左右",
  "右肩前后",
  "辅助 17",
  "辅助 18",
];

export function blankAction(): Action {
  return { index: 1, time: 500, servos: Array(SERVO_COUNT).fill(500) };
}
