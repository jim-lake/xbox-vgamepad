// Tests: Virtual Gamepad Shape (JSON.md spec)
module.exports = async function ({ page, assert, expect, helpers }) {
  const {
    getGamepadIdentity,
    getButtonStates,
    getButtonValues,
    getButtonTouched,
    getAxesStates,
    getConnectionStatus,
    getEventCounts,
  } = helpers;

  console.log('  [Gamepad Shape - JSON Spec]');

  await assert(
    'gamepad id is "Xbox 360 Controller (XInput STANDARD GAMEPAD)"',
    async () => {
      const identity = await getGamepadIdentity(page);
      expect(identity.id).toBe('Xbox 360 Controller (XInput STANDARD GAMEPAD)');
    }
  );

  await assert('gamepad index is 0', async () => {
    const identity = await getGamepadIdentity(page);
    expect(identity.index).toBe(0);
  });

  await assert('gamepad mapping is "standard"', async () => {
    const identity = await getGamepadIdentity(page);
    expect(identity.mapping).toBe('standard');
  });

  await assert('gamepad connected property is true', async () => {
    const identity = await getGamepadIdentity(page);
    expect(identity.connected).toBe('true');
  });

  await assert('gamepad has 17 buttons', async () => {
    const buttons = await getButtonStates(page);
    expect(buttons.length).toBe(17);
  });

  await assert('gamepad has 4 axes', async () => {
    const axes = await getAxesStates(page);
    expect(axes.length).toBe(4);
  });

  await assert('gamepadconnected event fires on activation', async () => {
    const status = await getConnectionStatus(page);
    expect(status).toBe('connected');
  });

  await assert('gamepadconnected event count is at least 1', async () => {
    const counts = await getEventCounts(page);
    expect(counts.connectCount).toBeAtLeast(1);
  });

  await assert(
    'each button has pressed, touched, and value properties',
    async () => {
      const buttons = await getButtonStates(page);
      const values = await getButtonValues(page);
      const touched = await getButtonTouched(page);
      expect(buttons.length).toBe(17);
      expect(values.length).toBe(17);
      expect(touched.length).toBe(17);
    }
  );

  console.log('  [Button Values - JSON Spec]');

  await assert('pressed button has value 1', async () => {
    await page.keyboard.down('Space');
    await helpers.waitForButton(page, 0, true);
    const values = await getButtonValues(page);
    expect(values[0]).toBeCloseTo(1, 0.01);
    await page.keyboard.up('Space');
    await helpers.waitForButton(page, 0, false);
  });

  await assert('released button has value 0', async () => {
    const values = await getButtonValues(page);
    expect(values[0]).toBeCloseTo(0, 0.01);
  });

  await assert('all idle button values are 0', async () => {
    const values = await getButtonValues(page);
    expect(values).toAllBeCloseTo(0, 0.01);
  });
};
