#!/usr/bin/env bash

# This script tests the scenario in which a user installs the newest versions
# of Prettier and Prettier Apex from NPM.

set -euxo pipefail

function pkg-script () {
  echo $(jq --arg key "${1}" --arg val "${2}" '.scripts[$key]=$val' package.json) > package.json
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
cp "$CURRENT_DIR/AnonymousClass.cls" "$location/test-npm-module"
cp "$CURRENT_DIR/NonEmptyNamedClass.cls" "$location/test-npm-module"

pkg-script "prettier:named" "prettier NonEmptyNamedClass.cls"
pkg-script "prettier:anonymous" "prettier --parser apex-anonymous AnonymousClass.cls"

npm run prettier:named | grep NonEmptyNamedClass
npm run prettier:anonymous | grep Hello

rm -rf "$location/test-npm-module"
