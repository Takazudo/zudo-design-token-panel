# zudo-design-token-panel — repo rules

Project-scoped rules that apply across the whole monorepo. Subdirectories may have their own `CLAUDE.md` (e.g. `doc/CLAUDE.md` for the docs site) which adds rules specific to that workspace.

For how the npm-pinned docs panel relates to this repo's unpublished
`packages/zdtp` build—and when to use the workspace-linked `playground/`—see
the "zdtp ↔ zudo-doc relationship" section in `doc/CLAUDE.md`.

## Public live demo split

The public surfaces have a deliberate three-site split: `doc/` runs the pinned
npm release, while `examples/minimal/` and `playground/` run the workspace build
and therefore lead it. The two first-party demo hostnames are:

- `https://zdtp-minimal.takazudomodular.com/` (`examples/minimal/`) — minimal =
  "the smallest wiring that works".
- `https://zdtp-playground.takazudomodular.com/` (`playground/`) — playground =
  "full size, plus the real vendored zudo-doc `PanelConfig` and prose pages".

The provenance badge on each demo is a load-bearing honesty mechanism. Removing
or weakening it is a regression. `PROVENANCE` is derived from git tag position,
never from a version-string equality check: that shortcut can mislabel an
unreleased build as `released`, which is exactly what the badge exists to
prevent.

## Panel DOM hygiene — no host-stylable semantic tags

The panel is embedded inside a host app. Any semantic HTML element whose default browser styles can be reset or overridden by the host's global CSS must NOT appear in the panel's own markup.

**Blocked elements** (subject to aggressive global resets in host CSS): `h1`–`h6`, `p`, `ul`, `ol`, `li`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `a`, `blockquote`, `pre`, `code`, `em`, `strong`, `article`, `aside`, `main`, `nav`, `header`, `footer`, `section`, `figure`, `figcaption`, `hr`, `address`, `summary` (standalone), `details`.

**Permitted form controls** (exempted — the panel legitimately needs them): `input`, `select`, `textarea`, `label`, `form`, `datalist`, `option`, `optgroup`, `fieldset`, `legend`, `dialog`.

**SVG elements** (`svg`, `use`, `path`) are functional rendering elements and stay, but the package must include a defensive CSS reset (`svg { fill: currentColor; }` etc.) so host icon rules cannot repaint them.

**Chrome-button policy**: every interactive button-like element in the panel package becomes `<div role="button" tabIndex={0}>` with explicit `onKeyDown` handlers for Enter and Space. Exception: children of a listbox become `<div role="option">` (no Enter/Space; the listbox container owns keyboard navigation).

**No-progressive-disclosure policy**: this panel is a developer tool; the user is a developer; all tokens are visible by default. Do NOT use `<details>`/`<summary>` or any custom collapse-by-default disclosure pattern. If a tab has many tokens, render them flat in tier-section order. The `TabConfig.advancedTiers` mechanism is being removed in #148. **Scoped exception (#517)**: the Palette-tab Edit-view group organizer is a ramp EDITOR, not a token list — its groups are a single-open accordion collapsed by default. Allowed because it is an editing surface and each collapsed header keeps `aria-hidden` preview chips visible (colors stay visible; only the interactive editor collapses). Token lists everywhere else — including the Palette Check view — stay flat and never collapse. See `packages/zdtp/CLAUDE.md` for the full rule.

**One-tier-one-heading policy**: each tier renders ONE `<div role="heading" aria-level={3}>`. The panel does NOT use a second-level heading inside a tier. If a tier conceptually needs sub-grouping, split it into multiple tiers — each with its own section heading. The `TierItem.group` field is being removed in #148; example manifests must not use it.

**Before / after recipe** (heading replacement; the panel uses level=3 only, but the recipe applies to any heading replacement):

```tsx
// Before — leaks host h4 resets into the panel
<h4 className="tokenpanel-tab-section-heading">{tier.label}</h4>

// After — self-contained, isolated from host resets
<div role="heading" aria-level={3} className="tokenpanel-tab-section-heading">{tier.label}</div>
```

See `packages/zdtp/CLAUDE.md` for the full rule, exceptions, and SVG reset recipe.

## Worktree push policy (enforced)

This repo uses `/x-wt-teams` for multi-topic development. Child agents work in git worktrees under `worktrees/`. **Pushing from a worktree is forbidden.** Only the manager session — running from the main repo at the repo root — pushes, after merging topic branches into the base branch locally.

### Why

- CI runs on every push. Children pushing pre-empt the manager's merge + review step, multiplying CI cost across intermediate state.
- Topic branches in `worktrees/*/` are intermediate by design — they shouldn't appear as standalone PRs unless the manager creates them in Step 11 (documentation PRs that close immediately).
- Prior /x-wt-teams sessions had child agents push against explicit prompt instructions, forcing manual cleanup of stray PRs. The hook removes the ambiguity.

### How it's enforced

`.git/hooks/pre-push` is a direct script (not managed via `lefthook.yml`) that blocks any push from a git worktree. Detection uses git's own metadata — `--git-dir` differs from `--git-common-dir` iff we are in a linked worktree — so the guard fires regardless of `pwd`. It is deliberately NOT in `lefthook.yml` because lefthook reads config from the worktree's toplevel and would silently skip the guard when invoked from inside a worktree.

The hook is auto-installed by `pnpm install` (which runs `lefthook install && bash scripts/install-git-hooks.sh` via the `prepare` lifecycle script) and can be re-installed manually with:

```sh
pnpm init-worktree
```

The installer source lives at `scripts/install-git-hooks.sh`; the hook itself at `scripts/hooks/pre-push`. `lefthook.yml` manages pre-commit hooks separately.

### Emergency bypass (human use)

```sh
ALLOW_WORKTREE_PUSH=1 git push ...
```

Use only when you genuinely need to push from a worktree (rare). Never set this in agent prompts.

### Guidance for agents

- **Child agents working in `worktrees/*/`:** commit locally only. Pushing will fail with the message above — do not retry, do not invoke the bypass. Report back to the manager with the branch name and commit SHAs; the manager merges and pushes from the main repo.
- **`/x-wt-teams` manager session:** the hook does not affect you. Your `git push` runs from the main repo (the cwd is the repo root, not `worktrees/...`). After every wave's local merges, push as usual. Do not pass `ALLOW_WORKTREE_PUSH` to children.
