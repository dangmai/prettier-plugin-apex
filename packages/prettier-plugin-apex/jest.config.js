import defaultConfig from "./jest.config.standalone.js";

// This config starts up the standalone parser by default
export default {
  ...defaultConfig,
  globalSetup: "<rootDir>/dist/tests_config/start-test-server.js",
  globalTeardown: "<rootDir>/dist/tests_config/stop-test-server.js",
};
