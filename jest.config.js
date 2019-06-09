const defaultConfig = require("./jest.config.standalone");

// This config starts up the standalone parser by default
module.exports = {
  ...defaultConfig,
  globalSetup: "<rootDir>/bin/start-apex-server.js",
  globalTeardown: "<rootDir>/bin/stop-apex-server.js",
};
