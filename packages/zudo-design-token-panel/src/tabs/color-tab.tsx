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
 * palette index (p0–p15) or one of the `bg`/`fg` extras. The 16 Palette
 * swatches themselves are the only inputs that edit a hex via the HSL
 * popover. No raw-color inputs (rgb / hex text field / lab) are
 * exposed for Base or Semantic rows.
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

import { memo, useState, useEffect, useCallback, useMemo, useRef } from 'preact/compat';
import type { ColorScheme } from '../config/color-schemes';
import ColorPicker from '../components/color-picker';
import {
  type ColorTweakState,
  applyShikiTheme,
  initColorFromSchemeData,
  resolvePaletteCssVar,
} from '../state/tweak-state';
import { getPanelConfig } from '../config/panel-config';
import { resolveColorClusterFromTab } from '../config/cluster-config';
import type { TabConfig } from '../tokens/tier-model';
import type { PersistColor, PersistSecondary } from '../state/persist';
import { HighlightToggleButton } from '../highlight/highlight-toggle-button';
import { TooltipProvider, useTooltip } from '../controls/tooltip';

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

// --- Shared popover helpers (Color-tab scoped) ---

/** Close popover on outside click, Escape, or ancestor scroll */
function usePopoverClose(
  containerRef: React.RefObject<HTMLElement | null>,
  onClose: () => void,
  isOpen: boolean,
) {
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
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
function getFixedPopoverStyle(
  anchor: HTMLElement | null,
  estW: number,
  estH: number,
  extraStyle?: React.CSSProperties,
): React.CSSProperties {
  if (!anchor) return { position: 'fixed', zIndex: 70, ...extraStyle };
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
    zIndex: 70,
    ...extraStyle,
  };
  if (flipAbove) {
    style.bottom = window.innerHeight - rect.top + gap;
  } else {
    style.top = rect.bottom + gap;
  }
  return style;
}

// --- UI Components ---

/**
 * Single palette swatch with HSL popover.
 *
 * `onChange` is `(index, hex)` — the swatch passes its own palette `index`
 * back so the parent can use a single stable handler across every cell,
 * keeping React.memo effective. The same component is reused by both the
 * primary and secondary palettes because the `onChange` shape is
 * parameterised on the parent's per-cluster handler.
 */
const ColorSwatch = memo(function ColorSwatch({
  color,
  onChange,
  index,
  label,
  cssVar,
}: {
  color: string;
  onChange: (index: number, hex: string) => void;
  index: number;
  label: string;
  /** CSS custom property name (e.g. `--zd-p3`) used to wire the eye toggle.
   *  When present, a HighlightToggleButton appears in the swatch label row. */
  cssVar?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const handleClose = useCallback(() => setIsOpen(false), []);
  const handleHexChange = useCallback(
    (hex: string) => {
      onChange(index, hex);
    },
    [onChange, index],
  );
  const handleToggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const tooltipProps = useTooltip(`${label}: ${color}`);
  return (
    <div className="tokenpanel-color-swatch-wrap">
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
          onChange={handleHexChange}
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
}) {
  const resolvePaletteCssVar = paletteCssVar ?? ((i: number) => `--zd-p${i}`);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const handleClose = useCallback(() => setIsOpen(false), []);
  const handleToggle = useCallback(() => setIsOpen((prev) => !prev), []);

  const resolvedColor =
    value === 'bg'
      ? (background ?? '#000000')
      : value === 'fg'
        ? (foreground ?? '#ffffff')
        : (palette[value] ?? '#000000');

  const valueLabel = value === 'bg' ? 'bg' : value === 'fg' ? 'fg' : `p${value}`;

  usePopoverClose(containerRef, handleClose, isOpen);

  const tooltipProps = useTooltip(`${label}: ${valueLabel}`);

  function select(val: number | 'bg' | 'fg') {
    onChange(idKey, val);
    setIsOpen(false);
  }

  return (
    <div className="tokenpanel-palette-selector" ref={containerRef}>
      <div
        ref={buttonRef}
        role="button"
        tabIndex={0}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
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
          role="listbox"
          aria-label={`${label} color options`}
          className="tokenpanel-palette-options"
          style={getFixedPopoverStyle(buttonRef.current, 440, extraOptions ? 160 : 120)}
        >
          {/* Extra options (bg/fg) */}
          {extraOptions && extraOptions.length > 0 && (
            <div className="tokenpanel-palette-options-extras">
              {extraOptions.map((opt) => {
                const optColor =
                  opt === 'bg' ? (background ?? '#000000') : (foreground ?? '#ffffff');
                const isSelected = value === opt;
                return (
                  <div
                    key={opt}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => select(opt)}
                    className={
                      isSelected
                        ? 'tokenpanel-palette-extra-option is-selected'
                        : 'tokenpanel-palette-extra-option'
                    }
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
              const cssVar = resolvePaletteCssVar(i);
              return (
                <div
                  key={i}
                  role="option"
                  aria-selected={isSelected}
                  aria-label={`${cssVar}: ${color}`}
                  onClick={() => select(i)}
                  title={`${cssVar}: ${color}`}
                  className={
                    isSelected
                      ? 'tokenpanel-palette-option-button is-selected'
                      : 'tokenpanel-palette-option-button'
                  }
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
}

export default function ColorTab({
  tab,
  state,
  persistColor,
  secondaryTab,
  secondaryState,
  persistSecondary,
}: ColorTabProps) {
  // Derive the cluster from the tab's colorExtras + tiers. This provides the
  // same shape that the rest of the panel (apply, clear, state) expects.
  const cluster = useMemo(() => resolveColorClusterFromTab(tab), [tab]);
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
    () => (secondaryTab ? resolveColorClusterFromTab(secondaryTab) ?? null : null),
    [secondaryTab],
  );
  // Host-supplied preset list. Read through the panel
  // config so a host that calls `configurePanel({ ..., colorPresets })`
  // surfaces its presets in the Scheme... dropdown. The package itself
  // ships zero presets — `colorPresets` defaults to `{}` on
  // `DEFAULT_PANEL_CONFIG` so a host that omits the field sees only
  // `cluster.colorSchemes` (the bundled, cluster-local scheme registry).
  const hostPresets = getPanelConfig().colorPresets ?? {};
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

  const handlePaletteChange = useCallback(
    (index: number, hex: string) => {
      persistColor((prev) => ({
        ...prev,
        palette: prev.palette.map((c, i) => (i === index ? hex : c)),
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
    (index: number, hex: string) => {
      persistSecondary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          palette: prev.palette.map((c, i) => (i === index ? hex : c)),
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

  const handleLoadPreset = useCallback(
    (name: string) => {
      const scheme = allPresets[name];
      if (!scheme) return;
      const newState = initColorFromSchemeData(scheme);
      persistColor(() => newState);
      applyShikiTheme(newState.shikiTheme);
    },
    [persistColor],
  );

  return (
    <TooltipProvider>
    <div className="tokenpanel-tab-content">
      {/* Preset loader — tab-scoped so the outer header row stays general */}
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
          <optgroup label="Built-in">
            {bundledNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </optgroup>
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

      {/* Section A: Raw Palette */}
      <div className="tokenpanel-tab-section">
        <div role="heading" aria-level={3} className="tokenpanel-tab-section-heading tokenpanel-tab-section-heading--color">
          {primaryLabel} — Palette
        </div>
        <div className="tokenpanel-color-palette-grid">
          {state.palette.map((color, i) => (
            // ColorSwatch passes `i` back via its (index, hex) onChange so we
            // hand `handlePaletteChange` directly — no inline arrow, memo
            // stays effective.
            <ColorSwatch
              key={i}
              color={color}
              index={i}
              label={resolvePaletteCssVar(safeCluster, i)}
              cssVar={resolvePaletteCssVar(safeCluster, i)}
              onChange={handlePaletteChange}
            />
          ))}
        </div>
      </div>

      {/* Base + Semantic wrapper */}
      <div className="tokenpanel-tab-content">
        {/* Section B: Base Theme */}
        <div className="tokenpanel-tab-section">
          <div role="heading" aria-level={3} className="tokenpanel-tab-section-heading tokenpanel-tab-section-heading--color">
            {primaryLabel} — Base
          </div>
          {/*
           * `background (bg)` and `foreground (fg)` are panel-only knobs that
           * pick which palette index seeds the rest of the UI; they do NOT
           * correspond to real `--zd-*` cssVars in this package, so the
           * labels read as plain English with the short key in parentheses
           * (intentionally not the full `--zd-…` form). The `cursor`,
           * `sel-bg`, `sel-fg` upstream rows are dropped here because
           * nothing in this package references them.
           */}
          <div className="tokenpanel-color-base-grid">
            <PaletteSelector
              label="background (bg)"
              idKey="background"
              value={state.background}
              palette={state.palette}
              paletteCssVar={clusterPaletteCssVar}
              onChange={handleBaseIndexChange}
            />
            <PaletteSelector
              label="foreground (fg)"
              idKey="foreground"
              value={state.foreground}
              palette={state.palette}
              paletteCssVar={clusterPaletteCssVar}
              onChange={handleBaseIndexChange}
            />
          </div>
        </div>

        {/* Section C: Semantic Token Mappings */}
        <div className="tokenpanel-tab-section">
          <div role="heading" aria-level={3} className="tokenpanel-tab-section-heading tokenpanel-tab-section-heading--color">
            {primaryLabel} — Semantic Tokens
          </div>
          <div className="tokenpanel-color-base-grid">
            {Object.entries(safeCluster.semanticDefaults).map(([key, defaultVal]) => {
              const semanticCssVar = safeCluster.semanticCssNames[key];
              return (
                <PaletteSelector
                  key={key}
                  label={semanticCssVar ?? key}
                  idKey={key}
                  value={state.semanticMappings[key] ?? defaultVal}
                  palette={state.palette}
                  paletteCssVar={clusterPaletteCssVar}
                  onChange={handleSemanticChange}
                  background={state.palette[state.background]}
                  foreground={state.palette[state.foreground]}
                  cssVar={semanticCssVar}
                />
              );
            })}
          </div>
        </div>

        {/*
         * Secondary-cluster sections render ONLY when the host has opted
         * in by passing a `secondaryColorCluster` object on the panel
         * config. The `data-testid` markers below give Playwright a
         * stable handle for asserting presence / absence.
         */}
        {secondaryCluster && secondaryState && (
          <>
            {/* Section D: SECONDARY — Palette */}
            <div
              className="tokenpanel-tab-section"
              data-testid="tokenpanel-secondary-palette-section"
            >
              <div role="heading" aria-level={3} className="tokenpanel-tab-section-heading tokenpanel-tab-section-heading--color">
                {secondaryLabel} — Palette
              </div>
              <div className="tokenpanel-color-palette-grid--secondary">
                {secondaryState.palette.map((color, i) => (
                  <ColorSwatch
                    key={i}
                    color={color}
                    index={i}
                    label={resolvePaletteCssVar(secondaryCluster, i)}
                    cssVar={resolvePaletteCssVar(secondaryCluster, i)}
                    onChange={handleSecondaryPaletteChange}
                  />
                ))}
              </div>
            </div>

            {/* Section E: SECONDARY — Semantic Tokens */}
            <div
              className="tokenpanel-tab-section"
              data-testid="tokenpanel-secondary-semantic-section"
            >
              <div role="heading" aria-level={3} className="tokenpanel-tab-section-heading tokenpanel-tab-section-heading--color">
                {secondaryLabel} — Semantic Tokens
              </div>
              <div className="tokenpanel-color-base-grid">
                {Object.entries(secondaryCluster.semanticDefaults).map(([key, defaultVal]) => {
                  const secondarySemanticCssVar = secondaryCluster.semanticCssNames[key];
                  return (
                    <PaletteSelector
                      key={key}
                      label={secondarySemanticCssVar ?? key}
                      idKey={key}
                      value={secondaryState.semanticMappings[key] ?? defaultVal}
                      palette={secondaryState.palette}
                      paletteCssVar={secondaryPaletteCssVar}
                      onChange={handleSecondarySemanticChange}
                      cssVar={secondarySemanticCssVar}
                    />
                  );
                })}
              </div>
            </div>
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
    </TooltipProvider>
  );
}
