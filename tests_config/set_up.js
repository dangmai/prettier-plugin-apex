const nailgunServer = require("../src/ng-server");

async function setup() {
  nailgunServer.start("localhost", 2113);
}

module.exports = setup;
