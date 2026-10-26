/** @jsxImportSource @takazudo/zfb/zudo-react */
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

import {
  computed,
  For,
  getScope,
  Show,
  signal,
  type Child,
  type ReadonlySignal,
  type Ref,
} from '@takazudo/zfb/zudo-react';
import type { ColorScheme } from '../config/color-schemes';
import { pushDismissLayer } from '../controls/dismiss-layer';
import { ColorField } from '../components/color-picker/color-field';
import { ColorPicker, type ColorPickerValueFormat } from '../components/color-picker/color-picker';
import { Z } from '../styles/z-index-tokens';
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
import { resolveColorClusterFromTab, type ColorClusterDataConfig } from '../config/cluster-config';
import type { TabConfig, TierConfig, TierItem } from '../tokens/tier-model';
import type { PersistColor, PersistSecondary } from '../state/persist';
import { HighlightToggleButton } from '../highlight/highlight-toggle-button';
import { RoleButton } from '../controls/role-button';
import { TokenLabel } from '../controls/token-label';
import { tooltipTrigger } from '../controls/tooltip';
import { HelpIcon, SEMANTIC_TOKENS_HELP_TEXT } from '../controls/help-icon';
import TierRefSelector, {
  type TierRefSelectorValue,
  type TierRefTarget,
} from '../controls/tier-ref-selector';
import { TokenChainButton } from '../chain/token-chain-popover';
import { tokenAddressKey, type TokenAddress } from './flat/types';
import { matchesSearchFields, stringifySearchValue } from '../search/token-search';
import { ModesRow } from './modes-row';
import { resolveModeRowSides } from './mode-sides';
import { Checkbox } from '../zr/form-controls';
import { Rebuild } from '../zr/rebuild';
import { read, type Reactive } from '../zr/live';
import type { PanelServices } from '../zr/panel-services';

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
 * Close a popover on outside mousedown, Escape, or ancestor scroll; returns
 * the matching unbind.
 *
 * Escape is arbitrated by the shared dismiss-layer stack (F10): only the
 * topmost open layer consumes a single Escape, so dismissing this listbox never
 * also tears down the panel underneath. `onEscape` lets the caller restore
 * focus to the trigger on Escape — a keyboard-only concern that the
 * outside-click / scroll paths deliberately do not trigger.
 */
function bindColorPopoverClose(
  containerRef: Ref<HTMLElement>,
  onClose: () => void,
  onEscape: () => void,
): () => void {
  function handleClick(e: MouseEvent) {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      onClose();
    }
  }
  document.addEventListener('mousedown', handleClick);
  window.addEventListener('scroll', onClose, true);
  const removeLayer = pushDismissLayer({
    onEscape,
    getElement: () => containerRef.current,
  });
  return () => {
    document.removeEventListener('mousedown', handleClick);
    window.removeEventListener('scroll', onClose, true);
    removeLayer();
  };
}

/**
 * Compute fixed popover position with viewport-aware flip.
 *
 * Returns only the dynamic positioning bits (`position`, `left`, `top` /
 * `bottom`, `z-index`). Visual chrome (border-radius, box-shadow, border,
 * background) lives on the popover's class in panel.css — the inline style is
 * reserved for values that literally cannot be expressed in CSS today
 * (per-anchor-rect coordinates).
 */
// Z.colorPicker is reused here for the palette-options listbox popover —
// a different element from the OklchPicker card (color-picker.css), but at the
// same tier in the stacking order. Both need to sit above the panel shell.
function getFixedPopoverStyle(
  anchor: HTMLElement | null,
  estW: number,
  estH: number,
): Record<string, string> {
  const zIndex = String(Z.colorPicker);
  if (!anchor) return { position: 'fixed', 'z-index': zIndex };
  const rect = anchor.getBoundingClientRect();
  const gap = 4;
  const pad = 8;
  const below = window.innerHeight - rect.bottom - pad;
  const above = rect.top - pad;
  const flipAbove = below < estH && above > below;
  let left = rect.left;
  if (left + estW > window.innerWidth - pad) left = window.innerWidth - pad - estW;
  if (left < pad) left = pad;
  const style: Record<string, string> = {
    position: 'fixed',
    left: `${left}px`,
    'z-index': zIndex,
  };
  if (flipAbove) {
    style.bottom = `${window.innerHeight - rect.top + gap}px`;
  } else {
    style.top = `${rect.bottom + gap}px`;
  }
  return style;
}

// --- Palette format resolution ---

/**
 * Find the palette tier in a color tab: the first non-reference, non-semantic
 * tier whose items are color-kind or whose first row declares a mode pair.
 * Mirrors the palette-tier detection in
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
      (t.items[0].type.kind === 'color' || t.items[0].modes !== undefined),
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

type PaletteIndexValue = number | 'bg' | 'fg';
type LiteralMapping = { literal: string } | { literal: { light: string; dark: string } };

let nextListboxId = 0;

function addressAttribute(address: TokenAddress | undefined): Record<string, string> {
  return address ? { 'data-address': tokenAddressKey(address) } : {};
}

function onEnterOrSpace(handler: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler();
    }
  };
}

function ChangedMarker({ changed }: { changed: ReadonlySignal<boolean> }) {
  return (
    <Show when={changed}>
      {() => <span class="tokenpanel-changed-marker" aria-label="Changed">●</span>}
    </Show>
  );
}

interface RowActionsProps {
  label: string;
  cssVar?: string;
  address?: TokenAddress;
  changed: ReadonlySignal<boolean>;
  onRevert?: () => void;
  services: PanelServices;
}

/** Eye toggle, chain button and (while changed) revert, shared by every row. */
function RowActions({ label, cssVar, address, changed, onRevert, services }: RowActionsProps) {
  return (
    <>
      {cssVar ? <HighlightToggleButton cssVar={cssVar} highlight={services.highlight} /> : null}
      {address ? <TokenChainButton address={address} services={services} /> : null}
      {onRevert ? (
        <Show when={changed}>
          {() => (
            <RoleButton
              class="tokenpanel-changed-revert"
              aria-label={`Revert ${label}`}
              title="Revert to default"
              onClick={onRevert}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 4v6h6" />
              </svg>
            </RoleButton>
          )}
        </Show>
      ) : null}
    </>
  );
}

interface ColorSwatchProps {
  color: ReadonlySignal<string>;
  /** `(index, value)`: the swatch passes its own palette `index` back so one
   *  per-cluster handler serves every cell. */
  onChange: (index: number, value: string) => void;
  index: number;
  label: string;
  /** CSS custom property name (e.g. `--zd-p3`) used to wire the eye toggle. */
  cssVar?: string;
  /** Output format for the swatch's ColorPicker. `'oklch'` routes the edit
   *  through the lossless OKLCH editor (emits `oklch(...)`); `'hex'` keeps the
   *  native hex behavior. */
  valueFormat: ColorPickerValueFormat;
  /** Stable address used by command-palette navigation. */
  address?: TokenAddress;
  /** Evaluator-backed changed state for the active identity. */
  changed: ReadonlySignal<boolean>;
  onRevert?: () => void;
  services: PanelServices;
}

/** Single palette swatch with color-picker popover. */
function ColorSwatch(props: ColorSwatchProps) {
  const { color, onChange, index, label, cssVar, valueFormat, address, changed, onRevert, services } = props;
  const isOpen = signal(false);
  const button: Ref<HTMLDivElement> = { current: null };
  const toggle = () => {
    isOpen.value = !isOpen.value;
  };
  const title = computed(() => `${label}: ${color.value}`);
  return (
    <div
      class={computed(() => (changed.value ? 'tokenpanel-color-swatch-wrap is-changed' : 'tokenpanel-color-swatch-wrap'))}
      {...addressAttribute(address)}
    >
      <div
        ref={button}
        role="button"
        tabindex={0}
        class="tokenpanel-color-swatch-button"
        style={computed(() => ({ 'background-color': color.value }))}
        on:click={toggle}
        on:keydown={onEnterOrSpace(toggle)}
        aria-label={title}
        aria-expanded={isOpen}
        {...tooltipTrigger(services.tooltip, title)}
      />
      <Show when={isOpen}>
        {() => (
          <ColorPicker
            color={color}
            onChange={(value) => onChange(index, value)}
            valueFormat={valueFormat}
            label={label}
            onClose={() => {
              isOpen.value = false;
            }}
            anchorRef={button}
          />
        )}
      </Show>
      <div class="tokenpanel-color-swatch-label-row">
        <ChangedMarker changed={changed} />
        <span class="tokenpanel-color-swatch-label">{label}</span>
        <RowActions
          label={label}
          cssVar={cssVar}
          address={address}
          changed={changed}
          onRevert={onRevert}
          services={services}
        />
      </div>
    </div>
  );
}

/**
 * A palette slot declared with `modes` is display-only. Keep it in the color
 * tab's palette grid so text-kind mode slots are discoverable, while exposing
 * both authored values instead of opening the single-value color picker.
 */
function ColorModesRow({
  item,
  value,
  address,
  changed,
  onRevert,
  services,
}: {
  item: TierItem;
  value: ReadonlySignal<string>;
  address?: TokenAddress;
  changed: ReadonlySignal<boolean>;
  onRevert?: () => void;
  services: PanelServices;
}) {
  return (
    <div class="tokenpanel-card tokenpanel-color-modes-card">
      <ModesRow
        item={item}
        // Color palette state is dense and already contains the effective
        // value, so always prefer it. This preserves a persisted plain or
        // light-dark override even when it happens to equal item.default.
        sides={computed(() => resolveModeRowSides(item, value.value, true))}
        class={computed(() => (changed.value ? 'is-changed' : ''))}
        dataTestId={`tokenpanel-color-modes-${item.id}`}
        address={address}
        tooltip={services.tooltip}
        trailing={(
          <RowActions
            label={item.label}
            cssVar={item.cssVar}
            address={address}
            changed={changed}
            onRevert={onRevert}
            services={services}
          />
        )}
      />
    </div>
  );
}

interface PaletteSelectorProps {
  label: string;
  /** Stable identifier for this row, passed back to `onChange` so one
   *  per-cluster handler can dispatch on it. */
  idKey: string;
  value: ReadonlySignal<PaletteIndexValue>;
  palette: ReadonlySignal<readonly string[]>;
  /**
   * Maps a palette index to its full CSS custom-property name (e.g.
   * `--zd-p7`, `--app-secondary-pa3`). Used for the popover swatches'
   * `title` / `aria-label` so assistive tech sees the real variable name,
   * not a short `p7` key.
   */
  paletteCssVar: (i: number) => string;
  onChange: (idKey: string, val: PaletteIndexValue) => void;
  extraOptions?: readonly ('bg' | 'fg')[];
  background?: ReadonlySignal<string | undefined>;
  foreground?: ReadonlySignal<string | undefined>;
  /** CSS custom property this row maps to (e.g. `--fixture-semantic-accent`).
   *  Omit for rows that have no real cssVar in the document. */
  cssVar?: string;
  /** Stable address used by navigation, highlight, and chain-popover links. */
  address?: TokenAddress;
  changed: ReadonlySignal<boolean>;
  onRevert?: () => void;
  services: PanelServices;
}

function resolveIndexColor(
  value: PaletteIndexValue,
  palette: readonly string[],
  background: string | undefined,
  foreground: string | undefined,
): string {
  if (value === 'bg') return background ?? '#000000';
  if (value === 'fg') return foreground ?? '#ffffff';
  return palette[value] ?? '#000000';
}

/** Palette index selector — fixed-position dropdown with viewport-aware flip. */
function PaletteSelector(props: PaletteSelectorProps) {
  const { label, idKey, value, palette, onChange, cssVar, address, changed, onRevert, services } = props;
  const isOpen = signal(false);
  const container: Ref<HTMLDivElement> = { current: null };
  const button: Ref<HTMLDivElement> = { current: null };
  const close = () => {
    isOpen.value = false;
  };
  // Restore focus to the trigger when the listbox is dismissed by keyboard (F12).
  const closeAndFocusTrigger = () => {
    isOpen.value = false;
    button.current?.focus();
  };
  const toggle = () => {
    isOpen.value = !isOpen.value;
  };
  const resolvedColor = computed(() => resolveIndexColor(
    value.value,
    palette.value,
    props.background?.value,
    props.foreground?.value,
  ));
  const valueLabel = computed(() => {
    const current = value.value;
    return current === 'bg' ? 'bg' : current === 'fg' ? 'fg' : `p${current}`;
  });
  const triggerLabel = computed(() => `${label}: ${valueLabel.value}`);

  return (
    <div class="tokenpanel-card">
      <div
        class={computed(() => (changed.value ? 'tokenpanel-palette-selector is-changed' : 'tokenpanel-palette-selector'))}
        ref={container}
        {...addressAttribute(address)}
      >
        <div class="tokenpanel-card-editor">
          <div
            ref={button}
            role="button"
            tabindex={0}
            on:click={toggle}
            on:keydown={(e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle();
              } else if (e.key === 'ArrowDown') {
                // Open (never toggle shut); the listbox takes focus on mount
                // so arrow keys navigate options (F12).
                e.preventDefault();
                if (!isOpen.value) isOpen.value = true;
              }
            }}
            class="tokenpanel-palette-trigger"
            aria-label={triggerLabel}
            aria-expanded={isOpen}
            {...tooltipTrigger(services.tooltip, triggerLabel)}
          >
            <ChangedMarker changed={changed} />
            <span class="tokenpanel-card-label">
              <span class="tokenpanel-palette-trigger-label">{label}</span>
            </span>
            <div
              class="tokenpanel-palette-trigger-color"
              style={computed(() => ({ 'background-color': resolvedColor.value }))}
            />
            <span class="tokenpanel-palette-trigger-value">{valueLabel}</span>
            <svg
              class="tokenpanel-palette-trigger-icon"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>
        <div class="tokenpanel-card-actions">
          <RowActions
            label={label}
            cssVar={cssVar}
            address={address}
            changed={changed}
            onRevert={onRevert}
            services={services}
          />
        </div>
        <Show when={isOpen}>
          {() => (
            <PaletteOptions
              {...props}
              container={container}
              button={button}
              onSelect={(val) => {
                onChange(idKey, val);
                close();
              }}
              onClose={close}
              onEscape={closeAndFocusTrigger}
            />
          )}
        </Show>
      </div>
    </div>
  );
}

interface PaletteOptionsProps extends PaletteSelectorProps {
  container: Ref<HTMLDivElement>;
  button: Ref<HTMLDivElement>;
  onSelect: (val: PaletteIndexValue) => void;
  onClose: () => void;
  onEscape: () => void;
}

/**
 * The open listbox. Container-owned keyboard navigation (listbox policy,
 * F12): the role="option" children stay click-only and unfocusable; this
 * container owns arrow / Home / End / Enter / Space, tracking a roving active
 * option via aria-activedescendant. Options render as extras (bg/fg) first,
 * then the palette grid — one flat, linearly-navigable sequence.
 */
function PaletteOptions(props: PaletteOptionsProps) {
  const { label, value, palette, paletteCssVar, container, button, onSelect, onClose, onEscape } = props;
  const extraOptions = props.extraOptions ?? [];
  const listbox: Ref<HTMLDivElement> = { current: null };
  const optionValues = computed((): PaletteIndexValue[] => [
    ...extraOptions,
    ...palette.value.map((_, i) => i),
  ]);
  const baseId = `tokenpanel-palette-listbox-${nextListboxId++}`;
  const optionId = (val: PaletteIndexValue) => `${baseId}-opt-${val}`;
  // Seeded once from the selection at open — not re-run while already open.
  const selectedIndex = optionValues.value.findIndex((v) => v === value.value);
  const activeIndex = signal(selectedIndex >= 0 ? selectedIndex : 0);
  const style = getFixedPopoverStyle(button.current, 440, extraOptions.length > 0 ? 160 : 120);

  getScope().onActivate(() => {
    listbox.current?.focus();
    return bindColorPopoverClose(container, onClose, onEscape);
  });

  function handleKeyDown(e: KeyboardEvent) {
    const count = optionValues.value.length;
    if (count === 0) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      activeIndex.value = Math.min(count - 1, activeIndex.value + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      activeIndex.value = Math.max(0, activeIndex.value - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      activeIndex.value = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      activeIndex.value = count - 1;
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const val = optionValues.value[activeIndex.value];
      if (val !== undefined) {
        onSelect(val);
        button.current?.focus();
      }
    }
    // Escape is handled by the shared dismiss-layer stack (see
    // bindColorPopoverClose): it closes this listbox and restores focus.
  }

  const optionClass = (base: string, val: PaletteIndexValue, position: number) => computed(() => [
    base,
    value.value === val ? 'is-selected' : '',
    activeIndex.value === position ? 'is-active' : '',
  ].filter(Boolean).join(' '));

  const paletteIndexes = computed(() => palette.value.map((_, i) => i));

  return (
    <div
      ref={listbox}
      role="listbox"
      tabindex={0}
      aria-label={`${label} color options`}
      aria-activedescendant={computed(() => {
        const active = optionValues.value[activeIndex.value];
        return active !== undefined ? optionId(active) : null;
      })}
      on:keydown={handleKeyDown}
      class="tokenpanel-palette-options"
      style={style}
    >
      {extraOptions.length > 0 ? (
        <div class="tokenpanel-palette-options-extras">
          {extraOptions.map((opt, extraIdx) => (
            <div
              id={optionId(opt)}
              role="option"
              aria-selected={computed(() => value.value === opt)}
              on:click={() => onSelect(opt)}
              class={optionClass('tokenpanel-palette-extra-option', opt, extraIdx)}
            >
              <div
                class="tokenpanel-palette-extra-color"
                style={computed(() => ({
                  'background-color': opt === 'bg'
                    ? (props.background?.value ?? '#000000')
                    : (props.foreground?.value ?? '#ffffff'),
                }))}
              />
              <span class="tokenpanel-palette-extra-label">{opt}</span>
            </div>
          ))}
        </div>
      ) : null}
      <div class="tokenpanel-palette-options-grid">
        <For each={paletteIndexes} by={(i) => i}>
          {(entry) => {
            const i = entry.value;
            const color = computed(() => palette.value[i] ?? '');
            const optionTitle = computed(() => `${paletteCssVar(i)}: ${color.value}`);
            return (
              <div
                id={optionId(i)}
                role="option"
                aria-selected={computed(() => value.value === i)}
                aria-label={optionTitle}
                on:click={() => onSelect(i)}
                title={optionTitle}
                class={optionClass('tokenpanel-palette-option-button', i, extraOptions.length + i)}
                style={computed(() => ({ 'background-color': color.value }))}
              />
            );
          }}
        </For>
      </div>
    </div>
  );
}

interface SemanticLiteralRowProps {
  label: string;
  idKey: string;
  value: ReadonlySignal<LiteralMapping>;
  onChange: (idKey: string, val: LiteralMapping) => void;
  cssVar?: string;
  /** The cluster's `getClusterDefaultMode()` result (#472) — the side kept
   *  when the user unchecks "Per-mode". */
  defaultMode: 'light' | 'dark';
  address?: TokenAddress;
  changed: ReadonlySignal<boolean>;
  onRevert?: () => void;
  services: PanelServices;
}

/**
 * Semantic-token row for a `{ literal: string }` OR per-mode
 * `{ literal: { light, dark } }` mapping (S3 #464 / S12 #473): an editable
 * OKLCH `ColorField` swatch instead of `PaletteSelector`'s palette-index
 * dropdown — the value is a standalone color, not a slot into
 * `state.palette`. Mirrors the `.tokenpanel-row` layout used by the generic
 * tab's own `format: 'oklch'` color rows.
 *
 * A "Per-mode" checkbox switches between a single `ColorField` and a
 * light/dark pair. Checking it seeds both sides from the current single
 * value; unchecking it collapses back to the cluster's `defaultMode` side,
 * via `resolvePerModeLiteral` (#472).
 *
 * Only reached for a tier with NO `referencesRamps` declared — a tier that
 * does declare ramp sources renders `SemanticRefOrLiteralRow` instead (S9
 * #470 / S12 #473), even for its literal-mode rows.
 */
function SemanticLiteralRow(props: SemanticLiteralRowProps) {
  const { label, idKey, value, onChange, cssVar, defaultMode, address, changed, onRevert, services } = props;
  const perMode = computed(() => {
    const literal = value.value.literal;
    return typeof literal === 'object' && literal !== null ? literal : null;
  });
  const isPerMode = computed(() => perMode.value !== null);
  const single = computed(() => {
    const literal = value.value.literal;
    return typeof literal === 'string' ? literal : '';
  });
  const resolvedPreview = computed(() => {
    const pair = perMode.value;
    return pair ? resolvePerModeLiteral({ literal: pair }, defaultMode) : single.value;
  });

  const handleTogglePerMode = () => {
    const current = value.value.literal;
    if (typeof current === 'object' && current !== null) {
      onChange(idKey, { literal: resolvePerModeLiteral({ literal: current }, defaultMode) });
    } else {
      onChange(idKey, { literal: { light: current, dark: current } });
    }
  };
  const handleSideChange = (side: 'light' | 'dark') => (next: string) => {
    const pair = perMode.value;
    if (!pair) return;
    onChange(idKey, { literal: { ...pair, [side]: next } });
  };

  return (
    <div class="tokenpanel-card">
      <div
        class={computed(() => (changed.value ? 'tokenpanel-row is-changed' : 'tokenpanel-row'))}
        data-testid={`tokenpanel-semantic-literal-${idKey}`}
        {...addressAttribute(address)}
      >
        <ChangedMarker changed={changed} />
        <div class="tokenpanel-card-label">
          <TokenLabel cssVar={cssVar ?? idKey} label={label} tooltip={services.tooltip} />
        </div>
        <div class="tokenpanel-card-editor">
          <div
            class="tokenpanel-semantic-resolved-chip"
            aria-hidden="true"
            title={resolvedPreview}
            style={computed(() => ({ 'background-color': resolvedPreview.value }))}
          />
          <label class="tokenpanel-per-mode-toggle">
            <Checkbox
              checked={isPerMode}
              onChange={handleTogglePerMode}
              aria-label={`${label} per-mode (light/dark)`}
            />
            Per-mode
          </label>
          <Show
            when={isPerMode}
            fallback={() => (
              <ColorField
                value={single}
                onChange={(next) => onChange(idKey, { literal: next })}
                valueFormat="oklch"
                label={label}
                cssVar={cssVar}
              />
            )}
          >
            {() => (
              <div class="tokenpanel-per-mode-fields">
                <div class="tokenpanel-per-mode-field">
                  <span class="tokenpanel-per-mode-label">Light</span>
                  <ColorField
                    value={computed(() => perMode.value?.light ?? '')}
                    onChange={handleSideChange('light')}
                    valueFormat="oklch"
                    resolveMode="light"
                    label={`${label} (Light)`}
                    cssVar={cssVar}
                  />
                </div>
                <div class="tokenpanel-per-mode-field">
                  <span class="tokenpanel-per-mode-label">Dark</span>
                  <ColorField
                    value={computed(() => perMode.value?.dark ?? '')}
                    onChange={handleSideChange('dark')}
                    valueFormat="oklch"
                    resolveMode="dark"
                    label={`${label} (Dark)`}
                    cssVar={cssVar}
                  />
                </div>
              </div>
            )}
          </Show>
        </div>
        <div class="tokenpanel-card-actions">
          <RowActions
            label={label}
            cssVar={cssVar}
            address={address}
            changed={changed}
            onRevert={onRevert}
            services={services}
          />
        </div>
      </div>
    </div>
  );
}

interface SemanticRefOrLiteralRowProps {
  label: string;
  idKey: string;
  tab: TabConfig;
  tabs: readonly TabConfig[];
  tierId: string;
  value: ReadonlySignal<TierRefSelectorValue>;
  onChange: (idKey: string, next: TierRefSelectorValue) => void;
  previewValueFor: ReadonlySignal<(ref: TierRefTarget) => string>;
  cssVar?: string;
  /** The cluster's `getClusterDefaultMode()` result (#472) — forwarded to
   *  `TierRefSelector` for its per-mode collapse-to-single-mode fallback. */
  defaultMode: 'light' | 'dark';
  address?: TokenAddress;
  changed: ReadonlySignal<boolean>;
  onRevert?: () => void;
  services: PanelServices;
}

/**
 * Semantic-token row for a tier that declares `referencesRamps` (S9, #470):
 * wraps `TierRefSelector`'s grouped ref-or-literal control with the same
 * `.tokenpanel-row` layout every other semantic row uses. Handles both
 * `{ ref }` (a cross-tab ramp item) and `{ literal }` (a standalone OKLCH
 * color, editable in place) and can switch between them.
 */
function SemanticRefOrLiteralRow(props: SemanticRefOrLiteralRowProps) {
  const { label, idKey, cssVar, address, changed, onRevert, services } = props;
  return (
    <div class="tokenpanel-card">
      <div
        class={computed(() => (changed.value ? 'tokenpanel-row is-changed' : 'tokenpanel-row'))}
        data-testid={`tokenpanel-semantic-ref-${idKey}`}
        {...addressAttribute(address)}
      >
        <ChangedMarker changed={changed} />
        <div class="tokenpanel-card-label">
          <TokenLabel cssVar={cssVar ?? idKey} label={label} tooltip={services.tooltip} />
        </div>
        <div class="tokenpanel-card-editor">
          <TierRefSelector
            tab={props.tab}
            tabs={props.tabs}
            tierId={props.tierId}
            itemId={idKey}
            value={props.value}
            onChange={props.onChange}
            previewValueFor={props.previewValueFor}
            label={label}
            cssVar={cssVar}
            defaultMode={props.defaultMode}
          />
        </div>
        <div class="tokenpanel-card-actions">
          <RowActions
            label={label}
            cssVar={cssVar}
            address={address}
            changed={changed}
            onRevert={onRevert}
            services={services}
          />
        </div>
      </div>
    </div>
  );
}

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

// --- Section models ---

type ChangedFor = (address: TokenAddress) => boolean;

interface PaletteModel {
  changed: ReadonlySignal<readonly boolean[]>;
  /** Indices passing the search and Changed-only filters. */
  visible: ReadonlySignal<readonly number[]>;
  show: ReadonlySignal<boolean>;
  hasChanged: ReadonlySignal<boolean>;
}

function createPaletteModel(
  tabId: string,
  paletteTier: TierConfig | undefined,
  cssVarFor: (index: number, item: TierItem) => string,
  palette: ReadonlySignal<readonly string[]>,
  query: ReadonlySignal<string>,
  changedOnly: ReadonlySignal<boolean>,
  changedFor: ReadonlySignal<ChangedFor>,
): PaletteModel {
  const matches = computed(() => paletteTier?.items.map((item, index) => colorSearchMatch(query.value, {
    cssVar: cssVarFor(index, item),
    id: item.id,
    label: item.label,
    value: palette.value[index] ?? item.default,
    tierLabel: paletteTier.label,
  })) ?? []);
  const changed = computed(() => paletteTier?.items.map((item) => changedFor.value({
    tabId,
    tierId: paletteTier.id,
    itemId: item.id,
  })) ?? []);
  return {
    changed,
    visible: computed(() => palette.value
      .map((_, i) => i)
      .filter((i) => !(query.value && !matches.value[i]) && !(changedOnly.value && !changed.value[i]))),
    show: computed(() => (!query.value || matches.value.some(Boolean)) &&
      (!changedOnly.value || changed.value.some(Boolean))),
    hasChanged: computed(() => changed.value.some((rowChanged, index) =>
      rowChanged && (!query.value || matches.value[index] === true))),
  };
}

interface SemanticRowModel {
  key: string;
  label: string;
  cssVar?: string;
  addressTier?: TierConfig;
  address?: TokenAddress;
  mapping: ReadonlySignal<SemanticValue>;
  changed: ReadonlySignal<boolean>;
}

interface SemanticModel {
  rows: readonly SemanticRowModel[];
  visible: ReadonlySignal<readonly SemanticRowModel[]>;
  show: ReadonlySignal<boolean>;
  hasChanged: ReadonlySignal<boolean>;
}

function createSemanticModel(
  tab: TabConfig,
  cluster: ColorClusterDataConfig,
  paletteTier: TierConfig | undefined,
  mappings: ReadonlySignal<Record<string, SemanticValue>>,
  query: ReadonlySignal<string>,
  changedOnly: ReadonlySignal<boolean>,
  changedFor: ReadonlySignal<ChangedFor>,
): SemanticModel {
  const rows = Object.entries(cluster.semanticDefaults).map(([key, defaultVal]): SemanticRowModel => {
    const addressTier = findColorSemanticTier(tab, key, paletteTier);
    const address = addressTier ? { tabId: tab.id, tierId: addressTier.id, itemId: key } : undefined;
    return {
      key,
      label: addressTier?.items.find((item) => item.id === key)?.label ?? key,
      cssVar: cluster.semanticCssNames[key],
      addressTier,
      address,
      mapping: computed(() => mappings.value[key] ?? defaultVal),
      changed: computed(() => (address ? changedFor.value(address) : false)),
    };
  });
  const matches = computed(() => rows.map((row) => colorSearchMatch(query.value, {
    cssVar: row.cssVar,
    id: row.key,
    label: `${row.label} ${row.cssVar ?? row.key}`,
    value: row.mapping.value,
    tierLabel: row.addressTier?.label ?? 'Semantic Tokens',
  })));
  return {
    rows,
    visible: computed(() => rows.filter((row, index) =>
      !(query.value && !matches.value[index]) && !(changedOnly.value && !row.changed.value))),
    show: computed(() => (!query.value || matches.value.some(Boolean)) &&
      (!changedOnly.value || rows.some((row) => row.changed.value))),
    hasChanged: computed(() => rows.some((row, index) =>
      row.changed.value && (!query.value || matches.value[index] === true))),
  };
}

// --- Sections ---

interface PaletteGridProps {
  tab: TabConfig;
  paletteTier: TierConfig | undefined;
  cluster: ColorClusterDataConfig;
  palette: ReadonlySignal<readonly string[]>;
  model: PaletteModel;
  gridClass: string;
  onChange: (index: number, value: string) => void;
  onRevert?: (address: TokenAddress) => void;
  services: PanelServices;
}

function PaletteGrid(props: PaletteGridProps) {
  const { tab, paletteTier, cluster, palette, model, onRevert, services } = props;
  return (
    <div class={props.gridClass}>
      <For each={model.visible} by={(i) => i}>
        {(entry) => {
          const i = entry.value;
          const item = paletteTier?.items[i];
          const address = item
            ? { tabId: tab.id, tierId: paletteTier?.id ?? 'palette', itemId: item.id }
            : undefined;
          const color = computed(() => palette.value[i] ?? '');
          const changed = computed(() => Boolean(model.changed.value[i]));
          const revert = address && onRevert ? () => onRevert(address) : undefined;
          if (item?.modes) {
            return (
              <ColorModesRow
                item={item}
                value={color}
                address={address}
                changed={changed}
                onRevert={revert}
                services={services}
              />
            );
          }
          const cssVar = resolvePaletteCssVar(cluster, i);
          return (
            <ColorSwatch
              color={color}
              index={i}
              label={cssVar}
              cssVar={cssVar}
              valueFormat={resolvePaletteFormat(paletteTier, i)}
              onChange={props.onChange}
              address={address}
              changed={changed}
              onRevert={revert}
              services={services}
            />
          );
        }}
      </For>
    </div>
  );
}

interface SemanticGridProps {
  tab: TabConfig;
  tabs: readonly TabConfig[];
  model: SemanticModel;
  palette: ReadonlySignal<readonly string[]>;
  paletteCssVar: (i: number) => string;
  background?: ReadonlySignal<string | undefined>;
  foreground?: ReadonlySignal<string | undefined>;
  previewRampValue: ReadonlySignal<(ref: TierRefTarget) => string>;
  defaultMode: 'light' | 'dark';
  onIndexChange: (key: string, val: PaletteIndexValue) => void;
  onLiteralChange: (key: string, val: LiteralMapping) => void;
  onRefOrLiteralChange: (key: string, next: TierRefSelectorValue) => void;
  onRevert?: (address: TokenAddress) => void;
  services: PanelServices;
}

type SemanticRowKind = 'ramp' | 'literal' | 'index';

function SemanticGrid(props: SemanticGridProps) {
  const { tab, model, onRevert, services } = props;
  return (
    <div class="tokenpanel-color-base-grid">
      <For each={model.visible} by={(row) => row.key}>
        {(entry) => {
          const row = entry.value;
          const { key, mapping, address, changed } = row;
          const label = row.cssVar ?? key;
          const revert = address && onRevert ? () => onRevert(address) : undefined;
          // A tier that declares `referencesRamps` routes both its ref and
          // literal values — single-mode AND per-mode alike — through the
          // grouped ref-or-literal picker (S9 #470 / S12 #473), so the user
          // can switch between a cross-tab ramp reference and an arbitrary
          // OKLCH literal (optionally split light/dark).
          const semanticTier = findSemanticTier(tab, key);
          const hasRampSources = (semanticTier?.referencesRamps?.length ?? 0) > 0;
          const kind = computed((): SemanticRowKind => {
            const current = mapping.value;
            if (hasRampSources && (isRefMapping(current) || isLiteralMapping(current))) return 'ramp';
            return isLiteralMapping(current) ? 'literal' : 'index';
          });
          return (
            <Rebuild value={kind}>
              {(current): Child => {
                if (current === 'ramp') {
                  return (
                    <SemanticRefOrLiteralRow
                      label={label}
                      idKey={key}
                      tab={tab}
                      tabs={props.tabs}
                      tierId={semanticTier!.id}
                      value={computed((): TierRefSelectorValue => {
                        const value = mapping.value;
                        // Passed through as-is in the literal branch:
                        // rebuilding `{ literal: value.literal }` collapses the
                        // `string | { light, dark }` union into a shape TS
                        // can't match back to `TierRefSelectorValue`.
                        if (isRefMapping(value)) return { ref: value.ref };
                        return isLiteralMapping(value) ? value : { literal: '' };
                      })}
                      onChange={props.onRefOrLiteralChange}
                      previewValueFor={props.previewRampValue}
                      cssVar={row.cssVar}
                      defaultMode={props.defaultMode}
                      address={address}
                      changed={changed}
                      onRevert={revert}
                      services={services}
                    />
                  );
                }
                // Any `{ literal }` mapping on a tier with NO
                // `referencesRamps` renders an editable OKLCH swatch (S3,
                // #464) instead of a palette-index dropdown.
                if (current === 'literal') {
                  return (
                    <SemanticLiteralRow
                      label={label}
                      idKey={key}
                      value={computed((): LiteralMapping => {
                        const value = mapping.value;
                        return isLiteralMapping(value) ? value : { literal: '' };
                      })}
                      onChange={props.onLiteralChange}
                      cssVar={row.cssVar}
                      defaultMode={props.defaultMode}
                      address={address}
                      changed={changed}
                      onRevert={revert}
                      services={services}
                    />
                  );
                }
                return (
                  <PaletteSelector
                    label={label}
                    idKey={key}
                    value={computed(() => toIndexMappingForSelector(mapping.value))}
                    palette={props.palette}
                    paletteCssVar={props.paletteCssVar}
                    onChange={props.onIndexChange}
                    background={props.background}
                    foreground={props.foreground}
                    cssVar={row.cssVar}
                    address={address}
                    changed={changed}
                    onRevert={revert}
                    services={services}
                  />
                );
              }}
            </Rebuild>
          );
        }}
      </For>
    </div>
  );
}

// --- Color tab body ---

export interface ColorTabProps {
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
   * already resolves against `cfg.tabs` via `createPersist` (`applyFullState`,
   * `state/persist.ts`). Omitted (e.g. a direct test render) →
   * `getPanelConfig()`, preserving the single-instance path.
   */
  instanceConfig?: PanelConfig;
  /** Live generic-tab overrides used by ramp preview chips and option labels. */
  tabOverrides?: Record<string, TabOverrides>;
  /** Header-filter query applied to palette and semantic rows. */
  searchQuery?: string;
  /** S2 evaluator callback supplied by the mounted panel shell. */
  isChanged?: (address: TokenAddress) => boolean;
  /** Transient active-tab Changed-only filter. */
  changedOnly?: boolean;
  /** Shell transaction callback for one-row revert. */
  onRevert?: (address: TokenAddress) => void;
  services: PanelServices;
}

const EMPTY_TAB_OVERRIDES: Record<string, TabOverrides> = {};
const EMPTY_PALETTE: readonly string[] = [];

export default function ColorTab(props: Reactive<
  ColorTabProps,
  'tab' | 'persistColor' | 'secondaryTab' | 'persistSecondary' | 'instanceConfig' | 'onRevert' | 'services'
>) {
  const { tab, persistColor, secondaryTab, persistSecondary, onRevert, services } = props;
  // Derive the cluster from the tab's colorExtras + tiers. This provides the
  // same shape that the rest of the panel (apply, clear, state) expects.
  // The full tabs array is threaded in so a semantic tier's cross-tab `{ ref }`
  // mappings resolve against a ramp tier in another tab (e.g. the Palette tab).
  const cfg = props.instanceConfig ?? getPanelConfig();
  const allTabs = cfg.tabs;
  // Fallback to an empty stub cluster when the tab has no colorExtras.
  const safeCluster: ColorClusterDataConfig = resolveColorClusterFromTab(tab, allTabs) ?? {
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
  };
  const secondaryCluster = secondaryTab ? resolveColorClusterFromTab(secondaryTab, allTabs) ?? null : null;
  // Each cluster's configured default light/dark mode (#472) — the side a
  // per-mode literal collapses to when the user unchecks "Per-mode" (S12,
  // #473).
  const primaryDefaultMode = getClusterDefaultMode(safeCluster);
  const secondaryDefaultMode = secondaryCluster ? getClusterDefaultMode(secondaryCluster) : 'light';
  // Host-supplied preset list (`configurePanel({ ..., colorPresets })`); the
  // package itself ships zero presets. Cluster-bundled schemes win on key
  // collision: they are the cluster owner's documented defaults, and the host
  // preset list is the broader experimentation pool.
  const hostPresets = cfg.colorPresets ?? {};
  const allPresets: Record<string, ColorScheme> = { ...hostPresets, ...safeCluster.colorSchemes };
  const bundledNames = Object.keys(safeCluster.colorSchemes);
  const presetNames = Object.keys(hostPresets).sort();

  // Section headings derive from the cluster label (or its upper-cased id).
  const primaryLabel = safeCluster.label ?? safeCluster.id.toUpperCase();
  const secondaryLabel = secondaryCluster?.label ?? secondaryCluster?.id.toUpperCase() ?? '';
  const clusterPaletteCssVar = (i: number) => resolvePaletteCssVar(safeCluster, i);
  const secondaryPaletteCssVar = (i: number) => (secondaryCluster ? resolvePaletteCssVar(secondaryCluster, i) : '');

  // The palette tier carries the per-slot `type.format` that
  // `resolveColorClusterFromTab` flattens away — recover it here so the swatch
  // grid can route oklch-format slots through the lossless OKLCH editor.
  const paletteTier = findPaletteTier(tab);
  const secondaryPaletteTier = secondaryTab ? findPaletteTier(secondaryTab) : undefined;

  const state = computed(() => read(props.state));
  const secondaryState = computed(() => read(props.secondaryState));
  const palette = computed((): readonly string[] => state.value.palette);
  const secondaryPalette = computed((): readonly string[] => secondaryState.value?.palette ?? EMPTY_PALETTE);
  const query = computed(() => (read(props.searchQuery) ?? '').trim());
  const changedOnly = computed(() => read(props.changedOnly) ?? false);
  const changedFor = computed((): ChangedFor => {
    const isChanged = read(props.isChanged);
    return (address) => isChanged?.(address) ?? false;
  });
  const tabOverrides = computed(() => read(props.tabOverrides) ?? EMPTY_TAB_OVERRIDES);

  const primaryPalette = createPaletteModel(
    tab.id,
    paletteTier,
    (index) => resolvePaletteCssVar(safeCluster, index),
    palette,
    query,
    changedOnly,
    changedFor,
  );
  const primarySemantic = createSemanticModel(
    tab,
    safeCluster,
    paletteTier,
    computed(() => state.value.semanticMappings),
    query,
    changedOnly,
    changedFor,
  );
  const secondaryPaletteModel = createPaletteModel(
    secondaryTab?.id ?? 'color-secondary',
    secondaryPaletteTier,
    (index, item) => (secondaryCluster ? resolvePaletteCssVar(secondaryCluster, index) : item.cssVar),
    computed(() => (secondaryState.value ? secondaryPalette.value : EMPTY_PALETTE)),
    query,
    changedOnly,
    changedFor,
  );
  const secondarySemantic = secondaryCluster && secondaryTab
    ? createSemanticModel(
        secondaryTab,
        secondaryCluster,
        secondaryPaletteTier,
        computed(() => secondaryState.value?.semanticMappings ?? {}),
        query,
        changedOnly,
        changedFor,
      )
    : null;
  const hasSecondary = computed(() => secondarySemantic !== null && secondaryState.value !== null);
  const hasChangedColorRows = computed(() =>
    primaryPalette.hasChanged.value ||
    primarySemantic.hasChanged.value ||
    (hasSecondary.value && (secondaryPaletteModel.hasChanged.value || secondarySemantic!.hasChanged.value)));

  const handlePaletteChange = (index: number, value: string) => {
    persistColor((prev) => ({
      ...prev,
      palette: prev.palette.map((c, i) => (i === index ? value : c)),
    }));
  };
  const handleSecondaryPaletteChange = (index: number, value: string) => {
    persistSecondary((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        palette: prev.palette.map((c, i) => (i === index ? value : c)),
      };
    });
  };
  const writeSemantic = (key: string, value: SemanticValue) => {
    persistColor((prev) => ({
      ...prev,
      semanticMappings: { ...prev.semanticMappings, [key]: value },
    }));
  };
  const writeSecondarySemantic = (key: string, value: SemanticValue) => {
    persistSecondary((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        semanticMappings: { ...prev.semanticMappings, [key]: value },
      };
    });
  };
  // `next` is returned as-is in the literal branch (not rebuilt as
  // `{ literal: next.literal }`) — reconstructing collapses the
  // `string | { light, dark }` union into one shape TS can't match back to
  // `SemanticValue`'s two distinct `{ literal }` members.
  const refOrLiteral = (next: TierRefSelectorValue): SemanticValue => ('ref' in next ? { ref: next.ref } : next);

  // The runtime guard pins the actual write to the known base-role keys
  // ColorTweakState declares.
  const handleBaseIndexChange = (key: string, val: PaletteIndexValue) => {
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
  };

  // Preview-text resolvers for the grouped picker's ramp options — one bound
  // to the primary cluster's own tab (the default "current tab" for
  // same-tab ramp sources), one to the secondary cluster's tab.
  const previewRampValue = computed(() => makeRampPreview(tab, allTabs, tabOverrides.value));
  const secondaryPreviewRampValue = computed(() =>
    makeRampPreview(secondaryTab ?? tab, allTabs, tabOverrides.value));

  const handleLoadPreset = (name: string) => {
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
  };

  const hasPalette = computed(() => palette.value.length > 0);
  const semanticHeading = (label: string): Child => (
    <div
      role="heading"
      aria-level={3}
      class="tokenpanel-tab-section-heading tokenpanel-tab-section-heading--color tokenpanel-tab-section-heading--with-help"
    >
      {label} — Semantic Tokens
      <HelpIcon
        text={SEMANTIC_TOKENS_HELP_TEXT}
        ariaLabel={`${label} Semantic Tokens help`}
        tooltip={services.tooltip}
      />
    </div>
  );

  return (
    <div class="tokenpanel-tab-content">
      {/*
       * Preset loader — tab-scoped so the outer header row stays general.
       * Gated on `safeCluster.paletteSize > 0`: a palette-less cluster (a
       * lone `semantic: true` tier, #458) has no palette for a scheme/preset
       * to seed — `initColorFromSchemeData` treats a load against it as a
       * no-op (#488), so offering the control here would be dead UI even
       * when the host configured `colorPresets`.
       */}
      {safeCluster.paletteSize > 0 ? (
        <div class="tokenpanel-tab-actions">
          <select
            on:change={(e: Event) => {
              const target = e.currentTarget as HTMLSelectElement;
              const name = target.value;
              if (name) {
                handleLoadPreset(name);
                target.value = '';
              }
            }}
            class="tokenpanel-color-preset-select"
            aria-label="Load color scheme preset"
          >
            <option value="" disabled selected>
              Scheme...
            </option>
            {bundledNames.length > 0
              ? [
                  <optgroup label="Built-in">
                    {bundledNames.map((name) => <option value={name}>{name}</option>)}
                  </optgroup>,
                ]
              : []}
            {presetNames.length > 0
              ? [
                  <optgroup label="Presets">
                    {presetNames.map((name) => <option value={name}>{name}</option>)}
                  </optgroup>,
                ]
              : []}
          </select>
        </div>
      ) : null}

      {/*
       * Section A: Raw Palette — and Section B: Base Theme, which indexes
       * into that palette. Both are gated on a non-empty palette: a lone
       * `semantic: true` tier (no palette sibling, paletteSize 0, #458) has
       * no palette to render or index into.
       */}
      <Show when={computed(() => hasPalette.value && primaryPalette.show.value)}>
        {() => (
          <div class="tokenpanel-tab-section">
            <div role="heading" aria-level={3} class="tokenpanel-tab-section-heading tokenpanel-tab-section-heading--color">
              {primaryLabel} — Palette
            </div>
            <PaletteGrid
              tab={tab}
              paletteTier={paletteTier}
              cluster={safeCluster}
              palette={palette}
              model={primaryPalette}
              gridClass="tokenpanel-color-palette-grid"
              onChange={handlePaletteChange}
              onRevert={onRevert}
              services={services}
            />
          </div>
        )}
      </Show>

      {/* Base + Semantic wrapper */}
      <div class="tokenpanel-tab-content">
        <Show when={computed(() => hasPalette.value && !changedOnly.value)}>
          {() => (
            <div class="tokenpanel-tab-section">
              <div role="heading" aria-level={3} class="tokenpanel-tab-section-heading tokenpanel-tab-section-heading--color">
                {primaryLabel} — Base
              </div>
              {/*
               * `background (bg)` and `foreground (fg)` are palette-index
               * knobs: the value picks which palette slot seeds that base
               * role. The eye toggle wires to the cluster's declared
               * base-role cssVar — a real token written to the DOM by
               * `applyColorState`. When a cluster declares no cssVar for a
               * base role, the eye is omitted. The `cursor`, `sel-bg`,
               * `sel-fg` upstream rows are dropped here because nothing in
               * this package references them.
               */}
              <div class="tokenpanel-color-base-grid">
                <PaletteSelector
                  label="background (bg)"
                  idKey="background"
                  value={computed(() => state.value.background)}
                  palette={palette}
                  paletteCssVar={clusterPaletteCssVar}
                  onChange={handleBaseIndexChange}
                  cssVar={safeCluster.baseRoles.background}
                  address={{ tabId: tab.id, tierId: '__base__', itemId: 'background' }}
                  changed={computed(() => false)}
                  services={services}
                />
                <PaletteSelector
                  label="foreground (fg)"
                  idKey="foreground"
                  value={computed(() => state.value.foreground)}
                  palette={palette}
                  paletteCssVar={clusterPaletteCssVar}
                  onChange={handleBaseIndexChange}
                  cssVar={safeCluster.baseRoles.foreground}
                  address={{ tabId: tab.id, tierId: '__base__', itemId: 'foreground' }}
                  changed={computed(() => false)}
                  services={services}
                />
              </div>
            </div>
          )}
        </Show>

        {/* Section C: Semantic Token Mappings */}
        <Show when={primarySemantic.show}>
          {() => (
            <div class="tokenpanel-tab-section">
              {semanticHeading(primaryLabel)}
              <SemanticGrid
                tab={tab}
                tabs={allTabs}
                model={primarySemantic}
                palette={palette}
                paletteCssVar={clusterPaletteCssVar}
                background={computed(() => state.value.palette[state.value.background])}
                foreground={computed(() => state.value.palette[state.value.foreground])}
                previewRampValue={previewRampValue}
                defaultMode={primaryDefaultMode}
                onIndexChange={writeSemantic}
                onLiteralChange={writeSemantic}
                onRefOrLiteralChange={(key, next) => writeSemantic(key, refOrLiteral(next))}
                onRevert={onRevert}
                services={services}
              />
            </div>
          )}
        </Show>

        {/*
         * Secondary-cluster sections render ONLY when the host has opted
         * in with a secondary color tab. The `data-testid` markers below give
         * Playwright a stable handle for asserting presence / absence.
         */}
        {secondaryCluster && secondaryTab && secondarySemantic ? (
          <Show when={hasSecondary}>
            {() => (
              <>
                {/* Section D: SECONDARY — Palette */}
                <Show when={secondaryPaletteModel.show}>
                  {() => (
                    <div class="tokenpanel-tab-section" data-testid="tokenpanel-secondary-palette-section">
                      <div role="heading" aria-level={3} class="tokenpanel-tab-section-heading tokenpanel-tab-section-heading--color">
                        {secondaryLabel} — Palette
                      </div>
                      <PaletteGrid
                        tab={secondaryTab}
                        paletteTier={secondaryPaletteTier}
                        cluster={secondaryCluster}
                        palette={secondaryPalette}
                        model={secondaryPaletteModel}
                        gridClass="tokenpanel-color-palette-grid--secondary"
                        onChange={handleSecondaryPaletteChange}
                        onRevert={onRevert}
                        services={services}
                      />
                    </div>
                  )}
                </Show>

                {/* Section E: SECONDARY — Semantic Tokens */}
                <Show when={secondarySemantic.show}>
                  {() => (
                    <div class="tokenpanel-tab-section" data-testid="tokenpanel-secondary-semantic-section">
                      {semanticHeading(secondaryLabel)}
                      <SemanticGrid
                        tab={secondaryTab}
                        tabs={allTabs}
                        model={secondarySemantic}
                        palette={secondaryPalette}
                        paletteCssVar={secondaryPaletteCssVar}
                        previewRampValue={secondaryPreviewRampValue}
                        defaultMode={secondaryDefaultMode}
                        onIndexChange={writeSecondarySemantic}
                        onLiteralChange={writeSecondarySemantic}
                        onRefOrLiteralChange={(key, next) => writeSecondarySemantic(key, refOrLiteral(next))}
                        onRevert={onRevert}
                        services={services}
                      />
                    </div>
                  )}
                </Show>
              </>
            )}
          </Show>
        ) : null}

        <Show when={computed(() => changedOnly.value && !hasChangedColorRows.value)}>
          {() => (
            <div class="tokenpanel-changed-empty" data-testid="tokenpanel-changed-empty">
              No changed tokens in this tab — everything is at its manifest default.
            </div>
          )}
        </Show>

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
