import { debugLog } from '@/tools/log';

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

export class GamepadSimulator {
  private buttons: FakeButton[] = Array.from({ length: 17 }, createButton);
  private axes: number[] = [0, 0, 0, 0];
  private timestamp = performance.now();
  private connected = false;
  private enabled = false;
  private dirPressed: number[][] = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  private buttonPressCount: number[] = Array.from<number>({ length: 17 }).fill(
    0
  );

  snapshot(index: number): Gamepad {
    return {
      id: GAMEPAD_ID,
      index,
      mapping: 'standard',
      connected: this.connected,
      buttons: this.buttons.map((b) => ({ ...b })),
      axes: [...this.axes],
      timestamp: this.timestamp,
      hapticActuators: [] as unknown as GamepadHapticActuator[],
      vibrationActuator: null,
    } as unknown as Gamepad;
  }

  private reset(): void {
    for (const btn of this.buttons) {
      btn.pressed = false;
      btn.touched = false;
      btn.value = 0;
    }
    this.axes = [0, 0, 0, 0];
    this.dirPressed = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    this.buttonPressCount = Array.from<number>({ length: 17 }).fill(0);
  }

  enable(index: number): void {
    if (this.enabled) {
      return;
    }
    this.reset();
    this.enabled = true;
    this.connected = true;
    this.timestamp = performance.now();
    debugLog('[gamepad] connected', index);
    const evt = new Event('gamepadconnected');
    (evt as unknown as Record<string, unknown>)['gamepad'] =
      this.snapshot(index);
    window.dispatchEvent(evt);
  }

  disable(index: number): void {
    if (!this.enabled) {
      return;
    }
    this.connected = false;
    this.timestamp = performance.now();
    debugLog('[gamepad] disconnected', index);
    const evt = new Event('gamepaddisconnected');
    (evt as unknown as Record<string, unknown>)['gamepad'] =
      this.snapshot(index);
    window.dispatchEvent(evt);
    this.enabled = false;
    this.reset();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  resetState(): void {
    this.reset();
    this.timestamp = performance.now();
  }

  pressButton(index: number): void {
    const btn = this.buttons[index];
    if (btn) {
      this.buttonPressCount[index] = (this.buttonPressCount[index] ?? 0) + 1;
      btn.pressed = true;
      btn.touched = true;
      btn.value = 1;
      this.timestamp = performance.now();
      debugLog('[gamepad] button down', index);
    }
  }

  unpressButton(index: number): void {
    const btn = this.buttons[index];
    if (btn) {
      const count = (this.buttonPressCount[index] ?? 1) - 1;
      this.buttonPressCount[index] = Math.max(0, count);
      if (this.buttonPressCount[index] === 0) {
        btn.pressed = false;
        btn.touched = false;
        btn.value = 0;
        this.timestamp = performance.now();
        debugLog('[gamepad] button up', index);
      }
    }
  }

  pressDirection(stick: number, direction: AxisDirection): void {
    const meta = directionMeta[direction];
    const dirArr = this.dirPressed[stick];
    if (!dirArr) {
      return;
    }
    dirArr[direction] = (dirArr[direction] ?? 0) + 1;
    const oppMeta = directionMeta[meta.opposite];
    const axisIndex = stick * 2 + meta.position;
    const value =
      meta.value + ((dirArr[meta.opposite] ?? 0) > 0 ? oppMeta.value : 0);
    this.axes[axisIndex] = value;
    this.timestamp = performance.now();
    debugLog(
      '[gamepad] axis down stick',
      stick,
      'dir',
      direction,
      'axis',
      axisIndex,
      '=',
      value
    );
  }

  unpressDirection(stick: number, direction: AxisDirection): void {
    const meta = directionMeta[direction];
    const dirArr = this.dirPressed[stick];
    if (!dirArr) {
      return;
    }
    dirArr[direction] = Math.max(0, (dirArr[direction] ?? 1) - 1);
    const axisIndex = stick * 2 + meta.position;
    const thisHeld = dirArr[direction] > 0;
    const oppHeld = (dirArr[meta.opposite] ?? 0) > 0;
    if (thisHeld && oppHeld) {
      this.axes[axisIndex] = 0;
    } else if (thisHeld) {
      this.axes[axisIndex] = meta.value;
    } else if (oppHeld) {
      this.axes[axisIndex] = directionMeta[meta.opposite].value;
    } else {
      this.axes[axisIndex] = 0;
    }
    this.timestamp = performance.now();
    debugLog(
      '[gamepad] axis up stick',
      stick,
      'dir',
      direction,
      'axis',
      axisIndex,
      '=',
      this.axes[axisIndex]
    );
  }

  moveStick(stick: number, x: number, y: number): void {
    this.axes[stick * 2] = x;
    this.axes[stick * 2 + 1] = y;
    this.timestamp = performance.now();
    debugLog('[gamepad] axis move stick', stick, 'x =', x, 'y =', y);
  }
}

// Registry: one simulator per gamepad index (0–3)
const g_simulators = new Map<number, GamepadSimulator>();
const g_originalGetGamepads = navigator.getGamepads.bind(navigator);
// Virtual slots claimed by enabled/configured virtual pads
let g_virtualSlots = new Set<number>();
// Stable mapping: physical pad ID → output slot (separate mode only)
const g_physicalSlots = new Map<string, number>();
// Active mode
let g_mode: 'combine' | 'separate' = 'separate';

export function getSimulator(index: 0 | 1 | 2 | 3): GamepadSimulator {
  let sim = g_simulators.get(index);
  if (!sim) {
    sim = new GamepadSimulator();
    g_simulators.set(index, sim);
  }
  return sim;
}

/** Assign a stable output slot for a physical pad, avoiding virtual slots and other physical pads. */
function assignPhysicalSlot(padId: string): number {
  const existing = g_physicalSlots.get(padId);
  if (existing !== undefined && !g_virtualSlots.has(existing)) {
    return existing;
  }
  // Find first free slot not claimed by virtual pads or other physical pads
  const usedByPhysical = new Set(g_physicalSlots.values());
  for (let i = 0; i < 4; i++) {
    if (!g_virtualSlots.has(i) && !usedByPhysical.has(i)) {
      g_physicalSlots.set(padId, i);
      return i;
    }
  }
  return -1;
}

function dispatchGamepadEvent(name: string, pad: Gamepad, slot: number): void {
  const evt = new Event(name);
  (evt as unknown as Record<string, unknown>)['gamepad'] = padToPlain(pad, {
    index: slot,
  });
  window.dispatchEvent(evt);
}

// Intercept native gamepadconnected/gamepaddisconnected to manage physical pad slots
window.addEventListener(
  'gamepadconnected',
  (e: Event) => {
    const pad = (e as unknown as Record<string, unknown>)['gamepad'] as
      | Gamepad
      | undefined;
    if (!pad || pad.id === GAMEPAD_ID) {
      return; // ignore our own virtual pad events
    }

    if (g_mode === 'combine') {
      // In combine mode: suppress events for pads at virtual slots; pass through others
      if (g_virtualSlots.has(pad.index)) {
        e.stopImmediatePropagation();
      }
      // Non-virtual slots pass through unchanged
      return;
    }

    // Separate mode: intercept and reassign
    e.stopImmediatePropagation();
    const slot = assignPhysicalSlot(pad.id);
    if (slot >= 0) {
      dispatchGamepadEvent('gamepadconnected', pad, slot);
    }
  },
  true // capture — runs before page listeners
);

window.addEventListener(
  'gamepaddisconnected',
  (e: Event) => {
    const pad = (e as unknown as Record<string, unknown>)['gamepad'] as
      | Gamepad
      | undefined;
    if (!pad || pad.id === GAMEPAD_ID) {
      return;
    }

    if (g_mode === 'combine') {
      // In combine mode: suppress events for pads at virtual slots; pass through others
      if (g_virtualSlots.has(pad.index)) {
        e.stopImmediatePropagation();
      }
      return;
    }

    // Separate mode: intercept and use stable slot
    e.stopImmediatePropagation();
    const slot = g_physicalSlots.get(pad.id);
    g_physicalSlots.delete(pad.id);
    if (slot !== undefined) {
      dispatchGamepadEvent('gamepaddisconnected', pad, slot);
    }
  },
  true
);

/**
 * Called when the set of virtual slots changes (config load/change).
 * In separate mode: remaps physical pads that conflict with new virtual slots,
 * and initializes non-conflicting physical pads to their native slots.
 * In combine mode: just updates g_virtualSlots (no slot management needed).
 */
export function updateVirtualSlots(newVirtualSlots: Set<number>): void {
  g_virtualSlots = newVirtualSlots;

  if (g_mode === 'combine') {
    return;
  }

  const real = g_originalGetGamepads();
  const realPads = Array.from(real).filter((p): p is Gamepad => p !== null);

  for (const pad of realPads) {
    const currentSlot = g_physicalSlots.get(pad.id);

    if (currentSlot === undefined) {
      // Not yet assigned — assign native slot if it doesn't conflict
      if (!g_virtualSlots.has(pad.index)) {
        g_physicalSlots.set(pad.id, pad.index);
        // No events fired for non-conflicting pads on initialization
      } else {
        // Native slot conflicts — assign a free slot
        const newSlot = assignPhysicalSlot(pad.id);
        if (newSlot >= 0) {
          dispatchGamepadEvent('gamepadconnected', pad, newSlot);
        }
      }
    } else if (g_virtualSlots.has(currentSlot)) {
      // Currently assigned slot is now a virtual slot — must move
      dispatchGamepadEvent('gamepaddisconnected', pad, currentSlot);
      g_physicalSlots.delete(pad.id);
      const newSlot = assignPhysicalSlot(pad.id);
      if (newSlot >= 0) {
        dispatchGamepadEvent('gamepadconnected', pad, newSlot);
      }
    }
    // else: slot is still free — no events
  }
}

// Patch getGamepads immediately on module load
navigator.getGamepads = (): (Gamepad | null)[] => {
  const real = g_originalGetGamepads();
  const enabledSims = Array.from(g_simulators.entries()).filter(([, s]) =>
    s.isEnabled()
  );
  if (enabledSims.length === 0) {
    return real;
  }

  if (g_mode === 'combine') {
    const result: (Gamepad | null)[] = [null, null, null, null];

    // For each virtual slot: merge virtual pad with physical pad at same index
    for (const [idx, sim] of g_simulators.entries()) {
      if (!sim.isEnabled() || idx >= 4) {
        continue;
      }
      const virtualSnap = sim.snapshot(idx);
      const physicalPad = real[idx] ?? null;

      if (!physicalPad) {
        result[idx] = padToPlain(virtualSnap, { index: idx });
        continue;
      }

      const mergedButtons = virtualSnap.buttons.map((vb, i) => {
        const pb = physicalPad.buttons[i];
        const pressed = vb.pressed || (pb?.pressed ?? false);
        return { pressed, touched: pressed, value: pressed ? 1 : 0 };
      });
      const mergedAxes = virtualSnap.axes.map((va, i) =>
        va !== 0 ? va : (physicalPad.axes[i] ?? 0)
      );

      result[idx] = {
        id: virtualSnap.id,
        index: idx,
        mapping: virtualSnap.mapping,
        connected: virtualSnap.connected,
        buttons: mergedButtons,
        axes: mergedAxes,
        timestamp: virtualSnap.timestamp,
        hapticActuators: [] as unknown as GamepadHapticActuator[],
        vibrationActuator: null,
      } as unknown as Gamepad;
    }

    // For non-virtual slots: pass physical pads through unmodified
    for (let i = 0; i < 4; i++) {
      if (!g_virtualSlots.has(i)) {
        result[i] = real[i] ?? null;
      }
    }

    return result;
  } else {
    // Separate: virtual pads at their configured slots; real pads at stable assigned slots
    const result: (Gamepad | null)[] = [null, null, null, null];

    // Place enabled virtual pads
    for (const [idx, sim] of g_simulators.entries()) {
      if (sim.isEnabled() && idx < 4) {
        result[idx] = padToPlain(sim.snapshot(idx), { index: idx });
      }
    }

    // Place real pads at their stable slots
    const realPads = Array.from(real).filter((p): p is Gamepad => p !== null);
    for (const pad of realPads) {
      const slot = g_physicalSlots.get(pad.id);
      if (slot !== undefined && slot < 4) {
        result[slot] = padToPlain(pad, { index: slot });
      }
    }

    return result;
  }
};

export function setMode(mode: 'combine' | 'separate' | undefined): void {
  g_mode = mode ?? 'separate';
}

export function restore(): void {
  navigator.getGamepads = g_originalGetGamepads;
}
