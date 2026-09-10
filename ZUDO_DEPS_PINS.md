# ZUDO_DEPS_PINS

Provenance for artifacts vendored or generated from first-party (takazudo/zudolab) upstreams.
Updated by /dev-bump-zudo-deps on every sync — keep `pinned:` accurate.

## zudo-doc
- repo: zudolab/zudo-doc
- what: generated doc-site route and agent-writing scaffold files, locally adapted
- files: doc/pages/docs/[[...slug]].tsx, doc/pages/[locale]/docs/[[...slug]].tsx, doc/scripts/setup-doc-skill.sh, doc/.claude/skills/zudo-doc-writing/SKILL.md, doc/src/content/docs/claude-skills/zudo-doc-writing/index.mdx
- source: packages/create-zudo-doc/templates/base/pages/docs/[[...slug]].tsx -> doc/pages/docs/[[...slug]].tsx; packages/create-zudo-doc/templates/features/i18n/files/pages/[locale]/docs/[[...slug]].tsx -> doc/pages/[locale]/docs/[[...slug]].tsx; packages/create-zudo-doc/templates/base/scripts/setup-doc-skill.sh -> doc/scripts/setup-doc-skill.sh; packages/create-zudo-doc/templates/features/claudeSkillsWriting/files/.claude/skills/zudo-doc-writing/SKILL.md -> doc/.claude/skills/zudo-doc-writing/SKILL.md; packages/zudo-doc/src/plugins/internal/claude-resources/ -> doc/src/content/docs/claude-skills/zudo-doc-writing/index.mdx
- track: releases
- pinned: 410a583fc6f1ccc633d53ba94b06446cf107be5b (v5.21.0)
- updated: 2026-09-10
- sync: three-way compare the listed create-zudo-doc templates and re-apply local route/history and nested-workspace customizations
- notes: route stubs are self-contained by design (zfb 2.13.1 now also serves injected dynamic routes in dev, but the stub is retained for explicit host route ownership) and locally add DocHistory bindings; setup-doc-skill.sh carries nested-project/worktree path handling (REPO_ROOT resolved up front via `git worktree list` and used to read `PROJECT_NAME`, `generate_skill` writes into `MAIN_PROJECT_DIR`) — tracked-skill linking and the config-driven locale map are upstream, not local; the writing skill is kept aligned with its upstream template.
