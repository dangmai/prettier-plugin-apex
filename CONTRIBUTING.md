# Contributing to Prettier Apex

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/dangmai/prettier-plugin-apex?quickstart=1)

This repository is a monolithic repository with all the moving parts that are necessary to run Prettier Apex.
You will most likely only have to deal with the `prettier-plugin-apex` package,
which resides inside `packages/prettier-plugin-apex/`.

To get up and running, install the dependencies and run the tests:

```bash
pnpm install
pnpm nx run prettier-plugin-apex:lint
pnpm nx run prettier-plugin-apex:start-server # This spins up the built in HTTP parsing server
# In another terminal
pnpm nx run prettier-plugin-apex:test:parser:built-in
# When you are done
pnpm nx run prettier-plugin-apex:stop-server
```

Running the aforementioned comments will ensure that the `apex-ast-serializer`
project also gets built and put into the correct directory for Prettier Apex
to pick it up. If you are changing files inside `apex-ast-serializer` itself,
you can explicit build that project by running:

```bash
pnpm nx run apex-ast-serializer:build
```

You could also use GitHub Codespaces or VSCode Dev Container to have all the
tools pre-provisioned in your workspace, because this repository is compliant
with the [Development Containers](https://containers.dev/) standard.

Here's what you need to know about the Prettier Apex tests:

- The tests use [Vitest snapshots](https://vitest.dev/guide/snapshot).
- You can make changes and run `pnpm nx run prettier-plugin-apex:test:parser:built-in -u` to update the snapshots. Then run `git diff` to take a look at what changed. Always update the snapshots when opening a PR.
- You can run `AST_COMPARE=1 pnpm nx run prettier-plugin-apex:test:parser:built-in` for a more robust test run. That formats each file, re-parses it, and compares the new AST with the original one and makes sure they are semantically equivalent.
- Each test folder has a `jsfmt.spec.ts` that runs the tests. Generally you can just put `runSpec(fileURLToPath(new URL(".", import.meta.url)), ["apex"]);` there. This will verify that the output using the Apex parser stays consistent. You can also pass options as the third argument, like this: `runSpec(fileURLToPath(new URL(".", import.meta.url)), ["apex"], { apexInsertFinalNewLine: false });`
- If you would like to debug prettier locally, you can either debug it in node or the browser. The easiest way to debug it in the browser is to run the interactive `docs` REPL locally. The easiest way to debug it in node, is to create a local test file and run it in an editor like VS Code.

Run `pnpm run -r prettier` to automatically format files.

If you can, take look at [commands.md](https://github.com/prettier/prettier/blob/master/commands.md) and check out [Wadler's paper](http://homepages.inf.ed.ac.uk/wadler/papers/prettier/prettier.pdf) to understand how Prettier works.

## Performance

If you're contributing a performance improvement, the following Prettier CLI options can help:

- `--debug-repeat N` uses a naïve loop to repeat the formatting `N` times and measures the average run duration. It can be useful to highlight hot functions in the profiler. The measurements are printed at the debug log level, use `--loglevel debug` to see them.
- `--debug-benchmark` uses [`benchmark`](https://npm.im/benchmark) module to produce statistically significant duration measurements. The measurements are printed at the debug log level, use `--loglevel debug` to see them.
