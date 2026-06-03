# 07 — Background Service Worker

The background script runs as a Manifest V3 service worker. It has no DOM access. It coordinates config delivery, manages per-tab state, and manages the toolbar action button.

## Per-Tab State

The background maintains an in-memory `Map<tabId, { enabled, activeConfig }>` for each active tab. This state is:

- **Loaded from `chrome.storage.sync`** on tab initialization (`INITIALIZED` message)
- **Independent after init** — changes to global storage do not affect running tabs
- **Modified only by**: hotkey toggles within the tab, popup changes to the active tab, or game-preset auto-switching
- **Cleaned up** on `chrome.tabs.onRemoved`

Global storage (`ENABLED`, `ACTIVE_GP_CONF`) serves as persistent defaults for new tab initialization. The popup writes to global storage for persistence and sends direct messages to update the active tab's state.

## On Install

1. Disable the action button globally (it gets enabled per-tab when a content script loads)
2. On **first install** (`reason === 'install'`): store the default config name as the active preset

## Message Handling

### From Tabs (`sender.tab` exists)

#### INJECTED

- Enable the action button for the sender's tab: `chrome.action.enable(sender.tab.id)`

#### INITIALIZED

1. Update the game name in `chrome.storage.local`
2. Read all config data from `chrome.storage.sync`
3. If a game-preset mapping exists for the detected game, use that preset; otherwise use `ACTIVE_GP_CONF` from storage
4. Store per-tab state: `{ enabled, activeConfig }` for this tabId
5. Update the per-tab icon
6. If the extension is enabled and a valid config exists: respond with `ACTIVATE_GAMEPAD_CONFIG`
7. If the extension is disabled or no valid config: respond with `DISABLE_GAMEPAD`
8. **Return `true`** from the message listener to keep the message channel open for the async response
9. Do **not** write `ACTIVE_GP_CONF` back to global storage

#### GAME_CHANGED

1. Update the game name in `chrome.storage.local`
2. Look up the game-preset mapping; if none exists, do nothing
3. Check the tab's per-tab enabled state; if disabled, do nothing
4. Resolve the preset config from storage
5. Update per-tab `activeConfig`
6. Send `ACTIVATE_GAMEPAD_CONFIG` to the tab
7. Do **not** write `ACTIVE_GP_CONF` to global storage

#### TOGGLE_ENABLED

1. Update per-tab state (`enabled` flag) for this tab
2. Update per-tab icon
3. If enabling: resolve the tab's `activeConfig` from storage and send `ACTIVATE_GAMEPAD_CONFIG`
4. If disabling: send `DISABLE_GAMEPAD`
5. Do **not** write `ENABLED` to global storage (per-tab toggles are local to the tab)

### From Popup (`!sender.tab`)

#### TAB_STATE_CHANGED

When the popup changes a tab's config or enabled state, it notifies the background to keep per-tab state in sync:

1. Update (or create) per-tab state for the specified tabId
2. Update per-tab icon

## Action Button Management

- `chrome.action.disable()` — disable globally (no tab ID)
- `chrome.action.enable(tabId)` — enable for a specific tab
- `chrome.action.setIcon({ path, tabId })` — set icon per-tab based on enabled state
