#!/usr/bin/env bash

set -euxo pipefail

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
SETTINGS_LOCATION="${SCRIPT_DIR}/../.vscode/settings.json"
TOOL_VERSIONS_LOCATION="${SCRIPT_DIR}/../.tool-versions"
JAVA_HOME="~/.asdf/installs/java/$(cat "${TOOL_VERSIONS_LOCATION}" | grep "java" | cut -d' ' -f2)"
if [ -f "${SETTINGS_LOCATION}" ];
then
  jq --arg java_home "$JAVA_HOME" \
    '."salesforcedx-vscode-apex.java.home" = $java_home | ."java.import.gradle.java.home" = $java_home' \
    "${SETTINGS_LOCATION}" > settings.tmp.json \
    && mv settings.tmp.json "${SETTINGS_LOCATION}"
fi
