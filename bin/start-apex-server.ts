#!/usr/bin/env node
import { parseArgs } from "util";

import { start } from "../src/http-server.js";

async function setup(
  host: string,
  port: string,
  password: string,
  allowedOrigins?: string,
) {
  await start(host, Number.parseInt(port, 10), password, allowedOrigins);
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
  "cors-allowed-origins": {
    describe:
      "Comma-delimited list of allowed origins to be added to CORS headers",
    short: "c",
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
setup(
  parsed.values.host ?? options.host.default,
  parsed.values.port ?? options.port.default,
  parsed.values.password ?? options.password.default,
  parsed.values["cors-allowed-origins"],
);
