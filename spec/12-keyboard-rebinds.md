# 12 — Keyboard Rebinds

Keyboard rebinds allow a physical key press to be transparently remapped to one or more different key codes before any other processing (gamepad input mapping, scripts, etc.) occurs. This enables users to rearrange their physical keyboard layout without editing per-action bindings.

## Data Model

### Storage Format (`GamepadConfig.keyboardRebinds`)

An optional array of `KeyboardRebind` objects:

```ts
interface KeyboardRebind {
  from: string;   // KeyboardEvent.code of the physical key to intercept
  to: string[];   // KeyboardEvent.codes to synthesize in its place
}
```

- `from`: The physical key code to intercept (e.g. `"KeyZ"`, `"Space"`).
- `to`: One or more key codes to emit as synthetic events. May include the same code as `from` (the key "also" fires itself).

Example:

```json
{
  "keyboardRebinds": [
    { "from": "KeyZ", "to": ["Space"] },
    { "from": "Space", "to": ["Space", "KeyU"] }
  ]
}
```

### Popup Model (`PopupConfig.keyboardRemaps`)

The popup UI uses an inverted representation — a `Map<string, string[]>` where each key is a **target** code and the value is the list of **source** (physical) codes that produce it. Conversion functions transform between the two representations:

- `rebindsToRemaps`: Config → Popup (invert `from→to[]` into `target→sources[]`)
- `remapsToRebinds`: Popup → Config (invert `target→sources[]` back into `from→to[]`)

## Validation Rules

Implemented in `validateRebinds()`:

1. Must be an array (or absent/undefined, which defaults to `[]`).
2. Each entry must have a `from` field of type `string` and a `to` field of type `string[]`.
3. All elements in `to` must be strings.
4. No duplicate `from` values (each physical key may only appear as `from` once). Empty-string `from` entries are excluded from the duplicate check.
5. Empty `to` arrays are valid (the rebind has no effect at runtime).
6. `"Escape"` is permitted as both `from` and `to` (unlike `keyboardConfig`, rebinds have no Escape restriction).

## Runtime Behavior

Implemented in `src/injected/keyboard-rebind.ts`. Installed and removed as part of config activation/deactivation in `main-world.ts`.

### Installation

On `ACTIVATE_GAMEPAD_CONFIG` or `CONFIG_CHANGED`:

1. Clear existing rebind state (map and held-key tracking).
2. Populate the internal `rebindMap: Map<string, string[]>` from the `keyboardRebinds` array, skipping entries where `from` is empty or `to` is empty.
3. Attach `keydown` and `keyup` listeners on `window` in the **capture phase** (ensures rebinds fire before any other listeners).

### Removal

On `DISABLE_GAMEPAD`:

1. Remove `keydown`/`keyup` listeners from `window`.
2. Clear the rebind map and held-key set.

### Event Interception

#### keydown

1. If the event was dispatched by the rebind system itself (`dispatching` flag), ignore it.
2. Look up `event.code` in the rebind map.
3. If not found, let the event propagate normally.
4. If found:
   - Call `event.stopImmediatePropagation()` — suppress the original event entirely.
   - Call `event.preventDefault()`.
   - Record the key in `heldKeys`.
   - For each target code in the map entry, dispatch a new `KeyboardEvent('keydown', ...)` on `event.target` (or `document` if target is null) with:
     - `code`: the target code
     - `key`: derived from the code (letter keys lowercase, digits, or the code itself)
     - `bubbles: true`, `cancelable: true`, `composed: true`
     - Modifier keys (`ctrlKey`, `shiftKey`, `altKey`, `metaKey`) preserved from the original event
     - `repeat` preserved from the original event

#### keyup

1. If the event was dispatched by the rebind system itself, ignore it.
2. If the key is not in `heldKeys`, let it propagate (was never intercepted on down).
3. Look up `event.code` in the rebind map.
4. If found:
   - `stopImmediatePropagation()` + `preventDefault()`.
   - Remove from `heldKeys`.
   - Dispatch synthetic `keyup` events for each target code with `repeat: false`.

### Key Derivation (`codeToKey`)

Converts a `KeyboardEvent.code` to the corresponding `key` value for synthetic events:

| Code pattern    | Resulting `key`           |
| --------------- | ------------------------- |
| `Key<X>`        | Lowercase letter (`x`)    |
| `Digit<N>`      | The digit (`N`)           |
| `Space`         | `" "` (space character)   |
| `Enter`         | `"Enter"`                 |
| `Tab`           | `"Tab"`                   |
| `Escape`        | `"Escape"`                |
| `Backspace`     | `"Backspace"`             |
| Other           | The code string unchanged |

## Lifecycle

```
ACTIVATE_GAMEPAD_CONFIG → installRebinds(config.keyboardRebinds ?? [])
CONFIG_CHANGED          → installRebinds(config.keyboardRebinds ?? [])  (hot-swap)
DISABLE_GAMEPAD         → removeRebinds()
```

Rebinds are installed **before** the input processor starts handling keyboard events, so synthetic events produced by the rebind layer are seen by the input processor as normal key presses.

## Interaction with Input Processing

The rebind layer is transparent to the input processor (spec 03). The input processor sees only the synthetic events (with the remapped `code` values) and processes them through the normal `keyboardConfig` lookup. The original physical key code never reaches the input processor when a rebind is active.

## Popup UI

The "Keyboard Rebinds" section in the popup allows users to:

1. **Add a target key** — press "Add Target", then press the desired target key code.
2. **Add source keys to a target** — click "+" on a target row, then press the physical key to map.
3. **Remove a source key** — click the × on a source badge.
4. **Remove an entire target** — click the delete button on the target row.

Duplicate targets are silently rejected (if a target already exists, the add-target operation is a no-op).
