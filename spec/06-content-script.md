# 06 — Content Script (Message Bridge)

The content script runs in Chrome's **isolated world** on matched pages. It cannot access page JavaScript globals, but it can manipulate the DOM and use Chrome extension APIs. Its sole purpose is to bridge the extension and the page context.

## Injection (at document_start)

### Immediate (before DOM is ready)
1. Inject the page-context script into the page so it runs before any page JavaScript. This is necessary so `navigator.getGamepads()` is patched in time.
   - The script must be appended to `document.documentElement` since `<head>` and `<body>` don't exist yet at `document_start`.

### On DOMContentLoaded
1. Inject the extension's CSS into the page
2. Make extension resource URLs (images) available to the injected script. Since the injected script runs in page context and cannot call `chrome.runtime.getURL()`, the content script must pass these URLs through the DOM (e.g. via a meta tag or data attribute).

## Message Relay

### Page → Background
1. Listen on `window` for `postMessage` events from the injected script
2. Verify the extension is still alive before forwarding (handles extension reload/uninstall gracefully)
3. For `INITIALIZED` messages: use `chrome.runtime.sendMessage(msg, callback)` — the callback receives the background's response and forwards it back to the page via `window.postMessage`
4. For all other messages: use `chrome.runtime.sendMessage(msg)` with **no callback** (avoids "message port closed" errors for fire-and-forget messages)

### Background/Popup → Page
1. `chrome.runtime.onMessage.addListener` receives messages
2. **Filter**: only process messages where `!sender.tab` (from background/popup, not from other content scripts or tabs)
3. Forward to the page via `window.postMessage`

### Initial Notification
On load, immediately send an `INJECTED` message to the background via `chrome.runtime.sendMessage()`. This tells the background to enable the toolbar action button for this tab.
