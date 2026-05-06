const {
  startServer,
  stopServer,
  patchManifest,
  launchBrowserWithExtension,
} = require('./helpers.cjs');
const helpers = require('./helpers.cjs');

let browser, page, restoreManifest;
let passed = 0;
let failed = 0;
const failures = [];

async function assert(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, err });
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected)
        throw new Error(
          `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
        );
    },
    toBeTrue() {
      if (actual !== true)
        throw new Error(`Expected true, got ${JSON.stringify(actual)}`);
    },
    toBeFalse() {
      if (actual !== false)
        throw new Error(`Expected false, got ${JSON.stringify(actual)}`);
    },
    toAllBeFalse() {
      if (!Array.isArray(actual) || !actual.every((v) => v === false))
        throw new Error(`Expected all false, got ${JSON.stringify(actual)}`);
    },
    toBeGreaterThan(threshold) {
      if (typeof actual !== 'number' || actual <= threshold)
        throw new Error(`Expected ${actual} > ${threshold}`);
    },
    toBeLessThan(threshold) {
      if (typeof actual !== 'number' || actual >= threshold)
        throw new Error(`Expected ${actual} < ${threshold}`);
    },
    toBeCloseTo(expected, tolerance = 0.01) {
      if (typeof actual !== 'number' || Math.abs(actual - expected) > tolerance)
        throw new Error(
          `Expected ${actual} to be close to ${expected} (±${tolerance})`
        );
    },
    toAllBeCloseTo(expected, tolerance = 0.01) {
      if (!Array.isArray(actual))
        throw new Error(`Expected array, got ${JSON.stringify(actual)}`);
      for (let i = 0; i < actual.length; i++) {
        if (Math.abs(actual[i] - expected) > tolerance)
          throw new Error(
            `Index ${i}: expected ${actual[i]} to be close to ${expected} (±${tolerance})`
          );
      }
    },
    toBeAtLeast(threshold) {
      if (typeof actual !== 'number' || actual < threshold)
        throw new Error(`Expected ${actual} >= ${threshold}`);
    },
  };
}

async function releaseAll(pg) {
  const keys = [
    'Space',
    'r',
    'Enter',
    'Tab',
    'Backspace',
    'Control',
    'Shift',
    'w',
    'a',
    's',
    'd',
    'q',
    'c',
    'g',
    'v',
    'f',
    'x',
    'n',
    'z',
    'o',
    'k',
    'l',
    'Semicolon',
    'p',
    'b',
    'i',
    'j',
    'h',
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
  ];
  for (const k of keys) {
    await pg.keyboard.up(k).catch(() => {});
  }
  await new Promise((r) => setTimeout(r, 100));
}

// Default config as specified in JSON.md
const DEFAULT_CONFIG = {
  mouseConfig: { mouseControls: 1, sensitivity: 10 },
  keyConfig: {
    a: 'Space',
    b: ['ControlLeft', 'Backspace'],
    x: 'KeyR',
    y: ['KeyV', 'Scroll'],
    leftShoulder: ['KeyC', 'KeyG'],
    leftTrigger: 'RightClick',
    rightShoulder: 'KeyQ',
    rightTrigger: 'Click',
    start: 'Enter',
    select: 'Tab',
    home: undefined,
    dpadUp: ['ArrowUp', 'KeyX'],
    dpadLeft: ['ArrowLeft', 'KeyN'],
    dpadDown: ['ArrowDown', 'KeyZ'],
    dpadRight: 'ArrowRight',
    leftStickUp: 'KeyW',
    leftStickLeft: 'KeyA',
    leftStickDown: 'KeyS',
    leftStickRight: 'KeyD',
    rightStickUp: 'KeyO',
    rightStickLeft: 'KeyK',
    rightStickDown: 'KeyL',
    rightStickRight: 'Semicolon',
    leftStickPressed: 'ShiftLeft',
    rightStickPressed: 'KeyF',
  },
};

async function setup() {
  console.log('Setting up...');
  const port = await startServer();
  restoreManifest = patchManifest(port);
  console.log(`  Server on port ${port}, manifest patched`);
  const result = await launchBrowserWithExtension();
  browser = result.browser;
  page = result.page;
  console.log('  Browser launched, extension active\n');
}

async function teardown() {
  if (browser) await browser.close();
  restoreManifest?.();
  stopServer();
}

async function runSuites(suiteFiles) {
  try {
    await setup();
    console.log('Running gamepad integration tests...\n');
    const ctx = {
      page,
      browser,
      assert,
      expect,
      helpers,
      releaseAll,
      DEFAULT_CONFIG,
    };
    for (const file of suiteFiles) {
      const suite = require(file);
      await suite(ctx);
    }
  } catch (err) {
    console.error('Fatal error:', err);
    failed++;
  } finally {
    await teardown();
    console.log(`\n${passed} passed, ${failed} failed`);
    if (failures.length > 0) {
      console.log('\nFailures:');
      for (const { name, err } of failures) {
        console.log(`  ✗ ${name}: ${err.message}`);
      }
    }
    process.exit(failed > 0 ? 1 : 0);
  }
}

module.exports = { runSuites };
