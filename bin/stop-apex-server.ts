#!/usr/bin/env node
import { parseArgs } from "util";

import { stop } from "../src/http-server";

async function teardown(host: string, port: string) {
  await stop(host, Number.parseInt(port, 10));
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
};

const parsed = parseArgs({ options });
teardown(
  parsed.values.host ?? options.host.default,
  parsed.values.port ?? options.port.default,
);
