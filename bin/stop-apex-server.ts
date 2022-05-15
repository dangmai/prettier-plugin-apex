#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { stop } from "../src/http-server";

async function teardown(host: string, port: number) {
  await stop(host, port);
}

if (require.main === module) {
  // Support calling this directly
  yargs(hideBin(process.argv))
    .command(
      "$0",
      "stop the built-in parsing server",
      {
        host: {
          alias: "h",
          default: "localhost",
        },
        port: {
          alias: "p",
          default: 2117,
        },
      },
      (argv) => {
        teardown(argv.host, argv.port);
      },
    )
    .help()
    .parse();
}

module.exports = teardown;
