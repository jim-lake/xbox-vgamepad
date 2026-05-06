const path = require('path');
const { runSuites } = require('./harness.cjs');

runSuites([
  path.join(__dirname, 'suites', 'gamepad-shape.cjs'),
  path.join(__dirname, 'suites', 'default-buttons.cjs'),
  path.join(__dirname, 'suites', 'axes.cjs'),
  path.join(__dirname, 'suites', 'behavioral-contract.cjs'),
  path.join(__dirname, 'suites', 'default-config-compliance.cjs'),
  path.join(__dirname, 'suites', 'custom-configs.cjs'),
  path.join(__dirname, 'suites', 'config-switching.cjs'),
  path.join(__dirname, 'suites', 'json-validation.cjs'),
  path.join(__dirname, 'suites', 'mouse-input.cjs'),
  path.join(__dirname, 'suites', 'storage-format.cjs'),
  path.join(__dirname, 'suites', 'gamepad-details.cjs'),
  path.join(__dirname, 'suites', 'edge-cases.cjs'),
  // Extended suites
  path.join(__dirname, 'suites', 'json-validation-extended.cjs'),
  path.join(__dirname, 'suites', 'gamepad-api-contract.cjs'),
  path.join(__dirname, 'suites', 'behavioral-contract-extended.cjs'),
  path.join(__dirname, 'suites', 'storage-format-extended.cjs'),
  path.join(__dirname, 'suites', 'edge-cases-extended.cjs'),
  // Comprehensive suites
  path.join(__dirname, 'suites', 'json-spec-validation-complete.cjs'),
  path.join(__dirname, 'suites', 'gamepad-api-details.cjs'),
  path.join(__dirname, 'suites', 'behavioral-contract-complete.cjs'),
  path.join(__dirname, 'suites', 'default-config-json-spec.cjs'),
  path.join(__dirname, 'suites', 'config-lifecycle.cjs'),
  path.join(__dirname, 'suites', 'edge-cases-complete.cjs'),
  // New end-to-end suites
  path.join(__dirname, 'suites', 'page-reload.cjs'),
  path.join(__dirname, 'suites', 'gamepad-comprehensive.cjs'),
  path.join(__dirname, 'suites', 'json-spec-comprehensive.cjs'),
  path.join(__dirname, 'suites', 'e2e-scenarios.cjs'),
]);
