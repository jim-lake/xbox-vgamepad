# 10 — Behavioral Contract

These are the observable behaviors any conforming implementation must exhibit. They are verified by the integration test suite.

## Gamepad Lifecycle

1. **Gamepad appears on activation**: When the extension is enabled and a game page is detected, `navigator.getGamepads()` must return a gamepad matching the virtual gamepad shape (see `02-gamepad-simulator.md`), and a `gamepadconnected` event must fire on `window`.

2. **Gamepad disappears on deactivation**: When the extension is disabled or the game exits, the virtual gamepad must disconnect and a `gamepaddisconnected` event must fire on `window`. `navigator.getGamepads()` must return null/empty for that slot.

3. **No duplicate gamepads**: After any number of enable/disable cycles or page reloads, `getGamepads()` must contain at most one non-null gamepad.

4. **Clean reconnection after page reload**: The gamepad must reconnect with correct identity and shape. No phantom input (all buttons false, all axes 0). Buttons held before reload must NOT be stuck after reload.

## Button Behavior

5. **Key press → button press**: When a keyboard key bound to a button field is pressed, `buttons[gamepadIndex]` must immediately reflect `pressed: true, value: 1`.

6. **Key release → button release**: When the key is released, the button must return to `pressed: false, value: 0`.

7. **Exact values**: Button `value` is exactly `0` or `1` (integer, not floating point approximation).

8. **Touched property**: `touched` is `false` for all idle buttons. Resets to `false` after release.

9. **Simultaneous buttons**: Multiple buttons can be active at the same time without interference.

10. **All 17 buttons simultaneously**: All 17 buttons can be pressed at once and must all register correctly.

## Axis Behavior

11. **Key press → axis deflection**: When a key bound to an axis direction is pressed, the corresponding axis must deflect to exactly `-1` or `+1`.

12. **Key release → axis center**: When the key is released, the axis must return to exactly `0` (unless the opposing direction is still held).

13. **Opposing axes cancel**: If both opposing direction keys on the same axis are held simultaneously, the axis value must be exactly `0`.

14. **Release with opposing held**: If both opposing keys are held and one is released, the axis must snap to the remaining key's direction value.

15. **All 4 axes independent**: Deflecting one axis does not affect others.

16. **Diagonal movement**: Both X and Y of the same stick can be deflected simultaneously. Both sticks can be diagonal simultaneously (all 4 axes non-zero).

17. **Axis values clamped**: Axis values never exceed the `[-1, +1]` range.

## Alternate Bindings

18. **Either key activates**: When a button has two key bindings, either key independently activates the button.

19. **Axis alternates**: Array bindings work for axis fields too — either key deflects the axis.

## Mouse Input

20. **mouseControls=0**: Mouse movement targets left stick (axes 0, 1).

21. **mouseControls=1**: Mouse movement targets right stick (axes 2, 3).

22. **mouseControls=undefined/null**: Mouse movement produces NO stick deflection.

23. **Sensitivity scaling**: Higher sensitivity value (as stored) means less deflection for the same mouse movement (it's a divisor).

24. **Mouse auto-reset**: When the mouse stops moving, the target stick returns to center (0, 0) after ~50ms.

25. **Click/RightClick/Scroll**: Virtual mouse codes work as button bindings — left click, right click, and scroll wheel can be bound to any gamepad button.

## Config Switching

26. **Immediate effect**: Switching presets changes key bindings immediately — old keys stop working, new keys start working.

27. **State cleared on switch**: Activating a new config resets all buttons to unpressed and all axes to 0, regardless of what keys are physically held.

28. **Rapid switching**: Rapid config switching (up to 20 times) must result in the last config being active with no corruption.

29. **Same key, different configs**: The same physical key can map to different buttons in different configs.

## Enable/Disable

30. **Disable clears state**: No stuck buttons or axes after disable.

31. **Keys ignored when disabled**: Key presses have no effect when the extension is disabled (and must not crash).

32. **Multiple cycles**: Multiple rapid enable/disable cycles end in the correct state.

33. **Event counts**: `gamepadconnected` fires exactly once per enable, `gamepaddisconnected` fires exactly once per disable.

## No Phantom Input

34. **Idle state**: When no keys are pressed and the mouse is stationary, all buttons must be unpressed (`pressed: false, value: 0`) and all axes must be at `0`.

35. **After disable/enable**: No phantom input after any number of disable/enable cycles.

36. **After config switch**: No phantom input from the previous config's bindings.

## Input Isolation

37. **Button ↔ axis isolation**: Pressing a button does NOT affect any axis value. Pressing an axis direction does NOT affect any button state.

38. **Cross-axis isolation**: Deflecting one axis does not affect any other axis.

## Timing

39. **Immediate response**: Button/axis state changes must be observable within one animation frame cycle.

40. **Timestamp advances**: The gamepad's `timestamp` property must advance whenever input state changes.

## Validation

41. **Duplicate keys rejected**: A key code bound to multiple fields must not activate multiple buttons — only the first binding is accepted.

42. **Escape forbidden**: The `"Escape"` key must never be bindable.

43. **Invalid configs don't crash**: The extension must survive invalid configs, rapid switching, page reloads, and any combination of enable/disable cycles without crashing.
