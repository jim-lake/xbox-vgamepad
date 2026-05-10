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
    makeConfig,
  } = helpers;

  console.log('  [Default Config Structure - JSON.md Spec]');

  await assert(
    'default config has mouseConfig.mouseControls targeting right stick',
    async () => {
      const target = DEFAULT_CONFIG.mouseConfig.mouseControls[0];
      expect(target?.stick).toBe('right');
    }
  );

  await assert('default config has a sensitivity value', async () => {
    const target = DEFAULT_CONFIG.mouseConfig.mouseControls[0];
    expect(typeof target?.sensitivity).toBe('number');
  });

  await assert('default config has a home binding', async () => {
    const hasBoundHome = Object.values(DEFAULT_CONFIG.keyboardConfig).some(
      (entries) =>
        entries.some((e) => e.type === 'action' && e.action === 'home')
    );
    expect(hasBoundHome).toBeTrue();
  });

  console.log('  [Default Config - Button Index Mapping Compliance]');

  for (const [code, entries] of Object.entries(DEFAULT_CONFIG.keyboardConfig)) {
    for (const entry of entries) {
      if (entry.type !== 'action') continue;
      const index = ACTION_BUTTON_INDEX[entry.action];
      if (index === undefined) continue;
      const key = CODE_TO_PUPPETEER_KEY[code];
      if (!key) continue;
      await assert(
        `${code} maps to gamepadIndex ${index} (${entry.action})`,
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

  for (const [code, entries] of Object.entries(DEFAULT_CONFIG.keyboardConfig)) {
    for (const entry of entries) {
      if (entry.type !== 'action') continue;
      const axisInfo = ACTION_AXIS[entry.action];
      if (!axisInfo) continue;
      const key = CODE_TO_PUPPETEER_KEY[code];
      if (!key) continue;
      const { axisIndex, value } = axisInfo;
      await assert(
        `${code} maps to axes[${axisIndex}] = ${value} (${entry.action})`,
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
  }
};
