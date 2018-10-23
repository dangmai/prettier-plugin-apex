const { argv } = require("yargs");
const nailgunClient = require("node-nailgun-client");

const nailgunServer = require("./ng-server");

async function main() {
  // Start the server if needed
  const options = {
    address: argv.a || "localhost",
    port: argv.p || 2113,
  };

  if (argv.s) {
    // TODO this does not stop the program if it fails, since the Gradle
    // App returns status code 0
    await nailgunServer.start(options.address, options.port);
  }

  const args = ["-f", "json", "-i"];

  const nail = nailgunClient.exec("net.dangmai.serializer.Apex", args, options);

  nail.stdout.pipe(process.stdout);
  nail.stderr.pipe(process.stderr);
  process.stdin.pipe(nail.stdin);

  const stopNailgunServer = async code => {
    if (argv.s) {
      await nailgunServer.stop(options.address, options.port);

      process.exit(code);
    }
  };
  nail.on("exit", stopNailgunServer);
}

main();
