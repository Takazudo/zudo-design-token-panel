#!/usr/bin/env bash
# Stage the doc site and all example builds into a Cloudflare Pages deploy
# directory tree that mirrors the live URL structure.
#
# The doc site is built with Astro `base: "/pj/zudo-design-token-panel/"`,
# which means all asset URLs and links inside the build output reference
# `/pj/zudo-design-token-panel/...` — but Astro emits files to `doc/dist/`
# at the flat root. Deploying `dist/` as-is to a *.pages.dev origin would
# leave every asset URL 404'ing.
#
# This script wraps each build output into a subdirectory matching its
# deploy base path so that:
#
#   - https://<project>.pages.dev/                                        → 302 to base path
#   - https://<project>.pages.dev/pj/zudo-design-token-panel/            → doc site
#   - https://<project>.pages.dev/pj/zudo-design-token-panel/examples/astro/      → Astro example
#   - https://<project>.pages.dev/pj/zudo-design-token-panel/examples/vite-react/ → Vite+React example
#   - https://<project>.pages.dev/pj/zudo-design-token-panel/examples/next/       → Next.js example
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

echo "stage-deploy: staged ${SRC_DIR} → ${DEST_DIR}/${BASE_PATH}/"

# ── Copy example builds ──────────────────────────────────────────────────────
# Each example is built with its own base path rooted under /examples/{name}/.
# A missing dist/out is a CI ordering bug; fail loudly rather than silently
# producing a deploy tree with holes.

copy_example() {
  local label="$1"
  local src="$2"
  local dest_sub="$3"
  if [ ! -d "${src}" ]; then
    echo "stage-deploy: ERROR — ${label} build output not found: ${src}" >&2
    echo "stage-deploy: Run 'pnpm --filter ${label} build' first." >&2
    exit 1
  fi
  local dest="${DEST_DIR}/${BASE_PATH}/${dest_sub}"
  mkdir -p "${dest}"
  (cd "${src}" && cp -a . "${dest}/")
  echo "stage-deploy: staged ${src} → ${dest}/"
}

copy_example "astro-example"      "${ROOT_DIR}/examples/astro/dist"      "examples/astro"
copy_example "vite-react-example" "${ROOT_DIR}/examples/vite-react/dist"  "examples/vite-react"
copy_example "next-example"       "${ROOT_DIR}/examples/next/out"          "examples/next"

# zfb example (Sub #35): wire it now so when the workspace is added the
# script already handles it. Guard with an existence check — the workspace
# is not yet buildable so we only copy if the dist is already present.
ZFB_DIST="${ROOT_DIR}/examples/zfb/dist"
if [ -d "${ZFB_DIST}" ]; then
  copy_example "zfb-example" "${ZFB_DIST}" "examples/zfb"
else
  echo "stage-deploy: skipping examples/zfb (dist not found — workspace not yet built)"
fi

echo "stage-deploy: done. Deploy tree: ${DEST_DIR}/"
