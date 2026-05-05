# 01 — Chrome Extension Manifest

## Manifest V3

### Content Script Timing

The content script must run at `document_start` — before the page's own scripts execute. This is critical because the injected script must patch `navigator.getGamepads()` before xCloud's JavaScript first calls it.

### URL Matching

- **Content script** matches: `*://*.xbox.com/*` (http and https, all subdomains) and `https://gamepad-tester.com/`
- **Web accessible resources** matches: `https://www.xbox.com/*` and `https://gamepad-tester.com/*`
- The extension also works on `gamepad-tester.com` for testing/debugging purposes

### Permissions

Only `storage` is required (for `chrome.storage.sync` to persist config presets across devices).

### Action Button

The toolbar action button should be **disabled by default** and only enabled when the content script reports it has loaded on a matching page via `chrome.action.enable(tabId)` / `chrome.action.disable(tabId)`.

### Web Accessible Resources

These resources must be accessible from the page context:

- The injected page-context script
- Images used in toast notifications (keyboard icon, xbox logo)
- Styles for in-page UI elements (toast, pointer lock overlay)
