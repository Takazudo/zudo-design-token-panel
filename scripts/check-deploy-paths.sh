#!/usr/bin/env bash
#
# Deploy output safety audit.
#
# The doc site is served at the domain root (zfb `base: "/"`), so every
# emitted asset / link is root-relative and there is no sub-path for a
# reference to "escape" — the former cross-workspace sub-path containment
# checks are obsolete. What remains worth gating is information disclosure:
#
#   - Source maps (*.map) that embed an absolute build-host path
#     (/home/..., /Users/..., /runner/..., …) or this repo's worktree root.
#
# Builds both deployed workspaces (plus the panel package as a precondition)
# and greps their emitted bundles. Exits non-zero on any leak so it can gate
# CI / pre-push.

# Note: `set -e` is intentionally OFF so audit failures don't bail out before
# every check has run. Build failures are handled explicitly.
set -uo pipefail

# ── Preconditions ───────────────────────────────
# The audit relies on PCRE (`-P`) plus the `--include` flags. macOS BSD grep
# lacks -P. GNU grep and ugrep both work.
#
# Auto-detect a capable grep. Fall back to the ugrep binary embedded in the
# Claude Code CLI (available on any machine where `claude` is installed) if
# the system grep doesn't support -P.
if echo x | grep -P 'x' >/dev/null 2>&1; then
  : # system grep supports -P — nothing to do
elif _claude_bin="$(command -v claude 2>/dev/null)" && \
     ARGV0=ugrep "${_claude_bin}" -P 'x' <<< 'x' >/dev/null 2>&1; then
  # Wrap the claude binary as a grep drop-in and prepend it to PATH.
  _tmp_grep_dir=$(mktemp -d)
  cat > "${_tmp_grep_dir}/grep" << GREP_WRAPPER
#!/usr/bin/env bash
exec env ARGV0=ugrep "${_claude_bin}" "\$@"
GREP_WRAPPER
  chmod +x "${_tmp_grep_dir}/grep"
  export PATH="${_tmp_grep_dir}:${PATH}"
  # Arrange cleanup when the script exits.
  # shellcheck disable=SC2064
  trap "rm -rf '${_tmp_grep_dir}'" EXIT
  unset _claude_bin _tmp_grep_dir
elif command -v ggrep >/dev/null 2>&1 && ggrep -P 'x' <<< 'x' >/dev/null 2>&1; then
  # Homebrew installs GNU grep as ggrep; re-exec with it on PATH.
  _ggrep_dir="$(dirname "$(command -v ggrep)")"
  # shellcheck disable=SC2030,SC2031
  export PATH="${_ggrep_dir}:${PATH}"
  unset _ggrep_dir
else
  echo "❌ check-deploy-paths.sh requires a grep with PCRE support (-P flag)." >&2
  echo "   Detected: $(grep --version 2>/dev/null | head -1)" >&2
  echo "   On macOS:  brew install grep  (then add gnubin to PATH, or alias grep=ggrep)." >&2
  exit 2
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

START=$(date +%s)

# Workspaces in print order.
WORKSPACES=("doc" "playground")

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
  local script="${3:-build}"
  echo ""
  echo "▶ Building $label ($script)"
  if ! pnpm --filter "$filter" --fail-if-no-match "$script"; then
    echo "❌ Build failed: $label ($filter)"
    exit 2
  fi
}

# Audit a single workspace's emitted bundle for information disclosure.
#   $1 = label (e.g. "doc")
#   $2 = dist directory relative to ROOT_DIR (e.g. "doc/dist")
audit_workspace() {
  local label="$1"
  local dist_rel="$2"
  local dist="$ROOT_DIR/$dist_rel"
  local ws_fail=""

  section "Audit $label  (dist=$dist_rel)"

  if [ ! -d "$dist" ]; then
    echo "  ❌ dist directory not found: $dist"
    WS_FAILS["$label"]=1
    return 1
  fi

  local m

  # ── Source-map information disclosure ──────────────────────────
  # A *.map file should never embed an absolute build-host path or this
  # worktree's root. webpack:///./src/foo style paths are fine.
  m=$(grep -rnP --include='*.map' \
      '\"(/home/|/Users/|/runner/|/builds/|/private/var/folders/|/mnt/|/opt/build/)' \
      "$dist" 2>/dev/null || true)
  report_check "No build-host absolute paths in *.map files" "$m" ws_fail

  m=$(grep -rnF --include='*.map' "$ROOT_DIR" "$dist" 2>/dev/null || true)
  report_check "No worktree-root path leak in *.map files" "$m" ws_fail

  if [ -n "$ws_fail" ]; then
    WS_FAILS["$label"]=1
    echo "  ──→ $label: FAIL"
  else
    echo "  ──→ $label: PASS"
  fi
}

# ── Build phase ──────────────────────────────────
section "Step 1/2: Build (panel package + deployed workspaces)"

# The doc workspace intentionally consumes the published @takazudo/zdtp package,
# not the local workspace. Build the local panel anyway so this repository-level
# deploy audit still catches a broken package build before validating the docs.
build_one "@takazudo/zdtp" "@takazudo/zdtp"

build_one "doc" "doc"

build_one "playground" "playground" "build:deploy"

# ── Audit phase ──────────────────────────────────
section "Step 2/2: Audit each emitted bundle"

audit_workspace "doc" "doc/dist"
audit_workspace "playground" "playground/dist"

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
  echo "✅ All ${#WORKSPACES[@]} workspace bundle(s) clean (no host-path disclosure)."
  exit 0
else
  echo "❌ ${#WS_FAILS[@]} workspace(s) leaked build-host paths."
  exit 1
fi
