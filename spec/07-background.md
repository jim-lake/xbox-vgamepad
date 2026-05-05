# 07 — Background Service Worker

The background script runs as a Manifest V3 service worker. It has no DOM access. It coordinates config delivery and manages the toolbar action button.

## On Install

1. Disable the action button globally (it gets enabled per-tab when a content script loads)
2. On **first install** (`reason === 'install'`): store the default config name as the active preset

## Message Handling

Only process messages from tabs (`sender.tab` must exist). Ignore messages from popup or other extension pages.

### INJECTED

- Enable the action button for the sender's tab: `chrome.action.enable(sender.tab.id)`

### INITIALIZED

1. Update the game name in `chrome.storage.local`
2. Read all config data from `chrome.storage.sync`
3. Look up the active config preset
4. If the extension is enabled and a valid config exists: respond with `ACTIVATE_GAMEPAD_CONFIG` message containing the config name and config object
5. If the extension is disabled or no valid config: respond with `DISABLE_GAMEPAD` message
6. **Return `true`** from the message listener to keep the message channel open for the async response

### GAME_CHANGED

- Update the game name in `chrome.storage.local`

## Action Button Management

- `chrome.action.disable()` — disable globally (no tab ID)
- `chrome.action.enable(tabId)` — enable for a specific tab
