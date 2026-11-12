# Releasing @takazudo/zdtp

This is the **single release procedure** for `@takazudo/zdtp`. Every caller
follows it: a local agent (Claude Code via `/l-make-release`), Codex (local or
Cloud via the `make-release` skill), or a human. The agent entry points
`.claude/skills/l-make-release/SKILL.md` and `.agents/skills/make-release/SKILL.md`
are thin pointers to this file. Change the rules here, not there.

Deterministic checks live in `scripts/release/` (dependency-free Node, tested
by `pnpm test:release`). `.github/workflows/release.yml` runs the same rules
again in Actions, so a caller that skips a step is still stopped before npm.

## Roles and invariants

| Who | Does |
| --- | --- |
| Caller (agent or human) | chooses the version, writes the changelog, validates the package, integrates the bump, freezes the candidate SHA, creates the tag, monitors |
| `release.yml` (GitHub Actions) | re-gates the identity, publishes to npm via OIDC, verifies the registry, creates the GitHub Release |

- **No npm credentials anywhere.** The caller needs no npm login, no
  `NPM_TOKEN`, and no `.npmrc` auth. Actions publishes through npm trusted
  publishing (OIDC). Do not create, restore, or rotate an npm token "to unblock"
  a release. Fix the OIDC configuration instead (see [Troubleshooting OIDC](#troubleshooting-oidc)).
- **One release = one SHA.** Package checks, `ci.yml`, the tag, and the npm
  provenance all refer to the same frozen candidate commit on `main`.
- **Tags are immutable.** A `v*` tag that points elsewhere stops the release.
  Never force-update or delete-and-recreate a pushed release tag.
- **Read state, don't infer it.** A red workflow does not mean npm was not
  published, and a green `pnpm publish` does not mean this run published. Use
  `node scripts/release/release.mjs status` before any recovery.
- The single published package is `packages/zdtp` (the version source of truth).
  The root `package.json` is private and is never bumped.

## Helper commands

```bash
node scripts/release/release.mjs preflight [--route direct|pr]   # environment + capabilities (read-only)
node scripts/release/release.mjs status [--version V]            # tag / npm / GitHub Release / runs → resume decision
node scripts/release/release.mjs gate --sha <SHA>                # candidate gate (read-only)
node scripts/release/release.mjs tag --sha <SHA> [--via git|api] # create v<version> at the gated SHA
node scripts/release/release.mjs find-run --ref v<V> --sha <SHA> [--since ISO] [--wait]
node scripts/release/release.mjs dispatch --ref <branch> --dry-run   # non-publishing Actions run
node scripts/release/release.mjs dispatch --ref v<V>                 # resume at an existing tag
node scripts/release/release.mjs coordinate-gate --version V --sha <SHA>  # Route C pre-check (read-only)
```

Exit codes: `0` ok, `1` refused or failed, `2` usage, `3` inconclusive or pending
(check again later; this is never a "no").

## Step 1: Preflight and resume detection

```bash
node scripts/release/release.mjs preflight --route direct   # local primary checkout
node scripts/release/release.mjs preflight --route pr       # branch + PR (Codex Cloud, linked worktree)
node scripts/release/release.mjs status                     # state of the version currently in package.json
```

`preflight` checks the checkout kind, clean state, Node 24 and the pinned pnpm,
installed dependencies, reachability of `github.com` and `registry.npmjs.org`,
and `gh` authentication plus the reported repository permissions. A successful
clone or `gh auth status` does **not** prove write rights. The tag push, PR
creation and workflow dispatch are proven only by the first write, so treat
`INFO`/`WARN` capability lines as open questions for the chosen path.

- **Dirty tree:** do not switch branches or reset over it. Decide whether it is
  a resumable release (below) or unrelated work, and handle that deliberately.
- **Linked worktree:** pushing is blocked by the repository pre-push hook (see
  `CLAUDE.md`). Never bypass it. Use the PR route, or run from the primary
  checkout.

Read `status.resume.state` for the current version:

| state | meaning | continue at |
| --- | --- | --- |
| `complete` | tagged, on npm, GitHub Release exists | Step 2 (a new bump) |
| `untagged` | the bump is committed (possibly integrated), no tag | Step 6 with the integrated commit; **no new bump** |
| `tagged-unpublished` | tag exists, npm does not have the version | [Recovery](#failure-recovery) |
| `published-unfinalized` | npm has it, GitHub Release missing | [Recovery](#failure-recovery): finalize only |
| `anomaly` | npm has it but the tag is missing | stop and investigate |

For `untagged`, find the commit that introduced the version:

```bash
CUR=$(node -p "require('./packages/zdtp/package.json').version")
git log -1 --format=%H -S"\"version\": \"$CUR\"" origin/main -- packages/zdtp/package.json
```

If that bump commit is not the tip of `main`, newer commits landed after it.
Ask the user whether to (a) release the bump commit as-is (the changelog
matches it exactly), or (b) cut a new bump that includes the newer commits.
Never tag a newer commit under the old version's changelog.

## Step 2: Determine the next version

The current version comes from `packages/zdtp/package.json`.

**Pre-1.0 (0.x) clean-mainline rule.** While the package is `0.x`, the mainline
ships clean `0.MINOR.PATCH` versions to `latest`, never a `-next` mainline. A
bare `pnpm add @takazudo/zdtp` dereferences `latest`, so `latest` must always
be the newest clean release.

- **Breaking change → minor** (`0.2.0` → `0.3.0`). "Breaking" is whatever Step 3
  detects: a `feat!:` / `BREAKING CHANGE` commit, *or* a candidate labeled
  `consumer-observable breaking change` by the public-surface check.
- **Everything else → patch** (`0.2.0` → `0.2.1`).
- `-next.N` is an opt-in side channel only (the `next` argument, and the `1.0.0`
  run-up via `major`). Never run the mainline on `-next.N`, and never mirror
  `next` onto `latest`.

| argument | from stable `X.Y.Z` | from `X.Y.Z-next.N` | dist-tag |
| --- | --- | --- | --- |
| *(none)* | `X.Y.{Z+1}` | `X.Y.Z` (finalize) | latest |
| `patch` | `X.Y.{Z+1}` | `X.Y.{Z+1}` | latest |
| `minor` | `X.{Y+1}.0` | `X.{Y+1}.0` | latest |
| `stable` | error (already stable) | `X.Y.Z` | latest |
| `next` | `X.{Y+1}.0-next.1` | `X.Y.Z-next.{N+1}` | next |
| `major` | `{X+1}.0.0-next.1` | `{X+1}.0.0-next.1` | next |

The dist-tag is derived from the version by `release.yml`: `-next.N`, `-beta.N`,
`-rc.N` → `next`, clean → `latest`. Any other prerelease suffix is refused.

## Step 3: Analyze changes and propose (the confirmation gate)

```bash
git fetch --tags origin
LAST_TAG=$(git tag -l 'v*' --sort=-v:refname | head -1)
git log "$LAST_TAG"..origin/main --oneline
```

Categorize commits by conventional prefix: **Breaking Changes** (`!` or
`BREAKING CHANGE`), **Features** (`feat:`), **Bug Fixes** (`fix:`), **Other
Changes** (everything else).

### Public-surface check (run both halves every release)

Prefixes report only what a commit claims. `0.5.1` shipped a narrowed
`EAGER_LOAD_GATE_STATE_FAMILY.matchesKey` as a patch with no callout
([#814](https://github.com/Takazudo/zudo-design-token-panel/issues/814),
[#815](https://github.com/Takazudo/zudo-design-token-panel/issues/815)).

**(a) Full textual diff of the published declarations.** One glob covers every
typed export subpath (`.`, `./astro`, `./astro/host-adapter`, `./server`,
`./testing`, `./constants`, `./dashboard`, `./dashboard/client`):

```bash
LAST=${LAST_TAG#v}
pnpm --filter @takazudo/zdtp build
npm diff --diff="@takazudo/zdtp@$LAST" --diff=./packages/zdtp -- 'dist/**/*.d.ts'
```

If `npm diff` refuses the folder operand, `npm pack @takazudo/zdtp@$LAST`,
unpack it, and `diff -ru` the `dist/` trees; do not skip the check. Read the
full text, including TSDoc. Each of these is a signal to investigate: an
added or removed export, a changed member set, a narrowed literal or union, or
a materially reworded contract-describing comment.

**(b) A compatibility disposition per candidate.** Enumerate candidates from
four sources:

1. declaration and export changes from (a);
2. implementation changes to any exported symbol or subpath: nested members,
   classes, types, the Astro component `./astro/DesignTokenPanelHost.astro`,
   the CSS exports (`./styles`, `./styles.css`, `./dashboard/styles.css`), and
   the CLI;
3. public contract docs: `packages/zdtp/PORTABLE-CONTRACT.md`,
   `packages/zdtp/README.md`, and the doc-site reference and recipe pages;
4. **tests that flip a previously accepted input to rejected**, or change an
   expected output:

   ```bash
   git diff "$LAST_TAG"..origin/main -- packages/zdtp/src | grep -E '^[-+].*expect\('
   ```

Label every candidate exactly one of `additive`, `compatible behavioral fix`,
`consumer-observable breaking change`, or `internal`, each with one line of
evidence (a diff hunk, a test assertion, or a doc line). Consider accepted
inputs, outputs, thrown errors, defaults, side effects, storage/schema/DOM/CSS
behavior, and ordering or timing. A `consumer-observable breaking change` is a
Breaking Change for Step 2 and Step 4b, whatever its commit prefix.

*Calibration (0.5.0 → 0.5.1, #814):* `matchesKey` kept its exact signature, but
the `.d.ts` diff showed a new `READABLE_STATE_KEY_SUFFIXES` export, a new
`keySuffixes` member, and reworded TSDoc. Source 4 independently showed
`expect(matchesKey('literal.[prefix]+', 'literal.[prefix]+-state-v9')).toBe(false)`.
Correct disposition: breaking → minor on 0.x, with a `**Migration**:` line.

### The proposal

Always print:

```
Proposed bump: {current} → {new} ({type})
Breaking Changes / Features / Bug Fixes / Other Changes: - description (hash)
Public-surface findings:
- {candidate} — {label}: {one line of evidence}
```

Show only non-empty sections, but always show **Public-surface findings**.

**Auto-proceed** (print, then continue without waiting) when **all** hold: the
release was requested deliberately (an explicit release command or bump
argument); it is a cold start (the current version is already released and the
tree is clean); and no block condition applies.

**Block for explicit confirmation** when any holds: a breaking change is
detected but the computed bump is only a patch; the current version is
`-next.N` and no `stable`/`next` argument was given; the trigger was a loose
phrase ("let's ship it"); or the resume is a moved-HEAD resume (Step 1).

Either path authorizes the whole flow: bump, integration, tag, publish, and
GitHub Release. Do not add later "push the tag now?" prompts. After this gate
the flow stops only for publint failure, CI failure, structural lockfile drift,
a gate refusal, or a Release-workflow failure. Surface everything advisory
(attw noise, an unchanged lockfile, a dist-tag warning) and keep going.

## Step 4: Bump and changelog

**4a.** Set `version` in `packages/zdtp/package.json` (no `v`). Do not touch the
root `package.json`.

**4b.** Create both pages and refuse to overwrite existing ones:

- `doc/src/content/docs/changelog/<version>.mdx`
- `doc/src/content/docs-ja/changelog/<version>.mdx`

Use `sidebar_position` = (the greatest existing value, which must be equal in
both locales) + 1, and today's date.

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

Include only sections that have entries. English entries are the commit subject
plus the short hash. Translate the Japanese entries naturally, and keep hashes,
code spans, and issue/PR links. Keep the literal `Released:` marker in both
locales; the changelog generator parses it. Every Breaking Changes entry carries
`**Migration**:` (EN) / `**移行方法**:` (JA) naming the concrete new adoption
path (precedents: `0.2.0.mdx`, `docs-ja/changelog/0.5.1.mdx`). The English page
is also the GitHub Release body: `release.yml` reads it from the tagged commit.

**4c.** Refresh the lockfile, then check for structural drift:

```bash
pnpm install
git diff pnpm-lock.yaml | awk '/^[+-]/ && !/^[+-]  / && !/^(\+\+\+|---)/ { print }' | head -20
```

Stop and surface any non-version structural change.

**4d.** Regenerate the package changelog (never hand-edit it):

```bash
pnpm --filter doc build
grep -F "## [<version>] - <YYYY-MM-DD>" packages/zdtp/CHANGELOG.md
```

The new release must be first, older releases must remain, and no second
changelog path may appear. The repo-root `CHANGELOG.md` is stale pre-rename
history and is left alone.

## Step 5: Validate the package (publint blocks, attw advises)

npm cannot re-publish a version, so validate before anything is tagged:

```bash
pnpm --filter @takazudo/zdtp build
(cd packages/zdtp && pnpm dlx publint)                         # BLOCKING
(cd packages/zdtp && pnpm dlx @arethetypeswrong/cli --pack .)   # advisory only
PACK_DIR=$(mktemp -d) && pnpm --filter @takazudo/zdtp pack --pack-destination "$PACK_DIR"
tar -tzf "$PACK_DIR"/takazudo-zdtp-<version>.tgz | sort
```

The tarball must contain `dist/`, `README.md`, `CHANGELOG.md`, `LICENSE`, and
`package.json`, and nothing unexpected (no `src/`, no tests). On a publint
error, fix it, re-run Step 4d/5, and continue. Nothing is published yet.

## Step 6: Integrate and freeze the candidate SHA

Commit exactly the release files in one commit:

```bash
git add packages/zdtp/package.json packages/zdtp/CHANGELOG.md pnpm-lock.yaml \
  "doc/src/content/docs/changelog/<version>.mdx" "doc/src/content/docs-ja/changelog/<version>.mdx"
git commit -m "chore(release): bump to v<version>"
```

Then integrate via the route `preflight` allowed:

- **Direct (primary local checkout on `main`):** `git push origin main`.
  Never from a linked worktree, and never with the hook bypass.
- **PR (Codex Cloud, worktrees, or whenever direct push is unavailable):** push
  a fresh branch `release/v<version>` (or let Codex create the PR from its
  branch), open a PR to `main`, wait for its checks, and merge it with a regular
  merge. A Codex Cloud task opens the PR through Codex's GitHub connection when
  the agent has no `gh` write access. A human then merges it.

**Freeze the candidate:** the candidate is the commit on `origin/main` that
the integration produced (the pushed bump commit, or the PR merge commit).
Record it immediately, before anything else lands:

```bash
git fetch origin main
SHA=<the integrated commit>        # e.g. the PR's mergeCommit.oid, or the pushed HEAD
git show "$SHA:packages/zdtp/package.json" | grep '"version"'   # must be <version>
```

Use that full SHA for every later step. Do **not** use "whatever `main` is now":
another merge may have landed in between.

## Step 7: Candidate gate (CI for exactly this SHA)

```bash
node scripts/release/release.mjs gate --sha "$SHA"
```

The gate checks that `packages/zdtp/package.json` at `$SHA` equals the tag
version, and that the version suffix is supported; that `$SHA` is reachable
from `origin/main`; that `.github/workflows/ci.yml` (selected by workflow path)
has a **push run on `main` whose `head_sha` is exactly `$SHA`** and that it
succeeded (a deploy workflow or another commit's run never counts); that the
tag is absent or already at `$SHA` (elsewhere = stop); and that the registry is
not about to be regressed (`latest`/`next` would move backwards → refuse;
already published → finalize-only).

Exit `3` with `CI_PENDING` prints the exact run to watch:
`gh run watch <id> --exit-status`. Then re-run the gate. `ci.yml` cancels
in-progress runs per ref, so a later push to `main` can cancel the candidate's
run. The gate then reports `cancelled` with the exact `gh run rerun <id>`
command. Re-run that run once `main`'s current `ci.yml` run has finished
(re-running it earlier cancels the tip's run); don't make a new commit. If CI genuinely fails, fix the
problem through a new commit. That is a new candidate, so it means a new bump
only if the release files must change; otherwise re-freeze `$SHA` at the fix
commit, which still carries `<version>`, and re-gate.

## Step 8: Tag (starts the publish)

```bash
node scripts/release/release.mjs tag --sha "$SHA"            # git push of the tag
node scripts/release/release.mjs tag --sha "$SHA" --via api  # GitHub API ref creation (no git push rights)
```

`tag` re-runs the gate, creates a lightweight `v<version>` at exactly `$SHA`,
reads the remote back, and prints `since` (the time before the push). An
existing identical tag is a no-op, and a conflicting one stops the command. The
tag push (by a user credential, git or API) triggers `release.yml`. A tag made
by a workflow's own `GITHUB_TOKEN` does not start push-triggered workflows, so
the only Actions-side tagging path is the coordinator below, which dispatches
`release.yml` explicitly.

### Step 8 (Route C): release coordinator — Claude Code Cloud and other callers without tag rights

Claude Code Cloud's git proxy refuses tag pushes (HTTP 403), and its `gh` has
no login. Do **not** work around that with a PAT, an npm token or a second
credential. Instead, dispatch `.github/workflows/release-coordinator.yml` on
`main` with the frozen candidate:

| input | value |
| --- | --- |
| `version` | `packages/zdtp/package.json` version at `$SHA` (no `v`) |
| `sha` | the full 40-character `$SHA` from Step 6 |
| `dry_run` | `true` runs only the read-only gate; `false` tags and dispatches |

Run the same checks locally first (read-only, no credentials needed):

```bash
node scripts/release/release.mjs coordinate-gate --version <version> --sha "$SHA"
```

The coordinator's jobs, each with only the permissions it needs:

1. **gate** (`contents: read`, `actions: read`): dispatched from `main`;
   version equals `package.json` at `$SHA`; `$SHA` reachable from `main`;
   `ci.yml` push run on `main` green for exactly `$SHA`; tag absent or already
   at `$SHA` (elsewhere fails); registry readable and not regressed. A registry
   or network error fails the run; it is never read as "not published". A
   version already on npm with no tag is an `ANOMALY` and stops.
2. **tag** (`contents: write`): re-runs the gate, then creates `v<version>`
   at `$SHA` through the REST API with the run's `GITHUB_TOKEN`. An identical
   existing tag (a re-sent request, or a concurrent coordinator that won the
   race) is a no-op; a tag at another commit fails. It never moves or deletes
   a tag. A 403 here means a repository setting or ruleset blocks Actions from
   creating tags: report it, do not bypass it.
3. **dispatch** (`actions: write`): dispatches `release.yml` at `v<version>`
   (`dry_run=false`). If the newest real `release.yml` run for that tag and SHA
   is still active or succeeded, it is reused instead of dispatched again. Dry
   runs (titled `Release v<version> (dry run)`) never count.

`release.yml` then runs exactly as for a pushed tag: its own gate, the OIDC
publish (the only job with `id-token: write`; trusted publisher `release.yml`,
no environment, unchanged), registry verification and the GitHub Release. The
coordinator holds no npm credential and never publishes.

**How to start it.** From the Actions tab: *Release coordinator* → *Run
workflow* → branch `main` → fill `version` and `sha`. A Cloud agent may start
it with its GitHub tool (`run_workflow` on `release-coordinator.yml`, ref
`main`) when that tool has `actions: write`; whether it does is only proven by
the first dispatch. If the agent cannot dispatch, it stops after Step 7 and
hands the person the two inputs; it does not create tokens to get around it.

**Resume.** Re-dispatching with the same inputs is always safe: an identical
tag is kept and an active or successful release run is reused. If the
dispatch job failed after the tag was created, re-run the coordinator (or
`release.mjs dispatch --ref v<version>` from a credentialed shell). Then
continue with Step 9 using `--event workflow_dispatch`; the run is at ref
`v<version>`.

**What is still not Cloud-only.** Nothing in this package needs a
platform-specific or local-only build: `release.yml` builds and packs the
single published package on `ubuntu-latest`. The Cloud-blocked step is only
the tag; starting the coordinator needs someone (or a tool) with
`actions: write` on the repository.

## Step 9: Monitor the Release run

```bash
node scripts/release/release.mjs find-run --ref v<version> --sha "$SHA" --event push --since <since> --wait
gh run watch <id> --exit-status
```

The run is correlated by workflow path + ref + SHA + creation time, never by
`--limit 1`. Its jobs:

1. **gate** re-checks the identity in Actions (tag, version, main, `ci.yml`
   for the SHA, dist-tag regression).
2. **Publish to npm**: an OIDC trusted publish with provenance. It is skipped
   when the version is already on npm, and it refuses to run if any real npm
   token is present in its environment.
3. **finalize** reads the exact version back from the registry with bounded
   retries. It checks that the provenance subject digest equals the registry
   `dist.integrity` (the actual published archive, never a repack), and that
   the provenance repository, workflow, tag ref, and source commit match.
   It requires `_npmUser.trustedPublisher` (OIDC) when this run published,
   runs `npm audit signatures` on the installed exact version, and then
   creates or confirms the GitHub Release (prerelease for `next` versions;
   `Latest` only if no newer stable release exists).

## Step 10: Verify and report

```bash
node scripts/release/release.mjs status --version <version>
```

Expect `resume.state: complete`, `npm.trustedPublisher: true`, and the dist-tag
pointing at the version. Report: version and dist-tag, commit SHA, `ci.yml` run,
Release run URL, registry integrity, trusted-publisher evidence, and the GitHub
Release URL. If a prerelease ended up on `latest`, report it and do not auto-fix
it. Moving a dist-tag is a deliberate, separate maintenance action.

## Failure recovery

Always start with the facts:

```bash
node scripts/release/release.mjs status --version <version>
gh run view <run-id> --log-failed
```

| observed state | action |
| --- | --- |
| publint/CI failure before tagging | fix through a normal commit; re-freeze and re-gate. Nothing was published |
| coordinator failed in **gate** | nothing was written. Fix the cause (CI pending/failed, wrong version or SHA, registry unreadable) and dispatch it again with the same inputs |
| coordinator failed in **tag** with `TAG_CREATE_FAILED` | the token could not create the tag (permissions or a ruleset). Report the setting; do not add a PAT. A person can push the tag instead (Step 8) |
| coordinator failed in **dispatch**, tag present | re-run the coordinator with the same inputs (the tag is kept), or `release.mjs dispatch --ref v<version>` |
| `tagged-unpublished`, a run is still active | wait for it. Real publishes are serialized across tags; never cancel an active publish |
| `tagged-unpublished`, the publish job shows `cancelled` without anyone cancelling it | GitHub keeps one *pending* job per concurrency group, so a third concurrent release displaced it. `release.mjs dispatch --ref v<version>` once the others finish |
| `tagged-unpublished`, run failed in **gate** (e.g. CI not green at tag time) | fix the cause (e.g. let CI finish), then `release.mjs dispatch --ref v<version>` or re-run the failed jobs |
| `tagged-unpublished`, run failed at **publish** with `OIDC_FAILED` | fix the trusted-publisher config ([Troubleshooting OIDC](#troubleshooting-oidc)), then re-run the failed jobs. Never add a token |
| `tagged-unpublished` but the tagged commit itself is broken | do **not** move the tag. Cut a new patch version from a fixed commit; the broken tag stays as an unpublished marker |
| `published-unfinalized` (npm has it, Release missing) | re-run the failed `finalize` job (`gh run rerun <id> --failed`), or `release.mjs dispatch --ref v<version>`. The gate skips publication. No bump, no republish, no tag move. The original publish run keeps the provenance; the retry doesn't need to have created it |
| `verify-registry` exits inconclusive (3) | registry propagation lag, not "unpublished" (it already waits ~10 min). Re-run the finalize job later |
| `finalize` exits `READBACK_PENDING` or `NOT_PUBLISHED` with code 3 | the Release (or the npm version) was not readable yet. Re-run the finalize job; an existing matching Release is a no-op, and a re-run never creates a second one |
| `finalize` exits `READBACK_FAILED` (1) | the Release is a draft, has the wrong prerelease flag, or GitHub reads keep erroring (e.g. 403). Fix that; it is not lag |
| `REGISTRY_MISMATCH` (provenance commit/repo/digest differs) | stop and investigate. The published archive is not the intended release |
| gate `DIST_TAG_REGRESSION` | a stale release attempt. Do not force it; cut the release from current `main` |
| `TAG_CONFLICT` | the tag already names another commit. Investigate which commit was released; never force-update |
| `anomaly` (npm has it, no tag) | stop and investigate with the user |

**Rolling back a bump before tagging:** `git revert <bump-sha>`, then integrate
the revert through the same route. Check that both `<version>.mdx` pages and
the `CHANGELOG.md` heading are gone.

## npm trusted publishing setup

Configured by the package owner on npmjs.com → `@takazudo/zdtp` → Settings →
Trusted publishing. Configurations cannot be edited, only deleted and recreated.

| | Publisher 1 | Publisher 2 |
| --- | --- | --- |
| Provider | GitHub Actions | GitHub Actions |
| Organization or user | `Takazudo` | `Takazudo` |
| Repository | `zudo-design-token-panel` | `zudo-design-token-panel` |
| Workflow filename | `release.yml` | `prune-stale-next-dist-tag.yml` |
| Environment | *(empty)* | *(empty)* |
| Allowed actions | npm publish (direct) | npm dist-tag only |

Keep both workflow filenames stable. npm documents that a new configuration
expires if its first successful publish does not happen within two days.
Create Publisher 1 close to the next real release. The npm UI shows each
configuration's status. Then select Settings → Publishing access → **Require
two-factor authentication and disallow tokens**; trusted publishers keep
working.

`prune-stale-next-dist-tag.yml` pins npm 11.21.0 because OIDC for
`npm dist-tag` starts there. It refuses to change dist-tags while any
`release.yml` run is unfinished. It deliberately does not share the release
publish concurrency group, because joining that group could cancel a queued
release publish. `release.yml` publishes with pnpm 11.3.0, which
performs the OIDC exchange itself.

### Troubleshooting OIDC

- `Skipped OIDC: ERR_PNPM_AUTH_TOKEN_EXCHANGE ... (status code 404)` or
  ENEEDAUTH means npm found no matching trusted publisher. Compare it exactly:
  owner `Takazudo`, repo `zudo-design-token-panel`, workflow filename with
  `.yml`, environment empty (the job declares none), and the right allowed action.
- The job must have `id-token: write` and run on a GitHub-hosted runner.
- `repository.url` in `packages/zdtp/package.json` must point at
  `github.com/Takazudo/zudo-design-token-panel`.
- `npm whoami` and public reads prove nothing about publish or dist-tag
  permission. Neither do a dry run, a no-op prune, or a provenance statement on
  its own. The evidence of an OIDC publish is the registry recording
  `_npmUser.trustedPublisher` for the version, together with a workflow that
  had no npm token input.

## Codex Cloud environment

Use a Codex Cloud environment for `Takazudo/zudo-design-token-panel` with:

- **Setup / install script:**

  ```bash
  corepack enable
  corepack prepare pnpm@11.3.0 --activate
  pnpm install --frozen-lockfile
  ```

  Node 24 is required (`engines: >=24 <25`). Choose it in the environment's
  runtime settings if it is not the default.
- **Internet access during the task:** the release flow needs
  `registry.npmjs.org` (reads and `npm diff`), `github.com` and
  `api.github.com` (git, the gates, and run monitoring), plus the package-manager
  domains for `pnpm install` and `pnpm dlx publint`. Allow those domains, or
  enable public internet access.
- **No npm secrets.** Do not add `NPM_TOKEN`, `NODE_AUTH_TOKEN`, or an `.npmrc`
  credential to the environment.
- **GitHub access** comes from the account's existing Codex GitHub connection.
  Run `preflight --route pr` in the task to see what is actually available:
  - `gh` authenticated with push rights: the full flow runs in the task (PR,
    merge if authorized, `tag`, `find-run`, `gh run watch`).
  - No `gh` write access: the task prepares and validates the release branch,
    Codex opens the PR, and the user merges. The `tag` step (and any
    `dispatch`) then needs a GitHub write capability. Record exactly which one
    is missing. Prefer extending the existing GitHub connection over adding a
    personal access token, and never put npm credentials in Cloud to compensate.
  - Read-only gates (`gate`, `status`, `find-run`) fall back to the public
    GitHub API when `gh` is unauthenticated (rate-limited).
- Invoke the procedure with the `make-release` skill (`$make-release` in Codex),
  optionally with a bump argument such as `$make-release patch`.

A local run never counts as Cloud acceptance. Cloud acceptance is a real Cloud
task that runs `preflight`, a `dispatch --dry-run` correlated to its run id,
and a user-authorized real release.
