#!/usr/bin/env bash

set -euxo pipefail

# Enable corepack without prompting user, this is necessary because this script
# is run in an interactive shell, but the user does not see it unless they
# specifically run a command in the Command Palette.
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack enable
asdf reshim
pnpm install --frozen-lockfile
pnpm nx run-many -t build
gu install native-image
pnpm run build:native
