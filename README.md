# Prettier Apex  [![Build Status](https://travis-ci.org/dangmai/prettier-plugin-apex.svg)](https://travis-ci.org/dangmai/prettier-plugin-apex) [![npm](https://img.shields.io/npm/v/prettier-plugin-apex.svg)](https://www.npmjs.com/package/prettier-plugin-apex) [![Join the chat at https://gitter.im/prettier-plugin-apex/community](https://badges.gitter.im/prettier-plugin-apex/community.svg)](https://gitter.im/prettier-plugin-apex/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

![Prettier Banner](https://raw.githubusercontent.com/prettier/prettier-logo/master/images/prettier-banner-light.png)

This is a code formatter for the Apex Programming Language,
used on the Salesforce development platform.

It uses the excellent [Prettier](https://prettier.io/) engine for formatting,
and the jorje compiler from Salesforce for parsing.

## Status

This project is actively being worked on, and has been tested on production code.

* Formatting still needs work.
* Some defaults might be changed in the future, e.g. default number of spaces,
continuation indent, etc.

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

#### Tip

If you are formatting a big code base for the first time,
please make sure that you have some form of version control in place,
so that you can revert any change if necessary.
You should also run Prettier with the `--apex-verify-ast` argument. For example:

```bash
prettier --write "/path/to/project/**/*.{trigger,cls}" --apex-verify-ast
```

This will guarantee that the behavior of your code did not change because of
the format.

Note that this argument does degrade performance, so after the initial commit
feel free to stop using it in your day to day operation, provided that you only
format a small amount of code each time (for example, on a file save).

### Configuration

This library follows the same configuration format as Prettier,
which is documented [here](https://prettier.io/docs/en/configuration.html).

The amount of configuration is very limited,
because this is intended to be a very opinionated formatter.
Here is the default configuration that can be overriden:

```json
{
  "tabWidth": 2,
  "printWidth": 80,
  "useTab": false
}
```

Which means that by default, the formatted code will use 2 spaces for indentation,
and will try to format every line to contain under 80 characters.

## Performance Tips/3rd party integration

By default,
this library invokes a CLI application to get the AST of the Apex code.
However, since this CLI application is written in Java,
there is a heavy start up cost associated with it.
In order to alleviate this issue,
we also have an optional [Nailgun](https://github.com/facebook/nailgun) server
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
prettier --apex-standalone-parser --write "/path/to/project/**/*.{trigger,cls}"

# After you are done, stop the server (if installed globally)
stop-apex-server
# Or if installed locally
node /path/to/libary/bin/stop-apex-server.js
```

## License

MIT
