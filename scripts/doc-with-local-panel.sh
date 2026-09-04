#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC_SOURCE_DIR="$ROOT_DIR/doc"
SCRATCH_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/zdtp-doc-local.XXXXXX")"
SCRATCH_DOC="$SCRATCH_ROOT/doc"
PANEL_PACK_DIR="$SCRATCH_ROOT/panel"

cleanup() {
  local exit_status=$?

  rm -rf "$SCRATCH_ROOT"
  exit "$exit_status"
}
trap cleanup EXIT

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required to run the local consumer check" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to run the local consumer check" >&2
  exit 1
fi

cd "$ROOT_DIR"
mkdir -p "$SCRATCH_DOC" "$PANEL_PACK_DIR"

PANEL_VERSION="$(node -p "require('./packages/zdtp/package.json').version")"
echo "Building local @takazudo/zdtp@$PANEL_VERSION"
pnpm --filter @takazudo/zdtp build

pnpm --filter @takazudo/zdtp pack --pack-destination "$PANEL_PACK_DIR"
PANEL_TARBALL="$(find "$PANEL_PACK_DIR" -maxdepth 1 -type f -name '*.tgz' -print -quit)"
if [[ -z "$PANEL_TARBALL" ]]; then
  echo "The panel pack command did not produce a tarball" >&2
  exit 1
fi

# Copy only the doc source. In particular, do not carry the workspace's
# node_modules, generated dist, or local VCS metadata into the scratch site.
shopt -s dotglob nullglob
for source_entry in "$DOC_SOURCE_DIR"/*; do
  source_name="${source_entry##*/}"
  case "$source_name" in
    .git|.zfb|.zfb-build|.wrangler|dist|node_modules)
      continue
      ;;
  esac
  cp -R "$source_entry" "$SCRATCH_DOC/"
done
shopt -u dotglob nullglob

# pnpm 11 ignores a package.json `pnpm` field. Keep the override disposable by
# copying the repository workspace settings into the scratch workspace and
# inserting the local packed panel there instead.
ROOT_WORKSPACE_FILE="$ROOT_DIR/pnpm-workspace.yaml" \
SCRATCH_WORKSPACE_FILE="$SCRATCH_DOC/pnpm-workspace.yaml" \
LOCAL_PANEL_TARBALL="$PANEL_TARBALL" \
node --input-type=module <<'NODE'
import { readFile, writeFile } from 'node:fs/promises';

const rootWorkspaceFile = process.env.ROOT_WORKSPACE_FILE;
const scratchWorkspaceFile = process.env.SCRATCH_WORKSPACE_FILE;
const panelTarball = process.env.LOCAL_PANEL_TARBALL;
const source = await readFile(rootWorkspaceFile, 'utf8');
const marker = '\noverrides:\n';
const markerIndex = source.indexOf(marker);
const override = `  "@takazudo/zdtp": ${JSON.stringify(`file:${panelTarball}`)}\n`;

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

echo "Installing the scratch doc with the packed panel override"
pnpm --dir "$SCRATCH_DOC" install --no-frozen-lockfile

# Verify the two peer consumers resolve the local package and the same Preact
# installation before starting the site. This is the local spike gate: a
# mismatch is actionable evidence rather than an accidental mixed dependency.
EXPECTED_PANEL_VERSION="$PANEL_VERSION" \
SCRATCH_DOC_DIR="$SCRATCH_DOC" \
node --input-type=module <<'NODE'
import { createRequire } from 'node:module';
import { readFile, realpath } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const scratchDoc = process.env.SCRATCH_DOC_DIR;
const expectedPanelVersion = process.env.EXPECTED_PANEL_VERSION;
const scratchRequire = createRequire(resolve(scratchDoc, 'package.json'));
const panelPackagePath = scratchRequire.resolve('@takazudo/zdtp/package.json');
const panelPackage = JSON.parse(await readFile(panelPackagePath, 'utf8'));
const panelRoot = dirname(panelPackagePath);
const panelPreactPath = scratchRequire.resolve('preact/package.json', { paths: [panelRoot] });
const docPreactPath = scratchRequire.resolve('preact/package.json');
const [panelPreact, docPreact] = await Promise.all([
  realpath(panelPreactPath),
  realpath(docPreactPath),
]);

if (panelPackage.version !== expectedPanelVersion) {
  throw new Error(
    `The scratch doc resolved @takazudo/zdtp@${panelPackage.version}; expected local @takazudo/zdtp@${expectedPanelVersion}`,
  );
}

if (panelPreact !== docPreact) {
  throw new Error(
    `The local panel and zudo-doc do not share Preact (${panelPreact} vs ${docPreact})`,
  );
}

console.log(`Resolved local @takazudo/zdtp@${panelPackage.version}`);
console.log(`Resolved one shared Preact installation: ${docPreact}`);
NODE

echo
echo "Local panel: @takazudo/zdtp@$PANEL_VERSION"
echo "Scratch doc: $SCRATCH_DOC"
echo "The scratch site uses a temporary pnpm-workspace.yaml override; repository package and lock files are untouched."
echo "Open http://localhost:4321/docs/getting-started/ and click the design-token-panel header trigger."
echo

pnpm --dir "$SCRATCH_DOC" dev
