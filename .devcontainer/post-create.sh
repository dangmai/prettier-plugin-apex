#!/usr/bin/env bash

set -euxo pipefail

# This file gets run once per container set up
echo 'eval "$(mise activate bash --shims)"' >> ~/.bash_profile # this sets up non-interactive sessions
echo 'eval "$(mise activate bash)"' >> ~/.bashrc       # this sets up interactive sessions

# set up default VSCode settings, this is  to prevent Gradle for Java from asking to restart later
cp .vscode/settings.default.json .vscode/settings.json || true
