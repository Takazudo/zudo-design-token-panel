// @ts-check
/**
 * ColorPicker — dual-mode (OKLCH | HSL) color picker for the design-token panel.
 *
 * Renders as a "popover body only" component — the parent is responsible for
 * mounting/unmounting based on an open/closed boolean. No trigger swatch, no
 * portal, no createPortal.
 *
 * Issue #175 (Wave 2 of the OKLCH Picker epic, issue #174-base).
 *
 * Design rules (see packages/zudo-design-token-panel/CLAUDE.md):
 *   - All interactive elements use <div role="button" tabIndex={0}> with
 *     explicit Enter/Space onKeyDown handlers. No <button> or <h*> allowed.
 *   - BEM class names: tokenpanel-color-picker-* (locked external contract).
 *   - usePopoverClose: pointerdown + Escape only — NO scroll listener.
 *   - Mode persisted to localStorage under key tokenpanel.colorPicker.mode.
 *   - Alpha always shown; alpha ∈ [0, 100] scale throughout.
 *   - useSyncedHex: incoming color prop ignored while isDraggingRef.current.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/compat';
import type { JSX } from 'preact';

import { hexToHsla, hslaToHex } from '../../utils/color-hsla';
import {
  type Oklcha,
  clampToSrgbGamut,
  hexToOklcha,
  hslaToOklcha,
  isInSrgbGamut,
  MAX_OKLCH_CHROMA,
  oklchaToCss,
  oklchaToHex,
} from '../../utils/color-oklch';
import { CustomSlider, type SliderConfig } from './custom-slider';

/* ── Public API ─────────────────────────────────────────────────────────── */

export type ColorPickerMode = 'oklch' | 'hsl';

export interface ColorPickerProps {
  /** Current hex color (#RRGGBB or #RRGGBBAA). Source of truth. */
  color: string;
  /** Called when the user commits a new color via any sub-control. */
  onChange: (hex: string) => void;
  /** Optional label rendered in the picker header. */
  label?: string;
  /**
   * Initial mode. The runtime mode is uncontrolled inside the component
   * and persisted via localStorage[LOCAL_STORAGE_KEY]. Defaults to 'oklch'.
   */
  defaultMode?: ColorPickerMode;
  /** Element to anchor the popover against (popover sits below/above it). */
  anchorRef: React.RefObject<HTMLElement | null>;
  /** Called when the picker requests to close itself (Escape / outside click). */
  onClose: () => void;
}

/* ── Constants ──────────────────────────────────────────────────────────── */

export const LOCAL_STORAGE_KEY = 'tokenpanel.colorPicker.mode';

// 6×6 preset grid spec.
// L values step ≈ -17 from 95 down to 10 (rounded for clean lightness bands).
const PRESET_L_ROWS = [95, 78, 61, 44, 27, 10];
// Mini shell (6 cols): hue 0° → 300° in 60° steps.
const PRESET_H_COLS_MINI = [0, 60, 120, 180, 240, 300];
// Expanded shell (12 cols): hue 0° → 330° in 30° steps.
const PRESET_H_COLS_EXPANDED = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const PRESET_C_FIXED = 0.18;

/* ── Local helpers ──────────────────────────────────────────────────────── */

function oklchSliderConfigs(): SliderConfig[] {
  return [
    {
      key: 'l',
      label: 'L',
      ariaLabel: 'Lightness',
      min: 0,
      max: 100,
      step: 1,
      format: (v) => `${Math.round(v)}%`,
    },
    {
      key: 'c',
      label: 'C',
      ariaLabel: 'Chroma',
      min: 0,
      max: MAX_OKLCH_CHROMA,
      step: 0.001,
      format: (v) => v.toFixed(3),
    },
    {
      key: 'h',
      label: 'H',
      ariaLabel: 'Hue',
      min: 0,
      max: 360,
      step: 1,
      format: (v) => `${Math.round(v)}°`,
    },
    {
      key: 'a',
      label: 'A',
      ariaLabel: 'Alpha',
      min: 0,
      max: 100,
      step: 1,
      format: (v) => `${Math.round(v)}%`,
    },
  ];
}

function hslSliderConfigs(): SliderConfig[] {
  return [
    {
      key: 'h',
      label: 'H',
      ariaLabel: 'Hue',
      min: 0,
      max: 360,
      step: 1,
      format: (v) => `${Math.round(v)}°`,
    },
    {
      key: 's',
      label: 'S',
      ariaLabel: 'Saturation',
      min: 0,
      max: 100,
      step: 1,
      format: (v) => `${Math.round(v)}%`,
    },
    {
      key: 'l',
      label: 'L',
      ariaLabel: 'Lightness',
      min: 0,
      max: 100,
      step: 1,
      format: (v) => `${Math.round(v)}%`,
    },
    {
      key: 'a',
      label: 'A',
      ariaLabel: 'Alpha',
      min: 0,
      max: 100,
      step: 1,
      format: (v) => `${Math.round(v)}%`,
    },
  ];
}

function presetOklchForCell(
  rowIdx: number,
  colIdx: number,
  alpha: number,
  hCols: readonly number[],
): Oklcha {
  return {
    l: PRESET_L_ROWS[rowIdx] ?? 50,
    c: PRESET_C_FIXED,
    h: hCols[colIdx] ?? 0,
    a: alpha,
  };
}

function readPersistedMode(fallback: ColorPickerMode): ColorPickerMode {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw === 'oklch' || raw === 'hsl') return raw;
  } catch {
    // localStorage can throw in sandboxed iframes or test envs — fall through.
  }
  return fallback;
}

function writePersistedMode(mode: ColorPickerMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, mode);
  } catch {
    // Ignore quota / sandbox errors.
  }
}

/**
 * Ignore incoming `color` prop changes while a slider drag is in flight.
 *
 * Returns the hex that internal state should sync to. While dragging is
 * active the most-recent local hex is preserved.
 */
function useSyncedHex(
  externalHex: string,
  isDraggingRef: React.RefObject<boolean>,
): [string, (next: string) => void] {
  const [hex, setHex] = useState(externalHex);
  useEffect(() => {
    if (isDraggingRef.current) return;
    setHex(externalHex);
  }, [externalHex, isDraggingRef]);
  return [hex, setHex];
}

/**
 * Compute a `position: fixed` style that places the popover below (or above,
 * if flipped) the anchor element, then clamps all edges inside the viewport.
 *
 * When vertical space is scarce on both sides, the popover is pinned to the
 * top edge (top = pad) and given a max-height + overflow: auto so it scrolls
 * rather than clips.
 */
export function getFixedPopoverStyle(
  anchor: HTMLElement | null,
  estW: number,
  estH: number,
): JSX.CSSProperties {
  if (!anchor) return { position: 'fixed' };
  const rect = anchor.getBoundingClientRect();
  const gap = 4;
  const pad = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const below = vh - rect.bottom - gap - pad;
  const above = rect.top - gap - pad;
  const flipAbove = below < estH && above > below;

  // Horizontal: clamp left so the popover stays inside the viewport.
  let left = rect.left;
  if (left + estW > vw - pad) left = vw - pad - estW;
  if (left < pad) left = pad;

  // Vertical: derive a top value from the chosen placement.
  let top: number;
  if (flipAbove) {
    top = rect.top - gap - estH;
  } else {
    top = rect.bottom + gap;
  }

  // Clamp top to keep the popover fully visible.
  if (top < pad) top = pad;
  if (top + estH > vh - pad) top = vh - pad - estH;

  const style: JSX.CSSProperties = { position: 'fixed', left, top };

  // When the content is taller than the viewport, pin to the top edge and
  // let the popover scroll rather than clip off-screen.
  if (estH > vh - 2 * pad) {
    style.top = pad;
    style.maxHeight = vh - 2 * pad;
    style.overflowY = 'auto';
  }

  return style;
}

/**
 * Close the popover on outside pointerdown or Escape key.
 *
 * Deliberately does NOT close on scroll — a scroll event on the host page
 * should not dismiss an in-flight color edit.
 */
export function usePopoverClose(
  containerRef: React.RefObject<HTMLElement | null>,
  onClose: () => void,
): void {
  // Stable ref so effect deps don't change on every render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onCloseRef.current();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current();
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
    // containerRef is a stable object — its .current changes but the ref
    // itself doesn't. Omit from deps intentionally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/* ── Main component ─────────────────────────────────────────────────────── */

/**
 * ColorPicker — popover body only.
 *
 * The parent renders `{isOpen && <ColorPicker ... />}`. This component does
 * NOT render a trigger swatch and does NOT use createPortal.
 */
export function ColorPicker({
  color,
  onChange,
  label,
  defaultMode = 'oklch',
  anchorRef,
  onClose,
}: ColorPickerProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [hex, setHex] = useSyncedHex(color, isDraggingRef);

  const [mode, setMode] = useState<ColorPickerMode>(() =>
    readPersistedMode(defaultMode),
  );
  const [shell, setShell] = useState<'mini' | 'expanded'>('mini');

  const [hexInput, setHexInput] = useState(hex);
  useEffect(() => setHexInput(hex), [hex]);

  usePopoverClose(containerRef, onClose);

  // OKLCH and HSL projections of the current hex.
  // Recomputed on render — hex is the single source of truth.
  const oklch = useMemo(() => hexToOklcha(hex), [hex]);
  const hsla = useMemo(() => hexToHsla(hex), [hex]);

  const commit = useCallback(
    (next: string) => {
      setHex(next);
      setHexInput(next);
      onChange(next);
    },
    [setHex, onChange],
  );

  const commitOklch = useCallback(
    (partial: Partial<Oklcha>) => {
      const next: Oklcha = {
        l: partial.l ?? oklch.l,
        c: partial.c ?? oklch.c,
        h: partial.h ?? oklch.h,
        a: partial.a ?? oklch.a,
      };
      commit(oklchaToHex(next));
    },
    [oklch, commit],
  );

  const commitHsl = useCallback(
    (partial: { h?: number; s?: number; l?: number; a?: number }) => {
      const next = {
        h: partial.h ?? hsla.h,
        s: partial.s ?? hsla.s,
        l: partial.l ?? hsla.l,
        a: partial.a ?? hsla.a,
      };
      commit(hslaToHex(next.h, next.s, next.l, next.a));
    },
    [hsla, commit],
  );

  const handleHexChange = (value: string) => {
    setHexInput(value);
    if (
      /^#[0-9a-fA-F]{6}$/.test(value) ||
      /^#[0-9a-fA-F]{8}$/.test(value)
    ) {
      commit(value);
    }
  };

  // Active hue columns depend on the current shell.
  const presetHCols =
    shell === 'expanded' ? PRESET_H_COLS_EXPANDED : PRESET_H_COLS_MINI;

  const handlePresetClick = useCallback(
    (rowIdx: number, colIdx: number) => {
      const preset = presetOklchForCell(rowIdx, colIdx, oklch.a, presetHCols);
      const safe = clampToSrgbGamut(preset);
      commit(oklchaToHex(safe));
    },
    [oklch.a, presetHCols, commit],
  );

  const handleGridKeyDown = useCallback(
    (
      e: KeyboardEvent,
      rowIdx: number,
      colIdx: number,
    ) => {
      let nextRow = rowIdx;
      let nextCol = colIdx;
      if (e.key === 'ArrowRight')
        nextCol = Math.min(presetHCols.length - 1, colIdx + 1);
      else if (e.key === 'ArrowLeft') nextCol = Math.max(0, colIdx - 1);
      else if (e.key === 'ArrowDown')
        nextRow = Math.min(PRESET_L_ROWS.length - 1, rowIdx + 1);
      else if (e.key === 'ArrowUp') nextRow = Math.max(0, rowIdx - 1);
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handlePresetClick(rowIdx, colIdx);
        return;
      } else return;
      e.preventDefault();
      const next = containerRef.current?.querySelector<HTMLElement>(
        `[data-grid-row="${nextRow}"][data-grid-col="${nextCol}"]`,
      );
      next?.focus();
    },
    [presetHCols, handlePresetClick],
  );

  const handleModeToggle = (next: ColorPickerMode) => {
    // Mode toggle is pure view-state — no onChange emit.
    writePersistedMode(next);
    setMode(next);
  };

  const oklchConfigs = useMemo(() => oklchSliderConfigs(), []);
  const hslConfigs = useMemo(() => hslSliderConfigs(), []);

  // Slider gradients.
  // Syntax: "<angle> in <space>" — NOT "in <space> <angle>".
  const sliderGradients = useMemo(() => {
    if (mode === 'oklch') {
      return {
        l: `linear-gradient(90deg in oklch, ${oklchaToCss({ l: 0, c: oklch.c, h: oklch.h, a: 100 })}, ${oklchaToCss({ l: 100, c: oklch.c, h: oklch.h, a: 100 })})`,
        c: `linear-gradient(90deg in oklch, ${oklchaToCss({ l: oklch.l, c: 0, h: oklch.h, a: 100 })}, ${oklchaToCss({ l: oklch.l, c: MAX_OKLCH_CHROMA, h: oklch.h, a: 100 })})`,
        h: `linear-gradient(90deg in oklch longer hue, ${oklchaToCss({ l: oklch.l, c: oklch.c, h: 0, a: 100 })}, ${oklchaToCss({ l: oklch.l, c: oklch.c, h: 360, a: 100 })})`,
        a: `linear-gradient(90deg in oklch, ${oklchaToCss({ ...oklch, a: 0 })}, ${oklchaToCss({ ...oklch, a: 100 })})`,
      };
    }
    return {
      h: `linear-gradient(90deg in oklch longer hue, ${oklchaToCss(hslaToOklcha({ h: 0, s: hsla.s, l: hsla.l, a: 100 }))}, ${oklchaToCss(hslaToOklcha({ h: 360, s: hsla.s, l: hsla.l, a: 100 }))})`,
      s: `linear-gradient(90deg in oklch, ${oklchaToCss(hslaToOklcha({ h: hsla.h, s: 0, l: hsla.l, a: 100 }))}, ${oklchaToCss(hslaToOklcha({ h: hsla.h, s: 100, l: hsla.l, a: 100 }))})`,
      l: `linear-gradient(90deg in oklch, ${oklchaToCss(hslaToOklcha({ h: hsla.h, s: hsla.s, l: 0, a: 100 }))}, ${oklchaToCss(hslaToOklcha({ h: hsla.h, s: hsla.s, l: 100, a: 100 }))})`,
      a: `linear-gradient(90deg in oklch, ${oklchaToCss(hslaToOklcha({ ...hsla, a: 0 }))}, ${oklchaToCss(hslaToOklcha({ ...hsla, a: 100 }))})`,
    };
  }, [mode, oklch, hsla]);

  // Popover positioning — recompute when shell changes (different width).
  const [autoStyle, setAutoStyle] = useState<JSX.CSSProperties>(() => ({
    position: 'fixed',
    visibility: 'hidden',
  }));
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) {
      setAutoStyle({ position: 'fixed', visibility: 'hidden' });
      return;
    }
    setAutoStyle(getFixedPopoverStyle(anchor, shell === 'mini' ? 320 : 520, 400));
  }, [anchorRef, shell]);

  const selectedOklch = useMemo(() => hexToOklcha(hex), [hex]);

  // Checkerboard is only needed when the color has a non-opaque alpha byte.
  const hasAlpha = /^#[0-9a-fA-F]{8}$/.test(hex);

  const onDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);
  const onDragEnd = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className="tokenpanel-color-picker"
      data-mode-shell={shell}
      style={autoStyle}
      role="dialog"
      aria-label={label ? `${label} color picker` : 'Color picker'}
    >
      {/* Header ─────────────────────────────────────────────────────────── */}
      <div className="tokenpanel-color-picker-header">
        <span className="tokenpanel-color-picker-label">{label ?? 'Color'}</span>

        {/* Mode toggle: OKLCH | HSL */}
        <div
          className="tokenpanel-color-picker-mode-toggle"
          role="group"
          aria-label="Color mode"
        >
          <div
            role="button"
            tabIndex={0}
            className="tokenpanel-color-picker-mode-btn"
            aria-pressed={mode === 'oklch'}
            onClick={() => handleModeToggle('oklch')}
            onKeyDown={(e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleModeToggle('oklch');
              }
            }}
          >
            OKLCH
          </div>
          <div
            role="button"
            tabIndex={0}
            className="tokenpanel-color-picker-mode-btn"
            aria-pressed={mode === 'hsl'}
            onClick={() => handleModeToggle('hsl')}
            onKeyDown={(e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleModeToggle('hsl');
              }
            }}
          >
            HSL
          </div>
        </div>

        {/* Expand / collapse toggle */}
        <div
          role="button"
          tabIndex={0}
          className="tokenpanel-color-picker-expand-btn"
          aria-label={shell === 'mini' ? 'Expand picker' : 'Collapse picker'}
          aria-expanded={shell === 'expanded'}
          onClick={() => setShell(shell === 'mini' ? 'expanded' : 'mini')}
          onKeyDown={(e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setShell(shell === 'mini' ? 'expanded' : 'mini');
            }
          }}
        >
          {shell === 'mini' ? '⤢' : '⤡'}
        </div>
      </div>

      {/* Top row: preview swatch + hex input ───────────────────────────── */}
      <div className="tokenpanel-color-picker-top-row">
        <div className="tokenpanel-color-picker-preview">
          {hasAlpha && (
            <div className="tokenpanel-color-picker-preview-checkerboard" />
          )}
          <div
            className="tokenpanel-color-picker-preview-color"
            style={{ backgroundColor: hex }}
          />
        </div>
        <input
          type="text"
          className="tokenpanel-color-picker-hex-input"
          value={hexInput}
          onChange={(e: Event) =>
            handleHexChange((e.target as HTMLInputElement).value)
          }
          spellcheck={false}
          aria-label="Hex color value"
        />
      </div>

      {/* Preset grid ─────────────────────────────────────────────────────── */}
      <div
        className="tokenpanel-color-picker-grid"
        role="grid"
        aria-label="Color presets"
      >
        {PRESET_L_ROWS.map((_, rowIdx) =>
          presetHCols.map((_h, colIdx) => {
            const cell = presetOklchForCell(rowIdx, colIdx, oklch.a, presetHCols);
            const inGamut = isInSrgbGamut(cell);
            const safeCss = oklchaToCss(clampToSrgbGamut(cell));
            const isSelected =
              Math.abs(selectedOklch.l - cell.l) < 2 &&
              Math.abs(((selectedOklch.h - cell.h + 360) % 360)) < 5 &&
              Math.abs(selectedOklch.c - cell.c) < 0.05;
            return (
              <div
                key={`${rowIdx}-${colIdx}`}
                role="gridcell"
                data-grid-row={rowIdx}
                data-grid-col={colIdx}
                data-oog={inGamut ? 'false' : 'true'}
                aria-selected={isSelected}
                aria-label={`Preset L ${cell.l}% H ${cell.h}°`}
                className="tokenpanel-color-picker-grid-cell"
                style={{ background: safeCss }}
                tabIndex={rowIdx === 0 && colIdx === 0 ? 0 : -1}
                onClick={() => handlePresetClick(rowIdx, colIdx)}
                onKeyDown={(e: KeyboardEvent) =>
                  handleGridKeyDown(e, rowIdx, colIdx)
                }
              />
            );
          }),
        )}
      </div>

      {/* Sliders ────────────────────────────────────────────────────────── */}
      <div className="tokenpanel-color-picker-sliders">
        {mode === 'oklch'
          ? oklchConfigs.map((cfg) => (
              <CustomSlider
                key={cfg.key}
                config={cfg}
                value={
                  (oklch as unknown as Record<string, number>)[cfg.key] ?? 0
                }
                gradient={
                  (sliderGradients as unknown as Record<string, string>)[
                    cfg.key
                  ] ?? ''
                }
                onChange={(v) => commitOklch({ [cfg.key]: v } as Partial<Oklcha>)}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            ))
          : hslConfigs.map((cfg) => (
              <CustomSlider
                key={cfg.key}
                config={cfg}
                value={
                  (hsla as unknown as Record<string, number>)[cfg.key] ?? 0
                }
                gradient={
                  (sliderGradients as unknown as Record<string, string>)[
                    cfg.key
                  ] ?? ''
                }
                onChange={(v) => commitHsl({ [cfg.key]: v })}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            ))}
      </div>

      {/* Readout (expanded shell only) ───────────────────────────────────── */}
      {shell === 'expanded' && (
        <div className="tokenpanel-color-picker-readout" aria-live="polite">
          L {Math.round(oklch.l)}% · C {oklch.c.toFixed(3)} · H{' '}
          {Math.round(oklch.h)}°
        </div>
      )}
    </div>
  );
}

export default ColorPicker;
