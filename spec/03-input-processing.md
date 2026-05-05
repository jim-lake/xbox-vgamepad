# 03 — Input Processing

This component captures keyboard and mouse events and translates them into gamepad simulator actions. It is the bridge between DOM input events and the virtual gamepad.

## Config Activation

When a `GamepadConfig` is received:

1. Process `keyConfig` into a reverse lookup from key codes to gamepad actions (see `04-config-format.md` for processing rules)
2. If there are validation errors, log them but **proceed with the valid mappings** (partial configs work)
3. Tear down any previous listeners
4. Attach keyboard listeners
5. If `mouseConfig.mouseControls` is defined (0 or 1), attach mouse movement listeners
6. Enable the gamepad simulator (fires `gamepadconnected`)

## Config Deactivation

1. Remove all event listeners (keyboard, mouse, pointer lock)
2. Exit pointer lock if active
3. Remove the click-to-enable overlay element if present
4. Disable the gamepad simulator (fires `gamepaddisconnected`)

## Keyboard Event Handling

Listeners are attached to `document` for `keydown` and `keyup`.

### keydown

1. **Ignore `event.repeat`** — held keys must not re-trigger
2. Look up `event.code` in the key-to-gamepad mapping
3. If it maps to a **button**: press that gamepad button
4. If it maps to an **axis direction**: deflect that axis
5. If the event was handled and `event.cancelable` is true: call `event.preventDefault()`

### keyup

1. Look up `event.code` in the mapping
2. If button: unpress that gamepad button
3. If axis: release that axis direction
4. Does **NOT** call `preventDefault()` on keyup

## Mouse Button Handling

Only registered if the config contains bindings for `Click` or `RightClick`.

Listeners attach to the xCloud game UI container element (not document).

### mousedown

- `event.button === 0` → look up `'Click'` → press
- `event.button === 2` → look up `'RightClick'` → press

### mouseup

- Same mapping → unpress

## Scroll Wheel Handling

Only registered if the config contains a binding for `Scroll`.

Listener attaches to the game UI container element.

### wheel event

1. Press the mapped button
2. Auto-unpress after **20ms** (simulates a momentary press)
3. Debounce: new scroll events reset the unpress timer
4. Call `preventDefault()` if cancelable

## Mouse Movement → Analog Stick

### Parameters

- `stick`: which analog stick (default `1` = right stick). Comes from `mouseConfig.mouseControls`.
- `sensitivity`: divisor for mouse movement (default `10`). Comes from `mouseConfig.sensitivity`. **Higher value = less sensitive** (it's a divisor, not a multiplier).

### Pointer Lock Flow

1. Show a click-to-enable overlay within the game UI container
2. On click of the overlay: request pointer lock on the container, then focus the game stream element
3. On pointer lock error: update overlay text to indicate the user should click again

### Pointer Lock Change Handler

- When pointer lock **acquired**: remove click overlay, start listening for `mousemove` on `document`
- When pointer lock **lost**: stop listening for `mousemove`, re-show click overlay

### Mouse Movement Processing

Uses a throttled accumulation pattern:

1. On each `mousemove` event, accumulate `movementX` and `movementY`
2. Throttle processing at **40ms** intervals (~25fps)
3. When processing fires:
   - Clear and restart a **50ms stop-moving timer** that resets the stick to `(0, 0)` when the mouse stops
   - Clamp accumulated movement: `clamp(accumulated / sensitivity, -1, 1)`
   - Reset accumulators to 0
   - Set the target stick to the clamped values

### Mouse Stop Detection

When the mouse stops moving for **50ms**, the target stick automatically returns to center `(0, 0)`. This is critical — without it, the stick would stay deflected after the mouse stops.

## Alternate Binding Behavior

When a button has two key bindings (e.g. `b: ["ControlLeft", "Backspace"]`), either key independently activates the button.

For **axes**, the simulator's direction-tracking system handles alternates correctly: each direction is tracked as pressed/unpressed independently, so releasing one key while the other is held keeps the axis deflected.
