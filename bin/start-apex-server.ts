#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { start } from "../src/http-server";

async function setup(host: string, port: number, allowedOrigins?: string) {
  await start(host, port, allowedOrigins);
}

yargs(hideBin(process.argv))
  .command(
    "$0",
    "start the built-in parsing server",
    {
      host: {
        alias: "h",
        default: "localhost",
      },
      port: {
        alias: "p",
        default: 2117,
      },
      "cors-allowed-origins": {
        describe:
          "Comma-delimited list of allowed origins to be added to CORS headers",
        alias: "c",
        type: "string",
      },
    },
    (argv) => {
      setup(argv.host, argv.port, argv["cors-allowed-origins"]);
    },
  )
  .help()
  .parse();
