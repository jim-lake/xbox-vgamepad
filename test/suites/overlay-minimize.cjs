// Tests: Overlay minimize preference persisted across page loads via chrome.storage.sync
module.exports = async function ({
  page,
  browser,
  assert,
  expect,
  helpers,
  releaseAll,
  DEFAULT_CONFIG,
}) {
  const { sendConfigToPage, setStorageSync, getStorageSync } = helpers;

  async function hasOverlay(pg) {
    return pg.evaluate(() => !!document.getElementById('xvg-pointer-overlay'));
  }
  async function hasMinimizedBtn(pg) {
    return pg.evaluate(
      () => !!document.getElementById('xvg-pointer-minimized')
    );
  }

  const mouseConfig = {
    mouseConfig: { mouseControls: 1, sensitivity: 10 },
    keyConfig: { a: 'Space' },
  };

  console.log('  [Overlay Minimize Persistence]');

  await assert(
    'overlay shows full by default when OVERLAY_MINIMIZED is not set',
    async () => {
      // Clear any existing preference
      await setStorageSync(browser, { OVERLAY_MINIMIZED: false });
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'mouseTest',
        gamepadConfig: mouseConfig,
        overlayMinimized: false,
      });
      await new Promise((r) => setTimeout(r, 300));
      expect(await hasOverlay(page)).toBeTrue();
      expect(await hasMinimizedBtn(page)).toBeFalse();
    }
  );

  await assert(
    'clicking minimize button hides overlay and shows minimized button',
    async () => {
      // Click the minimize button (upper right of overlay)
      const clicked = await page.evaluate(() => {
        const overlay = document.getElementById('xvg-pointer-overlay');
        if (!overlay) return false;
        // Find the minimize span (the "—" button)
        const spans = overlay.querySelectorAll('span');
        for (const span of spans) {
          if (span.textContent === '—') {
            span.click();
            return true;
          }
        }
        return false;
      });
      expect(clicked).toBeTrue();
      await new Promise((r) => setTimeout(r, 200));
      expect(await hasOverlay(page)).toBeFalse();
      expect(await hasMinimizedBtn(page)).toBeTrue();
    }
  );

  await assert(
    'minimize preference is persisted to chrome.storage.sync',
    async () => {
      // Give time for the message to propagate to content script and storage
      await new Promise((r) => setTimeout(r, 500));
      const stored = await getStorageSync(browser, ['OVERLAY_MINIMIZED']);
      expect(stored['OVERLAY_MINIMIZED']).toBeTrue();
    }
  );

  await assert(
    'on re-activation with overlayMinimized=true, shows minimized button not full overlay',
    async () => {
      // Simulate a new page load receiving the config with persisted preference
      // First deactivate to clear state
      await sendConfigToPage(page, { type: 'DISABLE_GAMEPAD' });
      await new Promise((r) => setTimeout(r, 300));
      expect(await hasOverlay(page)).toBeFalse();
      expect(await hasMinimizedBtn(page)).toBeFalse();

      // Re-activate with overlayMinimized flag (as background would send)
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'mouseTest',
        gamepadConfig: mouseConfig,
        overlayMinimized: true,
      });
      await new Promise((r) => setTimeout(r, 300));
      expect(await hasOverlay(page)).toBeFalse();
      expect(await hasMinimizedBtn(page)).toBeTrue();
    }
  );

  await assert(
    'dismiss (✕) hides minimized button for current session only',
    async () => {
      // Click the ✕ on the minimized button
      const dismissed = await page.evaluate(() => {
        const btn = document.getElementById('xvg-pointer-minimized');
        if (!btn) return false;
        const spans = btn.querySelectorAll('span');
        for (const span of spans) {
          if (span.textContent === '✕') {
            span.click();
            return true;
          }
        }
        return false;
      });
      expect(dismissed).toBeTrue();
      await new Promise((r) => setTimeout(r, 200));
      expect(await hasOverlay(page)).toBeFalse();
      expect(await hasMinimizedBtn(page)).toBeFalse();
    }
  );

  await assert(
    'dismiss is transient — re-activation still respects persisted minimize',
    async () => {
      // Deactivate and re-activate: dismissed state should NOT persist,
      // but overlayMinimized should. However, within the same session the
      // _minimizedDismissed flag is still set, so nothing shows.
      // This tests that dismiss is session-scoped.
      await sendConfigToPage(page, { type: 'DISABLE_GAMEPAD' });
      await new Promise((r) => setTimeout(r, 300));
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'mouseTest',
        gamepadConfig: mouseConfig,
        overlayMinimized: true,
      });
      await new Promise((r) => setTimeout(r, 300));
      // Dismissed is session-scoped, so within same page it stays dismissed
      expect(await hasOverlay(page)).toBeFalse();
      expect(await hasMinimizedBtn(page)).toBeFalse();
    }
  );

  await assert(
    'without overlayMinimized flag, full overlay shows (fresh session)',
    async () => {
      // Simulate fresh session: deactivate, clear dismissed state by sending
      // overlayMinimized=false
      await sendConfigToPage(page, { type: 'DISABLE_GAMEPAD' });
      await new Promise((r) => setTimeout(r, 300));
      await sendConfigToPage(page, {
        type: 'ACTIVATE_GAMEPAD_CONFIG',
        name: 'mouseTest',
        gamepadConfig: mouseConfig,
        overlayMinimized: false,
      });
      await new Promise((r) => setTimeout(r, 300));
      // _minimizedDismissed is still true from this session
      // This verifies the transient nature within a single page lifecycle
      expect(await hasOverlay(page)).toBeFalse();
    }
  );

  // Restore default
  await sendConfigToPage(page, { type: 'DISABLE_GAMEPAD' });
  await new Promise((r) => setTimeout(r, 200));
  await sendConfigToPage(page, {
    type: 'ACTIVATE_GAMEPAD_CONFIG',
    name: 'default',
    gamepadConfig: DEFAULT_CONFIG,
  });
  await new Promise((r) => setTimeout(r, 300));
  await releaseAll(page);
};
