# 02 — Gamepad Simulator

The gamepad simulator maintains fake `Gamepad` objects (one per active virtual slot) and replaces `navigator.getGamepads()` with a version that returns them alongside physical pads according to the active mode.

## Virtual Gamepad Shape

Each fake controller must exactly match this shape:

| Property          | Value                                               |
| ----------------- | --------------------------------------------------- |
| `id`              | `"Xbox 360 Controller (XInput STANDARD GAMEPAD)"`   |
| `index`           | The slot index (0–3) this pad occupies              |
| `mapping`         | `"standard"`                                        |
| `connected`       | `true` when active, `false` when inactive           |
| `buttons.length`  | `17`                                                |
| `axes.length`     | `4`                                                 |
| `hapticActuators` | `[]`                                                |
| `timestamp`       | `performance.now()` — updated on every state change |

### Buttons Array

17 buttons, each: `{ pressed: boolean, touched: boolean, value: number }`

Default (idle) state: `{ pressed: false, touched: false, value: 0 }`

### Axes Array

4 axes: `[leftStickX, leftStickY, rightStickX, rightStickY]`

Default (idle) state: `[0, 0, 0, 0]`

## navigator.getGamepads() Patching

The original `navigator.getGamepads` function must be captured before any page code runs (module load time). The patched version's behavior depends on the active mode — see [Physical Gamepad Handling](#physical-gamepad-handling).

## Virtual Pad Lifecycle

### Enable (per slot)

1. Reset keyboard/mouse state to idle (all buttons unpressed, all axes 0, direction counts cleared)
2. Set `connected = true`; update `timestamp`
3. Dispatch `gamepadconnected` on `window` with a snapshot of this pad at its slot index

In `combine` mode, the keyboard/mouse state starts at zero but the merged output seen by the page immediately reflects any physical pad input at that slot, since merging happens at read time in `getGamepads()`.

### Disable (per slot)

1. Set `connected = false`; update `timestamp`
2. Dispatch `gamepaddisconnected` on `window` with a snapshot of this pad at its slot index
3. Reset keyboard/mouse state to idle

## Button State Management

### Press

Increment the press-count for this button. Set `pressed = true`, `touched = true`, `value = 1`. Update `timestamp`.

### Unpress

Decrement the press-count (minimum 0). If count reaches zero: set `pressed = false`, `touched = false`, `value = 0`. Update `timestamp`.

Press-counts implement the additive press model — a button stays pressed as long as any source holds it.

## Axis State Management

Axes use a **direction-count** system per stick, tracking how many sources are pressing each direction. This handles opposing-axis cancellation and multiple simultaneous bindings correctly.

### Direction Model

Four directions: UP, DOWN, LEFT, RIGHT

- UP/DOWN control the Y axis (position 1 within the stick)
- LEFT/RIGHT control the X axis (position 0 within the stick)
- UP/LEFT produce value `-1`; DOWN/RIGHT produce value `+1`
- Opposites: UP↔DOWN, LEFT↔RIGHT

### Axis Index

```
axisIndex = stick * 2 + position
```

Left stick X=0, Y=1. Right stick X=2, Y=3.

### Direction Press

1. Increment the count for this direction on this stick
2. Recalculate axis: if both this direction and its opposite have count > 0, value = 0; otherwise value = this direction's value
3. Set the axis; update timestamp

### Direction Unpress

1. Decrement the count (minimum 0)
2. Recalculate: if opposite count > 0, value = opposite's value; else value = 0
3. Set the axis; update timestamp

### Direct Axis Move (Mouse)

Directly set both axes for a stick to given x and y values. Used for mouse movement (analog, not digital).

## Physical Gamepad Handling

The simulator intercepts native `gamepadconnected` / `gamepaddisconnected` events in capture phase (before page listeners) to manage physical pad slot assignments. The active mode determines how physical pads are exposed.

### Virtual Slots

The **virtual slots** set is the set of `gamepadIndex` values currently active (slots owned by enabled virtual pads). Updated whenever a config is activated or deactivated.

### `"separate"` mode

`navigator.getGamepads()` returns virtual pads at their configured slots and physical pads at their assigned slots.

**Slot assignment rules for physical pads:**

- Each physical pad is identified by its hardware `id` string and given a stable output slot.
- The assigned slot must not be in the virtual slots set and must not be used by another physical pad.
- Assign the lowest-numbered slot satisfying those constraints.
- If no such slot exists, the pad is not exposed until a slot becomes free.

**On initialization** (virtual slots set established from config):

1. For each currently connected physical pad whose **native browser slot index** conflicts with a virtual slot:
   a. Dispatch `gamepaddisconnected` for the old slot.
   b. Reassign to the lowest free non-virtual slot.
   c. If a slot is available, dispatch `gamepadconnected` for the new slot.
2. Physical pads whose native slots do not conflict are assigned that native slot unchanged — no events fired.

**On physical connect** (native `gamepadconnected`):

1. Suppress the original event.
2. Assign the lowest free non-virtual slot not used by another physical pad.
3. If available, dispatch `gamepadconnected` with the assigned slot index.
4. If no slot is available, do not dispatch — pad is ignored.

**On physical disconnect** (native `gamepaddisconnected`):

1. Suppress the original event.
2. Remove the pad's slot assignment.
3. Dispatch `gamepaddisconnected` with the previously assigned slot index.

**On config change** (virtual slots set changes):

1. For each physical pad whose current slot is now in the new virtual slots set:
   a. Dispatch `gamepaddisconnected` for the old slot.
   b. Reassign to the lowest free non-virtual slot.
   c. If available, dispatch `gamepadconnected` for the new slot.
2. Physical pads whose slots remain free keep their slots — no events fired.

**`getGamepads()` in separate mode:**

- Build a 4-slot result array (`null` everywhere).
- Place each enabled virtual pad's snapshot at its slot index.
- Place each physical pad at its assigned slot (using the stable assignment map; new pads are assigned via the connect interceptor, not here).
- Return the result.

### `"combine"` mode

Virtual slots are owned by virtual pads with physical input merged in. Non-virtual slots pass physical pads through **without modification** — no renumbering, no event interception.

**`getGamepads()` in combine mode:**

- For each **virtual slot**: return a merged gamepad — the virtual pad's keyboard/mouse state unioned with the physical pad at that same slot index from the original `getGamepads()`, if one exists (button pressed if virtual OR physical has it pressed; axis uses virtual value if non-zero, otherwise the physical value).
- For each **non-virtual slot**: return the physical pad exactly as the original `getGamepads()` reports it, unmodified.

**Physical connect/disconnect events in combine mode:**

- Events for physical pads at **non-virtual slots** pass through to the page unchanged.
- Events for physical pads at **virtual slots** are suppressed — the page does not see them as separate devices.

## Critical Invariants

1. **No slot collision** (`separate` mode only): A virtual pad and a physical pad must never occupy the same slot in the `getGamepads()` result. In `combine` mode, a virtual slot intentionally merges with a physical pad at the same index.
2. **Exact values**: Button values are exactly `0` or `1`. Axis values from keyboard are exactly `-1`, `0`, or `+1`.
3. **Timestamp advances**: The timestamp must change whenever any input state changes.
4. **Minimal events**: When a config change does not affect a physical pad's slot, no disconnect/connect events are fired for that pad.
