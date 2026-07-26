#!/usr/bin/env bash
set -euo pipefail

VERSION="7.0.3"
BUILT_NPM="built/npm"
LDFLAGS="-s -w -X github.com/microsoft/typescript-go/internal/core.version=${VERSION}"
REF_PKG="${BUILT_NPM}/native-preview-darwin-arm64"

# Targets: dir-name, goos, goarch, node-cpu
TARGETS=(
  "linux-x64:linux:amd64:x64"
  "linux-arm64:linux:arm64:arm64"
  "win32-x64:windows:amd64:x64"
  "win32-arm64:windows:arm64:arm64"
)

for target in "${TARGETS[@]}"; do
  IFS=':' read -r dir goos goarch cpu <<< "$target"
  pkg_dir="${BUILT_NPM}/native-preview-${dir}"
  echo "=== Building ${dir} (${goos}/${goarch}) ==="

  # Create directory
  mkdir -p "${pkg_dir}/lib"

  # Copy shared lib files (same across all platforms)
  cp "${REF_PKG}/lib/"*.d.ts "${pkg_dir}/lib/"
  cp "${REF_PKG}/LICENSE" "${REF_PKG}/NOTICE.txt" "${REF_PKG}/README.md" "${pkg_dir}/"

  # Determine exe name
  exe="tsgo"
  [ "$goos" = "windows" ] && exe="tsgo.exe"

  # Cross-compile Go binary
  GOOS="${goos}" GOARCH="${goarch}" CGO_ENABLED=0 go build \
    -trimpath \
    -ldflags="${LDFLAGS}" \
    -tags=noembed \
    -o "${pkg_dir}/lib/${exe}" \
    ./cmd/tsgo

  # Determine OS field for package.json
  case "$dir" in
    linux-*) os_field="linux" ;;
    win32-*) os_field="win32" ;;
    darwin-*) os_field="darwin" ;;
    *) os_field="${dir%-*}" ;;
  esac

  # Create package.json
  cat > "${pkg_dir}/package.json" << PKGJSON
{
    "name": "@topce/native-preview-${dir}",
    "version": "${VERSION}",
    "license": "Apache-2.0",
    "author": "",
    "homepage": "https://github.com/topce/typescript-go",
    "description": "Preview CLI and JS API for the native TypeScript compiler port (personal fork)",
    "keywords": ["TypeScript", "compiler", "language", "javascript", "tsgo"],
    "bugs": { "url": "https://github.com/topce/typescript-go/issues" },
    "repository": { "type": "git", "url": "https://github.com/topce/typescript-go.git" },
    "type": "module",
    "preferUnplugged": true,
    "engines": { "node": ">=16.20.0" },
    "files": ["lib", "NOTICE.txt"],
    "exports": { "./package.json": "./package.json" },
    "os": ["${os_field}"],
    "cpu": ["${cpu}"],
    "gitHead": "8d29e62f3585c2fb5179e4412895aa3a8f40b9f5",
    "publishConfig": { "access": "public", "tag": "latest" }
}
PKGJSON

  echo "  ✓ Built ${pkg_dir}"
done

echo ""
echo "=== Packing ==="
for target in "${TARGETS[@]}"; do
  IFS=':' read -r dir _ _ <<< "$target"
  pkg_dir="${BUILT_NPM}/native-preview-${dir}"
  echo "Packing native-preview-${dir}..."
  (cd "${pkg_dir}" && npm pack --json > /dev/null 2>&1 && mv *.tgz "../native-preview-${dir}.tgz")
  echo "  ✓ ${BUILT_NPM}/native-preview-${dir}.tgz"
done

echo ""
echo "All platforms built and packed. Ready to publish."
ls -lh "${BUILT_NPM}"/native-preview-{linux,win32}*.tgz 2>/dev/null
