# ZUDO_DEPS_PINS

Provenance for artifacts vendored or generated from first-party (takazudo/zudolab) upstreams.
Updated by /dev-bump-zudo-deps on every sync — keep `pinned:` accurate.

## zudo-doc
- repo: zudolab/zudo-doc
- what: generated doc-site route and agent-writing scaffold files, locally adapted; generated light/dark playground panel configs
- files: playground/config/zudo-doc-manifest.generated.ts, doc/pages/index.tsx, doc/pages/docs/[[...slug]].tsx, doc/pages/[locale]/docs/[[...slug]].tsx, doc/scripts/setup-doc-skill.sh, doc/.claude/skills/zudo-doc-writing/SKILL.md, doc/src/content/docs/claude-skills/zudo-doc-writing/index.mdx
- source: packages/zudo-doc/src/design-token-panel-config/index.ts + manifest.ts + ../color-scheme-utils.ts + ../color-schemes-defaults/ (public @takazudo/zudo-doc/design-token-panel-config, buildDesignTokenPanelConfig) -> scripts/vendor-consumer-manifest.mjs -> playground/config/zudo-doc-manifest.generated.ts; packages/create-zudo-doc/templates/base/pages/index.tsx -> doc/pages/index.tsx; packages/create-zudo-doc/templates/base/pages/docs/[[...slug]].tsx -> doc/pages/docs/[[...slug]].tsx; packages/create-zudo-doc/templates/features/i18n/files/pages/[locale]/docs/[[...slug]].tsx -> doc/pages/[locale]/docs/[[...slug]].tsx; packages/create-zudo-doc/templates/base/scripts/setup-doc-skill.sh -> doc/scripts/setup-doc-skill.sh; packages/create-zudo-doc/templates/features/claudeSkillsWriting/files/.claude/skills/zudo-doc-writing/SKILL.md -> doc/.claude/skills/zudo-doc-writing/SKILL.md; packages/zudo-doc/src/plugins/internal/claude-resources/ -> doc/src/content/docs/claude-skills/zudo-doc-writing/index.mdx
- track: releases
- pinned: b4f974598b27064a092eeadb5b2e5559078a8bb9 (v6.0.0)
- updated: 2026-10-11
- sync: three-way compare the listed create-zudo-doc templates and re-apply local route/history and nested-workspace customizations; run node scripts/vendor-consumer-manifest.mjs after installing the pinned package for generated light/dark configs
- notes: route stubs are self-contained by design (zfb also serves injected dynamic routes in dev, but the stub is retained for explicit host route ownership) and locally add server DocHistoryBoundary bindings plus a direct scanner edge to the host panel bootstrap boundary; setup-doc-skill.sh carries nested-project/worktree path handling (REPO_ROOT resolved up front via `git worktree list` and used to read `PROJECT_NAME`, `generate_skill` writes into `MAIN_PROJECT_DIR`) — tracked-skill linking and the config-driven locale map are upstream, not local; home/setup/writing templates and the internal claude-resource generator are unchanged between the verified releases; the writing skill is identical to its upstream template. The playground manifest is generated config (source version 6.0.0), not a copied route template.
