import { memo } from 'preact/compat';
import type { TabConfig, TierConfig, TierItem } from '../tokens/tier-model';
import ColorField from '../components/color-picker/color-field';
import { HelpIcon, LITERAL_HELP_TEXT, PER_MODE_HELP_TEXT } from './help-icon';
import { resolvePerModeLiteral } from '../state/tweak-state';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * `<select>` option value for the trailing "Literal…" choice. Purely an
 * internal DOM detail — it never appears on the `onChange` payload, which
 * always carries the structured `TierRefSelectorValue` union instead (see
 * below).
 */
const LITERAL_OPTION_VALUE = '__literal__';

/**
 * `<select>` option value for the synthesized "unresolved ref" placeholder —
 * shown, disabled and selected, when `value.ref` no longer resolves to a
 * built option (issue #479 nit n3). Like `LITERAL_OPTION_VALUE`, it's purely
 * an internal DOM detail and never appears on the `onChange` payload.
 */
const UNRESOLVED_OPTION_VALUE = '__unresolved__';

/**
 * Maximum length of a value preview string shown in option labels.
 * Long values like cubic-bezier strings are truncated so the UI stays compact.
 */
const PREVIEW_MAX_LEN = 28;

// ---------------------------------------------------------------------------
// Public value / target types
// ---------------------------------------------------------------------------

/**
 * Names one item in a (possibly cross-tab) tier. `tab` omitted means "the tab
 * `TierRefSelector` itself renders in" — the intra-tab case used by the
 * font/spacing/size/generic-tab consumers, whose refs never cross tabs.
 */
export interface TierRefTarget {
  tab?: string;
  tier: string;
  item: string;
}

/**
 * The value `TierRefSelector` reads and writes. Mirrors the `{ ref } | {
 * literal }` variants of `SemanticValue` (`tokens/tier-model.ts`) — including
 * the per-mode `{ literal: { light, dark } }` shape (#472/#473) — so the
 * Color tab can pass a semantic mapping straight through. Flat/intra-tab
 * consumers (font/spacing/size/generic-tab) wrap their bare `TokenOverrides`
 * string into `{ ref: { tier, item } }` at the call site, and unwrap a
 * `{ literal }` response back into "drop the override" — see those tabs'
 * `onChange` handlers. Those flat consumers never produce a per-mode literal.
 */
export type TierRefSelectorValue =
  | { ref: TierRefTarget }
  | { literal: string }
  | { literal: { light: string; dark: string } };

function isLiteralValue(
  v: TierRefSelectorValue,
): v is { literal: string } | { literal: { light: string; dark: string } } {
  return 'literal' in v;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncatePreview(value: string): string {
  if (value.length <= PREVIEW_MAX_LEN) return value;
  return value.slice(0, PREVIEW_MAX_LEN - 1) + '…';
}

function findTier(tab: TabConfig, tierId: string): TierConfig | undefined {
  return tab.tiers.find((t) => t.id === tierId);
}

function refsEqual(a: TierRefTarget, b: TierRefTarget): boolean {
  return (a.tab ?? '') === (b.tab ?? '') && a.tier === b.tier && a.item === b.item;
}

const warnedUnresolvedRefs = new Set<string>();

/** Logs a dangling `{ ref }` once per distinct target, so a re-render loop doesn't spam the console. */
function warnUnresolvedRefOnce(ref: TierRefTarget): void {
  const key = `${ref.tab ?? ''}/${ref.tier}/${ref.item}`;
  if (warnedUnresolvedRefs.has(key)) return;
  warnedUnresolvedRefs.add(key);
  console.warn(
    `TierRefSelector: ref "${key}" does not resolve to a built option — showing a disabled placeholder instead of silently falling back to another selection.`,
  );
}

/** One flattened, selectable ramp/ref option. */
interface RefOption {
  /**
   * Unique `<option value>` — a stable per-render index string, NOT the ref
   * itself, so duplicate item ids across different ramp tiers/tabs never
   * collide in the native `<select>`.
   */
  key: string;
  ref: TierRefTarget;
  item: TierItem;
}

interface RefGroup {
  label: string;
  options: RefOption[];
}

/**
 * Build the grouped ramp option list for a `referencesRamps`-declaring tier:
 * one `<optgroup>` per declared ramp source, each populated from that
 * source's tier items (cross-tab when the source names a different `tab`).
 * A source that doesn't resolve (unknown tab/tier) is silently skipped —
 * up-front validation of `referencesRamps` declarations is out of scope here.
 */
function buildRampGroups(
  rampSources: readonly { tab?: string; tier: string }[],
  currentTab: TabConfig,
  tabs: readonly TabConfig[],
): RefGroup[] {
  const groups: RefGroup[] = [];
  let counter = 0;
  for (const src of rampSources) {
    const sourceTab =
      src.tab === undefined || src.tab === currentTab.id
        ? currentTab
        : tabs.find((t) => t.id === src.tab);
    const sourceTier = sourceTab && findTier(sourceTab, src.tier);
    if (!sourceTier) continue;
    const options: RefOption[] = sourceTier.items.map((item) => ({
      key: `r${counter++}`,
      ref: { tab: src.tab, tier: src.tier, item: item.id },
      item,
    }));
    groups.push({ label: sourceTier.label, options });
  }
  return groups;
}

/**
 * Build the flat (non-grouped) intra-tab option list for a `referencesTier`
 * tier — the font/spacing/size/generic-tab path. Unchanged from the
 * pre-grouped rendering: no `<optgroup>`, one option per tier-1 item.
 */
function buildFlatOptions(refTier: TierConfig): RefOption[] {
  return refTier.items.map((item, i) => ({
    key: `r${i}`,
    ref: { tier: refTier.id, item: item.id },
    item,
  }));
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TierRefSelectorProps {
  /** The tab this row belongs to — provides the semantic/reference tier
   *  config and doubles as the default "current tab" for intra-tab refs. */
  tab: TabConfig;
  /**
   * Full panel tabs array, needed to resolve a grouped tier's cross-tab ramp
   * sources. Defaults to `[tab]` — fine for intra-tab (flat) callers, which
   * never reference another tab.
   */
  tabs?: readonly TabConfig[];
  /** The tier whose item is being edited (the semantic / reference tier). */
  tierId: string;
  /** The item being edited within `tierId`. */
  itemId: string;
  /** Current value — a ramp/ref target, or a literal color/CSS string. */
  value: TierRefSelectorValue;
  /**
   * Called when the user commits a selection or edits the literal value.
   *
   * - Picking a ramp/ref option: `onChange(itemId, { ref: {...} })`
   * - Picking "Literal…" or editing the literal swatch (grouped mode only):
   *   `onChange(itemId, { literal: <value> })`
   */
  onChange: (itemId: string, next: TierRefSelectorValue) => void;
  /**
   * Returns the resolved (override-aware) preview string for a ramp/ref
   * target. Each option label is formatted as `${item.cssVar} (${truncated
   * preview})`. Falls back to the target item's manifest `default` when
   * omitted.
   */
  previewValueFor?: (ref: TierRefTarget) => string;
  /**
   * Friendly label used for the literal-mode `ColorField` editor (grouped
   * mode only) and the select's `aria-label`. Defaults to `itemId`.
   */
  label?: string;
  /**
   * The row's own cssVar — threaded into the literal-mode `ColorField`
   * editor for its `aria-label`, matching `SemanticLiteralRow`'s convention.
   */
  cssVar?: string;
  /**
   * The cluster's `getClusterDefaultMode()` result (#472) — used only when
   * the user collapses a per-mode literal back to single-mode, to pick which
   * side (`light` or `dark`) survives. Defaults to `'light'`.
   */
  defaultMode?: 'light' | 'dark';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function TierRefSelector({
  tab,
  tabs,
  tierId,
  itemId,
  value,
  onChange,
  previewValueFor,
  label,
  cssVar,
  defaultMode = 'light',
}: TierRefSelectorProps) {
  // -------------------------------------------------------------------------
  // Derive mode (grouped cross-tab ramps vs. flat intra-tab ref) and options
  // -------------------------------------------------------------------------

  const thisTier = findTier(tab, tierId);
  const rampSources = thisTier?.referencesRamps;
  const isGrouped = !!rampSources && rampSources.length > 0;
  const tabsList = tabs ?? [tab];

  const groups: RefGroup[] = isGrouped
    ? buildRampGroups(rampSources!, tab, tabsList)
    : (() => {
        const refTierId = thisTier?.referencesTier ?? '';
        const refTier = refTierId ? findTier(tab, refTierId) : undefined;
        return refTier ? [{ label: refTier.label, options: buildFlatOptions(refTier) }] : [];
      })();

  const allOptions = groups.flatMap((g) => g.options);

  // Determine the currently selected option. When the value is a ref that
  // doesn't (or no longer) resolve to a built option, leave it undefined —
  // rendering a disabled "(unresolved: …)" placeholder below instead of
  // silently falling back to some other option, which would misrepresent a
  // broken reference as a valid selection.
  const selectedOption = isLiteralValue(value)
    ? undefined
    : allOptions.find((o) => refsEqual(o.ref, value.ref));

  const unresolvedRef: TierRefTarget | undefined =
    !isLiteralValue(value) && !selectedOption ? value.ref : undefined;

  if (unresolvedRef) {
    warnUnresolvedRefOnce(unresolvedRef);
  }

  const selectedKey = isLiteralValue(value)
    ? LITERAL_OPTION_VALUE
    : (selectedOption?.key ?? UNRESOLVED_OPTION_VALUE);

  const rowLabel = label ?? itemId;

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const key = e.currentTarget.value;
    // The placeholder is disabled, so the browser never fires a real change
    // to it — this guard is defense-in-depth, not a path users can hit.
    if (key === UNRESOLVED_OPTION_VALUE) return;
    if (key === LITERAL_OPTION_VALUE) {
      // Seed the literal editor from whatever was visible a moment ago, so
      // the user starts from a real color rather than a blank field. Always
      // seeds a single-mode string — picking "Literal…" starts single-mode;
      // the user expands to per-mode via the "Per-mode" checkbox below. If
      // the previous value was already a per-mode literal, collapse it to
      // the cluster's default-mode side first.
      const seed = isLiteralValue(value)
        ? typeof value.literal === 'string'
          ? value.literal
          : resolvePerModeLiteral({ literal: value.literal }, defaultMode)
        : selectedOption
          ? (previewValueFor ? previewValueFor(selectedOption.ref) : selectedOption.item.default)
          : '';
      onChange(itemId, { literal: seed });
      return;
    }
    const opt = allOptions.find((o) => o.key === key);
    if (!opt) return;
    onChange(itemId, { ref: opt.ref });
  };

  const handleLiteralChange = (next: string) => {
    onChange(itemId, { literal: next });
  };

  /**
   * "Per-mode" checkbox (permitted `<label><input type="checkbox">`,
   * CLAUDE.md) — expands a single-mode literal into a light/dark pair, or
   * collapses a per-mode pair back to one value. Only meaningful while
   * `value` is already a literal (the checkbox only renders in that state).
   */
  const handleTogglePerMode = () => {
    if (!isLiteralValue(value)) return;
    const current = value.literal;
    if (typeof current === 'object' && current !== null) {
      // Collapse — keep the cluster's default-mode side (#472).
      onChange(itemId, { literal: resolvePerModeLiteral({ literal: current }, defaultMode) });
    } else {
      // Expand — seed both sides from the current single value.
      onChange(itemId, { literal: { light: current, dark: current } });
    }
  };

  const handleLightChange = (next: string) => {
    if (!isLiteralValue(value)) return;
    const current = value.literal;
    if (typeof current !== 'object' || current === null) return;
    onChange(itemId, { literal: { light: next, dark: current.dark } });
  };

  const handleDarkChange = (next: string) => {
    if (!isLiteralValue(value)) return;
    const current = value.literal;
    if (typeof current !== 'object' || current === null) return;
    onChange(itemId, { literal: { light: current.light, dark: next } });
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="tokenpanel-tier-ref-selector">
      <select
        className="tokenpanel-tier-ref-select"
        value={selectedKey}
        onChange={handleSelectChange}
        aria-label={`${rowLabel} tier reference`}
      >
        {unresolvedRef && (
          <option value={UNRESOLVED_OPTION_VALUE} disabled>
            (unresolved: {unresolvedRef.tier}/{unresolvedRef.item})
          </option>
        )}
        {isGrouped
          ? groups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((opt) => {
                  const preview = truncatePreview(
                    previewValueFor ? previewValueFor(opt.ref) : opt.item.default,
                  );
                  return (
                    <option key={opt.key} value={opt.key}>
                      {opt.item.cssVar} ({preview})
                    </option>
                  );
                })}
              </optgroup>
            ))
          : allOptions.map((opt) => {
              const preview = truncatePreview(
                previewValueFor ? previewValueFor(opt.ref) : opt.item.default,
              );
              return (
                <option key={opt.key} value={opt.key}>
                  {opt.item.cssVar} ({preview})
                </option>
              );
            })}
        <option value={LITERAL_OPTION_VALUE}>Literal…</option>
      </select>
      {/*
       * Literal help icon: explains what picking "Literal…" above means.
       * Gated strictly on isGrouped — on flat/intra-tab tiers
       * (font/spacing/size/generic-tab) the same "Literal…" option means
       * "revert to the tier's default ref", a different concept that this
       * copy does not describe, so no icon renders there.
       */}
      {isGrouped && (
        <HelpIcon text={LITERAL_HELP_TEXT} ariaLabel={`${rowLabel} literal help`} />
      )}
      {/*
       * The editable literal swatch (single-mode, or the per-mode light/dark
       * pair, S12 #473) only ever appears in grouped (ramp) mode —
       * flat/intra-tab tiers (font/spacing/size/generic-tab) treat
       * "Literal…" as "revert to the tier's default ref", not a real
       * standalone value to edit (see those tabs' onChange handlers).
       */}
      {isGrouped && isLiteralValue(value) && (
        <div className="tokenpanel-per-mode-fields">
          <label className="tokenpanel-per-mode-toggle">
            <input
              type="checkbox"
              checked={typeof value.literal === 'object' && value.literal !== null}
              onChange={handleTogglePerMode}
              aria-label={`${rowLabel} per-mode (light/dark)`}
            />
            Per-mode
          </label>
          {/* Sibling of the label above, never nested inside it — activating
           *  the icon must not toggle the Per-mode checkbox. */}
          <HelpIcon text={PER_MODE_HELP_TEXT} ariaLabel={`${rowLabel} per-mode help`} />
          {typeof value.literal === 'object' && value.literal !== null ? (
            <>
              <ColorField
                value={value.literal.light}
                onChange={handleLightChange}
                valueFormat="oklch"
                label={`${rowLabel} (Light)`}
                cssVar={cssVar}
              />
              <ColorField
                value={value.literal.dark}
                onChange={handleDarkChange}
                valueFormat="oklch"
                label={`${rowLabel} (Dark)`}
                cssVar={cssVar}
              />
            </>
          ) : (
            <ColorField
              value={value.literal}
              onChange={handleLiteralChange}
              valueFormat="oklch"
              label={rowLabel}
              cssVar={cssVar}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default memo(TierRefSelector);
