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
  }

  moveStick(stick: number, x: number, y: number): void {
    this.axes[stick * 2] = x;
    this.axes[stick * 2 + 1] = y;
    this.timestamp = performance.now();
  }
}

// Registry: one simulator per gamepad index (0–3)
const g_simulators = new Map<number, GamepadSimulator>();
const g_originalGetGamepads = navigator.getGamepads.bind(navigator);
// Virtual slots claimed by enabled/configured virtual pads (separate mode)
let g_virtualSlots = new Set<number>();
// Stable mapping: physical pad ID → output slot
const g_physicalSlots = new Map<string, number>();

export function getSimulator(index: 0 | 1 | 2 | 3): GamepadSimulator {
  let sim = g_simulators.get(index);
  if (!sim) {
    sim = new GamepadSimulator();
    g_simulators.set(index, sim);
  }
  return sim;
}

/** Assign a stable output slot for a physical pad, avoiding virtual slots. */
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
  // All non-virtual slots taken — fall back to first non-virtual slot
  for (let i = 0; i < 4; i++) {
    if (!g_virtualSlots.has(i)) {
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

// Intercept native gamepadconnected/gamepaddisconnected to assign stable slots
window.addEventListener(
  'gamepadconnected',
  (e: Event) => {
    const pad = (e as unknown as Record<string, unknown>)['gamepad'] as
      | Gamepad
      | undefined;
    if (!pad || pad.id === GAMEPAD_ID) {
      return; // ignore our own virtual pad events
    }
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
 * Called when the set of virtual slots changes (config load).
 * Remaps physical pads that conflict with new virtual slots,
 * firing disconnect/connect events for any that must move.
 */
export function updateVirtualSlots(newVirtualSlots: Set<number>): void {
  g_virtualSlots = newVirtualSlots;

  // Find physical pads that now conflict with a virtual slot
  const real = g_originalGetGamepads();
  const realPads = Array.from(real).filter((p): p is Gamepad => p !== null);

  for (const pad of realPads) {
    const currentSlot = g_physicalSlots.get(pad.id);
    if (currentSlot !== undefined && g_virtualSlots.has(currentSlot)) {
      dispatchGamepadEvent('gamepaddisconnected', pad, currentSlot);
      g_physicalSlots.delete(pad.id);
      const newSlot = assignPhysicalSlot(pad.id);
      if (newSlot >= 0) {
        dispatchGamepadEvent('gamepadconnected', pad, newSlot);
      }
    }
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
    // Merge all real pad inputs into virtual state of index-0 sim
    const sim0 = g_simulators.get(0);
    if (!sim0) {
      return [null, null, null, null];
    }
    const merged = sim0.snapshot(0);
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
      for (let i = 0; i < mergedAxes.length; i++) {
        if (mergedAxes[i] === 0) {
          mergedAxes[i] = pad.axes[i] ?? 0;
        }
      }
    }
    return [
      {
        id: merged.id,
        index: 0,
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
    // Separate: virtual pads at their configured slots; real pads at stable assigned slots
    const result: (Gamepad | null)[] = [null, null, null, null];

    // Place enabled virtual pads
    for (const [idx, sim] of g_simulators.entries()) {
      if (sim.isEnabled() && idx < 4) {
        result[idx] = padToPlain(sim.snapshot(idx), { index: idx });
      }
    }

    // Place real pads at their stable slots (only use already-assigned slots here;
    // new pads are assigned via the gamepadconnected interceptor)
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
  if (g_mode === 'combine') {
    updateVirtualSlots(new Set());
  }
}

export function restore(): void {
  navigator.getGamepads = g_originalGetGamepads;
}
