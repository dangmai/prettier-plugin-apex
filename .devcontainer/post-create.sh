#!/usr/bin/env bash

set -euxo pipefail

# This file gets run once per container set up
echo 'eval "$(mise activate bash --shims)"' >> ~/.bash_profile # this sets up non-interactive sessions
echo 'eval "$(mise activate bash)"' >> ~/.bashrc       # this sets up interactive sessions
