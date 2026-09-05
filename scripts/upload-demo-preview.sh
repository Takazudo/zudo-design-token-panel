#!/usr/bin/env bash
# A new static Worker needs one deployment before `versions upload` is allowed.
# Bootstrap only the known missing-Worker failure, with no production routes.
set -euo pipefail

workspace="${1:?workspace required}"
worker="${2:?worker name required}"
alias="${3:?preview alias required}"
message="${4:?version message required}"
case "$workspace:$worker" in
  playground:zdtp-playground|examples/minimal:zdtp-minimal) ;;
  *) echo 'Unsupported demo workspace/Worker pair' >&2; exit 2 ;;
esac

preview_tmp=$(mktemp -d)
trap 'rm -rf "$preview_tmp"' EXIT
upload() {
  pnpm --dir "$workspace" exec wrangler versions upload \
    --preview-alias="$alias" --message="$message" 2>&1 | tee "$preview_tmp/upload.log"
}
if upload; then
  exit 0
else
  upload_status=$?
fi
if ! grep -Fq 'You cannot upload a new version of a Worker that does not yet exist.' "$preview_tmp/upload.log"; then
  exit "$upload_status"
fi

# The initial deployment deliberately has neither a custom domain nor a
# workers.dev route. Publishing production remains the main-push workflow's job.
node --input-type=module - "$workspace" "$worker" "$preview_tmp/bootstrap.json" <<'NODE'
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const [workspace, name, output] = process.argv.slice(2);
writeFileSync(output, JSON.stringify({
  name,
  compatibility_date: '2026-09-05',
  workers_dev: false,
  preview_urls: true,
  routes: [],
  assets: { directory: resolve(workspace, 'dist') },
}));
NODE
pnpm exec wrangler deploy --config "$preview_tmp/bootstrap.json" --dry-run
pnpm exec wrangler deploy --config "$preview_tmp/bootstrap.json"
upload
