/**
 * Shared press/unpress helpers used by both input-processor and script-runner.
 * Extracted to avoid circular imports.
 */

import type { GamepadAction } from '@/types/gamepad';
import { BUTTON_MAP, Direction } from '@/types/gamepad';
import { AxisDirection, getSimulator } from './gamepad-simulator';

const AXIS_ACTION_MAP: Record<string, { stick: number; direction: Direction }> =
  {
    leftStickUp: { stick: 0, direction: Direction.UP },
    leftStickDown: { stick: 0, direction: Direction.DOWN },
    leftStickLeft: { stick: 0, direction: Direction.LEFT },
    leftStickRight: { stick: 0, direction: Direction.RIGHT },
    rightStickUp: { stick: 1, direction: Direction.UP },
    rightStickDown: { stick: 1, direction: Direction.DOWN },
    rightStickLeft: { stick: 1, direction: Direction.LEFT },
    rightStickRight: { stick: 1, direction: Direction.RIGHT },
  };

const directionToAxis: Record<Direction, AxisDirection> = {
  [Direction.UP]: AxisDirection.UP,
  [Direction.DOWN]: AxisDirection.DOWN,
  [Direction.LEFT]: AxisDirection.LEFT,
  [Direction.RIGHT]: AxisDirection.RIGHT,
};

export function executePress(action: GamepadAction): void {
  const sim = getSimulator(action.gamepadIndex);
  const buttonIndex = BUTTON_MAP[action.action];
  if (buttonIndex !== undefined) {
    sim.pressButton(buttonIndex);
    return;
  }
  const axisInfo = AXIS_ACTION_MAP[action.action];
  if (axisInfo) {
    sim.pressDirection(axisInfo.stick, directionToAxis[axisInfo.direction]);
  }
}

export function executeUnpress(action: GamepadAction): void {
  const sim = getSimulator(action.gamepadIndex);
  const buttonIndex = BUTTON_MAP[action.action];
  if (buttonIndex !== undefined) {
    sim.unpressButton(buttonIndex);
    return;
  }
  const axisInfo = AXIS_ACTION_MAP[action.action];
  if (axisInfo) {
    sim.unpressDirection(axisInfo.stick, directionToAxis[axisInfo.direction]);
  }
}
