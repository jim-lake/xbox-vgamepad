# KIRO.md — AI Agent Instructions

## Project Summary

Chrome Extension (Manifest V3) that lets users play Xbox Cloud Gaming (xCloud) with keyboard and mouse. It creates a virtual Xbox 360 controller by monkey-patching `navigator.getGamepads()` and translates keyboard/mouse input into gamepad button presses and analog stick movements.

## Architecture

Four runtime contexts communicate via message passing:

- **Background service worker** (`src/background/index.ts`): Central coordinator, reads config from storage, delivers to page on game start. Must be a single-file bundle.
- **Content script** (`src/content/index.ts`): Bridge between extension APIs and page context. Injects the page script, relays messages.
- **Injected script**: Runs in page JS context. Patches `navigator.getGamepads()`, detects game start/stop, captures input, drives virtual gamepad. Must be a single-file bundle (no code splitting).
- **Popup UI** (`src/popup/`): React app for managing config presets, toggling enable/disable, binding keys.

## Tech Stack

- **Language**: TypeScript (strict mode, ES2023 target)
- **UI**: React 19 with Aphrodite for styling (custom base_components layer mimicking React Native API)
- **Build**: Vite 8 + `@crxjs/vite-plugin` for Chrome extension bundling
- **Linting**: ESLint with `typescript-eslint` (strict type-checked), `eslint-plugin-import-x`, `eslint-plugin-react-hooks`
- **Formatting**: Prettier (single quotes, trailing commas es5, tab width 2)
- **Testing**: Custom Puppeteer-based integration test harness (not Jest/Vitest)
- **CI**: GitHub Actions release workflow

## Key Commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Type check | `npm run ts:check` |
| Lint + fix | `npm run lint` |
| Format | `npm run pretty` |
| Run tests | `node test/gamepad.test.js` (requires built extension in `dist/` and Chromium) |

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
- Virtual gamepad ID: `"Xbox 360 Controller (XInput STANDARD GAMEPAD)"`
- 17 buttons, 4 axes (standard mapping)
- `gamepadconnected`/`gamepaddisconnected` events must fire
- Opposing axis keys cancel to 0
- Escape key must never be bound
- Max 25 config presets, max 2 alternate bindings per button

## Testing

Tests are Puppeteer-based integration tests in `test/`. They:
1. Build the extension (`dist/`)
2. Start a local HTTP server serving `test/gamepad-exerciser.html`
3. Patch the built manifest to include the test server URL
4. Launch Chromium with the extension loaded
5. Exercise the gamepad API via keyboard simulation

Test suites are in `test/suites/`. The harness (`test/harness.js`) provides `assert`, `expect`, and `releaseAll` helpers.

## Build Constraints

- Background and injected script bundles must be single files (no chunk splitting)
- Dev build outputs to `build/`, production to `dist/`
- Source maps enabled for both

## File Structure

```
src/
  background/    — Service worker
  content/       — Content script bridge
  popup/         — React popup UI
  components/    — Shared UI components (base_components, buttons)
  tools/         — Utilities (log, busy)
  types/         — Global type declarations
  css/           — Shared stylesheets
  assets/img/    — Extension icons
spec/            — Design specifications (00-10)
test/            — Integration tests (Puppeteer)
scripts/         — Build scripts (version increment)
```
