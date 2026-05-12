#!/bin/sh
# Install repo-scoped git hooks. Idempotent.
#
# Called by:
#   - `pnpm install` (via the `prepare` lifecycle script)
#   - `pnpm init-worktree` (explicit re-install, e.g. after manually wiring a
#     worktree outside the normal flow)
#
# Git worktrees all share the main repo's .git/hooks directory, so a single
# install applies everywhere. The hook itself decides whether to block based
# on the current working directory.

set -e

HOOK_MARKER="# x-wt-teams-push-guard v1"

# Skip silently when not in a git repo (e.g. extracted tarball).
GIT_COMMON_DIR=$(git rev-parse --git-common-dir 2>/dev/null) || {
  echo "install-git-hooks: not a git repo, skipping"
  exit 0
}

# Normalize to absolute path; git-common-dir is relative when run from a
# regular checkout in some git versions.
case "$GIT_COMMON_DIR" in
  /*) ;;
  *) GIT_COMMON_DIR="$(git rev-parse --show-toplevel)/$GIT_COMMON_DIR" ;;
esac

HOOKS_DIR="$GIT_COMMON_DIR/hooks"
TARGET="$HOOKS_DIR/pre-push"
SOURCE="$(git rev-parse --show-toplevel)/scripts/hooks/pre-push"

if [ ! -f "$SOURCE" ]; then
  echo "install-git-hooks: $SOURCE missing, skipping"
  exit 0
fi

# Refuse to clobber a foreign pre-push hook. If the user has husky or another
# hook manager, they need to merge our content manually.
if [ -f "$TARGET" ] && ! grep -q "$HOOK_MARKER" "$TARGET"; then
  echo "install-git-hooks: $TARGET exists but isn't ours (missing marker)."
  echo "  Move it aside or merge scripts/hooks/pre-push into it manually,"
  echo "  then re-run \`pnpm init-worktree\`."
  exit 1
fi

mkdir -p "$HOOKS_DIR"
cp "$SOURCE" "$TARGET"
chmod +x "$TARGET"
echo "install-git-hooks: installed $TARGET"
