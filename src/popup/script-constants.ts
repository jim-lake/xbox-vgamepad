import { StyleSheet } from '@/components/base_components';
import type { StyleInput } from '@/components/base_components';
import type { GamepadActionName } from '@/types/gamepad';

export const ACTION_NAMES: GamepadActionName[] = [
  'a',
  'b',
  'x',
  'y',
  'leftShoulder',
  'rightShoulder',
  'leftTrigger',
  'rightTrigger',
  'select',
  'start',
  'dpadUp',
  'dpadDown',
  'dpadLeft',
  'dpadRight',
  'leftStickPressed',
  'rightStickPressed',
  'leftStickUp',
  'leftStickDown',
  'leftStickLeft',
  'leftStickRight',
  'rightStickUp',
  'rightStickDown',
  'rightStickLeft',
  'rightStickRight',
  'home',
];

export const ACTION_LABEL: Record<GamepadActionName, string> = {
  a: 'A',
  b: 'B',
  x: 'X',
  y: 'Y',
  leftShoulder: 'LB',
  rightShoulder: 'RB',
  leftTrigger: 'LT',
  rightTrigger: 'RT',
  select: 'Select',
  start: 'Start',
  dpadUp: 'D-Up',
  dpadDown: 'D-Down',
  dpadLeft: 'D-Left',
  dpadRight: 'D-Right',
  leftStickPressed: 'LS Press',
  rightStickPressed: 'RS Press',
  leftStickUp: 'LS Up',
  leftStickDown: 'LS Down',
  leftStickLeft: 'LS Left',
  leftStickRight: 'LS Right',
  rightStickUp: 'RS Up',
  rightStickDown: 'RS Down',
  rightStickLeft: 'RS Left',
  rightStickRight: 'RS Right',
  home: 'Home',
  toggleGamepad: 'Toggle Gamepad',
  toggleAllGamepads: 'Toggle All Gamepads',
  toggleExtension: 'Toggle Extension',
};

export const TYPE_OPTIONS = [
  { value: 'down', text: 'Down' },
  { value: 'up', text: 'Up' },
  { value: 'delay', text: 'Delay' },
  { value: 'loop', text: 'Loop' },
];

export const ACTION_OPTIONS = ACTION_NAMES.map((a) => ({
  value: a,
  text: ACTION_LABEL[a],
}));

// Pre-computed indent styles for nesting levels 0–4.
// Each level adds 1.5rem of left padding on top of the 0.5rem base.
const indentStyles = StyleSheet.create({
  i0: { paddingLeft: '0.5rem' },
  i1: { paddingLeft: '2.0rem' },
  i2: { paddingLeft: '3.5rem' },
  i3: { paddingLeft: '5.0rem' },
  i4: { paddingLeft: '6.5rem' },
});

const INDENT_STYLE: StyleInput[] = [
  indentStyles.i0,
  indentStyles.i1,
  indentStyles.i2,
  indentStyles.i3,
  indentStyles.i4,
];

export function indentStyle(level: number): StyleInput {
  return (
    INDENT_STYLE[Math.min(level, INDENT_STYLE.length - 1)] ?? indentStyles.i4
  );
}
