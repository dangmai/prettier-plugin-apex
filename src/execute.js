#!/usr/bin/env node

const childProcess = require("child_process");
const path = require("path");

const nailgunServer = require("./ng-server");

const argv = require("yargs")
  .command("prettify <path>", "prettify classes and triggers in path", (yargs) => {
    yargs.positional("prettify", {
      type: "string",
    });
  }, function (argv) {
    (async function () {
      if (!argv.standalone) {
        await nailgunServer.start(argv.host, argv.port);
      }
      const pluginDir = path.dirname(__dirname);
      childProcess.spawnSync(
        "prettier",
        [`--plugin=${pluginDir}`, "--server-auto-start=false", "--write", `${argv.path}/**/*.{trigger,cls}`],
        {
          cwd: process.cwd(),
          env: process.env,
          stdio: [process.stdin, process.stdout, process.stderr],
          encoding: "utf-8",
          shell: true,
        }
      );
      if (!argv.standalone) {
        await nailgunServer.stop(argv.host, argv.port);
      }
    })();
  })
  .boolean("standalone")
  .option("host", {
    alias: "h",
    type: "string",
    default: "localhost",
  })
  .option("port", {
    alias: "p",
    type: "number",
    default: 2113,
  })
  .argv;
