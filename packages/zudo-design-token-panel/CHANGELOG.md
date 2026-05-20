# Changelog

## Unreleased

### Fixed (panel renders unstyled without a consumer CSS import — [#219](https://github.com/Takazudo/zudo-design-token-panel/issues/219))

- **Self-injected stylesheet** — the panel now injects its own bundled CSS as a
  `<style>` element on first mount (`ensurePanelStyles()` in `src/index.tsx`).
  Previously the panel painted unstyled unless the consumer manually added
  `import '@takazudo/zudo-design-token-panel/styles'` to its static module
  graph — Vite library mode strips the package-internal CSS side-effect import
  from `dist/index.js`, so the emitted JS never loaded its own CSS. The CSS is
  now also imported via `?inline` (a string constant that survives library-mode
  bundling) and injected at runtime. Because injection happens in
  `ensureMounted()`, the CSS loads exactly when the panel first opens — no eager
  cost on pages where the panel is never used. The `./styles` / `./styles.css`
  exports still resolve (the standalone `dist/zudo-design-token-panel.css` is
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
