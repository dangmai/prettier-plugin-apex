#!/usr/bin/env bash

set -euo pipefail

# This script checkouts a git repository and runs Prettier debug-check on it.
# It takes 1 argument: the git repository location
# If environment variable CLONE_DIR is defined, the repositories will be cloned
# to that directory. If not, it will be cloned to the current directory.
name=$(basename -s .git "$1")
location="${CLONE_DIR:-`echo $PWD`}"

rm -rf "$location/$name"
git clone --depth 1 "$1" "$location/$name"
# Here we use --no-config so that Prettier does not try to use the test repos
# Prettier config, as they may interfere with the test runs.
npm run debug-check -- "$location/$name/**/{classes,triggers}/*.{cls,trigger}" --no-config --ignore-path=./tests_integration/ignore-list.txt
rm -rf "$location/$name"
