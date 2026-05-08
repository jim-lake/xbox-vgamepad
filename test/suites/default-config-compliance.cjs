// Tests: Full default config compliance — every binding verified end-to-end,
// derived entirely from test/default_config.cjs (no hardcoded keys).
const {
  DEFAULT_CONFIG,
  ACTION_BUTTON_INDEX,
  ACTION_AXIS,
  CODE_TO_PUPPETEER_KEY,
} = require('../default_config.cjs');

module.exports = async function ({ page, assert, helpers }) {
  const { waitForButton, waitForAxis, waitForAxesCentered } = helpers;

  console.log('  [Default Config - Button Bindings]');

  for (const [code, action] of Object.entries(DEFAULT_CONFIG.keyboardConfig)) {
    const actions = Array.isArray(action) ? action : [action];
    for (const act of actions) {
      const index = ACTION_BUTTON_INDEX[act];
      if (index === undefined) continue; // axis or toggle action
      const key = CODE_TO_PUPPETEER_KEY[code];
      if (!key) continue; // mouse virtual code — tested separately
      await assert(
        `default config: ${code} → ${act} → button[${index}]`,
        async () => {
          await page.keyboard.down(key);
          await waitForButton(page, index, true);
          await page.keyboard.up(key);
          await waitForButton(page, index, false);
        }
      );
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
        await page.mouse.up();
        await waitForButton(page, index, false);
      });
    } else if (code === 'RightClick') {
      await assert(`RightClick → ${action} → button[${index}]`, async () => {
        await page.mouse.down({ button: 'right' });
        await waitForButton(page, index, true);
        await page.mouse.up({ button: 'right' });
        await waitForButton(page, index, false);
      });
    }
  }

  console.log('  [Default Config - Axis Bindings]');

  for (const [code, action] of Object.entries(DEFAULT_CONFIG.keyboardConfig)) {
    const axisInfo = ACTION_AXIS[action];
    if (!axisInfo) continue;
    const key = CODE_TO_PUPPETEER_KEY[code];
    if (!key) continue;
    const { axisIndex, value } = axisInfo;
    await assert(
      `default config: ${code} → ${action} → axes[${axisIndex}] = ${value}`,
      async () => {
        await page.keyboard.down(key);
        await waitForAxis(
          page,
          axisIndex,
          value < 0 ? 'lt' : 'gt',
          value < 0 ? -0.5 : 0.5
        );
        await page.keyboard.up(key);
        await waitForAxesCentered(page);
      }
    );
  }
};
