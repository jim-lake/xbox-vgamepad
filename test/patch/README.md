# Co-op Patch Integration Test

## Prerequisites

- **Chrome For Testing** installed (or set `CHROME_PATH` env var)
- A persistent Chrome profile with valid Xbox authentication cookies

## Initial Auth Setup

Before first run, launch Chrome with the test profile and log into xbox.com:

```bash
npm run test:patch:setup
```

Or manually:

```bash
"/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" \
  --user-data-dir=test/patch/profile \
  --no-first-run \
  --no-default-browser-check \
  https://www.xbox.com/en-US/play
```

Log into your Xbox account, then close the browser. The cookies persist in `test/patch/profile/` for subsequent automated runs.

## Running the Test

```bash
npm run test:patch
```

This will:
1. Build the extension in test mode (`build-test/`)
2. Launch Chrome with the pre-authed profile and extension loaded
3. Navigate to xbox.com/play
4. Wait for a game stream to start (you may need to manually click a game)
5. Activate a virtual gamepad at index 1
6. Assert that `[COOP-PATCH]` console logs confirm interception at index 1

## What It Validates

- The `Object.defineProperty` trap fires when xCloud's `lt` class is constructed
- `onGamepadChanged` is patched on the prototype
- Gamepad connect at index 1 routes through the patched function (not hardcoded to 0)
- Gamepad disconnect at index 1 routes correctly

## Troubleshooting

- If the test times out waiting for `#game-stream`, ensure you're logged in and manually start a game
- Check the console output for `[COOP-PATCH]` logs to see where the patch lifecycle stopped
- The `profile/` directory is gitignored — don't commit it
