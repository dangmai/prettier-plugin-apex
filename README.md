# Prettier Apex [![Build Status](https://travis-ci.org/dangmai/prettier-plugin-apex.svg)](https://travis-ci.org/dangmai/prettier-plugin-apex) [![npm](https://img.shields.io/npm/v/prettier-plugin-apex.svg)](https://www.npmjs.com/package/prettier-plugin-apex) ![NPM](https://img.shields.io/npm/l/prettier-plugin-apex.svg) [![codecov](https://codecov.io/gh/dangmai/prettier-plugin-apex/branch/master/graph/badge.svg)](https://codecov.io/gh/dangmai/prettier-plugin-apex) [![Join the chat at https://gitter.im/prettier-plugin-apex/community](https://badges.gitter.im/prettier-plugin-apex/community.svg)](https://gitter.im/prettier-plugin-apex/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

![Prettier Banner](https://raw.githubusercontent.com/prettier/prettier-logo/master/images/prettier-banner-light.png)

This is a code formatter for the Apex Programming Language,
used on the Salesforce development platform.

It uses the excellent [Prettier](https://prettier.io/) engine for formatting,
and the jorje compiler from Salesforce for parsing.

## Status

This project is production ready, and have been tested on multiple projects,
including a mix of open source/proprietary/Salesforce internal code bases.

## Usage

### Requirements

- Node >= 8
- Java Runtime Engine >= 1.8.0

### How to use

First, install the library:

```bash
# Install locally
npm install --save-dev prettier prettier-plugin-apex

# Or install globally
npm install --global prettier prettier-plugin-apex
```

If you install globally, run:

```bash
prettier --write "/path/to/project/**/*.{trigger,cls}"
```

If you install locally, you can add prettier as a script in `package.json`:

```json
{
  "scripts": {
    "prettier": "prettier"
  }
}
```

Then in order to run it:

```bash
npm run prettier -- --write "/path/to/project/**/*.{trigger,cls}"
```

### Tip

#### Initial run

If you are formatting a big code base for the first time,
please make sure that you have some form of version control in place,
so that you can revert any change if necessary.
You should also run Prettier with the `--debug-check` [argument](https://prettier.io/docs/en/cli.html#debug-check).
For example:

```bash
prettier --debug-check "/path/to/project/**/*.{trigger,cls}"
```

This will guarantee that the behavior of your code will not change because of
the format.

If there are no errors, you can run `prettier` with `--write` next.
If there are errors, please file a bug report so that they can be fixed.

#### Anonymous Apex

You can also format anonymous Apex with this program by using the
`--apex-anonymous` flag.

For example:

```bash
prettier --write "/path/to/project/anonymous/**/*.cls" --apex-anonymous
```

Note that Prettier will treat any Apex file that it finds using the glob above
as anonymous code blocks,
so it is recommended that you collect all of your anonymous Apex files into
one directory and limit the use of `--apex-anonymous` only in that directory.

#### Ignoring lines

If there are lines in your Apex code that you do not want formatted by Prettier
(either because you don't agree with the formatting choice,
or there is a bug), you can instruct Prettier to ignore it by including the comment
`// prettier-ignore` or `/* prettier-ignore */` on the line before. For example:

```
// prettier-ignore
matrix(
  1, 0, 0,
  0, 1, 0,
  0, 0, 1
)
```

### Configuration

This library follows the same configuration format as Prettier,
which is documented [here](https://prettier.io/docs/en/configuration.html).

The amount of configuration is very limited,
because this is intended to be a very opinionated formatter.
Here is the default configuration that can be overriden:

| Name            | Default | Description                                                                                        |
| --------------- | ------- | -------------------------------------------------------------------------------------------------- |
| `printWidth`    | `80`    | Same as in Prettier ([see prettier docs](https://prettier.io/docs/en/options.html#print-width))    |
| `tabWidth`      | `2`     | Same as in Prettier ([see prettier docs](https://prettier.io/docs/en/options.html#tab-width))      |
| `useTabs`       | `false` | Same as in Prettier ([see prettier docs](https://prettier.io/docs/en/options.html#tabs))           |
| `requirePragma` | `false` | Same as in Prettier ([see prettier docs](https://prettier.io/docs/en/options.html#require-pragma)) |
| `insertPragma`  | `false` | Same as in Prettier ([see prettier docs](https://prettier.io/docs/en/options.html#insert-pragma))  |

## Editor integration

### VScode

The official plugin `prettier-vscode` doesn't support plugins out of the box yet, see [this issue](https://github.com/prettier/prettier-vscode/issues/395).
There are 2 workarounds to enable Apex support anyway:

- First way is to install the plugin into the plugin directory:

```bash
cd ~/.vscode/extensions/esbenp.prettier-vscode-1.8.1/
npm install prettier-plugin-apex
```

After restarting VScode the plugin should work as expected.
The downside is that you will need to do this every time the plugin gets updated.

- Second way is to use a patched version of `prettier-vscode` - there are 2 Pull Requests right now that add support for plugins: https://github.com/prettier/prettier-vscode/pull/817 and https://github.com/prettier/prettier-vscode/pull/757

Once either of them gets merged into the `master` branch, the VSCode plugin will support `prettier-plugin-apex`.

## Performance Tips/3rd party integration

By default,
this library invokes a CLI application to get the AST of the Apex code.
However, since this CLI application is written in Java,
there is a heavy start up cost associated with it.
In order to alleviate this issue,
we also have an optional HTTP server
that makes sure the start up is invoked exactly once.
This is especially useful if this library is integrated in a 3rd party application.

In order to use this server,
you have to evoke it out of band before running Prettier,
as well as specifying a special flag when running Prettier:

```bash
# Start the server (if installed globally)
start-apex-server
# Or if installed locally
node /path/to/libary/bin/start-apex-server.js

# In a separate console
prettier --apex-standalone-parser built-in --write "/path/to/project/**/*.{trigger,cls}"

# After you are done, stop the server (if installed globally)
stop-apex-server
# Or if installed locally
node /path/to/libary/bin/stop-apex-server.js
```
