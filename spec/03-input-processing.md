# 03 — Input Processing

This component captures keyboard and mouse events and translates them into gamepad simulator actions. It is the bridge between DOM input events and the virtual gamepad.

## Config Activation

When a `GamepadConfig` is received:

1. Build a key-code-to-actions lookup from `keyboardConfig` (see `04-config-format.md`)
2. Determine the set of active virtual gamepad indices from all `GamepadAction` entries and all `MouseControlTarget` entries
3. If there are validation errors, log them but **proceed with the valid mappings** (partial configs work)
4. If already active (hot-swap):
   - Remove all existing listeners and clear timers
   - Update the mode and virtual slots set (fires disconnect/connect for any physical pads that need remapping — see `02-gamepad-simulator.md`)
   - Disable virtual pads no longer in the new index set (fires `gamepaddisconnected` for each)
   - Reset state on virtual pads that remain active
   - Enable virtual pads newly added in the new index set (fires `gamepadconnected` for each)
   - Attach new listeners
5. If not yet active (first activation):
   - Set mode and virtual slots
   - Enable all virtual pads in the index set (fires `gamepadconnected` for each)
   - Attach listeners

## Config Deactivation

1. Remove all event listeners (keyboard, mouse, pointer lock)
2. Clear all timers
3. Exit pointer lock if active
4. Remove the click-to-enable overlay element if present
5. Disable all active virtual pads (fires `gamepaddisconnected` for each)
6. Clear the virtual slots set

## Keyboard Event Handling

Listeners are attached to `document` for `keydown` and `keyup`.

### keydown

1. **Ignore `event.repeat`** — held keys must not re-trigger
2. Look up `event.code` in the key-to-actions map
3. For each `GamepadAction` in the result: press the corresponding button or deflect the corresponding axis on the target virtual pad
4. If the event was handled and `event.cancelable` is true: call `event.preventDefault()`

### keyup

1. Look up `event.code` in the map
2. For each `GamepadAction`: unpress the button or release the axis direction on the target virtual pad
3. Does **NOT** call `preventDefault()` on keyup

## Mouse Button Handling

Only registered if the config contains bindings for `Click` or `RightClick`.

Listeners attach to the xCloud game UI container element (not document).

### mousedown

- `event.button === 0` → look up `'Click'` → press all mapped actions
- `event.button === 2` → look up `'RightClick'` → press all mapped actions

### mouseup

- Same mapping → unpress all mapped actions

## Scroll Wheel Handling

Only registered if the config contains a binding for `Scroll`.

Listener attaches to the game UI container element.

### wheel event

1. Press all mapped actions
2. Auto-unpress after **20ms** (simulates a momentary press)
3. Debounce: new scroll events reset the unpress timer
4. Call `preventDefault()` if cancelable

## Mouse Movement → Analog Stick

Configured via `mouseConfig.mouseControls` — an array of `MouseControlTarget` entries. Each entry specifies a `stick` (`"left"` or `"right"`), a `gamepadIndex`, and a `sensitivity`. Only the first entry is used for pointer lock and movement processing (multiple entries are not currently supported at runtime).

### Parameters

- `stick`: `"left"` or `"right"`. From `mouseControls[0].stick`.
- `gamepadIndex`: which virtual pad to drive. From `mouseControls[0].gamepadIndex`.
- `sensitivity`: divisor for mouse movement. From `mouseControls[0].sensitivity`. **Higher value = less sensitive.**

If `mouseControls` is empty, mouse movement is disabled.

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
   - Set the target stick on the target virtual pad to the clamped values

### Mouse Stop Detection

When the mouse stops moving for **50ms**, the target stick automatically returns to center `(0, 0)`.
