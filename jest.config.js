const defaultConfig = require("./jest.config.standalone");

// This config starts up nailgun by default
module.exports = {
  ...defaultConfig,
  globalSetup: "<rootDir>/tests_config/set_up.js",
  globalTeardown: "<rootDir>/tests_config/tear_down.js",
};
