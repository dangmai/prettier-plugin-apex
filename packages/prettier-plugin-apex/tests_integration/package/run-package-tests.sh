#!/usr/bin/env bash

# This script tests the scenario in which a user installs the newest versions
# of Prettier and Prettier Apex from NPM.

set -euxo pipefail

function pkg-script () {
  echo $(jq --arg key "${1}" --arg val "${2}" '.scripts[$key]=$val' package.json) > package.json
  npx prettier --write package.json
}

CURRENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# If environment variable MODULE_DIR is defined, the NPM module will be initialized
# inside that directory. If not, it will be created inside the current directory.
location="${MODULE_DIR:-`echo $PWD`}"

cd "$location"
mkdir "test-npm-module"
cd test-npm-module
npm init --yes
npm install --save-dev prettier prettier-plugin-apex

jq -n -r '{"plugins": ["prettier-plugin-apex"]}' > .prettierrc.json

cp "$CURRENT_DIR/../../tests/anonymous/AnonymousBlock.cls" "$location/test-npm-module/AnonymousBlock.apex"
cp "$CURRENT_DIR/../../tests/annotated_class/AnnotatedClass.cls" "$location/test-npm-module"

pkg-script "prettier:named" "prettier AnnotatedClass.cls"
pkg-script "prettier:named:debug" "prettier --debug-check AnnotatedClass.cls"
pkg-script "prettier:anonymous" "prettier AnonymousBlock.apex"
pkg-script "prettier:anonymous:debug" "prettier --debug-check AnonymousBlock.apex"

npm run prettier:named | grep TestClass
npm run prettier:anonymous | grep Hello
npm run prettier:named:debug
npm run prettier:anonymous:debug

rm -rf "$location/test-npm-module"
