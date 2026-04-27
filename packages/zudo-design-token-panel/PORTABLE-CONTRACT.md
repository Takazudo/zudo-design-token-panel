# Design Token Panel — Portable Contract

This document codifies the public contract that the
`@takazudo/zudo-design-token-panel` package exposes to its host applications.
It is the source of truth for the package's portable API surface. Reviewers
should be able to check off any change to the package against the section
that pins the surface it touches.

The package extracts every project-specific identifier behind a single
configure-once init (`configurePanel({...})`) so the same package can ship
into any Preact-supporting Astro / Vite / Next.js / Rust-SSG consumer. Storage
keys, console namespace, modal class prefixes, schema id, palette CSS-var
pattern, the token manifest, and the color cluster are all host-supplied.

---

## 1. `configurePanel({...})` — configure-once init

The package exposes a single, idempotent setup function. Hosts call it exactly
once per page lifecycle, before the panel adapter is dynamically imported
(typically from a small Astro host script that gates the adapter behind a
visibility / persistence probe — see §5).

```ts
export interface PanelConfig {
  /** Base for every derived storage key. See §2. */
  storagePrefix: string;
  /** Console API namespace — installed as `window[consoleNamespace].showDesignPanel`, etc. */
  consoleNamespace: string;
  /** BEM-style prefix used by every modal in the panel (export / import / apply). */
  modalClassPrefix: string;
  /** `$schema` value emitted into export JSON and required on import. */
  schemaId: string;
  /** Default filename base — exports save as `${exportFilenameBase}.json`. */
  exportFilenameBase: string;
  /** Editable design tokens grouped per-tab. See §3. */
  tokens: TokenManifest;
  /** Palette + base roles + semantic table. See §4. */
  colorCluster: ColorClusterConfig;
  /**
   * Optional secondary color cluster. Host-driven:
   *  - `undefined` (field omitted) — secondary section hidden.
   *  - `null` — explicit opt-out: secondary section hidden + apply/clear skipped.
   *  - `ColorClusterConfig` — host-supplied secondary cluster.
   * See §4.3 for the resolution contract.
   */
  secondaryColorCluster?: ColorClusterConfig | null;
  /**
   * Optional host-supplied color-scheme presets. Surfaces additional named
   * `ColorScheme` entries in the Color tab "Scheme..." dropdown alongside
   * `colorCluster.colorSchemes`. The package itself ships zero presets —
   * this is the host's escape hatch for shipping a larger preset library
   * without bloating the panel bundle for every consumer. Defaults to `{}`.
   * See §4.5 for the merge contract.
   */
  colorPresets?: Record<string, ColorScheme>;
  /**
   * Optional dev-API endpoint URL. When the host wires the panel into a
   * project that ships its own design-tokens-apply route, supply the URL
   * here; the Apply button POSTs its diff payload to it. When `undefined`,
   * the Apply button stays disabled with a tooltip — hosts that ship
   * export/import only can omit this field.
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
}

export function configurePanel(config: PanelConfig): void;

/**
 * Lazy preset attachment. Hosts that don't want to ship the preset library
 * inline in the SSR config blob can call this AFTER the panel has been
 * configured to attach the preset map from a deferred dynamic import. Same
 * precedence rules as `PanelConfig.colorPresets` — see §4.4.
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

- **One-shot.** Calling `configurePanel` more than once with different values
  is an error. The panel may either throw or warn-and-ignore, but it MUST
  NOT silently overwrite a previously-configured cluster mid-session.
- **Synchronous.** No I/O, no awaits. The call must be cheap enough to run
  inline at module-init from the Astro frontmatter side.
- **Pure data only.** Every field on `PanelConfig` (and every nested field
  inside `tokens` / `colorCluster`) MUST be JSON-serializable. This is the
  hard precondition for the Astro frontmatter → island prop handoff (§5):
  Astro stringifies props, so functions / class instances do not survive.
- **No default `PanelConfig` baked into the package.** Hosts MUST configure
  the panel explicitly via `<DesignTokenPanelHost config={...} />` or a
  direct `configurePanel({...})` call. The package ships zero baked-in
  identifiers — every storage prefix, namespace, palette template, and
  manifest entry comes from the host.

---

## 2. Storage-key derivation

`storagePrefix` is the only knob that controls every persisted key. The panel
derives the keys at runtime from this single base.

| Logical key | Derivation                  | Owner                | Purpose                                                                                                                                                      |
| ----------- | --------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `state-v2`  | `${storagePrefix}-state-v2` | tweak-state          | Unified envelope: color + spacing + typography + size + panelPosition + optional secondary cluster slice.                                                    |
| `state-v1`  | `${storagePrefix}-state`    | tweak-state (legacy) | Pre-v2 flat-state format (Color-only). Migrated into `state-v2` on first load, then deleted.                                                                 |
| `open`      | `${storagePrefix}-open`     | panel                | Mirror of the panel's `open` boolean state (so the next mount opens directly into the user's last state without a post-render toggle dispatch).              |
| `position`  | `${storagePrefix}-position` | panel                | Drag position (`{ top, right }`) so the panel reappears where the user left it.                                                                              |
| `visible`   | `${storagePrefix}:visible`  | adapter              | Adapter-level visibility-intent flag, owned by the lazy-load gate (§5).                                                                                      |

**Constraint — colon, not dash, for `visible`.** The `visible` key uses a
`:` separator, every other derived key uses `-`. This is a historical artifact
preserved for storage-key continuity: a key rename would silently lose users'
visibility intent on first load. The derivation MUST emit the colon literally;
do not "fix" it during refactors.

**Storage-key derivation is literal.** With `storagePrefix: "myapp-design-token-panel"`,
the derivation produces:

```
myapp-design-token-panel-state-v2
myapp-design-token-panel-state
myapp-design-token-panel-open
myapp-design-token-panel-position
myapp-design-token-panel:visible
```

Unit tests in the package verify these derivations with literal-equality
checks, and the v1 → v2 migration path at first-load is part of the test
matrix.

---

## 3. Token manifest contract

The panel does not know which tokens a host site exposes. The host supplies
its own token manifest, and the panel iterates it to render rows + apply
overrides to `:root`.

### 3.1 Public interfaces

These shapes already exist in `src/tokens/manifest.ts`. The portable contract
freezes them as the public surface:

```ts
export type TokenGroup = string;

export type TokenControl = 'slider' | 'select' | 'text';

export interface TokenDef {
  /** Stable id used as the Record key in persisted state (e.g. `hsp-2xs`). */
  id: string;
  /** CSS custom property written to `:root` (e.g. `--myapp-spacing-hgap-2xs`). */
  cssVar: string;
  /** Display label shown in the panel row. */
  label: string;
  /** Manifest group — tab components use this for section headers. */
  group: TokenGroup;
  /** Default value as a CSS string (`0.125rem`, `12px`, etc.). */
  default: string;
  /** Slider min, in `unit`. Unused when `readonly` or non-slider. */
  min: number;
  /** Slider max, in `unit`. */
  max: number;
  /** Slider step, in `unit`. */
  step: number;
  /** Unit suffix (`rem`, `px`, …). May be empty for unitless / read-only tokens. */
  unit: string;
  /** Read-only tokens are displayed but not editable. */
  readonly?: true;
  /** Which control renders this token. Defaults to `"slider"` when absent. */
  control?: TokenControl;
  /** Select options — only used when `control === "select"`. */
  options?: readonly string[];
  /** Hide behind the per-tab Advanced `<details>` disclosure. */
  advanced?: true;
  /** Opt-in pill toggle (e.g. for `--radius-full` 9999px sentinel). */
  pill?: { value: string; customDefault: string };
}

export interface TokenManifest {
  spacing: readonly TokenDef[];
  typography: readonly TokenDef[];
  size: readonly TokenDef[];
  color: readonly TokenDef[];
  /** Optional spacing-tab group order. Falls back to the package-bundled `GROUP_ORDER`. */
  spacingGroupOrder?: readonly string[];
  /** Optional font-tab primary group order. Falls back to `FONT_GROUP_ORDER`. */
  fontGroupOrder?: readonly string[];
  /** Optional size-tab group order. Falls back to `SIZE_GROUP_ORDER`. */
  sizeGroupOrder?: readonly string[];
  /** Optional human-readable section titles keyed by group id. Falls back to `GROUP_TITLES`. */
  groupTitles?: Readonly<Record<string, string>>;
}
```

**Note on `TokenGroup`.** `TokenGroup` is `string` (not a closed union) so
consumers can coin their own group ids without forking the package types.
The four optional fields above (`spacingGroupOrder`, `fontGroupOrder`,
`sizeGroupOrder`, `groupTitles`) let a host customise how groups within a
tab are ordered and titled. Manifests that omit a field inherit the
package-bundled default ordering for that tab. Consumers coining unknown
group ids SHOULD populate `groupTitles` so the section headers carry
human-readable labels — the tabs fall back to printing the raw group id
otherwise.

### 3.2 Helpers (re-exported from the package root)

These shipped helpers are part of the contract — consumers MAY call them when
authoring their manifest:

| Helper              | Signature                                                                   | Purpose                                                                                                                                    |
| ------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `parseNumericValue` | `(value: string) => number \| null`                                         | Strip the leading numeric portion from a CSS length string (`"1.5rem"` → `1.5`). Returns `null` for unparseable input (e.g. `clamp(...)`). |
| `formatValue`       | `(n: number, unit: string) => string`                                       | Re-format a numeric slider value back into the stored string form (`(1.5, "rem")` → `"1.5rem"`).                                           |
| `buildTokenIndex`   | `(...groups: readonly (readonly TokenDef[])[]) => Record<string, TokenDef>` | Convenience: build a flat lookup keyed by `TokenDef.id`.                                                                                   |

### 3.3 Consumer responsibility

The host project provides the four manifest arrays:

- `SPACING_TOKENS` — passed as `tokens.spacing`.
- `FONT_TOKENS` — passed as `tokens.typography`. (Note the slice / array name
  divergence: the persist envelope's slice is `typography`; the array constant
  uses the upstream `FONT_TOKENS` name. The panel reads them through
  `panelConfig.tokens.typography`, so consumers can use either name in their
  source — the field on `PanelConfig` is what the contract pins.)
- `SIZE_TOKENS` — passed as `tokens.size`.
- `COLOR_TOKENS` — passed as `tokens.color`. Cluster-driven hosts ship an
  empty array (color is driven by the cluster, not by per-token rows); the
  field is required by the manifest shape so a cluster-less host can
  provide rows here.

The panel package itself ships ZERO baked-in manifest data — the host is
the source of truth. The package's role is consuming whatever the host
hands in.

### 3.4 Apply behaviour

The panel's `applyTokenOverrides(tokens, overrides)` (already present in
`state/tweak-state.ts`) walks each `TokenDef`:

- If `readonly`, skip both directions (display-only).
- If the override map has a non-empty string for `id`, write
  `document.documentElement.style.setProperty(t.cssVar, value)`.
- Otherwise, remove the inline property (so the stylesheet default wins).

The contract requires this read/write target to be `:root`. No shadow DOM, no
scoped overrides — this is intentional, the panel ships a global tweak.

---

## 4. Color cluster contract

The color tab — palette + base roles + semantic table + scheme list — is
parameterised through a `ColorClusterConfig` so a portable host can ship a
different palette size, a different CSS-var family, or a different semantic
vocabulary without touching the panel internals.

### 4.1 `ColorClusterConfig` interface

```ts
export type BaseRoleKey = 'background' | 'foreground' | 'cursor' | 'selectionBg' | 'selectionFg';

export interface ColorClusterConfig {
  /** Stable id — used for debugging / logging only. */
  id: string;
  /**
   * Optional human-visible label rendered in the Color tab section
   * headings. When absent, the tab falls back to `id.toUpperCase()`.
   */
  label?: string;
  /** Expected palette length. Drives init + persisted-state validation. */
  paletteSize: number;
  /**
   * Palette-slot CSS var template. The panel substitutes `{n}` with the
   * palette index at apply time.
   *
   *   paletteCssVarTemplate: '--myapp-p{n}'    →  --myapp-p0, --myapp-p1, ...
   *   paletteCssVarTemplate: '--brand-pa{n}'   →  --brand-pa0, --brand-pa1, ...
   *
   * String form is mandatory because the cluster config must round-trip
   * through Astro frontmatter as a JSON-serialised prop (§5).
   */
  paletteCssVarTemplate: string;
  /**
   * Map of base-role name → CSS custom-property name. A cluster MAY declare
   * a subset (an empty map is legal); only declared roles are written on apply.
   */
  baseRoles: Partial<Record<BaseRoleKey, string>>;
  /** Semantic token name → default palette index. */
  semanticDefaults: Record<string, number>;
  /** Semantic token name → CSS custom-property name. */
  semanticCssNames: Record<string, string>;
  /**
   * Fallback palette indices when a scheme omits a base role. Same partial
   * shape as `baseRoles`. `ColorTweakState` always carries all 5 numeric
   * fields for envelope round-trip, but inert roles emit zero CSS writes.
   */
  baseDefaults: Partial<Record<BaseRoleKey, number>>;
  /** Fallback `shikiTheme` when a scheme lacks one. (Inert when no shiki integration.) */
  defaultShikiTheme: string;
  /**
   * Color-scheme registry. Keyed by display name (`"Default Dark"`, etc.).
   * Each entry mirrors the existing `ColorScheme` shape from
   * `config/color-schemes.ts` (palette: 16-tuple, optional semantic overrides,
   * etc.). The portable contract requires this to be a plain object — no
   * dynamic loaders. Pass `{}` for clusters that don't use schemes.
   */
  colorSchemes: Record<string, ColorScheme>;
  /**
   * Panel-level scheme settings. Carried inside the cluster (rather than as a
   * separate import) so `getActiveSchemeName` / `initColorFromScheme` can
   * read everything from the cluster argument.
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

> **Public alias** — the runtime type that ships in the package source is
> `ColorClusterDataConfig` (in `src/config/`). `ColorClusterConfig` is
> re-exported from the package root as the public-facing alias for this
> same shape:
> `import type { ColorClusterConfig } from '@takazudo/zudo-design-token-panel'`.
> The two names are interchangeable.

`ColorScheme` itself stays the same shape used today (`config/color-schemes.ts`):

```ts
export type ColorRef = number | string;

export interface ColorScheme {
  background: ColorRef;
  foreground: ColorRef;
  cursor: ColorRef;
  selectionBg: ColorRef;
  selectionFg: ColorRef;
  palette: readonly string[]; // length must match cluster.paletteSize
  shikiTheme: string;
  semantic?: Record<string, ColorRef>; // keys must be a subset of cluster.semanticDefaults
}
```

### 4.2 JSON-serializable constraint

**Every field on `ColorClusterConfig` (and on each `ColorScheme` it nests)
MUST be JSON-serializable.** No function fields, no class instances, no
`Symbol` keys, no `undefined` where `null` is meant. This is enforced by Astro
frontmatter → component prop handoff: the host adapter (§5) stringifies the
config into the rendered island and parses it back at runtime. Function
fields silently disappear under that round-trip and would surface as cryptic
runtime errors.

The palette CSS-var name is therefore expressed as a string template, not a
function:

```ts
// wrong (function — silently dropped by JSON.stringify)
// paletteCssVar: (i) => `--myapp-p${i}`,

// right (string template, JSON-serializable)
paletteCssVarTemplate: '--myapp-p{n}',
```

The panel resolves `{n}` to the palette index at every call site that
previously called `paletteCssVar(i)` (palette apply, clear-applied, scheme
diff). The substitution is plain string replacement — no template-engine
features. `{n}` is the only placeholder; literal `{n}` text in an output var
name is not a use case the contract supports.

### 4.3 Multi-cluster support

The package supports a primary cluster and an optional secondary cluster.
`PanelConfig.colorCluster` is the primary cluster (always required).
`PanelConfig.secondaryColorCluster` is the secondary cluster slot —
host-driven, three states:

| `secondaryColorCluster` value | Meaning | Effect |
|---|---|---|
| `undefined` (field omitted) | Secondary section hidden | The Color tab does not render a secondary palette / semantic section. |
| `null` | Explicit opt-out | Same render-side effect as `undefined`; in addition, apply / clear / load skip every secondary code path. The persist envelope's secondary-cluster slice is NOT hydrated. |
| `ColorClusterDataConfig` object | Host-supplied secondary cluster | Same render / apply / clear contract as the primary cluster, scoped to the supplied palette + semantic vocabulary. |

The resolution is performed through the `resolveSecondaryColorCluster()`
helper exported from `config/panel-config.ts`. Call sites (color-tab render,
apply-modal flatten, tweak-state apply / clear / load) MUST read through that
helper rather than the raw field so every code path treats the three states
consistently.

The persist envelope's secondary-cluster slice (the slot name is historical
and remains stable for storage continuity) is the on-disk shape for the
secondary cluster.

### 4.4 Host-supplied scheme presets — `colorPresets`

`PanelConfig.colorPresets` is the optional, host-supplied preset map
surfaced by the Color tab "Scheme..." dropdown. It defaults to `{}` and
the package itself ships zero presets — hosts that want a curated preset
library (Dracula / Solarized / Tokyo Night / etc.) ship it themselves so
consumers do not pay for it by default.

| `colorPresets` value | Meaning | Effect |
|---|---|---|
| `undefined` (field omitted) | Default | Equivalent to `{}` — only `colorCluster.colorSchemes` populates the dropdown. |
| `{}` | Explicit empty | Same as `undefined`. |
| `Record<string, ColorScheme>` | Host-supplied | Each key surfaces as a `<option>` below the cluster's bundled schemes. Sorted alphabetically. |

**Merge order in the dropdown:**

```
<option disabled>Scheme...</option>
... cluster.colorSchemes (insertion order) ...
<hr />
... colorPresets (alphabetical) ...
```

**Key collision** — if a `colorPresets` entry shares a name with one in
`colorCluster.colorSchemes`, the cluster's bundled scheme wins for the
`handleLoadPreset` lookup. The bundled cluster scheme is the cluster
owner's documented default (typically `"Default"` / `"Default Light"` /
`"Default Dark"`) and overrides the optional host preset list. The
dropdown still renders both `<option>` entries — visually deduplicated
display is out of scope for the Color tab and would require a bespoke
`<select>` widget; a duplicate name is the host's signal to rename one of
its own preset keys.

**JSON-serializable** — every `ColorScheme` MUST satisfy the same
JSON-serializable constraint as the cluster (§4.2). The map is read at
render time through `getPanelConfig().colorPresets`, so the standard
Astro frontmatter → island handoff applies.

**Lazy attachment via `setPanelColorPresets()`** — hosts that ship a
large preset library can omit `colorPresets` from the SSR config blob and
call `setPanelColorPresets(presets)` from a client-side dynamic import.
This keeps the preset payload out of the inline
`<script type="application/json">` and lets the bundler emit it as a
separate JS chunk. The trailing call wins on conflict (no throw, unlike
`configurePanel`); a host that pre-calls `setPanelColorPresets` before
`configurePanel` is serviced via a holding slot inside `panel-config.ts`.

### 4.5 Apply behaviour

The contract follows `applyColorState(state, cluster)` from
`state/tweak-state.ts`:

- For each palette slot `i` in `0..cluster.paletteSize`, write
  `cluster.paletteCssVarTemplate.replace('{n}', String(i))` ← `palette[i]`.
- For each `(roleKey, cssName)` in `cluster.baseRoles`, write
  `cssName` ← `palette[state[roleKey]]`. Roles absent from `baseRoles` are
  not written.
- For each `(semanticKey, cssName)` in `cluster.semanticCssNames`, resolve
  `state.semanticMappings[semanticKey] ?? cluster.semanticDefaults[semanticKey]`
  through `resolveMapping` (handles `"bg"` / `"fg"` shorthands) and write
  `cssName` ← resolved hex.
- `clearAppliedStyles(clusters)` removes every property the cluster could
  have set (palette + base roles + semantic). Default wipes both primary and
  any optional secondary cluster.

### 4.6 `applyEndpoint` and `applyRouting` — panel config fields

The Apply modal's button is gated on two `PanelConfig` fields:

| Field | Type | Purpose |
|---|---|---|
| `applyEndpoint` | `string` | URL the Apply button POSTs the flat cssVar diff to. The host's dev-API handler routes the diff to the bin. |
| `applyRouting` | `Record<string, string>` | Map of CSS-var prefix family (without leading `--` and trailing `-`) → repo-relative source-file path. Passed to the bin via `--routing <json>` flag. |

When both are set (and the routing map is non-empty), the Apply button is enabled. When either is missing, the modal still mounts so the user can preview the diff, but the action stays disabled with a tooltip.

**Note:** Routing configuration is documented under §5 Apply pipeline (see §5.4) as the canonical location. The bin and the panel UI both read the same JSON file to eliminate drift hazards.

---

## 5. Apply pipeline

The **bin server** is the reference implementation for the apply contract. When a user clicks "Apply" in the panel UI, it POSTs a flat CSS-var diff to the host's endpoint, which routes the diff to the bin, which atomically rewrites source files.

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

The `tokens` field is mandatory and must be a JSON object with string keys (CSS custom property names, prefixed with `--`) and string values (CSS strings, no validation at the panel level).

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

- `ok: true` marks success.
- `updated[]` per-file results: `file` is repo-relative, `changed[]` lists tokens that were rewritten, `unchanged[]` lists tokens found in the file but not in the diff, `unknown[]` lists tokens in the diff that don't exist in the file's `:root` block.
- `unknownCssVars` and `unchangedCssVars` are flattened across all files for UI feedback.

**Response 400 (bad request)**

```json
{
  "ok": false,
  "error": "<message>",
  "rejected"?: ["--invalid-token"]
}
```

Returned for:
- Malformed JSON: `"Invalid JSON in request body"`
- Body not an object: `"Request body must be a JSON object"`
- Missing `tokens` field or not an object: `"tokens must be a JSON object"`
- Empty tokens map: `"tokens must contain at least one entry"`
- Invalid token names (no `--` prefix, spaces, slashes, etc.): `"..."` with optional `rejected[]` array
- Unsupported CSS-var prefix (no route configured): `"Unsupported cssVar prefix"` with `rejected[]` listing the offending prefixes
- Path escape attempt (`../../etc/passwd`): `"Path not allowed: <relativePath>"`

**Response 403 (Forbidden)**

```json
{
  "ok": false,
  "error": "Origin not allowed"
}
```

No `Access-Control-Allow-Origin` header. The bin rejects cross-origin requests.

**Response 405 (Method not allowed)**

Empty body, `Allow: POST, OPTIONS` header. The endpoint accepts only POST and OPTIONS.

**Response 409 (Conflict)**

```json
{
  "ok": false,
  "error": "No top-level :root { ... } block in <file>"
}
```

The target CSS file has no `:root` block. The bin cannot apply token overrides without one.

**Response 500 (Internal server error)**

```json
{
  "ok": false,
  "error": "<message>",
  "failedFile"?: "<relativePath>",
  "restoreFailures"?: ["<file1>", "<file2>"]
}
```

Returned for:
- File read/parse failure: `"Failed to read or parse source file"`
- Write failure with rollback: `"Failed to write file <file>; previously-written files were restored."` + `failedFile`
- Rollback failure: `"Failed to write file <file>; rollback also failed for N file(s) — disk state is inconsistent. Inspect the listed files manually."` + `failedFile` + `restoreFailures[]`

### 5.2 Reference implementation

The bin server (`src/bin/server.ts`) inside this package is the reference for this contract. It reads `--routing <json>` at startup and exposes a Fetch API handler (`createApplyHandler` from `src/server/create-apply-handler.ts`).

The handler validates every token name, routes by prefix, resolves absolute paths with sandbox checks, computes rewrites in memory, writes atomically, and responds with the exact shapes pinned above. Read the handler source as the spec.

### 5.3 Implementing the contract natively (advanced)

Hosts physically unable to spawn Node.js can implement the apply contract natively. The implementation must:

1. **Validate token names** — reject names without `--` prefix, with spaces, slashes, or special characters.
2. **Sanitize and route** — split each CSS-var prefix, look up the target file in the routing map, reject prefixes not in the map.
3. **Path safety** — resolve each target path to an absolute path, verify it sits within `writeRoot`, reject path-escape attempts.
4. **Read & parse** — load each CSS file, find the `:root { ... }` block (fail 409 if missing), parse the existing variable values.
5. **Compute rewrite** — for each token in the diff, decide which are already present (`unchanged`), which are new (`unknown`), which are being changed (`changed`). Build the updated `:root` block.
6. **Atomic write** — keep the original file content in memory. Write the updated content to a temp file. Atomically rename temp to target. If any write fails, restore every file written so far from the in-memory original.
7. **Respond** — return the exact JSON envelope shapes pinned in §5.1.

The panel package's source code (`src/apply/apply-token-overrides.ts`, `src/server/create-apply-handler.ts`, `src/server/path-safety.ts`) documents the exact algorithm. Native implementations should mirror it.

### 5.4 Routing config — single source of truth

Both the **panel UI** (`PanelConfig.applyRouting`) and the **bin** (`--routing` flag) read the same JSON file. The map is keyed by the CSS-var prefix family (without leading `--` and trailing `-`); the value is a repo-relative path to the source file the bin rewrites. See README §3.2 for invocation patterns.

---

## 6. Astro export contract

The package exposes a second entry point, `./astro`, for Astro projects. It
ships a single component:

```astro
---
// astro frontmatter
import { DesignTokenPanelHost } from '@takazudo/zudo-design-token-panel/astro';
import { panelConfig } from '~/lib/design-token-panel-config';
---

<DesignTokenPanelHost config={panelConfig} />
```

### 6.1 Component prop

The component accepts the full `PanelConfig` from §1 as its `config` prop.
Astro frontmatter passes the value at SSR time; the adapter serialises it into
the rendered island (typically as a `JSON.stringify(config)` payload on a
`data-*` attribute or inline `<script type="application/json">`) and reads it
back at runtime to call `configurePanel(config)` before importing the panel
module.

This is the reason the JSON-serializable constraint in §4.2 is non-negotiable:
Astro frontmatter cannot send a function across the SSR boundary.

### 6.2 Lazy-load gate

The host script's eager-import gate is the package's mechanism for
keeping the panel out of the initial bundle while still re-applying
persisted overrides on hard reload:

```ts
if (wasVisible() || hasPersistedOverrides()) {
  void loadPanelModule();
}
```

- `wasVisible()` reads `${storagePrefix}:visible` (the colon-form key from
  §2). Returns `true` when the user had the panel open at last unload.
- `hasPersistedOverrides()` probes `${storagePrefix}-state-v2`. Returns
  `true` when the user has any saved tweaks — overrides MUST be re-applied
  to `:root` even when the panel itself stays hidden, otherwise hard-nav
  produces a FOUT.

The gate's contract:

- When neither probe is true, the adapter stays out of the initial bundle.
- When either probe is true, the adapter is dynamically imported. Its
  module-init side-effects re-apply persisted overrides synchronously and,
  if `wasVisible()` was true, re-mount the Preact shell.
- The console API (`window[consoleNamespace].showDesignPanel`,
  `hideDesignPanel`, `toggleDesignPanel`) is installed eagerly — calling
  them is what triggers `loadPanelModule()` for cold-start users.

The gate's two probes use the storage keys derived from `panelConfig.storagePrefix`,
not hardcoded literals. The host script (which ships from the package's
`./astro` sub-export) reads `panelConfig.storagePrefix` and derives both
probe keys from it.

### 6.3 Astro view-transition lifecycle

The adapter's existing `astro:before-swap` and `astro:page-load` listeners
stay. They are Astro-specific and only register when `document` is available.
The adapter MUST continue to:

- `astro:before-swap` → unmount the Preact tree (`render(null, root)`),
  remove the host node, and snapshot/restore visibility intent so the
  remount decision survives the body swap.
- `astro:page-load` → re-apply persisted overrides + re-materialise the
  shell when either gate probe is true.

A non-Astro host (Vite-only) gets a degraded but functional adapter: the
soft-nav lifecycle hooks are no-ops, but the storage / mount / apply paths
all work. The `./astro` sub-export is the only place that imports anything
Astro-flavoured.

### 6.4 Console API

`configurePanel.consoleNamespace` controls the global object the package
installs. Today's installation:

```ts
window[consoleNamespace].showDesignPanel = () => Promise<void>;
window[consoleNamespace].hideDesignPanel = () => Promise<void>;
window[consoleNamespace].toggleDesignPanel = () => Promise<void>;
```

Each helper lazy-imports the adapter module and forwards to its
corresponding non-async public function (`showDesignTokenPanel`,
`hideDesignTokenPanel`, `toggleDesignPanel`). The host script preserves
co-existing namespace fields (e.g. `window.myapp.someOtherDevTool` from a
sibling package); installation MUST merge into the existing namespace,
not overwrite it.

---

## 7. CSS contract

### 7.1 Panel-private namespace

The panel ships its own bundled CSS (no Tailwind dependency in the
consumer). The bundled stylesheets MUST declare every panel-chrome
variable under a panel-private namespace, scoped to the panel shell +
modal class prefix:

```css
:where(.tokenpanel-shell, [data-design-token-panel-modal]) {
  --tokentweak-pad-md: …;
  --tokentweak-gap-sm: …;
  --tokentweak-text-body: …;
  --radius-tokentweak: …;
  /* …every panel-chrome value lives here */
}
```

- **Naming:** `--tokentweak-*` is the only allowed prefix for panel-private
  vars. No consumer-namespaced identifiers may appear in the panel chrome.
  `panel.css` MUST read only `--tokentweak-*` — it MUST NOT read host
  vars like `--color-*` or `--font-mono` directly. `panel-tokens.css` is
  the single indirection point where host vars are consumed (see §7.4).
- **Files:** `panel.css` (chrome layout / typography / controls) +
  `panel-tokens.css` (the `--tokentweak-*` declarations). Both ship from
  the package, combined into a single `dist/design-token-panel.css` by the
  Vite library build. Vite library mode strips the source `import './styles/panel.css'`
  from the emitted JS, so the consumer MUST import the combined stylesheet
  exactly once on their static module graph (typically next to where they
  mount `<DesignTokenPanelHost>`):

  ```ts
  import '@takazudo/zudo-design-token-panel/styles';
  ```

  The `./styles` sub-export (alias `./styles.css`) resolves to
  `dist/design-token-panel.css`. Skipping the import leaves the panel JS
  fully functional but every chrome rule missing — `.tokenpanel-shell`
  renders with the host page's transparent background and default font, so
  the panel appears invisible. See README §3.4 / §11 for the full rationale.
- **No Tailwind dependency.** The package MUST build and run without
  Tailwind in the consumer. The panel JSX uses hand-authored CSS classes
  backed by `--tokentweak-*` vars exclusively.

### 7.2 Consumer's editable tokens

The tokens the panel writes to (the `cssVar` field on each `TokenDef`,
plus the cluster's `paletteCssVarTemplate`, base-role names, and
semantic-CSS names) are entirely consumer-controlled. Hosts pick names
like `--myapp-spacing-hgap-md`, `--myapp-p0`, `--myapp-semantic-bg`
themselves; the panel just writes them through `setProperty` on `:root`.

The package contract is therefore:

- **Read:** the panel never reads consumer CSS variables (it carries its
  own defaults via `TokenDef.default`).
- **Write:** the panel only writes the consumer-supplied `cssVar` strings,
  one per overridden token, plus the cluster's palette / base / semantic
  vars on apply.

### 7.3 Modal class prefix + `data-design-token-panel-modal`

`configurePanel.modalClassPrefix` controls the BEM root for every modal
the panel owns (export, import, apply). The host picks any string and
the panel emits classes like `${modalClassPrefix}__overlay`,
`${modalClassPrefix}__panel`, `${modalClassPrefix}__header`, etc.

**The bundled CSS keys on the data attribute, NOT on the class prefix.**
Every modal `<dialog>` element emits `data-design-token-panel-modal=""`
(with `data-design-token-panel-modal-variant` set to `"apply"` /
`"export"` / `"import"`). `panel.css` anchors all modal chrome rules on
`[data-design-token-panel-modal]` and matches sub-elements via
`[class*='__title']`-style attribute selectors. This means a host that
customises `modalClassPrefix` still inherits the bundled chrome —
selecting on the literal class prefix would leave any non-default host
with unstyled modals.

The class prefix remains useful as a higher-specificity hook for hosts
that want to layer custom rules on top of the bundled chrome.

### 7.4 Host-CSS-var indirection ladder for chrome colors

The panel-chrome color tokens are declared in `panel-tokens.css` as a
`var(--host, fallback)` ladder so a host that does not define
`--color-*` / `--font-mono` still gets a sane paint:

```css
:where(.tokenpanel-shell, [data-design-token-panel-modal]) {
  --tokentweak-color-fg: var(--color-fg, oklch(87% 0.01 60));
  --tokentweak-color-bg: var(--color-bg, oklch(18% 0.01 50));
  --tokentweak-color-muted: var(--color-muted, oklch(70% 0.01 60));
  --tokentweak-color-surface: var(--color-surface, oklch(22% 0.01 50));
  --tokentweak-color-accent: var(--color-accent, oklch(65% 0.2 45));
  --tokentweak-color-accent-hover: var(--color-accent-hover, oklch(55% 0.18 45));
  --tokentweak-color-code-bg: var(--color-code-bg, oklch(17% 0.005 50));
  --tokentweak-color-code-fg: var(--color-code-fg, oklch(87% 0.01 60));
  --tokentweak-color-success: var(--color-success, oklch(65% 0.19 145));
  --tokentweak-color-danger: var(--color-danger, oklch(60% 0.2 10));
  --tokentweak-color-warning: var(--color-warning, oklch(75% 0.17 75));
  --tokentweak-font-mono: var(--font-mono, Menlo, Monaco, Consolas, …);
}
```

- **Public surface:** `--tokentweak-color-fg`, `--tokentweak-color-bg`,
  `--tokentweak-color-muted`, `--tokentweak-color-surface`,
  `--tokentweak-color-accent`, `--tokentweak-color-accent-hover`,
  `--tokentweak-color-code-bg`, `--tokentweak-color-code-fg`,
  `--tokentweak-color-success`, `--tokentweak-color-danger`,
  `--tokentweak-color-warning`, `--tokentweak-font-mono`. These are
  panel-private variables that hosts MAY override on the same scope to
  retheme the panel chrome without touching their own `--color-*` theme.
- **Override layers:** a host can override at the `--color-*` level
  (cascades into the panel via the fallback ladder) or at the
  `--tokentweak-color-*` level (panel-only, bypasses the host theme).
- **Fallback values** are picked to be a sensible neutral dark theme so
  the panel paints readably without any host theme declared.
- **Invariant:** `panel.css` MUST NOT read `--color-*` or `--font-mono`
  directly. The only legal site for those reads is the indirection
  ladder in `panel-tokens.css`. Acceptance check:

  ```bash
  grep -n 'var(--color-' src/styles/panel.css   # → 0
  grep -n 'var(--font-mono' src/styles/panel.css # → 0
  ```

### 7.5 Host-adapter side-effect import (paired-unit obligation)

Alongside the `./styles` import (§6.1), the consumer MUST also own a side-effect import for the host-adapter, paired with `<DesignTokenPanelHost>`. The `<DesignTokenPanelHost>` component AND a sibling `<script>` block loading `@takazudo/zudo-design-token-panel/astro/host-adapter` are a single unit — both lines are required, always together.

Required wiring shape (mirrors README §3.2):

```astro
<DesignTokenPanelHost config={myPanelConfig} />

<script>
  void import('@takazudo/zudo-design-token-panel/astro/host-adapter');
</script>
```

- **Why a dynamic `void import('...')` rather than a top-level `import '...';`?** Both forms work — the package's `package.json` lists `dist/astro/host-adapter.js` in `sideEffects` so Rollup preserves consumer-side imports of the host-adapter regardless of whether the result is used. The dynamic form is the recommended canonical wiring because it loads the host-adapter chunk off the critical page-load path (mirrors the existing color-presets lazy-loader pattern) and is robust to future packaging changes that could miss-configure `sideEffects`.
- **Why not the `./styles`-style "single import per page" pattern?** Browser caching makes the duplicated `import()` cheap (one network fetch per session), and the wrapper component is the single authoritative mount point so duplicating the import there is a non-issue.
- **Skipping this import** leaves the JSON config payload from `<DesignTokenPanelHost>` on the page with no JS to read it, so calling `window.<consoleNamespace>.showDesignPanel()` throws `ReferenceError`. Symptom in deployed builds: silent failure, no panel chrome ever paints.

The `./astro/host-adapter` sub-export points at the built `dist/astro/host-adapter.js` file plus its `.d.ts` types. Acceptance check (vitest):

```bash
pnpm --filter @takazudo/zudo-design-token-panel test -- package-exports
```

This test pins the exports-map shape against accidental edits — see `src/__tests__/package-exports.test.ts`.

---

## 8. Storage-key continuity & migration paths

### 8.1 No default `PanelConfig`

The package ships **zero** baked-in identifiers — no default storage prefix,
no default console namespace, no default palette template, no default token
manifest. The host MUST configure the panel explicitly via
`<DesignTokenPanelHost config={...} />` or a direct `configurePanel({...})`
call. A package import without an explicit configure-call surfaces a clear
runtime error that names the missing field.

### 8.2 Storage-key derivation is literal

For any host's chosen `storagePrefix`, the derivation produces
deterministic, literal-equal storage keys (see §2). Unit tests pin the
five derived keys to literal strings so a future refactor cannot silently
break the v1 → v2 migration path.

For example, with `storagePrefix: 'myapp-design-token-panel'`:

```
myapp-design-token-panel-state-v2
myapp-design-token-panel-state
myapp-design-token-panel-open
myapp-design-token-panel-position
myapp-design-token-panel:visible
```

### 8.3 v1 → v2 in-place migration

The v1 → v2 migration in `loadPersistedState` (drop the legacy flat-state
key, re-write the unified envelope) is performed in-place per
`storagePrefix`. A user who last opened the panel before v2 landed gets
their old color tweaks lifted into the new envelope on first load:

- v1 read key: `${storagePrefix}-state`
- v2 write key: `${storagePrefix}-state-v2`

After the rewrite, the v1 key is deleted.

### 8.4 Typography-id rename map

A hard-coded typography-id rename map (`text-caption` → `text-xs`, etc.,
plus a small set of dropped legacy ids) lives inside `loadPersistedState`.
It applies regardless of `storagePrefix`. Hosts whose token manifest does
not use those legacy ids see no behaviour change — the map only triggers
when matching keys appear in the persisted payload.

---

## 9. Out-of-scope (deferred)

Items this contract deliberately does NOT pin down:

- **Persist envelope shape** (`TweakState`'s `color` / `spacing` /
  `typography` / `size` / `panelPosition` / secondary-cluster slices) —
  frozen at the current shape so existing user state round-trips
  without migration.
- **Schema id versioning.** `schemaId` is a configure-time string; bumping
  it is the host's responsibility and is out of scope for this contract.
- **Shadow-DOM scoping.** The panel writes to `:root` only. Per-component
  scoping is a future feature, not part of this contract.
- **Theme-API surface.** The panel does not expose a programmatic API for
  reading the current overrides outside the persist envelope. Hosts that
  need that today should `JSON.parse(localStorage.getItem(state-v2-key))`.

---

## Appendix A — section index

Cross-reference table — what each section pins down.

| Topic                                                                              | Section     |
| ---------------------------------------------------------------------------------- | ----------- |
| `configurePanel({...})` signature and lifecycle                                    | §1          |
| Storage-key derivation                                                             | §2, §8      |
| `TokenManifest` / `TokenDef` / `TokenGroup` / `TokenControl` and helpers           | §3          |
| `ColorClusterConfig` shape and `paletteCssVarTemplate` constraint                  | §4.1, §4.2  |
| Multi-cluster (primary + secondary) resolution                                     | §4.3        |
| `colorPresets` and `setPanelColorPresets()` lazy attachment                        | §4.4        |
| Apply pipeline request / response envelopes                                        | §5.1        |
| Reference-implementation algorithm + native-implementation guidance                | §5.2, §5.3  |
| Routing config single-source                                                       | §5.4        |
| Astro `<DesignTokenPanelHost>` prop, lazy-load gate, console API                   | §6          |
| `--tokentweak-*` namespace and Tailwind-free CSS contract                          | §7.1        |
| Modal class prefix and `data-design-token-panel-modal` selector contract           | §7.3        |
| Host-CSS-var indirection ladder for chrome colors                                  | §7.4        |
| Host-adapter side-effect import (paired-unit obligation)                           | §7.5        |
| v1 → v2 storage migration and typography-id rename map                             | §8.3, §8.4  |
| Out-of-scope / deferred concerns                                                   | §9          |
