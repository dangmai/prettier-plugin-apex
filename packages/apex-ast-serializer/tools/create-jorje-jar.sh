#!/bin/bash

set -euxo pipefail

URL=https://github.com/forcedotcom/salesforcedx-vscode/blob/develop/packages/salesforcedx-vscode-apex/out/apex-jorje-lsp.jar?raw=true
FILENAME=apex-jorje-lsp-original.jar
FILENAME_MINIMIZED=apex-jorje-lsp.jar

CURRENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"

function install() {
    mv ${FILENAME_MINIMIZED} "${CURRENT_DIR}/../libs/"
}

function download() {
    curl -L -o ${FILENAME} ${URL}
}


function minimize() {
    unzip -d temp ${FILENAME}
    pushd temp
    find . -not -path "." \
        -and -not -path ".." \
        -and -not -path "./apex*" \
        -and -not -path "./StandardApex*" \
        -and -not -path "./messages*" \
        -and -not -path "./com" \
        -and -not -path "./com/google" \
        -and -not -path "./com/google/common*" \
        -and -not -path "./org" \
        -and -not -path "./org/antlr" \
        -and -not -path "./org/antlr/runtime*" \
        -and -not -path "./org/objectweb*" \
        -and -not -path "./org/objectweb/asm*" \
        -print0 | xargs -0 rm -rf
    popd
    jar -cvf ${FILENAME_MINIMIZED} -C temp/ .
    rm -rf temp
}

function cleanup() {
    rm ${FILENAME}
}

download
minimize
install
cleanup
