#!/usr/bin/env bash
# Stage doc/dist/ into a Cloudflare Pages deploy directory.
#
# The doc site is built with Astro `base: "/pj/zudo-design-token-panel/"`,
# which means all asset URLs and links inside the build output reference
# `/pj/zudo-design-token-panel/...` — but Astro emits files to `doc/dist/`
# at the flat root. Deploying `dist/` as-is to a *.pages.dev origin would
# leave every asset URL 404'ing.
#
# This script wraps the build output into a subdirectory matching the
# base path so that:
#
#   - https://<project>.pages.dev/                          → 302 to base path
#   - https://<project>.pages.dev/pj/zudo-design-token-panel/ → serves the site
#
# That matches how takazudomodular.com proxies /pj/zudo-design-token-panel/*
# to this Cloudflare Pages origin.

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
# Astro placed it under the base path because public/ is copied into outDir,
# so move it back up.
if [ -f "${DEST_DIR}/${BASE_PATH}/_redirects" ]; then
  mv "${DEST_DIR}/${BASE_PATH}/_redirects" "${DEST_DIR}/_redirects"
fi

echo "stage-deploy: staged ${SRC_DIR} → ${DEST_DIR} (base: /${BASE_PATH}/)"
