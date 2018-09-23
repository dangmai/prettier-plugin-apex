"use strict";

const spawn = require("child_process").spawn;
const path = require("path");
const util = require("util");

const argv = require("yargs").argv;
const nailgunClient = require("node-nailgun-client");
const temp = require("temp");
const waitOn = util.promisify(require("wait-on"));

async function startNailgunServer() {
  let serializerBin = path.join(__dirname, "../vendor/apex-ast-serializer/bin");
  if (process.platform === "win32") {
    serializerBin = path.join(serializerBin, "apex-ast-serializer.bat");
  } else {
    serializerBin = path.join(serializerBin, "apex-ast-serializer");
  }
  const command = spawn(serializerBin);
  command.stderr.pipe(process.stderr);

  command.on("close", function (code) {
    if (code) {
      throw new Error(`Nailgun server closed with error code ${code}`);
    }
  });

  await waitOn({
    resources: [
      `tcp:${argv.a}:${argv.p}`,
    ]
  });

  return command;
}

async function main() {
  // Start the server if needed
  let childCommand;
  if (argv.s) {
    childCommand = await startNailgunServer();
  }
  // The nailgun client we use cannot handle stdin correctly, so we have to
  // workaround it by saving the text content at a temporary location
  // and send its path to the serializer

  // Automatically track and cleanup files at exit
  temp.track();

  var stream = temp.createWriteStream();
  process.stdin.pipe(stream);

  var options = {
    address: argv.a || "localhost",
    port: argv.p || 2113,
  };

  var args = ["-f", "json", "-i", "-l", stream.path];

  var nail = nailgunClient.exec("net.dangmai.serializer.Apex", args, options);

  nail.stdout.pipe(process.stdout);
  nail.stderr.pipe(process.stderr);

  var stopNailgunServer = function (code) {
    if (argv.s) {
      childCommand.kill();

      process.exit(code);
    }
  };
  nail.on("exit", stopNailgunServer);
}

main();
