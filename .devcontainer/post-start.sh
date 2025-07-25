#!/usr/bin/env bash

set -euxo pipefail

# This file gets run every time the container starts
mise install
mise exec -- corepack enable
mise exec -- pnpm install

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
SETTINGS_LOCATION="${SCRIPT_DIR}/../.vscode/settings.json"
JAVA_HOME="$(mise where java)"

jq --arg java_home "$JAVA_HOME" \
    '."salesforcedx-vscode-apex.java.home" = $java_home | ."java.import.gradle.java.home" = $java_home | ."java.jdt.ls.java.home" = $java_home' \
    "${SETTINGS_LOCATION}" > settings.tmp.json \
    && mv settings.tmp.json "${SETTINGS_LOCATION}"

# Without setting the -l arg, the VSCode tasks are brought up without invoking .bashrc or .bash_profile,
# which means mise is not activated in the terminal.
jq '."terminal.integrated.automationProfile.linux" = { "path": "/bin/bash", "args": ["-l"] }' \
    "${SETTINGS_LOCATION}" > settings.tmp.json \
    && mv settings.tmp.json "${SETTINGS_LOCATION}"

# Without setting vitest shellType to terminal, it uses child_process which
# does not have the correct environment variables set up.
jq '."vitest.shellType" = "terminal"' \
    "${SETTINGS_LOCATION}" > settings.tmp.json \
    && mv settings.tmp.json "${SETTINGS_LOCATION}"
