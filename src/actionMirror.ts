import type { Action, ActionGroupDocument } from "./types";

// The first sixteen bus servos are arranged as eight left/right pairs.
// Each pair uses the opposite pulse direction on the physical robot, so a
// mirror swaps the pair and complements both values around the 0–1000 range.
const MIRROR_SERVO_PAIRS = [
  [0, 8],
  [1, 9],
  [2, 10],
  [3, 11],
  [4, 12],
  [5, 13],
  [6, 14],
  [7, 15],
] as const;

function mirrorPulse(value: number): number {
  return 1000 - value;
}

export function mirrorAction(action: Action): Action {
  const servos = [...action.servos];
  for (const [leftIndex, rightIndex] of MIRROR_SERVO_PAIRS) {
    if (leftIndex >= servos.length || rightIndex >= servos.length) continue;
    const left = servos[leftIndex];
    const right = servos[rightIndex];
    servos[leftIndex] = mirrorPulse(right);
    servos[rightIndex] = mirrorPulse(left);
  }
  return { ...action, servos };
}

export function mirrorActionGroup(document: ActionGroupDocument): ActionGroupDocument {
  return {
    ...document,
    actions: document.actions.map(mirrorAction),
  };
}
