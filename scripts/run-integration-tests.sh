#!/usr/bin/env bash

set -euxo pipefail

mapfile repos <<EOF
https://github.com/afawcett/declarative-lookup-rollup-summaries.git
https://github.com/SalesforceFoundation/Cumulus.git
https://github.com/financialforcedev/fflib-apex-common.git
https://github.com/kevinohara80/sfdc-trigger-framework.git
https://github.com/financialforcedev/fflib-apex-mocks.git
EOF

for repo in ${repos[@]}; do
  rm -rf repo
  git clone --depth 1 "$repo" repo
  npm run debug-check -- "./repo/**/classes/*.cls" "./repo/**/triggers/*.trigger"
done
