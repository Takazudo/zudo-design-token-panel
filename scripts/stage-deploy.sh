#!/usr/bin/env bash
# Stage the doc site build into a Cloudflare Pages deploy directory tree.
#
# The doc site is built with zfb `base: "/"`, so it is served at the domain
# root and every asset URL / link inside the build output is root-relative.
# zfb emits files (including public/ assets and _redirects) to `doc/dist/` at
# the root, which is exactly the deploy layout — so staging is a plain copy
# of the build output into a clean `deploy/` tree:
#
#   - https://<project>.pages.dev/ → doc site

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="${1:-${ROOT_DIR}/doc/dist}"
DEST_DIR="${2:-${ROOT_DIR}/deploy}"

if [ ! -d "${SRC_DIR}" ]; then
  echo "stage-deploy: source directory not found: ${SRC_DIR}" >&2
  exit 1
fi

rm -rf "${DEST_DIR}"
mkdir -p "${DEST_DIR}"

# Copy the entire build output to the deploy root.
# Use cp -a to preserve symlinks / timestamps. _redirects already lives at
# dist/_redirects, so it lands at the deploy root where Cloudflare Pages reads it.
(cd "${SRC_DIR}" && cp -a . "${DEST_DIR}/")

echo "stage-deploy: staged ${SRC_DIR} → ${DEST_DIR}/"
echo "stage-deploy: done. Deploy tree: ${DEST_DIR}/"
