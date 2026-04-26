#!/usr/bin/env bash
set -euo pipefail

# Before-push comprehensive check script for zudo-design-token-panel.
# Mirrors the steps run in .github/workflows/ci.yml so failures are caught
# locally before pushing.

START_TIME=$(date +%s)
FAILURES=()

step() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "▶ $1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

pass() {
  echo "✅ $1"
}

fail() {
  echo "❌ $1"
  FAILURES+=("$1")
}

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# ── Step 1: Install dependencies ────────────────
step "Step 1/5: Install dependencies (frozen lockfile)"
if (cd "$ROOT_DIR" && pnpm install --frozen-lockfile); then
  pass "Dependencies installed"
else
  fail "Install dependencies"
fi

# ── Step 2: Build ───────────────────────────────
step "Step 2/5: Build (pnpm -r build)"
if (cd "$ROOT_DIR" && pnpm build); then
  pass "Build passed"
else
  fail "Build"
fi

# ── Step 3: Tests ───────────────────────────────
step "Step 3/5: Tests (pnpm -r test)"
if (cd "$ROOT_DIR" && pnpm test); then
  pass "All tests passed"
else
  fail "Tests"
fi

# ── Step 4: Typecheck ───────────────────────────
step "Step 4/5: Typecheck (pnpm -r typecheck)"
if (cd "$ROOT_DIR" && pnpm typecheck); then
  pass "Typecheck passed"
else
  fail "Typecheck"
fi

# ── Step 5: Lint ────────────────────────────────
step "Step 5/5: Lint (pnpm -r lint)"
if (cd "$ROOT_DIR" && pnpm lint); then
  pass "Lint passed"
else
  fail "Lint"
fi

# ── Summary ─────────────────────────────────────
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SUMMARY (${DURATION}s)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ${#FAILURES[@]} -eq 0 ]; then
  echo "✅ All checks passed! Safe to push."
  exit 0
else
  echo "❌ ${#FAILURES[@]} check(s) failed:"
  for f in "${FAILURES[@]}"; do
    echo "   - $f"
  done
  exit 1
fi
