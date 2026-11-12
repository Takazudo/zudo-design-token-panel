---
name: make-release
description: Release the @takazudo/zdtp npm package (bump version, bilingual changelog, validate, integrate, gate, tag; GitHub Actions then publishes via OIDC and creates the GitHub Release). Use when asked to cut, make, or resume a zdtp release, optionally with major, minor, patch, next, or stable. Do not use for ordinary code changes or for npm dist-tag maintenance.
---

# make-release

Thin Codex entry point. **Read `docs/releasing.md` at the repository root and
follow it exactly.** It is the single release procedure, shared with Claude Code
(`.claude/skills/l-make-release/`). Do not keep or improvise a separate copy of
the rules here.

- An optional argument (`major` / `minor` / `patch` / `next` / `stable`) is the
  bump strategy in Step 2. An explicit `$make-release` invocation counts as a
  deliberate request for the Step 3 auto-proceed rule; a loose phrase does not.
- Start with `node scripts/release/release.mjs preflight --route pr` (Codex Cloud
  or a linked worktree) or `--route direct` (a primary local checkout on `main`).
  Report the capabilities it marks as missing instead of working around them.
- Never add npm credentials (no `NPM_TOKEN`, no `.npmrc` auth, no `npm login`).
  Publication happens only in GitHub Actions through OIDC trusted publishing.
- Never force-move or recreate a `v*` tag, and never bypass git hooks.
- When the environment cannot push tags (e.g. Claude Code Cloud, or a Cloud
  task without tag rights), tag through `release-coordinator.yml` ("Step 8
  (Route C)" in `docs/releasing.md`) instead of adding credentials.
- In Codex Cloud, see "Codex Cloud environment" in `docs/releasing.md`. A local
  run is not Cloud acceptance evidence.
