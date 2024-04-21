const ENABLE_COVERAGE = !!process.env.CI;

// This config does not start up the standalone parser by default
/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  testTimeout: 10000,
  displayName: "test",
  setupFiles: ["<rootDir>/tests_config/run-spec.ts"],
  snapshotSerializers: ["jest-snapshot-serializer-raw"],
  testPathIgnorePatterns: ["<rootDir>/dist/"],
  collectCoverage: ENABLE_COVERAGE,
  coveragePathIgnorePatterns: ["/node_modules/", "/tests/", "/tests_config/"],
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {},
};
