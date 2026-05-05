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
  "keyConfig": { "..." },
  "mouseConfig": { "..." }
}
```

| Field         | Type                 | Required | Description                                         |
| ------------- | -------------------- | -------- | --------------------------------------------------- |
| `keyConfig`   | `GamepadKeyConfig`   | Yes      | Keyboard/mouse-to-gamepad button and axis bindings. |
| `mouseConfig` | `GamepadMouseConfig` | Yes      | Mouse movement-to-analog stick settings.            |

## GamepadMouseConfig

Controls how mouse movement maps to an analog stick.

```json
{ "mouseControls": 1, "sensitivity": 10 }
```

| Field           | Type                     | Required | Valid Values                                                       | Description                                                       |
| --------------- | ------------------------ | -------- | ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `mouseControls` | `0`, `1`, or `undefined` | Yes      | `0` = left stick, `1` = right stick, `undefined`/`null` = disabled | Which analog stick raw mouse movement controls.                   |
| `sensitivity`   | `number`                 | Yes      | Integer, `1` – `1000`                                              | Multiplier for mouse movement-to-stick deflection. Default: `10`. |

## GamepadKeyConfig

Maps keyboard codes and virtual mouse codes to gamepad buttons and analog stick directions. Every field is optional — omitted or `undefined` fields leave that gamepad input unbound.

### Key Map Values

Each field accepts a **KeyMap**, which is one of:

| Form        | Example                        | Meaning                                                                  |
| ----------- | ------------------------------ | ------------------------------------------------------------------------ |
| `undefined` | —                              | Unbound.                                                                 |
| `string`    | `"Space"`                      | Single key binding.                                                      |
| `string[]`  | `["ControlLeft", "Backspace"]` | Up to 2 alternate bindings. Either key activates the same gamepad input. |

### Key Code Format

Values are [KeyboardEvent.code](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code) strings (e.g. `"KeyW"`, `"Space"`, `"ArrowUp"`, `"ShiftLeft"`), plus three virtual codes for mouse actions:

| Virtual Code   | Trigger                       |
| -------------- | ----------------------------- |
| `"Click"`      | Left mouse button (button 0)  |
| `"RightClick"` | Right mouse button (button 2) |
| `"Scroll"`     | Mouse scroll wheel            |

### Button Bindings

These fields map to discrete gamepad buttons. The `gamepadIndex` column is the index in the standard `Gamepad.buttons[]` array.

| Field               | Gamepad Button         | `gamepadIndex` |
| ------------------- | ---------------------- | -------------- |
| `a`                 | A (Cross)              | 0              |
| `b`                 | B (Circle)             | 1              |
| `x`                 | X (Square)             | 2              |
| `y`                 | Y (Triangle)           | 3              |
| `leftShoulder`      | Left Bumper (LB)       | 4              |
| `rightShoulder`     | Right Bumper (RB)      | 5              |
| `leftTrigger`       | Left Trigger (LT)      | 6              |
| `rightTrigger`      | Right Trigger (RT)     | 7              |
| `select`            | Back / Select / View   | 8              |
| `start`             | Start / Menu           | 9              |
| `leftStickPressed`  | Left Stick Click (L3)  | 10             |
| `rightStickPressed` | Right Stick Click (R3) | 11             |
| `dpadUp`            | D-Pad Up               | 12             |
| `dpadDown`          | D-Pad Down             | 13             |
| `dpadLeft`          | D-Pad Left             | 14             |
| `dpadRight`         | D-Pad Right            | 15             |
| `home`              | Xbox / Guide           | 16             |

When a bound key is pressed, the corresponding `Gamepad.buttons[gamepadIndex]` must report `pressed: true, value: 1`. On release: `pressed: false, value: 0`.

### Axis Bindings

These fields map to analog stick directions. Each bound key drives the stick fully in that direction (digital-to-analog).

| Field             | Stick | Axis Index | Direction | Axis Value |
| ----------------- | ----- | ---------- | --------- | ---------- |
| `leftStickUp`     | Left  | 1          | Up        | `-1`       |
| `leftStickDown`   | Left  | 1          | Down      | `+1`       |
| `leftStickLeft`   | Left  | 0          | Left      | `-1`       |
| `leftStickRight`  | Left  | 0          | Right     | `+1`       |
| `rightStickUp`    | Right | 3          | Up        | `-1`       |
| `rightStickDown`  | Right | 3          | Down      | `+1`       |
| `rightStickLeft`  | Right | 2          | Left      | `-1`       |
| `rightStickRight` | Right | 2          | Right     | `+1`       |

The `Gamepad.axes[]` array has 4 entries: `[leftX, leftY, rightX, rightY]`.

- Axis values range from `-1.0` to `+1.0`. Center is `0`.
- Pressing a direction key sets the axis to the full value (`-1` or `+1`).
- Releasing returns the axis to `0` (unless the opposite direction is held).
- If both opposing directions on the same axis are held simultaneously, their values sum (resulting in `0`).

## Validation Rules

A configuration is **invalid** if any of the following are true:

1. **Duplicate key codes**: The same key code string appears in more than one field within `keyConfig`. Each code may only be bound to one gamepad input.
2. **Escape key forbidden**: The code `"Escape"` must not be used in any binding.
3. **Array length**: When a field is an array, it must contain at most 2 elements.
4. **Mouse config range**: `sensitivity` must be between `1` and `1000` inclusive.
5. **Mouse config stick**: `mouseControls` must be `0`, `1`, or `undefined`/`null`.

An implementation must reject invalid configurations and must not activate them.

## Default Configuration

The built-in default preset:

```json
{
  "mouseConfig": { "mouseControls": 1, "sensitivity": 10 },
  "keyConfig": {
    "a": "Space",
    "b": ["ControlLeft", "Backspace"],
    "x": "KeyR",
    "y": ["KeyV", "Scroll"],
    "leftShoulder": ["KeyC", "KeyG"],
    "rightShoulder": "KeyQ",
    "leftTrigger": "RightClick",
    "rightTrigger": "Click",
    "start": "Enter",
    "select": "Tab",
    "home": undefined,
    "dpadUp": ["ArrowUp", "KeyX"],
    "dpadDown": ["ArrowDown", "KeyZ"],
    "dpadLeft": ["ArrowLeft", "KeyN"],
    "dpadRight": "ArrowRight",
    "leftStickUp": "KeyW",
    "leftStickDown": "KeyS",
    "leftStickLeft": "KeyA",
    "leftStickRight": "KeyD",
    "rightStickUp": "KeyO",
    "rightStickDown": "KeyL",
    "rightStickLeft": "KeyK",
    "rightStickRight": "Semicolon",
    "leftStickPressed": "ShiftLeft",
    "rightStickPressed": "KeyF"
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
2. **Key press → button press**: When a keyboard key bound to a button field is pressed, the corresponding `buttons[gamepadIndex]` must immediately reflect `pressed: true, value: 1`.
3. **Key release → button release**: When the key is released, the button must return to `pressed: false, value: 0`.
4. **Key press → axis deflection**: When a keyboard key bound to an axis direction is pressed, the corresponding axis must deflect to the full value (`-1` or `+1`).
5. **Key release → axis center**: When the key is released, the axis must return to `0` (unless the opposing direction is still held).
6. **Opposing axes cancel**: If both opposing direction keys on the same axis are held, the axis value must be `0`.
7. **Simultaneous inputs**: Multiple buttons and axes may be active at the same time. Pressing one input must not affect unrelated inputs.
8. **Alternate bindings**: When a button has two key bindings, either key independently activates the button.
9. **Mouse movement → stick**: When `mouseControls` is set, raw mouse movement (via Pointer Lock) must deflect the designated analog stick, scaled by `sensitivity`.
10. **Gamepad disappears on deactivation**: When the extension is disabled or the game exits, the virtual gamepad must disconnect and a `gamepaddisconnected` event must fire.
11. **No phantom input**: When no keys are pressed and the mouse is stationary, all buttons must be unpressed and all axes must be at `0`.
