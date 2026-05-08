// Tests: All default config button bindings, derived from test/default_config.cjs.
const {
  DEFAULT_CONFIG,
  ACTION_BUTTON_INDEX,
  CODE_TO_PUPPETEER_KEY,
} = require('../default_config.cjs');

module.exports = async function ({ page, assert, expect, helpers }) {
  const { getButtonStates, waitForButton } = helpers;

  console.log('  [Default Config - All Button Bindings]');

  for (const [code, action] of Object.entries(DEFAULT_CONFIG.keyboardConfig)) {
    const actions = Array.isArray(action) ? action : [action];
    for (const act of actions) {
      const index = ACTION_BUTTON_INDEX[act];
      if (index === undefined) continue;
      const key = CODE_TO_PUPPETEER_KEY[code];
      if (!key) continue;
      await assert(`${code} (${key}) → ${act} → button[${index}]`, async () => {
        await page.keyboard.down(key);
        await waitForButton(page, index, true);
        expect((await getButtonStates(page))[index]).toBeTrue();
        await page.keyboard.up(key);
        await waitForButton(page, index, false);
      });
    }
  }

  console.log('  [Default Config - Mouse Button Bindings]');

  await page.mouse.move(200, 200);
  for (const [code, action] of Object.entries(DEFAULT_CONFIG.keyboardConfig)) {
    const index = ACTION_BUTTON_INDEX[action];
    if (index === undefined) continue;
    if (code === 'Click') {
      await assert(`Click → ${action} → button[${index}]`, async () => {
        await page.mouse.down();
        await waitForButton(page, index, true);
        expect((await getButtonStates(page))[index]).toBeTrue();
        await page.mouse.up();
        await waitForButton(page, index, false);
      });
    } else if (code === 'RightClick') {
      await assert(`RightClick → ${action} → button[${index}]`, async () => {
        await page.mouse.down({ button: 'right' });
        await waitForButton(page, index, true);
        expect((await getButtonStates(page))[index]).toBeTrue();
        await page.mouse.up({ button: 'right' });
        await waitForButton(page, index, false);
      });
    }
  }
};
