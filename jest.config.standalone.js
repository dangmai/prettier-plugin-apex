const ENABLE_COVERAGE = false; // !!process.env.CI;

// This config does not start up nailgun by default
module.exports = {
  displayName: "test",
  setupFiles: ["<rootDir>/tests_config/run_spec.js"],
  snapshotSerializers: ["<rootDir>/tests_config/raw-serializer.js"],
  testRegex: "jsfmt\\.spec\\.js$|__tests__/.*\\.js$",
  testPathIgnorePatterns: [],
  collectCoverage: ENABLE_COVERAGE,
  collectCoverageFrom: ["src/**/*.js", "!<rootDir>/node_modules/"],
  transform: {},
};
