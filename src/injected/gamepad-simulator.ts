const GAMEPAD_ID = 'Xbox 360 Controller (XInput STANDARD GAMEPAD)';

interface FakeButton {
  pressed: boolean;
  touched: boolean;
  value: number;
}

export const AxisDirection = { UP: 0, DOWN: 1, LEFT: 2, RIGHT: 3 } as const;

export type AxisDirection = (typeof AxisDirection)[keyof typeof AxisDirection];

const directionMeta: Record<
  AxisDirection,
  { position: number; value: number; opposite: AxisDirection }
> = {
  [AxisDirection.UP]: { position: 1, value: -1, opposite: AxisDirection.DOWN },
  [AxisDirection.DOWN]: { position: 1, value: 1, opposite: AxisDirection.UP },
  [AxisDirection.LEFT]: {
    position: 0,
    value: -1,
    opposite: AxisDirection.RIGHT,
  },
  [AxisDirection.RIGHT]: {
    position: 0,
    value: 1,
    opposite: AxisDirection.LEFT,
  },
};

function createButton(): FakeButton {
  return { pressed: false, touched: false, value: 0 };
}

const g_buttons: FakeButton[] = Array.from({ length: 17 }, createButton);
let g_axes: number[] = [0, 0, 0, 0];
let g_timestamp = performance.now();
let g_connected = false;
let g_enabled = false;
const g_originalGetGamepads = navigator.getGamepads.bind(navigator);
// Track which directions are pressed per stick: [stick][direction] = boolean
let g_dirPressed: boolean[][] = [
  [false, false, false, false],
  [false, false, false, false],
];

function snapshot(): Gamepad {
  return {
    id: GAMEPAD_ID,
    index: 0,
    mapping: 'standard',
    connected: g_connected,
    buttons: g_buttons.map((b) => ({ ...b })),
    axes: [...g_axes],
    timestamp: g_timestamp,
    hapticActuators: [] as unknown as GamepadHapticActuator[],
    vibrationActuator: null,
  } as unknown as Gamepad;
}

function reset(): void {
  for (const btn of g_buttons) {
    btn.pressed = false;
    btn.touched = false;
    btn.value = 0;
  }
  g_axes = [0, 0, 0, 0];
  g_dirPressed = [
    [false, false, false, false],
    [false, false, false, false],
  ];
}

// Patch getGamepads immediately on module load
navigator.getGamepads = (): (Gamepad | null)[] => {
  if (g_enabled) {
    return [snapshot(), null, null, null];
  }
  return g_originalGetGamepads();
};

export function enable(): void {
  if (g_enabled) {
    return;
  }
  reset();
  g_enabled = true;
  g_connected = true;
  g_timestamp = performance.now();
  const evt = new Event('gamepadconnected');
  (evt as unknown as Record<string, unknown>)['gamepad'] = snapshot();
  window.dispatchEvent(evt);
}

export function disable(): void {
  if (!g_enabled) {
    return;
  }
  g_connected = false;
  g_timestamp = performance.now();
  const evt = new Event('gamepaddisconnected');
  (evt as unknown as Record<string, unknown>)['gamepad'] = snapshot();
  window.dispatchEvent(evt);
  g_enabled = false;
  reset();
}

export function isEnabled(): boolean {
  return g_enabled;
}

export function resetState(): void {
  reset();
  g_timestamp = performance.now();
}

export function pressButton(index: number): void {
  const btn = g_buttons[index];
  if (btn) {
    btn.pressed = true;
    btn.touched = true;
    btn.value = 1;
    g_timestamp = performance.now();
  }
}

export function unpressButton(index: number): void {
  const btn = g_buttons[index];
  if (btn) {
    btn.pressed = false;
    btn.touched = false;
    btn.value = 0;
    g_timestamp = performance.now();
  }
}

export function pressDirection(stick: number, direction: AxisDirection): void {
  const meta = directionMeta[direction];
  const dirArr = g_dirPressed[stick];
  if (!dirArr) {
    return;
  }
  dirArr[direction] = true;
  const oppMeta = directionMeta[meta.opposite];
  const axisIndex = stick * 2 + meta.position;
  const value = meta.value + (dirArr[meta.opposite] ? oppMeta.value : 0);
  g_axes[axisIndex] = value;
  g_timestamp = performance.now();
}

export function unpressDirection(
  stick: number,
  direction: AxisDirection
): void {
  const meta = directionMeta[direction];
  const dirArr = g_dirPressed[stick];
  if (!dirArr) {
    return;
  }
  dirArr[direction] = false;
  const axisIndex = stick * 2 + meta.position;
  if (dirArr[meta.opposite]) {
    g_axes[axisIndex] = directionMeta[meta.opposite].value;
  } else {
    g_axes[axisIndex] = 0;
  }
  g_timestamp = performance.now();
}

export function moveStick(stick: number, x: number, y: number): void {
  g_axes[stick * 2] = x;
  g_axes[stick * 2 + 1] = y;
  g_timestamp = performance.now();
}

export function restore(): void {
  navigator.getGamepads = g_originalGetGamepads;
}
