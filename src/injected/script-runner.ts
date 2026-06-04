import type { GamepadAction, GameScript, ScriptAction } from '@/types/gamepad';
import { executePress, executeUnpress } from './script-actions';
import { getSimulator } from './gamepad-simulator';
import { calcSweepMag, calcSweepPos } from '@/tools/sweep';

export interface ScriptHandle {
  cancel(): void;
}

interface RunState {
  cancelled: boolean;
}

const FPS_MS = 1000 / 60;

export function runScript(script: GameScript): ScriptHandle {
  const state: RunState = { cancelled: false };
  const held: GamepadAction[] = [];
  const pointedSticks: { gamepadIndex: 0 | 1 | 2 | 3; stick: number }[] = [];
  const rotationTimeouts: ReturnType<typeof setTimeout>[] = [];
  const startTime = Date.now();
  let scheduledMs = 0;

  function pressAction(action: GamepadAction): void {
    executePress(action);
    held.push(action);
  }

  function releaseAction(action: GamepadAction): void {
    executeUnpress(action);
    const idx = held.findIndex(
      (h) =>
        h.gamepadIndex === action.gamepadIndex && h.action === action.action
    );
    if (idx !== -1) {
      held.splice(idx, 1);
    }
  }

  function releaseAll(): void {
    for (const action of [...held].reverse()) {
      executeUnpress(action);
    }
    held.length = 0;
    for (const p of pointedSticks) {
      getSimulator(p.gamepadIndex).moveStick(p.stick, 0, 0);
    }
    pointedSticks.length = 0;
    for (const tid of rotationTimeouts) {
      clearTimeout(tid);
    }
    rotationTimeouts.length = 0;
  }

  function stickIndex(stick: 'left' | 'right'): number {
    return stick === 'left' ? 0 : 1;
  }

  function executeRotate(
    step: Extract<ScriptAction, { type: 'rotate' }>
  ): void {
    const sIdx = stickIndex(step.stick);
    const sim = getSimulator(step.gamepadIndex);
    const rotIdx = rotationTimeouts.length;
    // Reserve slot
    rotationTimeouts.push(
      undefined as unknown as ReturnType<typeof setTimeout>
    );
    // Track for cleanup on releaseAll
    pointedSticks.push({ gamepadIndex: step.gamepadIndex, stick: sIdx });

    if (step.directions === 'infinite') {
      const startAM = calcSweepMag({ x: step.startX, y: step.startY });
      let endAM = calcSweepMag({ x: step.endX, y: step.endY });
      // Full circle when start === end
      if (step.startX === step.endX && step.startY === step.endY) {
        const delta = step.clockwise ? -Math.PI * 2 : Math.PI * 2;
        endAM = { angle: startAM.angle + delta, magnitude: endAM.magnitude };
      }
      const t0 = Date.now();
      sim.moveStick(sIdx, step.startX, step.startY);

      function tick(): void {
        if (state.cancelled) {
          return;
        }
        const t = (Date.now() - t0) / step.rotateMs;
        if (t >= 1) {
          sim.moveStick(sIdx, step.endX, step.endY);
          return;
        }
        const pos = calcSweepPos(startAM, endAM, step.clockwise, t);
        sim.moveStick(sIdx, pos.x, pos.y);
        rotationTimeouts[rotIdx] = setTimeout(tick, FPS_MS);
      }
      rotationTimeouts[rotIdx] = setTimeout(tick, FPS_MS);
    } else {
      // Discrete mode (4 or 8)
      const n = step.directions;
      const startAngle = Math.atan2(step.startY, step.startX);
      const endAngle = Math.atan2(step.endY, step.endX);

      // Compute sweep delta
      let delta = endAngle - startAngle;
      if (step.clockwise && delta > 0) {
        delta -= Math.PI * 2;
      }
      if (!step.clockwise && delta < 0) {
        delta += Math.PI * 2;
      }
      // Full circle when start === end
      if (step.startX === step.endX && step.startY === step.endY) {
        delta = step.clockwise ? -Math.PI * 2 : Math.PI * 2;
      }

      // Build snap positions
      const snapStep = (Math.PI * 2) / n;
      const positions: { x: number; y: number }[] = [
        { x: step.startX, y: step.startY },
      ];

      // Walk from startAngle in direction, collecting snap angles until we pass endAngle
      const dir = step.clockwise ? -1 : 1;
      // Find first snap after startAngle in the rotation direction
      let firstSnap: number;
      if (step.clockwise) {
        firstSnap = Math.floor(startAngle / snapStep) * snapStep;
        if (firstSnap >= startAngle) {
          firstSnap -= snapStep;
        }
      } else {
        firstSnap = Math.ceil(startAngle / snapStep) * snapStep;
        if (firstSnap <= startAngle) {
          firstSnap += snapStep;
        }
      }

      let current = firstSnap;
      const absTotal = Math.abs(delta);
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        const traveled = Math.abs(current - startAngle);
        if (traveled >= absTotal - 0.0001) {
          break;
        }
        const mag = 1;
        const cos = Math.cos(current);
        const sin = Math.sin(current);
        const s = 1 / Math.max(Math.abs(cos), Math.abs(sin));
        positions.push({
          x: Math.round(cos * s * mag * 1000) / 1000,
          y: Math.round(sin * s * mag * 1000) / 1000,
        });
        current += dir * snapStep;
      }

      positions.push({ x: step.endX, y: step.endY });

      const stepInterval = step.rotateMs / (positions.length - 1);
      let posIdx = 0;

      const first = positions[0];
      if (first) {
        sim.moveStick(sIdx, first.x, first.y);
      }

      function tick(): void {
        if (state.cancelled) {
          return;
        }
        posIdx++;
        if (posIdx >= positions.length) {
          return;
        }
        const p = positions[posIdx];
        if (p) {
          sim.moveStick(sIdx, p.x, p.y);
        }
        if (posIdx < positions.length - 1) {
          rotationTimeouts[rotIdx] = setTimeout(tick, stepInterval);
        }
      }

      if (positions.length > 1) {
        rotationTimeouts[rotIdx] = setTimeout(tick, stepInterval);
      }
    }
  }

  async function runActions(actions: ScriptAction[]): Promise<void> {
    for (const step of actions) {
      if (state.cancelled) {
        return;
      }
      switch (step.type) {
        case 'down':
          for (const btn of step.buttons) {
            pressAction(btn);
          }
          break;
        case 'up':
          for (const btn of step.buttons) {
            releaseAction(btn);
          }
          break;
        case 'delay': {
          if (step.durationMs === 'infinite') {
            await new Promise<void>(() => {
              /* never resolves — cancel via releaseAll */
            });
            return;
          }
          scheduledMs += step.durationMs;
          const remaining = startTime + scheduledMs - Date.now();
          if (remaining > 0) {
            await delay(remaining);
          }
          break;
        }
        case 'point': {
          const sIdx = stickIndex(step.stick);
          getSimulator(step.gamepadIndex).moveStick(sIdx, step.x, step.y);
          pointedSticks.push({ gamepadIndex: step.gamepadIndex, stick: sIdx });
          break;
        }
        case 'rotate':
          executeRotate(step);
          break;
        case 'loop':
          if (step.count === 'infinite') {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            while (!state.cancelled) {
              await runActions(step.actions);
            }
          } else {
            for (let i = 0; i < step.count; i++) {
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              if (state.cancelled) {
                break;
              }
              await runActions(step.actions);
            }
          }
          break;
      }
    }
  }

  void runActions(script.actions).then(() => {
    if (!state.cancelled) {
      releaseAll();
    }
  });

  return {
    cancel(): void {
      if (state.cancelled) {
        return;
      }
      state.cancelled = true;
      releaseAll();
    },
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ScriptManager {
  private readonly running = new Map<string, ScriptHandle>();
  private readonly toggleActive = new Set<string>();
  private readonly onCountChange: ((count: number) => void) | undefined;

  constructor(onCountChange?: (count: number) => void) {
    this.onCountChange = onCountChange;
  }

  private notifyCount(): void {
    this.onCountChange?.(this.running.size);
  }

  onKeyDown(key: string, script: GameScript): void {
    switch (script.activationType) {
      case 'on_down': {
        this.running.get(key)?.cancel();
        const handle = runScript(script);
        this.running.set(key, handle);
        this.notifyCount();
        break;
      }
      case 'toggle': {
        if (this.toggleActive.has(key)) {
          this.running.get(key)?.cancel();
          this.running.delete(key);
          this.toggleActive.delete(key);
          this.notifyCount();
        } else {
          const handle = runScript(script);
          this.running.set(key, handle);
          this.toggleActive.add(key);
          this.notifyCount();
        }
        break;
      }
      case 'held': {
        this.running.get(key)?.cancel();
        const handle = runScript(script);
        this.running.set(key, handle);
        this.notifyCount();
        break;
      }
      case 'on_up':
        break;
    }
  }

  onKeyUp(key: string, script: GameScript): void {
    switch (script.activationType) {
      case 'on_up': {
        this.running.get(key)?.cancel();
        const handle = runScript(script);
        this.running.set(key, handle);
        this.notifyCount();
        break;
      }
      case 'held': {
        this.running.get(key)?.cancel();
        this.running.delete(key);
        this.notifyCount();
        break;
      }
      case 'on_down':
      case 'toggle':
        break;
    }
  }

  cancelAll(): void {
    for (const handle of this.running.values()) {
      handle.cancel();
    }
    this.running.clear();
    this.toggleActive.clear();
    this.notifyCount();
  }
}
