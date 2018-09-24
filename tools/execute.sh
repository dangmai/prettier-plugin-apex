#!/usr/bin/env bash

set -euxo pipefail


# Script to run prettier apex on real world project. It takes 1 argument:
# - Path to directory contains Apex Code
CURRENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"
PLUGIN_DIR="$(dirname "$CURRENT_DIR")"
node "${CURRENT_DIR}/../tests_config/set_up.js" &
prettier --plugin="${PLUGIN_DIR}" --server-auto-start=false --write "${1}/**/*.{trigger,cls}"
node "${CURRENT_DIR}/../tests_config/tear_down.js"
