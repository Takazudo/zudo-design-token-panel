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
 * | `zudo-design-tokens/v2`    | Current  | `tabs` wrapper keyed by tab id; cssVar-keyed leaves; `color.semantic` leaves are palette-index integers only |
 * | `zudo-design-tokens/v3`    | Current  | Same shape as v2, but `color.semantic` leaves may ALSO be `{ literal }` / `{ literal: { light, dark } }` / `{ ref }` objects (#462) |
 *
 * `serialize()` emits v2 when every semantic mapping in the state resolves to
 * a plain palette-index integer (byte-identical to the pre-#462 output), and
 * opportunistically upgrades to v3 only when at least one semantic mapping is
 * one of the new `SemanticValue` object variants — v3 is a strict superset of
 * v2's shape, so this upgrade never loses information and never happens for a
 * doc that v2 could already represent losslessly. `deserialize()` accepts
 * exactly the three canonical `$schema` values above (`SCHEMA_V1`, `SCHEMA_V2`,
 * `SCHEMA_V3`) and normalises to an internal `TweakState` regardless of which
 * one was in the payload. `PanelConfig.schemaId` is a UI-label-only value
 * (see `getDesignTokenSchema` below) that this package's own modals do NOT
 * consult — `import-modal.tsx` / `export-modal.tsx` name the canonical
 * constants directly in their copy. It is never consulted by
 * `serialize()`/`deserialize()` either; a host that sets a custom `schemaId`
 * still gets a `schema-mismatch` error importing any doc whose `$schema`
 * isn't one of the three canonical constants (#498).
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

import type {
  ColorTweakState,
  SemanticValue,
  TabOverrides,
  TokenOverrides,
  TweakState,
} from '../state/tweak-state';
import {
  getActivePrimaryCluster,
  isIndexMapping,
  isLiteralMapping,
  isPerModeLiteral,
  isRefMapping,
  normalizeSchemePaletteEntry,
} from '../state/tweak-state';
import { getPanelConfig, type PanelConfig } from '../config/panel-config';
import { resolvePaletteCssVar } from '../config/cluster-config';
import { resolveRefToCssVar } from '../apply/tier-resolver';
import { structuralEqual } from './structural-equal';
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
 * ids plus `color-secondary` (carried by `state.secondary`, not `state.tabs`)
 * — plus `notes` (#515), which carries no token overrides at all and is
 * excluded from serde entirely (not given a dedicated slice; simply skipped
 * by every `RESERVED_TAB_IDS.has(tab.id)` guard below). Everything else
 * configured in `cfg.tabs` is a host-coined GENERIC tab whose overrides live
 * in `state.tabs[id]` and round-trip under `tabs[id].raw`.
 */
const RESERVED_TAB_IDS: ReadonlySet<string> = new Set([
  'color',
  'color-secondary',
  'spacing',
  'font',
  'size',
  'notes',
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

/** The canonical v2 schema identifier emitted by serialize() when every
 *  semantic mapping is a plain palette-index integer. */
export const SCHEMA_V2 = 'zudo-design-tokens/v2';

/** The legacy v1 schema identifier accepted by deserialize() for back-compat. */
export const SCHEMA_V1 = 'zudo-design-tokens/v1';

/**
 * The v3 schema identifier — emitted by serialize() instead of `SCHEMA_V2`
 * only when the state carries at least one `SemanticValue` object variant
 * (`{ literal }` / `{ literal: { light, dark } }` / `{ ref }`) that v2's
 * number-only `color.semantic` leaf cannot represent (#462). Structurally a
 * strict superset of v2 — a v3 deserializer accepts every v2 document too,
 * but `deserialize()` still dispatches v2 docs through the unmodified v2 path
 * so legacy exports keep parsing byte-for-byte as before.
 */
export const SCHEMA_V3 = 'zudo-design-tokens/v3';

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
 * Returns the host-configured schema id from `cfg.schemaId`. This is a
 * UI-label-only value on `PanelConfig` — it is never read by `serialize()`
 * (which always emits `SCHEMA_V2` or `SCHEMA_V3`) or by `deserialize()`
 * (which always validates against `SCHEMA_V1`/`SCHEMA_V2`/`SCHEMA_V3`); see
 * the header comment above and #498. Neither `import-modal.tsx` nor
 * `export-modal.tsx` calls this function — their copy names the actual
 * `SCHEMA_V1`/`V2`/`V3` constants directly instead. This helper remains for
 * hosts that want to read their own configured `schemaId` label without
 * reaching into `PanelConfig` directly.
 *
 * `cfg` defaults to the active (most-recently-configured) instance so the
 * single-default path stays byte-identical.
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
// v3 external JSON types (widened `color.semantic` leaf, #462)
// ---------------------------------------------------------------------------

/** A single-color (non-per-mode) literal semantic mapping, external shape. */
export type SemanticLiteralExternal = { literal: string } | { literal: { light: string; dark: string } };

/** A cross-tab/tier ramp-item reference semantic mapping, external shape. */
export type SemanticRefExternal = { ref: { tab?: string; tier: string; item: string } };

/**
 * The widened leaf type for `tabs.color.semantic` entries under `SCHEMA_V3`.
 * A plain `number` is still the palette-index shape v2 has always emitted;
 * the object variants are the new `SemanticValue` shapes serialize() emits
 * verbatim (no index resolution) when the state holds one (#462).
 */
export type SemanticExternalValue = number | SemanticLiteralExternal | SemanticRefExternal;

/** `tabs.color.semantic` leaf map under `SCHEMA_V3` — same cssVar keys as
 *  v2's `V2TierMap`, but values may be the wider `SemanticExternalValue`. */
export type V3SemanticTierMap = Record<string, SemanticExternalValue>;

/**
 * Per-tab overrides accepted/emitted at `SCHEMA_V3`. Identical to `V2TabEntry`
 * for every tier EXCEPT `color.semantic`, whose leaf may be the widened
 * `SemanticExternalValue` union instead of just `string | number`.
 */
export type V3TabEntry = Record<string, V2TierMap | V3SemanticTierMap>;

/** v3 external JSON document shape — see `SCHEMA_V3` for when serialize() emits this. */
export interface DesignTokenJsonV3 {
  $schema: string;
  exportedAt: string;
  tabs?: Record<string, V3TabEntry>;
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
// Serialize (v2 output, opportunistically upgraded to v3)
// ---------------------------------------------------------------------------

/**
 * Produce the external JSON document for a given tweak state.
 *
 * By default this is diff-only against `opts.colorDefaults` + manifest
 * defaults; set `opts.includeDefaults = true` to dump everything.
 *
 * The output `$schema` is `SCHEMA_V2` ("zudo-design-tokens/v2") UNLESS the
 * state holds at least one semantic mapping that is a `SemanticValue` object
 * variant (`{ literal }` / `{ literal: { light, dark } }` / `{ ref }`) — those
 * can't be represented by v2's number-only `color.semantic` leaf, so the
 * output is upgraded to `SCHEMA_V3` instead (#462). A state whose semantic
 * mappings are all plain palette-index integers (the only shape that existed
 * before #459) always emits byte-identical `SCHEMA_V2` output, unchanged from
 * pre-#462 behavior.
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
): DesignTokenJsonV3 {
  const now = opts.now ? opts.now() : new Date();

  const tabs: Record<string, V3TabEntry> = {};
  let needsV3 = false;

  // Color tab — keyed under "color".
  const colorResult = serializeColorTab(state.color, opts, cfg);
  if (colorResult) {
    tabs['color'] = colorResult.tab;
    if (colorResult.usesObjectSemanticLeaf) needsV3 = true;
  }

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

  const out: DesignTokenJsonV3 = {
    $schema: needsV3 ? SCHEMA_V3 : SCHEMA_V2,
    exportedAt: now.toISOString(),
  };

  if (Object.keys(tabs).length > 0) {
    out.tabs = tabs;
  }

  return out;
}

/**
 * Serialize a `ColorTweakState` into the `color` tab entry.
 *
 * `palette` tier: cssVar-keyed map from `resolvePaletteCssVar(cluster, i)` to
 * the hex color string at that index. Only changed slots are emitted in
 * diff-only mode.
 *
 * `semantic` tier: cssVar-keyed map from `semanticCssNames[key]` to the
 * mapping's external value. Only changed entries in diff-only mode. Index
 * mappings (`number` / `'bg'` / `'fg'`) resolve to a palette-index integer
 * exactly as v2 always has; the newer `{ literal }` / `{ ref }` variants are
 * emitted verbatim as objects (#462) — `usesObjectSemanticLeaf` tells the
 * caller whether that happened, so `serialize()` knows to upgrade `$schema`
 * to `SCHEMA_V3`.
 *
 * The legacy `base` / `shikiTheme` fields are NOT emitted; they were
 * panel-internal and not needed by AI consumers. They survive through the
 * internal `TweakState` persist envelope and are round-tripped through storage,
 * but are dropped from the external export to keep the format minimal.
 */
function serializeColorTab(
  color: ColorTweakState,
  opts: SerializeOptions,
  cfg: PanelConfig,
): { tab: V3TabEntry; usesObjectSemanticLeaf: boolean } | undefined {
  const baseline = opts.colorDefaults;
  const full = opts.includeDefaults === true;
  const cluster = getActivePrimaryCluster(cfg);

  const out: V3TabEntry = {};
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

  // Semantic tier — cssVar-keyed. Index mappings ('bg'/'fg' legacy aliases
  // admitted by v1 deserialize, and plain palette-index numbers) resolve to
  // their concrete palette index (mirroring resolveMappingIndex in
  // build-apply-overrides.ts) so they survive round-trips exactly as v2
  // always has (F29 fix). The newer `{ literal }` / `{ ref }` variants
  // (#459/#462) can't be resolved to an index — they're written verbatim as
  // objects, which flips `usesObjectSemanticLeaf` so the caller upgrades
  // `$schema` to `SCHEMA_V3`.
  const semantic: Record<string, SemanticExternalValue> = {};
  let semanticWrote = false;
  let usesObjectSemanticLeaf = false;
  for (const [key, cssName] of Object.entries(cluster.semanticCssNames)) {
    const cur = color.semanticMappings[key];
    if (cur === undefined) continue;
    const baselineVal = baseline?.semanticMappings[key];
    const unchanged =
      !full &&
      baselineVal !== undefined &&
      semanticMappingsEqual(cur, baselineVal, color.background, color.foreground, baseline);
    if (unchanged) continue;
    const external = toSemanticExternalValue(cur, color.background, color.foreground);
    semantic[cssName] = external;
    semanticWrote = true;
    if (typeof external !== 'number') usesObjectSemanticLeaf = true;
  }
  if (semanticWrote) {
    out['semantic'] = semantic;
    wrote = true;
  }

  return wrote ? { tab: out, usesObjectSemanticLeaf } : undefined;
}

/**
 * Resolve an index-style mapping (`number` / `'bg'` / `'fg'`) to a concrete
 * palette index, given the state's own background/foreground indices.
 */
function resolveIndexMapping(v: number | 'bg' | 'fg', bg: number, fg: number): number {
  return typeof v === 'number' ? v : v === 'bg' ? bg : fg;
}

/**
 * True when `cur` (the current state's mapping) is unchanged from
 * `baselineVal` for diff-only serialize purposes. Index mappings are compared
 * by their RESOLVED palette index (so e.g. `'bg'` and a baseline numeric
 * mapping that happens to equal the current background index are treated as
 * equal, matching pre-#462 behavior). The `{ literal }` / `{ ref }` variants
 * have no index to resolve to, so they're compared structurally (order-
 * independent — see `structuralEqual`, so a `{ ref }` reconstructed by
 * `parseSemanticExternalValue` compares equal to a UI-produced ref with
 * different key insertion order); a mapping that changed KIND (index → object
 * or vice versa) is always "changed".
 */
function semanticMappingsEqual(
  cur: SemanticValue,
  baselineVal: SemanticValue,
  curBg: number,
  curFg: number,
  baseline: ColorTweakState | undefined,
): boolean {
  if (isIndexMapping(cur) && isIndexMapping(baselineVal)) {
    const resolvedBaseline = resolveIndexMapping(
      baselineVal,
      baseline?.background ?? 0,
      baseline?.foreground ?? 1,
    );
    return resolveIndexMapping(cur, curBg, curFg) === resolvedBaseline;
  }
  if (isIndexMapping(cur) !== isIndexMapping(baselineVal)) return false;
  // Both are object variants (literal / ref) — compare structurally.
  // JSON.stringify is key-order sensitive, so a structurally identical ref
  // built with a different property insertion order (e.g. baseline via
  // parseSemanticExternalValue's `{tier, item, tab}` vs. a UI-produced
  // `{tab, tier, item}`) would spuriously compare "changed" and get emitted
  // as diff-noise (import-modal.tsx's `structuralEqual` avoids the same trap).
  return structuralEqual(cur, baselineVal);
}

/**
 * Resolve a `SemanticValue` to its external (JSON-serializable) form. Index
 * mappings resolve to a concrete palette-index integer (unchanged v2
 * behavior); the `{ literal }` / `{ ref }` variants pass through verbatim —
 * they're already plain-JSON-serializable shapes.
 */
function toSemanticExternalValue(
  v: SemanticValue,
  bg: number,
  fg: number,
): SemanticExternalValue {
  if (isIndexMapping(v)) return resolveIndexMapping(v, bg, fg);
  if (isPerModeLiteral(v)) return { literal: { light: v.literal.light, dark: v.literal.dark } };
  if (isLiteralMapping(v)) return { literal: v.literal as string };
  if (isRefMapping(v)) return { ref: v.ref };
  // Exhaustive over `SemanticValue`; kept as a safe fallback rather than a
  // thrown error so a future non-exhaustive addition to the union degrades to
  // a background-color fallback instead of crashing serialize().
  return bg;
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
// Deserialize (accepts v1, v2, and v3)
// ---------------------------------------------------------------------------

/**
 * Parse a design-token JSON document and lift it back into a tweak state.
 *
 * Accepted schema values:
 *  - `SCHEMA_V3` ("zudo-design-tokens/v3") — parsed directly; `color.semantic`
 *    leaves may be a palette-index integer OR a `SemanticValue` object
 *    variant (#462).
 *  - `SCHEMA_V2` ("zudo-design-tokens/v2") — parsed directly; `color.semantic`
 *    leaves are palette-index integers only (unchanged since before #462).
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
      `Missing "$schema" key. Expected "${SCHEMA_V3}", "${SCHEMA_V2}", or "${SCHEMA_V1}".`,
    );
  }

  if (schema === SCHEMA_V3) {
    return deserializeV3(obj, opts, cfg);
  }

  if (schema === SCHEMA_V2) {
    return deserializeV2(obj, opts, cfg);
  }

  if (schema === SCHEMA_V1) {
    return deserializeV1(obj, opts, cfg);
  }

  throw new DesignTokenSchemaError(
    'schema-mismatch',
    `Unsupported "$schema" value: ${JSON.stringify(schema)}. Expected "${SCHEMA_V3}", "${SCHEMA_V2}", or "${SCHEMA_V1}".`,
    schema,
  );
}

/** Narrow `obj.tabs` into a plain object, defaulting to `{}` for any other shape. */
function normalizeTabsRaw(tabs: unknown): Record<string, unknown> {
  return tabs && typeof tabs === 'object' && !Array.isArray(tabs)
    ? (tabs as Record<string, unknown>)
    : {};
}

/**
 * Shared deserialization for every tab EXCEPT `color` — spacing / font / size
 * and host-coined generic tabs. Identical between v2 and v3 (the widened
 * `SemanticValue` leaf only affects `color.semantic`), so both
 * `deserializeV2` and `deserializeV3` call this instead of duplicating it.
 */
function deserializeNonColorSlices(
  tabsRaw: Record<string, unknown>,
  cfg: PanelConfig,
  unknownTokens: string[],
  warnings: string[],
): {
  spacing: TokenOverrides;
  typography: TokenOverrides;
  size: TokenOverrides;
  tabsState: Record<string, TabOverrides> | undefined;
} {
  // Spacing tab (id "spacing").
  const spacingTab = tabsRaw['spacing'];
  const spacingRaw = spacingTab && typeof spacingTab === 'object'
    ? (spacingTab as Record<string, unknown>)['raw']
    : undefined;
  const spacing = deserializeOverridesV2(spacingRaw, getTabItems('spacing', cfg), 'spacing', unknownTokens, warnings);

  // Font tab (id "font" in external schema, maps to internal "typography").
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

  return { spacing, typography, size, tabsState };
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

  const tabsRaw = normalizeTabsRaw(obj.tabs);

  // Color tab.
  const color = deserializeColorV2(tabsRaw['color'], baseline, cluster, warnings);

  const { spacing, typography, size, tabsState } = deserializeNonColorSlices(
    tabsRaw,
    cfg,
    unknownTokens,
    warnings,
  );

  return {
    state: { color, spacing, typography, size, ...(tabsState ? { tabs: tabsState } : {}) },
    unknownTokens,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// v3 deserialization — same shape as v2, but `color.semantic` leaves may also
// be a `SemanticValue` object variant (#462).
// ---------------------------------------------------------------------------

function deserializeV3(
  obj: Record<string, unknown>,
  opts: DeserializeOptions,
  cfg: PanelConfig,
): DeserializeResult {
  const warnings: string[] = [];
  const unknownTokens: string[] = [];
  const baseline = opts.colorDefaults ?? neutralColorDefaults(cfg);
  const cluster = getActivePrimaryCluster(cfg);

  const tabsRaw = normalizeTabsRaw(obj.tabs);

  // Color tab — the only slice that differs from v2.
  const color = deserializeColorV3(tabsRaw['color'], baseline, cluster, warnings, cfg);

  const { spacing, typography, size, tabsState } = deserializeNonColorSlices(
    tabsRaw,
    cfg,
    unknownTokens,
    warnings,
  );

  return {
    state: { color, spacing, typography, size, ...(tabsState ? { tabs: tabsState } : {}) },
    unknownTokens,
    warnings,
  };
}

/**
 * Parse a single external `color.semantic` leaf value into a `SemanticValue`.
 * Accepts a plain palette-index `number` (the v2/pre-#462 shape) plus the
 * `{ literal }` / `{ literal: { light, dark } }` / `{ ref }` object variants
 * (#462, SCHEMA_V3+). Returns `undefined` for any other shape so the caller
 * can warn-and-keep-baseline exactly like the other malformed-value paths in
 * this module.
 *
 * `paletteSize` gates the `number` branch to an in-range INTEGER index: a
 * non-integer like `2.5` passes `safeIndex`'s bounds check downstream
 * (`safeIndex` only checks `index < len`, not `Number.isInteger`) and indexes
 * `palette[2.5] === undefined`, painting the token black instead of being
 * caught here at parse time. V1/V2 index parsing is untouched — only the
 * V3-only path (this function) gates on integer + range.
 */
function parseSemanticExternalValue(val: unknown, paletteSize: number): SemanticValue | undefined {
  if (typeof val === 'number') {
    return Number.isInteger(val) && val >= 0 && val < paletteSize ? val : undefined;
  }
  if (!val || typeof val !== 'object' || Array.isArray(val)) return undefined;

  const o = val as Record<string, unknown>;

  if ('literal' in o) {
    const lit = o.literal;
    if (typeof lit === 'string') return { literal: lit };
    if (lit && typeof lit === 'object' && !Array.isArray(lit)) {
      const lo = lit as Record<string, unknown>;
      if (typeof lo.light === 'string' && typeof lo.dark === 'string') {
        return { literal: { light: lo.light, dark: lo.dark } };
      }
    }
    return undefined;
  }

  if ('ref' in o) {
    const ref = o.ref;
    if (ref && typeof ref === 'object' && !Array.isArray(ref)) {
      const ro = ref as Record<string, unknown>;
      if (typeof ro.tier === 'string' && typeof ro.item === 'string') {
        return {
          ref: {
            tier: ro.tier,
            item: ro.item,
            ...(typeof ro.tab === 'string' ? { tab: ro.tab } : {}),
          },
        };
      }
    }
    return undefined;
  }

  return undefined;
}

/**
 * Deserialize the `palette` tier shared by v2 and v3 `color` tabs — a
 * cssVar-keyed map of hex/oklch color strings. Extracted so
 * `deserializeColorV2` and `deserializeColorV3` don't duplicate it.
 */
function deserializePaletteTier(
  raw: Record<string, unknown>,
  baseline: ColorTweakState,
  cluster: ReturnType<typeof getActivePrimaryCluster>,
): string[] {
  if (!raw['palette'] || typeof raw['palette'] !== 'object' || Array.isArray(raw['palette'])) {
    return [...baseline.palette];
  }
  const paletteMap = raw['palette'] as Record<string, unknown>;
  const newPalette = [...baseline.palette];
  for (let i = 0; i < cluster.paletteSize; i++) {
    const cssVar = resolvePaletteCssVar(cluster, i);
    const val = paletteMap[cssVar];
    if (typeof val === 'string') {
      // Apply the same seed-time sanitiser (commit 8d54e07): preserve
      // valid oklch() verbatim and route everything else through
      // cssColorToHex() so a garbage entry like "18" becomes '#000000'
      // instead of leaking verbatim into a CSS custom property.
      newPalette[i] = normalizeSchemePaletteEntry(val);
    }
  }
  return newPalette;
}

function deserializeColorV3(
  raw: unknown,
  baseline: ColorTweakState,
  cluster: ReturnType<typeof getActivePrimaryCluster>,
  warnings: string[],
  cfg: PanelConfig,
): ColorTweakState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    // No color tab — fall back entirely to baseline.
    return { ...baseline, palette: [...baseline.palette], semanticMappings: { ...baseline.semanticMappings } };
  }

  const c = raw as Record<string, unknown>;
  const palette = deserializePaletteTier(c, baseline, cluster);

  // Semantic tier: cssVar-keyed. Accepts a palette-index integer (same as v2)
  // OR one of the `SemanticValue` object variants (#462) via
  // `parseSemanticExternalValue`.
  const semanticMappings: Record<string, SemanticValue> = { ...baseline.semanticMappings };
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
      const parsed = parseSemanticExternalValue(val, cluster.paletteSize);
      if (parsed === undefined) {
        warnings.push(
          `color.semantic.${cssName} has unsupported value ${JSON.stringify(val)}; kept baseline.`,
        );
        continue;
      }
      // A `{ ref }` mapping's target tab/tier/item may no longer exist
      // (renamed ramp item, host dropped a tab) — `resolveRefToCssVar` throws
      // in that case. Warn so the Import modal can surface it, but still keep
      // the parsed ref (not degraded to baseline): the apply path
      // (`resolveSemanticCssValue`) already skips an unresolvable ref and
      // leaves the token at its stylesheet default, so this stays a graceful
      // degradation rather than a silent no-op.
      if (isRefMapping(parsed)) {
        const colorTab = cfg.tabs.find((t) => t.id === 'color');
        try {
          if (!colorTab) throw new Error('no color tab configured');
          resolveRefToCssVar(parsed.ref, colorTab, cfg.tabs);
        } catch {
          warnings.push(
            `color.semantic.${cssName} ref points to a missing target ` +
              `(tab "${parsed.ref.tab ?? colorTab?.id ?? '?'}", tier "${parsed.ref.tier}", ` +
              `item "${parsed.ref.item}"); kept as an unresolved reference.`,
          );
        }
      }
      semanticMappings[key] = parsed;
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
        // Apply the same seed-time sanitiser (commit 8d54e07): preserve
        // valid oklch() verbatim and route everything else through
        // cssColorToHex() so a garbage entry like "18" becomes '#000000'
        // instead of leaking verbatim into a CSS custom property.
        newPalette[i] = normalizeSchemePaletteEntry(val);
      }
    }
    palette = newPalette;
  }

  // Semantic tier: cssVar-keyed palette-index integers. Only ever populated
  // with legacy `number` values below (v2 deserialize doesn't admit
  // `'bg'`/`'fg'` or the newer `SemanticValue` object variants) — typed as
  // `SemanticValue` because that's `ColorTweakState.semanticMappings`'s type
  // (#459), and `baseline.semanticMappings` may already carry the wider shape.
  const semanticMappings: Record<string, SemanticValue> = { ...baseline.semanticMappings };
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
      // Apply the same seed-time sanitiser (commit 8d54e07): preserve valid
      // oklch() verbatim and route everything else through cssColorToHex() so
      // a garbage entry like "18" becomes '#000000' instead of leaking into a
      // CSS custom property.
      palette = parsed.map(normalizeSchemePaletteEntry);
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
  // produce a complete map. Typed as `SemanticValue` (not the legacy
  // `number | 'bg' | 'fg'`) because that's `ColorTweakState.semanticMappings`'s
  // type (#459); v1 deserialize below still only ever writes `number` or
  // `'bg'`/`'fg'` into it.
  const semanticMappings: Record<string, SemanticValue> = {
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
