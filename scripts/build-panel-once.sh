#!/usr/bin/env bash
# Build packages/zdtp once. Parallel demo prebuild scripts share this lock so
# they cannot rewrite dist at the same time, and a fresh dist is reused.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p node_modules
exec 9>node_modules/.zdtp-panel-build.lock
flock 9

dist="packages/zdtp/dist/index.js"
if [[ -f "$dist" ]]; then
  newest_src="$(find packages/zdtp/src packages/zdtp/scripts packages/zdtp/package.json packages/zdtp/vite.config.ts packages/zdtp/tsconfig.build.json -type f -printf '%T@\n' 2>/dev/null | sort -n | tail -1 || true)"
  dist_time="$(stat -c '%Y.%N' "$dist")"
  # stat %Y is seconds; find %T@ is seconds with a fraction. Compare numerically.
  if [[ -n "$newest_src" ]] && awk -v dist="$dist_time" -v src="$newest_src" 'BEGIN { exit !(dist+0 >= src+0) }'; then
    exit 0
  fi
fi

pnpm --filter @takazudo/zdtp build
