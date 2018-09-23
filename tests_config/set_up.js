const nailgunServer = require("../src/ng-server");

async function setup() {
  await nailgunServer.start("localhost", 2113);
}

module.exports = setup;
