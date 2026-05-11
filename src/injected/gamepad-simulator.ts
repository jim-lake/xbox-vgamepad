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
let g_mode: 'combine' | 'separate' = 'separate';
// Track which directions are pressed per stick: [stick][direction] = press count
let g_dirPressed: number[][] = [
  [0, 0, 0, 0],
  [0, 0, 0, 0],
];
// Reference counts for button presses
let g_buttonPressCount: number[] = Array.from<number>({ length: 17 }).fill(0);

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
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  g_buttonPressCount = Array.from<number>({ length: 17 }).fill(0);
}

function padToPlain(
  pad: Gamepad,
  overrides?: Partial<{ index: number }>
): Gamepad {
  return {
    id: pad.id,
    index: overrides?.index ?? pad.index,
    mapping: pad.mapping,
    connected: pad.connected,
    buttons: Array.from(pad.buttons).map((b) => ({
      pressed: b.pressed,
      touched: b.touched,
      value: b.value,
    })),
    axes: Array.from(pad.axes),
    timestamp: pad.timestamp,
    hapticActuators: [] as unknown as GamepadHapticActuator[],
    vibrationActuator: null,
  } as unknown as Gamepad;
}

// Patch getGamepads immediately on module load
navigator.getGamepads = (): (Gamepad | null)[] => {
  if (g_enabled) {
    const real = g_originalGetGamepads();
    if (g_mode === 'combine') {
      // Merge all real pad inputs into virtual state, virtual axes take priority
      const merged = snapshot();
      const mergedButtons = Array.from(merged.buttons).map((b) => ({
        pressed: b.pressed,
        touched: b.touched,
        value: b.value,
      }));
      const mergedAxes = Array.from(merged.axes);
      for (const pad of real) {
        if (!pad) {
          continue;
        }
        for (let i = 0; i < mergedButtons.length; i++) {
          const rb = pad.buttons[i];
          if (rb?.pressed) {
            const mb = mergedButtons[i];
            if (mb) {
              mb.pressed = true;
              mb.touched = true;
              mb.value = 1;
            }
          }
        }
        // Virtual axes override: only use real axis if virtual axis is 0
        for (let i = 0; i < mergedAxes.length; i++) {
          if (mergedAxes[i] === 0) {
            mergedAxes[i] = pad.axes[i] ?? 0;
          }
        }
      }
      return [
        {
          id: merged.id,
          index: merged.index,
          mapping: merged.mapping,
          connected: merged.connected,
          buttons: mergedButtons,
          axes: mergedAxes,
          timestamp: merged.timestamp,
          hapticActuators: [] as unknown as GamepadHapticActuator[],
          vibrationActuator: null,
        } as unknown as Gamepad,
        null,
        null,
        null,
      ];
    } else {
      // Separate: virtual pad at first free slot, real pads fill remaining slots
      const result: (Gamepad | null)[] = [null, null, null, null];
      // Find first free slot for virtual pad
      const realPads = Array.from(real).filter((p): p is Gamepad => p !== null);
      let virtualSlot = 0;
      while (virtualSlot < 4 && realPads.some((p) => p.index === virtualSlot)) {
        virtualSlot++;
      }
      if (virtualSlot < 4) {
        const s = snapshot();
        result[virtualSlot] = padToPlain(s, { index: virtualSlot });
      }
      // Place real pads into remaining slots in order
      let nextSlot = 0;
      for (const pad of realPads) {
        while (nextSlot < 4 && nextSlot === virtualSlot) {
          nextSlot++;
        }
        if (nextSlot < 4) {
          result[nextSlot] = padToPlain(pad, { index: nextSlot });
          nextSlot++;
        }
      }
      return result;
    }
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
    g_buttonPressCount[index] = (g_buttonPressCount[index] ?? 0) + 1;
    btn.pressed = true;
    btn.touched = true;
    btn.value = 1;
    g_timestamp = performance.now();
  }
}

export function unpressButton(index: number): void {
  const btn = g_buttons[index];
  if (btn) {
    const count = (g_buttonPressCount[index] ?? 1) - 1;
    g_buttonPressCount[index] = Math.max(0, count);
    if (g_buttonPressCount[index] === 0) {
      btn.pressed = false;
      btn.touched = false;
      btn.value = 0;
      g_timestamp = performance.now();
    }
  }
}

export function pressDirection(stick: number, direction: AxisDirection): void {
  const meta = directionMeta[direction];
  const dirArr = g_dirPressed[stick];
  if (!dirArr) {
    return;
  }
  dirArr[direction] = (dirArr[direction] ?? 0) + 1;
  const oppMeta = directionMeta[meta.opposite];
  const axisIndex = stick * 2 + meta.position;
  const value =
    meta.value + ((dirArr[meta.opposite] ?? 0) > 0 ? oppMeta.value : 0);
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
  dirArr[direction] = Math.max(0, (dirArr[direction] ?? 1) - 1);
  const axisIndex = stick * 2 + meta.position;
  const thisHeld = dirArr[direction] > 0;
  const oppHeld = (dirArr[meta.opposite] ?? 0) > 0;
  if (thisHeld && oppHeld) {
    g_axes[axisIndex] = 0;
  } else if (thisHeld) {
    g_axes[axisIndex] = meta.value;
  } else if (oppHeld) {
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

export function setMode(mode: 'combine' | 'separate' | undefined): void {
  g_mode = mode ?? 'separate';
}

export function restore(): void {
  navigator.getGamepads = g_originalGetGamepads;
}
