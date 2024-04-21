# Prettier Apex

[![Build Status](https://github.com/dangmai/prettier-plugin-apex/workflows/Tests%20and%20Deployments/badge.svg)](https://github.com/dangmai/prettier-plugin-apex/actions?query=workflow%3A%22Tests+and+Deployments%22) [![npm](https://img.shields.io/npm/v/prettier-plugin-apex.svg)](https://www.npmjs.com/package/prettier-plugin-apex) ![NPM](https://img.shields.io/npm/l/prettier-plugin-apex.svg) [![codecov](https://codecov.io/gh/dangmai/prettier-plugin-apex/branch/master/graph/badge.svg?flag=prettier-plugin-apex)](https://codecov.io/gh/dangmai/prettier-plugin-apex) [![Known Vulnerabilities](https://snyk.io/test/github/dangmai/prettier-plugin-apex/badge.svg)](https://snyk.io/test/github/dangmai/prettier-plugin-apex) [![Join the chat at https://gitter.im/prettier-plugin-apex/community](https://badges.gitter.im/prettier-plugin-apex/community.svg)](https://gitter.im/prettier-plugin-apex/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

![Prettier Banner](https://raw.githubusercontent.com/prettier/prettier-logo/master/images/prettier-banner-light.png)

This is a code formatter for the Apex Programming Language,
used on the Salesforce development platform.

It uses the excellent [Prettier](https://prettier.io/) engine for formatting,
and the language server provided by Salesforce for parsing.

## ⚡️ Quick start

You can automatically format Apex code in our [playground](https://apex.dangmai.net) without having to install anything.

To integrate Prettier Apex in your workflow, please follow the [Usage](#-usage) section.

## ✨ Status

This project is production ready, and have been tested on multiple projects,
including a mix of open source/proprietary/Salesforce internal code bases.

## 📖 Usage

### Requirements

- Node >= 18.11.0 (that have not been End-of-Life'd)
- Java Runtime Engine >= 11

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
prettier --plugin=prettier-plugin-apex --write "/path/to/project/**/*.{trigger,cls}"
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
npm run prettier -- --plugin=prettier-plugin-apex --write "/path/to/project/**/*.{trigger,cls}"
```

### Tips

#### Initial run

If you are formatting a big code base for the first time,
please make sure that you have some form of version control in place,
so that you can revert any change if necessary.
You should also run Prettier with the `--debug-check` [argument](https://prettier.io/docs/en/cli.html#debug-check).
For example:

```bash
prettier --plugin=prettier-plugin-apex --debug-check "/path/to/project/**/*.{trigger,cls}"
```

This will guarantee that the behavior of your code will not change because of
the format.

If there are no errors, you can run `prettier` with `--write` next.
If there are errors, please file a bug report so that they can be fixed.

#### Anonymous Apex

You can also format anonymous Apex with this program by using the
`apex-anonymous` parser.

For example:

```bash
prettier --write "/path/to/project/anonymous/**/*.cls" --plugin=prettier-plugin-apex --parser apex-anonymous
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

#### Checking your plugin version

For debugging purposes, you might want to check which version of the plugin you are using.

Use NPM's `list` command, like this:

```bash
npm list prettier-plugin-apex
```

### Configuration

This library follows the same configuration format as Prettier,
which is documented [here](https://prettier.io/docs/en/configuration.html).

The amount of configuration is very limited,
because this is intended to be a very opinionated formatter.
Here is the default configuration that can be overriden:

| Name                     | Default     | Description                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `printWidth`             | `80`        | Same as in Prettier ([see prettier docs](https://prettier.io/docs/en/options.html#print-width))                                                                                                                                                                                                                                                                                                       |
| `tabWidth`               | `2`         | Same as in Prettier ([see prettier docs](https://prettier.io/docs/en/options.html#tab-width))                                                                                                                                                                                                                                                                                                         |
| `useTabs`                | `false`     | Same as in Prettier ([see prettier docs](https://prettier.io/docs/en/options.html#tabs))                                                                                                                                                                                                                                                                                                              |
| `requirePragma`          | `false`     | Same as in Prettier ([see prettier docs](https://prettier.io/docs/en/options.html#require-pragma))                                                                                                                                                                                                                                                                                                    |
| `insertPragma`           | `false`     | Same as in Prettier ([see prettier docs](https://prettier.io/docs/en/options.html#insert-pragma))                                                                                                                                                                                                                                                                                                     |
| `apexInsertFinalNewline` | `true`      | Whether a newline is added as the last thing in the output                                                                                                                                                                                                                                                                                                                                            |
| `apexStandaloneParser`   | `none`      | If set to `built-in`, Prettier uses the built in standalone parser for better performance. See [Using built-in HTTP Server](#-using-built-in-http-server).<br>If set to `none`, Prettier invokes the CLI parser for every file.<br>If set to `native`, Prettier uses the native executables to speed up the parsing process. See [Using native executables](#-using-native-executables-experimental). |
| `apexStandalonePort`     | `2117`      | The port that the standalone Apex parser listens on.<br>Only applicable if `apexStandaloneParser` is `built-in`.                                                                                                                                                                                                                                                                                      |
| `apexStandaloneHost`     | `localhost` | The host that the standalone Apex parser listens on.<br>Only applicable if `apexStandaloneParser` is `built-in`.                                                                                                                                                                                                                                                                                      |
| `apexStandaloneProtocol` | `http`      | The protocol that the standalone Apex parser uses.<br>Only applicable if `apexStandaloneParser` is `built-in`.                                                                                                                                                                                                                                                                                        |

## 📝 Editor integration

### VScode

Follow [this tutorial](https://developer.salesforce.com/tools/vscode/en/user-guide/prettier) from Salesforce in order to use this plugin in VSCode.

## 🚀 Performance Tips/3rd party integration

### 💻 Using built-in HTTP Server

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
npx start-apex-server

# In a separate console
prettier --apex-standalone-parser built-in --write "/path/to/project/**/*.{trigger,cls}"

# After you are done, stop the server (if installed globally)
stop-apex-server
# Or if installed locally
npx stop-apex-server
```

By default, the server listens on `http://localhost:2117`.
This can be customized by specifying the `--host` and `--port` arguments:

```bash
start-apex-server --host 127.0.0.1 --port 2118
```

### 🧪 Using native executables (EXPERIMENTAL)

Since version `2.1.0`, we have added support for using native executables to speed up the parsing process.
This is an experimental feature and is not enabled by default.
This method is faster than calling the parser via Java, but slower than the built-in HTTP server.
It is only available for the following platforms:

- Windows x64
- Linux x64
- macOS M-based (ARM64)

In order to use it, first run:

```bash
# Download the native executable for your architecture. It will fail if your platform is not supported.
npx install-apex-executables
```

Then, you can use the `--apex-standalone-parser native` flag to use the native executables (or configure it via `.prettierrc`):

```bash
prettier --apex-standalone-parser native --write "/path/to/project/**/*.{trigger,cls}"
```

## 🚢 Continuous Integration

Prettier Apex can be used to automatically check correct formatting for Apex code
in the context of CI/CD, for example:

```bash
# Start the language server for improved parsing performance,
# and put it in the background (*nix only) so that next commands can be run.
nohup start-apex-server >/dev/null 2>&1 &
# Wait until the server is up before sending requests
npx wait-on http://localhost:2117/api/ast/
# Check that Apex files are formatted according to Prettier Apex style
prettier --plugin=prettier-plugin-apex --check 'project/**/*.{trigger,cls}' --apex-standalone-parser built-in
# Clean up the language server
stop-apex-server
```
