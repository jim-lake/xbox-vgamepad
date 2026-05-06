const GAMEPAD_ID = 'Xbox 360 Controller (XInput STANDARD GAMEPAD)';

interface FakeButton {
  pressed: boolean;
  touched: boolean;
  value: number;
}

export const AxisDirection = {
  UP: 0,
  DOWN: 1,
  LEFT: 2,
  RIGHT: 3,
} as const;

export type AxisDirection = (typeof AxisDirection)[keyof typeof AxisDirection];

const directionMeta: Record<AxisDirection, { position: number; value: number; opposite: AxisDirection }> = {
  [AxisDirection.UP]: { position: 1, value: -1, opposite: AxisDirection.DOWN },
  [AxisDirection.DOWN]: { position: 1, value: 1, opposite: AxisDirection.UP },
  [AxisDirection.LEFT]: { position: 0, value: -1, opposite: AxisDirection.RIGHT },
  [AxisDirection.RIGHT]: { position: 0, value: 1, opposite: AxisDirection.LEFT },
};

function createButton(): FakeButton {
  return { pressed: false, touched: false, value: 0 };
}

class GamepadSimulator {
  private buttons: FakeButton[] = Array.from({ length: 17 }, createButton);
  private axes: number[] = [0, 0, 0, 0];
  private timestamp = performance.now();
  private connected = false;
  private enabled = false;
  private originalGetGamepads: typeof navigator.getGamepads;
  // Track which directions are pressed per stick: [stick][direction] = boolean
  private dirPressed: boolean[][] = [
    [false, false, false, false],
    [false, false, false, false],
  ];

  constructor() {
    this.originalGetGamepads = navigator.getGamepads.bind(navigator);
    this.patch();
  }

  private patch(): void {
    const self = this;
    navigator.getGamepads = function (): (Gamepad | null)[] {
      if (self.enabled) {
        return [self.snapshot(), null, null, null];
      }
      return self.originalGetGamepads();
    };
  }

  private snapshot(): Gamepad {
    return {
      id: GAMEPAD_ID,
      index: 0,
      mapping: 'standard',
      connected: this.connected,
      buttons: this.buttons.map((b) => ({ ...b })),
      axes: [...this.axes],
      timestamp: this.timestamp,
      hapticActuators: [] as unknown as GamepadHapticActuator[],
      vibrationActuator: null,
    } as unknown as Gamepad;
  }

  enable(): void {
    if (this.enabled) {
      return;
    }
    this.reset();
    this.enabled = true;
    this.connected = true;
    this.timestamp = performance.now();
    const evt = new Event('gamepadconnected');
    (evt as unknown as Record<string, unknown>)['gamepad'] = this.snapshot();
    window.dispatchEvent(evt);
  }

  disable(): void {
    if (!this.enabled) {
      return;
    }
    this.connected = false;
    this.timestamp = performance.now();
    const evt = new Event('gamepaddisconnected');
    (evt as unknown as Record<string, unknown>)['gamepad'] = this.snapshot();
    window.dispatchEvent(evt);
    this.enabled = false;
    this.reset();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  pressButton(index: number): void {
    const btn = this.buttons[index];
    if (btn) {
      btn.pressed = true;
      btn.touched = true;
      btn.value = 1;
      this.timestamp = performance.now();
    }
  }

  unpressButton(index: number): void {
    const btn = this.buttons[index];
    if (btn) {
      btn.pressed = false;
      btn.touched = false;
      btn.value = 0;
      this.timestamp = performance.now();
    }
  }

  pressDirection(stick: number, direction: AxisDirection): void {
    const meta = directionMeta[direction];
    const dirArr = this.dirPressed[stick];
    if (!dirArr) {
      return;
    }
    dirArr[direction] = true;
    const oppMeta = directionMeta[meta.opposite];
    const axisIndex = stick * 2 + meta.position;
    const value = meta.value + (dirArr[meta.opposite] ? oppMeta.value : 0);
    this.axes[axisIndex] = value;
    this.timestamp = performance.now();
  }

  unpressDirection(stick: number, direction: AxisDirection): void {
    const meta = directionMeta[direction];
    const dirArr = this.dirPressed[stick];
    if (!dirArr) {
      return;
    }
    dirArr[direction] = false;
    const axisIndex = stick * 2 + meta.position;
    if (dirArr[meta.opposite]) {
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

  restore(): void {
    navigator.getGamepads = this.originalGetGamepads;
  }

  private reset(): void {
    for (const btn of this.buttons) {
      btn.pressed = false;
      btn.touched = false;
      btn.value = 0;
    }
    this.axes = [0, 0, 0, 0];
    this.dirPressed = [
      [false, false, false, false],
      [false, false, false, false],
    ];
  }
}

export const gamepadSimulator = new GamepadSimulator();
