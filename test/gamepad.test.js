const path = require('path');
const { runSuites } = require('./harness');

runSuites([
  path.join(__dirname, 'suites', 'gamepad-shape.js'),
  path.join(__dirname, 'suites', 'default-buttons.js'),
  path.join(__dirname, 'suites', 'axes.js'),
  path.join(__dirname, 'suites', 'behavioral-contract.js'),
  path.join(__dirname, 'suites', 'default-config-compliance.js'),
  path.join(__dirname, 'suites', 'custom-configs.js'),
  path.join(__dirname, 'suites', 'config-switching.js'),
  path.join(__dirname, 'suites', 'json-validation.js'),
  path.join(__dirname, 'suites', 'mouse-input.js'),
  path.join(__dirname, 'suites', 'storage-format.js'),
  path.join(__dirname, 'suites', 'gamepad-details.js'),
  path.join(__dirname, 'suites', 'edge-cases.js'),
  // Extended suites
  path.join(__dirname, 'suites', 'json-validation-extended.js'),
  path.join(__dirname, 'suites', 'gamepad-api-contract.js'),
  path.join(__dirname, 'suites', 'behavioral-contract-extended.js'),
  path.join(__dirname, 'suites', 'storage-format-extended.js'),
  path.join(__dirname, 'suites', 'edge-cases-extended.js'),
  // Comprehensive suites
  path.join(__dirname, 'suites', 'json-spec-validation-complete.js'),
  path.join(__dirname, 'suites', 'gamepad-api-details.js'),
  path.join(__dirname, 'suites', 'behavioral-contract-complete.js'),
  path.join(__dirname, 'suites', 'default-config-json-spec.js'),
  path.join(__dirname, 'suites', 'config-lifecycle.js'),
  path.join(__dirname, 'suites', 'edge-cases-complete.js'),
  // New end-to-end suites
  path.join(__dirname, 'suites', 'page-reload.js'),
  path.join(__dirname, 'suites', 'gamepad-comprehensive.js'),
  path.join(__dirname, 'suites', 'json-spec-comprehensive.js'),
  path.join(__dirname, 'suites', 'e2e-scenarios.js'),
]);
