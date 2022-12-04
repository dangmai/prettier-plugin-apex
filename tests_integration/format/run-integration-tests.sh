#!/usr/bin/env bash

# This scripts manages the integration test creation and runtime.

set -euxo pipefail
CURRENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

parallel -j0 --line-buffer --no-run-if-empty --link -a "$CURRENT_DIR/test-repos.txt" "$CURRENT_DIR/debug-check-repo.sh"
