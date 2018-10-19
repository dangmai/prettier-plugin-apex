const nailgunServer = require("../src/ng-server");

async function setup(globalConfig) {
  if (!globalConfig || !globalConfig.nonFlagArgs || !globalConfig.nonFlagArgs.includes("standalone")) {
    await nailgunServer.start("localhost", 2113);
  }
}

if (require.main === module) {
  // Support calling this directly
  setup();
}

module.exports = setup;
