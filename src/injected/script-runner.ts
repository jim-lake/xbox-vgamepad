/**
 * GameScript execution engine.
 *
 * Additive button model: each running script instance tracks which buttons/axes
 * it has pressed. "up" in a script only removes that script's contribution —
 * the button stays held if another source (keyboard or another script) is also
 * pressing it.
 */

import type { GamepadAction, GameScript, ScriptAction } from '@/types/gamepad';
import { executePress, executeUnpress } from './script-actions';

/** Opaque handle returned by runScript; used to cancel a running script. */
export interface ScriptHandle {
  cancel(): void;
}

interface RunState {
  cancelled: boolean;
}

/**
 * Run a GameScript, returning a handle that can cancel it.
 * All buttons pressed by this script are released when it finishes or is cancelled.
 */
export function runScript(script: GameScript): ScriptHandle {
  const state: RunState = { cancelled: false };
  const held: GamepadAction[] = [];
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
          scheduledMs += step.durationMs;
          const remaining = startTime + scheduledMs - Date.now();
          if (remaining > 0) {
            await delay(remaining);
          }
          break;
        }
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

/**
 * Manages per-key script state for all activation types.
 */
export class ScriptManager {
  private readonly running = new Map<string, ScriptHandle>();
  private readonly toggleActive = new Set<string>();

  onKeyDown(key: string, script: GameScript): void {
    switch (script.activationType) {
      case 'on_down': {
        this.running.get(key)?.cancel();
        const handle = runScript(script);
        this.running.set(key, handle);
        break;
      }
      case 'toggle': {
        if (this.toggleActive.has(key)) {
          this.running.get(key)?.cancel();
          this.running.delete(key);
          this.toggleActive.delete(key);
        } else {
          const handle = runScript(script);
          this.running.set(key, handle);
          this.toggleActive.add(key);
        }
        break;
      }
      case 'held': {
        this.running.get(key)?.cancel();
        const handle = runScript(script);
        this.running.set(key, handle);
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
        break;
      }
      case 'held': {
        this.running.get(key)?.cancel();
        this.running.delete(key);
        break;
      }
      case 'on_down':
      case 'toggle':
        break;
    }
  }

  /** Cancel all running scripts and clear all state. */
  cancelAll(): void {
    for (const handle of this.running.values()) {
      handle.cancel();
    }
    this.running.clear();
    this.toggleActive.clear();
  }
}
