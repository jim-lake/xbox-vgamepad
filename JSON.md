# Gamepad Configuration JSON Specification

This document defines the JSON format for gamepad configuration presets used by the this extension. It is a standalone specification — any implementation that accepts this format must conform to the rules described here.

## Overview

The extension emulates a **Standard Gamepad** (as defined by the [W3C Gamepad API](https://w3c.github.io/gamepad/#remapping)) with the identity `"Xbox 360 Controller (XInput STANDARD GAMEPAD)"`. A configuration preset maps keyboard key codes and mouse actions to virtual gamepad buttons and analog stick axes.

## Top-Level Storage Object

The root object stored in persistent sync storage:

```json
{
  "isEnabled": true,
  "activeConfig": "default",
  "configs": {
    "default": { "...GamepadConfig..." },
    "shooter": { "...GamepadConfig..." }
  }
}
```

| Field          | Type                            | Required | Description                                                                                                |
| -------------- | ------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `isEnabled`    | `boolean`                       | Yes      | Whether the virtual gamepad is active. When `false`, the extension does not intercept input.               |
| `activeConfig` | `string`                        | Yes      | Name of the currently active preset from `configs`.                                                        |
| `configs`      | `Record<string, GamepadConfig>` | Yes      | Map of preset names to configuration objects. Must always contain a `"default"` entry. Maximum 25 presets. |

## GamepadConfig

A single preset:

```json
{
  "keyboardConfig": { "..." },
  "mouseConfig": { "..." }
}
```

| Field            | Type                    | Required | Description                                         |
| ---------------- | ----------------------- | -------- | --------------------------------------------------- |
| `keyboardConfig` | `GamepadKeyboardConfig` | Yes      | Keyboard/mouse-to-gamepad button and axis bindings. |
| `mouseConfig`    | `GamepadMouseConfig`    | Yes      | Mouse movement-to-analog stick settings.            |

## GamepadMouseConfig

Controls how mouse movement maps to an analog stick.

```json
{ "mouseControls": 1, "sensitivity": 10 }
```

| Field           | Type                     | Required | Valid Values                                                       | Description                                                       |
| --------------- | ------------------------ | -------- | ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `mouseControls` | `0`, `1`, or `undefined` | Yes      | `0` = left stick, `1` = right stick, `undefined`/`null` = disabled | Which analog stick raw mouse movement controls.                   |
| `sensitivity`   | `number`                 | Yes      | Integer, `1` – `1000`                                              | Multiplier for mouse movement-to-stick deflection. Default: `10`. |

## GamepadKeyboardConfig

Maps keyboard key codes and virtual mouse codes to gamepad buttons, analog stick directions, extension actions, and scripted sequences. It is a plain object where each key is a key code string and each value is a **GamepadActionName**, an array of **GamepadActionName**, or a **GameScript** object.

```json
{
  "Space": "a",
  "KeyW": "leftStickUp",
  "KeyD": "leftStickRight",
  "Click": "rightTrigger",
  "F9": "toggleGamepad",
  "KeyT": {
    "activationType": "on_down",
    "actions": [
      { "type": "down", "buttons": ["a"] },
      { "type": "delay", "durationMs": 100 },
      { "type": "up", "buttons": ["a"] }
    ]
  }
}
```

Every entry is optional — omitted key codes are simply unbound.

### Key Code Format

Keys are [KeyboardEvent.code](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code) strings (e.g. `"KeyW"`, `"Space"`, `"ArrowUp"`, `"ShiftLeft"`), plus three virtual codes for mouse actions:

| Virtual Code   | Trigger                       |
| -------------- | ----------------------------- |
| `"Click"`      | Left mouse button (button 0)  |
| `"RightClick"` | Right mouse button (button 2) |
| `"Scroll"`     | Mouse scroll wheel            |

### GamepadActionName Values

Each value is a **GamepadActionName** string, or an array of them. A single key code may activate multiple gamepad actions simultaneously by providing an array.

#### Button Actions

| GamepadActionName     | Gamepad Button         | `gamepadIndex` |
| --------------------- | ---------------------- | -------------- |
| `"a"`                 | A (Cross)              | 0              |
| `"b"`                 | B (Circle)             | 1              |
| `"x"`                 | X (Square)             | 2              |
| `"y"`                 | Y (Triangle)           | 3              |
| `"leftShoulder"`      | Left Bumper (LB)       | 4              |
| `"rightShoulder"`     | Right Bumper (RB)      | 5              |
| `"leftTrigger"`       | Left Trigger (LT)      | 6              |
| `"rightTrigger"`      | Right Trigger (RT)     | 7              |
| `"select"`            | Back / Select / View   | 8              |
| `"start"`             | Start / Menu           | 9              |
| `"leftStickPressed"`  | Left Stick Click (L3)  | 10             |
| `"rightStickPressed"` | Right Stick Click (R3) | 11             |
| `"dpadUp"`            | D-Pad Up               | 12             |
| `"dpadDown"`          | D-Pad Down             | 13             |
| `"dpadLeft"`          | D-Pad Left             | 14             |
| `"dpadRight"`         | D-Pad Right            | 15             |
| `"home"`              | Xbox / Guide           | 16             |

When a bound key is pressed, the corresponding `Gamepad.buttons[gamepadIndex]` must report `pressed: true, value: 1`. On release: `pressed: false, value: 0`.

#### Axis Actions

| GamepadActionName   | Stick | Axis Index | Direction | Axis Value |
| ------------------- | ----- | ---------- | --------- | ---------- |
| `"leftStickUp"`     | Left  | 1          | Up        | `-1`       |
| `"leftStickDown"`   | Left  | 1          | Down      | `+1`       |
| `"leftStickLeft"`   | Left  | 0          | Left      | `-1`       |
| `"leftStickRight"`  | Left  | 0          | Right     | `+1`       |
| `"rightStickUp"`    | Right | 3          | Up        | `-1`       |
| `"rightStickDown"`  | Right | 3          | Down      | `+1`       |
| `"rightStickLeft"`  | Right | 2          | Left      | `-1`       |
| `"rightStickRight"` | Right | 2          | Right     | `+1`       |

The `Gamepad.axes[]` array has 4 entries: `[leftX, leftY, rightX, rightY]`.

- Axis values range from `-1.0` to `+1.0`. Center is `0`.
- Pressing a direction key sets the axis to the full value (`-1` or `+1`).
- Releasing returns the axis to `0` (unless the opposite direction is held).
- If both opposing directions on the same axis are held simultaneously, their values sum (resulting in `0`).

#### Extension Actions

| GamepadActionName | Description                                                                                                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"toggleGamepad"` | Toggles the virtual gamepad connection on/off. When toggled off, the gamepad disconnects (`gamepaddisconnected` fires). When toggled on, it reconnects with the current config. Default binding: `"F9"`. |

The toggle keybinding works regardless of whether the gamepad is currently connected — it is always listening.

### GameScript

A key code may instead be bound to a **GameScript** — an object that defines a scripted sequence of button actions triggered by a key event.

```json
{
  "KeyT": {
    "activationType": "on_down",
    "actions": [
      { "type": "down", "buttons": ["a"] },
      { "type": "delay", "durationMs": 100 },
      { "type": "up", "buttons": ["a"] }
    ]
  }
}
```

#### GameScript Fields

| Field            | Type             | Required | Description                                              |
| ---------------- | ---------------- | -------- | -------------------------------------------------------- |
| `activationType` | `string`         | Yes      | When the script runs. See activation type details below. |
| `actions`        | `ScriptAction[]` | Yes      | Ordered list of steps to execute.                        |

#### Activation Types

| `activationType` | Trigger                                                                                            | Cancel                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `"on_down"`      | Key down. If the script is already running, it is **cancelled first**, then immediately restarted. | Implicitly cancelled and restarted on each key down.                  |
| `"on_up"`        | Key up. If the script is already running, it is **cancelled first**, then immediately restarted.   | Implicitly cancelled and restarted on each key up.                    |
| `"toggle"`       | First key down starts the script.                                                                  | Second key down **cancels** the running script (it does not restart). |
| `"held"`         | Key down starts the script.                                                                        | Key **up cancels** the running script.                                |

"Cancelling" a script means it stops executing immediately. Any buttons that the script pressed and has not yet released remain held by the script's press — but see the additive press model below for how that interacts with other inputs.

#### ScriptAction

Each step in `actions` is one of the following:

| Shape                                                              | Description                                                                                                         |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `{ "type": "down", "buttons": ["a", "b"] }`                        | Press the listed buttons (does not release them).                                                                   |
| `{ "type": "up", "buttons": ["a", "b"] }`                          | Release the listed buttons.                                                                                         |
| `{ "type": "delay", "durationMs": 50 }`                            | Wait `durationMs` milliseconds before the next step.                                                                |
| `{ "type": "loop", "count": 3, "actions": [ ...ScriptAction[] ] }` | Execute the nested `actions` `count` times. `count` may also be `"infinite"` to loop until the script is cancelled. |

### Additive Button Press Model

Button presses from all sources — direct key bindings, multiple scripts running simultaneously, and physical user input — are **additive**. A button is held down as long as **any** source is pressing it.

- A `{ "type": "down" }` step adds a press from that script.
- A `{ "type": "up" }` step removes that script's press. If another source (a different script, or the user physically holding the key) is still pressing the same button, the button **remains held**.
- Cancelling a script removes all presses that script had applied.
- The same rule applies to user input: if a script is holding a button and the user also presses that key, releasing the user's key does not release the button — the script's press still holds it.

This means `"up"` in a script is not a "force release" — it only removes that script's contribution to the button state.

### Shared Key Codes

A key code may map to multiple gamepad actions by providing an array value. When that key is pressed, all listed actions activate simultaneously.

```json
{ "KeyW": ["leftStickUp", "a"] }
```

### Multiple Keys for One Action

To bind multiple keys to the same gamepad action, simply add separate entries pointing to the same action name:

```json
{ "ArrowUp": "dpadUp", "KeyX": "dpadUp" }
```

## Validation Rules

A configuration is **invalid** if any of the following are true:

1. **Escape key forbidden**: The code `"Escape"` must not be used as a key in `keyboardConfig`.
2. **Mouse config range**: `sensitivity` must be between `1` and `1000` inclusive.
3. **Mouse config stick**: `mouseControls` must be `0`, `1`, or `undefined`/`null`.

An implementation must reject invalid configurations and must not activate them.

## Default Configuration

The built-in default preset:

```json
{
  "mouseConfig": { "mouseControls": 1, "sensitivity": 10 },
  "keyboardConfig": {
    "Space": "a",
    "ControlLeft": "b",
    "Backspace": "b",
    "KeyR": "x",
    "KeyV": "y",
    "Scroll": "y",
    "KeyC": "leftShoulder",
    "KeyG": "leftShoulder",
    "KeyQ": "rightShoulder",
    "RightClick": "leftTrigger",
    "Click": "rightTrigger",
    "Enter": "start",
    "Tab": "select",
    "ArrowUp": "dpadUp",
    "KeyX": "dpadUp",
    "ArrowDown": "dpadDown",
    "KeyZ": "dpadDown",
    "ArrowLeft": "dpadLeft",
    "KeyN": "dpadLeft",
    "ArrowRight": "dpadRight",
    "KeyW": "leftStickUp",
    "KeyS": "leftStickDown",
    "KeyA": "leftStickLeft",
    "KeyD": "leftStickRight",
    "KeyO": "rightStickUp",
    "KeyL": "rightStickDown",
    "KeyK": "rightStickLeft",
    "Semicolon": "rightStickRight",
    "ShiftLeft": "leftStickPressed",
    "KeyF": "rightStickPressed",
    "F9": "toggleGamepad"
  }
}
```

## Virtual Gamepad Shape

The emulated gamepad exposed via `navigator.getGamepads()` must conform to:

| Property         | Value                                             |
| ---------------- | ------------------------------------------------- |
| `id`             | `"Xbox 360 Controller (XInput STANDARD GAMEPAD)"` |
| `index`          | `0`                                               |
| `mapping`        | `"standard"`                                      |
| `connected`      | `true` (when active)                              |
| `buttons.length` | `17`                                              |
| `axes.length`    | `4`                                               |

Each entry in `buttons[]` is an object with `{ pressed: boolean, touched: boolean, value: number }`.

## Behavioral Contract

These are the observable behaviors any conforming implementation must exhibit, independent of internal architecture:

1. **Gamepad appears on activation**: When the extension is enabled and a game page is detected, `navigator.getGamepads()` must return a gamepad matching the shape above, and a `gamepadconnected` event must fire.
2. **Key press → button press**: When a keyboard key bound to a button action is pressed, the corresponding `buttons[gamepadIndex]` must immediately reflect `pressed: true, value: 1`.
3. **Key release → button release**: When the key is released, the button must return to `pressed: false, value: 0`.
4. **Key press → axis deflection**: When a keyboard key bound to an axis action is pressed, the corresponding axis must deflect to the full value (`-1` or `+1`).
5. **Key release → axis center**: When the key is released, the axis must return to `0` (unless the opposing direction is still held).
6. **Opposing axes cancel**: If both opposing direction keys on the same axis are held, the axis value must be `0`.
7. **Simultaneous inputs**: Multiple buttons and axes may be active at the same time. Pressing one input must not affect unrelated inputs.
8. **Multi-action keys**: When a key maps to multiple actions, pressing that key activates all listed gamepad inputs simultaneously.
9. **Multiple keys per action**: When multiple keys map to the same action, any key independently activates that gamepad input.
10. **Mouse movement → stick**: When `mouseControls` is set, raw mouse movement (via Pointer Lock) must deflect the designated analog stick, scaled by `sensitivity`.
11. **Gamepad disappears on deactivation**: When the extension is disabled or the game exits, the virtual gamepad must disconnect and a `gamepaddisconnected` event must fire.
12. **No phantom input**: When no keys are pressed and the mouse is stationary, all buttons must be unpressed and all axes must be at `0`.
13. **Toggle keybinding**: Pressing the key(s) bound to `"toggleGamepad"` disconnects the virtual gamepad if connected, or reconnects it if disconnected. The toggle listener is always active regardless of gamepad connection state.
