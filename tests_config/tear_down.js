const nailgunServer = require("../src/ng-server");

async function teardown() {
  await nailgunServer.stop("localhost", 2113);
}

module.exports = teardown;
