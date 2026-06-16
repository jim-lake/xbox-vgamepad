const path = require('path');
const { runSuites } = require('./harness.cjs');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node gamepad-single.test.cjs <suite1> [suite2] ...');
  process.exit(1);
}

const suiteFiles = args.map((name) => {
  const file = name.endsWith('.cjs') ? name : `${name}.cjs`;
  return path.join(__dirname, 'suites', file);
});

runSuites(suiteFiles);
