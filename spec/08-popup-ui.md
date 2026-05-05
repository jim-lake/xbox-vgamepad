# 08 — Popup UI

The popup is rendered in the extension's toolbar popup. It manages gamepad config presets and communicates with the background/content scripts.

## Chrome Storage Schema

### Sync Storage (synced across devices)

- One key per config preset (keyed by preset name)
- The name of the currently active preset
- Whether the extension is enabled

### Local Storage (per-device)

- Name of the currently detected game

### Storage Normalization

When reading from storage:

- Always include the `"default"` config with the hardcoded default bindings (even if not in storage)
- If the enabled state is undefined, infer it from whether an active preset name exists
- Parse all config preset keys into a configs map

## Features

### Preset Management

- **Create** new presets (with a name)
- **Edit** existing presets (modify key bindings, mouse settings)
- **Delete** presets (cannot delete `"default"`)
- **Import** presets from JSON file (validates the config before accepting)
- **Export** presets as JSON file download
- **Switch** between presets (left/right arrows cycle through them)
- Maximum **25** presets

### Key Binding Editor

- Each of the 25 gamepad inputs (17 buttons + 8 axis directions) has a row in the editor
- Each row shows current bindings and allows adding/removing them
- Maximum **2 bindings** per input
- "Add binding" opens a modal that listens for:
  - `keydown` → captures `event.code` (e.g. `"KeyW"`, `"Space"`)
  - `mousedown` button 0 → captures `"Click"`
  - `mousedown` button 2 → captures `"RightClick"`
  - `wheel` → captures `"Scroll"`
- Pressing **Escape** during listening cancels (does not bind Escape)
- Duplicate codes within the same button are silently ignored

### Mouse Settings

- **Stick selector**: None / Left Stick / Right Stick (maps to `mouseControls`: undefined/0/1)
- **Sensitivity**: Displayed in the UI so that **higher = more sensitive**, but stored internally as a **divisor** (higher stored value = less sensitive). The UI must invert the stored value for display.

### Enable/Disable Toggle

- Toggle in the header enables/disables the virtual gamepad
- When toggled, sends `ACTIVATE_GAMEPAD_CONFIG` or `DISABLE_GAMEPAD` to the active tab
- Stores the enabled state in sync storage

### Header

- Shows the currently detected game name (if any)
- Shows the active preset name
- Toggle switch for enable/disable
- "More options" menu with: About page link, import/export

## Communication with Page

The popup sends messages to the active tab via:

1. `chrome.tabs.query({ active: true, currentWindow: true })` to find the active tab
2. `chrome.tabs.sendMessage(tabId, message)` to send to the content script
3. The content script relays to the page via `window.postMessage`

## State Management

All config changes must be persisted to `chrome.storage.sync` and activating/deactivating a config must send the appropriate message to the active tab.

### Delete Behavior

- Cannot delete the `"default"` preset
- If deleting the currently active preset, activate `"default"` first, then delete

### Modify Behavior

- If modifying the currently active preset, send an `ACTIVATE_GAMEPAD_CONFIG` message with the updated config to the active tab (hot-reload)
