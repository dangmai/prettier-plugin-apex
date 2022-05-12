#!/usr/bin/env node
import { start } from "../src/http-server";

async function setup() {
  await start("localhost", 2117);
}

if (require.main === module) {
  // Support calling this directly
  setup();
}

module.exports = setup;
