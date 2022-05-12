const ENABLE_COVERAGE = !!process.env.CI;

// This config does not start up the standalone parser by default
/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  displayName: "test",
  setupFiles: ["<rootDir>/tests_config/run-spec.ts"],
  snapshotSerializers: ["jest-snapshot-serializer-raw"],
  testPathIgnorePatterns: ["<rootDir>/dist/"],
  collectCoverage: ENABLE_COVERAGE,
  coveragePathIgnorePatterns: ["/node_modules/", "/tests/", "/tests_config/"],
  transform: {},
};
