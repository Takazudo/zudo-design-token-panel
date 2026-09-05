# Changelog

All notable changes to `@takazudo/zdtp` are documented in this file.

The format is based on Keep a Changelog, and release notes are generated from the changelog MDX pages.

## [0.4.15] - 2026-09-05

### Features

- feat(css): tune panel neutral color roles (a64b866)
- feat(examples): add minimal Cloudflare deploy workflows (2aa7365)
- feat(examples): add minimal panel demo (7924968)
- feat(playground): add Cloudflare deploy workflows (32eae69)
- feat(playground): add deploy provenance build mode (9e7c103)
- feat(zdtp): add per-token chain popover ([#667](https://github.com/Takazudo/zudo-design-token-panel/pull/667)) (162bebf)
- feat(zdtp): surface changed token state (a5ef831)
- feat(zdtp): add bulk numeric token actions (7fe2f87)
- feat(zdtp): add token search and command palette (c8f8000)
- feat(panel): add history rail and A/B snapshots (8729b26)
- feat(panel): add element inspect view (41a0b51)
- feat(zdtp): render font specimen on page (7b08441)
- feat(zdtp): preview and reconcile token applies (5c7a209)
- feat(panel): add tier previews and font specimens (dbcb731)
- feat(zdtp): add element inspect core (3240973)
- feat(panel): add mini pill and ghost idle mode (cd61b26)
- feat(panel): add persisted dock modes (ddbe8c8)
- feat(zdtp): add identity-aware state transactions (bcd9427)
- feat(zdtp): add apply dry-run previews (fac3a1f)
- feat: add workspace-linked zfb playground (042065d)
- feat(zdtp): add token index diff and graph utilities (d28e62d)

### Fixed

- fix(zdtp): complete panel chrome confirmation (e9d0618)
- fix(zdtp): anchor token tooltips to label text (e908f0b)
- fix(ci): bootstrap missing demo Workers without production routes (a4ee819)
- fix(playground): remove stale island loading copy (4a59365)
- fix: disable Apply when write routing is unavailable (388d5f5)
- fix(playground): point Apply guide to the docs route (a5d5f3c)
- fix(zdtp): pluralize count labels (a969f0f)
- fix(zdtp): reconcile derived role writes (18beee6)
- fix(zdtp): unify changed token semantics (c0c6899)
- fix: keep dock shortcuts active in mini mode (caec271)
- fix(ci): repair panel validation gates (a8a2307)
- fix(zdtp): gate writes on current apply preview (b97a167)
- fix(panel): harden history shortcuts and snapshot validation (9680fe2)
- fix(zdtp): await apply preview digests (a28d199)
- fix(panel): preserve preview-free font behavior (fd54079)
- fix(zdtp): harden element inspect probing (05beefd)
- fix(panel): cancel gestures across dock lifecycle (82f0cec)
- fix: keep playground builds reproducible and untracked (149da8b)
- fix(zdtp): align graph reference fallback (c4f3153)

### Other Changes

- Merge pull request [#748](https://github.com/Takazudo/zudo-design-token-panel/pull/748) from Takazudo/base/panel-chrome (0882b8a)
- Merge branch 'topic/panel-chrome-confirm' into base/panel-chrome (819dab3)
- Merge branch 'topic/panel-chrome-overflow' into base/panel-chrome (b1d0973)
- Stabilize overflow resize browser test (faebaf0)
- Merge branch 'topic/panel-chrome-colors' into base/panel-chrome (4deab7c)
- Merge branch 'topic/panel-chrome-tooltip' into base/panel-chrome (830262b)
- test(zdtp): cover tooltip geometry edge cases (cc57ecf)
- Add tab overflow chooser (357d471)
- Merge branch 'topic/panel-chrome-narrow' into base/panel-chrome (ee5bb0a)
- Fix narrow panel chrome containment (82c53e3)
- refactor(css): alias panel neutrals to exact OKLCH ramp (86bcb21)
- Merge pull request [#736](https://github.com/Takazudo/zudo-design-token-panel/pull/736) from Takazudo/agent-fix/scheme-test-teardown (d0239c6)
- test(zdtp): unmount scheme identity panel deterministically (4b80a39)
- Merge pull request [#732](https://github.com/Takazudo/zudo-design-token-panel/pull/732) from Takazudo/base/public-live-demos (f41db9e)
- Merge branch 'topic/public-demos-722' into base/public-live-demos (add5c32)
- docs: record public demo contracts (ef10c17)
- Merge branch 'topic/public-demos-720' into base/public-live-demos (7a23c9f)
- Merge remote-tracking branch 'origin/main' into base/public-live-demos (dd27215)
- Merge pull request [#724](https://github.com/Takazudo/zudo-design-token-panel/pull/724) from Takazudo/agent-fix/astro-listener-test (43f9abf)
- Merge branch 'topic/public-demos-718' into base/public-live-demos (70f9f5e)
- Merge branch 'topic/public-demos-719' into base/public-live-demos (48dd7ad)
- test: accept explicit enabled Apply aria state (3b6e895)
- test: stabilize Astro listener lifecycle coverage (6ad088b)
- Merge branch 'topic/public-demos-715' into base/public-live-demos (2bd001b)
- Merge branch 'topic/public-demos-apply' into base/public-live-demos (b6b52cf)
- Merge branch 'topic/public-demos-716' into base/public-live-demos (9fa3193)
- Merge branch 'topic/public-demos-717' into base/public-live-demos (a9cb2b1)
- docs(playground): rewrite public demo copy (b8a37fa)
- docs: lead examples with first-party demos (ccdbcf2)
- Merge pull request [#711](https://github.com/Takazudo/zudo-design-token-panel/pull/711) from Takazudo/base/panel-ux-follow-ups (762e355)
- Merge remote-tracking branch 'origin/main' into base/panel-ux-follow-ups (22eb6fd)
- Merge pull request [#713](https://github.com/Takazudo/zudo-design-token-panel/pull/713) from Takazudo/agent-fix/dom-tweaker-test-cleanup (ae19fe7)
- test: unmount DOM Tweaker reapply fixture before teardown (30c2619)
- fix Apply export schema documentation link (1ecf39f)
- fix specimen trailing hit-area overflow (b8f276e)
- Merge branch 'topic/700-counts' into base/panel-ux-follow-ups (1114026)
- Merge branch 'topic/700-reconcile' into base/panel-ux-follow-ups (71ba8cf)
- test(zdtp): guard explicit semantic reconciliation (c311ad6)
- Merge branch 'topic/700-specimens' into base/panel-ux-follow-ups (0475039)
- test specimen density snapshots (22dfdf2)
- refine wide specimen sample space (dc885a3)
- Merge branch 'topic/700-changed' into base/panel-ux-follow-ups (92e8fc8)
- refactor(zdtp): keep one semantic comparator (e5d3827)
- fix specimen tier density layout (e79fd54)
- Merge branch 'topic/700-shortcuts' into base/panel-ux-follow-ups (8b0d13e)
- Merge pull request [#673](https://github.com/Takazudo/zudo-design-token-panel/pull/673) from Takazudo/base/panel-ux (10959d9)
- Merge topic/648-docs-ja into base/panel-ux (49bd3d3)
- docs: add Japanese panel UX documentation (92c9a26)
- chore: remove panel UX prototypes (b5de7cd)
- Merge topic/648-docs-en into base/panel-ux (ab801bf)
- docs: document panel UX contract (f1a624b)
- Merge topic/648-full-confirm into base/panel-ux (ef78e20)
- test(zdtp): confirm Wave 3 integration (74c336a)
- Merge topic/648-chain-popover into base/panel-ux (86cffd0)
- Merge topic/648-changed-state into base/panel-ux (a63c544)
- Merge topic/648-bulk-actions into base/panel-ux (9854adf)
- Merge topic/648-search-palette into base/panel-ux (1c018b7)
- Merge topic/648-history-snapshots into base/panel-ux (25c779a)
- Merge topic/648-element-inspect-view into base/panel-ux (402cbe8)
- Merge topic/648-on-page-specimen into base/panel-ux (1130b83)
- Merge topic/648-apply-preview into base/panel-ux (3bfcb6f)
- Merge topic/648-specimen into base/panel-ux (f76bdb6)
- Merge topic/648-element-inspect-core into base/panel-ux (cd4639a)
- Merge topic/648-wave1-confirm into base/panel-ux (1169faf)
- chore: confirm wave 1 integration seams (8e69c6c)
- Merge branch 'topic/648-mini-pill' into base/panel-ux (b238174)
- Merge branch 'topic/648-test-harness' into base/panel-ux (472bf81)
- test(panel): add consumer boundary harnesses (50dd9b5)
- Merge branch 'topic/648-consumer-lane' into base/panel-ux (af110e9)
- ci: add local panel consumer lanes (1876b55)
- Merge branch 'topic/648-dock-modes' into base/panel-ux (041c211)
- Merge branch 'topic/648-state-transaction' into base/panel-ux (937ccf2)
- Merge branch 'topic/648-shell-seam' into base/panel-ux (e05de53)
- Extract extensible panel shell seams (c5fddf2)
- Merge branch 'topic/648-apply-dry-run' into base/panel-ux (f30ec38)
- Merge branch 'topic/648-playground' into base/panel-ux (f7e9aeb)
- Merge branch 'topic/648-flat-tab' into base/panel-ux (9827f86)
- style(zdtp): remove flat tab EOF blanks (6bff478)
- refactor(zdtp): share flat tab token rows (f5a32e7)
- Merge branch 'topic/648-token-index' into base/panel-ux (7d9c0dd)
- chore(temp-resource): bake panel-UX prototypes for epic [#648](https://github.com/Takazudo/zudo-design-token-panel/issues/648) (5169af0)

## [0.4.14] - 2026-08-29

### Fixed

- fix(zdtp): silence compatible global alias warning (2630d84)

### Other Changes

- test(zdtp): cover partial global alias shape (6314a7f)
- Merge pull request [#647](https://github.com/Takazudo/zudo-design-token-panel/pull/647) from Takazudo/fix/646-compatible-zdtp-alias: fix(zdtp): silence warnings for compatible global aliases (44f6ca4)

## [0.4.13] - 2026-08-29

### Features

- feat(zdtp): normalize static CSS colors (20567e7)

### Fixed

- fix(zdtp): expose readonly swatches as selectable (c3c8c28)
- fix(zdtp): restrict referencesRamps to Color tabs (8894399)
- fix(zdtp): enforce readonly Palette editing (5c2445c)
- fix(zdtp): guard palette validity transitions (73a59fb)
- fix(zdtp): preserve invalid palette slots as n-a (0e456e5)
- fix(doc): align preview with latest zfb (9cd81bb)

### Other Changes

- Merge pull request [#636](https://github.com/Takazudo/zudo-design-token-panel/pull/636) from Takazudo/base/sweep-260829: fix(zdtp): correct Palette behavior and public contracts (db3ee47)
- docs(zdtp): document referencesRamps tab restriction (555b562)
- Merge pull request [#645](https://github.com/Takazudo/zudo-design-token-panel/pull/645) from Takazudo/base/sweep-260829-portable-contract-docs: fix(zdtp): align portable contracts and ramp validation (452fc32)
- Merge topic/630-reference-color-mode-docs (7abfa37)
- docs: clarify reference emission and color modes (f447a99)
- Merge topic/632-references-ramps-color-tabs (7df5b55)
- Merge topic/631-required-write-root-docs (ae76e2b)
- Merge topic/629-shipped-semantic-contract (0ba0294)
- docs(zdtp): sync shipped semantic tier contract (4bbc5d5)
- docs: require write-root in apply guidance (10c76b1)
- Merge pull request [#640](https://github.com/Takazudo/zudo-design-token-panel/pull/640) from Takazudo/base/sweep-260829-palette-correctness: fix(zdtp): correct Palette color and readonly behavior (36c0972)
- Merge branch 'topic/626-palette-readonly' into base/sweep-260829-palette-correctness (53575d9)
- Merge branch 'topic/625-palette-invalid-na' into base/sweep-260829-palette-correctness (73c2c6c)
- Merge branch 'topic/624-static-css-color-normalization' into base/sweep-260829-palette-correctness (858c131)
- Merge pull request [#635](https://github.com/Takazudo/zudo-design-token-panel/pull/635) from Takazudo/base/sweep-260829-zudo-dependency-refresh: chore(doc): refresh stable zudo dependencies (db555eb)
- Merge branch 'topic/621-zudo-dependency-family' into base/sweep-260829-zudo-dependency-refresh (16ed6cd)
- chore(doc): bump stable zudo dependency family (579671a)
- Merge pull request [#615](https://github.com/Takazudo/zudo-design-token-panel/pull/615) from Takazudo/fix/populate-doc-changelog-20260823: docs: populate changelog release history (9ce99a1)
- docs: clarify changelog source and locale history (7a0c194)
- docs: populate changelog release history (559a9c5)
- Merge pull request [#614](https://github.com/Takazudo/zudo-design-token-panel/pull/614) from Takazudo/agent-fix/zdtp-lint-warnings-20260823: chore: resolve zdtp lint warnings (9f16688)
- chore: resolve zdtp lint warnings (ed175ca)
- Merge pull request [#612](https://github.com/Takazudo/zudo-design-token-panel/pull/612) from Takazudo/agent-fix/actions-cache-node24-20260823: ci: update actions/cache to Node 24 (ab0ad0d)
- ci: update actions/cache to Node 24 (234459b)
- Merge pull request [#610](https://github.com/Takazudo/zudo-design-token-panel/pull/610) from Takazudo/chore/bump-zudo-deps-20260823: chore(doc): update zudo stack and preview wiring (d6d0d54)
- chore(doc): bump zudo dependencies (6d50555)

## [0.4.12] - 2026-08-20

### Fixed

- fix(doc): stabilize generated skill links (142420c)

### Other Changes

- Merge pull request [#599](https://github.com/Takazudo/zudo-design-token-panel/pull/599) from Takazudo/base/sweep-260820: Complete portable storage and documentation refresh (1d78e89)
- Merge pull request [#609](https://github.com/Takazudo/zudo-design-token-panel/pull/609) from Takazudo/base/sweep-260820-zudo-doc-refresh: Refresh documentation site on zudo-doc 5.7 (157d736)
- Merge topic/zudo-doc-integration into zudo-doc refresh epic (5c199a0)
- Merge topic/zudo-doc-content into zudo-doc refresh epic (0b14ccf)
- docs: fix reviewed cross-locale links (0bc0081)
- docs: migrate bilingual zudo content (c572f05)
- Merge topic/zudo-doc-branding into zudo-doc refresh epic (e2e2cca)
- Brand zudo-doc hero and social metadata (b5c625f)
- Merge topic/zudo-doc-foundation-gate into zudo-doc refresh epic (68784c3)
- Harden deploy audit against missing workspaces (30c12c0)
- Fix deploy audit panel workspace filter (b494335)
- Merge topic/zudo-doc-scaffold into zudo-doc refresh epic (a0addac)
- Avoid missing branded favicon asset (f73995e)
- Rescaffold docs with zudo-doc 5.7 (6079124)
- = start zudo-doc refresh epic = [skip ci] (e3479d5)
- Merge pull request [#608](https://github.com/Takazudo/zudo-design-token-panel/pull/608) from Takazudo/base/sweep-260820-portable-storage-contract: Sync portable storage contract to state-v4 (b7997de)
- Merge branch 'topic/portable-contract-v4' into base/sweep-260820-portable-storage-contract (e6a27b8)
- docs(zdtp): document v4 portable storage contract (511f6fe)
- = start portable storage contract epic = [skip ci] (1605c3e)
- = start sweep-260820 super-epic = [skip ci] (c29cc50)

## [0.4.11] - 2026-08-19

### Features

- feat(autoload): give `${storagePrefix}:autoload` a provenance value — `enableAutoload()` keeps writing `'1'` (explicit owner) while auto-remember writes `'auto'`, never downgrading an existing `'1'`. zdtp's own gate honours both, so owner behaviour is unchanged; the split lets a host's own lazy-load probe test `=== '1'` and stop eagerly fetching the bundle for visitors who merely opened the panel once. Pre-existing `'1'` values cannot be reclassified, so the discrimination applies going forward only ([#591](https://github.com/Takazudo/zudo-design-token-panel/pull/591)) (ca3bb3e)
- feat(config): add `PanelConfig.autoRememberOnOpen` (default `true`) — set `false` so opening the panel never persists owner-mode, letting a public site keep a panel button visible to every visitor. `enableAutoload()` stays available as the explicit owner opt-in ([#591](https://github.com/Takazudo/zudo-design-token-panel/pull/591)) (2b442fa)
- feat: add a mounted-shell slot registry with spawn ordinals — tracks currently-mounted shells per `storagePrefix` (mount order, lowest-free-slot reuse) so concurrent instances can be told apart for spawn placement ([#595](https://github.com/Takazudo/zudo-design-token-panel/pull/595)) (07eefc3)

### Fixed

- fix: derive the default panel position from the clamped default size — `defaultPosition()` and `defaultSize()` independently computed different panel widths, so at a 320px viewport the panel spawned at `left 32` with `width 320` and hung 32px off-screen. Geometry is now derived once, size first, so the two cannot drift apart ([#595](https://github.com/Takazudo/zudo-design-token-panel/pull/595)) (bb080b8)
- fix: cascade concurrent instances apart with a spawn containment clamp — two live panels no longer spawn at identical geometry with the second exactly covering the first. Each additional mounted shell offsets 24px through a new spawn clamp; the permissive drag-recovery clamp is unchanged, a persisted position always wins, and containment beats distinctness per axis when the viewport has no room ([#595](https://github.com/Takazudo/zudo-design-token-panel/pull/595)) (fea74c2)
- fix: center the first-open position against the size actually rendered — an instance with a persisted (resized) size but no persisted position was centered as if it were the default width, spawning up to 88px off-screen ([#595](https://github.com/Takazudo/zudo-design-token-panel/pull/595)) (c2b6bc3)
- fix(astro): content-check the persisted-override probe and match the `-state` family exactly — an empty `{}` envelope no longer triggers an eager bundle fetch that applies nothing, the v1 key (`${storagePrefix}-state`) is now covered instead of being skipped, malformed JSON still fails open so the panel can migrate or reject it, the `${storagePrefix}-open` mirror joined the gate's signals, and an exact family regex keeps a sibling instance's keys from satisfying another instance's probe ([#591](https://github.com/Takazudo/zudo-design-token-panel/pull/591)) (7506a96)
- fix(zdtp): publish `PORTABLE-CONTRACT.md` and fix the duplicate README `§5.3` heading — the contract file existed in the repo but was absent from `files[]`, so every README cross-reference to it was a dead link for npm consumers ([#589](https://github.com/Takazudo/zudo-design-token-panel/pull/589)) (6602596)
- fix(doc): make `check:links` actually crawl the built site — it reported `Successfully scanned 0 links` and exited 0, a silent no-op gate. linkinator serves local paths through its own `http://localhost:<port>` crawl server, so the `--skip '^https?://'` meant for external URLs was swallowing the entry point. Now scans the whole site; enabling it surfaced and fixed three site-wide favicon 404s ([#589](https://github.com/Takazudo/zudo-design-token-panel/pull/589)) (2bdfab4)

### Other Changes

- docs: document the revised lazy-load gate contract in the package docs — README §5/§9/§10/§10.1 and `PORTABLE-CONTRACT.md` §1/§2/§6.2/§6.5 ([#591](https://github.com/Takazudo/zudo-design-token-panel/pull/591)) (bbdf5bb, 6f036b7)
- docs(site): document `:autoload` provenance and `autoRememberOnOpen` in the owner-autoload recipe (EN + JA) ([#591](https://github.com/Takazudo/zudo-design-token-panel/pull/591)) (7baa165)
- docs: document the first-open spawn-geometry contract — README §5.6 and `PORTABLE-CONTRACT.md` §2.1 ([#595](https://github.com/Takazudo/zudo-design-token-panel/pull/595)) (6f10ffc)
- docs: correct the persisted position shape to `{ top, left }` — README §9 and `PORTABLE-CONTRACT.md` §2 documented it as `{ top, right }`, which matters now that the contract file ships to npm ([#595](https://github.com/Takazudo/zudo-design-token-panel/pull/595)) (9f6494f)
- docs(host-adapter): correct the sibling-prefix collision example ([#591](https://github.com/Takazudo/zudo-design-token-panel/pull/591)) (bc137cd)
- test: complete the lazy-load gate decision-matrix coverage ([#591](https://github.com/Takazudo/zudo-design-token-panel/pull/591)) (76cb4a3)
- test: confirm multi-instance spawn geometry in a real browser ([#595](https://github.com/Takazudo/zudo-design-token-panel/pull/595)) (11988d6)

## [0.4.10] - 2026-08-10

### Fixed

- fix: guard deferred DOM access against torn-down documents — async adapter closures, public entry points, and Preact effect-flush paths now cancel quietly instead of throwing `document.getElementById is not a function` as an unhandled rejection when the host environment tears down or swaps the document mid-flight (reported downstream as zudolab/zudo-doc#3344) ([#568](https://github.com/Takazudo/zudo-design-token-panel/pull/568)) (4b5551a)
- fix: close straggler-state leaks in the document-teardown guards — a cancelled show no longer arms autoload, the open-state persistence effect cannot clobber seeded visibility, and a nulled `document` global is treated as dead ([#568](https://github.com/Takazudo/zudo-design-token-panel/pull/568)) (28b02b1)
- fix: null-tolerant liveness guards on the lifecycle bind paths ([#568](https://github.com/Takazudo/zudo-design-token-panel/pull/568)) (0774ea8)

### Other Changes

- docs: migrate the doc site to zudo-doc 4.x — S1–S6 series ([#556](https://github.com/Takazudo/zudo-design-token-panel/pull/556)–[#562](https://github.com/Takazudo/zudo-design-token-panel/pull/562)) (e2f36b5, 51c674c, ff38109, e36e718, e7838fb, c20cc83, f89a6bf)
- docs(l-make-release): auto-proceed Step 3 gate for routine bumps (45a5aca)

## [0.4.9] - 2026-07-13

### Features

- feat: add color picker close button ([#542](https://github.com/Takazudo/zudo-design-token-panel/pull/542)) (8596353)
- feat(zdtp): clean up semantic color rows ([#544](https://github.com/Takazudo/zudo-design-token-panel/pull/544)) (849e0ad)

### Fixed

- fix: enforce color picker close hit target ([#546](https://github.com/Takazudo/zudo-design-token-panel/pull/546)) (85c9acd)
- fix(panel): add palette check view styles ([#543](https://github.com/Takazudo/zudo-design-token-panel/pull/543)) (a6a1fa2)

### Other Changes

- docs: fix apply pipeline heading anchor ([#554](https://github.com/Takazudo/zudo-design-token-panel/pull/554)) (13afef6)
- docs: refresh palette check mode guide ([#545](https://github.com/Takazudo/zudo-design-token-panel/pull/545)) (4ab2ce3)
- test: record color picker close control VRT (aa66eba)
- chore: start panel UI tweaks 540 (57fb4c7)

## [0.4.8] - 2026-07-13

### Features

- DOM Tweaker — live Tailwind class editor with element picker, suggestions, edit-session state, confirmation gates, and runtime orchestration ([#539](https://github.com/Takazudo/zudo-design-token-panel/pull/539)) (46f4524, 67e695e, b8bafeb, 5de9ae8, 6e4baab, 376d390, eef4c2, 75f14c7)

### Other Changes

- docs(zdtp): add DOM Tweaker reference ([#539](https://github.com/Takazudo/zudo-design-token-panel/pull/539)) (b2b2ed3)
- chore(dom-tweaker): remove consumed prototype resource ([#539](https://github.com/Takazudo/zudo-design-token-panel/pull/539)) (9a0ac51)
- docs(l-make-release): add autonomy-after-the-gate principle (7f64206)

## [0.4.7] - 2026-07-12

### Fixed

- fix(server): coalesce same-file token groups in createApplyHandler ([#527](https://github.com/Takazudo/zudo-design-token-panel/pull/527)) (1d84c94)

### Other Changes

- chore(deps): resolve 19 pnpm audit security advisories ([#525](https://github.com/Takazudo/zudo-design-token-panel/pull/525)) (80c9a0e)

## [0.4.6] - 2026-07-12

### Features

- Notes tab — host-configurable token notes as the panel's top page ([#515](https://github.com/Takazudo/zudo-design-token-panel/issues/515)) (4169a05)
- Palette tab: groups collapsed by default with boxed toggle headers ([#517](https://github.com/Takazudo/zudo-design-token-panel/issues/517)) (2ff5a1e)
- Container-query responsive header & tabs at narrow panel widths, plus "zdtp" panel title + square corners ([#518](https://github.com/Takazudo/zudo-design-token-panel/issues/518)) (25dff1a)
- Click-to-cycle unit suffix on value inputs ([#519](https://github.com/Takazudo/zudo-design-token-panel/issues/519)) (b05581d)
- "?" help tooltips for Literal and Per-mode rows in the Color tab ([#520](https://github.com/Takazudo/zudo-design-token-panel/issues/520)) (c85fd69)
- `zdtp.show()` — fixed-name global open API ([#523](https://github.com/Takazudo/zudo-design-token-panel/issues/523)) (9b3c636)

### Fixed

- Tooltip repositions correctly after panel resize (ResizeObserver initial-delivery fix) ([#516](https://github.com/Takazudo/zudo-design-token-panel/issues/516)) (d10fe16)
- Closed a C0-control URL-scheme bypass in the notes-tab HTML sanitizer ([#515](https://github.com/Takazudo/zudo-design-token-panel/issues/515)) (19f7147)
- Corrected kebab-close dead zone + title truncation in the responsive header ([#518](https://github.com/Takazudo/zudo-design-token-panel/issues/518)) (bfc4b81)
- `window.zdtp` guards against a null instance and clarifies multi-instance behavior ([#523](https://github.com/Takazudo/zudo-design-token-panel/issues/523)) (bcc71aa)

### Other Changes

- docs: notes-tab demo in doc-site manifest; help-icon resize-pin trade-off + sanitizer intent documented (82cf7d8, fe1b477)
- test: VRT baselines re-recorded for zdtp title + square corners; broad coverage added for notes tab, help icons, unit cycling
- chore: removed consumed `_temp-resource/` prototype scaffold (ccbd18a)

## [0.4.5] - 2026-07-07

### Features

- Per-scheme/per-mode keyed color persistence — envelope v4 ([#509](https://github.com/Takazudo/zudo-design-token-panel/issues/509)) (653c4ab)
- Distinguish declared-outside-scanned-block from genuinely-absent unknowns ([#508](https://github.com/Takazudo/zudo-design-token-panel/issues/508)) (441fa93)
- Scan top-level `@theme` blocks in `applyTokenOverrides` ([#507](https://github.com/Takazudo/zudo-design-token-panel/issues/507)) (d6c6692)
- Add `colorExtras.semanticDefaults` config-time override map ([#499](https://github.com/Takazudo/zudo-design-token-panel/issues/499)) (543136e)

### Fixed

- Harden v4 persistence load edge cases ([#509](https://github.com/Takazudo/zudo-design-token-panel/issues/509) audit, epic [#502](https://github.com/Takazudo/zudo-design-token-panel/issues/502) review) (2b07460)
- Scope color-scheme clearing to panel-written values (closes [#506](https://github.com/Takazudo/zudo-design-token-panel/issues/506)) (f434c8c)
- Validate persisted semantic index mappings against live cluster paletteSize ([#503](https://github.com/Takazudo/zudo-design-token-panel/issues/503)) (915ffbf)

### Other Changes

- docs: sync README + doc-site with `@theme` apply, v4 persistence, schemaId ([#511](https://github.com/Takazudo/zudo-design-token-panel/issues/511)) (3c3fd57)
- test: cross-cutting interaction coverage for [#510](https://github.com/Takazudo/zudo-design-token-panel/issues/510) confirm pass (9a5d7fe)
- docs: truth-up schemaId docs, tighten Import modal copy, export `SCHEMA_V1`/`SCHEMA_V2`/`SCHEMA_V3` ([#505](https://github.com/Takazudo/zudo-design-token-panel/issues/505)) (8088281)
- docs: replace zmodular references with Takazudo Modular markdown links (afcfea2)

## [0.4.4] - 2026-07-06

### Features

- **Ramp-native Tier-2 color editor.** The Color tab gained a semantic-value tier model — a `semantic: true` tier holds `SemanticValue` mappings (palette index, literal OKLCH, per-mode `light-dark()` literal, or a cross-tab ramp `{ ref }`) instead of raw palette entries, and can ship as a lone semantic tier with no palette tier at all ([#459](https://github.com/Takazudo/zudo-design-token-panel/issues/459), closes [#458](https://github.com/Takazudo/zudo-design-token-panel/issues/458)) ([8ed93e1](https://github.com/Takazudo/zudo-design-token-panel/pull/476))
- Add semantic-tier marker + `SemanticValue` union (S1) ([#460](https://github.com/Takazudo/zudo-design-token-panel/pull/460)) (d7aa526)
- serde `SCHEMA_V3` object leaves for `SemanticValue` variants (S5) ([#462](https://github.com/Takazudo/zudo-design-token-panel/pull/462)) (0185477)
- Render literal semantic rows as editable OKLCH swatches (S3) ([#464](https://github.com/Takazudo/zudo-design-token-panel/pull/464)) (d8bceb3)
- Emit literal semantic values verbatim in both emitters (S4) ([#465](https://github.com/Takazudo/zudo-design-token-panel/pull/465)) (5961ed7)
- Cross-tab ref resolution + tabs-array cluster-bridge signature (S7a) ([#467](https://github.com/Takazudo/zudo-design-token-panel/pull/467)) (35ef368)
- Emit cross-tab semantic refs as `var(--target)` in both emitters (S7b) ([#468](https://github.com/Takazudo/zudo-design-token-panel/pull/468)) (ea2aa8a)
- Validate cross-tab ramp-source declarations (S8) ([#469](https://github.com/Takazudo/zudo-design-token-panel/pull/469)) (8558269)
- Grouped ref-or-literal picker + wire color-tab semantic rows (S9) ([#470](https://github.com/Takazudo/zudo-design-token-panel/pull/470)) (3d5e5f7)
- Per-mode literal `light-dark()` emission + `defaultMode` runtime (S11) ([#472](https://github.com/Takazudo/zudo-design-token-panel/pull/472)) (3a05623)
- Per-mode light/dark literal editor UI (S12) ([#473](https://github.com/Takazudo/zudo-design-token-panel/pull/473)) (1828458)

### Fixed

- Seed Scheme preset load against the instance cluster, not the global default ([#491](https://github.com/Takazudo/zudo-design-token-panel/issues/491) audit) (a1b0dd8)
- Thread `instanceConfig` into `ColorTab` for multi-instance ref resolution ([#491](https://github.com/Takazudo/zudo-design-token-panel/issues/491)) (66447ec)
- Validate semantic marker shape + mixed-order palette-pick regression tests ([#487](https://github.com/Takazudo/zudo-design-token-panel/pull/487)) (0ebcc6e)
- Scheme/preset load is a no-op for a palette-less color cluster ([#488](https://github.com/Takazudo/zudo-design-token-panel/pull/488)) (23d61ba)
- Color-scheme lifecycle asymmetries in the applied-state ([#482](https://github.com/Takazudo/zudo-design-token-panel/pull/482)) (ef686fc)
- serde robustness — order-independent ref diff, stale-ref warning, integer index leaves (c0b4356)
- Restore legacy index-0 fallback + detect named-color literals ([#483](https://github.com/Takazudo/zudo-design-token-panel/pull/483)) (4f66b7d)
- Show a disabled unresolved placeholder for a dangling `TierRefSelector` ref ([#484](https://github.com/Takazudo/zudo-design-token-panel/issues/484)) (a4c222b)
- Thread owning color tab into `buildApplyOverrides` for secondary-cluster refs (D1) ([#481](https://github.com/Takazudo/zudo-design-token-panel/pull/481)) (60cbb7a)
- Skip an unresolvable semantic `{ ref }` in the DOM emitter too (87131ee)
- Drop phantom grayscale swatch for palette-less semantic tier ([#466](https://github.com/Takazudo/zudo-design-token-panel/pull/466) follow-up) (c955616)
- Derive semantic maps for a palette-less semantic tier (S2b) ([#463](https://github.com/Takazudo/zudo-design-token-panel/pull/463)) (7d617d1)
- Honor semantic-tier marker in palette detection + F4 (S2a) ([#461](https://github.com/Takazudo/zudo-design-token-panel/pull/461)) (ecb4482)

### Other Changes

- Eliminate intermittent vitest unhandled-error flake ([#494](https://github.com/Takazudo/zudo-design-token-panel/issues/494)) (ab60f91)
- e2e confirm per-mode literal `light-dark()` + clear color-scheme on reset (S13) ([#474](https://github.com/Takazudo/zudo-design-token-panel/pull/474)) (a215c88)
- e2e confirm cross-tab semantic ref cascade (S10) ([#471](https://github.com/Takazudo/zudo-design-token-panel/pull/471)) (235bb30)
- e2e confirm lone literal semantic tier unblocks [#458](https://github.com/Takazudo/zudo-design-token-panel/issues/458) (S6) ([#466](https://github.com/Takazudo/zudo-design-token-panel/pull/466)) (8fb5136)
- docs: translate token-manifest reference page to Japanese ([#490](https://github.com/Takazudo/zudo-design-token-panel/issues/490), [#478](https://github.com/Takazudo/zudo-design-token-panel/issues/478)) (7bcd835)
- docs: translate color-cluster reference to Japanese ([#489](https://github.com/Takazudo/zudo-design-token-panel/issues/489), [#478](https://github.com/Takazudo/zudo-design-token-panel/issues/478)) (e033410)
- docs: fix EN documentation drift from [#459](https://github.com/Takazudo/zudo-design-token-panel/issues/459) (referencesRamps, bridge signature, color-scheme caveat) (a7d8709)
- docs: document ramp-native Tier-2 editor + example manifest + cascade test (S14) ([#475](https://github.com/Takazudo/zudo-design-token-panel/pull/475)) (136bcf6)
- docs: fix broken `SemanticValue` heading anchor (drop em-dash from slug) (ef3cd91)
- chore(deps): bump `@takazudo/zudo-doc` and `zudo-doc-history-server` to `^2.5.1` (d6c05dd)
- chore(doc): sync generated `claude/index.mdx` with build output (d763238)

## [0.4.3] - 2026-07-04

### Features

- **Dismiss-layer arbitration for layered surfaces.** A shared dismiss-layer stack routes Escape to only the topmost open layer (nested popover → popover → panel), and all three modals gained gesture-aware backdrop dismissal (press+release must both land outside), fixing one-Escape-closes-everything, trigger-click reopen races, and text-selection drags closing modals ([#446](https://github.com/Takazudo/zudo-design-token-panel/issues/446)) (9119c7e, 8257b19)
- **CSS isolation architecture.** Panel z-indexes are now a semantic token scale shared by CSS and TSX (shell renders above common host chrome), a `box-sizing` reset is scoped to the panel subtree, panel geometry moved from rem to px so host root font-size cannot warp the panel, and `color-scheme` is declared on panel surfaces ([#448](https://github.com/Takazudo/zudo-design-token-panel/issues/448)) (62f8e4c)
- **Visual-regression test tier.** 8 Playwright baselines (palette chart, color-picker swatch + popover, panel chrome — light + dark) with a documented `test:vrt:update` flow, wired into CI ([#454](https://github.com/Takazudo/zudo-design-token-panel/issues/454)) (5241e02)
- **Real lint + doc-link gates.** oxlint wired for the panel and linkinator + html-validate for the doc site — the CI Lint step is no longer a no-op ([#443](https://github.com/Takazudo/zudo-design-token-panel/issues/443)) (4812160)

### Fixed

- `configurePanel` re-runs no longer throw when combined with `setPanelColorPresets` (Astro view-transitions + lazy color presets recipe); sink instances seed from `panelSettings.colorScheme` instead of the host `data-theme`; palette cssVar templates and `colorExtras` are validated at configure time ([#440](https://github.com/Takazudo/zudo-design-token-panel/issues/440)) (afe8a36, 87df039, 4d5e611)
- `applyTokenOverrides` no longer rewrites the wrong declaration when one custom-property name is a suffix of another — `zdtp-server` could corrupt CSS files on disk ([#441](https://github.com/Takazudo/zudo-design-token-panel/issues/441)) (3be6865)
- Highlight subsystem: match cache is evicted on stylesheet changes (stale detached elements no longer stay highlighted), percentage values are classified as lengths, and a highlight probe runs one full-DOM walk instead of three ([#442](https://github.com/Takazudo/zudo-design-token-panel/issues/442)) (fc07e41)
- PaletteSelector listbox is fully keyboard-operable; ApplyModal's `onApplied` cleanup contract now holds on every dismissal route ([#446](https://github.com/Takazudo/zudo-design-token-panel/issues/446)) (8257b19)
- State persistence: changing a palette's size no longer discards spacing/typography/size/tab overrides; restored positions are viewport-clamped and finite; fresh-mount toggle intent; window-resize handling debounced; imported palette values pass the seed-time sanitizer; dead `panelPosition` path removed ([#447](https://github.com/Takazudo/zudo-design-token-panel/issues/447)) (8f67382)
- Astro soft navigation unmounts/remounts **all** registered panel instances (was: default only — other instances leaked listeners per navigation and vanished until re-toggled), and persisted overrides are reapplied for every instance, including hidden ones ([#449](https://github.com/Takazudo/zudo-design-token-panel/issues/449), [#457](https://github.com/Takazudo/zudo-design-token-panel/issues/457)) (908d6df, 8ce3d8b)
- CSS accessibility: `:focus-visible` styles for every native form control (host `outline: none` resets can no longer hide focus), raw color literals replaced by `--tokentweak-*` tokens, 24×24 minimum hit areas, `prefers-reduced-motion` support ([#450](https://github.com/Takazudo/zudo-design-token-panel/issues/450)) (fa36675)
- The panel's SVG defensive reset now survives a hostile `svg { fill: red !important }` host rule ([#452](https://github.com/Takazudo/zudo-design-token-panel/issues/452)) (6ac7129)
- Packaging: exports map gained `default` conditions and a `./package.json` export, broken declaration maps are no longer shipped, and a post-build check fails the build if any exports entry does not resolve against `dist/` ([#444](https://github.com/Takazudo/zudo-design-token-panel/issues/444)) (13862a4)
- `release.yml` `dry_run` builds the package again, as its description advertises (8ce3d8b)

### Other Changes

- Docs now describe the real stylesheet mechanism — the panel self-injects its CSS via an inline import; no consumer CSS import is required — and stale pre-rename `packages/zudo-design-token-panel/` paths are purged ([#445](https://github.com/Takazudo/zudo-design-token-panel/issues/445)) (54756a2)
- CI overhaul: PR branch filters cover live `base/**` branches, tests gate main pushes and `v*` release tags, Playwright browsers are cached, duplicate builds removed, concurrency cancellation + job timeouts everywhere ([#443](https://github.com/Takazudo/zudo-design-token-panel/issues/443)) (dbf5704)
- New automated hostile-host isolation gate (Level 5): the panel's computed styles and viewport-fixed positioning are asserted inside a hostile host page, including a transform-ancestor scenario ([#452](https://github.com/Takazudo/zudo-design-token-panel/issues/452)) (6ac7129)
- 17 browser-mode gesture tests for panel drag-to-move / resize incl. viewport clamping and persistence ([#453](https://github.com/Takazudo/zudo-design-token-panel/issues/453)) (a4b25af)
- Test-suite hygiene: the DOM-policy static gate covers every panel TSX file and the full blocked-tag list, the palette drag browser test asserts for real, shared effect-flush helper, and a `test:unit` script runs the non-browser projects without Chromium ([#451](https://github.com/Takazudo/zudo-design-token-panel/issues/451)) (ebe0018, 8a7ee63, 4682139, 9b6c989)
- Browser test files now run serially — parallel files share one origin and raced each other's localStorage (fd37774)
- Deps: bump @takazudo/* toolchain (zfb next.76, zudo-doc 2.5.0) (62b62f6)

## [0.4.2] - 2026-06-30

### Features

- **OKLCH color tab — the reserved `color` tab now honors `format: 'oklch'`.** A cluster-based color tab whose palette tier items declare `type: { kind: 'color', format: 'oklch' }` now edits its palette swatches through the lossless OKLCH `ColorField` (the `valueFormat: 'oklch'` picker added in 0.3.3) while keeping the full color-cluster feature set — base roles, semantic→palette mappings, the "Scheme…" preset dropdown, and the secondary cluster. The palette `format` is read from `tab.tiers` (the flattened cluster drops per-item format), and both the primary and secondary cluster palettes honor it. Absent / `'hex'` format keeps the existing native hex behavior, so existing consumers and the highlight popover are unchanged. ([#436](https://github.com/Takazudo/zudo-design-token-panel/issues/436), epic [#434](https://github.com/Takazudo/zudo-design-token-panel/issues/434), supersedes [#433](https://github.com/Takazudo/zudo-design-token-panel/issues/433)) (ab761b6)

- **Owner-only autoload.** A new `${storagePrefix}:autoload` `localStorage` flag lets the site owner load the panel in their own browser without touching general visitors. When the flag is set, the panel bundle loads eagerly on every page visit and mounts CLOSED — the **Alt+click element-path inspector** is armed immediately even while the panel UI stays hidden. General visitors (no flag) receive zero panel JS.

  New package-root exports: `enableAutoload()`, `disableAutoload()`, `shouldAutoload()`. The Astro host-adapter also installs `window[consoleNamespace].enableAutoload()` and `window[consoleNamespace].disableAutoload()` on the console API surface.

  The existing on-demand flow (`showDesignPanel()` / `hideDesignPanel()` / `toggleDesignPanel()`) is unchanged. Owner-autoload is an opt-in layer on top of it, not a replacement.

  **Auto-remember:** any action that opens the panel also writes `${storagePrefix}:autoload = '1'`. Once an owner opens the panel, subsequent page loads reload it automatically without another explicit `enableAutoload()` call.

  **Lazy-load gate updated from 2 to 4 signals:** the host-adapter gate now fires on `wasVisible() || hasPersistedOverrides() || shouldAutoload() || loadElementPathEnabled()`. The last two signals are new; the previous two-signal behavior is a strict subset of the new gate, so existing consumers see no change.

  ([#419](https://github.com/Takazudo/zudo-design-token-panel/issues/419), [#420](https://github.com/Takazudo/zudo-design-token-panel/issues/420), [#421](https://github.com/Takazudo/zudo-design-token-panel/issues/421), [#422](https://github.com/Takazudo/zudo-design-token-panel/issues/422), [#423](https://github.com/Takazudo/zudo-design-token-panel/issues/423))

### Fixed

- **Runtime preserves OKLCH through seed / apply / persist.** `initColorFromSchemeData` no longer eagerly normalizes the whole palette to sRGB hex via a canvas `fillStyle` round-trip — raw `oklch(...)` palette values now survive seeding (wide-gamut chroma intact; no collapse to `#000000` under jsdom / engines whose 2D canvas can't parse `oklch`), and `colorRefToIndex` is format-tolerant + alpha-aware. Non-`oklch` entries are still sanitized through `cssColorToHex`, so an invalid bundled-scheme string (e.g. `Default Dark`'s slot-9 `"18"`, referenced by `background: 9`) cannot leak into a CSS custom property. ([#435](https://github.com/Takazudo/zudo-design-token-panel/issues/435)) (162bf8e, 8d54e07)

- **Owner-autoload review fixes** — `disableAutoload()` now unmounts the panel, and element-path storage keys are per-instance. ([#424](https://github.com/Takazudo/zudo-design-token-panel/issues/424)) (ecfd745)

### Other Changes

- **Panel is draggable, movable & resizable on narrow windows**; `defaultSize()` is clamped to the `MIN_PANEL` floor on phone-width viewports; and Element-Path-Copy keeps working while the panel is closed. ([#415](https://github.com/Takazudo/zudo-design-token-panel/pull/415)) (2dc40a1, 8fb99b5, f163625)
- Wave-2 OKLCH cluster end-to-end test plus runtime / color-tab coverage. ([#437](https://github.com/Takazudo/zudo-design-token-panel/issues/437)) (8da36c6, 47e4d83, fad4ded)
- Bump the `@takazudo/*` toolchain (zfb next.72, zudo-doc 2.1.2). (d711839)
- Doc-site migration to zudo-doc v2 — doc-site only, no package impact. ([#432](https://github.com/Takazudo/zudo-design-token-panel/pull/432))

## [0.4.1] - 2026-06-30

### Fixed

- **Palette tab no longer renders unstyled for self-injection consumers.** The 0.4.0 palette-tab CSS (`palette-chart` / `palette-edit` / `palette-readout`) reached `dist/zdtp.css` but was missing from the stylesheet the panel self-injects at runtime, so consumers using `import('@takazudo/zdtp')` + `configurePanel(...)` without importing `@takazudo/zdtp/styles` saw collapsed swatch bars and a missing curve-editor canvas. The two palette stylesheets are now `@import`ed into the single `panel.css` aggregate (matching `color-picker.css`) so both CSS delivery paths stay in sync, guarded by a new static `Invariant G` test. ([#413](https://github.com/Takazudo/zudo-design-token-panel/issues/413))

## [0.4.0] - 2026-06-29

### Features

- **Palette tab — an OKLCH palette generator & checker built into the panel.** A new reserved `palette` tab (joining `color` / `font` / `spacing` / `size`) lets a host define grouped color scales as `{ kind: "color", format: "oklch" }` tier items (`--palette-{group}-{n}`) and edit/verify them in-panel with no lossy hex round-trip. Two modes:
  - **Edit mode** — a grouped step grid plus a `PrismChart` OKLCH L/C/H curve editor; dragging a curve re-derives every step in the group and commits the whole group in one batched write on pointer-up. ([#390](https://github.com/Takazudo/zudo-design-token-panel/issues/390), [#393](https://github.com/Takazudo/zudo-design-token-panel/issues/393), [#395](https://github.com/Takazudo/zudo-design-token-panel/issues/395))
  - **Check mode** — a WCAG contrast-checker view over the live palette. ([#394](https://github.com/Takazudo/zudo-design-token-panel/issues/394))
  - Backed by new OKLCH curve math + WCAG contrast helpers, and wired through the generic-tab apply path (`buildApplyOverrides` emits `state.tabs[*]`) so palette overrides apply, persist, and round-trip through Export/Load. ([#391](https://github.com/Takazudo/zudo-design-token-panel/issues/391), [#392](https://github.com/Takazudo/zudo-design-token-panel/issues/392))

### Fixed

- Palette flat-mode tier ids, persist-safe hue handling, and serialize arity (post-codex-review hardening). (f9c38f9)

### Other Changes

- Integration + serde + browser-confirm test coverage for the palette tab. ([#396](https://github.com/Takazudo/zudo-design-token-panel/issues/396))
- Add a grouped palette tab recipe + reference docs (EN + JA). ([#397](https://github.com/Takazudo/zudo-design-token-panel/issues/397))

## [0.3.3] - 2026-06-23

### Features

- **OKLCH display & edit for opt-in GenericTab color items.** A `GenericTab` `{ kind: "color" }` tier item can now set `format: "oklch"` to route through the OKLCH/HSL `ColorPicker` instead of the native `<input type="color">`, so host/secondary panels can faithfully **display and edit** wide-gamut oklch/P3 palette values (e.g. a family-named `--palette-cool-700: oklch(...)`) with **no lossy hex round-trip on commit**. Additive and backward compatible — omitting `format` (or `"hex"`) keeps the native color input, so existing consumers, `ColorTab`, and the highlight popover are unchanged. ([#373](https://github.com/Takazudo/zudo-design-token-panel/issues/373), supersedes [#372](https://github.com/Takazudo/zudo-design-token-panel/issues/372))
  - Add a `cssToOklcha` CSS Color 4 `oklch()` parser (number/percentage L, chroma `%` = 0.4, deg/rad/grad/turn hue, `none`, alpha; strict — rejects malformed channels). ([#374](https://github.com/Takazudo/zudo-design-token-panel/issues/374))
  - Extend the public `{ kind: "color" }` tier-item type with optional `format?: "hex" | "oklch"`. ([#375](https://github.com/Takazudo/zudo-design-token-panel/issues/375))
  - Give `ColorPicker` a `valueFormat` contract: in oklch mode a canonical `Oklcha` is the source of truth and wide-gamut chroma survives prop→edit→emit without sRGB clamping. ([#376](https://github.com/Takazudo/zudo-design-token-panel/issues/376))
  - HSL/alpha/preset hardening: the OKLCH↔HSL mode toggle is emit-free; only an HSL slider edit is a (documented) sRGB-oriented path. ([#377](https://github.com/Takazudo/zudo-design-token-panel/issues/377))
  - Add a shared `ColorField` (swatch-button → picker popover) and route both generic item editors through it. ([#378](https://github.com/Takazudo/zudo-design-token-panel/issues/378))

### Fixed

- **Style the `ColorField` swatch and reject malformed oklch tokens.** The new opt-in swatch had no CSS (an empty `div` with only a background color → zero-size/invisible affordance); added sized swatch styles. The `cssToOklcha` tokenizer also accepted malformed channels (e.g. `oklch(50px 0.1 120)`) by silently extracting numeric substrings; it now requires exactly three fully-anchored channel tokens and rejects unknown suffixes. ([#380](https://github.com/Takazudo/zudo-design-token-panel/pull/380)) (2d045d0)

### Other Changes

- Add an end-to-end test asserting the oklch round-trip (panel `onChange` + apply path both emit `oklch(...)`) and wide-gamut P3 preservation. ([#379](https://github.com/Takazudo/zudo-design-token-panel/issues/379)) (0595f28)

## [0.3.2] - 2026-06-23

### Fixed

- **Mount the real config on the toggle window event for single-instance non-Astro hosts.** The 0.3.0 multi-instance refactor binds the default instance's `toggle-design-token-panel` listener eagerly at module init, closed over the empty `DEFAULT_PANEL_CONFIG`; the post-`configurePanel()` rebind no-oped for the already-bound prefix, so window-event hosts mounted an empty-body panel (toolbar shell, no tabs). The toggle handler now re-resolves the instance config by prefix at dispatch time (falling back to the active instance for the reserved default event), and `panel.tsx`'s `tabConfigById` tracks `[instanceConfig]` so the tab-body dispatch map never goes stale. The console API was unaffected, so only non-Astro window-event hosts regressed. ([#370](https://github.com/Takazudo/zudo-design-token-panel/issues/370))

- **Dedupe the reserved toggle event across listeners.** When a custom-prefix host opts into the reserved `toggle-design-token-panel` name via `config.toggleEvent`, both the eager default listener and the instance's own listener fired on one dispatch and resolved to the same instance — toggling it twice (open, then immediately close). The handler now dedupes per dispatch by resolved instance id carried on the shared Event object, so the panel opens exactly once. ([#371](https://github.com/Takazudo/zudo-design-token-panel/pull/371))

## [0.3.1] - 2026-06-23

### Fixed

- **Round-trip generic (custom-id) tab overrides through Export/Load.** The design-token serde only handled the four dedicated slices (color/spacing/font/size); overrides for host-coined generic (custom-id) tabs lived in `state.tabs` and were applied live but silently dropped from Export, so Load-from-JSON could not restore them. `serialize()` now emits each non-reserved configured tab's overrides under `tabs[id].raw` (cssVar-keyed) and `deserializeV2()` reads them back into `state.tabs[id]` via a tier-aware reverse lookup — symmetric with the existing apply path. ([#363](https://github.com/Takazudo/zudo-design-token-panel/issues/363))

- **Skip the bin integration test suite when `dist/bin/server.js` is absent.** `server.integration.test.ts` spawns the built bin and previously threw in `beforeAll` when it was missing, failing the `node` vitest project on a fresh checkout (before a build). It now gates the suite with `describe.skipIf` on build presence (with a console warning) instead of hard-failing; CI builds before testing, so the suite still runs there. ([#360](https://github.com/Takazudo/zudo-design-token-panel/issues/360))

## [0.3.0] - 2026-06-22

### Features

- **Multi-instance support.** `configurePanel(config)` now returns a `PanelInstanceHandle` and supports multiple independent panel instances on one page. Calling it with a distinct `storagePrefix` registers a new instance (independent storage keys, DOM root, toggle event, apply target). Calling it again with the same prefix and structurally-equal config is a no-op that returns the same handle (covers Astro view-transition reruns). Calling it with the same prefix but a structurally-different config throws immediately (`RECONFIGURE_RULE = 'reject-with-error'`); call `handle.destroy()` first to re-configure a prefix. Additive and backward-compatible — single-panel hosts observe no change. ([#353](https://github.com/Takazudo/zudo-design-token-panel/issues/353))

- **`PanelInstanceHandle`.** `configurePanel` now returns a handle with `{ instanceId, open(), close(), toggle(), destroy() }`. `instanceId` equals `storagePrefix`. `destroy()` deregisters the instance, unmounts its Preact tree, removes its DOM root, and unbinds its toggle-event listener — freeing the prefix for re-configuration. ([#353](https://github.com/Takazudo/zudo-design-token-panel/issues/353))

- **Per-instance toggle events.** The default instance (the historical `storagePrefix`) keeps `toggle-design-token-panel` unchanged. Any instance with a non-default prefix listens on `config.toggleEvent` when supplied, or `toggle-${storagePrefix}` by default — giving each instance its own independent toggle channel. `PanelConfig.toggleEvent?: string` is a new optional field. ([#354](https://github.com/Takazudo/zudo-design-token-panel/issues/354))

- **`PanelConfig.applySink`.** An optional `{ apply(pairs), clear(names) }` sink routes this instance's CSS-var writes and clears through a caller-supplied object instead of `document.documentElement`. Useful for shadow DOM, iframe, or test-spy contexts. `apply` = upsert; `clear` = remove. Reset sends the full token-name set for the instance to `sink.clear` so the sink target is completely cleaned. Sink errors are non-fatal (`console.warn`). The host owns the sink target's lifecycle. `applySink` carries function references and must not be passed through the Astro inline JSON config. ([#355](https://github.com/Takazudo/zudo-design-token-panel/issues/355))

## [0.2.3] - 2026-06-15

### Bug Fixes

- A host `color-scheme-changed` event (light/dark toggle) no longer wipes the user's `spacing` / `typography` / `size` tweaks from the live panel. The scheme-change handler now clears only the color cluster's inline `:root` vars and re-seeds only the `color` (and optional `secondary`) slices, leaving the scheme-independent non-color slices — and their applied inline vars — intact. Previously it called the full `clearAppliedStyles()` + `freshTweakState()`, which stripped every spacing/font/size var and emptied those live slices, so the next in-panel edit permanently persisted the loss. A new internal `clearAppliedColorStyles()` performs the color-only clear; full resets (Reset / Apply) keep using `clearAppliedStyles()`. ([#347](https://github.com/Takazudo/zudo-design-token-panel/issues/347))

### Features

- Make `ColorScheme.shikiTheme` optional so hosts can pass their color-scheme maps without a dummy `shikiTheme` or an `as unknown as` cast — the runtime already falls back to the cluster's `defaultShikiTheme`. The hydrated `ColorTweakState.shikiTheme` stays required (it is always defaulted, and `TweakState` is re-exported, so keeping it required avoids widening the public `state.color.shikiTheme` type). (e057388, fd87423, [#342](https://github.com/Takazudo/zudo-design-token-panel/issues/342))

### Other Changes

- docs: document the global (not scheme-scoped) tweak model in README §9 — on a host `color-scheme-changed` event the panel drops its inline overrides and re-seeds the live state from the new scheme, leaving `localStorage` untouched until the next edit. (238b4db, [#343](https://github.com/Takazudo/zudo-design-token-panel/issues/343))
- ci: drop the stale npm `next` dist-tag on stable releases when it lags `latest`, so `@takazudo/zdtp@next` can no longer silently resolve to an older prerelease. (215ec59, [#345](https://github.com/Takazudo/zudo-design-token-panel/issues/345))

## [0.2.2] - 2026-06-15

### Other Changes

- Post-review internal cleanups for the Element Path Copy feature (no behavior change): single source of truth for the highlight / element-path portal-mount ids (`HIGHLIGHT_PORTAL_MOUNT_ID` / `ELPATH_PORTAL_MOUNT_ID`, folded into `PANEL_EXCLUSION_SELECTOR`); `ElementPathToast` now owns its own fixed top-center positioning and z-index; `buildSummary` escapes the id consistently with the selector line; the always-on `mousemove` listener is passive + non-capture; and the hover-label summary is memoized. (0fdcbd6)

## [0.2.1] - 2026-06-14

### Features

- **Element Path Copy inspect mode.** A new crosshair toggle in the panel header arms an inspector: hold **Alt** and hover to draw a DevTools-style box + label over the host element under the cursor, then click to copy an annotated path block — unique CSS `selector`, human-readable `breadcrumb`, ARIA `role`, `text` snippet, identifying `attrs`, and rendered `size` — to the clipboard for precise human↔AI communication about the page. State persists in `localStorage`; the click is swallowed so host links/handlers don't fire. (e8bd453, 736d6d2, [#344](https://github.com/Takazudo/zudo-design-token-panel/pull/344))

### Other Changes

- Apply pre-release deep-review fixes: extract a shared `usePortalMount()` hook used by both the highlight and element-path orchestrators (removing ~80 lines of duplicated portal/`astro:after-swap` lifecycle), render the header toggle via the shared `RoleButton` control, add a persistent visually-hidden `aria-live` region so screen readers announce copy results, and harden the `cssEscapeIdent` fallback for control characters. (9b893f6, a64f4d3, [#344](https://github.com/Takazudo/zudo-design-token-panel/pull/344))
- Bump GitHub Actions off the deprecated Node 20 runtime: `checkout` / `setup-node` / pnpm-setup and the artifact actions to their Node-24-matched versions. (08d5b48, b46fd66, [#339](https://github.com/Takazudo/zudo-design-token-panel/pull/339), [#341](https://github.com/Takazudo/zudo-design-token-panel/pull/341))
- Add a web-env bootstrap for Claude Code on the web. (23f00c3)

## [0.2.0] - 2026-06-09

First clean stable release on the `latest` dist-tag, promoting the
`0.2.0-next.1` / `0.2.0-next.2` prerelease line. A tagless
`pnpm add @takazudo/zdtp` now resolves this build.

### Breaking Changes

- **Removed the `min` and `max` properties from `TokenDef` and `TierValueKind` (`'length'` | `'number'` variants).** Numeric token rows are now plain unconstrained number inputs — the `<input type="range">` slider and the mid-keystroke / on-blur clamp logic (and the `aria-invalid` out-of-range styling) are gone; values commit as typed. Real-world use proved sliders too restrictive for a developer tool. **Migration**: remove every `min: ...` and `max: ...` field from your token manifests. The internal color-picker `SliderConfig.min` / `.max` (OKLCH/HSL axis bounds) is unrelated and unchanged. (a9b768e, [#325](https://github.com/Takazudo/zudo-design-token-panel/issues/325), [#328](https://github.com/Takazudo/zudo-design-token-panel/pull/328))

### Features

- **Token-name tooltip parity across all tabs (Size / Font / Spacing / Easing / GenericTab).** A new shared `TokenLabel` component renders the same `.tokenpanel-tooltip` primitive at every token-name display site (previously only the Color tab had the rich tooltip; others fell back to the native `title` attribute). `TooltipProvider` was lifted from `color-tab.tsx` to `panel.tsx` so all tabs share a single provider. (559c59f, 426e9c6, 84f5981, [#330](https://github.com/Takazudo/zudo-design-token-panel/issues/330), [#337](https://github.com/Takazudo/zudo-design-token-panel/pull/337))

### Other Changes

- Strip `min` / `max` from 35+ test fixture files and rewrite the [#313](https://github.com/Takazudo/zudo-design-token-panel/pull/313) clamp-regression tests to assert the new free-input contract. (b8ef56e, 9798e07)
- Drop slider-describing prose and min/max examples from `README.md`, `PORTABLE-CONTRACT.md`, and the doc-site reference pages (`token-manifest.mdx`, `architecture.mdx`, `configure-panel.mdx`). (e210a2d, 9262585)
- Resolve all `pnpm audit` advisories (1 critical, 3 high, 7 moderate, 1 low) in dev/doc-only tooling — none ship in the published package. (f3574e0)

## [0.2.0-next.2] - 2026-05-27

### Features

- **Token-name tooltip parity across all tabs (Size / Font / Spacing / Easing / GenericTab).** The Color tab already showed a rich custom tooltip with the full token name on hover; every other tab fell back to the native HTML `title` attribute. A new shared `TokenLabel` component renders the same `.tokenpanel-tooltip` primitive at every token-name display site. `TooltipProvider` was lifted from `color-tab.tsx` to `panel.tsx` so all tabs share a single provider. (559c59f, 426e9c6, 84f5981, [#330](https://github.com/Takazudo/zudo-design-token-panel/issues/330), [#337](https://github.com/Takazudo/zudo-design-token-panel/pull/337))

## [0.2.0-next.1] - 2026-05-27

### Breaking Changes

- **Removed the `min` and `max` properties from `TokenDef` and `TierValueKind` (`'length'` | `'number'` variants).** The panel no longer renders an `<input type="range">` slider on numeric token rows — they are now plain unconstrained number inputs. The mid-keystroke clamp and on-blur clamp logic added in [#313](https://github.com/Takazudo/zudo-design-token-panel/pull/313) are gone; values commit as typed, and the `aria-invalid` / red-border styling for out-of-range values is removed. Real-world use proved sliders too restrictive for a developer tool — devs want to type arbitrary values freely (including deliberately out-of-spec or experimental ones). **Migration**: remove every `min: ...` and `max: ...` field from your token manifests. The internal color-picker `SliderConfig.min` / `.max` (OKLCH/HSL axis bounds) is unrelated and unchanged. (a9b768e, [#325](https://github.com/Takazudo/zudo-design-token-panel/issues/325), [#328](https://github.com/Takazudo/zudo-design-token-panel/pull/328))

### Other Changes

- Strip `min` / `max` from 35+ test fixture files. (b8ef56e)
- Rewrite the [#313](https://github.com/Takazudo/zudo-design-token-panel/pull/313) clamp-regression tests to assert the new free-input contract — value commits as typed, no `aria-invalid` on out-of-range numeric input. (9798e07)
- Update `packages/zdtp/README.md` and `packages/zdtp/PORTABLE-CONTRACT.md` to drop slider-describing prose and the min/max examples. (e210a2d)
- Update doc-site reference pages (`token-manifest.mdx`, `architecture.mdx`, `configure-panel.mdx`) to drop the min/max examples and slider-UI prose. (9262585)

## [0.1.0-next.3] - 2026-05-27

### Features

- **Tier-ref selector is now a native `<select>` and reflects live override values.** The custom `role="listbox"` dropdown (with its open/focusedIndex state machine, ARIA plumbing, click-outside handler, and keyboard-nav callbacks) was replaced by a native `<select>`, dropping ~250 lines of UI code. Each `<option>` label now shows `--var-name (resolved-value)` using `resolveTierItemValue()` from the apply pipeline — so when a referenced tier-1 token's value is overridden via its slider/text row, the tier-2 selector's option labels reflect the new value immediately instead of staying stuck on the manifest default. (570a1b1) ([#312](https://github.com/Takazudo/zudo-design-token-panel/issues/312))

### Fixed

- **Number inputs no longer overwrite the user's draft mid-keystroke.** `SliderRow` and the generic-tab item editor used to parse-and-clamp on every keystroke, immediately commit the clamped value, and round-trip it back into the input — so typing `2` then `2` (expecting `22`) snapped the input to `6` when the token's `max` was `6`. Out-of-range or empty drafts are now flagged with a `--invalid` red border and held without committing; on blur, an invalid draft reverts to the last known-good value. The slider thumb continues to scrub live. (21d3afa) ([#313](https://github.com/Takazudo/zudo-design-token-panel/issues/313))

## [0.1.0-next.2] - 2026-05-25

### Fixed

- **Palette grids ignore the density slider again.** Palette swatch grids
  reflowed on `--tokenpanel-grid-min`, so the density slider (dense/cozy/wide →
  12rem/18rem/100%) stretched the fixed-size swatch chips into oversized /
  single-column cells. They now reflow on their natural `3.5rem` min, leaving the
  base/semantic rows that density is meant to control untouched.
- **Token-name tooltip is no longer transparent.** The shared tooltip portals to
  `document.body`, outside `.tokenpanel-shell`, so its chrome tokens resolved to
  nothing and it rendered transparent. `.tokenpanel-tooltip` is now part of the
  token-scope `:where(...)` selector — the same mechanism the color-picker and
  highlight-settings popovers use to resolve chrome tokens outside the shell.
- **Eye (highlight) toggle now appears on Base color rows.** The Base section's
  background/foreground rows never passed a `cssVar`, so the highlight toggle was
  omitted even though `cluster.baseRoles` maps those roles to real CSS vars. Each
  Base row's eye is now wired to `cluster.baseRoles.background`/`.foreground`, so
  base tokens get the same visibility toggle as palette and semantic tokens. The
  eye is omitted only when the cluster declares no `cssVar` for that role.

## [0.1.0-next.1] - 2026-05-25

### Fixed — Astro consumers: `@takazudo/zdtp/astro` value import broke real npm installs ([#308](https://github.com/Takazudo/zudo-design-token-panel/issues/308))

- The documented Astro host import
  `import { DesignTokenPanelHost } from '@takazudo/zdtp/astro'` forced
  `dist/astro/index.js` to statically `import` the raw `.astro` component.
  Under a `file:` workspace link Vite compiled it, but as a real
  `node_modules` dependency it was externalized, so Node hit the raw `.astro`
  at prerender and threw `ERR_UNKNOWN_FILE_EXTENSION`. **Every real npm Astro
  consumer following the README crashed at build time.**
- **Fix**: the `@takazudo/zdtp/astro` entry is now JS-helpers-and-types only —
  it no longer re-exports the component value, so the crashing `.astro`
  literal can't appear in the bundled JS. Import the host component directly
  from its dedicated subexport, which the consumer's own Astro toolchain
  compiles natively:

  ```astro
  import DesignTokenPanelHost from '@takazudo/zdtp/astro/DesignTokenPanelHost.astro';
  ```

  Type-only imports (`import type { PanelConfig } from '@takazudo/zdtp/astro'`)
  are unchanged — they are erased at build. The `./astro/host-adapter`
  side-effect import is unchanged. Docs (README, PORTABLE-CONTRACT, doc-site
  recipes) updated to the direct-subexport form.

## [0.1.0-next.0] - 2026-05-24

### Renamed — npm package is now `@takazudo/zdtp`

- **Package name** changed from `@takazudo/zudo-design-token-panel` to
  `@takazudo/zdtp`. Update imports accordingly
  (`import { configurePanel } from '@takazudo/zdtp'`,
  `import '@takazudo/zdtp/styles'`, `@takazudo/zdtp/astro`, etc.).
- **CLI bin** renamed from `design-token-panel-server` to `zdtp-server`.
- First public prerelease is published to npm under the `next` dist-tag; install
  with `pnpm add @takazudo/zdtp@next preact`.

### Fixed (panel renders unstyled without a consumer CSS import — [#219](https://github.com/Takazudo/zudo-design-token-panel/issues/219))

- **Self-injected stylesheet** — the panel now injects its own bundled CSS as a
  `<style>` element on first mount (`ensurePanelStyles()` in `src/index.tsx`).
  Previously the panel painted unstyled unless the consumer manually added
  `import '@takazudo/zdtp/styles'` to its static module
  graph — Vite library mode strips the package-internal CSS side-effect import
  from `dist/index.js`, so the emitted JS never loaded its own CSS. The CSS is
  now also imported via `?inline` (a string constant that survives library-mode
  bundling) and injected at runtime. Because injection happens in
  `ensureMounted()`, the CSS loads exactly when the panel first opens — no eager
  cost on pages where the panel is never used. The `./styles` / `./styles.css`
  exports still resolve (the standalone `dist/zdtp.css` is
  still emitted) and remain valid but optional; the install doc's "Don't skip
  the styles import" warning is downgraded accordingly. Public API unchanged.

### Fixed (panel-singleton & first-toggle bugfixes — [#108](https://github.com/Takazudo/zudo-design-token-panel/issues/108), root PR [#113](https://github.com/Takazudo/zudo-design-token-panel/pull/113))

- **Cross-instance singleton sharing** — configuration singletons (`configuredConfig`,
  post-configure hooks) are now stored on `globalThis[Symbol.for('@takazudo/zudo-design-token-panel:singleton')]`
  instead of module-scope variables. When a bundler produces two separate module instances of
  `panel-config.ts` (e.g. Vite chunk-dedup in Astro consumers), both instances now share the same
  slot, so `configurePanel()` writes and `getPanelConfig()` reads from the same object regardless
  of which module instance each call landed in. Public API is bit-identical.
  ([#109](https://github.com/Takazudo/zudo-design-token-panel/issues/109))

- **Deferred reapply via post-configure hooks** — `reapplyPersistedOverrides()` and
  `reapplyFromStorage()` are no longer called at module-init time. They are now registered as a
  post-configure hook (via the new `registerPostConfigureHook` API) and fire only after
  `configurePanel()` supplies the host's storage prefix. This prevents a default-prefix Preact
  panel from mounting before the host's prefix is known, which was the root cause of the first
  `toggleDesignPanel()` call being a no-op when legacy default-prefix keys existed in localStorage.
  Late-registration semantics: if `configurePanel()` has already been called when a hook is
  registered, the hook fires immediately. View-transition re-run safety is preserved via a stable
  module-level hook constant. ([#111](https://github.com/Takazudo/zudo-design-token-panel/issues/111))

### Added (abstract-token-tiers epic — [#69](https://github.com/Takazudo/zudo-design-token-panel/issues/69), root PR [#91](https://github.com/Takazudo/zudo-design-token-panel/pull/91))

> **Note:** the package version is still `0.0.0` (pre-1.0, in active
> development). The changes below are unreleased additions tracked under the
> abstract-token-tiers epic.

- **Tier model types** (`TierValueKind`, `TierItem`, `TierConfig`, `TabConfig`,
  `ColorClusterExtras`) in `src/tokens/tier-model.ts` — the data model that
  backs the new tab-driven panel. Narrowing helpers (`isLengthKind`,
  `isNumberKind`, `isSelectKind`, `isTextKind`, `isColorKind`) are exported.
- **`TierRefSelector` control** — when a `TierConfig` carries `referencesTier`,
  each item's persisted value is the id of an item in the base tier, and the
  apply pipeline emits `var(--target-cssvar)`.
- **`GenericTab` component** — data-driven tab renderer that handles any
  host-coined tab id using kind-appropriate editors for `length`, `number`,
  `select`, `text`, and `color` kinds.
- **`PanelConfig.tabs` (required)** — replaces the previous `tokens` and
  `colorCluster` fields. Every visible tab, including the color tab, is
  expressed as a `TabConfig` entry. The color tab (id `'color'`) carries
  palette and semantic data as `TierItem` arrays inside its `tiers`, with
  structural metadata in `colorExtras`.
- **Persist envelope v3** (`${storagePrefix}-state-v3`) — adds a `tabs` map
  alongside the existing per-category slices so host-coined tabs can persist
  their overrides without schema changes.
- **JSON serde v2** (`$schema: 'zudo-design-tokens/v2'`) — `tabs`-keyed
  wrapper with cssVar-keyed leaves. `serialize()` always emits v2.
  `deserialize()` accepts both v1 and v2 and normalises to `TweakState`.
  Tier-2 ref values are stored as literal `var(--tier1-cssvar)` CSS strings.
- **Host-tabs validation** in `assertValidPanelConfig` — enforces tier-id
  uniqueness, item-id uniqueness across tiers, cssVar format, kind consistency
  within a tier, and `referencesTier` integrity (existence + kind
  compatibility).
- **v2 → v3 storage migration** in `loadPersistedState` — lifts existing
  per-category overrides into the v3 envelope on first load, then deletes the
  v2 key.
- Export `TweakState` (type) and `emptyOverrides` from main entry (#49) — external SerDe layers (e.g. zudo-doc's `design-token-serde.ts`) can now construct a fully-populated `TweakState` without reaching into the test-only `./testing` sub-export.
- Framework-agnostic `setLifecycleAdapter(adapter)` API for non-Astro hosts (zfb, vite, etc.) (#50). The astro `astro:before-swap` / `astro:page-load` fallback is preserved when no adapter is registered, and is actively unbound when a host installs an adapter so the internal handlers do not double-fire. A partial adapter (one that registers only `onBeforeSwap` or only `onPageLoad`) keeps the astro fallback for the unregistered channel and emits a `console.warn` so authors notice the silent gap.

### Changed (abstract-token-tiers epic — [#69](https://github.com/Takazudo/zudo-design-token-panel/issues/69))

- **`PanelConfig.tokens` dropped** — replaced by `PanelConfig.tabs`. This is a
  breaking change for any host that relied on the `tokens: TokenManifest` field.
  Wire per-tab token arrays as `TierItem[]` inside a `TierConfig` inside a
  `TabConfig` on `PanelConfig.tabs`.
- **`PanelConfig.colorCluster` / `secondaryColorCluster` dropped** — replaced
  by a `TabConfig` with `id: 'color'` (or `'color-secondary'`) and a
  `colorExtras` field. Palette and semantic tokens move into the tab's `tiers`
  as `TierItem` entries; `colorExtras` carries the structural metadata
  (`baseRoles`, `colorSchemes`, `panelSettings`, etc.).
- **`TokenManifest` / `TokenDef` types removed from the public surface** —
  superseded by the `TabConfig` / `TierConfig` / `TierItem` model.
- **`ColorClusterConfig`** — previously accepted as a top-level `PanelConfig`
  field. Now the equivalent data lives on `TabConfig.colorExtras`. The public
  alias `ColorClusterConfig` continues to re-export `ColorClusterDataConfig`
  for backward-compatible type imports.
- Make typography-id rename map configurable via `PanelConfig.legacyIdRenameMap` (#51). The default is an empty map (no renaming) so hosts whose manifest ids are stable (e.g. zudo-doc) are not corrupted. The historical zdtp-internal map is exported as `ZDTP_LEGACY_TYPOGRAPHY_RENAME_MAP` for opt-in callers; the bundled astro host adapter wires it in automatically so existing zdtp deployments keep their behaviour. Map shape is `Record<string, string | null>` — a `null` value preserves the historical "drop this id" semantic for callers whose original behaviour dropped certain ids without replacement.
- After the typography migration runs (rename or null-drop), `loadPersistedState` rewrites the normalized envelope back to `localStorage` so legacy ids and dropped entries do not survive on disk indefinitely as dead data, and a host that later removes the opt-in rename map does not regress every user back to non-applying overrides.
