const defaultConfig = require("./jest.config.standalone");

// This config starts up nailgun by default
module.exports = {
  ...defaultConfig,
  globalSetup: "<rootDir>/bin/start-apex-server.js",
  globalTeardown: "<rootDir>/bin/stop-apex-server.js",
};
