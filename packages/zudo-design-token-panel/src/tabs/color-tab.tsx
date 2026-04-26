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
 * popover. No raw-color inputs (rgb / hex text field / lab / oklch) are
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
import { hexToHsl, hslToHex } from '../utils/color-convert';
import {
  type ColorTweakState,
  applyShikiTheme,
  initColorFromSchemeData,
  resolvePaletteCssVar,
} from '../state/tweak-state';
import { getPanelConfig, resolveSecondaryColorCluster } from '../config/panel-config';
import type { PersistColor, PersistSecondary } from '../state/persist';

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

function HslPicker({
  color,
  onChange,
  onClose,
  anchorRef,
}: {
  color: string;
  onChange: (hex: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hsl, setHsl] = useState(() => hexToHsl(color));
  const [hexInput, setHexInput] = useState(color);

  useEffect(() => {
    setHsl(hexToHsl(color));
    setHexInput(color);
  }, [color]);

  usePopoverClose(containerRef, onClose, true);

  function updateFromHsl(newHsl: { h: number; s: number; l: number }) {
    setHsl(newHsl);
    const hex = hslToHex(newHsl.h, newHsl.s, newHsl.l);
    setHexInput(hex);
    onChange(hex);
  }

  function handleHexChange(value: string) {
    setHexInput(value);
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      setHsl(hexToHsl(value));
      onChange(value);
    }
  }

  const sliders = [
    { label: 'H', value: hsl.h, max: 360, key: 'h' as const },
    { label: 'S', value: hsl.s, max: 100, key: 's' as const },
    { label: 'L', value: hsl.l, max: 100, key: 'l' as const },
  ];

  return (
    <div
      ref={containerRef}
      className="tokenpanel-popover"
      style={getFixedPopoverStyle(anchorRef.current, 380, 280, { width: 380 })}
    >
      <div className="tokenpanel-hsl-header">
        <div
          className="tokenpanel-hsl-preview"
          style={{ backgroundColor: hslToHex(hsl.h, hsl.s, hsl.l) }}
        />
        <input
          type="text"
          value={hexInput}
          onChange={(e) => handleHexChange((e.target as HTMLInputElement).value)}
          className="tokenpanel-hsl-hex-input"
          spellcheck={false}
          aria-label="Hex color value"
        />
      </div>
      {sliders.map(({ label, value, max, key }) => (
        <div key={key} className="tokenpanel-hsl-row">
          <span className="tokenpanel-hsl-row-label">{label}</span>
          <input
            type="range"
            min={0}
            max={max}
            value={value}
            onChange={(e) =>
              updateFromHsl({
                ...hsl,
                [key]: parseInt((e.target as HTMLInputElement).value, 10),
              })
            }
            className="tokenpanel-hsl-row-slider"
            aria-label={`${label === 'H' ? 'Hue' : label === 'S' ? 'Saturation' : 'Lightness'}`}
          />
          <span className="tokenpanel-hsl-row-value">
            {value}
            {key === 'h' ? '' : '%'}
          </span>
        </div>
      ))}
    </div>
  );
}

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
}: {
  color: string;
  onChange: (index: number, hex: string) => void;
  index: number;
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const handleClose = useCallback(() => setIsOpen(false), []);
  const handleHexChange = useCallback(
    (hex: string) => {
      onChange(index, hex);
    },
    [onChange, index],
  );
  return (
    <div className="tokenpanel-color-swatch-wrap">
      <button
        ref={buttonRef}
        type="button"
        className="tokenpanel-color-swatch-button"
        style={{ backgroundColor: color }}
        onClick={() => setIsOpen((prev) => !prev)}
        title={`${label}: ${color}`}
        aria-label={`${label}: ${color}`}
      />
      {isOpen && (
        <HslPicker
          color={color}
          onChange={handleHexChange}
          onClose={handleClose}
          anchorRef={buttonRef}
        />
      )}
      <span className="tokenpanel-color-swatch-label" title={label}>
        {label}
      </span>
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
}) {
  const resolvePaletteCssVar = paletteCssVar ?? ((i: number) => `--zd-p${i}`);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const handleClose = useCallback(() => setIsOpen(false), []);

  const resolvedColor =
    value === 'bg'
      ? (background ?? '#000000')
      : value === 'fg'
        ? (foreground ?? '#ffffff')
        : (palette[value] ?? '#000000');

  const valueLabel = value === 'bg' ? 'bg' : value === 'fg' ? 'fg' : `p${value}`;

  usePopoverClose(containerRef, handleClose, isOpen);

  function select(val: number | 'bg' | 'fg') {
    onChange(idKey, val);
    setIsOpen(false);
  }

  return (
    <div className="tokenpanel-palette-selector" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="tokenpanel-palette-trigger"
        aria-label={`${label}: ${valueLabel}`}
        title={`${label}: ${valueLabel}`}
        aria-expanded={isOpen}
      >
        <span className="tokenpanel-palette-trigger-label" title={label}>
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
      </button>

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
                  <button
                    key={opt}
                    type="button"
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
                  </button>
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
                <button
                  key={i}
                  type="button"
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
  state: ColorTweakState;
  persistColor: PersistColor;
  /**
   * Secondary cluster state, or `null` when the host opted out of the
   * secondary cluster. The render path below short-circuits when
   * `secondaryCluster` resolves to `null`, so the slice is only touched
   * inside that conditional block.
   */
  secondaryState: ColorTweakState | null;
  persistSecondary: PersistSecondary;
}

export default function ColorTab({
  state,
  persistColor,
  secondaryState,
  persistSecondary,
}: ColorTabProps) {
  // Read the active cluster + scheme registry through panelConfig so a host
  // that calls `configurePanel` with its own colorCluster sees its data
  // drive both the Scheme… dropdown (bundled schemes) and the palette CSS
  // var labels (resolvePaletteCssVar).
  const cluster = getPanelConfig().colorCluster;
  // Secondary cluster is host-driven. When the host opted out (null) or
  // omitted the field, `secondaryCluster` is null and the secondary
  // sections below short-circuit to nothing. When configured, this is
  // the host-supplied cluster.
  const secondaryCluster = resolveSecondaryColorCluster();
  // Sub S5c (#1590) — host-supplied preset list. Read through the panel
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
    () => ({ ...hostPresets, ...cluster.colorSchemes }),
    [hostPresets, cluster.colorSchemes],
  );
  const bundledNames = useMemo(() => Object.keys(cluster.colorSchemes), [cluster.colorSchemes]);
  const presetNames = useMemo(() => Object.keys(hostPresets).sort(), [hostPresets]);

  // Section headings derive from `cluster.label` (or
  // `cluster.id.toUpperCase()` as a fallback) so a host-supplied cluster
  // gets its sections labelled with whatever the host configured.
  const primaryLabel = cluster.label ?? cluster.id.toUpperCase();
  const secondaryLabel = secondaryCluster?.label ?? secondaryCluster?.id.toUpperCase() ?? '';

  // Stable per-cluster `paletteCssVar` callbacks — passed into memoised
  // ColorSwatch / PaletteSelector so prop equality holds across renders.
  const clusterPaletteCssVar = useCallback(
    (i: number) => resolvePaletteCssVar(cluster, i),
    [cluster],
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
          {bundledNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
          <hr />
          {presetNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Section A: Raw Palette */}
      <div className="tokenpanel-tab-section">
        <h3 className="tokenpanel-tab-section-heading tokenpanel-tab-section-heading--color">
          {primaryLabel} — Palette
        </h3>
        <div className="tokenpanel-color-palette-grid">
          {state.palette.map((color, i) => (
            // ColorSwatch passes `i` back via its (index, hex) onChange so we
            // hand `handlePaletteChange` directly — no inline arrow, memo
            // stays effective.
            <ColorSwatch
              key={i}
              color={color}
              index={i}
              label={resolvePaletteCssVar(cluster, i)}
              onChange={handlePaletteChange}
            />
          ))}
        </div>
      </div>

      {/* Base + Semantic wrapper */}
      <div className="tokenpanel-tab-content">
        {/* Section B: Base Theme */}
        <div className="tokenpanel-tab-section">
          <h3 className="tokenpanel-tab-section-heading tokenpanel-tab-section-heading--color">
            {primaryLabel} — Base
          </h3>
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
          <h3 className="tokenpanel-tab-section-heading tokenpanel-tab-section-heading--color">
            {primaryLabel} — Semantic Tokens
          </h3>
          <div className="tokenpanel-color-base-grid">
            {Object.entries(cluster.semanticDefaults).map(([key, defaultVal]) => {
              return (
                <PaletteSelector
                  key={key}
                  label={cluster.semanticCssNames[key] ?? key}
                  idKey={key}
                  value={state.semanticMappings[key] ?? defaultVal}
                  palette={state.palette}
                  paletteCssVar={clusterPaletteCssVar}
                  onChange={handleSemanticChange}
                  background={state.palette[state.background]}
                  foreground={state.palette[state.foreground]}
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
              <h3 className="tokenpanel-tab-section-heading tokenpanel-tab-section-heading--color">
                {secondaryLabel} — Palette
              </h3>
              <div className="tokenpanel-color-palette-grid--secondary">
                {secondaryState.palette.map((color, i) => (
                  <ColorSwatch
                    key={i}
                    color={color}
                    index={i}
                    label={resolvePaletteCssVar(secondaryCluster, i)}
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
              <h3 className="tokenpanel-tab-section-heading tokenpanel-tab-section-heading--color">
                {secondaryLabel} — Semantic Tokens
              </h3>
              <div className="tokenpanel-color-base-grid">
                {Object.entries(secondaryCluster.semanticDefaults).map(([key, defaultVal]) => {
                  return (
                    <PaletteSelector
                      key={key}
                      label={secondaryCluster.semanticCssNames[key] ?? key}
                      idKey={key}
                      value={secondaryState.semanticMappings[key] ?? defaultVal}
                      palette={secondaryState.palette}
                      paletteCssVar={secondaryPaletteCssVar}
                      onChange={handleSecondarySemanticChange}
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
  );
}
