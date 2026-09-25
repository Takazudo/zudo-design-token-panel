#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
DOC_SOURCE_DIR="$ROOT_DIR/doc"
SCRATCH_DOC=""
PANEL_SPEC=""
EXPECTED_PANEL_VERSION=""
PANEL_LABEL=""
KEEP=0

usage() {
  cat <<'USAGE'
Usage:
  bash scripts/verify-packed-remount-consumer.sh --panel-version <published-version> [--keep]
  bash scripts/verify-packed-remount-consumer.sh --panel-tarball <path.tgz> [--keep]

Builds the real zfb/zudo-doc doc consumer in a disposable directory, overrides
only its packed panel version, then runs the packed SPA remount browser probe.
USAGE
}

while (($#)); do
  case "$1" in
    --panel-version)
      [[ $# -ge 2 ]] || { usage >&2; exit 2; }
      [[ -z "$PANEL_SPEC" ]] || { echo "Choose one panel source" >&2; exit 2; }
      EXPECTED_PANEL_VERSION="$2"
      if [[ ! "$EXPECTED_PANEL_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+([+-][A-Za-z0-9.-]+)?$ ]]; then
        echo "Expected an exact published semver version, got: $EXPECTED_PANEL_VERSION" >&2
        exit 2
      fi
      PANEL_SPEC="$EXPECTED_PANEL_VERSION"
      PANEL_LABEL="published @takazudo/zdtp@$EXPECTED_PANEL_VERSION"
      shift 2
      ;;
    --panel-tarball)
      [[ $# -ge 2 ]] || { usage >&2; exit 2; }
      [[ -z "$PANEL_SPEC" ]] || { echo "Choose one panel source" >&2; exit 2; }
      PANEL_TARBALL="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"
      [[ -f "$PANEL_TARBALL" ]] || { echo "Panel tarball not found: $PANEL_TARBALL" >&2; exit 2; }
      EXPECTED_PANEL_VERSION="$(node -p "require('$ROOT_DIR/packages/zdtp/package.json').version")"
      PANEL_SPEC="file:$PANEL_TARBALL"
      PANEL_LABEL="local packed candidate @takazudo/zdtp@$EXPECTED_PANEL_VERSION"
      shift 2
      ;;
    --keep)
      KEEP=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

if [[ -z "$PANEL_SPEC" ]]; then
  usage >&2
  exit 2
fi

command -v pnpm >/dev/null 2>&1 || { echo "pnpm is required" >&2; exit 1; }
command -v rsync >/dev/null 2>&1 || { echo "rsync is required" >&2; exit 1; }

TMP_ROOT="$(cd "${TMPDIR:-/tmp}" && pwd)"
SCRATCH_DOC="$(mktemp -d "$TMP_ROOT/zdtp-packed-remount.XXXXXX")"
cleanup() {
  local exit_status=$?
  if [[ "$KEEP" -eq 1 ]]; then
    echo "Retained packed consumer: $SCRATCH_DOC"
  else
    local scratch_parent="$(dirname "$SCRATCH_DOC")"
    local scratch_name="$(basename "$SCRATCH_DOC")"
    if [[ "$scratch_parent" != "$TMP_ROOT" || ! "$scratch_name" =~ ^zdtp-packed-remount\.[A-Za-z0-9]+$ ]]; then
      echo "Refusing to remove unexpected scratch path: $SCRATCH_DOC" >&2
      exit 1
    fi
    (cd "$scratch_parent" && rm -rf -- "./$scratch_name")
  fi
  exit "$exit_status"
}
trap cleanup EXIT

rsync -a \
  --exclude '.git' \
  --exclude '.zfb' \
  --exclude '.zfb-build' \
  --exclude '.wrangler' \
  --exclude 'dist' \
  --exclude 'node_modules' \
  --exclude 'pnpm-lock.yaml' \
  --exclude '.env' \
  "$DOC_SOURCE_DIR/" "$SCRATCH_DOC/"
cp "$ROOT_DIR/pnpm-workspace.yaml" "$SCRATCH_DOC/pnpm-workspace.yaml"

ROOT_WORKSPACE_FILE="$ROOT_DIR/pnpm-workspace.yaml" \
SCRATCH_WORKSPACE_FILE="$SCRATCH_DOC/pnpm-workspace.yaml" \
LOCAL_PANEL_SPEC="$PANEL_SPEC" \
node --input-type=module <<'NODE'
import { readFile, writeFile } from 'node:fs/promises';

const rootWorkspaceFile = process.env.ROOT_WORKSPACE_FILE;
const scratchWorkspaceFile = process.env.SCRATCH_WORKSPACE_FILE;
const panelSpec = process.env.LOCAL_PANEL_SPEC;
const source = await readFile(rootWorkspaceFile, 'utf8');
const marker = '\noverrides:\n';
const markerIndex = source.indexOf(marker);
const override = `  "@takazudo/zdtp": ${JSON.stringify(panelSpec)}\n`;

if (markerIndex >= 0) {
  const insertAt = markerIndex + marker.length;
  await writeFile(
    scratchWorkspaceFile,
    `${source.slice(0, insertAt)}${override}${source.slice(insertAt)}`,
    'utf8',
  );
} else {
  await writeFile(
    scratchWorkspaceFile,
    `${source.trimEnd()}\n\noverrides:\n${override}`,
    'utf8',
  );
}
NODE

echo "Installing scratch zfb/zudo-doc consumer with $PANEL_LABEL"
pnpm --dir "$SCRATCH_DOC" install --no-frozen-lockfile

EXPECTED_PANEL_VERSION="$EXPECTED_PANEL_VERSION" \
SCRATCH_DOC_DIR="$SCRATCH_DOC" \
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, realpath } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const scratchDoc = process.env.SCRATCH_DOC_DIR;
const expectedPanelVersion = process.env.EXPECTED_PANEL_VERSION;
const scratchRequire = createRequire(resolve(scratchDoc, 'package.json'));
async function packageVersion(name) {
  const packagePath = resolve(scratchDoc, 'node_modules', name, 'package.json');
  return JSON.parse(await readFile(packagePath, 'utf8')).version;
}

const panelPackagePath = resolve(scratchDoc, 'node_modules/@takazudo/zdtp/package.json');
const panelPackage = JSON.parse(await readFile(panelPackagePath, 'utf8'));
assert.equal(panelPackage.version, expectedPanelVersion,
  `Expected @takazudo/zdtp@${expectedPanelVersion}, resolved @takazudo/zdtp@${panelPackage.version}`);
const zfbVersion = await packageVersion('@takazudo/zfb');
const zudoDocVersion = await packageVersion('@takazudo/zudo-doc');
assert.equal(zfbVersion, '2.20.3', `Expected zfb@2.20.3, resolved ${zfbVersion}`);
assert.equal(zudoDocVersion, '5.27.0', `Expected zudo-doc@5.27.0, resolved ${zudoDocVersion}`);

const panelPreact = await realpath(
  scratchRequire.resolve('preact/package.json', { paths: [dirname(panelPackagePath)] }),
);
const docPreact = await realpath(scratchRequire.resolve('preact/package.json'));
assert.equal(panelPreact, docPreact,
  `Panel and zudo-doc resolved different Preact installations (${panelPreact} vs ${docPreact})`);

console.log(`Resolved @takazudo/zdtp@${panelPackage.version}`);
console.log(`Resolved @takazudo/zfb@${zfbVersion} and @takazudo/zudo-doc@${zudoDocVersion}`);
console.log(`Resolved one shared Preact installation: ${docPreact}`);
NODE

echo "Building the packed consumer site"
pnpm --dir "$SCRATCH_DOC" build

echo "Running the packed SPA remount browser regression"
pnpm --dir "$ROOT_DIR" --filter @takazudo/zdtp exec node scripts/verify-packed-remount-browser.mjs --host "$SCRATCH_DOC/dist"
