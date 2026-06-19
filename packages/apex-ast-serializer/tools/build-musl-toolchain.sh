#!/usr/bin/env bash

set -euxo pipefail

# Adapted from https://www.graalvm.org/latest/reference-manual/native-image/guides/build-static-executables/

# renovate: datasource=git-tags depName=musl packageName=https://git.musl-libc.org/git/musl extractVersion=^v(?<version>.+)$
MUSL_VERSION="1.2.6"
# renovate: datasource=github-tags depName=zlib packageName=madler/zlib extractVersion=^v(?<version>.+)$
ZLIB_VERSION="1.3.2"

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

# GCC 14+ emits an internal "-latomic_asneeded" spec token that musl-gcc's -specs
# override leaks straight through to ld ("cannot find -latomic_asneeded"), because it
# bypasses the driver rewriting that would normally resolve it. x86_64 atomics are
# inlined, so satisfy the token with an empty static archive -- a no-op at link time,
# and an unused file on older GCC that never emits the token.
ar rcs "$MUSL_HOME/lib/libatomic_asneeded.a"

# Extend the system path and confirm that musl is available by printing its version
export PATH="$MUSL_HOME/bin:$PATH"
x86_64-linux-musl-gcc --version

# Build zlib with musl from source and install into the MUSL_HOME directory
tar -xzvf zlib-${ZLIB_VERSION}.tar.gz
pushd zlib-${ZLIB_VERSION}
# zlib's ./configure feature-probes rely on implicit function declarations, which
# GCC 14+ promotes to hard errors -- so the probes false-negative and gzread.c
# builds without <errno.h> (errno/EAGAIN/EWOULDBLOCK undeclared). These -Wno-* flags
# restore the pre-GCC-14 probe behavior. The upstream source-level fix is unmerged
# (tracking: madler/zlib#1168, candidate PRs #1196/#1022) and isn't in any release
# yet -- 1.3.2, pinned above, still reproduces. Next time renovate bumps ZLIB_VERSION,
# retest the native build without these flags and drop them if it's clean.
CC=musl-gcc CFLAGS="-Wno-implicit-function-declaration -Wno-implicit-int -Wno-int-conversion" \
  ./configure --prefix=$MUSL_HOME --static
make && make install
popd

# Fail loudly if zlib mis-built and produced no static lib (e.g. a future toolchain
# breaks the configure probes in a new way) instead of surfacing later as a confusing
# native-image link error.
test -f "$MUSL_HOME/lib/libz.a" || { echo "zlib build did not produce libz.a" >&2; exit 1; }

rm -rf musl-${MUSL_VERSION}.tar.gz musl-${MUSL_VERSION} zlib-${ZLIB_VERSION}.tar.gz zlib-${ZLIB_VERSION}
