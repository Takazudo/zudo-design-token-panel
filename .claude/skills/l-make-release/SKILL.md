---
description: "Release @takazudo/zdtp end-to-end by following the shared procedure in docs/releasing.md — version choice, bilingual changelog, package validation, integration, candidate gate, tag, then GitHub Actions publishes to npm via OIDC and finalizes the GitHub Release. Triggers on rough requests like \"bump version\", \"cut a release\", \"release zdtp\", \"make a release\", \"make npm release\"."
user-invocable: true
argument-description: "Optional: major, minor, patch, next, stable — controls the version bump strategy"
---

# /l-make-release

Thin Claude Code entry point. **Read `docs/releasing.md` and follow it exactly.**
It is the single release procedure, shared with Codex (`.agents/skills/make-release/`).
Do not keep or improvise a separate copy of the rules here.

- The argument (`major` / `minor` / `patch` / `next` / `stable`, or none) is the
  bump strategy in Step 2 of `docs/releasing.md`. An explicit `/l-make-release`
  invocation counts as a deliberate request for the Step 3 auto-proceed rule.
- Run from the primary checkout (`--route direct`). Linked worktrees must not
  push; use the PR route there. Never bypass the pre-push hook.
- **Claude Code Cloud** cannot push tags (its git proxy returns 403) and has no
  `gh` login. Integrate via the PR route, then tag with the release coordinator
  (`docs/releasing.md` → "Step 8 (Route C)"): dispatch
  `release-coordinator.yml` on `main` with `version` + `sha`, or hand those two
  inputs to the person if the dispatch is not available. Never create a PAT or
  npm token to get around it.
- Use `node scripts/release/release.mjs` for preflight, status, gate, tag, and
  run correlation. Use `gh run watch <id> --exit-status` for waiting.
- No npm login or npm token is involved anywhere. If publishing fails on auth,
  follow "Troubleshooting OIDC". Never create or restore `NPM_TOKEN`.
- The GitHub Release is created by `release.yml`. Do not run `gh release create`
  yourself, except when following the recovery table.
