/** @jsxImportSource @takazudo/zfb/zudo-react */
/**
 * ColorPicker — dual-mode (OKLCH | HSL) color picker for the design-token panel.
 *
 * Renders as a "popover body only" component — the parent is responsible for
 * mounting/unmounting based on an open/closed boolean. No trigger swatch and
 * no portal.
 *
 * Issue #175 (Wave 2 of the OKLCH Picker epic, issue #174-base).
 *
 * Design rules (see packages/zdtp/CLAUDE.md):
 *   - All interactive elements use <div role="button" tabindex=0> with
 *     explicit Enter/Space keydown handlers. Native button and heading tags
 *     are not used (hostile-host policy).
 *   - BEM class names: tokenpanel-color-picker-* (locked external contract).
 *   - bindPopoverClose: pointerdown + Escape only — NO scroll listener.
 *   - Mode persisted to localStorage under key tokenpanel.colorPicker.mode.
 *   - Alpha always shown; alpha ∈ [0, 100] scale throughout.
 *   - The incoming color prop is ignored while a slider drag is in flight.
 */

import { computed, For, getScope, Show, signal } from '@takazudo/zfb/zudo-react';

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
  staticCssColorToOklcha,
} from '../../utils/color-oklch';
import { isCssExpression, resolveCssColorInHost } from '../../utils/resolve-css-color';
import { RoleButton } from '../../controls/role-button';
import { peekable, read, toSignal, type MaybeSignal, type Reactive } from '../../zr/live';
import { toZrStyle } from '../../zr/style';
import { CustomSlider, type SliderConfig } from './custom-slider';
import { bindPopoverClose, getFixedPopoverStyle, type FixedPopoverStyle } from './popover';

export { bindPopoverClose, getFixedPopoverStyle } from './popover';

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
  /** Host color scheme used to resolve CSS expressions. */
  resolveMode?: 'light' | 'dark';
  /** Optional label rendered in the picker header. */
  label?: string;
  /**
   * Initial mode. The runtime mode is uncontrolled inside the component
   * and persisted via localStorage[LOCAL_STORAGE_KEY]. Defaults to 'oklch'.
   */
  defaultMode?: ColorPickerMode;
  /** Element to anchor the popover against (popover sits below/above it). */
  anchorRef: { readonly current: HTMLElement | null };
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
 * Parse the incoming `color` prop into a canonical Oklcha for oklch mode.
 *
 * Prefers `cssToOklcha` (preserves wide-gamut chroma and sub-step precision).
 * Falls back to `hexToOklcha` when the prop is a hex string (or any non-oklch
 * value) that `cssToOklcha` rejects.
 */
function parseOklchColor(css: string): Oklcha {
  return cssToOklcha(css) ?? hexToOklcha(css);
}

/* ── Main component ─────────────────────────────────────────────────────── */

type Seed = {
  hex: string;
  oklch: Oklcha;
  expression: { source: string; resolved: boolean } | null;
};

function seedFor(color: string, resolveMode: 'light' | 'dark' | undefined): Seed {
  if (!isCssExpression(color)) {
    return { hex: color, oklch: parseOklchColor(color), expression: null };
  }
  const resolvedCss = resolveCssColorInHost(color, resolveMode);
  const resolved = resolvedCss ? staticCssColorToOklcha(resolvedCss) : null;
  const oklch = resolved ?? hexToOklcha('#000000');
  return {
    hex: oklchaToHex(oklch),
    oklch,
    expression: { source: color, resolved: resolved !== null },
  };
}

const VALID_HEX = /^#[0-9a-fA-F]{6}$|^#[0-9a-fA-F]{8}$/;

function activate(handler: () => void) {
  return {
    'on:click': handler,
    'on:keydown': (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handler();
      }
    },
  };
}

/**
 * ColorPicker — popover body only.
 *
 * The parent renders it inside a `Show`. This component does NOT render a
 * trigger swatch and does NOT portal.
 */
export function ColorPicker(
  props: Reactive<ColorPickerProps, 'onChange' | 'onClose' | 'anchorRef' | 'valueFormat' | 'defaultMode'>,
) {
  const { onChange, anchorRef, onClose } = props;
  const isOklchFormat = (props.valueFormat ?? 'hex') === 'oklch';
  const label = computed(() => read(props.label));

  const containerRef: { current: HTMLDivElement | null } = { current: null };
  const dragHandleRef: { current: HTMLSpanElement | null } = { current: null };
  let isDragging = false;
  const scope = getScope();

  // Two parallel sources of truth, one per output format. In hex mode the hex
  // string is canonical (byte-for-byte unchanged from the legacy behavior). In
  // oklch mode the canonical Oklcha is the source of truth so wide-gamut chroma
  // & precision survive without round-tripping through sRGB hex.
  const seed = computed(() => seedFor(read(props.color), read(props.resolveMode)));
  // Consent belongs to this exact source/mode session and resets on remount.
  const convertedSeed = signal<Seed | null>(null);
  const gated = computed(() => seed.value.expression !== null && convertedSeed.value !== seed.value);
  const emit = (value: string) => {
    if (!gated.value) onChange(value);
  };
  const initial = seed.value;
  const hexState = signal(initial.hex);
  const canonicalOklch = signal<Oklcha>(initial.oklch);

  // The hex shown by the picker. In oklch mode this is the sRGB projection of
  // the canonical value (for the hex-input box, preview is handled separately).
  const hex = computed(() => (isOklchFormat ? oklchaToHex(canonicalOklch.value) : hexState.value));

  // ── Drag-handle state ─────────────────────────────────────────────────────
  // dragPos holds the current dragged-to position (left, top in viewport px).
  // null means auto-positioned (normal anchor-relative behavior).
  // Session-only: the popover unmounts when the parent closes it, so dragPos
  // resets to null on every open.
  const dragPos = signal<{ left: number; top: number } | null>(null);
  // The pointer start position and the popover's base rect for the current
  // drag gesture.
  let dragSession: {
    pointerId: number;
    startX: number;
    startY: number;
    baseLeft: number;
    baseTop: number;
  } | null = null;
  let isDraggingHandle = false;

  const mode = signal<ColorPickerMode>(readPersistedMode(props.defaultMode ?? 'oklch'));
  const shell = signal<'mini' | 'expanded'>('mini');

  const hexInput = peekable(hex.value);

  // Ignore incoming `color` prop changes while a slider drag is in flight, so
  // a mid-gesture external prop change cannot clobber the dragged value.
  scope.effect(() => {
    const next = seed.value;
    if (next.expression) {
      // A newly gated source takes precedence over an in-flight literal edit.
      isDragging = false;
      hexState.value = next.hex;
      canonicalOklch.value = next.oklch;
      hexInput.value = next.hex;
      return;
    }
    if (isDragging) return;
    hexState.value = next.hex;
    canonicalOklch.value = next.oklch;
  });
  scope.effect(() => {
    const current = hex.value;
    // Only clobber hexInput when it holds a fully-committed valid hex. If the
    // user has started typing a partial string (e.g. "#33"), leave it alone so
    // an external prop change does not erase the in-progress edit.
    if (VALID_HEX.test(hexInput.peek())) hexInput.value = current;
  });

  // Pass the trigger anchor so clicking it toggles the popover shut instead of
  // the outside-close racing the trigger's click and reopening it (F11).
  scope.onActivate(() => bindPopoverClose(containerRef, () => onClose(), anchorRef));

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
  const oklch = computed(() => (isOklchFormat ? canonicalOklch.value : hexToOklcha(hex.value)));
  const hsla = computed(() =>
    isOklchFormat ? oklchaToHsla(clampToSrgbGamut(canonicalOklch.value)) : hexToHsla(hex.value),
  );

  // Commit a hex string (hex mode) or, in oklch mode, the `oklch()` of that hex.
  // The internal hex state and hex-input box always track the (normalized) hex
  // so the input box keeps showing the sRGB projection for reference.
  function commit(next: string) {
    if (gated.value) return;
    const normalized = next.toLowerCase();
    hexState.value = normalized;
    hexInput.value = normalized;
    if (isOklchFormat) {
      // The hex-input box and preset grid commit a hex; in oklch mode emit
      // the oklch() of that hex (hex → Oklcha → oklch string), never raw hex.
      const asOklch = parseOklchColor(normalized);
      canonicalOklch.value = asOklch;
      emit(oklchaToCss(asOklch));
    } else {
      emit(normalized);
    }
  }

  // Commit a canonical Oklcha directly without any sRGB clamp — used by the
  // OKLCH sliders and the preset grid in oklch mode so out-of-gamut chroma and
  // precision survive. Emits the normalized oklch() string.
  function commitCanonicalOklch(next: Oklcha) {
    if (gated.value) return;
    canonicalOklch.value = next;
    // Keep the hex-input box / hex state in sync with the sRGB projection.
    const projHex = oklchaToHex(next).toLowerCase();
    hexState.value = projHex;
    hexInput.value = projHex;
    emit(oklchaToCss(next));
  }

  function commitOklch(partial: Partial<Oklcha>) {
    if (gated.value) return;
    const current = oklch.value;
    const next: Oklcha = {
      l: partial.l ?? current.l,
      c: partial.c ?? current.c,
      h: partial.h ?? current.h,
      a: partial.a ?? current.a,
    };
    if (isOklchFormat) {
      commitCanonicalOklch(next);
    } else {
      commit(oklchaToHex(next));
    }
  }

  function commitHsl(partial: { h?: number; s?: number; l?: number; a?: number }) {
    if (gated.value) return;
    const current = hsla.value;
    const next = {
      h: partial.h ?? current.h,
      s: partial.s ?? current.s,
      l: partial.l ?? current.l,
      a: partial.a ?? current.a,
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
  }

  function handleHexChange(value: string) {
    if (gated.value) return;
    hexInput.value = value;
    if (VALID_HEX.test(value)) commit(value);
  }

  // Active hue columns depend on the current shell.
  const presetHCols = computed(() =>
    shell.value === 'expanded' ? PRESET_H_COLS_EXPANDED : PRESET_H_COLS_MINI,
  );
  const presetColumns = computed(() => presetHCols.value.map((_h, colIdx) => colIdx));

  function handlePresetClick(rowIdx: number, colIdx: number) {
    if (gated.value) return;
    const preset = presetOklchForCell(rowIdx, colIdx, oklch.value.a, presetHCols.value);
    if (isOklchFormat) {
      // Commit the cell's UNCLAMPED Oklcha so wide-gamut presets survive.
      // (The display background still uses clampToSrgbGamut — see the grid.)
      commitCanonicalOklch(preset);
    } else {
      const safe = clampToSrgbGamut(preset);
      commit(oklchaToHex(safe));
    }
  }

  function handleGridKeyDown(e: KeyboardEvent, rowIdx: number, colIdx: number) {
    if (gated.value) return;
    let nextRow = rowIdx;
    let nextCol = colIdx;
    if (e.key === 'ArrowRight') nextCol = Math.min(presetHCols.value.length - 1, colIdx + 1);
    else if (e.key === 'ArrowLeft') nextCol = Math.max(0, colIdx - 1);
    else if (e.key === 'ArrowDown') nextRow = Math.min(PRESET_L_ROWS.length - 1, rowIdx + 1);
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
  }

  const handleModeToggle = (next: ColorPickerMode) => {
    // Mode toggle is pure view-state — no onChange emit.
    writePersistedMode(next);
    mode.value = next;
  };

  const oklchConfigs = oklchSliderConfigs();
  const hslConfigs = hslSliderConfigs();

  // Slider gradients.
  // Syntax: "<angle> in <space>" — NOT "in <space> <angle>".
  const sliderGradients = computed((): Record<string, string> => {
    if (mode.value === 'oklch') {
      const o = oklch.value;
      return {
        l: `linear-gradient(90deg in oklch, ${oklchaToCss({ l: 0, c: o.c, h: o.h, a: 100 })}, ${oklchaToCss({ l: 100, c: o.c, h: o.h, a: 100 })})`,
        c: `linear-gradient(90deg in oklch, ${oklchaToCss({ l: o.l, c: 0, h: o.h, a: 100 })}, ${oklchaToCss({ l: o.l, c: MAX_OKLCH_CHROMA, h: o.h, a: 100 })})`,
        h: `linear-gradient(90deg in oklch longer hue, ${oklchaToCss({ l: o.l, c: o.c, h: 0, a: 100 })}, ${oklchaToCss({ l: o.l, c: o.c, h: 360, a: 100 })})`,
        a: `linear-gradient(90deg in oklch, ${oklchaToCss({ ...o, a: 0 })}, ${oklchaToCss({ ...o, a: 100 })})`,
      };
    }
    const c = hsla.value;
    return {
      h: `linear-gradient(90deg in oklch longer hue, ${oklchaToCss(hslaToOklcha({ h: 0, s: c.s, l: c.l, a: 100 }))}, ${oklchaToCss(hslaToOklcha({ h: 360, s: c.s, l: c.l, a: 100 }))})`,
      s: `linear-gradient(90deg in oklch, ${oklchaToCss(hslaToOklcha({ h: c.h, s: 0, l: c.l, a: 100 }))}, ${oklchaToCss(hslaToOklcha({ h: c.h, s: 100, l: c.l, a: 100 }))})`,
      l: `linear-gradient(90deg in oklch, ${oklchaToCss(hslaToOklcha({ h: c.h, s: c.s, l: 0, a: 100 }))}, ${oklchaToCss(hslaToOklcha({ h: c.h, s: c.s, l: 100, a: 100 }))})`,
      a: `linear-gradient(90deg in oklch, ${oklchaToCss(hslaToOklcha({ ...c, a: 0 }))}, ${oklchaToCss(hslaToOklcha({ ...c, a: 100 }))})`,
    };
  });

  // Popover positioning — recompute when shell changes (different width).
  const autoStyle = signal<FixedPopoverStyle & { visibility?: 'hidden' }>({
    position: 'fixed',
    visibility: 'hidden',
  });
  scope.effect(() => {
    const currentShell = shell.value;
    const isGated = gated.value;
    void seed.value.expression?.source;
    const anchor = anchorRef.current;
    if (!anchor) {
      autoStyle.value = { position: 'fixed', visibility: 'hidden' };
      return;
    }
    const estimatedHeight = currentShell === 'mini' ? MINI_POPOVER_H : EXPANDED_POPOVER_H;
    // Expressions can wrap across several lines; include their actual height
    // when clamping the popover, leaving literal positioning unchanged.
    const height = isGated
      ? Math.max(estimatedHeight, containerRef.current?.scrollHeight ?? 0)
      : estimatedHeight;
    autoStyle.value = getFixedPopoverStyle(
      anchor,
      currentShell === 'mini' ? MINI_POPOVER_W : EXPANDED_POPOVER_W,
      height,
    );
  });

  // ── Drag-handle pointer handlers ─────────────────────────────────────────
  // Mirrors pgen's color-picker-oklch drag implementation. Pointer capture
  // keeps move/up flowing even if the pointer leaves the handle.
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
    dragSession = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseLeft: rect.left,
      baseTop: rect.top,
    };
    isDraggingHandle = true;
    try {
      dragHandleRef.current!.setPointerCapture(e.pointerId);
    } catch {
      // jsdom does not implement setPointerCapture; ignore.
    }
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDraggingHandle || !dragSession) return;
    if (e.pointerId !== dragSession.pointerId) return;
    const { startX, startY, baseLeft, baseTop } = dragSession;
    dragPos.value = { left: baseLeft + (e.clientX - startX), top: baseTop + (e.clientY - startY) };
  }

  function handlePointerUp(e: PointerEvent) {
    if (!isDraggingHandle || !dragSession) return;
    if (e.pointerId !== dragSession.pointerId) return;
    isDraggingHandle = false;
    dragSession = null;
    try {
      dragHandleRef.current!.releasePointerCapture(e.pointerId);
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
    dragPos.value = {
      left: Math.max(pad, Math.min(vw - pad - rect.width, rect.left)),
      top: Math.max(pad, Math.min(vh - pad - rect.height, rect.top)),
    };
  }

  // Checkerboard is only needed when the color is non-opaque. In hex mode the
  // 8-digit hex byte signals alpha; in oklch mode the canonical alpha does.
  const hasAlpha = computed(() =>
    isOklchFormat ? canonicalOklch.value.a < 100 : /^#[0-9a-fA-F]{8}$/.test(hex.value),
  );

  // Preview swatch background. In oklch mode use the canonical oklch() value so
  // wide-gamut colors render correctly (and are not silently sRGB-clamped); in
  // hex mode keep the exact hex string the legacy path used.
  const previewBackground = computed(() =>
    isOklchFormat ? oklchaToCss(canonicalOklch.value) : hex.value,
  );

  const onDragStart = () => {
    isDragging = true;
  };
  const onDragEnd = () => {
    isDragging = false;
  };

  // Final container style — dragPos takes precedence over auto-positioning
  // once the user has grabbed the handle and moved the popover.
  const containerStyle = computed(() => {
    const pos = dragPos.value;
    return toZrStyle(pos ? { position: 'fixed', left: pos.left, top: pos.top } : { ...autoStyle.value });
  });

  const expression = computed(() => seed.value.expression);
  const disclosureText = computed(() => {
    const current = expression.value;
    if (!current) return '';
    return current.resolved
      ? `Value is an expression: ${current.source}. Editing replaces it with a literal color.`
      : `Reference ${current.source} could not be resolved in the host.`;
  });

  function renderSliders(configs: SliderConfig[], values: typeof oklch | typeof hsla, commitFn: (partial: Record<string, number>) => void) {
    return configs.map((config) => (
      <CustomSlider
        disabled={gated}
        config={toSignal(config)}
        value={computed(() => (values.value as unknown as Record<string, number>)[config.key] ?? 0)}
        gradient={computed(() => sliderGradients.value[config.key] ?? '')}
        onChange={(v) => commitFn({ [config.key]: v })}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />
    ));
  }

  return (
    <div
      ref={containerRef}
      class="tokenpanel-color-picker"
      data-mode-shell={shell}
      style={containerStyle}
      role="dialog"
      aria-label={computed(() => (label.value ? `${label.value} color picker` : 'Color picker'))}
    >
      {/* Header ─────────────────────────────────────────────────────────── */}
      <div class="tokenpanel-color-picker-header">
        {/* Drag handle — braille-dots glyph (⠿, U+283F) per pgen mockup.
            role="presentation"+aria-hidden so assistive tech skips the glyph.
            <span> chosen over <div> per zdtp panel-DOM-hygiene policy: span is
            not in the host-resettable tag list and matches pgen's pattern. */}
        <span
          ref={dragHandleRef}
          class="tokenpanel-color-picker-drag-handle"
          role="presentation"
          aria-hidden="true"
          on:pointerdown={handlePointerDown}
          on:pointermove={handlePointerMove}
          on:pointerup={handlePointerUp}
          on:pointercancel={handlePointerUp}
        >
          ⠿
        </span>
        <span class="tokenpanel-color-picker-label">{computed(() => label.value ?? 'Color')}</span>

        {/* Mode toggle: OKLCH | HSL */}
        <div class="tokenpanel-color-picker-mode-toggle" role="group" aria-label="Color mode">
          <div
            role="button"
            tabindex={0}
            class="tokenpanel-color-picker-mode-btn"
            aria-pressed={computed(() => mode.value === 'oklch')}
            {...activate(() => handleModeToggle('oklch'))}
          >
            OKLCH
          </div>
          <div
            role="button"
            tabindex={0}
            class="tokenpanel-color-picker-mode-btn"
            aria-pressed={computed(() => mode.value === 'hsl')}
            {...activate(() => handleModeToggle('hsl'))}
          >
            HSL
          </div>
        </div>

        {/* Expand / collapse toggle */}
        <div
          role="button"
          tabindex={0}
          class="tokenpanel-color-picker-expand-btn"
          aria-label={computed(() => (shell.value === 'mini' ? 'Expand picker' : 'Collapse picker'))}
          aria-expanded={computed(() => shell.value === 'expanded')}
          {...activate(() => {
            shell.value = shell.value === 'mini' ? 'expanded' : 'mini';
          })}
        >
          {computed(() => (shell.value === 'mini' ? '⤢' : '⤡'))}
        </div>

        {/* Close picker */}
        <div
          role="button"
          tabindex={0}
          class="tokenpanel-color-picker-close-btn"
          aria-label="Close color picker"
          {...activate(() => onClose())}
        >
          ×
        </div>
      </div>

      <Show when={gated}>
        {() => (
          <div class="tokenpanel-color-picker__disclosure">
            <div>{disclosureText}</div>
            <RoleButton
              class="tokenpanel-color-picker__convert"
              onClick={() => {
                convertedSeed.value = seed.value;
              }}
            >
              Edit as literal
            </RoleButton>
          </div>
        )}
      </Show>

      {/* Top row: preview swatch + hex input ───────────────────────────── */}
      <div class="tokenpanel-color-picker-top-row">
        <div class="tokenpanel-color-picker-preview">
          <Show when={hasAlpha}>
            {() => <div class="tokenpanel-color-picker-preview-checkerboard" />}
          </Show>
          <div
            class="tokenpanel-color-picker-preview-color"
            style={computed(() => ({ 'background-color': previewBackground.value }))}
          />
        </div>
        <HexInput
          disabled={gated}
          value={hexInput.signal}
          onChange={handleHexChange}
        />
      </div>

      {/* Preset grid ─────────────────────────────────────────────────────── */}
      <div class="tokenpanel-color-picker-grid" role="grid" aria-label="Color presets">
        {PRESET_L_ROWS.map((_, rowIdx) => (
          <div role="row">
            <For each={presetColumns} by={(colIdx) => colIdx}>
              {(col) => {
                const colIdx = col.value;
                const cell = computed(() =>
                  presetOklchForCell(rowIdx, colIdx, oklch.value.a, presetHCols.value),
                );
                const isSelected = computed(() => {
                  const current = oklch.value;
                  const target = cell.value;
                  const hueDelta = Math.abs(current.h - target.h) % 360;
                  const hueDistance = Math.min(hueDelta, 360 - hueDelta);
                  return (
                    Math.abs(current.l - target.l) < 2 &&
                    hueDistance < 5 &&
                    Math.abs(current.c - target.c) < 0.05
                  );
                });
                return (
                  <div
                    role="gridcell"
                    data-grid-row={rowIdx}
                    data-grid-col={colIdx}
                    data-oog={computed(() => (isInSrgbGamut(cell.value) ? 'false' : 'true'))}
                    aria-disabled={computed(() => (gated.value ? true : null))}
                    aria-selected={isSelected}
                    aria-label={computed(() => `Preset L ${cell.value.l}% H ${cell.value.h}°`)}
                    class="tokenpanel-color-picker-grid-cell"
                    style={computed(() => ({ background: oklchaToCss(clampToSrgbGamut(cell.value)) }))}
                    tabindex={computed(() => (!gated.value && rowIdx === 0 && colIdx === 0 ? 0 : -1))}
                    on:click={() => handlePresetClick(rowIdx, colIdx)}
                    on:keydown={(e: KeyboardEvent) => handleGridKeyDown(e, rowIdx, colIdx)}
                  />
                );
              }}
            </For>
          </div>
        ))}
      </div>

      {/* Sliders ────────────────────────────────────────────────────────── */}
      <div class="tokenpanel-color-picker-sliders">
        <Show
          when={computed(() => mode.value === 'oklch')}
          fallback={() => renderSliders(hslConfigs, hsla, (partial) => commitHsl(partial))}
        >
          {() => renderSliders(oklchConfigs, oklch, (partial) => commitOklch(partial as Partial<Oklcha>))}
        </Show>
      </div>

      {/* Readout (expanded shell only) ───────────────────────────────────── */}
      <Show when={computed(() => shell.value === 'expanded')}>
        {() => (
          <div class="tokenpanel-color-picker-readout" aria-live="polite">
            {computed(
              () =>
                `L ${Math.round(oklch.value.l)}% · C ${oklch.value.c.toFixed(3)} · H ${Math.round(oklch.value.h)}°`,
            )}
          </div>
        )}
      </Show>
    </div>
  );
}

// The hex box is a plain uncontrolled-in-the-DOM input whose value the picker
// writes: zudo-react's `modelValue` would echo every keystroke back, while the
// picker must keep a partial entry (e.g. "#33") until it is a full hex.
function HexInput(props: {
  disabled: MaybeSignal<boolean>;
  value: MaybeSignal<string>;
  onChange: (value: string) => void;
}) {
  const input: { current: HTMLInputElement | null } = { current: null };
  getScope().effect(() => {
    const next = read(props.value);
    if (input.current && input.current.value !== next) input.current.value = next;
  });
  return (
    <input
      ref={input}
      disabled={props.disabled}
      type="text"
      class="tokenpanel-color-picker-hex-input"
      on:input={(e) => props.onChange(e.currentTarget.value)}
      spellcheck={false}
      aria-label="Hex color value"
    />
  );
}

export default ColorPicker;
