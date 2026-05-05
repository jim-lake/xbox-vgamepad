# 09 — In-Page UI Elements

These UI elements are injected into the xCloud page itself (not the popup).

## Toast Notification

A notification that appears on the page when presets are activated/deactivated.

### Behavior
1. Created lazily on first use (singleton — reused for subsequent toasts)
2. Displays a keyboard icon and a message
3. Auto-dismisses after **3 seconds** (fade in ~0.5s, visible ~2.5s, fade out ~0.5s)
4. If a new toast fires while one is showing, the previous is replaced

### Messages Shown
- `"'{presetName}' preset activated"` — when a config is activated
- `"Mouse/keyboard disabled"` — when the extension is disabled (only shown if currently enabled)

## Click-to-Enable Mouse Overlay

An overlay that appears when mouse control is configured but pointer lock hasn't been acquired yet.

### Behavior
1. Created when mouse movement listening starts
2. Displayed within the game UI container
3. Clicking the overlay requests pointer lock
4. On successful pointer lock: overlay is removed
5. On pointer lock loss: overlay reappears
6. On pointer lock error: text changes to indicate the user should click again

### Minimize
- The overlay can be minimized to a small indicator in the corner of the screen
- Clicking the minimized indicator restores the full overlay
