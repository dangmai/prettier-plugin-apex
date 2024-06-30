#!/usr/bin/env bash

set -euxo pipefail

asdf install
corepack enable
asdf reshim
pnpm install --frozen-lockfile
pnpm nx run-many -t build
gu install native-image
