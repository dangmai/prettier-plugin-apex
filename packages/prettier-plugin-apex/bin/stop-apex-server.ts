#!/usr/bin/env node
import { parseArgs } from "node:util";

import { stop } from "../src/http-server.js";

async function teardown(host: string, port: string, password: string) {
  await stop(host, Number.parseInt(port, 10), password);
}

const options = {
  host: {
    short: "h",
    default: "localhost",
    type: "string" as const,
  },
  port: {
    short: "p",
    default: "2117",
    type: "string" as const,
  },
  password: {
    short: "s",
    default: "secret",
    type: "string" as const,
    describe: "Password that can be used to remotely shutdown the server",
  },
};

const parsed = parseArgs({ options });
teardown(
  parsed.values.host ?? options.host.default,
  parsed.values.port ?? options.port.default,
  parsed.values.password ?? options.password.default,
);
