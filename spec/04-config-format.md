# 04 — Config Format, Validation, and Defaults

See `../JSON.md` for the authoritative JSON schema. This document covers processing and validation rules.

## Config Processing: keyConfig → Gamepad Actions

The `keyConfig` object (human-readable button names → key codes) must be transformed into a reverse lookup (key codes → gamepad actions) at runtime.

### Button Name → Gamepad Index

```
a:0  b:1  x:2  y:3  leftShoulder:4  rightShoulder:5  leftTrigger:6  rightTrigger:7
select:8  start:9  leftStickPressed:10  rightStickPressed:11
dpadUp:12  dpadDown:13  dpadLeft:14  dpadRight:15  home:16
```

### Axis Name → Stick + Direction

Determine stick number from prefix: starts with `'l'` → stick 0 (left), otherwise → stick 1 (right).

Determine direction from suffix after stripping `left/rightStick` prefix:
- `Up` → UP (value -1, Y axis)
- `Down` → DOWN (value +1, Y axis)
- `Left` → LEFT (value -1, X axis)
- `Right` → RIGHT (value +1, X axis)

### Processing Rules

For each field in keyConfig:
1. Normalize the value to an array (string → `[string]`, undefined → skip, array → as-is)
2. For each key code in the array:
   - **Reject** if the code is `"Escape"` (log error, skip this binding)
   - **Reject** if the code is already mapped (duplicate — log error, skip; first binding wins)
   - Map the code to the appropriate gamepad button index or axis direction

## Validation Rules

1. **Duplicate key codes**: Same code in multiple fields → reject the duplicate (first binding wins)
2. **Escape forbidden**: `"Escape"` cannot be bound to anything
3. **Array max length**: Each field accepts at most 2 key codes
4. **Sensitivity range**: `mouseConfig.sensitivity` must be integer 1–1000
5. **mouseControls values**: Must be `0`, `1`, `undefined`, or `null`

Invalid configs should be rejected but must not crash the extension. Log errors and proceed with whatever valid mappings exist.

## Virtual Mouse Codes

Three special string values represent mouse actions (not keyboard keys):

| Code | Trigger |
|------|---------|
| `"Click"` | Left mouse button (button 0) |
| `"RightClick"` | Right mouse button (button 2) |
| `"Scroll"` | Mouse scroll wheel |

These can appear anywhere a key code string can appear (as a single string or in an array).

## Default Configuration

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

## Empty Configuration

All keyConfig fields set to `undefined`, `mouseControls` set to `undefined`, `sensitivity` set to `10` (the default sensitivity constant).

## Limits

- Default config name: `"default"`
- Maximum presets: 25
- Default sensitivity: 10
