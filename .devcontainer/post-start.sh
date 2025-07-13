#!/usr/bin/env bash

set -euxo pipefail

# This file gets run every time the container starts
mise install
mise exec -- corepack enable

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
SETTINGS_LOCATION="${SCRIPT_DIR}/../.vscode/settings.json"
JAVA_HOME="$(mise where java)"
jq --arg java_home "$JAVA_HOME" \
    '."salesforcedx-vscode-apex.java.home" = $java_home | ."java.import.gradle.java.home" = $java_home | ."java.jdt.ls.java.home" = $java_home' \
    "${SETTINGS_LOCATION}" > settings.tmp.json \
    && mv settings.tmp.json "${SETTINGS_LOCATION}"
