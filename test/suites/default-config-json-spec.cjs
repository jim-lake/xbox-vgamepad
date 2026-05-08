// Tests: Default config JSON.md compliance — structure and end-to-end bindings,
// derived from test/default_config.cjs (no hardcoded keys).
const {
  DEFAULT_CONFIG,
  ACTION_BUTTON_INDEX,
  ACTION_AXIS,
  CODE_TO_PUPPETEER_KEY,
} = require('../default_config.cjs');

module.exports = async function ({ page, assert, expect, helpers }) {
  const {
    getButtonStates,
    getAxesStates,
    waitForButton,
    waitForAxis,
    waitForAxesCentered,
  } = helpers;

  console.log('  [Default Config Structure - JSON.md Spec]');

  await assert(
    'default config has mouseConfig.mouseControls = 1 (right stick)',
    async () => {
      expect(DEFAULT_CONFIG.mouseConfig.mouseControls).toBe(1);
    }
  );

  await assert('default config has mouseConfig.sensitivity = 10', async () => {
    expect(DEFAULT_CONFIG.mouseConfig.sensitivity).toBe(10);
  });

  await assert('default config has a home binding', async () => {
    const hasBoundHome = Object.values(DEFAULT_CONFIG.keyboardConfig).some(
      (v) => v === 'home' || (Array.isArray(v) && v.includes('home'))
    );
    expect(hasBoundHome).toBeTrue();
  });

  console.log('  [Default Config - Button Index Mapping Compliance]');

  for (const [code, action] of Object.entries(DEFAULT_CONFIG.keyboardConfig)) {
    const actions = Array.isArray(action) ? action : [action];
    for (const act of actions) {
      const index = ACTION_BUTTON_INDEX[act];
      if (index === undefined) continue;
      const key = CODE_TO_PUPPETEER_KEY[code];
      if (!key) continue;
      await assert(
        `${code} maps to gamepadIndex ${index} (${act})`,
        async () => {
          await page.keyboard.down(key);
          await waitForButton(page, index, true);
          expect((await getButtonStates(page))[index]).toBeTrue();
          await page.keyboard.up(key);
          await waitForButton(page, index, false);
        }
      );
    }
  }

  console.log('  [Default Config - Axis Index Mapping Compliance]');

  for (const [code, action] of Object.entries(DEFAULT_CONFIG.keyboardConfig)) {
    const axisInfo = ACTION_AXIS[action];
    if (!axisInfo) continue;
    const key = CODE_TO_PUPPETEER_KEY[code];
    if (!key) continue;
    const { axisIndex, value } = axisInfo;
    await assert(
      `${code} maps to axes[${axisIndex}] = ${value} (${action})`,
      async () => {
        await page.keyboard.down(key);
        await waitForAxis(
          page,
          axisIndex,
          value < 0 ? 'lt' : 'gt',
          value < 0 ? -0.5 : 0.5
        );
        expect((await getAxesStates(page))[axisIndex]).toBe(value);
        await page.keyboard.up(key);
        await waitForAxesCentered(page);
      }
    );
  }
};
