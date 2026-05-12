# zudo-design-token-panel — repo rules

Project-scoped rules that apply across the whole monorepo. Subdirectories may have their own `CLAUDE.md` (e.g. `doc/CLAUDE.md` for the docs site) which adds rules specific to that workspace.

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

## Stale-dist workaround for workspace typecheck

The package `@takazudo/zudo-design-token-panel` exposes types via the `exports` map pointing to `./dist/...`. Two pieces keep workspace typecheck honest without manual dist rebuilds:

- **TypeScript `paths` in `examples/zfb`, `examples/zfb-tailwind`, `examples/astro`, `doc`** — these four are Preact-based, so they can resolve the package directly to its `src/` files via tsconfig `paths`. No dist round-trip needed.
- **`pretypecheck` hook in root `package.json`** — runs `pnpm -F @takazudo/zudo-design-token-panel build` before `pnpm typecheck`. Catches the two React-based example apps (`examples/vite-react`, `examples/next`) that deliberately keep their own React runtime and must typecheck against the compiled `.d.ts` in dist.

If you add a new example app, follow the same split: Preact-based → add to tsconfig `paths` and the `astro-shim.d.ts` include (for `/astro` subpath consumers); React-based → leave tsconfig alone and let the `pretypecheck` hook handle it.
