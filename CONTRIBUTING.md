# Contributing to Prettier Apex

To get up and running, install the dependencies and run the tests:

```bash
npm install
npm run lint
npm run start-server # This spins up the built in HTTP parsing server
# In another terminal
npm test -- -c jest.config.standalone.js
# When you are done
npm run stop-server
```

Here's what you need to know about the tests:

- The tests use [Jest snapshots](https://facebook.github.io/jest/docs/en/snapshot-testing.html).
- You can make changes and run `jest -u` to update the snapshots. Then run `git diff` to take a look at what changed. Always update the snapshots when opening a PR.
- You can run `AST_COMPARE=1 jest` for a more robust test run. That formats each file, re-parses it, and compares the new AST with the original one and makes sure they are semantically equivalent.
- Each test folder has a `jsfmt.spec.js` that runs the tests. Generally you can just put `runSpec(__dirname, ["apex"]);` there. This will verify that the output using the Apex parser stays consistent. You can also pass options as the third argument, like this: `runSpec(__dirname, ["apex"], { apexInsertFinalNewLine: false });`
- If you would like to debug prettier locally, you can either debug it in node or the browser. The easiest way to debug it in the browser is to run the interactive `docs` REPL locally. The easiest way to debug it in node, is to create a local test file and run it in an editor like VS Code.

Run `npm run prettier` to automatically format files.

If you can, take look at [commands.md](https://github.com/prettier/prettier/blob/master/commands.md) and check out [Wadler's paper](http://homepages.inf.ed.ac.uk/wadler/papers/prettier/prettier.pdf) to understand how Prettier works.

## Performance

If you're contributing a performance improvement, the following Prettier CLI options can help:

- `--debug-repeat N` uses a naïve loop to repeat the formatting `N` times and measures the average run duration. It can be useful to highlight hot functions in the profiler. The measurements are printed at the debug log level, use `--loglevel debug` to see them.
- `--debug-benchmark` uses [`benchmark`](https://npm.im/benchmark) module to produce statistically significant duration measurements. The measurements are printed at the debug log level, use `--loglevel debug` to see them.
