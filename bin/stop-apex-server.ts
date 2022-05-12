#!/usr/bin/env node
import { stop } from "../src/http-server";

async function teardown() {
  await stop("localhost", 2117);
}

if (require.main === module) {
  // Support calling this directly
  teardown();
}

module.exports = teardown;
