# Gamepad Configuration JSON Specification

This document defines the JSON format for gamepad configuration presets used by the this extension. It is a standalone specification — any implementation that accepts this format must conform to the rules described here.

## Overview

The extension emulates up to 4 **Standard Gamepads** (as defined by the [W3C Gamepad API](https://w3c.github.io/gamepad/#remapping)) with the identity `"Xbox 360 Controller (XInput STANDARD GAMEPAD)"`. A configuration preset maps keyboard key codes and mouse actions to virtual gamepad buttons and analog stick axes. Each action targets a specific virtual gamepad slot (`gamepadIndex` 0–3).

## Top-Level Storage Object

The root object stored in persistent sync storage:

```json
{
  "ENABLED": true,
  "ACTIVE_GP_CONF": "default",
  "GP_CONF:default": { "...GamepadConfig..." },
  "GP_CONF:shooter": { "...GamepadConfig..." },
  "GLOBAL_SETTINGS": {
    "patchRemoteMultigamepad": true,
    "enableLogging": false,
    "disableBlur": false
  }
}
```

| Field             | Type             | Required | Description                                                                                                                  |
| ----------------- | ---------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `ENABLED`         | `boolean`        | Yes      | Default enabled state for new tabs. Each tab loads this on initialization, then maintains its own independent enabled state. |
| `ACTIVE_GP_CONF`  | `string`         | Yes      | Default active preset for new tabs. Each tab loads this on initialization, then maintains its own independent active preset. |
| `GP_CONF:<name>`  | `GamepadConfig`  | Yes      | Each preset is stored as a separate key with the `GP_CONF:` prefix. Must always have a `GP_CONF:default` entry. Maximum 25.  |
| `GLOBAL_SETTINGS` | `GlobalSettings` | No       | Extension-wide settings that apply across all presets. Defaults applied when absent.                                         |

## GlobalSettings

Settings that apply globally to the extension, independent of the active preset.

```json
{
  "patchRemoteMultigamepad": true,
  "enableLogging": false,
  "disableBlur": false,
  "autoSuspendOnInput": true
}
```

| Field                     | Type      | Default | Description                                                                                    |
| ------------------------- | --------- | ------- | ---------------------------------------------------------------------------------------------- |
| `patchRemoteMultigamepad` | `boolean` | `true`  | Whether to apply the co-op webpack patch that fixes hardcoded gamepad indices for multiplayer. |
| `enableLogging`           | `boolean` | `false` | Whether to enable debug logging in the extension's injected scripts.                           |
| `disableBlur`             | `boolean` | `false` | Whether to disable the blur effect on the xCloud page when the extension overlay is active.    |
| `autoSuspendOnInput`      | `boolean` | `true`  | Whether to auto-suspend running GameScripts when a physical input is detected.                 |

## GamepadConfig

A single preset:

```json
{
  "keyboardConfig": { "..." },
  "mouseConfig": { "..." },
  "otherGamepadMode": "separate",
  "keyboardRebinds": [{ "from": "KeyZ", "to": ["Space"] }]
}
```

| Field              | Type                      | Required | Description                                                                                                                             |
| ------------------ | ------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `keyboardConfig`   | `GamepadKeyboardConfig`   | Yes      | Key code to action bindings.                                                                                                            |
| `mouseConfig`      | `GamepadMouseConfig`      | Yes      | Mouse movement-to-analog stick settings.                                                                                                |
| `otherGamepadMode` | `"combine" \| "separate"` | No       | How physical gamepads coexist with virtual pads. Defaults to `"separate"`. See [Physical Gamepad Handling](#physical-gamepad-handling). |
| `keyboardRebinds`  | `KeyboardRebind[]`        | No       | Physical key remappings applied before input processing. See [Keyboard Rebinds](#keyboard-rebinds).                                     |
| `unboundScripts`   | `GameScript[]`            | No       | Scripts not bound to any key (triggered programmatically). Defaults to `[]`.                                                            |
| `fakeFullscreen`   | `boolean`                 | No       | Whether to apply a CSS hack to make the xCloud stream fill the viewport. Defaults to `false`.                                           |

## GamepadMouseConfig

Controls how mouse movement maps to analog sticks. Multiple targets are supported.

```json
{
  "mouseControls": [{ "stick": "right", "gamepadIndex": 0, "sensitivity": 1000 }]
}
```

| Field           | Type                   | Required | Description                                                  |
| --------------- | ---------------------- | -------- | ------------------------------------------------------------ |
| `mouseControls` | `MouseControlTarget[]` | Yes      | List of mouse-to-stick mappings. Empty array disables mouse. |

### MouseControlTarget

| Field          | Type                | Required | Valid Values          | Description                                                                              |
| -------------- | ------------------- | -------- | --------------------- | ---------------------------------------------------------------------------------------- |
| `stick`        | `"left" \| "right"` | Yes      |                       | Which analog stick on the target virtual pad mouse movement controls.                    |
| `gamepadIndex` | `0 \| 1 \| 2 \| 3`  | Yes      |                       | Which virtual gamepad slot this mouse target drives.                                     |
| `sensitivity`  | `number`            | Yes      | Integer, `1` – `1000` | Divisor for mouse movement-to-stick deflection. Higher = less sensitive. Default: `1000`. |

## GamepadKeyboardConfig

Maps keyboard key codes and virtual mouse codes to arrays of gamepad actions and scripts. Each key is a key code string; each value is an `ActionMap` — an array of `GamepadAction` and/or `GameScript` objects.

```json
{
  "Space": [{ "type": "action", "gamepadIndex": 0, "action": "a" }],
  "KeyW": [{ "type": "action", "gamepadIndex": 0, "action": "leftStickUp" }],
  "F8": [{ "type": "action", "gamepadIndex": 0, "action": "toggleGamepad" }],
  "KeyT": [
    {
      "type": "script",
      "activationType": "on_down",
      "actions": [
        {
          "type": "down",
          "buttons": [{ "type": "action", "gamepadIndex": 0, "action": "a" }]
        },
        { "type": "delay", "durationMs": 100 },
        {
          "type": "up",
          "buttons": [{ "type": "action", "gamepadIndex": 0, "action": "a" }]
        }
      ]
    }
  ]
}
```

Every entry is optional — omitted key codes are simply unbound. A single key code may activate actions on multiple virtual gamepad slots simultaneously by including multiple `GamepadAction` entries in the array.

### Key Code Format

Keys are [KeyboardEvent.code](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code) strings (e.g. `"KeyW"`, `"Space"`, `"ArrowUp"`, `"ShiftLeft"`), plus three virtual codes for mouse actions:

| Virtual Code   | Trigger                       |
| -------------- | ----------------------------- |
| `"Click"`      | Left mouse button (button 0)  |
| `"RightClick"` | Right mouse button (button 2) |
| `"Scroll"`     | Mouse scroll wheel            |

### GamepadAction

```json
{ "type": "action", "gamepadIndex": 0, "action": "a" }
```

| Field          | Type                | Required | Description                                             |
| -------------- | ------------------- | -------- | ------------------------------------------------------- |
| `type`         | `"action"`          | Yes      | Discriminator.                                          |
| `gamepadIndex` | `0 \| 1 \| 2 \| 3`  | Yes      | Which virtual gamepad slot this action targets.         |
| `action`       | `GamepadActionName` | Yes      | The button or axis action to perform. See tables below. |

#### Button Actions

| `action`              | Gamepad Button         | Button Index |
| --------------------- | ---------------------- | ------------ |
| `"a"`                 | A (Cross)              | 0            |
| `"b"`                 | B (Circle)             | 1            |
| `"x"`                 | X (Square)             | 2            |
| `"y"`                 | Y (Triangle)           | 3            |
| `"leftShoulder"`      | Left Bumper (LB)       | 4            |
| `"rightShoulder"`     | Right Bumper (RB)      | 5            |
| `"leftTrigger"`       | Left Trigger (LT)      | 6            |
| `"rightTrigger"`      | Right Trigger (RT)     | 7            |
| `"select"`            | Back / Select / View   | 8            |
| `"start"`             | Start / Menu           | 9            |
| `"leftStickPressed"`  | Left Stick Click (L3)  | 10           |
| `"rightStickPressed"` | Right Stick Click (R3) | 11           |
| `"dpadUp"`            | D-Pad Up               | 12           |
| `"dpadDown"`          | D-Pad Down             | 13           |
| `"dpadLeft"`          | D-Pad Left             | 14           |
| `"dpadRight"`         | D-Pad Right            | 15           |
| `"home"`              | Xbox / Guide           | 16           |

When a bound key is pressed, `buttons[buttonIndex]` on the virtual pad at `gamepadIndex` must report `pressed: true, value: 1`. On release: `pressed: false, value: 0`.

#### Axis Actions

| `action`            | Stick | Axis Index | Direction | Axis Value |
| ------------------- | ----- | ---------- | --------- | ---------- |
| `"leftStickUp"`     | Left  | 1          | Up        | `-1`       |
| `"leftStickDown"`   | Left  | 1          | Down      | `+1`       |
| `"leftStickLeft"`   | Left  | 0          | Left      | `-1`       |
| `"leftStickRight"`  | Left  | 0          | Right     | `+1`       |
| `"rightStickUp"`    | Right | 3          | Up        | `-1`       |
| `"rightStickDown"`  | Right | 3          | Down      | `+1`       |
| `"rightStickLeft"`  | Right | 2          | Left      | `-1`       |
| `"rightStickRight"` | Right | 2          | Right     | `+1`       |

The `Gamepad.axes[]` array has 4 entries: `[leftStickX, leftStickY, rightStickX, rightStickY]`.

- Axis values range from `-1.0` to `+1.0`. Center is `0`.
- Pressing a direction key sets the axis to the full value (`-1` or `+1`).
- Releasing returns the axis to `0` (unless the opposite direction is held).
- If both opposing directions on the same axis are held simultaneously, their values sum (resulting in `0`).

#### Extension Actions

| `action`              | Description                                                                                                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"toggleGamepad"`     | Toggles the virtual gamepad at the specified `gamepadIndex` on/off. When toggled off, that pad disconnects. When toggled on, it reconnects with the current config.                                                                   |
| `"toggleAllGamepads"` | Toggles all virtual gamepads on/off simultaneously. When toggled off, all virtual pads disconnect. When toggled on, they all reconnect with the current config. `gamepadIndex` is ignored for this action.                            |
| `"toggleExtension"`   | Toggles the extension on/off for the current tab only. When toggled off, all virtual pads in this tab disconnect and input processing stops. Does not affect other tabs or global storage. `gamepadIndex` is ignored for this action. |

These toggle keybindings work regardless of whether the gamepad is currently connected — they are always listening.

### GameScript

```json
{
  "type": "script",
  "activationType": "on_down",
  "actions": [
    {
      "type": "down",
      "buttons": [{ "type": "action", "gamepadIndex": 0, "action": "a" }]
    },
    { "type": "delay", "durationMs": 100 },
    {
      "type": "up",
      "buttons": [{ "type": "action", "gamepadIndex": 0, "action": "a" }]
    }
  ]
}
```

| Field            | Type                                         | Required | Description                                              |
| ---------------- | -------------------------------------------- | -------- | -------------------------------------------------------- |
| `type`           | `"script"`                                   | Yes      | Discriminator.                                           |
| `name`           | `string`                                     | Yes      | Display name for the script (shown in popup UI).         |
| `activationType` | `"on_down" \| "on_up" \| "toggle" \| "held"` | Yes      | When the script runs. See activation type details below. |
| `actions`        | `ScriptAction[]`                             | Yes      | Ordered list of steps to execute.                        |

#### Activation Types

| `activationType` | Trigger                                                                                            | Cancel                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `"on_down"`      | Key down. If the script is already running, it is **cancelled first**, then immediately restarted. | Implicitly cancelled and restarted on each key down.                  |
| `"on_up"`        | Key up. If the script is already running, it is **cancelled first**, then immediately restarted.   | Implicitly cancelled and restarted on each key up.                    |
| `"toggle"`       | First key down starts the script.                                                                  | Second key down **cancels** the running script (it does not restart). |
| `"held"`         | Key down starts the script.                                                                        | Key **up cancels** the running script.                                |

#### ScriptAction

| Shape                                                              | Description                                                                                                                                                         |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{ "type": "down", "buttons": [GamepadAction, ...] }`              | Press the listed buttons (does not release them).                                                                                                                   |
| `{ "type": "up",   "buttons": [GamepadAction, ...] }`              | Release the listed buttons.                                                                                                                                         |
| `{ "type": "key_down", "keys": [string, ...] }`                    | Dispatch synthetic `keydown` events for the listed key codes. Keys are tracked and released on script cancel.                                                       |
| `{ "type": "key_up", "keys": [string, ...] }`                      | Dispatch synthetic `keyup` events for the listed key codes and stop tracking them.                                                                                  |
| `{ "type": "delay", "durationMs": 50 }`                            | Wait `durationMs` milliseconds before the next step. `durationMs` may also be `"infinite"` — the delay never resolves, suspending the script until it is cancelled. |
| `{ "type": "loop", "count": 3, "actions": [ ...ScriptAction[] ] }` | Execute the nested `actions` `count` times. `count` may also be `"infinite"` to loop until the script is cancelled.                                                 |
| `{ "type": "point", "gamepadIndex": N, "stick": S, "x": X, "y": Y }` | Set the specified stick to the given (x, y) position. Values clamped to `[-1, 1]`. Stick resets to (0,0) on script cancel.                                       |
| `{ "type": "rotate", ... }`                                        | Sweep a stick from a start position to an end position over time. See [Rotate Action](#rotate-action) below.                                                        |

#### Hold Pattern

A `"down"` followed by `{ "type": "delay", "durationMs": "infinite" }` as the last action implements the "hold" pattern — buttons stay pressed until the script is cancelled (via key up for `"held"`, second press for `"toggle"`, or restart for `"on_down"`). Example:

```json
{
  "type": "script",
  "activationType": "held",
  "actions": [
    {
      "type": "down",
      "buttons": [{ "type": "action", "gamepadIndex": 0, "action": "a" }]
    },
    { "type": "delay", "durationMs": "infinite" }
  ]
}
```

Multiple buttons can be held, with intermediate delays between them:

```json
{
  "actions": [
    {
      "type": "down",
      "buttons": [{ "type": "action", "gamepadIndex": 0, "action": "a" }]
    },
    { "type": "delay", "durationMs": 100 },
    {
      "type": "down",
      "buttons": [{ "type": "action", "gamepadIndex": 0, "action": "b" }]
    },
    { "type": "delay", "durationMs": "infinite" }
  ]
}
```

### Keyboard Actions in Scripts

Scripts can dispatch synthetic keyboard events using `key_down` and `key_up`. These synthesized events flow through the normal event pipeline (including keyboard rebinds and the input processor), allowing scripts to trigger gamepad actions via keyboard codes or interact with the page directly.

```json
{
  "type": "script",
  "name": "Tap Space",
  "activationType": "on_down",
  "actions": [
    { "type": "key_down", "keys": ["Space"] },
    { "type": "delay", "durationMs": 100 },
    { "type": "key_up", "keys": ["Space"] }
  ]
}
```

Key codes use the same `KeyboardEvent.code` format as `keyboardConfig` keys (e.g. `"KeyW"`, `"Space"`, `"ArrowUp"`).

On script cancellation, any keys still tracked as held are automatically released (synthetic `keyup` dispatched).

### Rotate Action

Sweeps a stick from a start position to an end position along an arc over a specified duration.

```json
{
  "type": "rotate",
  "gamepadIndex": 0,
  "stick": "left",
  "startX": 1,
  "startY": 0,
  "endX": -1,
  "endY": 0,
  "directions": "infinite",
  "rotateMs": 2000,
  "clockwise": true
}
```

| Field         | Type                            | Description                                                                                       |
| ------------- | ------------------------------- | ------------------------------------------------------------------------------------------------- |
| `gamepadIndex`| `0 \| 1 \| 2 \| 3`             | Virtual pad to control.                                                                           |
| `stick`       | `"left" \| "right"`            | Which stick to move.                                                                              |
| `startX`      | `number` (`-1` to `1`)         | Starting X position.                                                                              |
| `startY`      | `number` (`-1` to `1`)         | Starting Y position.                                                                              |
| `endX`        | `number` (`-1` to `1`)         | Ending X position.                                                                                |
| `endY`        | `number` (`-1` to `1`)         | Ending Y position.                                                                                |
| `directions`  | `4 \| 8 \| "infinite"`         | Number of discrete positions along the arc. `"infinite"` = smooth interpolation.                  |
| `rotateMs`    | `number`                        | Duration of the sweep in milliseconds.                                                            |
| `clockwise`   | `boolean`                       | Direction of rotation (note: gamepad Y axis is inverted, so clockwise matches visual expectation).|

When `startX === endX && startY === endY`, the sweep traces a full circle. The stick resets to (0, 0) on script cancellation.

### Additive Button Press Model

Button presses from all sources are **additive**. A button is held as long as any source is pressing it. `"up"` in a script only removes that script's contribution — it is not a force release.

### Multiple Actions Per Key

A single key activates all entries in its `ActionMap` simultaneously, allowing one key to drive multiple virtual slots:

```json
{
  "Space": [
    { "type": "action", "gamepadIndex": 0, "action": "a" },
    { "type": "action", "gamepadIndex": 1, "action": "a" }
  ]
}
```

### Multiple Keys for One Action

```json
{
  "ArrowUp": [{ "type": "action", "gamepadIndex": 0, "action": "dpadUp" }],
  "KeyX": [{ "type": "action", "gamepadIndex": 0, "action": "dpadUp" }]
}
```

## Physical Gamepad Handling

The `otherGamepadMode` field controls how physical (real) gamepads coexist with virtual pads in `navigator.getGamepads()`.

### Virtual Slots

The **virtual slots** set is the distinct `gamepadIndex` values referenced by any `GamepadAction` in `keyboardConfig` or any `MouseControlTarget` in `mouseConfig.mouseControls`. These slots are owned by the virtual layer.

### `"separate"` mode (default)

Virtual pads occupy their configured slots. Physical pads are passed through but **may be renumbered** to avoid conflicting with virtual slots.

**Slot assignment for physical pads:**

- Each physical pad is identified by its hardware `id` and assigned a stable output slot.
- The assigned slot must not be in the virtual slots set and must not be used by another physical pad.
- Assign the lowest-numbered slot satisfying those constraints.
- If no such slot exists, the pad is not exposed until a slot becomes free.

**On initialization** (config activated, virtual slots set established):

1. For each currently connected physical pad whose **native browser slot index** conflicts with a virtual slot:
   a. Fire `gamepaddisconnected` for the old slot.
   b. Reassign to the lowest free non-virtual slot.
   c. If a slot is available, fire `gamepadconnected` for the new slot.
2. Physical pads whose native slots do not conflict are assigned that native slot unchanged — no events fired.

**On physical connect:**

1. Intercept the native event (suppress it).
2. Assign the lowest free non-virtual slot not used by another physical pad.
3. If available, dispatch `gamepadconnected` with the assigned slot index.
4. If no slot is available, do not dispatch — pad is ignored.

**On physical disconnect:**

1. Intercept the native event (suppress it).
2. Remove the pad's slot assignment.
3. Dispatch `gamepaddisconnected` with the previously assigned slot index.

**On config change** (virtual slots set changes):

1. For each physical pad whose current slot is now in the new virtual slots set:
   a. Fire `gamepaddisconnected` for the old slot.
   b. Reassign to the lowest free non-virtual slot.
   c. If available, fire `gamepadconnected` for the new slot.
2. Physical pads whose slots remain free keep their slots — no events fired.

### `"combine"` mode

Virtual slots are owned by virtual pads and have physical input merged in. Non-virtual slots pass physical pads through **without modification** — no renumbering, no event interception.

**`navigator.getGamepads()` in combine mode:**

- For each **virtual slot**: return a merged gamepad — the virtual pad's keyboard/mouse state unioned with the physical pad at that same slot index, if one exists (button pressed if virtual OR physical has it pressed; axis uses virtual value if non-zero, otherwise the physical value).
- For each **non-virtual slot**: return the physical pad exactly as the original `getGamepads()` reports it, unmodified.

**Physical connect/disconnect events in combine mode:**

- Events for physical pads at **non-virtual slots** pass through to the page unchanged.
- Events for physical pads at **virtual slots** are suppressed — the page does not see them as separate devices.

**Virtual pad initial state in combine mode:**

- When a virtual pad is enabled in combine mode, its keyboard/mouse state starts at zero (no keys pressed, no mouse movement). The merged output will immediately reflect any physical pad input at that slot since the merge happens at read time in `getGamepads()`.

## Keyboard Rebinds

An optional array on `GamepadConfig` that remaps physical key presses before they reach the input processor. Each entry specifies one physical key to intercept and the synthetic key codes to emit in its place.

```json
{
  "keyboardRebinds": [
    { "from": "KeyZ", "to": ["Space"] },
    { "from": "Space", "to": ["Space", "KeyU"] }
  ]
}
```

| Field  | Type       | Required | Description                                                            |
| ------ | ---------- | -------- | ---------------------------------------------------------------------- |
| `from` | `string`   | Yes      | `KeyboardEvent.code` of the physical key to intercept.                 |
| `to`   | `string[]` | Yes      | `KeyboardEvent.code` values to synthesize. May include `from` itself.  |

### Rules

- Each `from` value must be unique across the array (one physical key → one rebind entry).
- `to` may contain multiple codes (one-to-many mapping).
- `from` and `to` may be the same code (key fires itself plus additional targets).
- `"Escape"` is allowed in both `from` and `to` (no restriction unlike `keyboardConfig`).
- Empty `to` array is valid but has no runtime effect (the key passes through normally).
- Empty string `from` entries are skipped at runtime.

### Processing Order

Rebinds are installed in the window capture phase and fire **before** the input processor's keydown/keyup handlers. The input processor only sees the synthetic events.

## Validation Rules

1. **Escape key forbidden**: `"Escape"` must not be used as a key in `keyboardConfig`.
2. **Sensitivity range**: Each `MouseControlTarget.sensitivity` must be an integer between `1` and `1000` inclusive.
3. **gamepadIndex range**: `gamepadIndex` in any `GamepadAction` or `MouseControlTarget` must be `0`, `1`, `2`, or `3`.

An implementation must reject configurations that fail these rules and must not activate them. However, if only some entries in a config are invalid (e.g. a single bad key binding), the implementation should log the errors and proceed with the valid mappings rather than rejecting the entire config.

## Default Configuration

The built-in default preset (all actions target virtual pad 0):

```json
{
  "mouseConfig": {
    "mouseControls": [
      { "stick": "right", "gamepadIndex": 0, "sensitivity": 1000 }
    ]
  },
  "keyboardConfig": {
    "Space": [{ "type": "action", "gamepadIndex": 0, "action": "a" }],
    "KeyB": [{ "type": "action", "gamepadIndex": 0, "action": "b" }],
    "Backspace": [{ "type": "action", "gamepadIndex": 0, "action": "b" }],
    "KeyY": [{ "type": "action", "gamepadIndex": 0, "action": "y" }],
    "KeyX": [{ "type": "action", "gamepadIndex": 0, "action": "x" }],
    "KeyQ": [{ "type": "action", "gamepadIndex": 0, "action": "leftShoulder" }],
    "KeyE": [
      { "type": "action", "gamepadIndex": 0, "action": "rightShoulder" }
    ],
    "RightClick": [
      { "type": "action", "gamepadIndex": 0, "action": "leftTrigger" }
    ],
    "Click": [
      { "type": "action", "gamepadIndex": 0, "action": "rightTrigger" }
    ],
    "BracketLeft": [
      { "type": "action", "gamepadIndex": 0, "action": "leftStickPressed" }
    ],
    "BracketRight": [
      { "type": "action", "gamepadIndex": 0, "action": "rightStickPressed" }
    ],
    "Enter": [{ "type": "action", "gamepadIndex": 0, "action": "start" }],
    "Tab": [{ "type": "action", "gamepadIndex": 0, "action": "select" }],
    "ArrowUp": [{ "type": "action", "gamepadIndex": 0, "action": "dpadUp" }],
    "ArrowDown": [
      { "type": "action", "gamepadIndex": 0, "action": "dpadDown" }
    ],
    "ArrowLeft": [
      { "type": "action", "gamepadIndex": 0, "action": "dpadLeft" }
    ],
    "ArrowRight": [
      { "type": "action", "gamepadIndex": 0, "action": "dpadRight" }
    ],
    "ShiftRight": [
      { "type": "action", "gamepadIndex": 0, "action": "rightTrigger" }
    ],
    "ShiftLeft": [
      { "type": "action", "gamepadIndex": 0, "action": "leftTrigger" }
    ],
    "KeyW": [{ "type": "action", "gamepadIndex": 0, "action": "leftStickUp" }],
    "KeyS": [
      { "type": "action", "gamepadIndex": 0, "action": "leftStickDown" }
    ],
    "KeyA": [
      { "type": "action", "gamepadIndex": 0, "action": "leftStickLeft" }
    ],
    "KeyD": [
      { "type": "action", "gamepadIndex": 0, "action": "leftStickRight" }
    ],
    "KeyO": [{ "type": "action", "gamepadIndex": 0, "action": "rightStickUp" }],
    "KeyL": [
      { "type": "action", "gamepadIndex": 0, "action": "rightStickDown" }
    ],
    "KeyK": [
      { "type": "action", "gamepadIndex": 0, "action": "rightStickLeft" }
    ],
    "Semicolon": [
      { "type": "action", "gamepadIndex": 0, "action": "rightStickRight" }
    ],
    "Backslash": [{ "type": "action", "gamepadIndex": 0, "action": "home" }],
    "F8": [{ "type": "action", "gamepadIndex": 0, "action": "toggleExtension" }]
  }
}
```

## Virtual Gamepad Shape

Each virtual gamepad exposed via `navigator.getGamepads()` must conform to:

| Property         | Value                                             |
| ---------------- | ------------------------------------------------- |
| `id`             | `"Xbox 360 Controller (XInput STANDARD GAMEPAD)"` |
| `index`          | The slot index (0–3) this pad occupies            |
| `mapping`        | `"standard"`                                      |
| `connected`      | `true` (when active)                              |
| `buttons.length` | `17`                                              |
| `axes.length`    | `4`                                               |

Each entry in `buttons[]` is an object with `{ pressed: boolean, touched: boolean, value: number }`.
