#!/usr/bin/env bash
# check-asset-prefix.sh — Deterministic audit that no asset / link URL in
# doc/dist escapes the configured base prefix (default: /pj/zdtp/).
#
# What this checks (and where each surface comes from):
#
#   1. HTML URL-bearing attributes  href / src / action / formaction / poster
#   2. HTML meta URL contents       og:image / og:url / og:audio / og:video
#                                   twitter:image / twitter:url
#                                   <link rel="canonical|alternate|manifest|icon|apple-touch-icon">
#   3. CSS  url(...) references in dist *.css files
#   4. JSON URL-shaped string values  "url"|"href"|"path"|"link"|"src"
#                                   in dist *.json files
#   5. llms.txt / llms-full.txt   markdown link targets
#
# A URL "escapes" the base when it is a root-relative absolute path that is
# not prefixed with /pj/zdtp/. External URLs (http / https / // / mailto / tel
# / data / blob / javascript), pure anchors, and relative paths are ignored.
#
# Doubled-prefix paths (/pj/zdtp/pj/zdtp/...) are also reported — they stay
# inside the base but produce 404s in production.
#
# Exits non-zero on any escape so CI can gate on it.

set -euo pipefail

# Resolve repo paths regardless of cwd
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOC_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DIST_DIR="${DOC_DIR}/dist"
BASE_PREFIX="${BASE_PREFIX:-/pj/zdtp}"

if [[ ! -d "${DIST_DIR}" ]]; then
  echo "error: dist not found at ${DIST_DIR} — run \`pnpm build\` first." >&2
  exit 2
fi

# A base prefix of "" or "/" means the site is deployed at the host root, so
# every absolute path is by definition "inside" the prefix and there is
# nothing meaningful to audit. Bail out early with a clear message rather
# than degenerate-matching every URL.
if [[ -z "${BASE_PREFIX}" || "${BASE_PREFIX}" == "/" ]]; then
  echo "skip: BASE_PREFIX is '${BASE_PREFIX}' (root deployment) — nothing to check." >&2
  exit 0
fi

violations=0

# Anything that looks like an absolute root path. Excludes:
#   - protocol URLs (http:// https:// ftp://)
#   - protocol-relative (//cdn...)
#   - mailto: / tel: / data: / blob: / javascript: / about:
#   - anchors (#foo)
#   - relative (./foo / ../foo / foo)
# Then keeps only those that do NOT begin with the configured base prefix.
filter_escapes() {
  awk -v prefix="${BASE_PREFIX}" '
    {
      # already iterating one URL per line
      if ($0 ~ /^[a-zA-Z][a-zA-Z0-9+.\-]*:/) next   # protocol URL
      if ($0 ~ /^\/\//) next                         # protocol-relative
      if ($0 ~ /^#/) next                            # pure anchor
      if ($0 !~ /^\//) next                          # not absolute path
      if ($0 == prefix) next                         # exact base
      if (index($0, prefix "/") == 1) next           # base + "/"
      print
    }
  ' | sort -u
}

# Detect doubled-prefix bug separately. These DO start with the prefix so they
# are filtered out by the escape check, but they are still broken at runtime.
filter_doubled_prefix() {
  awk -v prefix="${BASE_PREFIX}" '
    {
      doubled = prefix prefix "/"
      if (index($0, doubled) == 1) print
    }
  ' | sort -u
}

report_section() {
  local label="$1"
  local data="$2"
  if [[ -n "${data}" ]]; then
    printf '\n  [%s] escapes:\n' "${label}" >&2
    printf '%s\n' "${data}" | sed 's/^/    /' >&2
    violations=$((violations + 1))
  fi
}

report_doubled() {
  local label="$1"
  local data="$2"
  if [[ -n "${data}" ]]; then
    printf '\n  [%s] doubled-prefix:\n' "${label}" >&2
    printf '%s\n' "${data}" | sed 's/^/    /' >&2
    violations=$((violations + 1))
  fi
}

# ---- 1. HTML URL-bearing attributes ----
html_url_attrs=$(
  find "${DIST_DIR}" -name '*.html' -print0 |
    xargs -0 grep -hoE '(href|src|action|formaction|poster)="[^"]*"' 2>/dev/null |
    sed -E 's/^[a-z]+="//; s/"$//' || true
)
report_section "html href/src/action/formaction/poster" \
  "$(printf '%s\n' "${html_url_attrs}" | filter_escapes)"
report_doubled  "html href/src/action/formaction/poster" \
  "$(printf '%s\n' "${html_url_attrs}" | filter_doubled_prefix)"

# ---- 2. HTML meta URL contents (og / twitter / link rel) ----
html_meta_urls=$(
  find "${DIST_DIR}" -name '*.html' -print0 |
    xargs -0 grep -hoE \
      '<meta\s+(property|name)="(og:(image|url|audio|video)|twitter:(image|url))"\s+content="[^"]*"' 2>/dev/null |
    sed -E 's/.*content="//; s/"$//' || true
)
link_rel_urls=$(
  find "${DIST_DIR}" -name '*.html' -print0 |
    xargs -0 grep -hoE \
      '<link[^>]*rel="(canonical|alternate|manifest|icon|apple-touch-icon|preload|stylesheet)"[^>]*href="[^"]*"' 2>/dev/null |
    grep -oE 'href="[^"]*"' |
    sed -E 's/^href="//; s/"$//' || true
)
combined_meta=$(printf '%s\n%s\n' "${html_meta_urls}" "${link_rel_urls}")
report_section "html meta og/twitter + link rel" \
  "$(printf '%s\n' "${combined_meta}" | filter_escapes)"
report_doubled "html meta og/twitter + link rel" \
  "$(printf '%s\n' "${combined_meta}" | filter_doubled_prefix)"

# ---- 3. CSS url() references ----
css_urls=$(
  find "${DIST_DIR}" -name '*.css' -print0 |
    xargs -0 grep -hoE "url\([^)]+\)" 2>/dev/null |
    sed -E 's/^url\(\s*["'\'']?//; s/["'\'']?\s*\)$//' || true
)
report_section "css url()" \
  "$(printf '%s\n' "${css_urls}" | filter_escapes)"
report_doubled "css url()" \
  "$(printf '%s\n' "${css_urls}" | filter_doubled_prefix)"

# ---- 4. JSON URL-shaped values (search-index, doc-history, pagefind) ----
# Restrict to keys that semantically carry a URL/path so doc-history content
# (which can include literal "/CLAUDE.md" prose) does not trigger false hits.
json_urls=$(
  find "${DIST_DIR}" -name '*.json' -print0 |
    xargs -0 grep -hoE '"(url|href|path|src|link|canonical|location)":"[^"]*"' 2>/dev/null |
    sed -E 's/^"[^"]+":"//; s/"$//' || true
)
report_section "json url/href/path/src/link" \
  "$(printf '%s\n' "${json_urls}" | filter_escapes)"
report_doubled "json url/href/path/src/link" \
  "$(printf '%s\n' "${json_urls}" | filter_doubled_prefix)"

# ---- 5. llms.txt / llms-full.txt markdown link targets ----
llms_files=()
while IFS= read -r f; do llms_files+=("${f}"); done < <(
  find "${DIST_DIR}" -maxdepth 3 -name 'llms*.txt' -print
)
if (( ${#llms_files[@]} > 0 )); then
  llms_inline=$(
    grep -hoE '\]\([^)]+\)' "${llms_files[@]}" 2>/dev/null |
      sed -E 's/^\]\(//; s/\)$//' || true
  )
  report_section "llms*.txt inline links" \
    "$(printf '%s\n' "${llms_inline}" | filter_escapes)"
  report_doubled "llms*.txt inline links" \
    "$(printf '%s\n' "${llms_inline}" | filter_doubled_prefix)"

  # The llms.txt header lines emit absolute https URLs — flag doubled prefix
  # appearing in the URL path component (after the host).
  llms_abs_urls=$(
    grep -hoE 'https?://[^ )]+' "${llms_files[@]}" 2>/dev/null || true
  )
  doubled_abs=$(
    printf '%s\n' "${llms_abs_urls}" |
      awk -v prefix="${BASE_PREFIX}" '
        {
          doubled = prefix prefix "/"
          if (index($0, doubled) > 0) print
        }
      ' | sort -u
  )
  if [[ -n "${doubled_abs}" ]]; then
    printf '\n  [llms*.txt absolute https urls] doubled-prefix:\n' >&2
    printf '%s\n' "${doubled_abs}" | sed 's/^/    /' >&2
    violations=$((violations + 1))
  fi
fi

# ---- Summary ----
if (( violations > 0 )); then
  printf '\nFAIL: %d audit section(s) reported escapes or doubled prefixes.\n' \
    "${violations}" >&2
  exit 1
fi

printf 'OK: no asset URL escapes %s/ in %s\n' "${BASE_PREFIX}" "${DIST_DIR}"
