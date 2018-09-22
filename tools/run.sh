#!/usr/bin/env bash

set -euxo pipefail


# Script to run prettier apex on real world project. It takes 1 argument:
# - Path to directory contains Apex Code
CURRENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"
PLUGIN_DIR="$(dirname "$CURRENT_DIR")"
echo $PLUGIN_DIR
prettier --plugin="${PLUGIN_DIR}" --write "${1}/**/*.{trigger,cls}"
