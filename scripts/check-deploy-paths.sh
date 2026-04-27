#!/usr/bin/env bash
#
# Cross-workspace asset-escape audit.
#
# Builds all four deploy-targeted workspaces and asserts that every emitted
# asset / link / script / inline string reference stays inside the workspace's
# own deploy sub-path. Catches the classes of failure that are easy to miss
# in eyeball review:
#
#   1. HTML attribute leaks (<link>, <script>, <img>, <a>, <source>, <iframe>,
#      <video>, <audio>, srcset, manifest, …) pointing to a root-relative path
#      that does not start with the workspace prefix.
#   2. CSS url(/...) references outside the prefix.
#   3. Embedded JS / JSON / XML string literals — including the inlined Next.js
#      flight chunks injected directly into HTML — that name an asset root
#      ("/_next/", "/_astro/", "/assets/", "/pagefind/", …) without the
#      workspace prefix in front. This catches both bare leaks and
#      wrong-subpath leaks like "/pj/zdtp/_next/…" appearing in the next
#      bundle (where the correct form is "/pj/zdtp/next/_next/…").
#   4. Source-map information disclosure: a *.map file containing an absolute
#      build-host path or this repo's worktree root.
#   5. Trailing-slash inconsistency on internal <a> links (mix of
#      "/pj/zdtp/foo" and "/pj/zdtp/foo/" pointing at the same resource).
#
# Per-workspace sub-paths (Sub #24 / epic #18):
#   doc/dist                 → /pj/zdtp/
#   examples/astro/dist      → /pj/zdtp/astro/
#   examples/vite-react/dist → /pj/zdtp/vite-react/
#   examples/next/out        → /pj/zdtp/next/
#
# Exits non-zero on any escape so it can gate CI / pre-push.

# Note: `set -e` is intentionally OFF so audit failures don't bail out before
# every workspace has been checked. Build failures are handled explicitly.
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

START=$(date +%s)

# Workspaces in print order.
WORKSPACES=("doc" "astro" "vite-react" "next")

# Per-workspace pass/fail tracker.
declare -A WS_FAILS=()

# ── helpers ─────────────────────────────────────
section() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "▶ $1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Print a check result.
#   $1 = check label
#   $2 = match output (empty = pass)
#   $3 = name of the per-workspace fail variable to bump
report_check() {
  local name="$1"
  local matches="$2"
  local ws_var="$3"
  if [ -z "$matches" ]; then
    echo "  ✅ $name"
    return 0
  fi
  echo "  ❌ $name"
  local total
  total=$(printf '%s\n' "$matches" | wc -l | tr -d ' ')
  printf '%s\n' "$matches" | head -50 | sed 's/^/      /'
  if [ "$total" -gt 50 ]; then
    echo "      … ($((total - 50)) more match line(s) suppressed)"
  fi
  printf -v "$ws_var" '%s' "1"
}

# Build one workspace by pnpm filter; abort the whole script on failure.
build_one() {
  local label="$1"
  local filter="$2"
  echo ""
  echo "▶ Building $label"
  if ! pnpm --filter "$filter" build; then
    echo "❌ Build failed: $label ($filter)"
    exit 2
  fi
}

# Audit a single workspace.
#   $1 = label (e.g. "doc")
#   $2 = dist directory relative to ROOT_DIR (e.g. "doc/dist")
#   $3 = deploy prefix WITH leading and trailing slash (e.g. "/pj/zdtp/")
audit_workspace() {
  local label="$1"
  local dist_rel="$2"
  local prefix="$3"
  local dist="$ROOT_DIR/$dist_rel"
  local prefix_no_trail="${prefix%/}"          # /pj/zdtp        | /pj/zdtp/astro
  local prefix_inner="${prefix#/}"              # pj/zdtp/        | pj/zdtp/astro/
  local ws_fail=""

  section "Audit $label  (dist=$dist_rel  prefix=$prefix)"

  if [ ! -d "$dist" ]; then
    echo "  ❌ dist directory not found: $dist"
    WS_FAILS["$label"]=1
    return 1
  fi

  local m

  # ── #1 HTML asset/link attributes ──────────────────────────────
  # Catch any href/src/etc. starting with "/" but neither the workspace
  # prefix nor "//" (protocol-relative external).
  #
  # Note: we deliberately do NOT include the generic `content=` attribute
  # here — meta description / og:title / og:description routinely contain
  # text strings that happen to start with "/" (file paths in code samples,
  # markdown like `/CLAUDE.md`, etc.) and those aren't asset URLs. The
  # subset of <meta> properties that DO carry asset URLs (og:image,
  # twitter:image, …) is checked separately as #1b below.
  m=$(grep -rnP --include='*.html' \
      "\\b(?:href|src|action|poster|data|formaction|cite|background|usemap|manifest)=[\"']/(?!/)(?!${prefix_inner})" \
      "$dist" 2>/dev/null || true)
  report_check "HTML asset/link attributes stay under $prefix" "$m" ws_fail

  # ── #1b og:image / twitter:image meta ──────────────────────────
  m=$(grep -rnP --include='*.html' \
      "<meta[^>]*\\b(?:property|name)=[\"'](?:og:image|og:image:url|og:image:secure_url|og:url|og:audio|og:video|twitter:image|twitter:image:src|twitter:url)[\"'][^>]*\\bcontent=[\"']/(?!/)(?!${prefix_inner})" \
      "$dist" 2>/dev/null || true)
  report_check "Open Graph / Twitter Card asset URLs under $prefix" "$m" ws_fail

  # ── #2 srcset entries ──────────────────────────────────────────
  # srcset values are comma-separated; the regex above only catches the
  # first URL. Extract whole srcset values and split.
  local raw_srcset srcset_escapes=""
  raw_srcset=$(grep -rohP --include='*.html' \
      "srcset=[\"'][^\"']+[\"']" \
      "$dist" 2>/dev/null || true)
  if [ -n "$raw_srcset" ]; then
    srcset_escapes=$(printf '%s\n' "$raw_srcset" \
      | sed -E "s/^srcset=[\"']//; s/[\"']$//" \
      | tr ',' '\n' \
      | sed -E 's/^[[:space:]]+//; s/[[:space:]].*$//' \
      | grep -E '^/' \
      | grep -Pv "^/(/|${prefix_inner})" \
      | sort -u || true)
  fi
  report_check "HTML srcset entries stay under $prefix" "$srcset_escapes" ws_fail

  # ── #3 CSS url() references ────────────────────────────────────
  # Cover .css plus inline <style> in HTML.
  m=$(grep -rnP --include='*.css' --include='*.html' \
      "url\\(\\s*[\"']?/(?!/)(?!${prefix_inner})" \
      "$dist" 2>/dev/null || true)
  report_check "CSS url() references stay under $prefix" "$m" ws_fail

  # ── #4 Embedded asset-root literals ────────────────────────────
  # Catches inlined chunk paths (Next flight payloads, Astro/Vite asset
  # tables, pagefind shards, …) that name a well-known asset root without
  # the workspace prefix in front.
  #
  # Two constraints make this precise:
  #
  #   (a) The match must START at a URL boundary — the asset root must be
  #       preceded by a delimiter (quote, backtick, paren, equals, comma,
  #       whitespace, '>' for HTML attrs, or a backslash for
  #       JSON-escaped-string contexts like Next flight chunks). This
  #       prevents matching against inner path segments like the "/static/"
  #       inside a perfectly correct "/pj/zdtp/next/_next/static/foo.js".
  #
  #   (b) The match must end in a real file extension. Bare framework
  #       sentinels like "/_next/", "/_next/data/", "/_next/image", and
  #       "/static/" are inlined into Next.js's runtime for feature
  #       detection; they are NOT deployment URLs that ever get navigated
  #       to. Requiring a "*.ext" tail filters them out.
  #
  # We then extract just the matched URLs (-oh), uniq them, and drop any
  # whose value (after the boundary char) starts with the workspace prefix
  # — that would be a correct, prefix-respecting reference.
  local asset_roots='_next|_astro|assets|pagefind'
  local asset_exts='js|mjs|cjs|css|map|json|wasm|woff2?|ttf|otf|eot|png|jpe?g|gif|svg|webp|avif|ico|mp4|webm|mp3|ogg|wav|pdf|xml|html?'
  local boundary="[\"'\\\`(,= >\\\\]"
  local asset_pat="${boundary}/(?:${asset_roots})/[^\"'\\\`<>\\\\\\s)\\}]*?\\.(?:${asset_exts})\\b"
  local raw_matches escapes=""
  raw_matches=$(grep -rohP \
      --include='*.html' --include='*.css' \
      --include='*.js' --include='*.mjs' --include='*.cjs' \
      --include='*.json' --include='*.webmanifest' \
      --include='*.xml' --include='*.txt' \
      "$asset_pat" \
      "$dist" 2>/dev/null | sort -u || true)
  if [ -n "$raw_matches" ]; then
    # Strip the boundary char (always 1 byte) and drop URLs that start
    # with the workspace prefix.
    escapes=$(printf '%s\n' "$raw_matches" \
      | sed -E 's/^.//' \
      | grep -Pv "^${prefix_no_trail}/" \
      | sort -u || true)
  fi
  report_check "Embedded asset-root literals (/_next/, /assets/, …) under $prefix" "$escapes" ws_fail

  # ── #5 Manifest / sitemap / feed / pagefind ────────────────────
  # Any "/..." string (or url-style value) inside these structured files
  # that is not under the workspace prefix is suspicious. Use a JSON-/XML-
  # aware match: a string literal beginning with "/" but neither "//" nor
  # the prefix.
  #
  # llms.txt / llms-full.txt are excluded on purpose. They are prose dumps
  # of the doc content (markdown collapsed to text), so they routinely
  # carry shell-snippet content like `"writeRoot": "/Users/me/work/..."`
  # which is example text, not an emitted URL.
  m=$(grep -rnP \
      --include='*.webmanifest' --include='manifest.json' \
      --include='sitemap*.xml' --include='feed*.xml' --include='rss*.xml' --include='atom*.xml' \
      --include='pagefind-*.json' --include='*-pagefind.json' \
      "[\"'>]/(?!/)(?!${prefix_inner})[a-zA-Z0-9_./-]+" \
      "$dist" 2>/dev/null || true)
  report_check "Structured outputs (manifest/sitemap/feed/pagefind) under $prefix" "$m" ws_fail

  # Also scan pagefind subdir for asset references (it has its own JSON shards).
  if [ -d "$dist/pagefind" ] || [ -d "$dist${prefix}pagefind" ]; then
    m=$(grep -rnP --include='*.json' --include='*.js' \
        "[\"']/(?!/)(?!${prefix_inner})[a-zA-Z0-9_./-]+\\.(?:json|js|css|woff2?|ttf|otf|png|jpg|jpeg|svg|gif|webp|avif)" \
        "$dist" 2>/dev/null || true)
    report_check "Pagefind shard asset URLs under $prefix" "$m" ws_fail
  fi

  # ── #6 Source-map information disclosure ───────────────────────
  # A *.map file should never embed an absolute build-host path or this
  # worktree's root. webpack:///./src/foo style paths are fine.
  m=$(grep -rnP --include='*.map' \
      '\"(/home/|/Users/|/runner/|/builds/|/private/var/folders/|/mnt/|/opt/build/)' \
      "$dist" 2>/dev/null || true)
  report_check "No build-host absolute paths in *.map files" "$m" ws_fail

  m=$(grep -rnF --include='*.map' "$ROOT_DIR" "$dist" 2>/dev/null || true)
  report_check "No worktree-root path leak in *.map files" "$m" ws_fail

  # ── #7 Trailing-slash consistency on internal <a> links ────────
  # Collect <a href="$prefix..."> targets. Strip query/hash and a single
  # trailing slash; flag if both the slashed and unslashed forms appear.
  local hrefs both
  hrefs=$(grep -rohP --include='*.html' \
      "<a [^>]*href=[\"']${prefix_no_trail}[^\"' #?>]*" \
      "$dist" 2>/dev/null \
      | sed -E 's/.*href=["'\'']//' \
      | sort -u || true)
  if [ -n "$hrefs" ]; then
    both=$(printf '%s\n' "$hrefs" | awk -v p="$prefix_no_trail" '
      {
        u = $0
        if (index(u, p) != 1) next
        is_trail = (u ~ /\/$/)
        sub("/$", "", u)
        if (u == p) next            # the prefix root itself; ignore
        if (is_trail) trail[u] = 1; else notrail[u] = 1
        seen[u] = 1
      }
      END {
        n = 0
        for (k in seen) {
          if (trail[k] && notrail[k]) {
            print k " (both " k " and " k "/ found)"
            n++
          }
        }
      }
    ' || true)
  else
    both=""
  fi
  report_check "Trailing-slash consistency on internal <a> links" "$both" ws_fail

  if [ -n "$ws_fail" ]; then
    WS_FAILS["$label"]=1
    echo "  ──→ $label: FAIL"
  else
    echo "  ──→ $label: PASS"
  fi
}

# ── Build phase ──────────────────────────────────
section "Step 1/2: Build (panel package + 4 workspaces)"

# The next-example imports @takazudo/zudo-design-token-panel through the
# package's `exports` map → ./dist/*. That dist is gitignored, so the panel
# package must be built first or `next build` will fail to resolve it.
build_one "@takazudo/zudo-design-token-panel" "@takazudo/zudo-design-token-panel"

build_one "doc"               "doc"
build_one "astro-example"     "astro-example"
build_one "vite-react-example" "vite-react-example"
build_one "next-example"      "next-example"

# ── Audit phase ──────────────────────────────────
section "Step 2/2: Audit each emitted bundle"

audit_workspace "doc"        "doc/dist"                 "/pj/zdtp/"
audit_workspace "astro"      "examples/astro/dist"      "/pj/zdtp/astro/"
audit_workspace "vite-react" "examples/vite-react/dist" "/pj/zdtp/vite-react/"
audit_workspace "next"       "examples/next/out"        "/pj/zdtp/next/"

# ── Summary ──────────────────────────────────────
END=$(date +%s)
DURATION=$((END - START))

section "SUMMARY (${DURATION}s)"

for ws in "${WORKSPACES[@]}"; do
  if [ -n "${WS_FAILS[$ws]:-}" ]; then
    echo "  ❌ $ws"
  else
    echo "  ✅ $ws"
  fi
done

echo ""
if [ "${#WS_FAILS[@]}" -eq 0 ]; then
  echo "✅ All ${#WORKSPACES[@]} workspaces stay inside their deploy sub-paths."
  exit 0
else
  echo "❌ ${#WS_FAILS[@]} workspace(s) had escapes."
  exit 1
fi
