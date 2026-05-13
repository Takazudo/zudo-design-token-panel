# zudo-design-token-panel — repo rules

Project-scoped rules that apply across the whole monorepo. Subdirectories may have their own `CLAUDE.md` (e.g. `doc/CLAUDE.md` for the docs site) which adds rules specific to that workspace.

## Panel DOM hygiene — no host-stylable semantic tags

The panel is embedded inside a host app. Any semantic HTML element whose default browser styles can be reset or overridden by the host's global CSS must NOT appear in the panel's own markup.

**Blocked elements** (subject to aggressive global resets in host CSS): `h1`–`h6`, `p`, `ul`, `ol`, `li`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `a`, `blockquote`, `pre`, `code`, `em`, `strong`, `article`, `aside`, `main`, `nav`, `header`, `footer`, `section`, `figure`, `figcaption`, `hr`, `address`, `summary` (standalone), `details`.

**Permitted form controls** (exempted — the panel legitimately needs them): `input`, `select`, `textarea`, `label`, `form`, `datalist`, `option`, `optgroup`, `fieldset`, `legend`, `dialog`.

**SVG elements** (`svg`, `use`, `path`) are functional rendering elements and stay, but the package must include a defensive CSS reset (`svg { fill: currentColor; }` etc.) so host icon rules cannot repaint them.

**Chrome-button policy**: every interactive button-like element in the panel package becomes `<div role="button" tabIndex={0}>` with explicit `onKeyDown` handlers for Enter and Space. Exception: children of a listbox become `<div role="option">` (no Enter/Space; the listbox container owns keyboard navigation).

**No-progressive-disclosure policy**: this panel is a developer tool; the user is a developer; all tokens are visible by default. Do NOT use `<details>`/`<summary>` or any custom collapse-by-default disclosure pattern. If a tab has many tokens, render them flat in tier-section order. The `TabConfig.advancedTiers` mechanism is being removed in #148.

**One-tier-one-heading policy**: each tier renders ONE `<div role="heading" aria-level={3}>`. The panel does NOT use a second-level heading inside a tier. If a tier conceptually needs sub-grouping, split it into multiple tiers — each with its own section heading. The `TierItem.group` field is being removed in #148; example manifests must not use it.

**Before / after recipe** (heading replacement; the panel uses level=3 only, but the recipe applies to any heading replacement):

```tsx
// Before — leaks host h4 resets into the panel
<h4 className="tokenpanel-tab-section-heading">{tier.label}</h4>

// After — self-contained, isolated from host resets
<div role="heading" aria-level={3} className="tokenpanel-tab-section-heading">{tier.label}</div>
```

See `packages/zudo-design-token-panel/CLAUDE.md` for the full rule, exceptions, and SVG reset recipe.

## Stale-dist workaround for workspace typecheck

The package `@takazudo/zudo-design-token-panel` exposes types via the `exports` map pointing to `./dist/...`. Two pieces keep workspace typecheck honest without manual dist rebuilds:

- **TypeScript `paths` in `examples/zfb`, `examples/zfb-tailwind`, `examples/astro`, `doc`** — these four are Preact-based, so they can resolve the package directly to its `src/` files via tsconfig `paths`. No dist round-trip needed.
- **`pretypecheck` hook in root `package.json`** — runs `pnpm -F @takazudo/zudo-design-token-panel build` before `pnpm typecheck`. Catches the two React-based example apps (`examples/vite-react`, `examples/next`) that deliberately keep their own React runtime and must typecheck against the compiled `.d.ts` in dist.

If you add a new example app, follow the same split: Preact-based → add to tsconfig `paths` and the `astro-shim.d.ts` include (for `/astro` subpath consumers); React-based → leave tsconfig alone and let the `pretypecheck` hook handle it.

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
