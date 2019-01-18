#!/usr/bin/env node
const nailgunServer = require("../src/ng-server");

async function setup() {
  await nailgunServer.start("localhost", 2113);
}

if (require.main === module) {
  // Support calling this directly
  setup();
}

module.exports = setup;
