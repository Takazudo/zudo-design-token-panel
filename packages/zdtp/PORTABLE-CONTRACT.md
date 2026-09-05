# Design Token Panel — Portable Contract

This document codifies the public contract that the
`@takazudo/zdtp` package exposes to its host applications.
It is the source of truth for the package's portable API surface. Reviewers
should be able to check off any change to the package against the section
that pins the surface it touches.

The package extracts every project-specific identifier behind a single
configure-once init (`configurePanel({...})`) so the same package can ship
into any Preact-supporting Astro / Vite / Next.js / Rust-SSG consumer. Storage
keys, console namespace, modal class prefixes, schema id, and the entire tab
configuration (tiers, items, color cluster extras) are all host-supplied.

---

## 1. `configurePanel({...})` — multi-instance init

The package exposes a setup function that returns a `PanelInstanceHandle`.
Hosts call it once per `storagePrefix` per page lifecycle, before the panel
adapter for that instance is dynamically imported (typically from a small Astro
host script that gates the adapter behind a visibility / persistence probe —
see §6). The same function supports **multiple independent panel instances** on
one page: call it with a distinct `storagePrefix` to register a new instance;
call it with the same prefix and equal config for an idempotent no-op.

```ts
export interface PanelDockConfig {
  /** Reserve host-document space for a right/bottom dock. Defaults to body-margin. */
  reflow?: 'body-margin' | 'none';
}

export interface PanelConfig {
  /** Base for every derived storage key. Also the instance id. See §2. */
  storagePrefix: string;
  /** Console API namespace — installed as `window[consoleNamespace].showDesignPanel`, etc. */
  consoleNamespace: string;
  /** BEM-style prefix used by every modal in the panel (export / import / apply). */
  modalClassPrefix: string;
  /** Display-only label returned by getDesignTokenSchema(); not used by built-in UI or serde validation. */
  schemaId: string;
  /** Default filename base — exports save as `${exportFilenameBase}.json`. */
  exportFilenameBase: string;
  /**
   * Optional window-event name that toggles THIS instance's panel.
   *
   * The default (single-panel) instance keeps the historical public event
   * `toggle-design-token-panel` and ignores this field. A configured instance
   * with a NON-default `storagePrefix` listens on this name; when omitted it
   * defaults to `toggle-${storagePrefix}` so two panels on one page get
   * independent toggle channels with no cross-talk.
   */
  toggleEvent?: string;
  /**
   * Host-supplied tab configuration (required). The panel renders a tab strip
   * from this array. See §3 for the full tab/tier model.
   *
   * Hosts MUST supply this field. An empty array is legal but produces a panel
   * with no tabs. The colour tab (id 'color') is driven by tiers + colorExtras
   * on the matching TabConfig entry (no separate colorCluster field).
   */
  tabs: readonly TabConfig[];
  /**
   * Optional host-supplied color-scheme presets. Surfaces additional named
   * `ColorScheme` entries in the Color tab "Scheme..." dropdown alongside the
   * schemes bundled in the color TabConfig's colorExtras. Defaults to `{}`.
   * See §4.5 for the merge contract.
   */
  colorPresets?: Record<string, ColorScheme>;
  /**
   * Optional dev-API endpoint URL. When supplied together with a non-empty
   * `applyRouting` map, the Apply button POSTs its diff payload to it. When
   * either field is absent, the button stays disabled with a tooltip.
   */
  applyEndpoint?: string;
  /**
   * Optional CSS-var prefix → repo-relative source-file routing map.
   * Drives `routeTokensToFiles` so a host whose tokens use any prefix
   * family can opt into the apply pipeline without forking the package.
   * Apply is gated on `applyEndpoint` AND a non-empty routing map. Omit
   * to disable apply entirely.
   *
   * Example:
   *
   * ```ts
   * applyRouting: {
   *   myapp: 'src/styles/tokens.css',
   *   'myapp-extra': 'src/styles/extra-tokens.css',
   * }
   * ```
   */
  applyRouting?: Record<string, string>;
  /**
   * Optional DOM Tweaker feature block. Presence enables the eager header
   * toggle and persisted closed-shell revival path. The object is pure JSON
   * data; `themeCss`, when set, must be a string and must not contain
   * `@import`.
   */
  domTweaker?: {
    /** Optional host Tailwind v4 theme CSS used by the lazy side for suggestions. */
    themeCss?: string;
  };
  /** Optional dock integration; omitted values use body-margin host reflow. */
  dock?: PanelDockConfig;
  /**
   * Optional apply sink. Routes this instance's CSS-var writes and clears
   * through the caller-supplied object instead of `document.documentElement`.
   * See §3.6 for the full sink contract.
   *
   * NOTE: this field carries a function reference and is therefore NOT
   * JSON-serializable. It cannot pass through Astro's inline JSON config.
   * Supply it via a post-configure call or a custom adapter.
   */
  applySink?: ApplySink;
  /**
   * Optional id rename map applied during `loadPersistedState` migration.
   * Keys are old ids found in persisted state; values are either the new
   * canonical id (string) or `null` to drop the legacy id entirely.
   * Defaults to an empty map (no renaming).
   */
  legacyIdRenameMap?: Record<string, string | null>;
  /**
   * Whether opening the panel (any of the auto-remember call sites — see
   * §6.2) writes `${storagePrefix}:autoload` with `'auto'` provenance.
   * Defaults to `true`. Set `false` for a public site that wants a
   * panel-open trigger visible to every visitor without arming owner-mode
   * for whoever clicks it; `enableAutoload()`'s explicit `'1'` write is
   * unaffected either way. See §6.2's Auto-remember footgun.
   */
  autoRememberOnOpen?: boolean;
}

/**
 * Apply sink — routes CSS-var writes for one panel instance somewhere other
 * than the host `:root`. See §3.6.
 */
export interface ApplySink {
  /** Upsert the given var name→value pairs on the sink target. */
  apply(pairs: ReadonlyArray<readonly [string, string]>): void;
  /** Remove the given var names from the sink target. */
  clear(names: readonly string[]): void;
}

/**
 * Handle returned by `configurePanel`. Identifies one configured instance
 * and exposes its imperative lifecycle controls.
 *
 * `instanceId` equals `config.storagePrefix` — the registry key.
 * Two `configurePanel` calls with the same prefix+config return the SAME
 * handle (referential identity is stable across idempotent re-calls).
 */
export interface PanelInstanceHandle {
  /** Stable instance id — equal to the instance's `storagePrefix`. */
  readonly instanceId: string;
  /** Show this instance's panel. */
  open(): void;
  /** Hide this instance's panel. */
  close(): void;
  /** Toggle this instance's panel open/closed. */
  toggle(): void;
  /**
   * Deregister this instance from the registry. Unmounts the instance's
   * Preact tree, removes its DOM root, and unbinds its toggle-event listener.
   * After `destroy()` the prefix can be re-configured by calling
   * `configurePanel` again.
   */
  destroy(): void;
}

/**
 * Configure one panel instance. Returns the instance handle.
 * Call once per `storagePrefix` per page lifecycle.
 */
export function configurePanel(config: PanelConfig): PanelInstanceHandle;

/**
 * Lazy preset attachment. Hosts that don't want to ship the preset library
 * inline in the SSR config blob can call this AFTER the panel has been
 * configured to attach the preset map from a deferred dynamic import. Same
 * precedence rules as `PanelConfig.colorPresets` — see §4.5.
 */
export function setPanelColorPresets(presets: Record<string, ColorScheme>): void;

/**
 * Runtime validator at the host-adapter trust boundary. Throws with a
 * message naming the offending field when a parsed inline config is
 * malformed. The Astro adapter calls this automatically on every page
 * load; hosts that wire the panel without the Astro entry point should
 * call it too.
 */
export function assertValidPanelConfig(value: unknown): asserts value is PanelConfig;
```

Required behaviours:

- **Multi-instance.** Calling `configurePanel` with a **distinct**
  `storagePrefix` registers an independent panel instance (no throw). Distinct
  instances derive independent storage keys, DOM roots, and toggle events and
  do not interfere with each other.
- **Idempotent for same prefix+config.** Calling `configurePanel` a second
  time with the same `storagePrefix` and structurally-equal config values is a
  no-op and returns the SAME handle. This covers Astro view-transition reruns
  that re-parse the inline JSON config.
- **Same-prefix-different-config THROWS (`RECONFIGURE_RULE = 'reject-with-error'`).** Calling
  `configurePanel` with a `storagePrefix` already in the registry but a
  structurally-different config throws immediately. To re-configure a prefix,
  call `handle.destroy()` first, then `configurePanel` again.
- **Synchronous.** No I/O, no awaits. The call must be cheap enough to run
  inline at module-init from the Astro frontmatter side.
- **Pure data only (except `applySink`).** Every field on `PanelConfig` other
  than `applySink` MUST be JSON-serializable. This is the hard precondition
  for the Astro frontmatter → island prop handoff (§6): Astro stringifies
  props, so functions / class instances do not survive. `applySink` carries
  function references and MUST NOT be included in the Astro JSON config.
  `domTweaker`, when present, is part of this pure-data surface: it may only
  contain the optional string `themeCss` field. `themeCss` MUST NOT contain
  any `@import` occurrence.
- **No default `PanelConfig` baked into the package.** Hosts MUST configure
  the panel explicitly via `<DesignTokenPanelHost config={...} />` or a
  direct `configurePanel({...})` call. The package ships zero baked-in
  identifiers — every storage prefix, namespace, and manifest entry comes
  from the host.

### Multi-instance example

```ts
// Primary panel instance
const primaryHandle = configurePanel({
  storagePrefix: 'myapp-design-token-panel',
  // ...other fields
});

// Secondary panel instance — distinct prefix, independent instance
const secondaryHandle = configurePanel({
  storagePrefix: 'myapp-preview-panel',
  toggleEvent: 'toggle-preview-panel', // optional; default: toggle-${storagePrefix}
  // ...other fields
});

// Each handle controls only its own instance:
primaryHandle.open();    // opens primary panel
secondaryHandle.toggle(); // toggles secondary panel

// Listen for the secondary panel's toggle event:
window.dispatchEvent(new CustomEvent('toggle-preview-panel'));

// To re-configure a prefix, destroy first:
primaryHandle.destroy();
configurePanel({ storagePrefix: 'myapp-design-token-panel', /* new config */ });
```

### Per-instance toggle events

| Instance | `storagePrefix` | `toggleEvent` field | Effective toggle event name |
| --- | --- | --- | --- |
| Default (single-panel path) | `'zudo-design-token-panel'` (the historical default) | (ignored) | `toggle-design-token-panel` |
| Any other | any distinct value | omitted | `toggle-${storagePrefix}` |
| Any other | any distinct value | supplied | the supplied string |

The default instance keeps the historical `toggle-design-token-panel` event for
backwards compatibility. Every non-default instance gets its own independent
channel so two panels on one page do not cross-talk.

---

## 2. Storage-key derivation

`storagePrefix` is the only knob that controls every persisted key. The panel
derives the keys at runtime from this single base.

| Logical key | Derivation                  | Owner                | Purpose                                                                                                                                                      |
| ----------- | --------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `state-v4`  | `${storagePrefix}-state-v4` | tweak-state          | Current unified envelope. `color` (and optional `secondary`) is keyed by active scheme/mode identity; global `tabs`, `spacing`, `typography`, and `size` slices remain unkeyed. |
| `state-v3`  | `${storagePrefix}-state-v3` | tweak-state (legacy) | Retained downgrade-compatible envelope with a flat, single-slot `color` (plus global `tabs`, `spacing`, `typography`, and `size`). The selected v3 state is copied into v4; this key is not deleted by the v4 migration. |
| `state-v2`  | `${storagePrefix}-state-v2` | tweak-state (legacy) | Pre-v3 unified envelope (color + spacing + typography + size). When selected, it is written to `state-v3` and the v2 key is deleted, then the result is copied into v4. |
| `state-v1`  | `${storagePrefix}-state`    | tweak-state (legacy) | Pre-v2 flat-state format (Color-only). When selected, it is written to `state-v3` and the v1 key is deleted, then the result is copied into v4. |
| `open`      | `${storagePrefix}-open`     | panel                | Mirror of the panel's `open` boolean state (so the next mount opens directly into the user's last state without a post-render toggle dispatch).              |
| `position`  | `${storagePrefix}-position` | panel                | Drag position (`{ top, left }`) so the panel reappears where the user left it.                                                                              |
| `size`      | `${storagePrefix}-size`     | panel                | Floating shell dimensions (`{ width, height }`) in pixels.                                                                                                  |
| `dock`      | `${storagePrefix}-dock`     | panel                | Presentation mode: `'float'`, `'right'`, `'bottom'`, or `'mini'`.                                                                                          |
| `dock-size` | `${storagePrefix}-dock-size` | panel               | Right/bottom dock dimensions (`{ right, bottom }`), defaulting to `{ right: 440, bottom: 340 }`.                                                           |
| `density`   | `${storagePrefix}-density`  | panel                | Tab-grid density preference (`0`, `1`, or `2`).                                                                                                             |
| `ghost`     | `${storagePrefix}-ghost`    | shell                | Ghost-when-idle preference (`'1'` when enabled).                                                                                                            |
| `specimen`  | `${storagePrefix}-specimen` | specimen              | Font specimen toolbar JSON: `{ text, preset, overridden, width }`; width is clamped to 240–720.                                                          |
| `snapshot-a` | `${storagePrefix}-snapshot-a` | snapshots            | Persisted A snapshot: `{ state, identity, savedAt, edits }`.                                                                                               |
| `snapshot-b` | `${storagePrefix}-snapshot-b` | snapshots            | Persisted B snapshot: `{ state, identity, savedAt, edits }`.                                                                                               |
| `last-applied` | `${storagePrefix}-last-applied` | apply              | Flat comparison baseline; a successful apply resets it to `{}` while unconfirmed overrides remain in live state.                                             |
| `visible`   | `${storagePrefix}:visible`  | adapter              | Adapter-level visibility-intent flag, owned by the lazy-load gate (§6).                                                                                      |
| `autoload`  | `${storagePrefix}:autoload` | autoload-state       | Owner-mode autoload flag. `'1'` (explicit, set by `enableAutoload()`) or `'auto'` (auto-remembered, set by opening the panel — see §6.2) both mean "load the panel bundle eagerly and mount CLOSED on every page load." `enableAutoload()` / `disableAutoload()` manage the explicit value; `disableAutoload()` clears either. See §6.2. |
| `elpath-enabled` | `${storagePrefix}-elpath-enabled` | element-path-state | Element-path picker enabled bit.                                                                                                                           |
| `domtweaker-enabled` | `${storagePrefix}-domtweaker-enabled` | dom-tweaker-state | DOM Tweaker enabled bit. `'1'` means "mount the closed shell and load the DOM Tweaker lazy boundary." Only meaningful when `PanelConfig.domTweaker` is present. |
| `highlight-slots` | `${storagePrefix}-highlight-slots` | highlight-state | Ten highlight slot colors in local storage.                                                                                                                |
| `highlight-outline-width` | `${storagePrefix}-highlight-outline-width` | highlight-state | Global highlight outline width in local storage, clamped to 1–20.                              |
| `highlight-active` | `${storagePrefix}-highlight-active` | highlight-state | Active CSS-variable-to-slot map in session storage.                                                                                                        |

**Constraint — colon, not dash, for `visible` and `autoload`.** Both adapter-
level flags use a `:` separator; every other derived key uses `-`. The colon
form is a historical artifact for `visible`, preserved for storage-key
continuity; `autoload` follows the same colon convention to pair with it.
The derivation MUST emit the colon literally; do not "fix" it during refactors.

**Storage-key derivation is literal.** With `storagePrefix: "myapp-design-token-panel"`,
the derivation produces:

```
myapp-design-token-panel-state-v4
myapp-design-token-panel-state-v3
myapp-design-token-panel-state-v2
myapp-design-token-panel-state
myapp-design-token-panel-open
myapp-design-token-panel-position
myapp-design-token-panel-size
myapp-design-token-panel-dock
myapp-design-token-panel-dock-size
myapp-design-token-panel-density
myapp-design-token-panel-ghost
myapp-design-token-panel-specimen
myapp-design-token-panel-snapshot-a
myapp-design-token-panel-snapshot-b
myapp-design-token-panel-last-applied
myapp-design-token-panel:visible
myapp-design-token-panel:autoload
myapp-design-token-panel-elpath-enabled
myapp-design-token-panel-domtweaker-enabled
myapp-design-token-panel-highlight-slots
myapp-design-token-panel-highlight-outline-width
myapp-design-token-panel-highlight-active  # sessionStorage
```

Unit tests in the package verify these derivations with literal-equality
checks. The v4 precedence and legacy v1/v2/v3 migration paths at first load
are part of the test matrix; the version-agnostic `${storagePrefix}-state`
family probe in §6.2 continues to cover this key and future versions.

### Current `state-v4` envelope

The current persisted envelope is stored under one `${storagePrefix}-state-v4`
key. Its color slices are keyed by the active scheme/mode identity, while the
non-color slices are global and unkeyed:

```jsonc
{
  "color": {
    "Default Light": { "palette": [], "semanticMappings": {} /* ... */ },
    "Default Dark": { "palette": [], "semanticMappings": {} /* ... */ }
  },
  "secondary": {
    "Default Light": { "palette": [], "semanticMappings": {} /* ... */ }
  },
  "tabs": { "my-custom-tab": { "tier-id": { "item-id": "value" } } },
  "spacing": { "item-id": "value" },
  "typography": { "item-id": "value" },
  "size": { "item-id": "value" }
}
```

`secondary` is optional and, when present, uses the same identity keys as the
primary `color` map. On load, the active identity's color and secondary slots
are selected. If that identity has no color slot yet, color is seeded from the
active scheme's defaults; the global `tabs`, `spacing`, `typography`, and `size`
slices still load. A save replaces only the active identity's color/secondary
slots and preserves every other identity slot by merge, so editing one scheme
cannot overwrite another scheme's tweaks.

### 2.1 Default first-open geometry

When the `position` key (and, likewise, the size key) has no persisted value
yet, the panel does not fall back to a fixed pixel position. The fallback is
computed at open time as one coherent rectangle:

- **Size is computed first**, from the historical `min(1200, 0.8·vw) ×
  min(800, 0.8·vh)` rule clamped to a minimum-size floor and the current
  viewport. **Position is derived from that same clamped size** — centered
  in the viewport, then run through a containment clamp so the whole
  rectangle stays inside `[0, innerWidth]` × `[0, innerHeight]`. Position and
  size are never computed independently; a host cannot observe a fallback
  position that assumes a different width than the fallback size.
- **Full containment is guaranteed at every viewport width**, including
  phone widths — a first-open panel never spawns with any part off-screen.
  This holds when the size key IS persisted but the `position` key is not
  (a resize without a drag): the fallback position is centered and contained
  against the persisted size, not against the default one.
- **The fallback is instance-aware.** Each additional panel instance
  concurrently mounted on the page offsets its own fallback position by 24px
  on both axes, keyed to mount order with lowest-free-slot reuse (a released
  slot — e.g. from `destroy()` — is reused by the next instance that mounts,
  rather than the ordinal growing forever). This exists only to keep
  simultaneously-opened instances from landing exactly on top of one
  another; it has no effect once a `position` value is persisted.
- **A persisted `position` value always wins over the cascade.** The 24px
  offset applies only to the computed fallback, never to a stored value —
  once `position` is written, that instance reopens at the exact stored
  coordinates regardless of how many other instances are mounted.
- **Containment takes priority over cascade distinctness.** On a viewport
  with too little spare room, the 24px offset is clamped down toward
  whatever room is left (potentially to 0) so the panel stays fully
  contained; it is not the case that both "cascade offset is always applied"
  and "the panel is always fully contained" hold simultaneously. Each axis
  degrades on its own: one axis can run out of slack (offset clamped to 0)
  while the other still applies the full 24px.
- **Out of scope for this section — the drag-recovery clamp.** Once a panel
  has been dragged, repositioning is governed by a separate, more permissive
  clamp that only guarantees a 60px grip of the panel stays on-screen and
  otherwise allows it to hang off any edge. That clamp is unrelated to this
  fallback-geometry contract and is unchanged by it.

---

## 3. Tab / tier model contract

The panel is data-driven through a `tabs` array on `PanelConfig`. Every
visible tab, including the color tab, is expressed as a `TabConfig` entry.

### 3.1 Public interfaces

These shapes are defined in `src/tokens/tier-model.ts` and frozen as the
public surface:

```ts
// Value-kind discriminated union — describes how a tier item is edited.
export type TierValueKind =
  | { kind: 'length'; step: number; unit: string; units?: readonly string[] }
  | { kind: 'number'; step: number; unit?: string }
  | { kind: 'select'; options: readonly string[] }
  | { kind: 'text' }
  | { kind: 'cursor' }
  | { kind: 'content' }
  | { kind: 'mask-image' }
  | { kind: 'color'; format?: 'hex' | 'oklch' };

export interface PillSpec {
  value: string;
  customDefault: string;
}

/** Mapping value for a semantic color token (legacy and ramp-native forms). */
export type SemanticValue =
  | number
  | 'bg'
  | 'fg'
  | { literal: string }
  | { literal: { light: string; dark: string } }
  | { ref: { tab?: string; tier: string; item: string } };

/** A single editable or reference token within a tier. */
export interface TierItem {
  /** Stable id used as the key in persisted state (e.g. `hsp-2xs`). */
  id: string;
  /** CSS custom property written to the default root or configured apply sink (e.g. `--myapp-spacing-hgap-2xs`). */
  cssVar: string;
  /** Display label shown in the panel row. */
  label: string;
  /** Default value as a CSS string (`0.125rem`, `12px`, etc.). */
  default: string;
  /** Discriminated union describing the control kind and its metadata. */
  type: TierValueKind;
  /** Opt-in pill toggle (e.g. for a `--radius-full` 9999px sentinel). */
  pill?: PillSpec;
  /** Read-only items are displayed but not editable. */
  readonly?: true;
}

/** A named set of tier items that share a value kind. */
export interface TierConfig {
  /** Stable id for this tier (e.g. `base`, `scale`, `semantic`). */
  id: string;
  /** Display label for the tier heading. */
  label: string;
  /** Ordered list of items in this tier. All items MUST share the same kind. */
  items: readonly TierItem[];
  /**
   * When set, this tier's items hold references. Each item's `default` is the
   * id of an item in the tier whose id matches `referencesTier`. The apply
   * pipeline emits `var(--target-cssvar)` for ref-tier items at apply time.
   */
  referencesTier?: string;
  /**
   * Marks a Color-tab tier as semantic data whose items hold `SemanticValue`
   * mappings rather than raw palette entries. It is never treated as the
   * palette tier, so a Color tab may contain a lone semantic tier.
   */
  semantic?: true;
  /**
   * Valid only when this semantic tier belongs to a tab whose id is exactly
   * `color` or `color-secondary`; other owning tab ids are rejected at
   * configure time. Declares one or more permitted same- or cross-tab ramp
   * sources for per-row semantic `{ ref }` mappings. Each entry names a tier
   * and optional tab (`tab` omitted means this tab); unlike `referencesTier`,
   * this is a multi-source allow-list for individual semantic mappings.
   */
  referencesRamps?: readonly { tab?: string; tier: string }[];
  /** Optional visual treatment rendered for this tier's values. */
  preview?: 'size' | 'line-height' | 'family' | 'weight' | 'bar' | 'radius' | 'duration';
  /** CSS variable used as the font-size base for a preview, when supplied. */
  previewBase?: string;
}

For the full `SemanticValue` mapping and emission behavior, see the maintained
[Color-cluster reference](https://zudo-design-token-panel.takazudomodular.com/docs/reference/color-cluster/).

/**
 * Color-cluster extras — the non-tier fields required for the color tab.
 * Palette and semantic data move into the tier model as TierItems; ColorClusterExtras
 * carries the structural metadata (base roles, scheme registry, panel settings).
 */
export interface ColorClusterExtras {
  id: string;
  label?: string;
  baseRoles: Partial<Record<BaseRoleKey, string>>;
  baseDefaults: Partial<Record<BaseRoleKey, number>>;
  defaultShikiTheme: string;
  colorSchemes: Record<string, ColorScheme>;
  panelSettings: ClusterPanelSettings;
  /** Optional semantic-item-id → SemanticValue defaults override map. */
  semanticDefaults?: Record<string, SemanticValue>;
}

/** Top-level tab entry on PanelConfig.tabs. */
export interface TabConfig {
  /** Stable id. Dedicated panel ids are 'color', 'font', 'spacing', 'size', 'palette', and 'notes'. */
  id: string;
  /** Display label rendered on the tab strip. */
  label: string;
  /** Ordered list of tiers within this tab. */
  tiers: readonly TierConfig[];
  /**
   * Required on color entries (id 'color' / 'color-secondary'). Carries the
   * structural metadata (base roles, scheme registry, panel settings) for the
   * color tab's palette picker and semantic table. Absent on non-color tabs.
   */
  colorExtras?: ColorClusterExtras;
  /** Required on the reserved `notes` tab; forbidden on other tabs. */
  notesExtras?: NotesExtras;
}

export interface NotesExtras {
  title: string;
  html: string;
}
```

### 3.2 Preview matrix

`preview` is opt-in. Omitting it preserves the ordinary flat tier rows, and a
tier remains one visible heading; previews do not introduce a collapsed or
progressive-disclosure tier. The current values are:

| `preview` | Valid value kind | Runtime treatment |
| --- | --- | --- |
| `'size'` | `length`, or a `referencesTier` resolving to `length` | One type-size sample per item, sorted by resolved pixel size. |
| `'line-height'` | `number` | Paragraph sample with a leading guide; `previewBase` selects a font-size CSS variable when supplied. |
| `'family'` | `text` | The first item's font-family value supplies the style for every size and line-height sample. |
| `'weight'` | `select` or `number` | The first item's font-weight value supplies the style for every sample. |
| `'bar'` | `length` | Compact bar sized from the token value. |
| `'radius'` | `length` | Compact rounded-corner glyph. |
| `'duration'` | `length` or `number` with unit `ms` or `s` | Compact timing glyph using the token's duration value. |

The font specimen toolbar persists `{ text, preset, overridden, width }` under
`${storagePrefix}-specimen`; width is clamped to 240–720 pixels. **Render on
page** mounts a read-only specimen in the host document under
`.tokenpanel-on-page-specimen[data-zdtp-specimen]`, temporarily forces the
right dock, and restores the prior mode when the specimen is disabled, closed,
unmounted, or loses its dock claim. The specimen is excluded from token scans
and page pickers.

### 3.3 Reserved tab ids

| Tab id             | Meaning                                            |
| ------------------ | -------------------------------------------------- |
| `color`            | Primary color tab — palette + base roles + semantics + scheme picker. Requires `colorExtras`. |
| `font`             | Dedicated typography tab with family/weight previews and the host-page specimen option. |
| `spacing`          | Dedicated spacing tab with the numeric bulk editor. |
| `size`             | Dedicated size tab with the numeric bulk editor. |
| `palette`          | Dedicated palette editor for a generic palette tab. |
| `notes`            | Dedicated notes tab; it renders content but carries no token state or apply/export overrides. |

The panel always prepends a synthetic `Inspect` tab for element inspection; it
is not supplied in `PanelConfig.tabs`. A configured `color-secondary` entry is
the companion color-cluster data source consumed by the primary Color tab (and
requires `colorExtras`); it is not an additional dedicated body dispatcher.

Any other configured id dispatches to `GenericTab`, which renders the tab's
`tiers` using kind-appropriate editors.

### 3.4 Validation rules

`assertValidPanelConfig` enforces these structural rules at the host-adapter
trust boundary:

- `tabs` must be an array.
- Every tab must have a unique, non-empty `id`.
- Every tier within a tab must have a unique, non-empty `id`.
- Every item within a tab must have a unique `id` across all tiers in that tab.
- Every `item.cssVar` must start with `--` and be non-empty after the prefix.
- All items within a single tier must share the same `kind` (mixed kinds in a
  tier are rejected).
- `referencesTier` must name an existing tier in the same tab, and the
  referencing tier's kind must match the referenced tier's kind.

### 3.5 Apply behaviour for ref-tier items

When a `TierConfig` carries `referencesTier`, the apply pipeline treats each
item's persisted value as the id of an item in the referenced tier. The
emitted CSS override is `var(--target-cssvar)` where `target-cssvar` is the
`cssVar` of the matched item in the base tier.

By default the write target is `:root` (`document.documentElement`). When a
`PanelConfig.applySink` is configured for the instance, writes are routed
through the sink instead — see §3.6.

### 3.6 `applySink` — optional CSS-var write target

When `PanelConfig.applySink` is set, all CSS-var writes and clears for that
panel instance route through the sink rather than `document.documentElement`.
This enables embedding the panel in a shadow root, an iframe document, or a
test spy without touching `:root`.

```ts
interface ApplySink {
  /** Upsert the given var name→value pairs on the sink target. */
  apply(pairs: ReadonlyArray<readonly [string, string]>): void;
  /** Remove the given var names from the sink target. */
  clear(names: readonly string[]): void;
}
```

Contract:

- `apply(pairs)` — **upsert**: set each `pairs[i][0]` CSS var to
  `pairs[i][1]` on the sink target.
- `clear(names)` — **remove**: remove each named CSS var from the sink target.
- **Reset clears the instance's full token set.** When the user clicks Reset,
  `sink.clear` receives every var the instance can own (all palette,
  base-role, semantic, and non-color tab vars) — not just the currently-dirty
  vars — so the sink target is completely cleaned.
- **Default (no sink):** writes go to `document.documentElement` (unchanged
  behaviour for existing integrations).
- **Sink errors are non-fatal.** The apply pipeline swallows errors from
  `sink.apply` and `sink.clear` with `console.warn` and continues.
- **The host owns the sink.** The package calls `apply`/`clear`; it does not
  manage the sink target's lifecycle. A host that passes a shadow-root target
  must keep the target alive as long as the panel instance is alive.
- **Not JSON-serializable.** `applySink` carries function references and
  MUST NOT be included in the Astro inline JSON config. Supply it via a
  post-configure approach or a custom adapter that calls `configurePanel`
  directly after adding the sink field.

Example — routing a panel instance to a shadow root:

```ts
const shadowHost = document.createElement('div');
document.body.appendChild(shadowHost);
const shadow = shadowHost.attachShadow({ mode: 'open' });

const handle = configurePanel({
  storagePrefix: 'myapp-shadow-panel',
  // ...other required fields...
  applySink: {
    apply(pairs) {
      for (const [name, value] of pairs) {
        (shadow.host as HTMLElement).style.setProperty(name, value);
      }
    },
    clear(names) {
      for (const name of names) {
        (shadow.host as HTMLElement).style.removeProperty(name);
      }
    },
  },
});
```

### 3.7 Helpers (re-exported from the package root)

```ts
export function isLengthKind(v: TierValueKind): boolean;
export function isNumberKind(v: TierValueKind): boolean;
export function isSelectKind(v: TierValueKind): boolean;
export function isTextKind(v: TierValueKind): boolean;
export function isColorKind(v: TierValueKind): boolean;
export function isCursorKind(v: TierValueKind): boolean;
export function isContentKind(v: TierValueKind): boolean;
export function isMaskImageKind(v: TierValueKind): boolean;
```

### 3.8 Canonical state transaction

All panel mutations use one transaction path, including ordinary row edits,
bulk actions, imports, snapshot restore, undo, redo, and reset. A transaction
applies the new state and CSS-variable writes, saves the persisted envelope,
updates component state, and then records the history entry in that order.
History is identity-aware and held in memory only; the persisted A/B snapshots
and token envelope are separate storage concerns. After a disk apply, the
implementation resets the last-applied baseline to `{}` and reconciles only
variables confirmed as written, so retained or unrouted overrides stay dirty.
Because disk Apply does not write base-role variables, a confirmed semantic
write derived from an unchanged `bg` or `fg` alias also reconciles that alias's
role-index dependency. Before resetting the dependency, other unwritten
semantic aliases using the same role are materialized to their resolved
numeric palette index. Their emitted value and dirty state are preserved for a
later Apply.

---

## 4. Color tab contract

The color tab — palette + base roles + semantic table + scheme list — is
expressed as a `TabConfig` with `id: 'color'` and a `colorExtras` field.
Palette and semantic tokens are `TierItem` entries inside the tab's `tiers`;
the `colorExtras` object carries the structural metadata.

### 4.1 `ColorClusterExtras` interface

```ts
export type BaseRoleKey = 'background' | 'foreground' | 'cursor' | 'selectionBg' | 'selectionFg';

export interface ColorClusterExtras {
  /** Stable id — used for debugging / logging only. */
  id: string;
  /**
   * Optional human-visible label rendered in the Color tab section headings.
   * When absent, the tab falls back to `id.toUpperCase()`.
   */
  label?: string;
  /**
   * Map of base-role name → CSS custom-property name. A cluster MAY declare
   * a subset (an empty map is legal); only declared roles are written on apply.
   */
  baseRoles: Partial<Record<BaseRoleKey, string>>;
  /**
   * Fallback palette indices when a scheme omits a base role.
   */
  baseDefaults: Partial<Record<BaseRoleKey, number>>;
  /** Fallback `shikiTheme` when a scheme lacks one. (Inert when no shiki integration.) */
  defaultShikiTheme: string;
  /**
   * Color-scheme registry. Keyed by display name (`"Default Dark"`, etc.).
   * Pass `{}` for clusters that don't use schemes.
   */
  colorSchemes: Record<string, ColorScheme>;
  /**
   * Panel-level scheme settings. Drives `getActiveSchemeName` / `initColorFromScheme`.
   */
  panelSettings: {
    /** Scheme name to seed state from when `colorMode` is `false`. */
    colorScheme: string;
    /**
     * Optional light/dark pairing. When set to an object, the panel honours
     * `document.documentElement[data-theme]` and switches schemes accordingly
     * on init. Set to `false` to disable scheme-to-`data-theme` binding; this
     * does not disable per-mode literal editing or emitted `light-dark(...)`
     * values.
    */
    colorMode: false | { defaultMode: 'light' | 'dark'; lightScheme: string; darkScheme: string };
  };
  /** Optional semantic-item-id → SemanticValue defaults override map. */
  semanticDefaults?: Record<string, SemanticValue>;
}
```

`ColorScheme` shape:

```ts
export type ColorRef = number | string;

export interface ColorScheme {
  background: ColorRef;
  foreground: ColorRef;
  cursor: ColorRef;
  selectionBg: ColorRef;
  selectionFg: ColorRef;
  palette: readonly string[]; // the public type requires exactly 16 entries
  shikiTheme?: string;
  semantic?: Record<string, ColorRef>;
}
```

> **Public alias** — the runtime type in `src/config/` is
> `ColorClusterDataConfig`. `ColorClusterConfig` is re-exported from the
> package root as the public-facing alias for the same shape:
> `import type { ColorClusterConfig } from '@takazudo/zdtp'`.

### 4.2 JSON-serializable constraint

**Every field on the color `TabConfig` (including `colorExtras` and every
`ColorScheme` it nests) MUST be JSON-serializable.** No function fields, no
class instances, no `Symbol` keys, no `undefined` where `null` is meant. This
is enforced by the Astro frontmatter → component prop handoff (§6).

Palette CSS-var names are therefore expressed as `TierItem.cssVar` strings, not
as function templates. Each palette slot is an explicit `TierItem`.

### 4.3 Multi-cluster support

The package supports a primary color cluster and an optional secondary cluster.

| Tab id             | Meaning                                             |
| ------------------ | --------------------------------------------------- |
| `color`            | Primary cluster (required for color support).       |
| `color-secondary`  | Secondary cluster (optional — omit the tab to hide the secondary section). |

Both tabs follow the same render / apply / clear contract, scoped to their
respective palette and semantic vocabulary.

### 4.4 Host-supplied scheme presets — `colorPresets`

`PanelConfig.colorPresets` is the optional, host-supplied preset map surfaced
by the Color tab "Scheme..." dropdown. It defaults to `{}` and the package
itself ships zero presets.

| `colorPresets` value           | Meaning         | Effect                                                                |
| ------------------------------ | --------------- | --------------------------------------------------------------------- |
| `undefined` (field omitted)    | Default         | Equivalent to `{}` — only `colorExtras.colorSchemes` populates the dropdown. |
| `{}`                           | Explicit empty  | Same as `undefined`.                                                  |
| `Record<string, ColorScheme>`  | Host-supplied   | Each key surfaces as a `<option>` below the cluster's bundled schemes. Sorted alphabetically. |

**Merge order in the dropdown:**

```
<option disabled>Scheme...</option>
... colorExtras.colorSchemes (insertion order) ...
<hr />
... colorPresets (alphabetical) ...
```

**Key collision** — if a `colorPresets` entry shares a name with one in
`colorExtras.colorSchemes`, the bundled scheme wins for the
`handleLoadPreset` lookup.

**Lazy attachment via `setPanelColorPresets()`** — hosts that ship a large
preset library can omit `colorPresets` from the SSR config blob and call
`setPanelColorPresets(presets)` from a client-side dynamic import.

### 4.5 Apply behaviour

The apply pipeline for color tabs:

- For each palette `TierItem` in the palette tier, write
  `item.cssVar` ← `palette[i]` from the active scheme / user override.
- For each `(roleKey, cssName)` in `colorExtras.baseRoles`, the live DOM apply
  path writes `cssName` ← `palette[state[roleKey]]`.
- For each semantic `TierItem`, resolve
  `state.semanticMappings[key] ?? colorExtras.semanticDefaults[key]`
  through `resolveMapping` and write the emitted CSS value: `var(...)` for a
  palette/reference mapping, a literal string for a literal mapping, or
  `light-dark(light, dark)` for a per-mode literal.
- `clearAppliedStyles()` removes every property the cluster could have set.

The disk `buildApplyOverrides` payload intentionally emits palette and
semantic CSS variables only; base-role values are runtime wiring and are not
included in source-file rewrites.

### 4.6 `applyEndpoint` and `applyRouting`

The Apply modal's button is gated on two `PanelConfig` fields:

| Field          | Type                    | Purpose                                                                 |
| -------------- | ----------------------- | ----------------------------------------------------------------------- |
| `applyEndpoint` | `string`               | URL the Apply button POSTs the flat cssVar diff to.                     |
| `applyRouting` | `Record<string, string>` | CSS-var prefix family → repo-relative source-file path.                |

When both are set (and the routing map is non-empty), the Apply button is
enabled. When either is missing, the modal still mounts so the user can
preview the diff, but the action stays disabled with a tooltip.

---

## 5. Apply pipeline

The **bin server** is the reference implementation for the apply contract.

### 5.1 Request & response envelopes

The Apply button POSTs to `PanelConfig.applyEndpoint` with a flat JSON diff.
The client sends only changed tokens. A token is changed exactly when the CSS
value it would emit differs from the value its baseline would emit. Therefore
an empty flat override or one equal to its manifest default is omitted;
semantic role aliases and palette indices compare by their resolved palette
slot, while literal and ref mappings compare structurally. Palette slots use
the active color-identity baseline. The Apply payload may also contain a
secondary color cluster, diffed against that cluster's configured defaults.

**Request**

```
POST <applyEndpoint>
Content-Type: application/json

{
  "tokens": {
    "--myapp-spacing-md": "2rem",
    "--myapp-extra-slider-length": "200px"
  }
}
```

The same endpoint accepts two optional coordination fields:

- `dryRun: true` computes a preview without creating a temporary file,
  renaming a file, or otherwise mutating disk. A dry run may mix routed and
  unrouted tokens; unrouted entries are diagnostics in the successful preview
  rather than a whole-request error.
- `expectDigests` maps the repo-relative `file` values from a preceding preview
  to their SHA-256 `digest` values. On a real write, every supplied digest is
  checked after all files have been read and before any file is written.

**Response 200 (dry run)**

```json
{
  "ok": true,
  "dryRun": true,
  "files": [
    {
      "file": "src/styles/tokens.css",
      "blockKind": "root",
      "digest": "<64 lowercase SHA-256 hex characters>",
      "changed": ["--myapp-spacing-md"],
      "unchanged": ["--myapp-spacing-lg"],
      "unknown": [],
      "unknownOutsideBlock": [],
      "hunks": [
        {
          "cssVar": "--myapp-spacing-md",
          "line": 12,
          "before": "  --myapp-spacing-md: 1rem;",
          "after": "  --myapp-spacing-md: 2rem;",
          "context": {
            "before": ["  --myapp-spacing-sm: 0.5rem;"],
            "after": ["  --myapp-spacing-lg: 3rem;"]
          }
        }
      ]
    }
  ],
  "rejected": ["--unrouted-token"],
  "rejectedReasons": ["--unrouted-token: no route configured for prefix family (...)"]
}
```

`blockKind` identifies the scanned block containing the requested declaration;
`:root` wins when a request changes declarations in both supported block kinds.
For an unknown-only file result, the first available kind (`root`, then
`theme`) is reported. `line` is one-based. `before` and `after` are complete
declaration lines, while each context array contains the adjacent proposed-file
line on that side. `hunks` contains exactly one entry per changed cssVar; two
declarations on one physical line therefore produce two independently-keyed
hunks with the same line number. Unknown and unchanged tokens do not produce
hunks.

**Response 200 (success)**

```json
{
  "ok": true,
  "updated": [
    {
      "file": "src/styles/tokens.css",
      "changed": ["--myapp-spacing-md"],
      "unchanged": ["--myapp-spacing-lg"],
      "unknown": [],
      "unknownOutsideBlock": []
    }
  ],
  "unknownCssVars": [],
  "unchangedCssVars": ["--myapp-spacing-lg"],
  "unknownOutsideBlockCssVars": []
}
```

**Response 400 (bad request)**

```json
{
  "ok": false,
  "error": "<message>",
  "rejected"?: ["--invalid-token"]
}
```

Returned for: malformed JSON, missing `tokens` field, empty tokens map,
invalid token names (no `--` prefix, spaces, slashes), or path escape attempts.
For a real write, an unsupported CSS-var prefix is also a 400 error. A dry run
keeps unsupported prefixes in its `rejected` / `rejectedReasons` diagnostics
so the caller can preview the rest of the request.

**Response 403 (Forbidden)**

```json
{ "ok": false, "error": "Origin not allowed" }
```

**Response 405 (Method not allowed)**

Empty body, `Allow: POST, OPTIONS` header.

**Response 409 (Conflict)**

```json
{ "ok": false, "error": "No top-level :root { ... } or @theme { ... } block in <file>" }
```

The handler scans only the first top-level `:root` block and the first
top-level `@theme` block (bare or with one modifier). `:root` wins when the
same variable is declared in both. Later blocks and nested blocks are not
rewritable. A dry run can succeed with only unrouted tokens; those tokens are
listed in `rejected` and `rejectedReasons`, while a file with no supported
block is a `409`.

A real write whose current file content does not match a supplied preview
digest returns the following envelope before any target is written:

```json
{
  "ok": false,
  "reason": "stale-file",
  "files": ["src/styles/tokens.css"]
}
```

The client must request a new dry run and ask the user to review the refreshed
hunks. Omitting `expectDigests` preserves the legacy write behaviour.

**Response 500 (Internal server error)**

```json
{
  "ok": false,
  "error": "<message>",
  "failedFile"?: "<relativePath>",
  "restoreFailures"?: ["<file1>", "<file2>"]
}
```

### 5.2 Reference implementation

The bin server (`src/bin/server.ts`) is the reference for this contract. It
reads `--routing <json>` at startup and exposes a Fetch API handler
(`createApplyHandler` from `src/server/create-apply-handler.ts`). Read the
handler source as the spec.

### 5.3 Implementing the contract natively (advanced)

Hosts physically unable to spawn Node.js must:

1. Validate token names — reject names without `--` prefix, with spaces or slashes.
2. Sanitize and route — split each CSS-var prefix, look up the target file in
   the routing map, reject prefixes not in the map.
3. Path safety — resolve each target path to an absolute path, verify it sits
   within `writeRoot`, reject path-escape attempts.
4. Read & parse — load each CSS file, find the first top-level `:root { ... }`
   or first top-level `@theme { ... }` block (bare or with one modifier; fail
   409 if neither exists), parse the existing variable values.
5. Compute rewrite — compute `changed` / `unchanged` / `unknown` and
   `unknownOutsideBlock`, build the updated `:root` / `@theme` content, its
   per-cssVar hunks, and the SHA-256 of the original bytes.
6. Preview/stale gate — for `dryRun: true`, return the preview immediately. For
   a real write with `expectDigests`, compare every supplied digest and return
   the stale-file 409 before the first mutation when any target differs.
7. Atomic write — keep the original file content in memory. Write updated
   content to a temp file. Atomically rename temp to target. If any write
   fails, restore every previously-written file.
8. Respond — return the exact JSON envelope shapes pinned in §5.1.

### 5.4 Routing config — single source of truth

Both the **panel UI** (`PanelConfig.applyRouting`) and the **bin** (`--routing`
flag) read the same JSON file. The map is keyed by the CSS-var prefix family
(without leading `--` and trailing `-`); the value is a repo-relative path to
the source file the bin rewrites.

---

## 6. Astro export contract

The package exposes a second entry point, `./astro`, for Astro projects.

```astro
---
import DesignTokenPanelHost from '@takazudo/zdtp/astro/DesignTokenPanelHost.astro';
import { panelConfig } from '~/lib/design-token-panel-config';
---

<DesignTokenPanelHost config={panelConfig} />
```

### 6.1 Component prop

The component accepts the full `PanelConfig` from §1 as its `config` prop.
Astro frontmatter passes the value at SSR time; the adapter serialises it into
the rendered island and reads it back at runtime to call `configurePanel(config)`.

This is the reason the JSON-serializable constraint in §4.2 is non-negotiable.

### 6.2 Lazy-load gate

The host adapter fires one eager `loadPanelModule()` call when any of the
following signals is present in `localStorage` at page load:

```ts
if (
  wasVisible(visibleKey)  ||   // panel was open last visit (`:visible`)
  wasVisible(openKey)     ||   // same, via the `-open` mirror
  hasPersistedOverrides() ||   // user has saved token tweaks
  shouldAutoload()        ||   // owner-autoload flag set ('1' or 'auto')
  loadElementPathEnabled() ||   // element-path inspector enabled
  loadDomTweakerEnabled()      // DOM Tweaker enabled and configured
) {
  void loadPanelModule();
}
```

- `wasVisible()` — reads `${storagePrefix}:visible` (colon-form key, §2), and
  is applied a second time to the `${storagePrefix}-open` mirror (dash-form,
  §2) that `panel.tsx` writes alongside it. Either key holding `'1'` means the
  panel was open before the last navigation.
- `hasPersistedOverrides()` — scans every `localStorage` key matching the
  `${storagePrefix}-state` family (dash-form, §2: `-state` (v1) through every
  `-state-vN`) and returns `true` when at least one holds a non-empty envelope
  (malformed JSON also counts as `true` — fail open, so the panel loads and
  can migrate or reject the payload rather than stranding the user with data
  it can never see). This is a **content check**, not a presence check on a
  specific version key — an empty `{}` / `[]` / `null` / `''` does NOT trigger
  it. (zdtp itself never writes such a value: `clearPersistedState()` removes
  the `-state` keys outright, so this guard only covers envelopes written by
  hand or by another tool.) Overrides MUST be re-applied to the configured
  sink (or default `:root`) even when the panel stays hidden, otherwise
  hard-nav produces a FOUT.
- `shouldAutoload()` — reads `${storagePrefix}:autoload` (colon-form, §2).
  Returns `true` when the flag is `'1'` (explicit, written by `enableAutoload()`)
  OR `'auto'` (auto-remembered, written by opening the panel — see "Auto-remember
  on open" below). This is the owner-mode signal: the panel bundle fetches
  eagerly and mounts CLOSED so the element-path inspector is armed even though
  the panel UI is hidden. General visitors (no flag, or `'0'`) pay no
  panel-bundle cost; the small host adapter/config bootstrap still runs. A
  downstream host that wants to distinguish the two populations can
  test `=== '1'` directly — see "Auto-remember on open" for the caveat.
- `loadElementPathEnabled()` — reads the element-path inspector's persistence
  key. Returns `true` when the inspector was left enabled. Ensures the Preact
  shell is mounted (the inspector runs inside it) even when the panel UI is
  hidden and no token overrides are persisted.
- `loadDomTweakerEnabled()` — reads the DOM Tweaker persistence key. Returns
  `true` when `PanelConfig.domTweaker` is present and the tweaker was left
  enabled. Ensures the Preact shell is mounted and the lazy boundary is
  imported even when the panel UI is hidden.

When none of the six signals is present — the common case for first-time
visitors and general site visitors on a public site with owner-autoload — the
panel bundle is NOT fetched, no panel stylesheet is injected, and no panel
root is mounted. The small host adapter/config bootstrap still runs to make
that decision.

#### Storage-key table for §6.2 signals

| Signal | Key derivation | Owner |
|--------|---------------|-------|
| `wasVisible` | `${storagePrefix}:visible`, OR its `${storagePrefix}-open` mirror | adapter |
| `hasPersistedOverrides` | Content check across the `${storagePrefix}-state` family (`-state`, `-state-v2`, `-state-v3`, `-state-v4`, ... — every version, not a fixed list) | tweak-state |
| `shouldAutoload` | `${storagePrefix}:autoload`, matching `'1'` or `'auto'` | autoload-state |
| `loadElementPathEnabled` | `${storagePrefix}-elpath-enabled` | element-path-state |
| `loadDomTweakerEnabled` | `${storagePrefix}-domtweaker-enabled` | dom-tweaker-state |

#### DOM Tweaker config and runtime invariants

- `PanelConfig.domTweaker` is disabled by omission. When absent, the header
  toggle is hidden and the persisted `-domtweaker-enabled` key is ignored by
  the lazy-load gate.
- `PanelConfig.domTweaker` is a plain JSON object. The only supported field is
  `themeCss?: string`; unknown fields, functions, non-string `themeCss`, and
  any `@import` occurrence in `themeCss` are rejected by
  `assertValidPanelConfig`.
- The eager side passes `storagePrefix`, `themeCss`, and `consoleNamespace`
  explicitly into the lazy DOM Tweaker boundary. The lazy boundary MUST NOT
  read module-global `PanelConfig`.
- The DOM Tweaker runtime/bridge/portal are document-global. At most one panel
  instance can have DOM Tweaker active in a document. First activation wins;
  a second instance's toggle is inert and emits a `console.warn` tagged with
  that second instance's `consoleNamespace`.

#### Owner-autoload `enableAutoload` / `disableAutoload` contract

`enableAutoload()` (exported from the package root; also wired on
`window[consoleNamespace]` by the Astro host adapter):

1. Sets `${storagePrefix}:autoload = '1'`.
2. Sets `${storagePrefix}-elpath-enabled = '1'` once (arms the Alt+click
   element-path inspector).
3. Loads the panel bundle (if not already loaded).
4. Mounts the Preact shell CLOSED so the element-path inspector is active
   without opening the panel UI.

`disableAutoload()`:

1. Clears `${storagePrefix}:autoload` (removes the key).
2. Sets `${storagePrefix}:visible` to `'0'`.
3. Sets `${storagePrefix}-elpath-enabled` to `'0'`.
4. Removes the open-state key (`${storagePrefix}-open`).
5. Unmounts the Preact shell (drives effect cleanups, removes root).

#### Auto-remember on open

Any action that shows the panel (`showDesignPanel()`, `toggleDesignPanel()`,
the fixed-name `window.zdtp.show()` / `.toggle()` aliases, an instance
handle's `open()` / `toggle()`, the panel header's open action, or an instance
toggle event) MUST also write
`${storagePrefix}:autoload = 'auto'` (auto-remembered provenance, distinct
from the `'1'` that `enableAutoload()` writes) — implemented by
`rememberAutoload()`. This ensures that once the owner has opened the panel
on any page, subsequent visits to the same site reload it automatically
without a second explicit `enableAutoload()` call. An existing explicit `'1'`
is never downgraded to `'auto'` by this path.

`rememberAutoload()` no-ops when `PanelConfig.autoRememberOnOpen === false`
(default `true`) — see the `PanelConfig` interface in §1. This lets a host
serve a visible "open panel" trigger to every visitor without arming
owner-mode for whoever clicks it; `enableAutoload()`'s explicit `'1'` write
is unaffected by this setting either way.

**Consequence for public-site owners:** any open trigger (a visible button, a
keyboard shortcut, etc.) becomes a de-facto owner-mode opt-in for anyone who
uses it, unless `autoRememberOnOpen` is set to `false`. Gate or omit such
triggers on public sites, rely on the console `enableAutoload()` call as the
owner's deliberate opt-in, or set `autoRememberOnOpen: false` if the site
wants the trigger visible to everyone.

**Legacy caveat.** A downstream host that reads `:autoload` directly and
tests `=== '1'` to identify only explicit owners will NOT retroactively shed
browsers that auto-remembered before this provenance split shipped — those
already hold `'1'`, and that provenance was never recorded, so it cannot be
reclassified. The `=== '1'` discrimination applies only to opens made from
this version onward.

#### Shared Alt+click picker ownership

Element path, DOM Tweaker, and element inspect share one document-level
Alt+click coordinator. Only one owner may be armed at a time; a new request
revokes the previous owner's armed state before it starts. Panel-owned surfaces
and the host-page specimen are excluded from all three pickers.

| Feature | Activation | Result |
| --- | --- | --- |
| Element path | Owner autoload or its panel toggle, then `Alt+click` | Copies an annotated selector/path block. |
| DOM Tweaker | Configured feature toggle, then `Alt+click` | Opens the Tailwind class editor and live utility preview. |
| Element inspect | Header toggle or `I`, then click; `Alt` also arms the coordinator | Opens the reserved inspect tab with computed and inherited token rows. |

### 6.3 Astro view-transition lifecycle

The adapter's existing `astro:before-swap` and `astro:page-load` listeners
stay. They are Astro-specific and only register when `document` is available:

- `astro:before-swap` → unmount the Preact tree, remove the host node, snapshot/restore visibility intent.
- `astro:page-load` → re-apply persisted overrides + re-materialise the shell when any of the six gate signals (§6.2) is true.

### 6.4 Console API

```ts
window[consoleNamespace].showDesignPanel   = () => Promise<void>;
window[consoleNamespace].hideDesignPanel   = () => Promise<void>;
window[consoleNamespace].toggleDesignPanel = () => Promise<void>;
window[consoleNamespace].enableAutoload    = () => Promise<void>;  // owner-autoload opt-in
window[consoleNamespace].disableAutoload   = () => Promise<void>;  // owner-autoload teardown
```

### 6.5 Fixed-name global open API (`window.zdtp`)

`consoleNamespace` above is a REQUIRED host-chosen field — every consumer
historically had to know its own namespace before it could open the panel
from the console. `window.zdtp` is an ADDITIVE, fixed-name alias for the
three open/close verbs, so `zdtp.show()` works in the console of any page
that runs this package, without looking up the host's namespace first:

```ts
window.zdtp.show   = () => void | Promise<void>;  // open the panel
window.zdtp.hide   = () => void | Promise<void>;  // close the panel
window.zdtp.toggle = () => void | Promise<void>;  // toggle the panel
```

- **Scope: `show` / `hide` / `toggle` only.** `enableAutoload()` /
  `disableAutoload()` stay on `window[consoleNamespace].*` (§6.4) and the
  package-root exports (README.md §10) — there is no
  `window.zdtp.enableAutoload`.
- **`window[consoleNamespace].*` is unaffected.** It stays fully intact as
  the multi-tenant, per-namespace API; `window.zdtp` is sugar for the common
  single-panel case layered on top, not a replacement.
- **Targets the default instance — with one install-site nuance.** On a
  non-Astro host, `window.zdtp.*` wraps the package-root
  `showDesignTokenPanel()` / `hideDesignTokenPanel()` / `toggleDesignPanel()`
  exports, which re-resolve `getPanelConfig()` (the current default instance)
  on every call — so it always tracks whichever instance is CURRENTLY the
  default, even if that changes after install. On an Astro host, the adapter
  binds `window.zdtp.*` to the specific `PanelInstanceHandle` captured at
  install time (whichever instance's adapter script installs the alias
  first — see the next point); it does NOT re-resolve the default on each
  call, so on a page with more than one `<DesignTokenPanelHost>` instance the
  alias keeps targeting that first instance even after a later-configured
  instance becomes the registry's default. Either way, on a multi-instance
  page use `configurePanel(cfg)`'s returned handle (`handle.open()` /
  `.close()` / `.toggle()`) to target a SPECIFIC instance unambiguously.
- **Install sites and timing.** Two independent call sites install this
  alias, both routing through one shared installer so neither clobbers the
  other:
  - The package-root module (`index.tsx`) installs a synchronous alias at
    its own module-init bootstrap — covers non-Astro hosts that import the
    package directly.
  - The Astro host adapter installs an async-wrapped alias eagerly from its
    own `<script>` bootstrap, alongside `installConsoleApi` (§6.4) — so
    `zdtp.show()` is callable in the console BEFORE the panel bundle itself
    has loaded. Each wrapper lazily imports the panel module (the same gate
    the console API uses) on first call, then drives the captured instance
    handle.
  - In the Astro flow the adapter's bootstrap script always runs before the
    panel module's lazy dynamic import can resolve, so the adapter's alias
    always installs first ("first install wins" — see the next point). The
    package-root install site is therefore reached only by non-Astro hosts.
- **Never clobbers a host-defined `window.zdtp`.** If `window.zdtp` already
  exposes callable `show` / `hide` / `toggle` methods, the install is skipped
  silently — this supports hosts that pre-claim the alias before lazily loading
  the panel bundle. Other pre-existing values are also left untouched, but
  produce a `console.warn`. (This includes the edge case of a host that picks
  `consoleNamespace: 'zdtp'`: the namespace object installed at §6.4 does not
  expose the fixed-name alias shape, so the second install site warns and skips.)
- **Auto-remember carries over for free.** `zdtp.show()` routes through the
  same `showDesignTokenPanel()` / `handle.open()` core as every other open
  path, so it arms `${storagePrefix}:autoload = 'auto'` exactly like
  `showDesignPanel()` (§6.2) — no separate wiring needed, and it is subject
  to the same `autoRememberOnOpen: false` gate.

---

## 7. CSS contract

### 7.1 Panel-private namespace

The panel ships its own bundled CSS. Panel-private color, font, spacing,
typography, and z-index variables use the `--tokentweak-*` prefix; the shared
radius token is `--radius-tokentweak`. They are scoped to the panel shell,
mini pill, modal class prefix, and the body-level popover/tooltip/inspector
surfaces:

```css
:where(.tokenpanel-shell, [data-design-token-panel-modal]) {
  /* base-0 is the darkest ground; stops ascend toward the foreground. */
  --tokentweak-palette-base-5: oklch(0.8 0 0);
  --tokentweak-color-fg: var(--tokentweak-palette-base-5);
  --tokentweak-color-accent-bar: #efb477;
  /* …every panel-chrome value lives here */
}
```

- **No Tailwind dependency.** The package builds and runs without Tailwind in
  the consumer.
- **Self-injected by the panel entry.** The panel calls `ensurePanelStyles()`
  when it first mounts, so a consumer does not need a CSS import. The `./styles`
  sub-export remains available when a host wants to pull the stylesheet into its
  own static CSS pipeline; importing it twice is unnecessary.

  ```ts
  import '@takazudo/zdtp/styles'; // optional static-CSS path
  ```

The semantic color layer includes `--tokentweak-color-fg`, `bg`, `muted`,
`border`, `surface`, `accent`, `accent-bar`, `accent-hover`, `code-bg`,
`code-fg`, `success`, `danger`, and `warning`, backed by the private
`--tokentweak-palette-base-*` OKLCH ramp, plus `--tokentweak-font-mono`. Spacing,
typography, radius, and stacking values use the same prefix (`pad-*`, `gap-*`,
`text-*`, `--radius-tokentweak`, and `z-*`). The chrome does not read host
`--color-*` or `--font-mono` variables; hosts that retheme it assign the
`--tokentweak-*` names directly on one of the listed scopes.

Docking is a host-document contract rather than a panel-private token:
`--zdtp-dock-inset-right` and `--zdtp-dock-inset-bottom` are published on the
host root while the corresponding dock claim is active. The on-page specimen
uses `.tokenpanel-on-page-specimen[data-zdtp-specimen]`; it inherits the host
font/foreground, is excluded from token scans and page pickers, and is removed
when the specimen is disabled, closed, unmounted, or loses its dock claim.

### 7.2 Consumer's editable tokens

The tokens the panel writes to (the `cssVar` field on each `TierItem`) are
entirely consumer-controlled. The package writes them through the configured
`applySink`, or through `setProperty` on the default `:root` target when no
sink is supplied.

- **Read:** the panel never reads consumer CSS variables (it carries its own
  defaults via `TierItem.default`).
- **Write:** the panel only writes the consumer-supplied `cssVar` strings.

### 7.3 Modal class prefix + `data-design-token-panel-modal`

`PanelConfig.modalClassPrefix` controls the BEM root for every modal the
panel owns. **The bundled CSS keys on the data attribute, NOT on the class
prefix.** Every modal `<dialog>` element emits
`data-design-token-panel-modal=""`. `panel.css` anchors all modal chrome
rules on `[data-design-token-panel-modal]`.

### 7.4 Self-contained panel chrome palette (no host theme reads)

The panel-chrome color tokens are declared in `panel-tokens.css` as semantic
aliases onto a private OKLCH ramp so the panel paints as a neutral dark surface
regardless of what the host's `--color-*` tokens resolve to:

```css
:where(.tokenpanel-shell, [data-design-token-panel-modal]) {
  /* base-0 is the darkest ground; stops ascend toward the foreground. */
  --tokentweak-palette-base-0: oklch(0.18 0 0);
  --tokentweak-palette-base-1: oklch(0.25 0 0);
  --tokentweak-palette-base-2: oklch(0.34 0 0);
  --tokentweak-palette-base-3: oklch(0.536 0 0);
  --tokentweak-palette-base-4: oklch(0.66 0 0);
  --tokentweak-palette-base-5: oklch(0.8 0 0);
  --tokentweak-palette-base-6: oklch(0.91 0 0);
  --tokentweak-color-fg: var(--tokentweak-palette-base-5);
  --tokentweak-color-bg: var(--tokentweak-palette-base-0);
  --tokentweak-color-muted: var(--tokentweak-palette-base-4);
  --tokentweak-color-border: var(--tokentweak-palette-base-3);
  --tokentweak-color-surface: var(--tokentweak-palette-base-1);
  --tokentweak-color-accent: #d69a66;
  --tokentweak-color-accent-bar: #efb477;
  --tokentweak-color-accent-hover: #a7c0e3;
  --tokentweak-color-code-bg: var(--tokentweak-palette-base-2);
  --tokentweak-color-code-fg: var(--tokentweak-palette-base-6);
  --tokentweak-color-success: #93bb77;
  --tokentweak-color-danger: #da6871;
  --tokentweak-color-warning: #dfbb77;
  --tokentweak-font-mono: Menlo, Monaco, Consolas, 'Liberation Mono',
    'Courier New', monospace;
}
```

The panel deliberately does NOT read host `--color-*` / `--font-mono`
tokens. The panel is a developer tool that ships inside a host page; a
host theme change — including theme tweaks driven through this very panel
in a demo — MUST NOT bleed into the panel chrome.

**Override surface for hosts:** a host that wants to retheme the panel
chrome assigns directly to the `--tokentweak-color-*` /
`--tokentweak-font-mono` names on `.tokenpanel-shell`,
`.tokenpanel-mini-pill`, `[data-design-token-panel-modal]`, the highlight
settings and chain popovers, the color picker, tooltip, element-path label and
toast, or an element-inspect surface (or any ancestor). `:where()` keeps
specificity at 0. This single name layer is the entire host-override contract
for panel chrome — `--color-*` reads are not part of it.

Hosts may instead override a `--tokentweak-palette-base-*` stop to update all
roles that alias it; a direct semantic `--tokentweak-color-*` assignment still
wins. The border role is intentionally separate: `--tokentweak-color-muted`
now recolors secondary text only. A host that previously used it for both text
and 1px dividers must also assign `--tokentweak-color-border`.

**Invariant:** the panel package MUST NOT read `--color-*` or
`--font-mono` anywhere. Both `panel.css` and `panel-tokens.css` are pinned
by acceptance grep:

```bash
grep -n 'var(--color-' src/styles/panel.css        # → 0
grep -n 'var(--font-mono' src/styles/panel.css     # → 0
grep -n 'var(--color-' src/styles/panel-tokens.css # → 0
grep -n 'var(--font-mono' src/styles/panel-tokens.css # → 0
```

### 7.5 Host-adapter side-effect import (paired-unit obligation)

The consumer MUST own a side-effect import for the host-adapter, paired with
`<DesignTokenPanelHost>`. The `./styles` import is optional because the panel
entry self-injects its stylesheet; use it only when the host wants a static CSS
pipeline:

```astro
<DesignTokenPanelHost config={myPanelConfig} />

<script>
  void import('@takazudo/zdtp/astro/host-adapter');
</script>
```

---

## 8. Storage-key continuity & migration paths

### 8.1 Minimal fallback before configuration

The package ships **zero** host-specific identifiers. Before the first explicit
`configurePanel` call, `getPanelConfig()` returns a minimal sentinel with empty
token manifests and a stub color cluster so imports and adapter boot can remain
safe; it is not a useful consumer configuration. Hosts MUST configure the
panel explicitly to render their own tabs and token values.

### 8.2 Storage-key derivation is literal

For any host's chosen `storagePrefix`, the derivation produces deterministic,
literal-equal storage keys (see §2). Unit tests pin the derived keys to
literal strings.

### 8.3 v4 precedence and v1 / v2 / v3 migration

`loadPersistedState` first looks for a valid `state-v4` envelope. If that key
is absent or invalid, it falls through to the retained legacy chain. The
precedence and deletion rules are explicit:

| Storage condition | Selection / migration action | Key-retention result |
| ----------------- | ---------------------------- | --------------------- |
| Valid `${storagePrefix}-state-v4` (v4) | Select the active identity's `color` and optional `secondary` slots; load global `tabs`, `spacing`, `typography`, and `size`. | v4 wins; no legacy key is touched. |
| v4 key absent or invalid | Fall through and inspect the legacy keys in order. | No deletion is caused by the v4 probe. |
| Valid `${storagePrefix}-state-v3` (v3) | Use v3; do not inspect, rewrite, or delete lower legacy keys. | Copy the resulting state into v4 under the active identity; retain v3 for downgrade compatibility. |
| Valid `${storagePrefix}-state-v2` (v2), with no valid v3 | Parse v2 and write the resulting flat state to v3. | Delete v2, then copy the resulting v3 state into v4; retain v3 for downgrade compatibility. |
| Valid `${storagePrefix}-state` (v1), with no valid v3 or v2 | Lift the flat Color-only state into the unified state and write it to v3. | Delete v1, then copy the resulting v3 state into v4; retain v3 for downgrade compatibility. |

Thus a v3 key wins over v2 and v1, and a v4 migration never removes v3. The
selected or newly written v3 state is always filed into the v4 envelope under
the identity active at that moment. Subsequent loads read v4 first; a
downgrade can still read the retained v3 envelope. Malformed legacy values are
skipped in the same order so the next lower legacy key can be considered.

The retained v3 envelope has a flat, single-slot `color` and global slices:

```ts
// Simplified v3 localStorage envelope shape
{
  color:      { ... },
  spacing:    { ... },
  typography: { ... },
  size:       { ... },
  tabs: {
    "my-custom-tab": { "item-id-1": "some-value", ... },
    ...
  }
}
```

The current v4 envelope and its active-identity seeding and merge-write rules
are specified in §2 above.

### 8.4 Typography-id rename map

The optional `PanelConfig.legacyIdRenameMap` (`Record<string, string | null>`)
enables host-controlled id rename / drop during `loadPersistedState` migration.
`null` drops the id entirely. The default is an empty map (no renaming).

The historical zdtp-internal map is exported as `ZDTP_LEGACY_TYPOGRAPHY_RENAME_MAP`.

---

## 9. JSON export / import schema (serde)

### 9.1 Schema versioning

| `$schema` value         | Status  | Structure                                              |
| ----------------------- | ------- | ------------------------------------------------------ |
| `zudo-design-tokens/v1` | Legacy  | Flat top-level `color`/`spacing`/`typography`/`size` keys |
| `zudo-design-tokens/v2` | Current | `tabs` wrapper keyed by tab id; cssVar-keyed leaves    |
| `zudo-design-tokens/v3` | Current | v2 structure with object-valued semantic color mappings |

`serialize()` emits v2 for states whose semantic mappings are representable by
the v2 shape, and upgrades to v3 when an object-valued semantic mapping needs
the v3 shape. `deserialize()` accepts v1, v2, and v3 and normalises each to an
internal `TweakState`.

### 9.2 v2 format

```jsonc
{
  "$schema": "zudo-design-tokens/v2",
  "exportedAt": "2026-01-01T00:00:00.000Z",
  "tabs": {
    "spacing": {
      "raw": { "--myapp-spacing-md": "1.25rem" }
    },
    "font": {
      "raw":      { "--myapp-scale-base": "1rem" },
      "semantic": { "--myapp-text-base": "var(--myapp-scale-base)" }
    },
    "color": {
      "palette":  { "--myapp-palette-1": "#2d6cdf" },
      "semantic": { "--myapp-color-primary": 1 }
    }
  }
}
```

Key decisions:

- **cssVar-keyed leaves** — portable across host id renames.
- **Tier-2 ref values** stored as the literal `var(--tier1-cssvar)` CSS string
  (no discriminated union — keeps the format flat and hand-editable).
- **Color `semantic` values** are palette-index integers (preserved from v1 so
  the swatch UI can render the resolved color).

### 9.3 Diff-only by default

`serialize()` only emits tokens the user has changed relative to manifest
defaults. Pass `includeDefaults: true` to dump the full state. A tab key is
omitted entirely when nothing in it differs. "Changed" uses the canonical
emitted-value definition in §5.1. Export parity covers tokens representable by
the current schema: flat tabs and the primary color cluster. The secondary
color cluster is Apply-only and is not added to the export schema here.

A sparse persisted override equal to today's manifest default remains stored
but invisible to the UI, diff-only export, and Apply. It can intentionally
resurface if a later manifest changes that default.

---

## 10. Out-of-scope (deferred)

Items this contract deliberately does NOT pin down:

- **Persist envelope internal shape** — frozen at the current shape so
  existing user state round-trips without migration.
- **Schema id versioning.** `schemaId` is a configure-time display label
  returned by `getDesignTokenSchema()`; it does not select or version the
  serializer. The package-owned `SCHEMA_V1` / `SCHEMA_V2` / `SCHEMA_V3`
  constants govern export and import validation.
- **Shadow-DOM scoping.** The panel writes to `:root` by default; hosts
  that need scoped writes use `PanelConfig.applySink` (§3.6). The sink
  target's lifecycle is owned by the host — not pinned here.
- **Theme-API surface.** The panel does not expose a programmatic API for
  reading the current overrides outside the persist envelope.

---

## Appendix A — section index

Cross-reference table — what each section pins down.

| Topic                                                                                       | Section       |
| ------------------------------------------------------------------------------------------- | ------------- |
| `configurePanel({...})` signature, multi-instance, `PanelInstanceHandle`, per-instance toggle events | §1     |
| Storage-key derivation                                                                      | §2, §8        |
| Default first-open geometry (coherent size+position, viewport containment, cascade, persisted-position precedence) | §2.1 |
| `PanelDockConfig`, dock modes, body-margin reflow, edge claims, and dock storage | §1, §2, §7 |
| `TabConfig` / `TierConfig` / `TierItem` / `TierValueKind` interfaces and apply behaviour   | §3            |
| `TierConfig.preview` / `previewBase` matrix and host-page specimen lifecycle | §3.2 |
| `applySink` — optional CSS-var write target (upsert / clear / Reset full set)              | §3.6          |
| `ColorClusterExtras` shape and multi-cluster support                                        | §4.1, §4.3    |
| JSON-serializable constraint on color tab config                                            | §4.2          |
| `colorPresets` and `setPanelColorPresets()` lazy attachment                                 | §4.4          |
| Color apply behaviour                                                                       | §4.5          |
| Apply pipeline request / response envelopes, dry-run hunks/digests, stale-write 409          | §5.1          |
| Canonical transaction order and in-memory undo/redo history                                 | §3.8          |
| Reference-implementation algorithm + native-implementation guidance                         | §5.2, §5.3    |
| Routing config single-source                                                                | §5.4          |
| Astro `<DesignTokenPanelHost>` prop, lazy-load gate (6-signal), owner-autoload, console API | §6            |
| Shared Alt+click owner for element path, DOM Tweaker, and element inspect                   | §6.2          |
| Fixed-name global open API (`window.zdtp.show/hide/toggle`)                                 | §6.5          |
| `--tokentweak-*` namespace and Tailwind-free CSS contract                                   | §7.1          |
| Modal class prefix and `data-design-token-panel-modal` selector contract                    | §7.3          |
| Self-contained panel chrome palette (no host theme reads)                                  | §7.4          |
| Host-adapter side-effect import (paired-unit obligation)                                    | §7.5          |
| v4 envelope precedence, v1/v2/v3 storage migration, and typography-id rename map             | §2, §8.3, §8.4 |
| JSON export/import schemas v1/v2/v3 (serde)                                                  | §9            |
| Out-of-scope / deferred concerns                                                            | §10           |
| Feature walkthrough and shortcut table                                                     | [Panel UX tour](/docs/recipes/panel-ux-tour) |
