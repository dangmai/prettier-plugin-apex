#!/usr/bin/env bash

set -euxo pipefail

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
SETTINGS_LOCATION="${SCRIPT_DIR}/../.vscode/settings.json"
if [ -f "${SETTINGS_LOCATION}" ];
then
  jq --arg java_home "$JAVA_HOME" '.salesforcedx-vscode-apex.java.home = $java_home' "${SETTINGS_LOCATION}"
fi
