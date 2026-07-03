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
 * Design rules (see packages/zdtp/CLAUDE.md):
 *   - All interactive elements use <div role="button" tabIndex={0}> with
 *     explicit Enter/Space onKeyDown handlers. Native button and heading tags
 *     are not used (hostile-host policy).
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
  cssToOklcha,
  hexToOklcha,
  hslaToOklcha,
  isInSrgbGamut,
  MAX_OKLCH_CHROMA,
  oklchaToCss,
  oklchaToHex,
  oklchaToHsla,
} from '../../utils/color-oklch';
import { CustomSlider, type SliderConfig } from './custom-slider';
import { pushDismissLayer } from '../../controls/dismiss-layer';

/* ── Public API ─────────────────────────────────────────────────────────── */

export type ColorPickerMode = 'oklch' | 'hsl';

/**
 * Output value format for the picker.
 *
 *   'hex'   — `color` prop is a hex string, `onChange` emits hex. The internal
 *             source of truth is the hex string. (Default — back-compatible.)
 *   'oklch' — `color` prop is a CSS `oklch(...)` string (a hex is also tolerated
 *             on input), `onChange` emits a normalized `oklch(...)` string. The
 *             internal source of truth is a canonical `Oklcha`, so wide-gamut
 *             chroma and sub-step precision survive edits without sRGB clamping.
 */
export type ColorPickerValueFormat = 'hex' | 'oklch';

export interface ColorPickerProps {
  /**
   * Current color. In `valueFormat='hex'` (default) this is a hex string
   * (#RRGGBB or #RRGGBBAA). In `valueFormat='oklch'` this is a CSS `oklch(...)`
   * string (a hex is tolerated and parsed via the hex path as a fallback).
   */
  color: string;
  /**
   * Called when the user commits a new color via any sub-control. The argument
   * matches `valueFormat`: a hex string in 'hex' mode, an `oklch(...)` string
   * in 'oklch' mode.
   */
  onChange: (value: string) => void;
  /**
   * Output format for `color` / `onChange`. Defaults to 'hex' (back-compatible
   * with existing callers that pass no value).
   */
  valueFormat?: ColorPickerValueFormat;
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

// Popover size constants (spec-mandated dimensions).
const MINI_POPOVER_W = 320;
const MINI_POPOVER_H = 400;
const EXPANDED_POPOVER_W = 520;
const EXPANDED_POPOVER_H = 440;

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
      // Clamp to 359: hue ∈ [0, 360) — committing max=360 round-trips to 0
      // because parseAngleToDeg normalises ((360 % 360) + 360) % 360 = 0,
      // snapping the slider thumb to the far left (F30 fix).
      max: 359,
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
 * Parse the incoming `color` prop into a canonical Oklcha for oklch mode.
 *
 * Prefers `cssToOklcha` (preserves wide-gamut chroma and sub-step precision).
 * Falls back to `hexToOklcha` when the prop is a hex string (or any non-oklch
 * value) that `cssToOklcha` rejects.
 */
function parseOklchColor(css: string): Oklcha {
  return cssToOklcha(css) ?? hexToOklcha(css);
}

/**
 * OKLCH-mode analogue of `useSyncedHex`: keeps a canonical Oklcha as the
 * source of truth and ignores incoming `color` prop changes while a slider
 * drag is in flight (so a mid-gesture external prop change cannot clobber the
 * dragged value). The wide-gamut chroma and precision of the canonical value
 * survive because it is never round-tripped through hex.
 */
function useSyncedOklch(
  externalColor: string,
  isDraggingRef: React.RefObject<boolean>,
): [Oklcha, (next: Oklcha) => void] {
  const [oklch, setOklch] = useState<Oklcha>(() => parseOklchColor(externalColor));
  useEffect(() => {
    if (isDraggingRef.current) return;
    setOklch(parseOklchColor(externalColor));
  }, [externalColor, isDraggingRef]);
  return [oklch, setOklch];
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
 *
 * `anchorRef` (F11): the popover's trigger element lives OUTSIDE `containerRef`.
 * A pointerdown on the trigger while the popover is open must NOT trigger the
 * outside-close, otherwise it races the trigger's own click-to-toggle: the
 * pointerdown closes, then the click reopens, so the trigger can never dismiss
 * its own popover. Excluding the anchor lets the click toggle it shut.
 *
 * Escape is arbitrated by the shared dismiss-layer stack (F10): only the
 * topmost open popover consumes a single Escape, so one keypress never also
 * tears down the panel underneath.
 */
export function usePopoverClose(
  containerRef: React.RefObject<HTMLElement | null>,
  onClose: () => void,
  anchorRef?: React.RefObject<HTMLElement | null>,
): void {
  // Stable ref so effect deps don't change on every render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (containerRef.current && containerRef.current.contains(target)) return;
      if (anchorRef?.current && anchorRef.current.contains(target)) return;
      onCloseRef.current();
    }
    document.addEventListener('pointerdown', handlePointerDown);
    const removeLayer = pushDismissLayer({
      onEscape: () => onCloseRef.current(),
      getElement: () => containerRef.current,
    });
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      removeLayer();
    };
    // containerRef / anchorRef are stable objects — their .current changes but
    // the ref identity does not. Omit from deps intentionally.
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
  valueFormat = 'hex',
  label,
  defaultMode = 'oklch',
  anchorRef,
  onClose,
}: ColorPickerProps): JSX.Element {
  const isOklchFormat = valueFormat === 'oklch';

  const containerRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLSpanElement>(null);
  const isDraggingRef = useRef(false);

  // Two parallel sources of truth, one per output format. In hex mode the hex
  // string is canonical (byte-for-byte unchanged from the legacy behavior). In
  // oklch mode the canonical Oklcha is the source of truth so wide-gamut chroma
  // & precision survive without round-tripping through sRGB hex.
  const [hexState, setHexState] = useSyncedHex(color, isDraggingRef);
  const [canonicalOklch, setCanonicalOklch] = useSyncedOklch(
    color,
    isDraggingRef,
  );

  // The hex shown by the picker. In oklch mode this is the sRGB projection of
  // the canonical value (for the hex-input box, preview is handled separately).
  const hex = isOklchFormat ? oklchaToHex(canonicalOklch) : hexState;

  // ── Drag-handle state ─────────────────────────────────────────────────────
  // dragPos holds the current dragged-to position (left, top in viewport px).
  // null means auto-positioned (normal anchor-relative behavior).
  // Session-only: the popover unmounts when the parent closes it, so dragPos
  // resets to null on every open.
  const [dragPos, setDragPos] = useState<{ left: number; top: number } | null>(
    null,
  );
  // Ref tracking the pointer start position and the popover's base rect for
  // the current drag gesture. Never causes a re-render.
  const dragSession = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    baseLeft: number;
    baseTop: number;
  } | null>(null);
  const isDraggingHandle = useRef(false);

  const [mode, setMode] = useState<ColorPickerMode>(() =>
    readPersistedMode(defaultMode),
  );
  const [shell, setShell] = useState<'mini' | 'expanded'>('mini');

  const [hexInput, setHexInput] = useState(hex);
  useEffect(() => {
    // Only clobber hexInput when it holds a fully-committed valid hex. If the
    // user has started typing a partial string (e.g. "#33"), leave it alone so
    // an external prop change does not erase the in-progress edit.
    if (
      /^#[0-9a-fA-F]{6}$/.test(hexInput) ||
      /^#[0-9a-fA-F]{8}$/.test(hexInput)
    ) {
      setHexInput(hex);
    }
  // hexInput intentionally excluded from deps: we only want to re-run when hex
  // changes. Reading hexInput inside the effect is safe — we only write when the
  // current value is a valid committed hex.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hex]);

  // Pass the trigger anchor so clicking it toggles the popover shut instead of
  // the outside-close racing the trigger's click and reopening it (F11).
  usePopoverClose(containerRef, onClose, anchorRef);

  // OKLCH and HSL projections of the current color.
  // In hex mode, hex is the single source of truth and both are derived from it.
  // In oklch mode, the canonical Oklcha is the source of truth — `oklch` is that
  // value directly (preserving wide-gamut chroma). The HSL slider values are an
  // sRGB-oriented projection: HSL cannot represent wide-gamut colors, so a
  // wide-gamut canonical value is gamut-mapped (clampToSrgbGamut) before the
  // oklch → Hsla conversion, keeping the displayed S/L within the sane 0–100
  // range. This is a VIEW projection only — the canonical Oklcha is never
  // mutated by it (toggling to HSL stays non-clamping). The single
  // deliberately-lossy mutation happens in commitHsl on an actual slider edit.
  const oklch = useMemo(
    () => (isOklchFormat ? canonicalOklch : hexToOklcha(hex)),
    [isOklchFormat, canonicalOklch, hex],
  );
  const hsla = useMemo(
    () =>
      isOklchFormat
        ? oklchaToHsla(clampToSrgbGamut(canonicalOklch))
        : hexToHsla(hex),
    [isOklchFormat, canonicalOklch, hex],
  );

  // Commit a hex string (hex mode) or, in oklch mode, the `oklch()` of that hex.
  // The internal hex state and hex-input box always track the (normalized) hex
  // so the input box keeps showing the sRGB projection for reference.
  const commit = useCallback(
    (next: string) => {
      const normalized = next.toLowerCase();
      setHexState(normalized);
      setHexInput(normalized);
      if (isOklchFormat) {
        // The hex-input box and preset grid commit a hex; in oklch mode emit
        // the oklch() of that hex (hex → Oklcha → oklch string), never raw hex.
        const asOklch = parseOklchColor(normalized);
        setCanonicalOklch(asOklch);
        onChange(oklchaToCss(asOklch));
      } else {
        onChange(normalized);
      }
    },
    [setHexState, setCanonicalOklch, isOklchFormat, onChange],
  );

  // Commit a canonical Oklcha directly without any sRGB clamp — used by the
  // OKLCH sliders and the preset grid in oklch mode so out-of-gamut chroma and
  // precision survive. Emits the normalized oklch() string.
  const commitCanonicalOklch = useCallback(
    (next: Oklcha) => {
      setCanonicalOklch(next);
      // Keep the hex-input box / hex state in sync with the sRGB projection.
      const projHex = oklchaToHex(next).toLowerCase();
      setHexState(projHex);
      setHexInput(projHex);
      onChange(oklchaToCss(next));
    },
    [setCanonicalOklch, setHexState, onChange],
  );

  const commitOklch = useCallback(
    (partial: Partial<Oklcha>) => {
      const next: Oklcha = {
        l: partial.l ?? oklch.l,
        c: partial.c ?? oklch.c,
        h: partial.h ?? oklch.h,
        a: partial.a ?? oklch.a,
      };
      if (isOklchFormat) {
        commitCanonicalOklch(next);
      } else {
        commit(oklchaToHex(next));
      }
    },
    [oklch, isOklchFormat, commitCanonicalOklch, commit],
  );

  const commitHsl = useCallback(
    (partial: { h?: number; s?: number; l?: number; a?: number }) => {
      const next = {
        h: partial.h ?? hsla.h,
        s: partial.s ?? hsla.s,
        l: partial.l ?? hsla.l,
        a: partial.a ?? hsla.a,
      };
      if (isOklchFormat) {
        // DELIBERATELY LOSSY PATH. HSL is an sRGB-oriented edit space: an HSL
        // slider edit reinterprets the color through sRGB. Convert the edited
        // HSL straight to the canonical Oklcha (hsl → Oklcha) and emit oklch(),
        // so the format contract still holds while the value is sRGB-reanchored.
        // A wide-gamut chroma the user was *viewing* in HSL mode is collapsed
        // here — this is the single intentional precision-losing edit. (Merely
        // toggling OKLCH↔HSL does NOT take this path; handleModeToggle never
        // commits, so viewing in HSL alone never loses the wide-gamut value.)
        commitCanonicalOklch(hslaToOklcha(next));
      } else {
        commit(hslaToHex(next.h, next.s, next.l, next.a));
      }
    },
    [hsla, isOklchFormat, commitCanonicalOklch, commit],
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
      if (isOklchFormat) {
        // Commit the cell's UNCLAMPED Oklcha so wide-gamut presets survive.
        // (The display background still uses clampToSrgbGamut — see the grid.)
        commitCanonicalOklch(preset);
      } else {
        const safe = clampToSrgbGamut(preset);
        commit(oklchaToHex(safe));
      }
    },
    [oklch.a, presetHCols, isOklchFormat, commitCanonicalOklch, commit],
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
    setAutoStyle(
      getFixedPopoverStyle(
        anchor,
        shell === 'mini' ? MINI_POPOVER_W : EXPANDED_POPOVER_W,
        shell === 'mini' ? MINI_POPOVER_H : EXPANDED_POPOVER_H,
      ),
    );
  }, [anchorRef, shell]);

  // ── Drag-handle pointer handlers ─────────────────────────────────────────
  // Mirrors pgen's color-picker-oklch drag implementation. Wired via
  // addEventListener (not Preact JSX onPointer* props) for the same reason as
  // custom-slider.tsx — Preact's jsdom feature-detection registers PointerEvent
  // listeners with wrong casing, so tests dispatching 'pointerdown' miss them.
  // Pointer capture keeps move/up flowing even if the pointer leaves the handle.
  useEffect(() => {
    const el = dragHandleRef.current;
    if (!el) return;

    function handlePointerDown(e: PointerEvent) {
      e.preventDefault();
      // Stop propagation so the document-level outside-click handler can't
      // possibly receive this pointerdown. Defensive — even though the handle
      // sits inside containerRef, mirroring pgen's pattern keeps the contract
      // explicit.
      e.stopPropagation();
      const container = containerRef.current;
      if (!container) return;
      // Freeze the current rendered position (absolute left/top in viewport).
      // Use getBoundingClientRect so we always operate in `top` space regardless
      // of whether the auto-position used `top` or `bottom` CSS.
      const rect = container.getBoundingClientRect();
      dragSession.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        baseLeft: rect.left,
        baseTop: rect.top,
      };
      isDraggingHandle.current = true;
      try {
        el!.setPointerCapture(e.pointerId);
      } catch {
        // jsdom does not implement setPointerCapture; ignore.
      }
    }

    function handlePointerMove(e: PointerEvent) {
      if (!isDraggingHandle.current || !dragSession.current) return;
      if (e.pointerId !== dragSession.current.pointerId) return;
      const { startX, startY, baseLeft, baseTop } = dragSession.current;
      const newLeft = baseLeft + (e.clientX - startX);
      const newTop = baseTop + (e.clientY - startY);
      setDragPos({ left: newLeft, top: newTop });
    }

    function handlePointerUp(e: PointerEvent) {
      if (!isDraggingHandle.current || !dragSession.current) return;
      if (e.pointerId !== dragSession.current.pointerId) return;
      isDraggingHandle.current = false;
      dragSession.current = null;
      try {
        el!.releasePointerCapture(e.pointerId);
      } catch {
        // jsdom does not implement releasePointerCapture; ignore.
      }
      // Re-clamp to keep the popover fully on-screen after release.
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const pad = 8;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const clampedLeft = Math.max(
        pad,
        Math.min(vw - pad - rect.width, rect.left),
      );
      const clampedTop = Math.max(
        pad,
        Math.min(vh - pad - rect.height, rect.top),
      );
      setDragPos({ left: clampedLeft, top: clampedTop });
    }

    el.addEventListener('pointerdown', handlePointerDown);
    el.addEventListener('pointermove', handlePointerMove);
    el.addEventListener('pointerup', handlePointerUp);
    el.addEventListener('pointercancel', handlePointerUp);

    return () => {
      el.removeEventListener('pointerdown', handlePointerDown);
      el.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('pointerup', handlePointerUp);
      el.removeEventListener('pointercancel', handlePointerUp);
    };
    // Empty dep array — handlers close over stable refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Checkerboard is only needed when the color is non-opaque. In hex mode the
  // 8-digit hex byte signals alpha; in oklch mode the canonical alpha does.
  const hasAlpha = isOklchFormat
    ? canonicalOklch.a < 100
    : /^#[0-9a-fA-F]{8}$/.test(hex);

  // Preview swatch background. In oklch mode use the canonical oklch() value so
  // wide-gamut colors render correctly (and are not silently sRGB-clamped); in
  // hex mode keep the exact hex string the legacy path used.
  const previewBackground = isOklchFormat ? oklchaToCss(canonicalOklch) : hex;

  const onDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);
  const onDragEnd = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Final container style — dragPos takes precedence over auto-positioning
  // once the user has grabbed the handle and moved the popover.
  const containerStyle: JSX.CSSProperties = dragPos
    ? { position: 'fixed', left: dragPos.left, top: dragPos.top }
    : autoStyle;

  return (
    <div
      ref={containerRef}
      className="tokenpanel-color-picker"
      data-mode-shell={shell}
      style={containerStyle}
      role="dialog"
      aria-label={label ? `${label} color picker` : 'Color picker'}
    >
      {/* Header ─────────────────────────────────────────────────────────── */}
      <div className="tokenpanel-color-picker-header">
        {/* Drag handle — braille-dots glyph (⠿, U+283F) per pgen mockup.
            role="presentation"+aria-hidden so assistive tech skips the glyph.
            <span> chosen over <div> per zdtp panel-DOM-hygiene policy: span is
            not in the host-resettable tag list and matches pgen's pattern. */}
        <span
          ref={dragHandleRef}
          className="tokenpanel-color-picker-drag-handle"
          role="presentation"
          aria-hidden="true"
        >
          ⠿
        </span>
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
            style={{ backgroundColor: previewBackground }}
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
        {PRESET_L_ROWS.map((_, rowIdx) => (
          <div role="row" key={`row-${rowIdx}`}>
            {presetHCols.map((_h, colIdx) => {
              const cell = presetOklchForCell(rowIdx, colIdx, oklch.a, presetHCols);
              const inGamut = isInSrgbGamut(cell);
              const safeCss = oklchaToCss(clampToSrgbGamut(cell));
              const hueDelta = Math.abs(oklch.h - cell.h) % 360;
              const hueDistance = Math.min(hueDelta, 360 - hueDelta);
              const isSelected =
                Math.abs(oklch.l - cell.l) < 2 &&
                hueDistance < 5 &&
                Math.abs(oklch.c - cell.c) < 0.05;
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
            })}
          </div>
        ))}
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
