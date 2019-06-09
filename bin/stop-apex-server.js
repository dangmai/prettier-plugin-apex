#!/usr/bin/env node
const httpServer = require("../src/http-server");

async function teardown() {
  await httpServer.stop("localhost", 2117);
}

if (require.main === module) {
  // Support calling this directly
  teardown();
}

module.exports = teardown;
