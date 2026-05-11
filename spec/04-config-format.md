# 04 — Config Format, Validation, and Defaults

See `../JSON.md` for the authoritative JSON schema. This document covers runtime processing and validation rules.

## Config Processing: keyboardConfig → Key Action Map

`keyboardConfig` is a `Record<string, ActionMap>` where each key is a key code and each value is an array of `GamepadAction` and/or `GameScript` objects. At runtime this is used directly as a lookup from key code to actions — no inversion step is needed.

### Building the Runtime Key Map

For each entry in `keyboardConfig`:

1. **Reject** if the key code is `"Escape"` (log error, skip)
2. Collect all `GamepadAction` entries (type `"action"`) whose `action` is not `"toggleGamepad"` into the runtime map for that key code
3. `GameScript` entries and `toggleGamepad` actions are handled separately and are not included in the regular key map

### Determining Active Virtual Gamepad Indices

The set of virtual gamepad indices that need simulators enabled is the union of:

- All `gamepadIndex` values from `GamepadAction` entries in `keyboardConfig` (excluding `toggleGamepad`)
- All `gamepadIndex` values from `MouseControlTarget` entries in `mouseConfig.mouseControls`

### Toggle Key Codes

Separately, collect all key codes whose `ActionMap` contains a `GamepadAction` with `action === "toggleGamepad"`. These are registered on a global always-on listener independent of the active state.

## Validation Rules

1. **Escape forbidden**: `"Escape"` must not appear as a key in `keyboardConfig`
2. **Sensitivity range**: Each `MouseControlTarget.sensitivity` must be an integer between `1` and `1000` inclusive
3. **gamepadIndex range**: `gamepadIndex` in any `GamepadAction` or `MouseControlTarget` must be `0`, `1`, `2`, or `3`

Invalid configs must not crash the extension. Log errors and proceed with whatever valid mappings exist.

## Virtual Mouse Codes

Three special key code strings represent mouse actions:

| Code           | Trigger                       |
| -------------- | ----------------------------- |
| `"Click"`      | Left mouse button (button 0)  |
| `"RightClick"` | Right mouse button (button 2) |
| `"Scroll"`     | Mouse scroll wheel            |

These appear as keys in `keyboardConfig` and are processed identically to keyboard key codes.

## Action Resolution

### Button actions

`action` name → button index via `BUTTON_MAP`:

```
a:0  b:1  x:2  y:3  leftShoulder:4  rightShoulder:5  leftTrigger:6  rightTrigger:7
select:8  start:9  leftStickPressed:10  rightStickPressed:11
dpadUp:12  dpadDown:13  dpadLeft:14  dpadRight:15  home:16
```

### Axis actions

`action` name → axis index + direction value:

- `leftStickLeft` → axis 0, value `-1`
- `leftStickRight` → axis 0, value `+1`
- `leftStickUp` → axis 1, value `-1`
- `leftStickDown` → axis 1, value `+1`
- `rightStickLeft` → axis 2, value `-1`
- `rightStickRight` → axis 2, value `+1`
- `rightStickUp` → axis 3, value `-1`
- `rightStickDown` → axis 3, value `+1`

Axes array: `[leftStickX, leftStickY, rightStickX, rightStickY]` (indices 0–3).

## Limits

- Default config name: `"default"`
- Maximum presets: 25
- Default sensitivity: `101`
