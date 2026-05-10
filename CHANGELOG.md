# Changelog

All notable changes to `zudo-design-token-panel` are recorded in this file.
The format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Dates and versions may be absent for unreleased entries.

## [Unreleased]

### Added

- Export `TweakState` (type) and `emptyOverrides` from main entry
  ([#49](https://github.com/Takazudo/zudo-design-token-panel/issues/49))
  — external SerDe layers (e.g. zudo-doc's `design-token-serde.ts`)
  can now construct a fully-populated `TweakState` without reaching into
  the test-only `./testing` sub-export.
- Framework-agnostic `setLifecycleAdapter(adapter)` API for non-Astro
  hosts (zfb, vite, etc.). When no adapter is registered, the package
  falls back to the existing `astro:before-swap` / `astro:page-load`
  document listeners (backwards-compatible).
  ([#50](https://github.com/Takazudo/zudo-design-token-panel/issues/50))

### Changed

- Make typography-id rename map configurable via
  `PanelConfig.legacyIdRenameMap`; default empty so hosts whose manifest
  ids are stable (e.g. zudo-doc) are not corrupted. The historical
  zdtp-internal map is exported as `ZDTP_LEGACY_TYPOGRAPHY_RENAME_MAP`,
  and the bundled astro host adapter wires it in automatically so
  existing zdtp deployments keep their behaviour without code changes.
  Map shape is `Record<string, string | null>` — a `null` value
  preserves the historical "drop this id" semantic for callers whose
  original behavior dropped certain ids without replacement.
  ([#51](https://github.com/Takazudo/zudo-design-token-panel/issues/51))
- After the typography migration runs (rename or null-drop),
  `loadPersistedState` now rewrites the normalized envelope back to
  `localStorage` so legacy ids and dropped entries don't survive on
  disk indefinitely as dead data.
- `LifecycleAdapter` partial adapters (one that registers only
  `onBeforeSwap` or only `onPageLoad`) keep the astro fallback for the
  unregistered channel and emit a `console.warn` so authors notice the
  silent gap. Previously, the missing channel was silently dropped,
  leaking the Preact tree on body-swapping routers (e.g. zfb).

## [0.1.0] — 2026-04-27

Initial OSS port of the design-token panel + bin server from `zmodular`
into a standalone monorepo. Tracked under
[super-epic issue #2](https://github.com/Takazudo/zudo-design-token-panel/issues/2).

### Added

- **Repo bootstrap** — pnpm workspace skeleton (root `package.json`,
  `pnpm-workspace.yaml`, `.gitignore`, MIT `LICENSE`), top-level `README.md`,
  this `CHANGELOG.md`, `.editorconfig`, `.prettierrc`, and `.npmrc` aligned
  with myoss conventions. Generated project logo via `kumiko-gen`. Added
  GitHub Actions workflows and a `b4push` validation script.
  ([#11](https://github.com/Takazudo/zudo-design-token-panel/pull/11))
- **Doc site scaffold** — `doc/` site generated via `create-zudo-doc` with
  the `zudo-token-panel` preset (light/dark color schemes, default feature
  set: search, sidebarFilter, claudeResources, sidebarResizer, sidebarToggle,
  versioning, docHistory, llmsTxt, changelog). Top page rebuilt with hero +
  feature cards layout.
  ([#11](https://github.com/Takazudo/zudo-design-token-panel/pull/11))
- **`@takazudo/zudo-design-token-panel` package** — ported the Preact-based
  live design-token tweak panel into `packages/zudo-design-token-panel/`.
  Includes the host-config-driven runtime (`TokenManifest`,
  `ColorClusterConfig`), tests, and the portable contract / README. Renamed
  the secondary cluster identifier from a reference-project name to the
  generic `secondary`, and scrubbed reference-project name leaks from
  source comments.
  ([#12](https://github.com/Takazudo/zudo-design-token-panel/pull/12))
- **`design-token-panel-server` bin** — ported the Node bin entry and
  server-side apply pipeline modules into the panel package, wired the
  `bin` and `server` entries into the package build, and rewrote
  `README.md` §3 for the OSS-standalone bin surface.
  ([#13](https://github.com/Takazudo/zudo-design-token-panel/pull/13))

### Notes

- The `examples/*` workspaces (Astro, Vite + React, Next.js reference
  integrations) are listed in `pnpm-workspace.yaml` but the actual example
  apps are still being ported. Links from the doc site and top page may
  404 until the examples land.
