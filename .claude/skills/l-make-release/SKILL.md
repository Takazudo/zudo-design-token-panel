---
description: "Release @takazudo/zdtp end-to-end — bump the version, add bilingual changelog pages, generate the package changelog, commit, push, wait for CI, validate the package, push the v* tag (which triggers the npm publish), then create the GitHub Release. Triggers on rough requests like \"bump version\", \"cut a release\", \"release zdtp\", \"make a release\", \"make npm release\"."
user-invocable: true
argument-description: "Optional: major, minor, patch, next, stable — controls the version bump strategy"
---

# /l-make-release

End-to-end release orchestrator for the `@takazudo/zdtp` npm package. It bumps the
version, adds matching English and Japanese per-version changelog pages, regenerates
the package changelog from those pages, commits + pushes, waits for CI, validates
the package, pushes the `v*` tag (which triggers `.github/workflows/release.yml` →
`pnpm -r publish`), then creates the GitHub Release. The Step 3 proposal is the one
place a human can intervene — but for a routine, unambiguous bump it **auto-proceeds**
(prints the plan, then runs straight through publish); it only **blocks for
confirmation** when a signal makes the version strategy genuinely uncertain.

The single published package is `@takazudo/zdtp` (`packages/zdtp/package.json`) —
the **version source-of-truth**. There are no lockstep packages, no platform/binary
packages, no Rust binary, and no Homebrew formula. The workspace **root**
`package.json` is private and stays as-is — do NOT bump or touch it.

## Invocation & confirmation

This skill is **model-invocable**: a rough natural-language request like "bump
version", "cut a release", or "make npm release" may trigger it. Steps 1–3 are
always read-only (preconditions, version computation, change analysis); the first
mutation is Step 4.

### The Step 3 proposal — auto-proceed by default, block only when a human is needed

Always **print** the Step 3 proposal (current → new version + categorized
changelog). Whether the skill then **waits** for confirmation depends on how routine
the bump is. The gate exists to catch a *wrong version strategy* before anything is
written — so when the strategy is obviously right, there is nothing to confirm and
the skill must **not** pause.

**Auto-proceed** — print the proposal, then run straight through to publish and
report — when ALL of these hold (the common case):

- the skill was invoked **deliberately**: the explicit `/l-make-release` slash
  command, or an explicit bump arg (`patch` / `minor` / `stable` / `next` / `major`);
- it is a **cold-start** bump — the current version is already tagged/released and
  the tree is clean (not a moved-HEAD resume);
- the computed bump has **no strategy conflict** (none of the block conditions below).

  Example (this is the canonical auto-proceed case): an explicit `/l-make-release`
  with no arg on a clean stable version, resolving to the default clean patch, with
  no breaking-change commits. Do not pause — just release.

**Block and wait** for explicit confirmation when *any* signal makes the version
strategy genuinely uncertain:

- a **breaking change** is detected but the computed bump is only a **patch** — the
  user should decide patch vs. minor (on 0.x a breaking change is a minor bump).
  This covers both ways Step 3 can detect one: a `feat!:` / `BREAKING CHANGE` commit
  in the range, **or** a candidate its public-surface check labeled
  `consumer-observable breaking change`;
- the current version is a `-next.N` prerelease **and no explicit `stable`/`next`
  arg was given** — finalizing the prerelease vs. continuing the run-up is ambiguous;
- the trigger was a **loose, model-inferred phrase** rather than an explicit
  slash-command/arg invocation — a vague "let's ship it" must never publish
  unattended;
- a **moved-HEAD** resume (Step 1) — the bump commit is not `HEAD`.

Either path — auto-proceed, or a confirmed block — authorizes the entire flow: bump,
push, tag, publish, and GitHub Release. Do **not** add a second "push the tag now?"
prompt. After Step 3 the only thing that halts the flow is a **validation failure**
(Step 7) or a CI/Release-workflow failure — see Boundaries.

**Autonomy after the gate.** Once Step 3 is confirmed, run the whole flow to
completion without pausing to ask the user to confirm any routine step — never
prompt "push the tag now?", "commit looks right?", "proceed to publish?", or the
like. **Surface-and-proceed** for anything advisory or cosmetic: an `attw` complaint,
a `node_modules`-only dependency reconciliation, a `dist-tag` warning (Step 10), or a
`pnpm-lock.yaml` that ends up unchanged. The flow stops and hands control back to the
user **only** for a genuine careful-handling problem — one that is hard to reverse or
truly ambiguous:

- a **publint** failure (Step 7) — blocks *before* the tag is pushed;
- a **CI failure** on the bump commit (Step 6), or a **Release-workflow failure**
  after the tag push (Step 8);
- **structural** (non-version) `pnpm-lock.yaml` drift (Step 4c);
- a **moved-HEAD** resume ambiguity (Step 1) — the bump commit is not `HEAD`.

For those, stop and surface the specifics so the user can decide. For everything
else, keep going.

If the trigger was a loose phrase, restate the proposed bump plainly at Step 3 so
the user can catch a wrong version strategy before anything is written.

## Boundaries

- The skill **does** push the `v*` tag and **does** create the GitHub Release — but
  only after the Step 3 confirmation. It never bypasses that confirmation.
- A **publint** validation failure (Step 7) aborts the flow **before** any tag is
  pushed — npm cannot re-publish a version, so a broken package must never reach the
  registry. **attw** output is advisory and does not block.
- The per-version MDX files under `doc/src/content/docs/changelog/` and
  `doc/src/content/docs-ja/changelog/` are the changelog source of truth.
  `packages/zdtp/CHANGELOG.md` is generated from the English pages by the docs
  build; never edit that generated file directly. The repo-root `CHANGELOG.md`
  remains stale pre-rename history and is not touched.
- The skill never runs `npm publish` directly — publishing is `release.yml`'s job,
  triggered by the tag push.

## How release.yml publishes (context, do NOT modify it)

`.github/workflows/release.yml` triggers on `push` of any `v*` tag. It builds the
package and runs `pnpm -r publish` with a dist-tag derived from the tag name:

- Tag matching `-next.*`, `-beta.*`, or `-rc.*` → npm dist-tag **`next`**
- All other `v*` tags → npm dist-tag **`latest`**

Prerelease consumers opt in with `pnpm add @takazudo/zdtp@next`.

Publish auth comes from the **`NPM_TOKEN`** GitHub Actions repo secret (an
Automation-type npm token, which bypasses 2FA in unattended CI). If a Release run
fails at the publish step with an auth/`ENEEDAUTH`/2FA error, that secret is missing
or expired — check `gh secret list` and re-add it (`gh secret set NPM_TOKEN`).

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
  **RESUME**. Resuming skips Steps 2–5 (bump / changelog / commit) and continues
  from **Step 6** (CI wait) onward — tagging **`$BUMP_SHA`** (not `HEAD`) — through
  the same validate → push tag → publish → GitHub Release path as a cold start.
  The resume confirmation is the gate (it stands in for Step 3).

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

### Versioning rule — the pre-1.0 (0.x) clean-mainline ruling

While the package is `0.x`, the everyday mainline ships **clean `0.MINOR.PATCH`
versions straight to the `latest` dist-tag — never a `-next` mainline.** This is the
npm dist-tag rule for 0.x packages (see the `/dev-npm-package` skill's "dist-tags:
`latest`, `next`, and the pre-1.0 (0.x) strategy" section): a bare
`pnpm add @takazudo/zdtp` is a direct `latest`-pointer dereference, so the only way a
tagless install always resolves the newest build is to keep `latest` on the newest
clean release. `release.yml` derives the dist-tag from the version string (a `-next.`
/ `-beta.` / `-rc.` suffix → `next`, anything clean → `latest`), so a clean bump
lands on `latest` automatically — nothing to wire up.

Therefore:

- **Breaking change → minor bump** (`0.2.0` → `0.3.0`). On 0.x the major-zero is
  itself SemVer's "anything may change" signal, so breaking changes are minor bumps.
  **"Breaking change" is whatever Step 3 detects** — a `feat!:` / `BREAKING CHANGE`
  commit, *or* a candidate its public-surface check labeled
  `consumer-observable breaking change`. That check widens what reaches this rule; it
  does not add a second rule, and there is no separate policy for a narrowing found
  without a commit marker.
- **Everything else → patch bump** (`0.2.0` → `0.2.1`).
- A `-next` **prerelease is an opt-in side channel only** (the `next` argument, plus
  the `1.0.0` run-up via `major`) — reserved for previewing a *specific* upcoming
  version *ahead of* `latest`. **Never run the mainline on `-next.N`** and **never
  mirror `next` onto `latest`**: both strand `latest` on a stale version, the exact
  footgun this rule prevents (tagless installs silently downgrade). At `1.0.0` the
  normal stable/preview split resumes automatically under the same version-derived
  dist-tag — no special-casing.

Apply these rules based on the optional argument:

### No argument (default — clean mainline → `latest`)

- If current is stable `X.Y.Z`: propose a **patch** bump `X.Y.{Z+1}` (clean).
  - Example: `0.2.0` → `0.2.1`
- If current is a prerelease `X.Y.Z-next.N`: **finalize it** — strip the suffix to
  clean `X.Y.Z`, promoting the in-progress line to stable on `latest` (identical to
  the `stable` argument). To instead continue a deliberate prerelease run-up, pass
  `next`.
  - Example: `0.2.0-next.2` → `0.2.0`

### `patch` argument (→ `latest`)

- Bump the patch of the **clean base** of the current version (drop any `-next.N`
  suffix, then `+1` patch): `X.Y.{Z+1}` (clean).
  - Example: `0.2.0` → `0.2.1`, `0.2.0-next.2` → `0.2.1`

### `minor` argument (breaking change on 0.x → `latest`)

- Bump the minor of the **clean base**, reset patch, clean (no suffix): `X.{Y+1}.0`.
  - Example: `0.2.1` → `0.3.0`, `0.2.0-next.2` → `0.3.0`

### `stable` argument (finalize a prerelease → `latest`)

- Strip the `-next.N` suffix from the current prerelease → clean `X.Y.Z`.
- Requires the current version to be a `-next.N` prerelease. If it is already
  stable, stop with an error.
- Example: `0.2.0-next.2` → `0.2.0`

### `next` argument (opt-in prerelease side channel → `next`)

- Open or continue a prerelease line published to the `next` dist-tag, *ahead of*
  `latest` — for previewing a specific upcoming version:
  - From stable `X.Y.Z`: start a new minor prerelease `X.{Y+1}.0-next.1`.
    - Example: `0.2.0` → `0.3.0-next.1`
  - From prerelease `X.Y.Z-next.N`: continue the run-up `X.Y.Z-next.{N+1}`.
    - Example: `0.3.0-next.1` → `0.3.0-next.2`

### `major` argument (`1.0.0` run-up → `next`, finalize later → `latest`)

- Start the major prerelease run-up: `{X+1}.0.0-next.1` (published to `next`).
  `1.0.0` is the one milestone that earns a deliberate `-next` / `-rc` run-up;
  finalize it later with `stable` (or no-arg), which routes the clean `1.0.0` to
  `latest`.
  - Example: `0.3.0` → `1.0.0-next.1`, `0.2.0-next.2` → `1.0.0-next.1`

## Step 3: Analyze Changes and Propose — the conditional gate

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

### Public-surface check — the prefix categorizer alone is blind

Prefixes only report what a commit message *claims*. A commit that narrows a public
API while carrying neither `!` nor a `BREAKING CHANGE` footer lands in "Other
Changes", so Step 2's breaking-change rule never fires. That is exactly how `0.5.1`
shipped a narrowed `EAGER_LOAD_GATE_STATE_FAMILY.matchesKey` as a patch with no
callout ([#814](https://github.com/Takazudo/zudo-design-token-panel/issues/814),
[#815](https://github.com/Takazudo/zudo-design-token-panel/issues/815)). Run **both**
halves below on every release — they are read-only and take a minute.

#### (a) Full textual diff of the published declaration files

Diff the emitted `.d.ts` of the last published release against the candidate. This
reads the artifact consumers actually install, and one glob covers every typed
export subpath (`.`, `./astro`, `./astro/host-adapter`, `./server`, `./testing`,
`./constants`) because they all resolve into `dist/`. The untyped subpaths —
`./astro/DesignTokenPanelHost.astro`, `./styles`, `./styles.css` — and the CLI
emit no `.d.ts`, so (b) source 2 is the only pass that covers them. No new tooling.

```bash
LAST=${LAST_TAG#v}                       # the published version behind $LAST_TAG
pnpm --filter @takazudo/zdtp build       # the candidate is not published yet, so
                                         # diff the local package folder against it
npm diff --diff="@takazudo/zdtp@$LAST" --diff=./packages/zdtp -- 'dist/**/*.d.ts'
```

Auditing an **already-published** release instead (as the worked example below
does), both operands are versions:

```bash
npm diff --diff=@takazudo/zdtp@<old> --diff=@takazudo/zdtp@<new> -- 'dist/**/*.d.ts'
```

Either form fetches the published side from the registry — expected. If `npm diff`
refuses the folder operand, fall back to `npm pack @takazudo/zdtp@$LAST`, unpack it,
and `diff -ru` the two `dist/` trees; do not skip the check.

**Read the full text, not just the signatures.** TSDoc is emitted into the `.d.ts`,
so a comment that *describes* a contract shows its rewrite here even when the
declaration beside it is byte-identical — and a signature-only comparison is
precisely the failure mode this check exists to fix. Treat each of these as a signal
to **investigate**, never as an automatic verdict:

- an added or removed export;
- a changed member set on an existing export;
- a narrowed literal or union type;
- a materially reworded contract-describing TSDoc comment.

#### (b) A compatibility disposition per candidate

(a) cannot see a runtime narrowing whose types *and* doc comments both happen to be
unchanged — a tightened regex the TSDoc never described. This half is the backstop.

Do **not** reduce it to a single "did anything narrow?" question: that is too weak
to fire reliably, and phrasing it as "exported functions and consts" under-covers
nested object members, classes, types, the Astro component, CSS exports, and the
CLI. Enumerate candidates from **four sources**:

1. declaration / export changes surfaced by (a);
2. implementation changes to any exported symbol or subpath entrypoint — including
   nested object members, classes, types, the Astro component
   (`./astro/DesignTokenPanelHost.astro`), the CSS exports (`./styles`,
   `./styles.css`), and the CLI;
3. changes to public contract docs — `packages/zdtp/PORTABLE-CONTRACT.md`,
   `packages/zdtp/README.md`, and the doc-site reference and recipe pages;
4. **changed or added tests that flip a previously accepted input to rejected**, or
   a previously expected output to a different one.

Source 4 is what makes this reliable rather than aspirational — it is mechanical and
greppable, independent of anyone's judgment about the prose. A commit that narrows a
contract almost always ships the assertion that proves it:

```bash
# assertions added, removed, or flipped in the package's own test suite
# (`expect(` occurs only in tests, so the plain `packages/zdtp/src` pathspec is
#  enough — no `**/__tests__/**` pathspec, whose wildcards git interprets
#  differently with and without `:(glob)` magic, is needed)
git diff "$LAST_TAG"..HEAD -- packages/zdtp/src | grep -E '^[-+].*expect\('
```

Read that output for a value that moved from an accepted list to a rejected one, a
`toBe(true)` that became `toBe(false)` for the same input, or a literal input string
deleted from an "accepted" fixture array.

Then label **every** candidate exactly one of:

| label | meaning |
| --- | --- |
| `additive` | new surface only; every previously valid use still behaves identically |
| `compatible behavioral fix` | behavior changed, but only where the old behavior was a bug no consumer could reasonably depend on |
| `consumer-observable breaking change` | a consumer doing something previously supported gets a different result |
| `internal` | not reachable through any export subpath, published type, CSS, or CLI |

Give **one line of evidence** per label — a diff hunk, a test assertion, a doc line.
Apply these prompts to each candidate: accepted inputs, returned outputs, thrown
errors, defaults, side effects, storage/schema/DOM/CSS behavior, and ordering or
timing.

Any candidate labeled `consumer-observable breaking change` is a **Breaking Change**
for Step 2's versioning rule and for the Step 4b changelog, regardless of what
prefix its commit carried.

#### Worked example — 0.5.0 → 0.5.1, the release this check was written for

Calibrate against the verified facts of #814:

- `matchesKey` kept its **exact** signature
  `(storagePrefix: string, key: string) => boolean` across both versions, so a
  signature-level check finds nothing — yet its accepted-input set narrowed from
  "`-state` / `-state-v<N>` for every numeric N" to four exact suffixes.
- The full textual `.d.ts` diff flags it **three times over**: the new
  `READABLE_STATE_KEY_SUFFIXES` export, the new `keySuffixes` member on
  `EAGER_LOAD_GATE_STATE_FAMILY`, and the TSDoc going from "exact -state /
  -state-vN keys, for every numeric version" to "exact readable state keys".
- Source 4 catches it independently: the commit added
  `expect(matchesKey('literal.[prefix]+', 'literal.[prefix]+-state-v9')).toBe(false)`
  — its own test suite asserting a previously-accepted input is now rejected.
- Correct disposition: **`consumer-observable breaking change`**, which under
  Step 2's rule makes the bump a **minor** on 0.x, and requires its own Breaking
  Changes entry with a `**Migration**:` line (Step 4b).

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

Public-surface findings:
- {candidate} — {label}: {one line of evidence}
```

Only show sections that have entries; always show **Public-surface findings**, even
if every candidate came back `internal` — "nothing narrowed" is a result the user
should see, not an omission. Then apply the **auto-proceed vs. block**
decision from the "Invocation & confirmation" section above:

- **Routine, unambiguous bump** (deliberate invocation, cold start, no strategy
  conflict) → do NOT wait. Continue straight to Step 4 and run the flow through
  publish + GitHub Release.
- **A block condition holds** (breaking-vs-patch mismatch, `-next.N` with no explicit
  `stable`/`next` arg, a loose model-inferred trigger, or a moved-HEAD resume) →
  **wait for user confirmation before proceeding.**

Either way — auto-proceeding, or a confirmed block — authorizes the full flow through
`npm publish` and the GitHub Release; the only thing that can stop it afterward is a
validation failure (Step 7).

## Step 4: Bump + Changelog

### 4a. Update packages/zdtp/package.json

Update the `version` field in `packages/zdtp/package.json` to the confirmed new
version (without the `v` prefix). Do NOT touch the workspace root `package.json`.

### 4b. Create the bilingual per-version changelog pages

The changelog pages are the source of truth. Create both of these files, using the
new version without a leading `v`:

- `doc/src/content/docs/changelog/<version>.mdx`
- `doc/src/content/docs-ja/changelog/<version>.mdx`

Refuse to overwrite either target if it already exists. Read the greatest numeric
`sidebar_position` from the existing English and Japanese sibling release files;
the two maxima must match. Use that maximum plus one for both new pages so the two
locale trees stay in lockstep. Use today's date for `YYYY-MM-DD`.

English file:

```mdx
---
title: "<version>"
description: Release notes for <version>.
sidebar_position: <max-plus-one>
---

Released: YYYY-MM-DD

### Breaking Changes

- description. **Migration**: the concrete adoption path a consumer switches to (hash)

### Features

- description (hash)

### Fixed

- description (hash)

### Other Changes

- description (hash)
```

Japanese file:

```mdx
---
title: "<version>"
description: "<version> のリリースノート。"
sidebar_position: <max-plus-one>
---

Released: YYYY-MM-DD

### 破壊的変更

- 説明。**移行方法**: 利用者が乗り換える具体的な手段 (hash)

### 機能

- 説明 (hash)

### バグ修正

- 説明 (hash)

### その他の変更

- 説明 (hash)
```

Only include subsections that have entries. Each English entry is the commit
subject followed by the short hash in parentheses. Translate the Japanese entry
text naturally while preserving hashes, code spans, and issue/PR links. Link
issues/PRs where the reference is obvious from the commit subject (e.g.
`([#310](https://github.com/Takazudo/zudo-design-token-panel/pull/310))`). Keep the
literal `Released:` field name in both locales because the changelog generator
parses that marker.

**Every Breaking Changes entry — in both locales — must carry a `**Migration**:`
line** naming the new adoption path: the concrete thing a consumer switches *to*,
not merely a restatement that something changed. The precedent is
`doc/src/content/docs/changelog/0.2.0.mdx` — its `min` / `max` removal entry ends with
`**Migration**: remove every min: ... and max: ... field from your token manifests.`
Use `**Migration**:` in the EN page and `**移行方法**:` in the JA page, as
`doc/src/content/docs-ja/changelog/0.5.1.mdx` does. (The JA 0.2.0 mirror shows the
label untranslated only because that page's body was never translated at all — it is
a formatting precedent, not a translation one.) An entry that arrived through Step 3's public-surface check needs
this most: the consumer has no `feat!:` marker to follow, so the migration line is
the only pointer they get.

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

### 4d. Regenerate the package changelog

Build the docs so zudo-doc regenerates `packages/zdtp/CHANGELOG.md` from the English
per-version pages:

```bash
pnpm --filter doc build
grep -F "## [<version>] - <YYYY-MM-DD>" packages/zdtp/CHANGELOG.md
```

The grep must find the newly generated release heading. Inspect the generated diff
and confirm the new release is first, older releases remain present, and the build
did not write a second changelog path. Never hand-edit the generated output.

## Step 5: Atomic Commit + Push

Stage and commit the bumped files in a **single commit**:

```bash
git add packages/zdtp/package.json packages/zdtp/CHANGELOG.md pnpm-lock.yaml \
  "doc/src/content/docs/changelog/<version>.mdx" \
  "doc/src/content/docs-ja/changelog/<version>.mdx"
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

## Step 7: Pre-publish Package Validation (publint blocks, attw advises)

npm cannot re-publish a version, so catch packaging mistakes **before** the tag is
pushed. Build locally first so validation inspects what `release.yml` will actually
publish (the CI publish runs its own build via `prepublishOnly` — this local build
is only to produce `dist/` for validation here):

```bash
pnpm --filter @takazudo/zdtp build
cd packages/zdtp
```

Run `publint` — this **blocks**. publint findings on this ESM-only, subpath-export
package are almost always real bugs (a path in `exports` that doesn't exist, a file
referenced but missing from the `files` whitelist):

```bash
pnpm dlx publint
```

If `publint` reports errors, **stop and surface them**. Do NOT push the tag — fix
the packaging issue, commit + push, re-run CI (Step 6), and re-validate.

Run `attw` and `pnpm pack` for **human review only** — do not block on them. `attw`
is built around dual ESM/CJS packages and emits noise on an ESM-only package with
multiple subpath exports; read its output, but a clean `publint` is the gate:

```bash
pnpm dlx @arethetypeswrong/cli --pack .       # advisory — review, do not block
pnpm pack --pack-destination /tmp             # then inspect the tarball contents:
tar -tzf /tmp/takazudo-zdtp-<version>.tgz | sort
cd ../..                                       # return to repo root
```

Confirm the tarball contains `dist/`, `README.md`, `CHANGELOG.md`, `LICENSE`, and
`package.json` — and nothing unexpected (no `src/`, no tests).

## Step 8: Push the Tag (triggers the publish)

Mint the tag on the bump commit and push it — the push is what fires `release.yml`:

```bash
git tag "v<version>" <BUMP_SHA>
git push origin "v<version>"
```

Then watch the Release workflow to success:

```bash
RELEASE_RUN=$(gh run list --workflow release.yml --branch "v<version>" --limit 1 --json databaseId -q '.[0].databaseId')
gh run watch "$RELEASE_RUN" --exit-status
```

If the Release workflow fails, surface the failing logs (`gh run view "$RELEASE_RUN" --log-failed`)
and stop — the npm publish did not complete. Do not create the GitHub Release until
the publish succeeds.

## Step 9: Create the GitHub Release

Extract the just-released English source page as notes, removing its frontmatter and
machine-readable `Released:` marker, then create the Release. The tag already
exists on the remote, so use `--verify-tag`. Add `--prerelease` for a `-next.` /
`-beta.` / `-rc.` version:

```bash
awk '
  NR == 1 && $0 == "---" { frontmatter = 1; next }
  frontmatter && $0 == "---" { frontmatter = 0; next }
  !frontmatter && !/^Released:/ { print }
' "doc/src/content/docs/changelog/<version>.mdx" > /tmp/zdtp-release-notes.md
PRERELEASE_FLAG=$([[ "<version>" =~ -next\.|-beta\.|-rc\. ]] && echo "--prerelease" || echo "")
gh release create "v<version>" --verify-tag --title "v<version>" $PRERELEASE_FLAG \
  --notes-file /tmp/zdtp-release-notes.md
```

## Step 10: Verify dist-tag + Report, then STOP

Confirm the publish landed under the expected dist-tag:

```bash
npm dist-tag ls @takazudo/zdtp
npm view "@takazudo/zdtp@<version>" version
```

The version should appear under **`next`** for a prerelease, **`latest`** for a
stable release.

**Warn-only dist-tag check**: if a **prerelease** version is showing under `latest`
(or `latest` points at an older prerelease — a known artifact of the very first
publish), surface a warning. Do NOT auto-fix — moving a dist-tag is a registry-level
mutation that deserves a human. The manual fix is:

```bash
npm dist-tag rm @takazudo/zdtp latest        # remove a stray prerelease from latest
# (or repoint it once a real stable ships: npm dist-tag add @takazudo/zdtp <stable> latest)
```

Print a final report: published version + dist-tag, the npm tarball URL, the Release
workflow run, and the GitHub Release URL. Then **STOP**.

## Failure Recovery

### pnpm-lock.yaml drift (Step 4c)

Run the drift heuristic before staging. If non-version structural changes appear,
stop and surface the diff. Resolve the lockfile manually before re-running.

### CI fails on the bump commit (Step 6)

Fix the issue, commit the fix, push, then re-watch CI. Do not validate or tag until
CI is green.

### publint validation fails (Step 7)

Stop before tagging. Fix the packaging issue (`exports` path, missing file in
`files`, etc.), commit + push, re-run CI (Step 6), and re-validate. Nothing is
published yet, so this is fully recoverable.

### Release workflow fails after the tag was pushed (Step 8)

The tag exists on the remote but the npm publish did not complete. Inspect
`gh run view "$RELEASE_RUN" --log-failed`. If the failure is transient (registry
hiccup), re-run the workflow: `gh run rerun "$RELEASE_RUN"`. If the fix needs a code
change, the tag must move to a new commit — delete and re-cut: `git push origin
:refs/tags/v<version>` (delete remote tag), `git tag -d v<version>`, fix, then
re-run `/l-make-release` (which will resume or cut a new version). A version that
already published successfully cannot be re-published — cut a new version instead.

### Rolling back a bad bump (before the tag was pushed)

If the bump commit needs to be undone:

```bash
git revert <BUMP_SHA>
git push origin main
```

The revert should restore `package.json`, `pnpm-lock.yaml`, both locale pages, and
the generated package changelog. Verify the two `<version>.mdx` files are gone and
`packages/zdtp/CHANGELOG.md` no longer contains the generated release heading,
delete the local tag if minted (`git tag -d v<version>`), and re-run
`/l-make-release` from the start.
