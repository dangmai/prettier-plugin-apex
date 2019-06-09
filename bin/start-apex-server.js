#!/usr/bin/env node
const httpServer = require("../src/http-server");

async function setup() {
  await httpServer.start("localhost", 2117);
}

if (require.main === module) {
  // Support calling this directly
  setup();
}

module.exports = setup;
