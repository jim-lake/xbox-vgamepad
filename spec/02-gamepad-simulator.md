# 02 — Gamepad Simulator

The gamepad simulator is the lowest-level component. It maintains a fake `Gamepad` object and replaces `navigator.getGamepads()` with a version that returns it.

## Virtual Gamepad Shape

The fake controller must exactly match this shape:

| Property          | Value                                               |
| ----------------- | --------------------------------------------------- |
| `id`              | `"Xbox 360 Controller (XInput STANDARD GAMEPAD)"`   |
| `index`           | `0`                                                 |
| `mapping`         | `"standard"`                                        |
| `connected`       | `true` when active, `false` when inactive           |
| `buttons.length`  | `17`                                                |
| `axes.length`     | `4`                                                 |
| `hapticActuators` | `[]`                                                |
| `timestamp`       | `performance.now()` — updated on every state change |

### Buttons Array

17 buttons, each an object: `{ pressed: boolean, touched: boolean, value: number }`

Default (idle) state for every button: `{ pressed: false, touched: false, value: 0 }`

### Axes Array

4 axes: `[leftStickX, leftStickY, rightStickX, rightStickY]`

Default (idle) state: `[0, 0, 0, 0]`

## navigator.getGamepads() Patching

### Initialization

The original `navigator.getGamepads` function must be captured before any page code runs.

### Patching

Replace `navigator.getGamepads` with a function that:

- When the simulator is **enabled**: returns an array with the fake controller at index 0 (other slots null). The returned gamepad must be a snapshot — callers must not be able to mutate the simulator's internal state.
- When the simulator is **disabled**: calls and returns the result of the original `navigator.getGamepads()`

### Restoration

Provide a way to restore the original `navigator.getGamepads` function.

## Event Firing

### gamepadconnected

When the simulator is enabled:

1. Set `fakeController.connected = true`
2. Create `new Event('gamepadconnected')`
3. Attach the fake controller as `event.gamepad` (via property assignment)
4. Dispatch on `window`

### gamepaddisconnected

When the simulator is disabled:

1. Set `fakeController.connected = false`
2. Create `new Event('gamepaddisconnected')`
3. Attach the fake controller as `event.gamepad`
4. Dispatch on `window`

## Button State Management

### Press

Set `buttons[index].pressed = true`, `buttons[index].value = 1`, update `timestamp`.

### Unpress

Set `buttons[index].pressed = false`, `buttons[index].touched = false`, `buttons[index].value = 0`, update `timestamp`.

## Axis State Management

Axes use a **direction-based** system that tracks which directions are currently pressed. This is critical for correct opposing-axis cancellation.

### Direction Model

Four directions: UP, DOWN, LEFT, RIGHT

- UP/DOWN control the Y position (axis position 1)
- LEFT/RIGHT control the X position (axis position 0)
- UP/LEFT produce value `-1`
- DOWN/RIGHT produce value `+1`
- Opposites: UP↔DOWN, LEFT↔RIGHT

### Axis Index Calculation

Given a stick number (0=left, 1=right) and a position (0=X, 1=Y):

```
axisIndex = stick * 2 + position
```

So: left stick X=0, left stick Y=1, right stick X=2, right stick Y=3.

### Direction Press

1. Record that this direction is now pressed
2. Calculate the axis value: `directionValue + (oppositeDirectionPressed ? oppositeDirectionValue : 0)`
   - This means: if both UP and DOWN are pressed, value = `-1 + 1 = 0` (they cancel)
3. Set the axis to this value
4. Update timestamp

### Direction Unpress

1. Record that this direction is no longer pressed
2. If the opposite direction is still pressed, set axis to the opposite direction's value
3. Otherwise set axis to `0`
4. Update timestamp

### Direct Axis Move (Mouse)

Directly set both axes for a stick to the given x and y values. Used for mouse movement (analog, not digital).

## Critical Invariants

1. **No duplicate gamepads**: After any number of enable/disable cycles, `getGamepads()` must contain at most one non-null gamepad.
2. **Clean state on enable**: When re-enabled, all buttons must be unpressed and all axes at 0.
3. **Exact values**: Button values are exactly `0` or `1` (not floating point approximations). Axis values from keyboard are exactly `-1`, `0`, or `+1`.
4. **Timestamp advances**: The timestamp must change whenever any input state changes.
