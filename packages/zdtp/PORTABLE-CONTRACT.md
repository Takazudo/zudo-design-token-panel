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
export interface PanelConfig {
  /** Base for every derived storage key. Also the instance id. See §2. */
  storagePrefix: string;
  /** Console API namespace — installed as `window[consoleNamespace].showDesignPanel`, etc. */
  consoleNamespace: string;
  /** BEM-style prefix used by every modal in the panel (export / import / apply). */
  modalClassPrefix: string;
  /** `$schema` value emitted into export JSON and required on import. */
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
   * Optional dev-API endpoint URL. When the host wires the panel into a
   * project that ships its own design-tokens-apply route, supply the URL
   * here; the Apply button POSTs its diff payload to it. When `undefined`,
   * the Apply button stays disabled with a tooltip.
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
   * Optional apply sink. Routes this instance's CSS-var writes and clears
   * through the caller-supplied object instead of `document.documentElement`.
   * See §3.5 for the full sink contract.
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
}

/**
 * Apply sink — routes CSS-var writes for one panel instance somewhere other
 * than the host `:root`. See §3.5.
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
| `state-v3`  | `${storagePrefix}-state-v3` | tweak-state          | Current unified envelope: tabs map + color + spacing + typography + size + panelPosition. Added `tabs` map for generic host-coined tabs.                     |
| `state-v2`  | `${storagePrefix}-state-v2` | tweak-state (legacy) | Pre-v3 unified envelope (color + spacing + typography + size + panelPosition). Migrated into `state-v3` on first load, then deleted.                        |
| `state-v1`  | `${storagePrefix}-state`    | tweak-state (legacy) | Pre-v2 flat-state format (Color-only). Migrated into `state-v3` on first load, then deleted.                                                                |
| `open`      | `${storagePrefix}-open`     | panel                | Mirror of the panel's `open` boolean state (so the next mount opens directly into the user's last state without a post-render toggle dispatch).              |
| `position`  | `${storagePrefix}-position` | panel                | Drag position (`{ top, right }`) so the panel reappears where the user left it.                                                                              |
| `visible`   | `${storagePrefix}:visible`  | adapter              | Adapter-level visibility-intent flag, owned by the lazy-load gate (§6).                                                                                      |

**Constraint — colon, not dash, for `visible`.** The `visible` key uses a
`:` separator, every other derived key uses `-`. This is a historical artifact
preserved for storage-key continuity: a key rename would silently lose users'
visibility intent on first load. The derivation MUST emit the colon literally;
do not "fix" it during refactors.

**Storage-key derivation is literal.** With `storagePrefix: "myapp-design-token-panel"`,
the derivation produces:

```
myapp-design-token-panel-state-v3
myapp-design-token-panel-state-v2
myapp-design-token-panel-state
myapp-design-token-panel-open
myapp-design-token-panel-position
myapp-design-token-panel:visible
```

Unit tests in the package verify these derivations with literal-equality
checks, and the v1 → v3 / v2 → v3 migration paths at first-load are part of
the test matrix.

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
  | { kind: 'length'; step: number; unit: string }
  | { kind: 'number'; step: number }
  | { kind: 'select'; options: readonly string[] }
  | { kind: 'text' }
  | { kind: 'cursor' }
  | { kind: 'content' }
  | { kind: 'mask-image' }
  | { kind: 'color' };

export interface PillSpec {
  value: string;
  customDefault: string;
}

/** A single editable or reference token within a tier. */
export interface TierItem {
  /** Stable id used as the key in persisted state (e.g. `hsp-2xs`). */
  id: string;
  /** CSS custom property written to `:root` (e.g. `--myapp-spacing-hgap-2xs`). */
  cssVar: string;
  /** Display label shown in the panel row. */
  label: string;
  /** Optional manifest group — tab components use this for section headers. */
  group?: string;
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
}

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
}

/** Top-level tab entry on PanelConfig.tabs. */
export interface TabConfig {
  /** Stable id. Reserved ids: 'color' (primary color tab), 'color-secondary'. */
  id: string;
  /** Display label rendered on the tab strip. */
  label: string;
  /** Ordered list of tiers within this tab. */
  tiers: readonly TierConfig[];
  /** Tier ids whose rows are hidden behind an Advanced <details> disclosure. */
  advancedTiers?: readonly string[];
  /**
   * Required on color tabs (id 'color' / 'color-secondary'). Carries the
   * structural metadata (base roles, scheme registry, panel settings) for the
   * color tab's palette picker and semantic table. Absent on non-color tabs.
   */
  colorExtras?: ColorClusterExtras;
}
```

### 3.2 Reserved tab ids

| Tab id             | Meaning                                            |
| ------------------ | -------------------------------------------------- |
| `color`            | Primary color tab — palette + base roles + semantics + scheme picker. Requires `colorExtras`. |
| `color-secondary`  | Secondary color tab (same shape as `color`). Requires `colorExtras`. |

Any other id dispatches to `GenericTab`, which renders the tab's `tiers`
using kind-appropriate editors.

### 3.3 Validation rules

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

### 3.4 Apply behaviour for ref-tier items

When a `TierConfig` carries `referencesTier`, the apply pipeline treats each
item's persisted value as the id of an item in the referenced tier. The
emitted CSS override is `var(--target-cssvar)` where `target-cssvar` is the
`cssVar` of the matched item in the base tier.

By default the write target is `:root` (`document.documentElement`). When a
`PanelConfig.applySink` is configured for the instance, writes are routed
through the sink instead — see §3.5.

### 3.5 `applySink` — optional CSS-var write target

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

### 3.6 Helpers (re-exported from the package root)

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
     * on init. Set to `false` to disable the light/dark UI.
     */
    colorMode: false | { defaultMode: 'light' | 'dark'; lightScheme: string; darkScheme: string };
  };
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
  palette: readonly string[]; // length must match the palette tier's item count
  shikiTheme: string;
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
- For each `(roleKey, cssName)` in `colorExtras.baseRoles`, write
  `cssName` ← `palette[state[roleKey]]`.
- For each semantic `TierItem`, resolve
  `state.semanticMappings[key] ?? colorExtras.semanticDefaults[key]`
  through `resolveMapping` and write `item.cssVar` ← resolved hex.
- `clearAppliedStyles()` removes every property the cluster could have set.

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

**Response 200 (success)**

```json
{
  "ok": true,
  "updated": [
    {
      "file": "src/styles/tokens.css",
      "changed": ["--myapp-spacing-md"],
      "unchanged": ["--myapp-spacing-lg"],
      "unknown": []
    }
  ],
  "unknownCssVars": [],
  "unchangedCssVars": ["--myapp-spacing-lg"]
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
invalid token names (no `--` prefix, spaces, slashes), unsupported CSS-var
prefix, path escape attempts.

**Response 403 (Forbidden)**

```json
{ "ok": false, "error": "Origin not allowed" }
```

**Response 405 (Method not allowed)**

Empty body, `Allow: POST, OPTIONS` header.

**Response 409 (Conflict)**

```json
{ "ok": false, "error": "No top-level :root { ... } block in <file>" }
```

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
4. Read & parse — load each CSS file, find the `:root { ... }` block (fail
   409 if missing), parse the existing variable values.
5. Compute rewrite — compute `changed` / `unchanged` / `unknown`, build the
   updated `:root` block.
6. Atomic write — keep the original file content in memory. Write updated
   content to a temp file. Atomically rename temp to target. If any write
   fails, restore every previously-written file.
7. Respond — return the exact JSON envelope shapes pinned in §5.1.

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

```ts
if (wasVisible() || hasPersistedOverrides()) {
  void loadPanelModule();
}
```

- `wasVisible()` reads `${storagePrefix}:visible` (colon-form key from §2).
- `hasPersistedOverrides()` probes `${storagePrefix}-state-v3`. Returns `true`
  when the user has any saved tweaks — overrides MUST be re-applied to `:root`
  even when the panel itself stays hidden, otherwise hard-nav produces a FOUT.

### 6.3 Astro view-transition lifecycle

The adapter's existing `astro:before-swap` and `astro:page-load` listeners
stay. They are Astro-specific and only register when `document` is available:

- `astro:before-swap` → unmount the Preact tree, remove the host node, snapshot/restore visibility intent.
- `astro:page-load` → re-apply persisted overrides + re-materialise the shell when either gate probe is true.

### 6.4 Console API

```ts
window[consoleNamespace].showDesignPanel  = () => Promise<void>;
window[consoleNamespace].hideDesignPanel  = () => Promise<void>;
window[consoleNamespace].toggleDesignPanel = () => Promise<void>;
```

---

## 7. CSS contract

### 7.1 Panel-private namespace

The panel ships its own bundled CSS. All panel-chrome variables use the
`--tokentweak-*` prefix, scoped to the panel shell + modal class prefix:

```css
:where(.tokenpanel-shell, [data-design-token-panel-modal]) {
  --tokentweak-pad-md: …;
  --tokentweak-gap-sm: …;
  --tokentweak-color-fg: #b8b8b8;
  /* …every panel-chrome value lives here */
}
```

- **No Tailwind dependency.** The package builds and runs without Tailwind in
  the consumer.
- **Consumer import required.** The `./styles` sub-export must be imported
  exactly once from the consumer's static module graph:

  ```ts
  import '@takazudo/zdtp/styles';
  ```

### 7.2 Consumer's editable tokens

The tokens the panel writes to (the `cssVar` field on each `TierItem`) are
entirely consumer-controlled. The package just writes them through `setProperty`
on `:root`.

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

The panel-chrome color tokens are declared in `panel-tokens.css` as
concrete dark-palette values so the panel paints as a neutral dark surface
regardless of what the host's `--color-*` tokens resolve to:

```css
:where(.tokenpanel-shell, [data-design-token-panel-modal]) {
  --tokentweak-color-fg: #b8b8b8;
  --tokentweak-color-bg: #181818;
  --tokentweak-color-muted: #888888;
  --tokentweak-color-surface: #1c1c1c;
  --tokentweak-color-accent: #d69a66;
  --tokentweak-color-accent-hover: #a7c0e3;
  --tokentweak-color-code-bg: #383838;
  --tokentweak-color-code-fg: #e0e0e0;
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
`[data-design-token-panel-modal]`, or any ancestor (`:where()` keeps
specificity at 0). This single name layer is the entire host-override
contract for panel chrome — `--color-*` reads are not part of it.

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

Alongside the `./styles` import, the consumer MUST own a side-effect import
for the host-adapter, paired with `<DesignTokenPanelHost>`:

```astro
<DesignTokenPanelHost config={myPanelConfig} />

<script>
  void import('@takazudo/zdtp/astro/host-adapter');
</script>
```

---

## 8. Storage-key continuity & migration paths

### 8.1 No default `PanelConfig`

The package ships **zero** baked-in identifiers. The host MUST configure the
panel explicitly. A package import without an explicit configure-call surfaces
a clear runtime error.

### 8.2 Storage-key derivation is literal

For any host's chosen `storagePrefix`, the derivation produces deterministic,
literal-equal storage keys (see §2). Unit tests pin the derived keys to
literal strings.

### 8.3 v1 / v2 → v3 in-place migration

On first load, `loadPersistedState` migrates forward through the chain:

| Source key              | Target key               | Action after migration |
| ----------------------- | ------------------------ | ---------------------- |
| `${storagePrefix}-state` (v1)    | `${storagePrefix}-state-v3` | v1 key deleted |
| `${storagePrefix}-state-v2` (v2) | `${storagePrefix}-state-v3` | v2 key deleted |

A user who last opened the panel before v3 landed gets their old color/spacing
tweaks lifted into the new envelope on first load.

The v3 envelope adds a `tabs` map alongside the existing per-category slices:

```ts
// Simplified v3 localStorage envelope shape
{
  // legacy category slices — preserved for round-trip compatibility
  color:      { ... },
  spacing:    { ... },
  typography: { ... },
  size:       { ... },
  // v3 extension — generic tab overrides keyed by tab id
  tabs: {
    "my-custom-tab": { "item-id-1": "some-value", ... },
    ...
  }
}
```

### 8.4 Typography-id rename map

The optional `PanelConfig.legacyIdRenameMap` (`Record<string, string | null>`)
enables host-controlled id rename / drop during `loadPersistedState` migration.
`null` drops the id entirely. The default is an empty map (no renaming).

The historical zdtp-internal map is exported as `ZDTP_LEGACY_TYPOGRAPHY_RENAME_MAP`.

---

## 9. JSON export / import schema (serde v2)

### 9.1 Schema versioning

| `$schema` value         | Status  | Structure                                              |
| ----------------------- | ------- | ------------------------------------------------------ |
| `zudo-design-tokens/v1` | Legacy  | Flat top-level `color`/`spacing`/`typography`/`size` keys |
| `zudo-design-tokens/v2` | Current | `tabs` wrapper keyed by tab id; cssVar-keyed leaves    |

`serialize()` always emits v2. `deserialize()` accepts both v1 and v2 and
normalises to an internal `TweakState`.

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
omitted entirely when nothing in it differs.

---

## 10. Out-of-scope (deferred)

Items this contract deliberately does NOT pin down:

- **Persist envelope internal shape** — frozen at the current shape so
  existing user state round-trips without migration.
- **Schema id versioning.** `schemaId` is a configure-time string; bumping
  it is the host's responsibility.
- **Shadow-DOM scoping.** The panel writes to `:root` by default; hosts
  that need scoped writes use `PanelConfig.applySink` (§3.5). The sink
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
| `TabConfig` / `TierConfig` / `TierItem` / `TierValueKind` interfaces and apply behaviour   | §3            |
| `applySink` — optional CSS-var write target (upsert / clear / Reset full set)              | §3.5          |
| `ColorClusterExtras` shape and multi-cluster support                                        | §4.1, §4.3    |
| JSON-serializable constraint on color tab config                                            | §4.2          |
| `colorPresets` and `setPanelColorPresets()` lazy attachment                                 | §4.4          |
| Color apply behaviour                                                                       | §4.5          |
| Apply pipeline request / response envelopes                                                 | §5.1          |
| Reference-implementation algorithm + native-implementation guidance                         | §5.2, §5.3    |
| Routing config single-source                                                                | §5.4          |
| Astro `<DesignTokenPanelHost>` prop, lazy-load gate, console API                           | §6            |
| `--tokentweak-*` namespace and Tailwind-free CSS contract                                   | §7.1          |
| Modal class prefix and `data-design-token-panel-modal` selector contract                    | §7.3          |
| Self-contained panel chrome palette (no host theme reads)                                  | §7.4          |
| Host-adapter side-effect import (paired-unit obligation)                                    | §7.5          |
| v1/v2 → v3 storage migration and typography-id rename map                                   | §8.3, §8.4    |
| JSON export/import schema v2 (serde v2)                                                     | §9            |
| Out-of-scope / deferred concerns                                                            | §10           |
