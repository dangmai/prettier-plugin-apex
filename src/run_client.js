"use strict";

const spawn = require("child_process").spawn;
const path = require("path");
const util = require("util");

const argv = require("yargs").argv;
const nailgunClient = require("node-nailgun-client");
const temp = require("temp");
const waitOn = util.promisify(require("wait-on"));

const nailgunServer = require("./ng-server");

async function main() {
  // Start the server if needed
  let childCommand;
  const options = {
    address: argv.a || "localhost",
    port: argv.p || 2113,
  };

  if (argv.s) {
    // TODO this does not stop the program if it fails, since the Gradle
    // App returns status code 0
    childCommand = await nailgunServer.start(options.address, options.port);
  }
  // The nailgun client we use cannot handle stdin correctly, so we have to
  // workaround it by saving the text content at a temporary location
  // and send its path to the serializer

  // Automatically track and cleanup files at exit
  temp.track();

  const stream = temp.createWriteStream();
  process.stdin.pipe(stream);

  const args = ["-f", "json", "-i", "-l", stream.path];

  const nail = nailgunClient.exec("net.dangmai.serializer.Apex", args, options);

  nail.stdout.pipe(process.stdout);
  nail.stderr.pipe(process.stderr);

  const stopNailgunServer = async function (code) {
    if (argv.s) {
      await nailgunServer.stop(options.address, options.port);

      process.exit(code);
    }
  };
  nail.on("exit", stopNailgunServer);
}

main();
