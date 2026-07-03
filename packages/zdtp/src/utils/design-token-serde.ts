/**
 * Design-token SerDe — unified JSON export / import for the design-token panel.
 *
 * Supersedes the legacy flat-cssVar-map v1 serde. The JSON format is a single
 * document covering all token categories (color, spacing, typography/font, size)
 * so an AI assistant can consume or emit a whole design-token tweak in one
 * round-trip.
 *
 * ## Schema versioning
 *
 * | `$schema` value            | Status   | Structure                                |
 * |----------------------------|----------|------------------------------------------|
 * | `zudo-design-tokens/v1`    | Legacy   | Flat top-level `color`/`spacing`/`typography`/`size` keys |
 * | `zudo-design-tokens/v2`    | Current  | `tabs` wrapper keyed by tab id; cssVar-keyed leaves |
 *
 * `serialize()` always emits v2. `deserialize()` accepts both v1 and v2 and
 * normalises to an internal `TweakState` regardless of which schema was in the
 * payload. Hosts that export v1 docs (custom `schemaId`) get a `schema-mismatch`
 * error on import unless they have opted into the dual-accept path (see below).
 *
 * ## v2 format
 *
 * ```jsonc
 * {
 *   "$schema": "zudo-design-tokens/v2",
 *   "exportedAt": "...",
 *   "tabs": {
 *     "spacing": {
 *       "raw": { "--zfb-spacing-md": "1.25rem" }
 *     },
 *     "font": {
 *       "raw":      { "--zfb-scale-base": "1rem" },
 *       "semantic": { "--zfb-text-base": "var(--zfb-scale-base)" }
 *     },
 *     "color": {
 *       "palette":  { "--zfb-palette-1": "#2d6cdf" },
 *       "semantic": { "--zfb-color-primary": 1 }   // palette-index integer
 *     }
 *   }
 * }
 * ```
 *
 * Host-coined GENERIC tabs (any configured tab whose id is not one of the
 * dedicated slices `color` / `color-secondary` / `spacing` / `font` / `size`)
 * round-trip the same way as spacing/size: their overrides live in
 * `state.tabs[id]` (the v3 envelope) and serialize under `tabs[id].raw`,
 * cssVar-keyed (issue #363). The apply path (`applyFullState`) already consumes
 * `state.tabs`; serialize + deserialize make Export/Load symmetric with it.
 *
 * Key decisions (issue #74):
 * - cssVar-keyed leaves for portability across host id renames.
 * - Tier-2 ref values are stored as the literal `var(--tier1-cssvar)` CSS
 *   string (no discriminated union — keeps the format flat and hand-editable).
 * - Color `semantic` values are palette-index integers (preserved from v1 so
 *   the swatch UI can render the resolved color).
 *
 * ## Diff-only by default
 *
 * `serialize()` only emits tokens the user has actually changed relative to the
 * provided `colorDefaults` (for the color block) and the manifest defaults (for
 * spacing / typography / size). Pass `includeDefaults: true` to dump the full
 * state instead. A tab key is omitted entirely when nothing in it differs.
 *
 * ## cssVar keys
 *
 * Spacing / typography / size overrides use CSS variable names
 * (`"--zd-spacing-hgap-md"`) — the external schema — rather than the internal
 * token id (`"hsp-md"`). This keeps the file human-readable and agnostic of our
 * internal manifest. `deserialize()` maps them back; unknown CSS vars are
 * reported via `unknownTokens` so the UI can surface them.
 *
 * Read-only manifest tokens are skipped in both directions.
 */

import type { ColorTweakState, TabOverrides, TokenOverrides, TweakState } from '../state/tweak-state';
import { getActivePrimaryCluster } from '../state/tweak-state';
import { getPanelConfig, type PanelConfig } from '../config/panel-config';
import { resolvePaletteCssVar } from '../config/cluster-config';
import type { TierItem } from '../tokens/tier-model';

/** Minimal token-like interface extracted from TierItem for serde lookups. */
type SerdeItem = Pick<TierItem, 'id' | 'cssVar' | 'default' | 'readonly'>;

/**
 * Collect all items (across all tiers) from the tab identified by `tabId` in
 * the supplied PanelConfig. Returns an empty array when the tab is not found.
 *
 * Used by serialize / deserialize to iterate the known items for a tab so
 * cssVar ↔ id mapping stays consistent with what the UI renders.
 *
 * `cfg` defaults to the active (most-recently-configured) instance so the
 * single-default path and any non-panel caller stay byte-identical. The panel
 * threads its OWN mounted instance config (multi-instance, #361) so a
 * non-default panel's export/import iterates ITS manifest, not the default's.
 */
function getTabItems(tabId: string, cfg: PanelConfig = getPanelConfig()): readonly SerdeItem[] {
  const tab = cfg.tabs.find((t) => t.id === tabId);
  if (!tab) return [];
  const items: SerdeItem[] = [];
  for (const tier of tab.tiers) {
    for (const item of tier.items) {
      items.push(item);
    }
  }
  return items;
}

/**
 * Tab ids handled by a dedicated serde slice — the four reserved external tab
 * ids plus `color-secondary` (carried by `state.secondary`, not `state.tabs`).
 * Everything else configured in `cfg.tabs` is a host-coined GENERIC tab whose
 * overrides live in `state.tabs[id]` and round-trip under `tabs[id].raw`.
 */
const RESERVED_TAB_IDS: ReadonlySet<string> = new Set([
  'color',
  'color-secondary',
  'spacing',
  'font',
  'size',
]);

/**
 * Flatten a tier-nested `TabOverrides` (`tierId → itemId → value`) into a flat
 * `TokenOverrides` (`itemId → value`) so it can be fed to `serializeOverridesV2`,
 * which keys diff/emit by item id. Item ids are unique across a tab's tiers
 * (enforced by panel-config validation), so the flatten is lossless; any stale
 * or readonly item id that lingers in the persisted map is filtered out later by
 * `serializeOverridesV2` (it only walks the manifest items).
 */
function flattenTabOverrides(tabOverrides: TabOverrides | undefined): TokenOverrides {
  const flat: TokenOverrides = {};
  if (!tabOverrides) return flat;
  for (const tierMap of Object.values(tabOverrides)) {
    for (const [itemId, value] of Object.entries(tierMap)) {
      flat[itemId] = value;
    }
  }
  return flat;
}

/**
 * Build a `cssVar → { tierId, itemId }` reverse lookup for a tab (readonly items
 * skipped). Used by the generic-tab deserialize pass to rebuild the tier-nested
 * `TabOverrides` shape — `getTabItems` flattens away the tier id, so it can't be
 * used here. Returns an empty map when the tab is not configured.
 */
function buildTabVarLookup(
  tabId: string,
  cfg: PanelConfig,
): Map<string, { tierId: string; itemId: string }> {
  const map = new Map<string, { tierId: string; itemId: string }>();
  const tab = cfg.tabs.find((t) => t.id === tabId);
  if (!tab) return map;
  for (const tier of tab.tiers) {
    for (const item of tier.items) {
      if (item.readonly) continue;
      map.set(item.cssVar, { tierId: tier.id, itemId: item.id });
    }
  }
  return map;
}

/** The canonical v2 schema identifier emitted by serialize(). */
export const SCHEMA_V2 = 'zudo-design-tokens/v2';

/** The legacy v1 schema identifier accepted by deserialize() for back-compat. */
export const SCHEMA_V1 = 'zudo-design-tokens/v1';

/** Local alias for an empty override map — inlined (rather than imported from
 *  `../state/tweak-state`) to avoid pulling the tweak-state runtime module into
 *  the serde's dependency chain. The serde itself only needs a type-only view
 *  of the state envelope; keeping this function local lets the serde's test
 *  suite exercise it in isolation. */
function emptyOverrides(): TokenOverrides {
  return {};
}

/**
 * Read the design-token schema id at call time.
 *
 * Returns the host-configured schema id from `cfg.schemaId`. Used as the
 * `$schema` value in legacy v1 exports (for hosts that have not upgraded their
 * config to v2) and as the expected-schema label the Import modal surfaces. The
 * canonical v2 serialize path always emits `SCHEMA_V2`.
 *
 * `cfg` defaults to the active (most-recently-configured) instance so the
 * single-default path stays byte-identical. The Import modal threads its OWN
 * mounted instance config (multi-instance, #361) so a non-default panel
 * validates against ITS schema id, not the default's.
 */
export function getDesignTokenSchema(cfg: PanelConfig = getPanelConfig()): string {
  return cfg.schemaId;
}

// ---------------------------------------------------------------------------
// v1 external JSON types (legacy, accepted on import only)
// ---------------------------------------------------------------------------

/** External JSON value for a base-color / semantic-color entry (v1). */
type ColorSlotValue = number | 'bg' | 'fg';

export interface DesignTokenJsonColorBase {
  bg?: number;
  fg?: number;
  cursor?: number;
  /** Dashed keys mirror the external docs; they are quoted in source. */
  'sel-bg'?: number;
  'sel-fg'?: number;
}

export interface DesignTokenJsonColor {
  palette?: string[];
  base?: DesignTokenJsonColorBase;
  /** Palette-index (or "bg"/"fg") mappings, same keys as `SEMANTIC_DEFAULTS`. */
  semantic?: Record<string, ColorSlotValue>;
  shikiTheme?: string;
}

/** External token map keyed by CSS var name. */
export type DesignTokenJsonOverrides = Record<string, string>;

/** Legacy v1 external JSON document shape. */
export interface DesignTokenJson {
  $schema: string;
  exportedAt: string;
  color?: DesignTokenJsonColor;
  spacing?: DesignTokenJsonOverrides;
  typography?: DesignTokenJsonOverrides;
  size?: DesignTokenJsonOverrides;
}

// ---------------------------------------------------------------------------
// v2 external JSON types (current output format)
// ---------------------------------------------------------------------------

/**
 * A single tier's cssVar-keyed overrides.
 *
 * For token tiers (spacing/font/size raw): values are CSS length/value strings.
 * For reference tiers (font semantic, etc.): values are `var(--tier1-cssvar)` strings.
 * For color palette: values are color strings — hex, or `oklch(...)` when the
 * palette tier declares `type.format: 'oklch'`.
 * For color semantic: values are palette-index integers.
 */
export type V2TierMap = Record<string, string | number>;

/**
 * Per-tab overrides in v2 format. Keyed nominally by tier id — but only the
 * `color` tab uses real tier ids (`palette` / `semantic`). Every other tab
 * (spacing / font / size AND host-coined generic tabs) uses the single synthetic
 * external key `raw` regardless of its internal tier ids; the cssVar leaves under
 * `raw` carry the identity, so the external JSON never depends on a tab's
 * internal tier structure.
 */
export type V2TabEntry = Record<string, V2TierMap>;

/** v2 external JSON document shape. */
export interface DesignTokenJsonV2 {
  $schema: string;
  exportedAt: string;
  tabs?: Record<string, V2TabEntry>;
}

// ---------------------------------------------------------------------------
// Shared types (SerializeOptions, DeserializeResult, errors)
// ---------------------------------------------------------------------------

export interface SerializeOptions {
  /** When true, dump full state (all palette entries, all token manifest
   *  defaults merged in). Default: diff-only. */
  includeDefaults?: boolean;
  /** Color baseline to diff against — typically the current scheme's initial
   *  state. Required for meaningful color-diff output; callers that don't have
   *  it available (e.g. tests without DOM) can omit it and we'll treat the
   *  whole color block as changed. */
  colorDefaults?: ColorTweakState;
  /** Override the `exportedAt` stamp (test-only). */
  now?: () => Date;
}

export interface DeserializeResult {
  /** The reconstructed tweak state, with unknown-token values dropped. */
  state: TweakState;
  /** CSS var names present in the payload that don't match any known token. */
  unknownTokens: string[];
  /** Human-readable errors that did not prevent a state from being produced
   *  (e.g. "semantic mapping dropped because value isn't a number"). */
  warnings: string[];
}

export interface DeserializeOptions {
  /** Color baseline used to fill in fields absent from the payload (diff-only
   *  exports are missing most fields by design). Typically the current
   *  scheme's initial state. */
  colorDefaults?: ColorTweakState;
}

/**
 * Thrown when the payload is not a v1 or v2 schema object. The error `.reason`
 * helps the UI render a precise inline message.
 *
 * Note: `schema-mismatch` is thrown only when the schema is present but does
 * not match either the v1 or v2 schema. v1 schemas are silently accepted and
 * lifted to v2 internally.
 */
export class DesignTokenSchemaError extends Error {
  readonly reason: 'not-object' | 'schema-missing' | 'schema-mismatch';
  readonly actualSchema?: unknown;
  constructor(
    reason: 'not-object' | 'schema-missing' | 'schema-mismatch',
    message: string,
    actualSchema?: unknown,
  ) {
    super(message);
    this.name = 'DesignTokenSchemaError';
    this.reason = reason;
    this.actualSchema = actualSchema;
    // Preserve `instanceof` across the Error prototype boundary in ES5/ES2022
    // mixed-output bundlers.
    Object.setPrototypeOf(this, DesignTokenSchemaError.prototype);
  }
}

// ---------------------------------------------------------------------------
// Serialize (v2 output)
// ---------------------------------------------------------------------------

/**
 * Produce the external JSON document (v2 format) for a given tweak state.
 *
 * By default this is diff-only against `opts.colorDefaults` + manifest
 * defaults; set `opts.includeDefaults = true` to dump everything.
 *
 * The output `$schema` is always `SCHEMA_V2` ("zudo-design-tokens/v2").
 *
 * `cfg` defaults to the active (most-recently-configured) instance so the
 * single-default path stays byte-identical. The Export / Apply modals thread
 * their OWN mounted instance config (multi-instance, #361) so a non-default
 * panel's export JSON / revert blob is built from ITS tab manifest + color
 * cluster, not the default instance's.
 */
export function serialize(
  state: TweakState,
  opts: SerializeOptions = {},
  cfg: PanelConfig = getPanelConfig(),
): DesignTokenJsonV2 {
  const now = opts.now ? opts.now() : new Date();
  const out: DesignTokenJsonV2 = {
    $schema: SCHEMA_V2,
    exportedAt: now.toISOString(),
  };

  const tabs: Record<string, V2TabEntry> = {};

  // Color tab — keyed under "color".
  const colorTab = serializeColorV2(state.color, opts, cfg);
  if (colorTab) tabs['color'] = colorTab;

  // Read items from tabs[] so a host-supplied config drives the diff pass.
  // The internal state slice is named `typography`; the external tab id is
  // `font` to match the external spec (issue #74). `deserialize()` maps back.
  const spacingTab = serializeOverridesV2(getTabItems('spacing', cfg), state.spacing, opts);
  if (spacingTab) tabs['spacing'] = spacingTab;

  const fontTab = serializeOverridesV2(getTabItems('font', cfg), state.typography, opts);
  if (fontTab) tabs['font'] = fontTab;

  const sizeTab = serializeOverridesV2(getTabItems('size', cfg), state.size, opts);
  if (sizeTab) tabs['size'] = sizeTab;

  // Generic (host-coined, custom-id) tabs — any configured tab that isn't one of
  // the dedicated slices above. Their overrides live in `state.tabs[id]` (the v3
  // envelope) and are emitted under `tabs[id].raw`, cssVar-keyed, exactly like
  // spacing/size. Driven by `cfg.tabs` so this is symmetric with the deserialize
  // pass and with the apply path (`applyFullState`), which already consumes
  // `state.tabs`. The stored override value is written verbatim — no `var()`
  // resolution here (that belongs to the apply/build path, not serde).
  for (const tab of cfg.tabs) {
    if (RESERVED_TAB_IDS.has(tab.id)) continue;
    const flat = flattenTabOverrides(state.tabs?.[tab.id]);
    const genericTab = serializeOverridesV2(getTabItems(tab.id, cfg), flat, opts);
    if (genericTab) tabs[tab.id] = genericTab;
  }

  if (Object.keys(tabs).length > 0) {
    out.tabs = tabs;
  }

  return out;
}

/**
 * Serialize a `ColorTweakState` into the v2 `color` tab entry.
 *
 * `palette` tier: cssVar-keyed map from `resolvePaletteCssVar(cluster, i)` to
 * the hex color string at that index. Only changed slots are emitted in
 * diff-only mode.
 *
 * `semantic` tier: cssVar-keyed map from `semanticCssNames[key]` to the
 * palette-index integer. Only changed entries in diff-only mode.
 *
 * The legacy `base` / `shikiTheme` fields are NOT emitted in v2; they were
 * panel-internal and not needed by AI consumers. They survive through the
 * internal `TweakState` persist envelope and are round-tripped through storage,
 * but are dropped from the external export to keep the format minimal.
 */
function serializeColorV2(
  color: ColorTweakState,
  opts: SerializeOptions,
  cfg: PanelConfig,
): V2TabEntry | undefined {
  const baseline = opts.colorDefaults;
  const full = opts.includeDefaults === true;
  const cluster = getActivePrimaryCluster(cfg);

  const out: V2TabEntry = {};
  let wrote = false;

  // Palette tier — cssVar-keyed.
  const palette: Record<string, string> = {};
  let palettWrote = false;
  for (let i = 0; i < color.palette.length; i++) {
    const baselineColor = baseline?.palette[i];
    if (full || baselineColor === undefined || color.palette[i] !== baselineColor) {
      palette[resolvePaletteCssVar(cluster, i)] = color.palette[i];
      palettWrote = true;
    }
  }
  if (palettWrote) {
    out['palette'] = palette;
    wrote = true;
  }

  // Semantic tier — cssVar-keyed palette-index integers.
  // 'bg' and 'fg' are legacy alias values admitted by v1 deserialize; resolve
  // them to their concrete palette index (mirroring resolveMappingIndex in
  // build-apply-overrides.ts) so they survive round-trips through the v2 format,
  // which only admits numbers on deserialize (F29 fix).
  const semantic: Record<string, number> = {};
  let semanticWrote = false;
  for (const [key, cssName] of Object.entries(cluster.semanticCssNames)) {
    const cur = color.semanticMappings[key];
    if (cur === undefined) continue;
    const resolvedCur: number =
      typeof cur === 'number' ? cur : cur === 'bg' ? color.background : color.foreground;
    const baselineVal = baseline?.semanticMappings[key];
    const resolvedBaseline: number | undefined =
      baselineVal === undefined
        ? undefined
        : typeof baselineVal === 'number'
          ? baselineVal
          : baselineVal === 'bg'
            ? (baseline?.background ?? 0)
            : (baseline?.foreground ?? 1);
    if (full || resolvedBaseline === undefined || resolvedCur !== resolvedBaseline) {
      semantic[cssName] = resolvedCur;
      semanticWrote = true;
    }
  }
  if (semanticWrote) {
    out['semantic'] = semantic;
    wrote = true;
  }

  return wrote ? out : undefined;
}

/**
 * Serialize a flat `TokenOverrides` map (keyed by item id) into the
 * v2 `raw` tier entry (keyed by CSS var name).
 *
 * Returns `{ raw: { "--cssvar": "value" } }` or undefined if nothing differs.
 */
function serializeOverridesV2(
  items: readonly SerdeItem[],
  overrides: TokenOverrides,
  opts: SerializeOptions,
): V2TabEntry | undefined {
  const full = opts.includeDefaults === true;
  const raw: Record<string, string> = {};
  let wrote = false;

  if (full) {
    // Dump every editable item: override if set, else item default.
    for (const t of items) {
      if (t.readonly) continue;
      const v = overrides[t.id];
      raw[t.cssVar] = typeof v === 'string' && v.length > 0 ? v : t.default;
      wrote = true;
    }
  } else {
    // Diff-only: emit only user-modified items.
    for (const t of items) {
      if (t.readonly) continue;
      const v = overrides[t.id];
      if (typeof v === 'string' && v.length > 0 && v !== t.default) {
        raw[t.cssVar] = v;
        wrote = true;
      }
    }
  }

  return wrote ? { raw } : undefined;
}

// ---------------------------------------------------------------------------
// Deserialize (accepts v1 and v2)
// ---------------------------------------------------------------------------

/**
 * Parse a design-token JSON document and lift it back into a tweak state.
 *
 * Accepted schema values:
 *  - `SCHEMA_V2` ("zudo-design-tokens/v2") — parsed directly.
 *  - `SCHEMA_V1` ("zudo-design-tokens/v1") — lifted to equivalent internal
 *    state (one-way migration; v1 is no longer a valid OUTPUT format).
 *  - Any other value (including custom host schema ids) — throws
 *    `DesignTokenSchemaError` with reason `schema-mismatch`.
 *
 * Throws `DesignTokenSchemaError` on schema mismatch / non-object input. Any
 * CSS var name that doesn't match a known manifest entry is collected into
 * `unknownTokens` (the caller can surface these as a warning).
 *
 * Missing fields fall back to `opts.colorDefaults` (or, absent that, a
 * minimal neutral default) so the result is always a valid `TweakState`.
 *
 * `cfg` defaults to the active (most-recently-configured) instance so the
 * single-default path stays byte-identical. The Import modal threads its OWN
 * mounted instance config (multi-instance, #361) so a non-default panel's
 * schema-check + cssVar→id mapping use ITS tab manifest + color cluster, not
 * the default instance's.
 */
export function deserialize(
  input: unknown,
  opts: DeserializeOptions = {},
  cfg: PanelConfig = getPanelConfig(),
): DeserializeResult {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new DesignTokenSchemaError('not-object', 'Input is not a JSON object.');
  }

  const obj = input as Record<string, unknown>;
  const schema = obj.$schema;

  if (schema === undefined) {
    throw new DesignTokenSchemaError(
      'schema-missing',
      `Missing "$schema" key. Expected "${SCHEMA_V2}" or "${SCHEMA_V1}".`,
    );
  }

  if (schema === SCHEMA_V2) {
    return deserializeV2(obj, opts, cfg);
  }

  if (schema === SCHEMA_V1) {
    return deserializeV1(obj, opts, cfg);
  }

  throw new DesignTokenSchemaError(
    'schema-mismatch',
    `Unsupported "$schema" value: ${JSON.stringify(schema)}. Expected "${SCHEMA_V2}" or "${SCHEMA_V1}".`,
    schema,
  );
}

// ---------------------------------------------------------------------------
// v2 deserialization
// ---------------------------------------------------------------------------

function deserializeV2(
  obj: Record<string, unknown>,
  opts: DeserializeOptions,
  cfg: PanelConfig,
): DeserializeResult {
  const warnings: string[] = [];
  const unknownTokens: string[] = [];
  const baseline = opts.colorDefaults ?? neutralColorDefaults(cfg);
  const cluster = getActivePrimaryCluster(cfg);

  const tabsRaw = obj.tabs && typeof obj.tabs === 'object' && !Array.isArray(obj.tabs)
    ? (obj.tabs as Record<string, unknown>)
    : {};

  // Color tab.
  const colorTabRaw = tabsRaw['color'];
  const color = deserializeColorV2(colorTabRaw, baseline, cluster, warnings);

  // Spacing tab (id "spacing").
  const spacingTab = tabsRaw['spacing'];
  const spacingRaw = spacingTab && typeof spacingTab === 'object'
    ? (spacingTab as Record<string, unknown>)['raw']
    : undefined;
  const spacing = deserializeOverridesV2(spacingRaw, getTabItems('spacing', cfg), 'spacing', unknownTokens, warnings);

  // Font tab (id "font" in v2 external, maps to internal "typography").
  const fontTab = tabsRaw['font'];
  const fontRaw = fontTab && typeof fontTab === 'object'
    ? (fontTab as Record<string, unknown>)['raw']
    : undefined;
  const typography = deserializeOverridesV2(fontRaw, getTabItems('font', cfg), 'font.raw', unknownTokens, warnings);

  // Size tab.
  const sizeTab = tabsRaw['size'];
  const sizeRaw = sizeTab && typeof sizeTab === 'object'
    ? (sizeTab as Record<string, unknown>)['raw']
    : undefined;
  const size = deserializeOverridesV2(sizeRaw, getTabItems('size', cfg), 'size', unknownTokens, warnings);

  // Generic (custom-id) tabs — driven by the CONFIGURED tabs, not arbitrary
  // payload keys, so foreign / unconfigured tab ids in the JSON are ignored
  // rather than admitted into `state.tabs` (there is no "unknownTabs" channel;
  // unknown cssVars within a configured tab still surface via `unknownTokens`).
  // Rebuilds the tier-nested `TabOverrides` shape so the round-trip equals what
  // `persistTab` writes and `applyFullState` consumes.
  let tabsState: Record<string, TabOverrides> | undefined;
  for (const tab of cfg.tabs) {
    if (RESERVED_TAB_IDS.has(tab.id)) continue;
    const tabEntry = tabsRaw[tab.id];
    const rawMap =
      tabEntry && typeof tabEntry === 'object' && !Array.isArray(tabEntry)
        ? (tabEntry as Record<string, unknown>)['raw']
        : undefined;
    if (!rawMap || typeof rawMap !== 'object' || Array.isArray(rawMap)) continue;

    const lookup = buildTabVarLookup(tab.id, cfg);
    const tierBuckets: Record<string, Record<string, string>> = {};
    let wrote = false;
    for (const [cssVar, value] of Object.entries(rawMap as Record<string, unknown>)) {
      const hit = lookup.get(cssVar);
      if (!hit) {
        unknownTokens.push(cssVar);
        continue;
      }
      if (typeof value !== 'string' || value.length === 0) {
        warnings.push(`${tab.id}.raw.${cssVar} is not a non-empty string; ignored.`);
        continue;
      }
      const bucket = tierBuckets[hit.tierId] ?? (tierBuckets[hit.tierId] = {});
      bucket[hit.itemId] = value;
      wrote = true;
    }
    if (wrote) {
      if (!tabsState) tabsState = {};
      tabsState[tab.id] = tierBuckets;
    }
  }

  return {
    state: { color, spacing, typography, size, ...(tabsState ? { tabs: tabsState } : {}) },
    unknownTokens,
    warnings,
  };
}

function deserializeColorV2(
  raw: unknown,
  baseline: ColorTweakState,
  cluster: ReturnType<typeof getActivePrimaryCluster>,
  warnings: string[],
): ColorTweakState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    // No color tab — fall back entirely to baseline.
    return { ...baseline, palette: [...baseline.palette], semanticMappings: { ...baseline.semanticMappings } };
  }

  const c = raw as Record<string, unknown>;

  // Palette tier: cssVar-keyed.
  let palette = [...baseline.palette];
  if (c['palette'] && typeof c['palette'] === 'object' && !Array.isArray(c['palette'])) {
    const paletteMap = c['palette'] as Record<string, unknown>;
    const newPalette = [...baseline.palette];
    for (let i = 0; i < cluster.paletteSize; i++) {
      const cssVar = resolvePaletteCssVar(cluster, i);
      const val = paletteMap[cssVar];
      if (typeof val === 'string') {
        newPalette[i] = val;
      }
    }
    palette = newPalette;
  }

  // Semantic tier: cssVar-keyed palette-index integers.
  const semanticMappings: Record<string, number | 'bg' | 'fg'> = { ...baseline.semanticMappings };
  if (c['semantic'] && typeof c['semantic'] === 'object' && !Array.isArray(c['semantic'])) {
    const semMap = c['semantic'] as Record<string, unknown>;
    // Build reverse map: cssName → key from cluster.semanticCssNames.
    const cssNameToKey = new Map<string, string>(
      Object.entries(cluster.semanticCssNames).map(([k, v]) => [v, k]),
    );
    for (const [cssName, val] of Object.entries(semMap)) {
      const key = cssNameToKey.get(cssName);
      if (!key) {
        warnings.push(`color.semantic: unknown cssVar "${cssName}"; skipped.`);
        continue;
      }
      if (typeof val === 'number') {
        semanticMappings[key] = val;
      } else {
        warnings.push(`color.semantic.${cssName} has non-number value ${JSON.stringify(val)}; kept baseline.`);
      }
    }
  }

  return {
    palette,
    background: baseline.background,
    foreground: baseline.foreground,
    cursor: baseline.cursor,
    selectionBg: baseline.selectionBg,
    selectionFg: baseline.selectionFg,
    semanticMappings,
    shikiTheme: baseline.shikiTheme,
  };
}

function deserializeOverridesV2(
  raw: unknown,
  items: readonly SerdeItem[],
  label: string,
  unknownTokens: string[],
  warnings: string[],
): TokenOverrides {
  if (!raw || typeof raw !== 'object') return emptyOverrides();

  // Build cssVar → SerdeItem lookup (skip readonly — they're not editable).
  const byVar = new Map<string, SerdeItem>();
  for (const t of items) {
    if (t.readonly) continue;
    byVar.set(t.cssVar, t);
  }

  const out: TokenOverrides = {};
  for (const [cssVar, value] of Object.entries(raw as Record<string, unknown>)) {
    const t = byVar.get(cssVar);
    if (!t) {
      unknownTokens.push(cssVar);
      continue;
    }
    if (typeof value !== 'string' || value.length === 0) {
      warnings.push(`${label}.${cssVar} is not a non-empty string; ignored.`);
      continue;
    }
    out[t.id] = value;
  }
  return out;
}

// ---------------------------------------------------------------------------
// v1 deserialization (one-way migration, no longer a valid output format)
// ---------------------------------------------------------------------------

function deserializeV1(
  obj: Record<string, unknown>,
  opts: DeserializeOptions,
  cfg: PanelConfig,
): DeserializeResult {
  const warnings: string[] = [];
  const unknownTokens: string[] = [];
  const baseline = opts.colorDefaults ?? neutralColorDefaults(cfg);

  const color = deserializeColorV1(obj.color, baseline, warnings);
  // Read items from tabs[] so a host-supplied config drives validation.
  // v1 used "typography" as the key (not "font") for the typography tab.
  const spacing = deserializeOverridesV1(obj.spacing, getTabItems('spacing', cfg), 'spacing', unknownTokens, warnings);
  const typography = deserializeOverridesV1(obj.typography, getTabItems('font', cfg), 'typography', unknownTokens, warnings);
  const size = deserializeOverridesV1(obj.size, getTabItems('size', cfg), 'size', unknownTokens, warnings);

  return {
    state: { color, spacing, typography, size },
    unknownTokens,
    warnings,
  };
}

function deserializeColorV1(
  raw: unknown,
  baseline: ColorTweakState,
  warnings: string[],
): ColorTweakState {
  if (!raw || typeof raw !== 'object') {
    // No color block at all — user probably diffed only spacing/typography/size.
    return {
      ...baseline,
      palette: [...baseline.palette],
      semanticMappings: { ...baseline.semanticMappings },
    };
  }
  const c = raw as Record<string, unknown>;

  // Palette
  let palette = [...baseline.palette];
  if (Array.isArray(c.palette)) {
    const parsed = c.palette.filter((v): v is string => typeof v === 'string');
    if (parsed.length === baseline.palette.length && parsed.length === c.palette.length) {
      palette = parsed;
    } else if (c.palette.length > 0) {
      const detail =
        parsed.length < c.palette.length
          ? `${c.palette.length - parsed.length} non-string entries dropped, leaving ${parsed.length}`
          : `${c.palette.length} entries`;
      warnings.push(
        `color.palette: expected ${baseline.palette.length} string entries; got ${detail}. Palette ignored.`,
      );
    }
  }

  // Base colors
  const base = c.base && typeof c.base === 'object' ? (c.base as Record<string, unknown>) : {};
  const background = numOr(base.bg, baseline.background);
  const foreground = numOr(base.fg, baseline.foreground);
  const cursor = numOr(base.cursor, baseline.cursor);
  const selectionBg = numOr(base['sel-bg'], baseline.selectionBg);
  const selectionFg = numOr(base['sel-fg'], baseline.selectionFg);

  // Semantic mappings — merge over baseline so diff-only exports still
  // produce a complete map.
  const semanticMappings: Record<string, number | 'bg' | 'fg'> = {
    ...baseline.semanticMappings,
  };
  if (c.semantic && typeof c.semantic === 'object') {
    for (const [key, val] of Object.entries(c.semantic as Record<string, unknown>)) {
      if (typeof val === 'number') {
        semanticMappings[key] = val;
      } else if (val === 'bg' || val === 'fg') {
        semanticMappings[key] = val;
      } else {
        warnings.push(
          `color.semantic.${key} has unsupported value ${JSON.stringify(val)}; kept baseline.`,
        );
      }
    }
  }

  const shikiTheme =
    typeof c.shikiTheme === 'string' && c.shikiTheme.length > 0
      ? c.shikiTheme
      : baseline.shikiTheme;

  return {
    palette,
    background,
    foreground,
    cursor,
    selectionBg,
    selectionFg,
    semanticMappings,
    shikiTheme,
  };
}

function deserializeOverridesV1(
  raw: unknown,
  items: readonly SerdeItem[],
  label: string,
  unknownTokens: string[],
  warnings: string[],
): TokenOverrides {
  if (!raw || typeof raw !== 'object') return emptyOverrides();

  // Build cssVar → SerdeItem lookup (skip readonly — they're not editable).
  const byVar = new Map<string, SerdeItem>();
  for (const t of items) {
    if (t.readonly) continue;
    byVar.set(t.cssVar, t);
  }

  const out: TokenOverrides = {};
  for (const [cssVar, value] of Object.entries(raw as Record<string, unknown>)) {
    const t = byVar.get(cssVar);
    if (!t) {
      unknownTokens.push(cssVar);
      continue;
    }
    if (typeof value !== 'string' || value.length === 0) {
      warnings.push(`${label}.${cssVar} is not a non-empty string; ignored.`);
      continue;
    }
    out[t.id] = value;
  }
  return out;
}

function numOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/**
 * Minimal color state used as the last-resort baseline when the caller can't
 * provide one (e.g. unit tests without a DOM). The palette is sized to the
 * supplied panel config's color cluster `paletteSize` so smaller clusters
 * don't end up with orphan trailing slots.
 *
 * Falls back to a length of 16 when no cluster is configured. `cfg` defaults to
 * the active instance so the single-default path stays byte-identical.
 */
function neutralColorDefaults(cfg: PanelConfig = getPanelConfig()): ColorTweakState {
  const cluster = getActivePrimaryCluster(cfg);
  const size = cluster && cluster.paletteSize > 0 ? cluster.paletteSize : 16;
  const lastIdx = size - 1;
  const palette = Array.from({ length: size }, (_, i) => {
    if (i === 0) return '#000000';
    if (i === lastIdx) return '#ffffff';
    return '#808080';
  });
  const clamp = (i: number) => Math.min(Math.max(i, 0), lastIdx);
  return {
    palette,
    background: clamp(0),
    foreground: clamp(15),
    cursor: clamp(6),
    selectionBg: clamp(0),
    selectionFg: clamp(15),
    semanticMappings: {},
    shikiTheme: 'dracula',
  };
}
