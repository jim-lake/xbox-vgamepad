# KIRO.md — AI Agent Instructions

## Project Summary

Chrome Extension (Manifest V3) that lets users play Xbox Cloud Gaming (xCloud) with keyboard and mouse. It creates up to 4 virtual Xbox 360 controllers by monkey-patching `navigator.getGamepads()` and translates keyboard/mouse input into gamepad button presses and analog stick movements.

## After Any Code Change

Always run these commands to verify changes:

```bash
npm run ts:check   # TypeScript type checking
npm run lint       # ESLint with auto-fix
npm run test:unit  # Unit tests (fast, no browser)
npm test           # Builds extension (test mode) and runs Puppeteer integration tests
```

All four must pass before considering a change complete.

## Architecture

Four runtime contexts communicate via message passing:

- **Background service worker** (`src/background/service-worker.ts`): Central coordinator, reads config from storage, delivers to page on game start. Must be a single-file bundle.
- **Content script** (`src/content/index.ts`): Bridge between extension APIs and page context. Relays messages between the page and background.
- **Main-world script** (`src/injected/main-world.ts`): Declared in manifest with `"world": "MAIN"`, Chrome injects it directly into the page JS context. Patches `navigator.getGamepads()`, detects game start/stop, captures input, drives virtual gamepads.
- **Popup UI** (`src/popup/`): React app for managing config presets, toggling enable/disable, binding keys.

## Tech Stack

- **Language**: TypeScript (strict mode, ES2023 target)
- **UI**: React 19 with Aphrodite for styling (custom base_components layer mimicking React Native API), plus CSS modules for base styles
- **Build**: Vite 8 + `@crxjs/vite-plugin` for Chrome extension bundling
- **Linting**: ESLint with `typescript-eslint` (strict type-checked), `eslint-plugin-import-x`, `eslint-plugin-react-hooks`
- **Formatting**: Prettier (single quotes, trailing commas es5, tab width 2)
- **Testing**: Custom Puppeteer-based integration test harness (not Jest/Vitest)
- **CI**: GitHub Actions release workflow

## Key Commands

| Task       | Command             | Notes                                                          |
| ---------- | ------------------- | -------------------------------------------------------------- |
| Dev server | `npm run dev`       | Outputs to `build/`, includes HMR                              |
| Build      | `npm run build`     | Type-checks then builds production to `dist/`                  |
| Type check | `npm run ts:check`  | `tsc -b --noEmit`                                              |
| Lint + fix | `npm run lint`      | `eslint . --fix`                                               |
| Format     | `npm run pretty`    | `prettier --write .`                                           |
| Run tests  | `npm test`          | Builds to `build-test/` (test mode) then runs Puppeteer suites |
| Unit tests | `npm run test:unit` | Fast unit tests (no browser, no build) in `test/unit/`         |

## Build Modes

| Mode          | Output Dir    | Trigger                             |
| ------------- | ------------- | ----------------------------------- |
| `development` | `build/`      | `npm run dev`                       |
| `test`        | `build-test/` | `npm test` (vite build --mode test) |
| `production`  | `dist/`       | `npm run build`                     |

The test mode patches the manifest to include `http://127.0.0.1:9444/*` in content script matches and web_accessible_resources so the test harness page can interact with the extension.

## Important Conventions

- Path alias: `@/` maps to `src/`
- Use `type` imports for type-only imports (`@typescript-eslint/consistent-type-imports`)
- No `any` — use proper types
- Prefer `const`, no `var`
- Always use curly braces for control flow
- Use strict equality (`===`)
- Unused vars prefixed with `_` are allowed
- No console.log in production code (use `src/tools/log.ts` utilities)
- The `tsconfig.app.json` enables `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, and `noPropertyAccessFromIndexSignature` — be precise with optional types and index access

## Specifications

The `spec/` directory contains the authoritative design specs (00–10). `JSON.md` at the project root defines the gamepad configuration JSON format. These are the source of truth for behavior — always consult them before implementing features.

Key behavioral requirements:

- Up to 4 virtual gamepads (slots 0–3); each `GamepadAction` targets a specific slot via `gamepadIndex`
- Virtual gamepad ID: `"Xbox 360 Controller (XInput STANDARD GAMEPAD)"`
- 17 buttons, 4 axes (standard mapping)
- `gamepadconnected`/`gamepaddisconnected` events must fire on virtual pad enable/disable
- Opposing axis keys cancel to 0
- Escape key must never be bound
- Max 25 config presets
- Physical gamepad coexistence: `separate` mode renumbers physical pads away from virtual slots; `combine` mode merges physical input into virtual slots
- A key code may map to multiple actions via an array value; multiple keys may map to the same action via separate entries

## Testing

Tests are Puppeteer-based integration tests in `test/`. They:

1. Build the extension in test mode (`build-test/`) via `vite build --mode test`
2. Start a local HTTP server on port 9444 serving `test/gamepad-exerciser.html`
3. Launch Chromium with the extension loaded from `build-test/`
4. Exercise the gamepad API via keyboard simulation

Test suites are in `test/suites/` (32 suite files). The harness (`test/harness.cjs`) provides `assert`, `expect`, and `releaseAll` helpers. Helper utilities are in `test/helpers.cjs`.

To run tests: `npm test`

To run the manual test server: `node test/manual-server.cjs`

### Unit Tests

Fast, browser-free tests for pure logic (config conversion, round-trips, etc.) in `test/unit/*.test.ts`. Run with `npm run test:unit`. Uses Node's built-in `node:test` runner via `tsx`. The setup file (`test/unit/setup.mjs`) stubs `navigator.userAgent` and registers a loader that replaces `popup/storage` and `popup/messaging` with empty stubs so tests run without Chrome APIs.

## Build Constraints

- Background service worker bundled as single file
- Main-world script is declared in manifest with `"world": "MAIN"` and `"run_at": "document_start"` — Chrome injects it natively, no manual injection needed
- The main-world entry point must NOT be named `index.ts` (crxjs/rolldown basename collision with content script)
- Source maps enabled for all build modes

## File Structure

```
src/
  background/    — Service worker (service-worker.ts)
  content/       — Content script (message bridge)
  injected/      — Main-world script (gamepad patch, input, detection)
  popup/         — React popup UI
  components/    — Shared UI components (base_components, buttons)
  tools/         — Utilities (log, busy)
  types/         — Global type declarations and shared types
  css/           — Shared stylesheets (base_components.css, colors.css)
  assets/img/    — Extension icons
spec/            — Design specifications (00-10)
test/            — Integration tests (Puppeteer)
  suites/        — Individual test suite files
  harness.cjs    — Test runner, assert/expect helpers
  helpers.cjs    — Server, browser launch, page utilities
scripts/         — Build scripts (version increment)
```
