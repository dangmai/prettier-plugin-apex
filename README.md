# Prettier Apex  [![Build Status](https://travis-ci.org/dangmai/prettier-plugin-apex.svg)](https://travis-ci.org/dangmai/prettier-plugin-apex)

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

### Usage

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

### License

MIT
