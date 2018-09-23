const nailgunServer = require("../src/ng-server");

async function teardown() {
  await nailgunServer.stop("localhost", 2113);
}

if (require.main === module) {
  // Support calling this directly
  teardown();
}

module.exports = teardown;
