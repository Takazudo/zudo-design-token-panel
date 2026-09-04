/**
 * Color tab — verbatim port of zudo-doc's
 * `src/components/design-token-tweak/tabs/color-tab.tsx`, rewired to the
 * design-token-panel module paths:
 *
 *   @/config/color-schemes       → ../config/color-schemes
 *   @/config/color-scheme-utils  → ../config/color-scheme-utils
 *   @/utils/color-convert        → ../utils/color-convert
 *   ../state/tweak-state         → ../state/tweak-state (unchanged)
 *   ../state/persist             → ../state/persist    (unchanged)
 *
 * Acceptance criterion (rejection-fix): every Base / Semantic Tokens row is
 * a `PaletteSelector` — the only way to edit those values is to pick a
 * palette index (p0–p15) or one of the `bg`/`fg` extras. The Palette
 * swatches themselves are the only inputs that edit a color directly — a
 * hex by default, or an `oklch(...)` string when the palette tier declares
 * `type.format: 'oklch'` — via the color-picker popover. No raw-color
 * inputs (rgb / hex text field / lab) are exposed for Base or Semantic rows;
 * those rows reference palette slots, so they inherit OKLCH transitively the
 * moment the palette holds `oklch()` values.
 *
 * Shiki integration is out of scope — the `shikiTheme` field stays on
 * state + persist + serde for envelope round-tripping with upstream
 * exports, and `applyShikiTheme` is a no-op stub. We hide the
 * shikiTheme `<select>` JSX block here but leave every state/apply touch
 * point intact. `SHIKI_THEMES` is therefore no longer imported in this file
 * (would trip `noUnusedLocals`); re-add it if/when the JSX block lands.
 *
 * The optional secondary cluster ships alongside the primary cluster. The
 * two clusters share the same `ColorSwatch` + `PaletteSelector` primitives —
 * the secondary cluster renders its palette and semantic dropdowns below
 * the primary sections. Whether it ships a Base subsection depends on the
 * cluster's declared base roles. Section headings are prefixed
 * `Primary — ` / `Secondary — ` so the two clusters are visually distinct
 * in the panel.
 */

import { memo, useState, useEffect, useCallback, useMemo, useRef, useId } from 'preact/compat';
import type { ColorScheme } from '../config/color-schemes';
import { pushDismissLayer } from '../controls/dismiss-layer';
import ColorPicker from '../components/color-picker';
import ColorField from '../components/color-picker/color-field';
import { Z } from '../styles/z-index-tokens';
import type { ColorPickerValueFormat } from '../components/color-picker/color-picker';
import {
  type ColorTweakState,
  type SemanticValue,
  applyShikiTheme,
  getClusterDefaultMode,
  initColorFromSchemeData,
  isIndexMapping,
  isLiteralMapping,
  isRefMapping,
  resolvePaletteCssVar,
  resolvePerModeLiteral,
} from '../state/tweak-state';
import type { TabOverrides } from '../apply/tier-resolver';
import { getPanelConfig, type PanelConfig } from '../config/panel-config';
import { resolveColorClusterFromTab } from '../config/cluster-config';
import type { TabConfig, TierConfig } from '../tokens/tier-model';
import type { PersistColor, PersistSecondary } from '../state/persist';
import { HighlightToggleButton } from '../highlight/highlight-toggle-button';
import { TokenLabel } from '../controls/token-label';
import { useTooltip } from '../controls/tooltip';
import { HelpIcon, SEMANTIC_TOKENS_HELP_TEXT } from '../controls/help-icon';
import TierRefSelector, {
  type TierRefSelectorValue,
  type TierRefTarget,
} from '../controls/tier-ref-selector';
import type { TokenAddress } from './flat/types';
import { tokenAddressKey } from './flat/types';
import { matchesSearchFields, stringifySearchValue } from '../search/token-search';

// The bundled scheme registry now lives on
// `panelConfig.colorCluster.colorSchemes`, not on a global import. Read it
// at render time so a host that calls `configurePanel` before mount sees
// its own schemes in the Scheme… dropdown.
//
// The optional preset list (Dracula / Solarized / Tokyo Night / ...) was
// relocated out of the package entirely. Hosts hand the panel a
// `colorPresets` map via `PanelConfig`; the package itself ships zero
// presets. The Color tab reads the active map at render time below —
// `presetNames` is no longer a module-level constant computed from a
// baked-in import.

/**
 * `PaletteSelector` (below) only understands the legacy index shape — it
 * renders a palette-slot dropdown, not a literal-color or ramp-ref editor.
 * `semanticMappings` / `semanticDefaults` were widened to `SemanticValue`
 * (#459 S1). Every `{ literal }` variant — single-mode `{ literal: string }`
 * AND per-mode `{ literal: { light, dark } }` (#472) — renders through
 * `SemanticLiteralRow` (S3 #464 / S12 #473); `{ ref }` and any `{ literal }`
 * on a tier that declares `referencesRamps` render through the grouped
 * ref-or-literal `TierRefSelector` (S9 #470 / S12 #473) instead — see the
 * Semantic Tokens section below. This helper is only reached for plain
 * index mappings now.
 */
function toIndexMappingForSelector(v: SemanticValue): number | 'bg' | 'fg' {
  return isIndexMapping(v) ? v : 0;
}

/**
 * Finds the `semantic: true` tier (if any) in `tab` that owns the item with
 * id `itemId`. Used to look up a semantic key's declared `referencesRamps`
 * so the render loop below can decide whether to route it through the
 * grouped ref-or-literal picker. Legacy `referencesTier`-only tiers (the
 * intra-tab index-mapping style, e.g. a plain "semantic" tier pointing at a
 * sibling "palette" tier) are NOT matched here — they aren't marked
 * `semantic: true` and keep rendering through `PaletteSelector` as before.
 */
function findSemanticTier(tab: TabConfig, itemId: string): TierConfig | undefined {
  return tab.tiers.find((t) => t.semantic === true && t.items.some((i) => i.id === itemId));
}

/** Legacy color manifests mark semantic rows with referencesTier rather than
 * `semantic: true`; retain a stable address for both shapes. */
function findColorSemanticTier(
  tab: TabConfig,
  itemId: string,
  paletteTier: TierConfig | undefined,
): TierConfig | undefined {
  return tab.tiers.find((tier) =>
    tier.items.some((item) => item.id === itemId) &&
    (tier.semantic === true || (paletteTier !== undefined && tier.referencesTier === paletteTier.id)),
  );
}

function colorSearchMatch(
  query: string,
  fields: { cssVar?: string; id: string; label: string; value: unknown; tierLabel: string },
): boolean {
  return matchesSearchFields({
    cssVar: fields.cssVar ?? '',
    id: fields.id,
    label: fields.label,
    value: stringifySearchValue(fields.value),
    tierLabel: fields.tierLabel,
  }, query);
}

// --- Shared popover helpers (Color-tab scoped) ---

/**
 * Close popover on outside click, Escape, or ancestor scroll.
 *
 * Escape is arbitrated by the shared dismiss-layer stack (F10): only the
 * topmost open layer consumes a single Escape, so dismissing this listbox never
 * also tears down the panel underneath. `onEscape` (when given) lets the caller
 * restore focus to the trigger on Escape — a keyboard-only concern that the
 * outside-click / scroll paths deliberately do not trigger.
 */
function usePopoverClose(
  containerRef: React.RefObject<HTMLElement | null>,
  onClose: () => void,
  isOpen: boolean,
  onEscape?: () => void,
) {
  // Keep the latest Escape handler in a ref so the once-per-open stack layer
  // always calls the current closure.
  const onEscapeRef = useRef<() => void>(onEscape ?? onClose);
  onEscapeRef.current = onEscape ?? onClose;

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    const removeLayer = pushDismissLayer({
      onEscape: () => onEscapeRef.current(),
      getElement: () => containerRef.current,
    });
    return () => {
      document.removeEventListener('mousedown', handleClick);
      removeLayer();
    };
  }, [isOpen, onClose, containerRef]);

  useEffect(() => {
    if (!isOpen) return;
    function handleScroll() {
      onClose();
    }
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen, onClose]);
}

/**
 * Compute fixed popover position with viewport-aware flip.
 *
 * Returns only the dynamic positioning bits (`position`, `left`, `top` /
 * `bottom`, `zIndex`) plus any caller-supplied extras. Visual chrome
 * (border-radius, box-shadow, border, background) lives on the popover's
 * className in panel.css — the inline style is reserved for values that
 * literally cannot be expressed in CSS today (per-anchor-rect coordinates).
 */
// Z.colorPicker is reused here for the palette-options listbox popover —
// a different element from the OklchPicker card (color-picker.css), but at the
// same tier in the stacking order. Both need to sit above the panel shell.
function getFixedPopoverStyle(
  anchor: HTMLElement | null,
  estW: number,
  estH: number,
  extraStyle?: React.CSSProperties,
): React.CSSProperties {
  if (!anchor) return { position: 'fixed', zIndex: Z.colorPicker, ...extraStyle };
  const rect = anchor.getBoundingClientRect();
  const gap = 4;
  const pad = 8;
  const below = window.innerHeight - rect.bottom - pad;
  const above = rect.top - pad;
  const flipAbove = below < estH && above > below;
  let left = rect.left;
  if (left + estW > window.innerWidth - pad) left = window.innerWidth - pad - estW;
  if (left < pad) left = pad;
  const style: React.CSSProperties = {
    position: 'fixed',
    left,
    zIndex: Z.colorPicker,
    ...extraStyle,
  };
  if (flipAbove) {
    style.bottom = window.innerHeight - rect.top + gap;
  } else {
    style.top = rect.bottom + gap;
  }
  return style;
}

// --- Palette format resolution ---

/**
 * Find the palette tier in a color tab: the first non-reference, non-semantic
 * tier whose items are color-kind. Mirrors the palette-tier detection in
 * `resolveColorClusterFromTab`, so the format lookup keys off the SAME tier the
 * cluster was flattened from. `resolveColorClusterFromTab` drops the per-item
 * `type.format`, so the swatch grid must recover it from the tier here. A tier
 * marked `semantic: true` is excluded (#461) even if its items are color-kind.
 */
function findPaletteTier(tab: TabConfig): TierConfig | undefined {
  return tab.tiers.find(
    (t) =>
      !t.referencesTier &&
      !t.semantic &&
      t.items.length > 0 &&
      t.items[0].type.kind === 'color',
  );
}

/**
 * Resolve the ColorPicker value format for the palette slot at `index`.
 * Returns `'oklch'` when the palette tier item declares
 * `type.format: 'oklch'`, otherwise `'hex'` (the back-compatible default —
 * `format` is optional, added 0.3.3).
 */
function resolvePaletteFormat(
  paletteTier: TierConfig | undefined,
  index: number,
): ColorPickerValueFormat {
  const item = paletteTier?.items[index];
  if (item && item.type.kind === 'color' && item.type.format === 'oklch') {
    return 'oklch';
  }
  return 'hex';
}

// --- UI Components ---

/**
 * Single palette swatch with color-picker popover.
 *
 * `onChange` is `(index, value)` — the swatch passes its own palette `index`
 * back so the parent can use a single stable handler across every cell,
 * keeping React.memo effective. `value` is a hex string by default, or an
 * `oklch(...)` string when `valueFormat` is `'oklch'`. The same component is
 * reused by both the primary and secondary palettes because the `onChange`
 * shape is parameterised on the parent's per-cluster handler.
 */
const ColorSwatch = memo(function ColorSwatch({
  color,
  onChange,
  index,
  label,
  cssVar,
  valueFormat = 'hex',
  address,
}: {
  color: string;
  onChange: (index: number, value: string) => void;
  index: number;
  label: string;
  /** CSS custom property name (e.g. `--zd-p3`) used to wire the eye toggle.
   *  When present, a HighlightToggleButton appears in the swatch label row. */
  cssVar?: string;
  /** Output format for the swatch's ColorPicker. `'oklch'` routes the edit
   *  through the lossless OKLCH editor (emits `oklch(...)`); `'hex'` (default)
   *  keeps the native hex behavior. */
  valueFormat?: ColorPickerValueFormat;
  /** Stable address used by command-palette navigation. */
  address?: TokenAddress;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const handleClose = useCallback(() => setIsOpen(false), []);
  const handleColorChange = useCallback(
    (value: string) => {
      onChange(index, value);
    },
    [onChange, index],
  );
  const handleToggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const tooltipProps = useTooltip(`${label}: ${color}`);
  return (
    <div
      className="tokenpanel-color-swatch-wrap"
      {...(address ? { 'data-address': tokenAddressKey(address) } : {})}
    >
      <div
        ref={buttonRef}
        role="button"
        tabIndex={0}
        className="tokenpanel-color-swatch-button"
        style={{ backgroundColor: color }}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
        aria-label={`${label}: ${color}`}
        aria-expanded={isOpen}
        {...tooltipProps}
      />
      {isOpen && (
        <ColorPicker
          color={color}
          onChange={handleColorChange}
          valueFormat={valueFormat}
          label={label}
          onClose={handleClose}
          anchorRef={buttonRef}
        />
      )}
      <div className="tokenpanel-color-swatch-label-row">
        <span className="tokenpanel-color-swatch-label">
          {label}
        </span>
        {cssVar && <HighlightToggleButton cssVar={cssVar} />}
      </div>
    </div>
  );
});

/**
 * Palette index selector — fixed-position dropdown with viewport-aware flip.
 *
 * `onChange` is `(idKey, val)` — the selector passes its own `idKey` (the
 * semantic key, base-role name, etc. that identifies which row this is) back
 * so the parent can use a single stable handler across every selector,
 * keeping React.memo effective.
 */
const PaletteSelector = memo(function PaletteSelector({
  label,
  idKey,
  value,
  palette,
  paletteCssVar,
  onChange,
  extraOptions,
  background,
  foreground,
  cssVar,
  address,
}: {
  label: string;
  /** Stable identifier for this row, passed back to `onChange` so the
   *  parent's handler can dispatch on it. */
  idKey: string;
  value: number | 'bg' | 'fg';
  palette: string[];
  /**
   * Maps a palette index to its full CSS custom-property name (e.g.
   * `--zd-p7`, `--app-secondary-pa3`). Used for the popover swatches'
   * `title` / `aria-label` so assistive tech sees the real variable name,
   * not a short `p7` key. Defaults to `--zd-p${i}` for backward
   * compatibility.
   */
  paletteCssVar?: (i: number) => string;
  onChange: (idKey: string, val: number | 'bg' | 'fg') => void;
  extraOptions?: ('bg' | 'fg')[];
  background?: string;
  foreground?: string;
  /** CSS custom property this row maps to (e.g. `--fixture-semantic-accent`).
   *  Omit for rows that have no real cssVar in the document (e.g. `background`,
   *  `foreground` Base knobs which are panel-internal palette indices). */
  cssVar?: string;
  /** Stable address used by command-palette navigation. */
  address?: TokenAddress;
}) {
  const resolvePaletteCssVar = paletteCssVar ?? ((i: number) => `--zd-p${i}`);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const handleClose = useCallback(() => setIsOpen(false), []);
  const handleToggle = useCallback(() => setIsOpen((prev) => !prev), []);
  // Restore focus to the trigger when the listbox is dismissed by keyboard (F12).
  const closeAndFocusTrigger = useCallback(() => {
    setIsOpen(false);
    buttonRef.current?.focus();
  }, []);

  const resolvedColor =
    value === 'bg'
      ? (background ?? '#000000')
      : value === 'fg'
        ? (foreground ?? '#ffffff')
        : (palette[value] ?? '#000000');

  const valueLabel = value === 'bg' ? 'bg' : value === 'fg' ? 'fg' : `p${value}`;

  // Escape returns focus to the trigger (F12); outside-click / scroll do not.
  usePopoverClose(containerRef, handleClose, isOpen, closeAndFocusTrigger);

  const tooltipProps = useTooltip(`${label}: ${valueLabel}`);

  // --- Container-owned keyboard navigation (listbox policy, F12) -------------
  // The role="option" children stay click-only and unfocusable; THIS container
  // owns arrow / Home / End / Enter / Space, tracking a roving active option via
  // aria-activedescendant. Options render as extras (bg/fg) first, then the
  // palette grid — treated here as one flat, linearly-navigable sequence.
  const optionValues = useMemo<(number | 'bg' | 'fg')[]>(
    () => [...(extraOptions ?? []), ...palette.map((_, i) => i)],
    [extraOptions, palette],
  );
  const extrasCount = extraOptions?.length ?? 0;
  const baseId = useId();
  const optionId = (val: number | 'bg' | 'fg') => `${baseId}-opt-${val}`;
  const [activeIndex, setActiveIndex] = useState(0);
  const activeValue = optionValues[activeIndex];

  // On open, focus the listbox (so it owns keyboard nav) and seed the active
  // option to the currently-selected value.
  useEffect(() => {
    if (!isOpen) return;
    const selIdx = optionValues.findIndex((v) => v === value);
    setActiveIndex(selIdx >= 0 ? selIdx : 0);
    listboxRef.current?.focus();
    // Seed only on the open transition — deliberately not re-run on value /
    // option changes while already open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function select(val: number | 'bg' | 'fg') {
    onChange(idKey, val);
    setIsOpen(false);
  }

  function handleListboxKeyDown(e: KeyboardEvent) {
    const count = optionValues.length;
    if (count === 0) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(count - 1, i + 1));
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(count - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const val = optionValues[activeIndex];
      if (val !== undefined) {
        select(val);
        buttonRef.current?.focus();
      }
    }
    // Escape is handled by the shared dismiss-layer stack (see usePopoverClose):
    // it closes this listbox and restores focus to the trigger.
  }

  return (
    <div
      className="tokenpanel-palette-selector"
      ref={containerRef}
      {...(address ? { 'data-address': tokenAddressKey(address) } : {})}
    >
      <div
        ref={buttonRef}
        role="button"
        tabIndex={0}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          } else if (e.key === 'ArrowDown') {
            // Open (never toggle shut) and let the open effect move focus into
            // the listbox so arrow keys navigate options (F12).
            e.preventDefault();
            if (!isOpen) setIsOpen(true);
          }
        }}
        className="tokenpanel-palette-trigger"
        aria-label={`${label}: ${valueLabel}`}
        aria-expanded={isOpen}
        {...tooltipProps}
      >
        <span className="tokenpanel-palette-trigger-label">
          {label}
        </span>
        <div
          className="tokenpanel-palette-trigger-color"
          style={{ backgroundColor: resolvedColor }}
        />
        <span className="tokenpanel-palette-trigger-value">{valueLabel}</span>
        <svg
          className="tokenpanel-palette-trigger-icon"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {cssVar && <HighlightToggleButton cssVar={cssVar} />}

      {isOpen && (
        <div
          ref={listboxRef}
          role="listbox"
          tabIndex={0}
          aria-label={`${label} color options`}
          aria-activedescendant={activeValue !== undefined ? optionId(activeValue) : undefined}
          onKeyDown={handleListboxKeyDown}
          className="tokenpanel-palette-options"
          style={getFixedPopoverStyle(buttonRef.current, 440, extraOptions ? 160 : 120)}
        >
          {/* Extra options (bg/fg) */}
          {extraOptions && extraOptions.length > 0 && (
            <div className="tokenpanel-palette-options-extras">
              {extraOptions.map((opt, extraIdx) => {
                const optColor =
                  opt === 'bg' ? (background ?? '#000000') : (foreground ?? '#ffffff');
                const isSelected = value === opt;
                const isActive = activeIndex === extraIdx;
                return (
                  <div
                    key={opt}
                    id={optionId(opt)}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => select(opt)}
                    className={[
                      'tokenpanel-palette-extra-option',
                      isSelected ? 'is-selected' : '',
                      isActive ? 'is-active' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div
                      className="tokenpanel-palette-extra-color"
                      style={{ backgroundColor: optColor }}
                    />
                    <span className="tokenpanel-palette-extra-label">{opt}</span>
                  </div>
                );
              })}
            </div>
          )}
          {/* Palette grid */}
          <div className="tokenpanel-palette-options-grid">
            {palette.map((color, i) => {
              const isSelected = value === i;
              const isActive = activeIndex === extrasCount + i;
              const cssVar = resolvePaletteCssVar(i);
              return (
                <div
                  key={i}
                  id={optionId(i)}
                  role="option"
                  aria-selected={isSelected}
                  aria-label={`${cssVar}: ${color}`}
                  onClick={() => select(i)}
                  title={`${cssVar}: ${color}`}
                  className={[
                    'tokenpanel-palette-option-button',
                    isSelected ? 'is-selected' : '',
                    isActive ? 'is-active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ backgroundColor: color }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * Semantic-token row for a `{ literal: string }` OR per-mode
 * `{ literal: { light, dark } }` mapping (S3 #464 / S12 #473): an editable
 * OKLCH `ColorField` swatch instead of `PaletteSelector`'s palette-index
 * dropdown — the value is a standalone color, not a slot into
 * `state.palette`, so there is no palette to pick from. Mirrors the
 * `.tokenpanel-row` layout used by `generic-tab.tsx`'s own `format: 'oklch'`
 * color rows (`TokenLabel` + `ColorField` + eye toggle) for visual
 * consistency across the panel.
 *
 * A "Per-mode" checkbox (`<label><input type="checkbox">`, both permitted by
 * the panel DOM-hygiene policy) switches between a single `ColorField` and a
 * light/dark pair, each edited independently via its own `ColorField`.
 * Checking it seeds both sides from the current single value; unchecking it
 * collapses back to one value — the cluster's `defaultMode` side, via
 * `resolvePerModeLiteral` (#472's runtime helper for exactly this).
 *
 * `onChange` is `(idKey, value)` — same stable-callback shape as
 * `PaletteSelector` / `ColorSwatch` above, so a single handler covers every
 * row and `memo` stays effective.
 *
 * Only reached for a tier with NO `referencesRamps` declared — a tier that
 * does declare ramp sources renders `SemanticRefOrLiteralRow` instead (S9
 * #470 / S12 #473), even for its literal-mode rows, so the user can switch
 * back to a ramp reference.
 */
const SemanticLiteralRow = memo(function SemanticLiteralRow({
  label,
  idKey,
  value,
  onChange,
  cssVar,
  defaultMode = 'light',
  address,
}: {
  label: string;
  idKey: string;
  value: { literal: string } | { literal: { light: string; dark: string } };
  onChange: (
    idKey: string,
    val: { literal: string } | { literal: { light: string; dark: string } },
  ) => void;
  cssVar?: string;
  /** The cluster's `getClusterDefaultMode()` result (#472) — the side kept
   *  when the user unchecks "Per-mode". Defaults to `'light'`. */
  defaultMode?: 'light' | 'dark';
  address?: TokenAddress;
}) {
  const literalValue = value.literal;
  const isPerMode = typeof literalValue === 'object' && literalValue !== null;
  const resolvedPreview = isPerMode
    ? resolvePerModeLiteral({ literal: literalValue }, defaultMode)
    : literalValue;

  const handleTogglePerMode = useCallback(() => {
    const current = value.literal;
    if (typeof current === 'object' && current !== null) {
      onChange(idKey, { literal: resolvePerModeLiteral({ literal: current }, defaultMode) });
    } else {
      onChange(idKey, { literal: { light: current, dark: current } });
    }
  }, [value, defaultMode, onChange, idKey]);

  const handleSingleChange = useCallback(
    (next: string) => onChange(idKey, { literal: next }),
    [onChange, idKey],
  );

  const handleLightChange = useCallback(
    (next: string) => {
      const current = value.literal;
      if (typeof current !== 'object' || current === null) return;
      onChange(idKey, { literal: { light: next, dark: current.dark } });
    },
    [value, onChange, idKey],
  );

  const handleDarkChange = useCallback(
    (next: string) => {
      const current = value.literal;
      if (typeof current !== 'object' || current === null) return;
      onChange(idKey, { literal: { light: current.light, dark: next } });
    },
    [value, onChange, idKey],
  );

  return (
    <div
      className="tokenpanel-row"
      data-testid={`tokenpanel-semantic-literal-${idKey}`}
      {...(address ? { 'data-address': tokenAddressKey(address) } : {})}
    >
      <TokenLabel cssVar={cssVar ?? idKey} label={label} />
      <div
        className="tokenpanel-semantic-resolved-chip"
        aria-hidden="true"
        title={resolvedPreview}
        style={{ backgroundColor: resolvedPreview }}
      />
      <label className="tokenpanel-per-mode-toggle">
        <input
          type="checkbox"
          checked={isPerMode}
          onChange={handleTogglePerMode}
          aria-label={`${label} per-mode (light/dark)`}
        />
        Per-mode
      </label>
      {typeof value.literal === 'object' && value.literal !== null ? (
        <div className="tokenpanel-per-mode-fields">
          <div className="tokenpanel-per-mode-field">
            <span className="tokenpanel-per-mode-label">Light</span>
            <ColorField
              value={value.literal.light}
              onChange={handleLightChange}
              valueFormat="oklch"
              label={`${label} (Light)`}
              cssVar={cssVar}
            />
          </div>
          <div className="tokenpanel-per-mode-field">
            <span className="tokenpanel-per-mode-label">Dark</span>
            <ColorField
              value={value.literal.dark}
              onChange={handleDarkChange}
              valueFormat="oklch"
              label={`${label} (Dark)`}
              cssVar={cssVar}
            />
          </div>
        </div>
      ) : (
        <ColorField
          value={value.literal}
          onChange={handleSingleChange}
          valueFormat="oklch"
          label={label}
          cssVar={cssVar}
        />
      )}
      {cssVar && <HighlightToggleButton cssVar={cssVar} />}
    </div>
  );
});

/**
 * Semantic-token row for a tier that declares `referencesRamps` (S9, #470):
 * wraps `TierRefSelector`'s grouped ref-or-literal control with the same
 * `.tokenpanel-row` (`TokenLabel` + control + eye toggle) layout every other
 * semantic row uses. Handles both current-value shapes the selector reads —
 * `{ ref }` (a cross-tab ramp item) and single-mode `{ literal }` (a
 * standalone OKLCH color, editable in place) — and can switch between them.
 *
 * `onChange` is `(idKey, next: TierRefSelectorValue)` — mirrors the
 * `SemanticValue` `{ ref } | { literal }` shape one-for-one, so the caller's
 * handler just needs to spread it straight into `semanticMappings`.
 */
const SemanticRefOrLiteralRow = memo(function SemanticRefOrLiteralRow({
  label,
  idKey,
  tab,
  tabs,
  tierId,
  value,
  onChange,
  previewValueFor,
  cssVar,
  defaultMode,
  address,
}: {
  label: string;
  idKey: string;
  tab: TabConfig;
  tabs: readonly TabConfig[];
  tierId: string;
  value: TierRefSelectorValue;
  onChange: (idKey: string, next: TierRefSelectorValue) => void;
  previewValueFor: (ref: TierRefTarget) => string;
  cssVar?: string;
  /** The cluster's `getClusterDefaultMode()` result (#472) — forwarded to
   *  `TierRefSelector` for its per-mode collapse-to-single-mode fallback. */
  defaultMode?: 'light' | 'dark';
  address?: TokenAddress;
}) {
  return (
    <div
      className="tokenpanel-row"
      data-testid={`tokenpanel-semantic-ref-${idKey}`}
      {...(address ? { 'data-address': tokenAddressKey(address) } : {})}
    >
      <TokenLabel cssVar={cssVar ?? idKey} label={label} />
      <TierRefSelector
        tab={tab}
        tabs={tabs}
        tierId={tierId}
        itemId={idKey}
        value={value}
        onChange={onChange}
        previewValueFor={previewValueFor}
        label={label}
        cssVar={cssVar}
        defaultMode={defaultMode}
      />
      {cssVar && <HighlightToggleButton cssVar={cssVar} />}
    </div>
  );
});

/**
 * Resolve an override-aware ramp preview for grouped picker labels and the
 * semantic row's decorative chip. Unknown targets retain the prior fallback
 * to the referenced item id so an unresolved ref remains visibly unresolved.
 */
function makeRampPreview(
  currentTab: TabConfig,
  tabs: readonly TabConfig[],
  tabOverrides: Record<string, TabOverrides>,
): (ref: TierRefTarget) => string {
  return (ref) => {
    const targetTab = ref.tab === undefined ? currentTab : tabs.find((t) => t.id === ref.tab);
    const targetTier = targetTab?.tiers.find((t) => t.id === ref.tier);
    const item = targetTier?.items.find((i) => i.id === ref.item);
    if (!item) return ref.item;
    return tabOverrides[ref.tab ?? currentTab.id]?.[ref.tier]?.[ref.item] ?? item.default;
  };
}

// --- Color tab body ---

interface ColorTabProps {
  /**
   * The color tab's TabConfig. Provides palette + semantic tiers and
   * colorExtras (schemes, base roles, panel settings).
   */
  tab: TabConfig;
  state: ColorTweakState;
  persistColor: PersistColor;
  /**
   * Secondary cluster tab, or `null` when the host has no secondary color tab.
   * When non-null, its state + persist callbacks render the secondary sections.
   */
  secondaryTab: TabConfig | null;
  secondaryState: ColorTweakState | null;
  persistSecondary: PersistSecondary;
  /**
   * The mounted panel instance's config (multi-instance, #353/#357). When
   * supplied, cross-tab cluster/ref resolution (cluster derivation, the
   * grouped ref-or-literal picker's ramp groups, preview resolution, and the
   * host preset list) reads THIS instance's `tabs` / `colorPresets` rather
   * than the active default instance — matching the apply path, which
   * already resolves against `cfg.tabs` via `usePersist` (`applyFullState`,
   * `state/persist.ts`). Omitted (e.g. a direct test render) →
   * `getPanelConfig()`, preserving the single-instance path.
   */
  instanceConfig?: PanelConfig;
  /** Live generic-tab overrides used by ramp preview chips and option labels. */
  tabOverrides?: Record<string, TabOverrides>;
  /** Header-filter query applied to palette and semantic rows. */
  searchQuery?: string;
}

export default function ColorTab({
  tab,
  state,
  persistColor,
  secondaryTab,
  secondaryState,
  persistSecondary,
  instanceConfig,
  tabOverrides = {},
  searchQuery = '',
}: ColorTabProps) {
  // Derive the cluster from the tab's colorExtras + tiers. This provides the
  // same shape that the rest of the panel (apply, clear, state) expects.
  // The full tabs array is threaded in so a semantic tier's cross-tab `{ ref }`
  // mappings resolve against a ramp tier in another tab (e.g. the Palette tab).
  const cfg = instanceConfig ?? getPanelConfig();
  const allTabs = cfg.tabs;
  const cluster = useMemo(() => resolveColorClusterFromTab(tab, allTabs), [tab, allTabs]);
  // Fallback to an empty stub cluster when the tab has no colorExtras.
  const safeCluster = useMemo(
    () =>
      cluster ?? {
        id: 'stub',
        paletteSize: 0,
        baseRoles: {},
        paletteCssVarTemplate: '--stub-p{n}',
        semanticDefaults: {},
        semanticCssNames: {},
        baseDefaults: {},
        defaultShikiTheme: 'dracula',
        colorSchemes: {},
        panelSettings: { colorScheme: '', colorMode: false as const },
      },
    [cluster],
  );
  // Secondary cluster derived from the secondary tab (if any).
  const secondaryCluster = useMemo(
    () => (secondaryTab ? resolveColorClusterFromTab(secondaryTab, allTabs) ?? null : null),
    [secondaryTab, allTabs],
  );
  // Each cluster's configured default light/dark mode (#472) — the side a
  // per-mode literal collapses to when the user unchecks "Per-mode" (S12,
  // #473). Secondary falls back to 'light' (matching `getClusterDefaultMode`'s
  // own default) when there's no secondary cluster at all.
  const primaryDefaultMode = useMemo(() => getClusterDefaultMode(safeCluster), [safeCluster]);
  const secondaryDefaultMode = useMemo(
    () => (secondaryCluster ? getClusterDefaultMode(secondaryCluster) : 'light'),
    [secondaryCluster],
  );
  // Host-supplied preset list. Read through the panel
  // config so a host that calls `configurePanel({ ..., colorPresets })`
  // surfaces its presets in the Scheme... dropdown. The package itself
  // ships zero presets — `colorPresets` defaults to `{}` on
  // `DEFAULT_PANEL_CONFIG` so a host that omits the field sees only
  // `cluster.colorSchemes` (the bundled, cluster-local scheme registry).
  const hostPresets = cfg.colorPresets ?? {};
  // Cluster-bundled schemes win on key collision: they are the cluster
  // owner's documented defaults (e.g. "Default Light" / "Default Dark"),
  // and the host preset list is the broader experimentation pool.
  const allPresets = useMemo<Record<string, ColorScheme>>(
    () => ({ ...hostPresets, ...safeCluster.colorSchemes }),
    [hostPresets, safeCluster.colorSchemes],
  );
  const bundledNames = useMemo(() => Object.keys(safeCluster.colorSchemes), [safeCluster.colorSchemes]);
  const presetNames = useMemo(() => Object.keys(hostPresets).sort(), [hostPresets]);

  // Section headings derive from `safeCluster.label` (or
  // `safeCluster.id.toUpperCase()` as a fallback) so a host-supplied cluster
  // gets its sections labelled with whatever the host configured.
  const primaryLabel = safeCluster.label ?? safeCluster.id.toUpperCase();
  const secondaryLabel = secondaryCluster?.label ?? secondaryCluster?.id.toUpperCase() ?? '';

  // Stable per-cluster `paletteCssVar` callbacks — passed into memoised
  // ColorSwatch / PaletteSelector so prop equality holds across renders.
  const clusterPaletteCssVar = useCallback(
    (i: number) => resolvePaletteCssVar(safeCluster, i),
    [safeCluster],
  );
  // Returns `null` (instead of a no-op fn) when the host opted out so we
  // can short-circuit the secondary section render below without a stray
  // resolver hanging around the closure list.
  const secondaryPaletteCssVar = useCallback(
    (i: number) => (secondaryCluster ? resolvePaletteCssVar(secondaryCluster, i) : ''),
    [secondaryCluster],
  );

  // The palette tier carries the per-slot `type.format` that
  // `resolveColorClusterFromTab` flattens away — recover it here so the swatch
  // grid can route oklch-format slots through the lossless OKLCH editor.
  const paletteTier = useMemo(() => findPaletteTier(tab), [tab]);
  const secondaryPaletteTier = useMemo(
    () => (secondaryTab ? findPaletteTier(secondaryTab) : undefined),
    [secondaryTab],
  );

  const query = searchQuery.trim();
  const primarySemanticRows = useMemo(
    () => Object.entries(safeCluster.semanticDefaults).map(([key, defaultVal]) => {
      const semanticTier = findColorSemanticTier(tab, key, paletteTier);
      const mapping = state.semanticMappings[key] ?? defaultVal;
      return {
        key,
        defaultVal,
        mapping,
        semanticTier,
        label: semanticTier?.items.find((item) => item.id === key)?.label ?? key,
        cssVar: safeCluster.semanticCssNames[key],
      };
    }),
    [paletteTier, safeCluster, state.semanticMappings, tab],
  );
  const secondarySemanticRows = useMemo(
    () => secondaryCluster && secondaryTab && secondaryState
      ? Object.entries(secondaryCluster.semanticDefaults).map(([key, defaultVal]) => {
          const semanticTier = findColorSemanticTier(secondaryTab, key, secondaryPaletteTier);
          const mapping = secondaryState.semanticMappings[key] ?? defaultVal;
          return {
            key,
            defaultVal,
            mapping,
            semanticTier,
            label: semanticTier?.items.find((item) => item.id === key)?.label ?? key,
            cssVar: secondaryCluster.semanticCssNames[key],
          };
        })
      : [],
    [secondaryCluster, secondaryPaletteTier, secondaryState, secondaryTab],
  );
  const primaryPaletteMatches = useMemo(
    () => paletteTier?.items.map((item, index) => colorSearchMatch(query, {
      cssVar: resolvePaletteCssVar(safeCluster, index),
      id: item.id,
      label: item.label,
      value: state.palette[index] ?? item.default,
      tierLabel: paletteTier.label,
    })) ?? [],
    [paletteTier, query, safeCluster, state.palette],
  );
  const primarySemanticMatches = useMemo(
    () => primarySemanticRows.map(({ key, mapping, semanticTier, cssVar, label }) => colorSearchMatch(query, {
      cssVar,
      id: key,
      label: `${label} ${cssVar ?? key}`,
      value: mapping,
      tierLabel: semanticTier?.label ?? 'Semantic Tokens',
    })),
    [primarySemanticRows, query],
  );
  const secondaryPaletteMatches = useMemo(
    () => secondaryPaletteTier && secondaryState
      ? secondaryPaletteTier.items.map((item, index) => colorSearchMatch(query, {
          cssVar: secondaryCluster ? resolvePaletteCssVar(secondaryCluster, index) : item.cssVar,
          id: item.id,
          label: item.label,
          value: secondaryState.palette[index] ?? item.default,
          tierLabel: secondaryPaletteTier.label,
        }))
      : [],
    [query, secondaryCluster, secondaryPaletteTier, secondaryState],
  );
  const secondarySemanticMatches = useMemo(
    () => secondarySemanticRows.map(({ key, mapping, semanticTier, cssVar, label }) => colorSearchMatch(query, {
      cssVar,
      id: key,
      label: `${label} ${cssVar ?? key}`,
      value: mapping,
      tierLabel: semanticTier?.label ?? 'Semantic Tokens',
    })),
    [query, secondarySemanticRows],
  );
  const showPrimaryPalette = !query || primaryPaletteMatches.some(Boolean);
  const showPrimarySemantic = !query || primarySemanticMatches.some(Boolean);
  const showSecondaryPalette = !query || secondaryPaletteMatches.some(Boolean);
  const showSecondarySemantic = !query || secondarySemanticMatches.some(Boolean);

  const handlePaletteChange = useCallback(
    (index: number, value: string) => {
      persistColor((prev) => ({
        ...prev,
        palette: prev.palette.map((c, i) => (i === index ? value : c)),
      }));
    },
    [persistColor],
  );

  // The deps array intentionally omits `secondaryState` — the persist hook
  // always invokes the updater with the latest slice value (`prev` is
  // always defined when the slice has been initialised). Including
  // `secondaryState` would force a fresh callback identity on every state
  // change, defeating the React.memo wrapping further down the tree.
  const handleSecondaryPaletteChange = useCallback(
    (index: number, value: string) => {
      persistSecondary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          palette: prev.palette.map((c, i) => (i === index ? value : c)),
        };
      });
    },
    [persistSecondary],
  );

  const handleSecondarySemanticChange = useCallback(
    (key: string, val: number | 'bg' | 'fg') => {
      persistSecondary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          semanticMappings: { ...prev.semanticMappings, [key]: val },
        };
      });
    },
    [persistSecondary],
  );

  // Secondary-cluster counterpart to `handleSemanticLiteralChange` (S3 #464 /
  // S12 #473) — `val` already carries the full `{ literal: ... }` wrapper.
  const handleSecondarySemanticLiteralChange = useCallback(
    (key: string, val: { literal: string } | { literal: { light: string; dark: string } }) => {
      persistSecondary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          semanticMappings: { ...prev.semanticMappings, [key]: val },
        };
      });
    },
    [persistSecondary],
  );

  // Secondary-cluster counterpart to `handleSemanticRefOrLiteralChange` (S9,
  // #470) — writes whichever variant `TierRefSelector` reports straight into
  // `semanticMappings`, mirroring the `{ ref } | { literal }` shape 1:1.
  const handleSecondarySemanticRefOrLiteralChange = useCallback(
    (key: string, next: TierRefSelectorValue) => {
      persistSecondary((prev) => {
        if (!prev) return prev;
        // `next` is returned as-is in the literal branch (not rebuilt as
        // `{ literal: next.literal }`) — reconstructing collapses the
        // `string | { light, dark }` union into one shape TS can't match
        // back to `SemanticValue`'s two distinct `{ literal }` members.
        return {
          ...prev,
          semanticMappings: {
            ...prev.semanticMappings,
            [key]: 'ref' in next ? { ref: next.ref } : next,
          },
        };
      });
    },
    [persistSecondary],
  );

  // Accepts `key: string` (broadened from the literal union) so the same
  // handler can be passed directly to memoised <PaletteSelector> rows whose
  // (idKey, val) signature is also string-typed.
  // The runtime guard pins the actual write to the known base-role keys
  // ColorTweakState declares.
  const handleBaseIndexChange = useCallback(
    (key: string, val: number | 'bg' | 'fg') => {
      if (typeof val !== 'number') return;
      if (
        key !== 'background' &&
        key !== 'foreground' &&
        key !== 'cursor' &&
        key !== 'selectionBg' &&
        key !== 'selectionFg'
      ) {
        return;
      }
      persistColor((prev) => ({ ...prev, [key]: val }));
    },
    [persistColor],
  );

  const handleSemanticChange = useCallback(
    (key: string, val: number | 'bg' | 'fg') => {
      persistColor((prev) => ({
        ...prev,
        semanticMappings: { ...prev.semanticMappings, [key]: val },
      }));
    },
    [persistColor],
  );

  // Writes a `{ literal }` SemanticValue — single-mode `string` or per-mode
  // `{ light, dark }` (S3 #464 / S12 #473) — the `SemanticLiteralRow`
  // counterpart to `handleSemanticChange`'s index write. `val` already
  // carries the full `{ literal: ... }` wrapper (mirroring
  // `handleSemanticRefOrLiteralChange` below), so no re-wrapping is needed.
  const handleSemanticLiteralChange = useCallback(
    (key: string, val: { literal: string } | { literal: { light: string; dark: string } }) => {
      persistColor((prev) => ({
        ...prev,
        semanticMappings: { ...prev.semanticMappings, [key]: val },
      }));
    },
    [persistColor],
  );

  // Writes whichever variant `TierRefSelector`'s grouped ref-or-literal
  // control reports (S9, #470) — mirrors the `{ ref } | { literal }`
  // `SemanticValue` shape 1:1, so no further translation is needed.
  const handleSemanticRefOrLiteralChange = useCallback(
    (key: string, next: TierRefSelectorValue) => {
      persistColor((prev) => ({
        ...prev,
        // `next` is returned as-is in the literal branch — see the secondary
        // counterpart above for why reconstructing `{ literal: next.literal }`
        // does not typecheck.
        semanticMappings: {
          ...prev.semanticMappings,
          [key]: 'ref' in next ? { ref: next.ref } : next,
        },
      }));
    },
    [persistColor],
  );

  // Preview-text resolvers for the grouped picker's ramp options — one bound
  // to the primary cluster's own tab (the default "current tab" for
  // same-tab ramp sources), one to the secondary cluster's tab.
  const previewRampValue = useMemo(
    () => makeRampPreview(tab, allTabs, tabOverrides),
    [tab, allTabs, tabOverrides],
  );
  const secondaryPreviewRampValue = useMemo(
    () => (secondaryTab ? makeRampPreview(secondaryTab, allTabs, tabOverrides) : undefined),
    [secondaryTab, allTabs, tabOverrides],
  );

  const handleLoadPreset = useCallback(
    (name: string) => {
      const scheme = allPresets[name];
      if (!scheme) return;
      // Seed against THIS instance's derived cluster (`safeCluster`), not the
      // global active primary cluster. In a multi-instance / direct-render host
      // the instance's palette size or semantic tokens can differ from the
      // default config; without the explicit cluster the preset load builds
      // state for the wrong cluster (#491 follow-up, audit).
      const newState = initColorFromSchemeData(scheme, safeCluster);
      persistColor(() => newState);
      applyShikiTheme(newState.shikiTheme);
    },
    [persistColor, safeCluster, allPresets],
  );

  return (
    <div className="tokenpanel-tab-content">
      {/*
       * Preset loader — tab-scoped so the outer header row stays general.
       * Gated on `safeCluster.paletteSize > 0`: a palette-less cluster (a
       * lone `semantic: true` tier, #458) has no palette for a scheme/preset
       * to seed — `initColorFromSchemeData` treats a load against it as a
       * no-op (#488), so offering the control here would be dead UI even
       * when the host configured `colorPresets`.
       */}
      {safeCluster.paletteSize > 0 && (
        <div className="tokenpanel-tab-actions">
          <select
            onChange={(e) => {
              const target = e.target as HTMLSelectElement;
              const name = target.value;
              if (name) {
                handleLoadPreset(name);
                target.value = '';
              }
            }}
            className="tokenpanel-color-preset-select"
            aria-label="Load color scheme preset"
            defaultValue=""
          >
            <option value="" disabled>
              Scheme...
            </option>
            {bundledNames.length > 0 && (
              <optgroup label="Built-in">
                {bundledNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </optgroup>
            )}
            {presetNames.length > 0 && (
              <optgroup label="Presets">
                {presetNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      )}

      {/*
       * Section A: Raw Palette — and Section B: Base Theme, which indexes
       * into that palette. Both are gated on `state.palette.length > 0`: a
       * lone `semantic: true` tier (no palette sibling, paletteSize 0, #458)
       * has no palette to render or index into. Rendering either section
       * unconditionally would show a phantom swatch backed by nothing
       * (previously a 1-slot grayscale floor in `initSecondaryDefaults`,
       * #466) or a dead index-picker with zero options.
       */}
      {state.palette.length > 0 && showPrimaryPalette && (
        <div className="tokenpanel-tab-section">
          <div role="heading" aria-level={3} className="tokenpanel-tab-section-heading tokenpanel-tab-section-heading--color">
            {primaryLabel} — Palette
          </div>
          <div className="tokenpanel-color-palette-grid">
            {state.palette.map((color, i) => {
              const item = paletteTier?.items[i];
              if (query && !primaryPaletteMatches[i]) return null;
              return (
                // ColorSwatch passes `i` back via its (index, value) onChange so we
                // hand `handlePaletteChange` directly — no inline arrow, memo
                // stays effective. `valueFormat` routes oklch-format slots through
                // the lossless OKLCH editor; absent/`'hex'` slots stay hex.
                <ColorSwatch
                  key={i}
                  color={color}
                  index={i}
                  label={resolvePaletteCssVar(safeCluster, i)}
                  cssVar={resolvePaletteCssVar(safeCluster, i)}
                  valueFormat={resolvePaletteFormat(paletteTier, i)}
                  onChange={handlePaletteChange}
                  address={item ? { tabId: tab.id, tierId: paletteTier?.id ?? 'palette', itemId: item.id } : undefined}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Base + Semantic wrapper */}
      <div className="tokenpanel-tab-content">
        {state.palette.length > 0 && (
          <div className="tokenpanel-tab-section">
            <div role="heading" aria-level={3} className="tokenpanel-tab-section-heading tokenpanel-tab-section-heading--color">
              {primaryLabel} — Base
            </div>
            {/*
             * `background (bg)` and `foreground (fg)` are palette-index knobs:
             * the value picks which palette slot seeds that base role. The
             * labels read as plain English with the short key in parentheses
             * rather than the cssVar name. The eye toggle, however, wires to the
             * cluster's declared base-role cssVar (`cluster.baseRoles.background`
             * / `.foreground`) — those ARE real tokens written to the DOM by
             * `applyColorState`, so highlighting them is just as valid as any
             * semantic token. When a cluster declares no cssVar for a base role,
             * `cssVar` is undefined and the eye is omitted. The `cursor`,
             * `sel-bg`, `sel-fg` upstream rows are dropped here because nothing
             * in this package references them.
             */}
            <div className="tokenpanel-color-base-grid">
              <PaletteSelector
                label="background (bg)"
                idKey="background"
                value={state.background}
                palette={state.palette}
                paletteCssVar={clusterPaletteCssVar}
                onChange={handleBaseIndexChange}
                cssVar={safeCluster.baseRoles.background}
                address={{ tabId: tab.id, tierId: '__base__', itemId: 'background' }}
              />
              <PaletteSelector
                label="foreground (fg)"
                idKey="foreground"
                value={state.foreground}
                palette={state.palette}
                paletteCssVar={clusterPaletteCssVar}
                onChange={handleBaseIndexChange}
                cssVar={safeCluster.baseRoles.foreground}
                address={{ tabId: tab.id, tierId: '__base__', itemId: 'foreground' }}
              />
            </div>
          </div>
        )}

        {/* Section C: Semantic Token Mappings */}
        {showPrimarySemantic && <div className="tokenpanel-tab-section">
          <div
            role="heading"
            aria-level={3}
            className="tokenpanel-tab-section-heading tokenpanel-tab-section-heading--color tokenpanel-tab-section-heading--with-help"
          >
            {primaryLabel} — Semantic Tokens
            <HelpIcon
              text={SEMANTIC_TOKENS_HELP_TEXT}
              ariaLabel={`${primaryLabel} Semantic Tokens help`}
            />
          </div>
          <div className="tokenpanel-color-base-grid">
            {primarySemanticRows.map(({ key, mapping, semanticTier: addressTier }) => {
              const semanticCssVar = safeCluster.semanticCssNames[key];
              const semanticIndex = primarySemanticRows.findIndex((row) => row.key === key);
              if (query && !primarySemanticMatches[semanticIndex]) return null;
              // A tier that declares `referencesRamps` routes both its ref
              // and literal values — single-mode AND per-mode
              // `{ literal: { light, dark } }` (#472) alike — through the
              // grouped ref-or-literal picker (S9 #470 / S12 #473), so the
              // user can switch between a cross-tab ramp reference and an
              // arbitrary OKLCH literal (optionally split light/dark).
              const semanticTier = findSemanticTier(tab, key);
              const rampSources = semanticTier?.referencesRamps;
              if (
                rampSources &&
                rampSources.length > 0 &&
                (isRefMapping(mapping) || isLiteralMapping(mapping))
              ) {
                // `mapping` is passed through as-is in the literal branch —
                // rebuilding `{ literal: mapping.literal }` collapses the
                // `string | { light, dark }` union into a shape TS can't
                // match back to `TierRefSelectorValue`'s two `{ literal }`
                // members.
                const tierRefValue: TierRefSelectorValue = isRefMapping(mapping)
                  ? { ref: mapping.ref }
                  : mapping;
                return (
                  <SemanticRefOrLiteralRow
                    key={key}
                    label={semanticCssVar ?? key}
                    idKey={key}
                    tab={tab}
                    tabs={allTabs}
                    tierId={semanticTier!.id}
                    value={tierRefValue}
                    onChange={handleSemanticRefOrLiteralChange}
                    previewValueFor={previewRampValue}
                    cssVar={semanticCssVar}
                    defaultMode={primaryDefaultMode}
                    address={addressTier ? { tabId: tab.id, tierId: addressTier.id, itemId: key } : undefined}
                  />
                );
              }
              // Any `{ literal }` mapping (on a tier with NO
              // `referencesRamps`) — single-mode string OR per-mode
              // `{ light, dark }` (S12, #473) — renders an editable OKLCH
              // swatch (S3, #464) instead of a palette-index dropdown; it has
              // no palette slot to reference.
              if (isLiteralMapping(mapping)) {
                return (
                  <SemanticLiteralRow
                    key={key}
                    label={semanticCssVar ?? key}
                    idKey={key}
                    value={mapping}
                    onChange={handleSemanticLiteralChange}
                    cssVar={semanticCssVar}
                    defaultMode={primaryDefaultMode}
                    address={addressTier ? { tabId: tab.id, tierId: addressTier.id, itemId: key } : undefined}
                  />
                );
              }
              return (
                <PaletteSelector
                  key={key}
                  label={semanticCssVar ?? key}
                  idKey={key}
                  value={toIndexMappingForSelector(mapping)}
                  palette={state.palette}
                  paletteCssVar={clusterPaletteCssVar}
                  onChange={handleSemanticChange}
                  background={state.palette[state.background]}
                  foreground={state.palette[state.foreground]}
                  cssVar={semanticCssVar}
                  address={addressTier ? { tabId: tab.id, tierId: addressTier.id, itemId: key } : undefined}
                />
              );
            })}
          </div>
        </div>}

        {/*
         * Secondary-cluster sections render ONLY when the host has opted
         * in by passing a `secondaryColorCluster` object on the panel
         * config. The `data-testid` markers below give Playwright a
         * stable handle for asserting presence / absence.
         */}
        {secondaryCluster && secondaryState && secondaryTab && (
          <>
            {/* Section D: SECONDARY — Palette */}
            {showSecondaryPalette && <div
              className="tokenpanel-tab-section"
              data-testid="tokenpanel-secondary-palette-section"
            >
              <div role="heading" aria-level={3} className="tokenpanel-tab-section-heading tokenpanel-tab-section-heading--color">
                {secondaryLabel} — Palette
              </div>
              <div className="tokenpanel-color-palette-grid--secondary">
                {secondaryState.palette.map((color, i) => {
                  const item = secondaryPaletteTier?.items[i];
                  if (query && !secondaryPaletteMatches[i]) return null;
                  return (
                    <ColorSwatch
                      key={i}
                      color={color}
                      index={i}
                      label={resolvePaletteCssVar(secondaryCluster, i)}
                      cssVar={resolvePaletteCssVar(secondaryCluster, i)}
                      valueFormat={resolvePaletteFormat(secondaryPaletteTier, i)}
                      onChange={handleSecondaryPaletteChange}
                      address={item ? { tabId: secondaryTab.id, tierId: secondaryPaletteTier?.id ?? 'palette', itemId: item.id } : undefined}
                    />
                  );
                })}
              </div>
            </div>}

            {/* Section E: SECONDARY — Semantic Tokens */}
            {showSecondarySemantic && <div
              className="tokenpanel-tab-section"
              data-testid="tokenpanel-secondary-semantic-section"
            >
              <div
                role="heading"
                aria-level={3}
                className="tokenpanel-tab-section-heading tokenpanel-tab-section-heading--color tokenpanel-tab-section-heading--with-help"
              >
                {secondaryLabel} — Semantic Tokens
                <HelpIcon
                  text={SEMANTIC_TOKENS_HELP_TEXT}
                  ariaLabel={`${secondaryLabel} Semantic Tokens help`}
                />
              </div>
              <div className="tokenpanel-color-base-grid">
                {secondarySemanticRows.map(({ key, mapping, semanticTier: addressTier }) => {
                  const secondarySemanticCssVar = secondaryCluster.semanticCssNames[key];
                  const secondaryIndex = secondarySemanticRows.findIndex((row) => row.key === key);
                  if (query && !secondarySemanticMatches[secondaryIndex]) return null;
                  const secondaryMapping = mapping;
                  // Mirrors the primary section's ramp/literal/index split above.
                  const secondarySemanticTier = findSemanticTier(secondaryTab, key);
                  const secondaryRampSources = secondarySemanticTier?.referencesRamps;
                  if (
                    secondaryRampSources &&
                    secondaryRampSources.length > 0 &&
                    (isRefMapping(secondaryMapping) || isLiteralMapping(secondaryMapping))
                  ) {
                    // See the primary section's `tierRefValue` above for why
                    // `secondaryMapping` is passed through as-is here.
                    const secondaryTierRefValue: TierRefSelectorValue = isRefMapping(secondaryMapping)
                      ? { ref: secondaryMapping.ref }
                      : secondaryMapping;
                    return (
                      <SemanticRefOrLiteralRow
                        key={key}
                        label={secondarySemanticCssVar ?? key}
                        idKey={key}
                        tab={secondaryTab}
                        tabs={allTabs}
                        tierId={secondarySemanticTier!.id}
                        value={secondaryTierRefValue}
                        onChange={handleSecondarySemanticRefOrLiteralChange}
                        previewValueFor={secondaryPreviewRampValue!}
                        cssVar={secondarySemanticCssVar}
                        defaultMode={secondaryDefaultMode}
                        address={addressTier ? { tabId: secondaryTab.id, tierId: addressTier.id, itemId: key } : undefined}
                      />
                    );
                  }
                  if (isLiteralMapping(secondaryMapping)) {
                    return (
                      <SemanticLiteralRow
                        key={key}
                        label={secondarySemanticCssVar ?? key}
                        idKey={key}
                        value={secondaryMapping}
                        onChange={handleSecondarySemanticLiteralChange}
                        cssVar={secondarySemanticCssVar}
                        defaultMode={secondaryDefaultMode}
                        address={addressTier ? { tabId: secondaryTab.id, tierId: addressTier.id, itemId: key } : undefined}
                      />
                    );
                  }
                  return (
                    <PaletteSelector
                      key={key}
                      label={secondarySemanticCssVar ?? key}
                      idKey={key}
                      value={toIndexMappingForSelector(secondaryMapping)}
                      palette={secondaryState.palette}
                      paletteCssVar={secondaryPaletteCssVar}
                      onChange={handleSecondarySemanticChange}
                      cssVar={secondarySemanticCssVar}
                      address={addressTier ? { tabId: secondaryTab.id, tierId: addressTier.id, itemId: key } : undefined}
                    />
                  );
                })}
              </div>
            </div>}
          </>
        )}

        {/*
         * shikiTheme select — intentionally hidden. The state field,
         * persist slice, and serde schema all still carry `shikiTheme` so
         * imported upstream envelopes round-trip cleanly, but there's no
         * Shiki integration here and `applyShikiTheme` is a no-op. If /
         * when Shiki lands, restore the upstream JSX block and re-import
         * `SHIKI_THEMES` from `../state/tweak-state`.
         */}
      </div>
    </div>
  );
}
