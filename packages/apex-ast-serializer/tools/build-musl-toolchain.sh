#!/usr/bin/env bash

set -euxo pipefail

# Adapted from https://www.graalvm.org/latest/reference-manual/native-image/guides/build-static-executables/

# Specify an installation directory for musl:
export MUSL_HOME=$PWD/musl-toolchain

# Download musl and zlib sources:
curl -O https://musl.libc.org/releases/musl-1.2.4.tar.gz
curl -O https://zlib.net/fossils/zlib-1.2.13.tar.gz

# Build musl from source
tar -xzvf musl-1.2.4.tar.gz
pushd musl-1.2.4
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
tar -xzvf zlib-1.2.13.tar.gz
pushd zlib-1.2.13
CC=musl-gcc ./configure --prefix=$MUSL_HOME --static
make && make install
popd

rm -rf musl-1.2.4.tar.gz musl-1.2.4 zlib-1.2.13.tar.gz zlib-1.2.13
