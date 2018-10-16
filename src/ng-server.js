"use strict";

const spawn = require("child_process").spawn;
const path = require("path");
const util = require("util");

const nailgunClient = require("node-nailgun-client");
const waitOn = require("wait-on");
const waitOnPromise = util.promisify(waitOn);

async function start(address, port) {
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

  await waitOnPromise({
    resources: [
      `tcp:${address}:${port}`,
    ]
  });

  return command;
}

async function stop(address, port) {
  const options = {
    address: address || "localhost",
    port: port || 2113,
  };

  const nail = nailgunClient.exec("ng-stop", [], options);
  nail.socket.on("error", function (err) {
    // For some reason on Windows ECONNABORTED gets thrown when we write to
    // the socket, even though the command runs successfully.
    if (err.code !== "ECONNABORTED") {
      throw err;
    }
  });

  await waitOnPromise({
    resources: [
      `tcp:${address}:${port}`,
    ],
    reverse: true,
  });
}

module.exports = {
  start,
  stop,
};
