#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
HOST="legacy"
DOC_SOURCE_DIR="$ROOT_DIR/scripts/fixtures/legacy-doc"
SCRATCH_DOC=""
PANEL_SPEC=""
EXPECTED_PANEL_VERSION=""
PANEL_LABEL=""
KEEP=0

usage() {
  cat <<'USAGE'
Usage:
  bash scripts/verify-packed-remount-consumer.sh --panel-version <published-version> [--host legacy|current] [--keep]
  bash scripts/verify-packed-remount-consumer.sh --panel-tarball <path.tgz> [--host legacy|current] [--keep]

Builds either the frozen legacy ZFB 2 / zudo-doc 5 fixture (default) or the
current doc host in a disposable directory with the specified packed panel,
then runs the packed SPA remount browser probe.
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
    --host)
      [[ $# -ge 2 ]] || { usage >&2; exit 2; }
      case "$2" in legacy|current) HOST="$2" ;; *) usage >&2; exit 2 ;; esac
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

if [[ "$HOST" == "current" ]]; then
  DOC_SOURCE_DIR="$ROOT_DIR/doc"
fi

command -v pnpm >/dev/null 2>&1 || { echo "pnpm is required" >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js is required" >&2; exit 1; }

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

DOC_SOURCE_DIR="$DOC_SOURCE_DIR" SCRATCH_DOC_DIR="$SCRATCH_DOC" node --input-type=module <<'NODE'
import { cp } from 'node:fs/promises';
import { basename } from 'node:path';
const excluded = new Set(['.git', '.zfb', '.zfb-build', '.wrangler', 'dist', 'node_modules', 'pnpm-lock.yaml', '.env']);
await cp(process.env.DOC_SOURCE_DIR, process.env.SCRATCH_DOC_DIR, {
  recursive: true,
  filter: (path) => !excluded.has(basename(path)),
});
NODE
if [[ "$HOST" == "legacy" ]]; then
  mv "$SCRATCH_DOC/package.json.template" "$SCRATCH_DOC/package.json"
else
  # Only the disposable current consumer gets an untranslated page. The real
  # docs currently have no eligible EN-only page outside locale exclusions.
  cat > "$SCRATCH_DOC/src/content/docs/getting-started/migration-fallback.mdx" <<'MDX'
---
title: Migration fallback probe
sidebar_position: 99
---

[Jump to migration anchor](#migration-anchor)

## Migration anchor

This English-only page checks Japanese fallback and default-locale history.
MDX
  SCRATCH_CONFIG="$SCRATCH_DOC/zfb.config.ts" node --input-type=module <<'NODE'
import { readFile, writeFile } from 'node:fs/promises';
const path = process.env.SCRATCH_CONFIG;
const source = await readFile(path, 'utf8');
if (!source.includes('../packages/zdtp/CHANGELOG.md')) throw new Error('Review scratch changelog output isolation');
await writeFile(path, source.replace('../packages/zdtp/CHANGELOG.md', './consumer-CHANGELOG.md'));
NODE
  # Give both the static generator and actual development sidecar real local
  # history without copying this repository's .git or altering owner history.
  git -C "$SCRATCH_DOC" init --quiet
  git -C "$SCRATCH_DOC" add src/content
  git -C "$SCRATCH_DOC" -c user.name='Consumer fixture' -c user.email='fixture@example.invalid' \
    -c commit.gpgsign=false -c core.hooksPath=/dev/null commit --quiet -m 'Capture current consumer history fixture'
fi
cp "$ROOT_DIR/pnpm-workspace.yaml" "$SCRATCH_DOC/pnpm-workspace.yaml"

ROOT_WORKSPACE_FILE="$ROOT_DIR/pnpm-workspace.yaml" \
SCRATCH_WORKSPACE_FILE="$SCRATCH_DOC/pnpm-workspace.yaml" \
ROOT_PACKAGE_FILE="$ROOT_DIR/package.json" \
SCRATCH_PACKAGE_FILE="$SCRATCH_DOC/package.json" \
LOCAL_PANEL_SPEC="$PANEL_SPEC" \
node --input-type=module <<'NODE'
import { readFile, writeFile } from 'node:fs/promises';

// Both hosts own their complete dependency family; never repin a new host
// to old packages without its corresponding routes, config and styles.
const scratchPackage = JSON.parse(await readFile(process.env.SCRATCH_PACKAGE_FILE, 'utf8'));
scratchPackage.packageManager = JSON.parse(await readFile(process.env.ROOT_PACKAGE_FILE, 'utf8')).packageManager;
await writeFile(process.env.SCRATCH_PACKAGE_FILE, `${JSON.stringify(scratchPackage, null, 2)}\n`);

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

echo "Installing $HOST scratch zfb/zudo-doc consumer with $PANEL_LABEL"
pnpm --dir "$SCRATCH_DOC" install --no-frozen-lockfile

CONSUMER_HOST="$HOST" \
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
const legacy = process.env.CONSUMER_HOST === 'legacy';
const expectedZfbVersion = legacy ? '2.20.3' : '5.0.1';
const expectedDocVersion = legacy ? '5.27.0' : '8.0.0';
for (const name of ['@takazudo/zfb', '@takazudo/zfb-runtime',
  '@takazudo/zfb-adapter-cloudflare', '@takazudo/zfb-md-wasm',
  '@takazudo/zudo-doc', '@takazudo/zudo-doc-history-server']) {
  const expected = name.startsWith('@takazudo/zfb') ? expectedZfbVersion : expectedDocVersion;
  const actual = await packageVersion(name);
  assert.equal(actual, expected, `Expected ${name}@${expected}, resolved ${actual}`);
  console.log(`Resolved ${name}@${actual}`);
}

// Only the legacy host renders with Preact. The current zudo-react host must
// keep the panel's package-owned Preact tree opaque rather than share VNodes.
if (legacy) {
  const panelPreact = await realpath(
    scratchRequire.resolve('preact/package.json', { paths: [dirname(panelPackagePath)] }),
  );
  const docPreact = await realpath(scratchRequire.resolve('preact/package.json'));
  assert.equal(panelPreact, docPreact,
    `Panel and legacy zudo-doc resolved different Preact installations (${panelPreact} vs ${docPreact})`);
  console.log(`Resolved one shared legacy Preact installation: ${docPreact}`);
}
console.log(`Resolved ${process.env.CONSUMER_HOST} host with @takazudo/zdtp@${panelPackage.version}`);
NODE

echo "Building the $HOST packed consumer site"
GEN_DOC_HISTORY=1 pnpm --dir "$SCRATCH_DOC" build

echo "Running the $HOST packed SPA remount browser regression"
if [[ "$HOST" == "current" ]]; then
  # Collect independent native-host evidence even if another browser probe
  # fails; the final status remains nonzero for any failure.
  browser_status=0
  pnpm --dir "$ROOT_DIR" --filter @takazudo/zdtp exec node scripts/verify-packed-remount-browser.mjs --host "$SCRATCH_DOC/dist" --native-host || browser_status=1
  echo "Running current-host production features"
  pnpm --dir "$ROOT_DIR" --filter @takazudo/zdtp exec node scripts/verify-current-doc-browser.mjs --host "$SCRATCH_DOC/dist" || browser_status=1
  echo "Running current-host dev features with the real history sidecar"
  # Exercise a clean dev boot, not a production dist/ seed served while the
  # development compiler starts. These are generated files in our mktemp copy.
  rm -rf "$SCRATCH_DOC/dist" "$SCRATCH_DOC/.zfb-build"
  pnpm --dir "$ROOT_DIR" --filter @takazudo/zdtp exec node scripts/verify-current-doc-browser.mjs --dev "$SCRATCH_DOC" || browser_status=1
  exit "$browser_status"
else
  pnpm --dir "$ROOT_DIR" --filter @takazudo/zdtp exec node scripts/verify-packed-remount-browser.mjs --host "$SCRATCH_DOC/dist"
fi
