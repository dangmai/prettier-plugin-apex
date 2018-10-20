# Prettier Apex Plugin

[![Build Status](https://travis-ci.org/dangmai/prettier-plugin-apex.svg)](https://travis-ci.org/dangmai/prettier-plugin-apex)

![Prettier Banner](https://raw.githubusercontent.com/prettier/prettier-logo/master/images/prettier-banner-light.png)

## Status

This is the Prettier plugin for the Apex Programming Language,
used on the Salesforce development platform.
It is actively being worked on, and definitely not ready to be run on production code.

* Priority right now is to support all AST elements from compiler.
A lot is already supported.
* Currently not working: SOSL, comments.
* Formatting needs a lot of work.

## How to run

```bash
git clone https://github.com/dangmai/prettier-plugin-apex.git
cd prettier-plugin-apex
npm i
npm run execute -- prettify /path/to/apex/dir
```

### License

MIT
