---
description: "Release @takazudo/zdtp — bump the version, prepend a changelog section, commit, push, wait for CI, then STOP before publishing (the user pushes the v* tag, which triggers the npm publish). Triggers on rough requests like \"bump version\", \"cut a release\", \"release zdtp\", \"make a release\", \"make npm release\"."
user-invocable: true
argument-description: "Optional: major, minor, patch, next, stable — controls the version bump strategy"
---

# /l-make-release

Orchestrator for releasing the `@takazudo/zdtp` npm package. Bumps the version,
prepends a changelog section, commits + pushes, waits for CI on the bump commit,
then **stops before publishing**. The user decides when to publish by pushing the
`v*` tag — that tag push triggers `.github/workflows/release.yml`, which runs the
npm publish.

The single published package is `@takazudo/zdtp` (`packages/zdtp/package.json`) —
the **version source-of-truth**. There are no lockstep packages, no platform/binary
packages, no Rust binary, and no Homebrew formula. The workspace **root**
`package.json` is private and stays as-is — do NOT bump or touch it.

## Invocation & confirmation

This skill is **model-invocable**: a rough natural-language request like "bump
version", "cut a release", or "make npm release" may trigger it. **It must never
mutate anything before the user explicitly confirms.** Steps 1–3 are read-only
(preconditions, version computation, change analysis); the first mutation is Step 4.
Always present the Step 3 proposal (current → new version + categorized changelog)
and **wait for explicit user confirmation** before proceeding to Step 4. If the
trigger was a loose phrase, restate the proposed bump plainly so the user can catch
a wrong version strategy before anything is written.

## Boundaries

- This skill **never** publishes to npm. `release.yml` does that when a `v*` tag is
  pushed.
- This skill **never** pushes the tag. It mints the tag locally (or just prints the
  command) and hands the publish decision to the user.
- This skill touches only `packages/zdtp/CHANGELOG.md` for the changelog. It does
  **not** touch the repo-root `CHANGELOG.md` (stale pre-rename history) nor the
  doc-site changelog under `doc/`.

## How release.yml publishes (context, do NOT modify it)

`.github/workflows/release.yml` triggers on `push` of any `v*` tag. It builds the
package and runs `pnpm -r publish` with a dist-tag derived from the tag name:

- Tag matching `-next.*`, `-beta.*`, or `-rc.*` → npm dist-tag **`next`**
- All other `v*` tags → npm dist-tag **`latest`**

Prerelease consumers opt in with `pnpm add @takazudo/zdtp@next`.

## Step 1: Preconditions

Before doing anything else, verify the following. If a check fails, stop with a
clear message.

1. Current branch is `main` (`git branch --show-current`).
2. `gh` CLI is authenticated (`gh auth status`).

### Resume detection (run this before requiring a clean tree)

A previous run — or a manual edit — may have already committed the version bump
without pushing the tag. Detect that state before assuming a cold start:

```bash
git fetch --tags origin
CUR=$(node -p "require('./packages/zdtp/package.json').version")
git tag -l "v$CUR"   # empty output = no tag yet for the current version
```

- **If `v$CUR` does NOT exist** and the working tree is clean: the current version
  is un-tagged. Locate the actual commit that set this version — do NOT assume it is
  `HEAD`:

  ```bash
  # The commit that introduced the current version string (the bump commit)
  BUMP_SHA=$(git log -1 --format=%H -S"\"version\": \"$CUR\"" -- packages/zdtp/package.json)
  ```

  Tell the user the bump for `v$CUR` is already committed (`$BUMP_SHA`) and offer to
  **RESUME** — skip Steps 2–5 (bump / changelog / commit) and jump straight to
  Step 6 (CI wait) + Step 7 (tag) for `v$CUR`, tagging **`$BUMP_SHA`** (not `HEAD`).

  **Guard against a moved HEAD**: if `$BUMP_SHA` is not the current `HEAD`
  (`git rev-parse HEAD`), commits landed after the bump. Surface this and let the
  user choose: (a) tag `$BUMP_SHA` as-is so the release matches the bumped version
  exactly, or (b) abort and start a fresh bump (Steps 2–5) so the newer commits are
  included and the changelog reflects them. Never silently tag `HEAD` under the old
  version.
- **If `v$CUR` already exists**: the current version is released. Proceed with a
  normal cold-start bump (Steps 2–5).

Require a **clean working tree** (`git status --porcelain` empty) only on the
cold-start (bump) path. On the resume path the tree is already clean — do not
re-bump.

## Step 2: Determine Next Version

Read the current version from `packages/zdtp/package.json` (the source-of-truth).
Apply these rules based on the optional argument:

### No argument

- If current is `X.Y.Z-next.N` (prerelease): propose `X.Y.Z-next.{N+1}`
  - Example: `0.1.0-next.2` → `0.1.0-next.3`
- If current is stable `X.Y.Z`: propose `X.{Y+1}.0-next.1`
  - Example: `0.1.0` → `0.2.0-next.1`

### `next` argument (from stable)

- Force-start a new minor prerelease: `X.{Y+1}.0-next.1`
- Example: `0.1.0` → `0.2.0-next.1`

### `major` argument

- Bump major, reset minor+patch, start prerelease: `{X+1}.0.0-next.1`
- Example: `0.1.0-next.5` → `1.0.0-next.1`, `0.1.0` → `1.0.0-next.1`

### `minor` argument

- Bump minor, reset patch, start prerelease: `X.{Y+1}.0-next.1`
- Example: `0.1.0-next.5` → `0.2.0-next.1`, `0.1.0` → `0.2.0-next.1`

### `patch` argument

- Bump patch, start prerelease: `X.Y.{Z+1}-next.1`
- Example: `0.1.0-next.5` → `0.1.1-next.1`, `0.1.0` → `0.1.1-next.1`

### `stable` argument

- Strip the `-next.N` suffix from the current prerelease.
- Requires the current version to be a `-next.N` prerelease. If it is already
  stable, stop with an error.
- Example: `0.1.0-next.5` → `0.1.0`

## Step 3: Analyze Changes and Propose

Find the latest version tag. Fetch remote tags first — a prior release may have
created its `v*` tag only on the remote, so the most recent tag can be absent from
this local checkout. Without the fetch, `git tag -l` picks a stale older tag and
the changelog base re-includes already-released commits:

```bash
git fetch --tags origin
LAST_TAG=$(git tag -l 'v*' --sort=-v:refname | head -1)
git log "$LAST_TAG"..HEAD --oneline
```

Categorize each commit by its conventional-commit prefix:

- **Breaking Changes**: commits with `!` suffix (e.g. `feat!:`) or `BREAKING CHANGE`
  in the body
- **Features**: `feat:` prefix
- **Bug Fixes**: `fix:` prefix
- **Other Changes**: everything else (`docs:`, `chore:`, `refactor:`, `ci:`,
  `test:`, `style:`, `perf:`, etc.)

Present the proposal to the user:

```
Proposed bump: {current} → {new} ({type})

Breaking Changes:
- description (hash)

Features:
- description (hash)

Bug Fixes:
- description (hash)

Other Changes:
- description (hash)
```

Only show sections that have entries. **Wait for user confirmation before
proceeding.**

## Step 4: Bump + Changelog

### 4a. Update packages/zdtp/package.json

Update the `version` field in `packages/zdtp/package.json` to the confirmed new
version (without the `v` prefix). Do NOT touch the workspace root `package.json`.

### 4b. Prepend a changelog section

`packages/zdtp/CHANGELOG.md` is version-sectioned markdown: a `# Changelog` header,
then `## <version>` sections newest-first, each with `### Fixed` / `### Features` /
etc. subsections. Insert the new `## <version>` section **immediately after the
`# Changelog` header**, above the previous newest version.

Format:

```md
## <version>

### Breaking Changes

- description (hash)

### Features

- description (hash)

### Fixed

- description (hash)

### Other Changes

- description (hash)
```

Rules:

- Only include subsections that have entries.
- Each entry: commit subject followed by the short hash in parentheses.
- Link issues/PRs where the reference is obvious from the commit subject (e.g.
  `([#310](https://github.com/Takazudo/zudo-design-token-panel/pull/310))`).

### 4c. Refresh the lockfile

```bash
pnpm install
```

This regenerates `pnpm-lock.yaml` so CI's `pnpm install --frozen-lockfile` succeeds.

**Lockfile drift heuristic** — before staging, surface added/removed lines that are
NOT simple two-space-indented entries (those are the expected version-line churn):

```bash
# PCRE (GNU grep -P / ripgrep): show +/- lines that are NOT two-space-indented
git diff pnpm-lock.yaml | grep -P '^[+-](?!  )' | head -20
# Portable fallback (BSD/macOS grep lacks -P):
# git diff pnpm-lock.yaml | awk '/^[+-]/ && !/^[+-]  / { print }' | head -20
```

If you see non-version-related structural changes, stop and surface the diff to the
user before proceeding.

## Step 5: Atomic Commit + Push

Stage and commit the bumped files in a **single commit**:

```bash
git add packages/zdtp/package.json packages/zdtp/CHANGELOG.md pnpm-lock.yaml
git commit -m "chore(release): bump to v<version>"
git push origin main
```

Record the resulting commit SHA:

```bash
BUMP_SHA=$(git rev-parse HEAD)
```

## Step 6: Wait for CI on the Bump Commit

Delegate CI polling to the `/watch-ci` skill — do NOT reimplement polling:

```
Skill(skill="watch-ci", args="--branch main --commit <BUMP_SHA>")
```

`/watch-ci` is a user-global skill, not a repo-local one. If it is unavailable in
the running session, fall back to a direct poll:

```bash
gh run watch "$(gh run list --branch main --commit <BUMP_SHA> --limit 1 --json databaseId -q '.[0].databaseId')" --exit-status
```

If CI fails, fix the issue, re-push, then re-watch before proceeding.

## Step 7: Mint the Tag, then STOP

Create the tag **locally** but do NOT push it — pushing the tag is the publish
trigger, and that decision is the user's:

```bash
git tag "v<version>" <BUMP_SHA>
```

Then print the message below **verbatim** (substitute the actual version string for
`<version>` and the resolved dist-tag for `<dist-tag>`). Resolve `<dist-tag>`:
`next` if `<version>` matches `-next.` / `-beta.` / `-rc.`, otherwise `latest`.

```
============================================================
Release bump committed and pushed to main.
CI on the bump commit: PASSED.
Local tag minted: v<version> (NOT pushed — pushing it is the publish trigger).

This version will publish under the npm dist-tag: <dist-tag>

NEXT STEP — publish when you are ready (this fires release.yml → npm publish):

  git push origin v<version>

After the Release workflow run succeeds, you can optionally create a GitHub
Release for human-readable notes (the tag already exists on the remote):

  gh release create v<version> --verify-tag --title "v<version>" \
    --notes-file <path-to-notes>

(Add --prerelease for a -next./-beta./-rc. version.)
============================================================
```

Then **STOP**. Do NOT push the tag and do NOT publish from this skill.

## Failure Recovery

### pnpm-lock.yaml drift (Step 4c)

Run the drift heuristic before staging. If non-version structural changes appear,
stop and surface the diff. Resolve the lockfile manually before re-running.

### CI fails on the bump commit (Step 6)

Fix the issue, commit the fix, push, then re-invoke `/watch-ci`. Do not mint or push
the tag until CI is green.

### Rolling back a bad bump

If the bump commit needs to be undone after it was pushed:

```bash
git revert <BUMP_SHA>
git push origin main
```

Then remove the prepended `## <version>` section from `packages/zdtp/CHANGELOG.md`
(the revert restores `package.json` and `pnpm-lock.yaml`, but verify the changelog
section is gone), and re-run `/l-make-release` from the start. If a local
`v<version>` tag was minted, delete it with `git tag -d v<version>`. If it was
already pushed and published, a new version must be cut — npm does not allow
re-publishing a version.
