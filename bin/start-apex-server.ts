#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { start } from "../src/http-server";

async function setup(host: string, port: number) {
  await start(host, port);
  process.exit();
}

if (require.main === module) {
  // Support calling this directly
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
      },
      (argv) => {
        setup(argv.host, argv.port);
      },
    )
    .help()
    .parse();
}

module.exports = setup;
