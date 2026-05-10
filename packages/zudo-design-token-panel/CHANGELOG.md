# Changelog

## Unreleased

### Added

- Export `TweakState` (type) and `emptyOverrides` from main entry (#49) — external SerDe layers (e.g. zudo-doc's `design-token-serde.ts`) can now construct a fully-populated `TweakState` without reaching into the test-only `./testing` sub-export.
- Framework-agnostic `setLifecycleAdapter(adapter)` API for non-Astro hosts (zfb, vite, etc.) (#50). The astro `astro:before-swap` / `astro:page-load` fallback is preserved when no adapter is registered, and is actively unbound when a host installs an adapter so the internal handlers do not double-fire. A partial adapter (one that registers only `onBeforeSwap` or only `onPageLoad`) keeps the astro fallback for the unregistered channel and emits a `console.warn` so authors notice the silent gap.

### Changed

- Make typography-id rename map configurable via `PanelConfig.legacyIdRenameMap` (#51). The default is an empty map (no renaming) so hosts whose manifest ids are stable (e.g. zudo-doc) are not corrupted. The historical zdtp-internal map is exported as `ZDTP_LEGACY_TYPOGRAPHY_RENAME_MAP` for opt-in callers; the bundled astro host adapter wires it in automatically so existing zdtp deployments keep their behaviour. Map shape is `Record<string, string | null>` — a `null` value preserves the historical "drop this id" semantic for callers whose original behaviour dropped certain ids without replacement.
- After the typography migration runs (rename or null-drop), `loadPersistedState` rewrites the normalized envelope back to `localStorage` so legacy ids and dropped entries do not survive on disk indefinitely as dead data, and a host that later removes the opt-in rename map does not regress every user back to non-applying overrides.
