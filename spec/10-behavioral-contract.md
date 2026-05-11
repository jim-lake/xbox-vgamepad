# 10 — Behavioral Contract

These are the observable behaviors any conforming implementation must exhibit. They are verified by the integration test suite.

## Gamepad Lifecycle

1. **Virtual pads appear on activation**: When the extension is enabled and a game page is detected, `navigator.getGamepads()` must return a virtual gamepad at each configured slot, and a `gamepadconnected` event must fire for each.

2. **Virtual pads disappear on deactivation**: When the extension is disabled or the game exits, all virtual pads must disconnect and a `gamepaddisconnected` event must fire for each. Those slots must return `null` in `getGamepads()`.

3. **No slot collision** (`separate` mode only): A virtual pad and a physical pad must never occupy the same slot in the `getGamepads()` result. In `combine` mode, a virtual slot intentionally merges with a physical pad at the same index.

4. **Clean reconnection**: On re-enable, virtual pads reconnect with correct identity and shape. Keyboard/mouse state starts at zero (no phantom input from prior session).

## Button Behavior

5. **Key press → button press**: When a key bound to a button action is pressed, `buttons[buttonIndex]` on the target virtual pad must immediately reflect `pressed: true, value: 1`.

6. **Key release → button release**: When the key is released, the button must return to `pressed: false, value: 0`.

7. **Exact values**: Button `value` is exactly `0` or `1`.

8. **Touched property**: `touched` is `false` for all idle buttons. Resets to `false` after release.

9. **Simultaneous buttons**: Multiple buttons across any virtual pads can be active at the same time without interference.

10. **All 17 buttons simultaneously**: All 17 buttons on a virtual pad can be pressed at once and must all register correctly.

## Axis Behavior

11. **Key press → axis deflection**: When a key bound to an axis direction is pressed, the corresponding axis on the target virtual pad must deflect to exactly `-1` or `+1`.

12. **Key release → axis center**: When the key is released, the axis must return to exactly `0` (unless the opposing direction is still held).

13. **Opposing axes cancel**: If both opposing direction keys on the same axis are held simultaneously, the axis value must be exactly `0`.

14. **Release with opposing held**: If both opposing keys are held and one is released, the axis must snap to the remaining key's direction value.

15. **All 4 axes independent**: Deflecting one axis does not affect others.

16. **Diagonal movement**: Both X and Y of the same stick can be deflected simultaneously.

17. **Axis values clamped**: Axis values never exceed the `[-1, +1]` range.

## Multi-Slot Behavior

18. **Actions target correct slot**: A `GamepadAction` with `gamepadIndex: 1` affects only the virtual pad at slot 1, not slot 0.

19. **One key, multiple slots**: A key whose `ActionMap` contains actions for multiple `gamepadIndex` values activates all of them simultaneously.

20. **Independent slot state**: Input on one virtual pad slot does not affect the state of any other virtual pad slot.

## Mouse Input

21. **Mouse targets correct slot and stick**: Mouse movement drives the stick and `gamepadIndex` specified in `mouseControls[0]`.

22. **Empty mouseControls**: When `mouseControls` is empty, mouse movement produces no stick deflection.

23. **Sensitivity scaling**: Higher `sensitivity` value means less deflection for the same mouse movement (it's a divisor).

24. **Mouse auto-reset**: When the mouse stops moving, the target stick returns to center `(0, 0)` after ~50ms.

25. **Click/RightClick/Scroll**: Virtual mouse codes work as button bindings on any target `gamepadIndex`.

## Config Switching

26. **Immediate effect**: Switching presets changes key bindings immediately — old keys stop working, new keys start working.

27. **Minimal pad churn on switch**: Virtual pads that exist in both old and new configs are not disconnected and reconnected — their state is reset but they remain connected. Only pads added or removed fire connect/disconnect events.

28. **Rapid switching**: Rapid config switching must result in the last config being active with no corruption.

## Physical Gamepad Handling — Separate Mode

29. **Physical pads passed through**: In `separate` mode, physical pads appear in `getGamepads()` at their assigned slots.

30. **No slot conflict**: Physical pads are renumbered away from virtual slots. A physical pad never appears at a virtual slot.

31. **Stable slots**: A physical pad keeps its assigned slot across config changes as long as that slot remains free.

32. **Renumber on conflict**: When a config change causes a physical pad's slot to become a virtual slot, the pad fires `gamepaddisconnected` for the old slot and `gamepadconnected` for the new slot. If no free slot exists, the pad is not exposed.

33. **Physical connect fires**: When a physical pad connects, `gamepadconnected` fires with its assigned (possibly renumbered) slot.

34. **Physical disconnect fires**: When a physical pad disconnects, `gamepaddisconnected` fires with its previously assigned slot.

35. **Minimal events on config change**: Physical pads whose slots are unaffected by a config change receive no connect/disconnect events.

## Physical Gamepad Handling — Combine Mode

36. **Virtual slots merge physical input**: In `combine` mode, `getGamepads()` at a virtual slot returns the union of the virtual pad's keyboard/mouse state and the physical pad at that same slot index, if one exists (button OR'd; axis uses virtual value if non-zero, else physical value).

37. **Non-virtual slots unmodified**: Physical pads at non-virtual slots are returned exactly as the browser reports them, with no renumbering or modification.

38. **Physical events at non-virtual slots pass through**: `gamepadconnected` / `gamepaddisconnected` for physical pads at non-virtual slots are not intercepted.

39. **Physical events at virtual slots suppressed**: Physical pads that would appear at a virtual slot do not generate separate connect/disconnect events to the page.

## Enable/Disable

40. **Disable clears state**: No stuck buttons or axes after disable.

41. **Keys ignored when disabled**: Key presses have no effect when the extension is disabled.

42. **Multiple cycles**: Multiple rapid enable/disable cycles end in the correct state.

43. **Event counts**: `gamepadconnected` fires exactly once per virtual pad per enable. `gamepaddisconnected` fires exactly once per virtual pad per disable.

## No Phantom Input

44. **Idle state**: When no keys are pressed and the mouse is stationary, all virtual pad buttons must be unpressed and all axes at `0`.

45. **After disable/enable**: No phantom input after any number of disable/enable cycles.

46. **After config switch**: No phantom input from the previous config's bindings.

## Timing

47. **Immediate response**: Button/axis state changes must be observable within one animation frame cycle.

48. **Timestamp advances**: The gamepad's `timestamp` property must advance whenever input state changes.

## Validation

49. **Escape forbidden**: The `"Escape"` key must never be bindable.

50. **Invalid configs don't crash**: The extension must survive invalid configs, rapid switching, page reloads, and any combination of enable/disable cycles without crashing.
