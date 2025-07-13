#!/usr/bin/env bash

set -euxo pipefail

# This file gets run every time the container starts
mise install
mise exec -- corepack enable
