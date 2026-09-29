export type Action = {
  index: number;
  time: number;
  servos: number[];
};

export type RobotPose = {
  servos: (number | null)[];
  unavailable: number[];
};

export type TorqueResult = {
  enabled: boolean;
  requested: number[];
  states: Array<{ id: number; enabled: boolean | null; raw: number | null }>;
  unavailable: number[];
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
  available_servo_count: number;
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
export const DEFAULT_STAND_ACTION: Action = {
  index: 1,
  time: 500,
  servos: [500, 390, 500, 600, 500, 575, 800, 725, 500, 610, 500, 400, 500, 425, 200, 275, 500, 500],
};

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

export function blankAction(template: Action = DEFAULT_STAND_ACTION): Action {
  return { ...template, index: 1, servos: [...template.servos] };
}
