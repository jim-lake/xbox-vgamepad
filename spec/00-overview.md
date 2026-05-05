# Keyboard & Mouse for xCloud — Reimplementation Spec

## Document Index

| File                        | Contents                                                           |
| --------------------------- | ------------------------------------------------------------------ |
| `00-overview.md`            | This file — project overview and architecture                      |
| `01-manifest.md`            | Chrome extension manifest and permissions                          |
| `02-gamepad-simulator.md`   | Virtual gamepad creation and navigator.getGamepads() patching      |
| `03-input-processing.md`    | Keyboard/mouse capture and translation to gamepad state            |
| `04-config-format.md`       | GamepadConfig JSON schema, validation, and defaults                |
| `05-game-detection.md`      | Injected script lifecycle, game detection, message flow            |
| `06-content-script.md`      | Content script bridge and injection mechanics                      |
| `07-background.md`          | Background service worker responsibilities                         |
| `08-popup-ui.md`            | Popup UI features, state management, chrome.storage                |
| `09-injected-ui.md`         | In-page UI elements (toast, pointer lock overlay)                  |
| `10-behavioral-contract.md` | Observable behavioral requirements the implementation must satisfy |

Also reference `../JSON.md` for the authoritative JSON config format specification.

## What This Extension Does

A Chrome Extension (Manifest V3) that lets users play Xbox Cloud Gaming (xCloud) with keyboard and mouse. xCloud only accepts gamepad input, so the extension creates a **virtual Xbox 360 controller** in the browser by monkey-patching `navigator.getGamepads()`. It intercepts keyboard presses and mouse movement and translates them into fake gamepad button presses and analog stick movements.

## Architecture

Four runtime contexts communicate via message passing:

```
┌──────────────┐    chrome.runtime     ┌─────────────────┐   window.postMessage   ┌──────────────────┐
│  Background  │ ◄──────────────────► │  Content Script  │ ◄──────────────────── │  Injected Script │
│  (service    │    .sendMessage /     │  (isolated world)│    (bidirectional)     │  (page context)  │
│   worker)    │    .onMessage         │                  │                        │                  │
└──────────────┘                       └─────────────────┘                        └──────────────────┘
       ▲                                                                                  │
       │ chrome.storage.sync                                                              │
       ▼                                                                                  ▼
┌──────────────┐                                                                 ┌──────────────────┐
│  Popup UI    │                                                                 │  Gamepad          │
│              │                                                                 │  Simulator        │
└──────────────┘                                                                 └──────────────────┘
```

- **Background service worker**: Central coordinator. Reads config from storage, delivers it to the page on game start.
- **Content script**: Bridge between extension APIs and page context. Injects the page script into the page's JS context. Relays messages.
- **Injected script**: Runs in the page's JS context. Patches `navigator.getGamepads()`, detects game start/stop, captures input, drives the virtual gamepad. Must be a single file (no code splitting) since it is loaded via a `<script>` tag.
- **Popup UI**: Manages config presets, toggling enable/disable, binding keys.

### Build Constraints

- The **background** and **injected** bundles must each be single files (no chunk splitting) — service workers cannot load split chunks, and injected scripts are loaded via `<script src>` tags.
