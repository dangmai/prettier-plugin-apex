#!/usr/bin/env bash

set -euxo pipefail

# Adapted from https://www.graalvm.org/latest/reference-manual/native-image/guides/build-static-executables/

# renovate: datasource=git-tags depName=musl packageName=https://git.musl-libc.org/cgit/musl extractVersion=^v(?<version>.+)$
MUSL_VERSION="1.2.4"
# renovate: datasource=github-tags depName=zlib packageName=madler/zlib extractVersion=^v(?<version>.+)$
ZLIB_VERSION="1.2.13"

# Specify an installation directory for musl:
export MUSL_HOME=$PWD/musl-toolchain

# Download musl and zlib sources:
curl -O https://musl.libc.org/releases/musl-${MUSL_VERSION}.tar.gz
curl -LO https://github.com/madler/zlib/releases/download/v${ZLIB_VERSION}/zlib-${ZLIB_VERSION}.tar.gz

# Build musl from source
tar -xzvf musl-${MUSL_VERSION}.tar.gz
pushd musl-${MUSL_VERSION}
./configure --prefix=$MUSL_HOME --static
# The next operation may require privileged access to system resources, so use sudo
# sudo make && make install
make && make install
popd

# Install a symlink for use by native-image
ln -sf $MUSL_HOME/bin/musl-gcc $MUSL_HOME/bin/x86_64-linux-musl-gcc

# Extend the system path and confirm that musl is available by printing its version
export PATH="$MUSL_HOME/bin:$PATH"
x86_64-linux-musl-gcc --version

# Build zlib with musl from source and install into the MUSL_HOME directory
tar -xzvf zlib-${ZLIB_VERSION}.tar.gz
pushd zlib-${ZLIB_VERSION}
CC=musl-gcc ./configure --prefix=$MUSL_HOME --static
make && make install
popd

rm -rf musl-${MUSL_VERSION}.tar.gz musl-${MUSL_VERSION} zlib-${ZLIB_VERSION}.tar.gz zlib-${ZLIB_VERSION}
