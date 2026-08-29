# ZUDO_DEPS_PINS

Provenance for artifacts vendored or generated from first-party (takazudo/zudolab) upstreams.
Updated by /dev-bump-zudo-deps on every sync — keep `pinned:` accurate.

## zudo-doc
- repo: zudolab/zudo-doc
- what: generated doc-site route and agent-writing scaffold files, locally adapted
- files: doc/pages/docs/[[...slug]].tsx, doc/pages/[locale]/docs/[[...slug]].tsx, doc/scripts/setup-doc-skill.sh, doc/.claude/skills/zudo-doc-writing/SKILL.md, doc/src/content/docs/claude-skills/zudo-doc-writing/index.mdx
- source: packages/create-zudo-doc/templates/base/pages/docs/[[...slug]].tsx -> doc/pages/docs/[[...slug]].tsx; packages/create-zudo-doc/templates/features/i18n/files/pages/[locale]/docs/[[...slug]].tsx -> doc/pages/[locale]/docs/[[...slug]].tsx; packages/create-zudo-doc/templates/base/scripts/setup-doc-skill.sh -> doc/scripts/setup-doc-skill.sh; packages/create-zudo-doc/templates/features/claudeSkillsWriting/files/.claude/skills/zudo-doc-writing/SKILL.md -> doc/.claude/skills/zudo-doc-writing/SKILL.md; packages/zudo-doc/src/plugins/internal/claude-resources/ -> doc/src/content/docs/claude-skills/zudo-doc-writing/index.mdx
- track: releases
- pinned: 7ca73f197021961603c22042748c23d9ce9d6c50 (v5.13.1)
- updated: 2026-08-29
- sync: three-way compare the listed create-zudo-doc templates and re-apply local route/history and nested-workspace customizations
- notes: route stubs are required zfb-dev compatibility files and locally add DocHistory bindings; setup-doc-skill.sh carries nested-project/worktree path handling and tracked-skill linking; the writing skill is kept aligned with its upstream template.
