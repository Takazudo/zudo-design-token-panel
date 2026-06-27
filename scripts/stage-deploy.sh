#!/usr/bin/env bash
# Stage the doc site build into a Cloudflare Pages deploy directory tree
# that mirrors the live URL structure.
#
# The doc site is built with zfb `base: "/pj/zudo-design-token-panel/"`,
# which means all asset URLs and links inside the build output reference
# `/pj/zudo-design-token-panel/...` — but zfb emits files to `doc/dist/`
# at the flat root (with `copyPublicWithBase: false` so public/ assets also
# land flat). Deploying `dist/` as-is to a *.pages.dev origin would leave
# every asset URL 404'ing.
#
# This script wraps the build output into a subdirectory matching the deploy
# base path so that:
#
#   - https://<project>.pages.dev/pj/zudo-design-token-panel/ → doc site

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="${1:-${ROOT_DIR}/doc/dist}"
DEST_DIR="${2:-${ROOT_DIR}/deploy}"
BASE_PATH="${BASE_PATH:-pj/zudo-design-token-panel}"

if [ ! -d "${SRC_DIR}" ]; then
  echo "stage-deploy: source directory not found: ${SRC_DIR}" >&2
  exit 1
fi

rm -rf "${DEST_DIR}"
mkdir -p "${DEST_DIR}/${BASE_PATH}"

# Copy the entire build output under the base path subdirectory.
# Use cp -a to preserve symlinks / timestamps.
(cd "${SRC_DIR}" && cp -a . "${DEST_DIR}/${BASE_PATH}/")

# _redirects must live at the deploy root for Cloudflare Pages to read it.
# zfb copies public/ flat to dist/ root (copyPublicWithBase: false), so
# _redirects lands at dist/_redirects and wraps into BASE_PATH here; move
# it back up to the deploy root.
if [ -f "${DEST_DIR}/${BASE_PATH}/_redirects" ]; then
  mv "${DEST_DIR}/${BASE_PATH}/_redirects" "${DEST_DIR}/_redirects"
fi

echo "stage-deploy: staged ${SRC_DIR} → ${DEST_DIR}/${BASE_PATH}/"
echo "stage-deploy: done. Deploy tree: ${DEST_DIR}/"
