/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, getScope, Show } from '@takazudo/zfb/zudo-react';
import { Checkbox, ControlledSelect } from '../zr/form-controls';
import { Rebuild } from '../zr/rebuild';
import type { TabConfig, TierConfig, TierItem } from '../tokens/tier-model';
import { ColorField } from '../components/color-picker/color-field';
import { resolvePerModeLiteral } from '../state/tweak-state';
import { read, type MaybeSignal } from '../zr/live';

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
  value: MaybeSignal<TierRefSelectorValue>;
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
  previewValueFor?: MaybeSignal<((ref: TierRefTarget) => string) | undefined>;
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

export function TierRefSelector(props: TierRefSelectorProps) {
  const { tab, tierId, itemId, onChange, cssVar } = props;
  const defaultMode = props.defaultMode ?? 'light';
  const rowLabel = props.label ?? itemId;

  // Options come from the tab config, which is fixed for a mounted row; only
  // the value and the override-aware previews change.
  const thisTier = findTier(tab, tierId);
  const rampSources = thisTier?.referencesRamps;
  const isGrouped = !!rampSources && rampSources.length > 0;
  const tabsList = props.tabs ?? [tab];

  const groups: RefGroup[] = isGrouped
    ? buildRampGroups(rampSources!, tab, tabsList)
    : (() => {
        const refTierId = thisTier?.referencesTier ?? '';
        const refTier = refTierId ? findTier(tab, refTierId) : undefined;
        return refTier ? [{ label: refTier.label, options: buildFlatOptions(refTier) }] : [];
      })();
  const allOptions = groups.flatMap((g) => g.options);

  const value = computed(() => read(props.value));
  const previewFor = (ref: TierRefTarget, fallback: string): string => {
    const fn = read(props.previewValueFor);
    return fn ? fn(ref) : fallback;
  };

  // A ref that doesn't (or no longer) resolve to a built option selects a
  // disabled "(unresolved: …)" placeholder instead of silently falling back
  // to some other option, which would misrepresent a broken reference.
  const selectedOption = computed(() => {
    const current = value.value;
    return isLiteralValue(current) ? undefined : allOptions.find((o) => refsEqual(o.ref, current.ref));
  });
  const unresolvedRef = computed<TierRefTarget | null>(() => {
    const current = value.value;
    return !isLiteralValue(current) && !selectedOption.value ? current.ref : null;
  });
  const selectedKey = computed(() => isLiteralValue(value.value)
    ? LITERAL_OPTION_VALUE
    : (selectedOption.value?.key ?? UNRESOLVED_OPTION_VALUE));

  const literalSeed = (current: TierRefSelectorValue): string => isLiteralValue(current)
    ? typeof current.literal === 'string'
      ? current.literal
      : resolvePerModeLiteral({ literal: current.literal }, defaultMode)
    : '';

  const resolvedPreview = computed(() => {
    const current = value.value;
    if (isLiteralValue(current)) return literalSeed(current);
    return previewFor(current.ref, selectedOption.value?.item.default ?? '');
  });

  const handleSelectChange = (key: string) => {
    // The placeholder is disabled, so the browser never fires a real change
    // to it — this guard is defense-in-depth, not a path users can hit.
    if (key === UNRESOLVED_OPTION_VALUE) return;
    const current = value.value;
    if (key === LITERAL_OPTION_VALUE) {
      // Seed the literal editor from whatever was visible a moment ago, so
      // the user starts from a real color rather than a blank field. Always
      // seeds a single-mode string — picking "Literal…" starts single-mode;
      // the user expands to per-mode via the "Per-mode" checkbox below. If
      // the previous value was already a per-mode literal, collapse it to
      // the cluster's default-mode side first.
      const option = selectedOption.value;
      const seed = isLiteralValue(current)
        ? literalSeed(current)
        : option
          ? previewFor(option.ref, option.item.default)
          : '';
      onChange(itemId, { literal: seed });
      return;
    }
    const opt = allOptions.find((o) => o.key === key);
    if (!opt) return;
    onChange(itemId, { ref: opt.ref });
  };

  /**
   * "Per-mode" checkbox (permitted `<label><input type="checkbox">`,
   * CLAUDE.md) — expands a single-mode literal into a light/dark pair, or
   * collapses a per-mode pair back to one value. Only meaningful while
   * `value` is already a literal (the checkbox only renders in that state).
   */
  const handleTogglePerMode = () => {
    const current = value.value;
    if (!isLiteralValue(current)) return;
    const literal = current.literal;
    if (typeof literal === 'object' && literal !== null) {
      // Collapse — keep the cluster's default-mode side (#472).
      onChange(itemId, { literal: resolvePerModeLiteral({ literal }, defaultMode) });
    } else {
      // Expand — seed both sides from the current single value.
      onChange(itemId, { literal: { light: literal, dark: literal } });
    }
  };

  const perModeLiteral = computed(() => {
    const current = value.value;
    return isLiteralValue(current) && typeof current.literal === 'object' && current.literal !== null
      ? current.literal
      : null;
  });
  const isPerMode = computed(() => perModeLiteral.value !== null);

  const handleSideChange = (side: 'light' | 'dark') => (next: string) => {
    const pair = perModeLiteral.value;
    if (!pair) return;
    onChange(itemId, { literal: { ...pair, [side]: next } });
  };

  const optionLabel = (opt: RefOption) =>
    `${opt.item.cssVar} (${truncatePreview(previewFor(opt.ref, opt.item.default))})`;

  // <option> content must be static text in zudo-react, so the select is
  // rebuilt whenever an option label or the unresolved placeholder changes.
  const optionLabels = computed(() => {
    const ref = unresolvedRef.value;
    return JSON.stringify({
      unresolved: ref ? `(unresolved: ${ref.tier}/${ref.item})` : null,
      labels: allOptions.map(optionLabel),
    });
  });

  getScope().effect(() => {
    const ref = unresolvedRef.value;
    if (ref) warnUnresolvedRefOnce(ref);
  });

  return (
    <div
      class={isGrouped
        ? 'tokenpanel-tier-ref-selector tokenpanel-tier-ref-selector--grouped'
        : 'tokenpanel-tier-ref-selector'}
    >
      {isGrouped && (
        <div
          class="tokenpanel-semantic-resolved-chip"
          aria-hidden="true"
          title={resolvedPreview}
          style={computed(() => ({ 'background-color': resolvedPreview.value }))}
        />
      )}
      <Rebuild value={optionLabels}>
        {(encoded) => {
          const { unresolved, labels } = JSON.parse(encoded) as {
            unresolved: string | null;
            labels: string[];
          };
          const labelFor = new Map(allOptions.map((opt, i) => [opt.key, labels[i]!]));
          const renderOption = (opt: RefOption) => (
            <option value={opt.key}>{labelFor.get(opt.key)!}</option>
          );
          return (
            <ControlledSelect
              value={selectedKey}
              class="tokenpanel-tier-ref-select"
              onChange={handleSelectChange}
              aria-label={`${rowLabel} tier reference`}
            >
              {unresolved === null
                ? []
                : [
                    <option value={UNRESOLVED_OPTION_VALUE} disabled>
                      {unresolved}
                    </option>,
                  ]}
              {isGrouped
                ? groups.map((group) => (
                    <optgroup label={group.label}>
                      {group.options.map(renderOption)}
                    </optgroup>
                  ))
                : allOptions.map(renderOption)}
              <option value={LITERAL_OPTION_VALUE}>Literal…</option>
            </ControlledSelect>
          );
        }}
      </Rebuild>
      {/*
       * The editable literal swatch (single-mode, or the per-mode light/dark
       * pair, S12 #473) only ever appears in grouped (ramp) mode —
       * flat/intra-tab tiers (font/spacing/size/generic-tab) treat
       * "Literal…" as "revert to the tier's default ref", not a real
       * standalone value to edit (see those tabs' onChange handlers).
       */}
      {isGrouped && (
        <Show when={computed(() => isLiteralValue(value.value))}>
          {() => (
            <div class="tokenpanel-per-mode-fields">
              <label class="tokenpanel-per-mode-toggle">
                <Checkbox
                  checked={isPerMode}
                  onChange={handleTogglePerMode}
                  aria-label={`${rowLabel} per-mode (light/dark)`}
                />
                Per-mode
              </label>
              <Show
                when={isPerMode}
                fallback={() => (
                  <ColorField
                    value={computed(() => literalSeed(value.value))}
                    onChange={(next) => onChange(itemId, { literal: next })}
                    valueFormat="oklch"
                    label={rowLabel}
                    cssVar={cssVar}
                  />
                )}
              >
                {() => (
                  <>
                    <div class="tokenpanel-per-mode-field">
                      <span class="tokenpanel-per-mode-label">Light</span>
                      <ColorField
                        value={computed(() => perModeLiteral.value?.light ?? '')}
                        onChange={handleSideChange('light')}
                        valueFormat="oklch"
                        resolveMode="light"
                        label={`${rowLabel} (Light)`}
                        cssVar={cssVar}
                      />
                    </div>
                    <div class="tokenpanel-per-mode-field">
                      <span class="tokenpanel-per-mode-label">Dark</span>
                      <ColorField
                        value={computed(() => perModeLiteral.value?.dark ?? '')}
                        onChange={handleSideChange('dark')}
                        valueFormat="oklch"
                        resolveMode="dark"
                        label={`${rowLabel} (Dark)`}
                        cssVar={cssVar}
                      />
                    </div>
                  </>
                )}
              </Show>
            </div>
          )}
        </Show>
      )}
    </div>
  );
}

export default TierRefSelector;
