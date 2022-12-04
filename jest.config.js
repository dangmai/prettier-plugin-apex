const defaultConfig = require("./jest.config.standalone");

// This config starts up the standalone parser by default
module.exports = {
  ...defaultConfig,
  globalSetup: "<rootDir>/dist/tests_config/start-test-server.js",
  globalTeardown: "<rootDir>/dist/tests_config/stop-test-server.js",
};
