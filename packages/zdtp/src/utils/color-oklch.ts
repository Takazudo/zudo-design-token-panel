/**
 * OKLCH ↔ sRGB ↔ HSL math primitives for the design-token panel.
 *
 * Alpha convention: all alpha values in this module are expressed on a
 * 0–100 scale (0 = fully transparent, 100 = fully opaque). This matches
 * the HSL convention used elsewhere in the panel and differs from culori's
 * internal 0–1 range; conversion happens at the boundary.
 *
 * OKLCH CSS gradient browser baseline: Chromium 111+ / Safari 16+ / Firefox 113+.
 * Consumers targeting older browsers should clamp to sRGB before emitting CSS.
 */

// culori/fn: tree-shake-friendly entry point. Register only the modes we use.
// useMode must be called before any converter is invoked.
import {
  parse,
  formatHex,
  formatHex8,
  converter,
  clampChroma,
  inGamut,
  useMode,
  modeOklch,
  modeRgb,
  modeHsl,
} from 'culori/fn';

import type { Hsla } from './color-hsla';

useMode(modeOklch);
useMode(modeRgb);
useMode(modeHsl);

// Re-export the canonical Hsla shape from color-hsla.ts so the two modules
// share a single type definition (no drift between consumers that import
// either module).
export type { Hsla } from './color-hsla';

/** All four components use the panel's 0–100 scale for alpha. */
export interface Oklcha {
  l: number; // lightness ∈ [0, 100]
  c: number; // chroma ∈ [0, ~0.4]; culori-native units
  h: number; // hue ∈ [0, 360)
  a: number; // alpha ∈ [0, 100]
}

/** Practical upper bound for chroma in the sRGB gamut. */
export const MAX_OKLCH_CHROMA = 0.37;

/** Converter factories — registered once at module load. */
const toOklch = converter('oklch');
const toRgb = converter('rgb');
const toHsl = converter('hsl');

const isInSrgbGamutFn = inGamut('rgb');

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Map a panel Oklcha (l∈[0,100], a∈[0,100]) to culori's oklch object. */
function toCuloriOklch(o: Oklcha): {
  mode: 'oklch';
  l: number;
  c: number;
  h: number;
  alpha: number;
} {
  return {
    mode: 'oklch' as const,
    l: o.l / 100,
    c: o.c,
    h: o.h,
    alpha: o.a / 100,
  };
}

/** Map a culori oklch result back to a panel Oklcha. */
function fromCuloriOklch(raw: {
  mode: string;
  l?: number;
  c?: number;
  h?: number;
  alpha?: number;
}): Oklcha {
  return {
    l: (raw.l ?? 0) * 100,
    c: raw.c ?? 0,
    h: raw.h ?? 0,
    a: (raw.alpha ?? 1) * 100,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Emit an `oklch()` CSS string.  The alpha component is omitted when a===100.
 */
export function oklchaToCss(o: Oklcha): string {
  const lPct = (o.l / 100).toFixed(4);
  const c = o.c.toFixed(4);
  const h = o.h.toFixed(2);
  if (o.a >= 100) {
    return `oklch(${lPct} ${c} ${h})`;
  }
  const a = (o.a / 100).toFixed(4);
  return `oklch(${lPct} ${c} ${h} / ${a})`;
}

/**
 * Parse a hex string (#RGB / #RGBA / #RRGGBB / #RRGGBBAA) to Oklcha.
 * Returns `{l:0, c:0, h:0, a:100}` for invalid input — never throws.
 */
export function hexToOklcha(hex: string): Oklcha {
  const fallback: Oklcha = { l: 0, c: 0, h: 0, a: 100 };
  try {
    const parsed = parse(hex);
    if (!parsed) return fallback;
    const ok = toOklch(parsed);
    if (!ok) return fallback;
    const alpha = ok.alpha === undefined ? 1 : ok.alpha;
    return {
      l: (ok.l ?? 0) * 100,
      c: ok.c ?? 0,
      h: ok.h ?? 0,
      a: alpha * 100,
    };
  } catch {
    return fallback;
  }
}

/**
 * Convert an Oklcha to a hex string.
 * Emits 6-digit hex when a===100 (unless alwaysAlpha is set).
 * Emits 8-digit hex when a<100 or alwaysAlpha is true.
 */
export function oklchaToHex(
  o: Oklcha,
  opts?: { alwaysAlpha?: boolean },
): string {
  const culoriColor = toCuloriOklch(o);
  const rgb = toRgb(culoriColor);
  if (!rgb) return '#000000';
  if (opts?.alwaysAlpha || o.a < 100) {
    return formatHex8({ ...rgb, alpha: o.a / 100 }) ?? '#000000ff';
  }
  return formatHex(rgb) ?? '#000000';
}

/** Convert Oklcha to Hsla.  Alpha is preserved on the 0–100 scale. */
export function oklchaToHsla(o: Oklcha): Hsla {
  const culoriColor = toCuloriOklch(o);
  const hsl = toHsl(culoriColor);
  if (!hsl) return { h: 0, s: 0, l: 0, a: o.a };
  return {
    h: hsl.h ?? 0,
    s: (hsl.s ?? 0) * 100,
    l: (hsl.l ?? 0) * 100,
    a: o.a,
  };
}

/** Convert Hsla to Oklcha.  Alpha is preserved on the 0–100 scale. */
export function hslaToOklcha(h: Hsla): Oklcha {
  const culoriHsl = {
    mode: 'hsl' as const,
    h: h.h,
    s: h.s / 100,
    l: h.l / 100,
    alpha: h.a / 100,
  };
  const ok = toOklch(culoriHsl);
  if (!ok) return { l: 0, c: 0, h: 0, a: h.a };
  return fromCuloriOklch(ok);
}

/**
 * Clamp an Oklcha value into the sRGB gamut while preserving L and H.
 * Uses culori's `clampChroma` which reduces chroma until the color fits.
 */
export function clampToSrgbGamut(o: Oklcha): Oklcha {
  const culoriColor = toCuloriOklch(o);
  // clampChroma reduces C until the color is in-gamut for the target space
  const clamped = clampChroma(culoriColor, 'oklch', 'rgb');
  // When clampChroma cannot resolve, fall back to a fully-achromatic value
  // at the requested L and H. Returning the original out-of-gamut input
  // would violate the documented contract (caller expects an in-gamut color).
  if (!clamped) return { l: o.l, c: 0, h: o.h, a: o.a };
  return {
    l: (clamped.l ?? o.l / 100) * 100,
    c: clamped.c ?? 0,
    h: clamped.h ?? o.h,
    a: o.a,
  };
}

/** Return true if the Oklcha value is within the sRGB gamut. */
export function isInSrgbGamut(o: Oklcha): boolean {
  const rgb = toRgb(toCuloriOklch(o));
  if (!rgb) return false;
  return isInSrgbGamutFn(rgb);
}

// ---------------------------------------------------------------------------
// cssToOklcha
// ---------------------------------------------------------------------------

/**
 * Normalize an angle value (with optional unit) to degrees in [0, 360).
 * Supported units: deg (default), rad, grad, turn.
 */
function parseAngleToDeg(value: string, unit: string): number {
  const n = parseFloat(value);
  let deg: number;
  switch (unit.toLowerCase()) {
    case 'rad':
      deg = n * (180 / Math.PI);
      break;
    case 'grad':
      // 400 gradians = 360 degrees
      deg = n * (360 / 400);
      break;
    case 'turn':
      deg = n * 360;
      break;
    default:
      // 'deg' or no unit
      deg = n;
  }
  // Normalize into [0, 360)
  return ((deg % 360) + 360) % 360;
}

/**
 * Parse a CSS Color 4 `oklch()` string into the panel's `Oklcha` shape.
 *
 * Supported syntax:
 *   oklch(L C H)
 *   oklch(L C H / A)
 *
 * L: number (0–1) or percentage (0%–100% → 0–1), stored as 0–100 internally.
 * C: number in culori-native units, OR percentage where 100% = 0.4
 *    (CSS Color 4 reference range). Wide-gamut chroma is NOT clamped.
 * H: number (degrees) or angle with deg/rad/grad/turn unit; normalized to [0,360).
 * A: number (0–1) or percentage (0%–100%); stored as 0–100 internally.
 * `none` per channel is treated as 0.
 *
 * Returns null for non-oklch or unparseable input.
 */
export function cssToOklcha(css: string): Oklcha | null {
  // Case-insensitive match on oklch( ... ) with optional whitespace
  const trimmed = css.trim();
  const outerMatch = trimmed.match(/^oklch\(\s*(.*?)\s*\)$/i);
  if (!outerMatch) return null;

  const inner = outerMatch[1];

  // Split on '/' to separate color channels from alpha
  const slashParts = inner.split('/');
  if (slashParts.length > 2) return null;

  const channelsPart = slashParts[0].trim();
  const alphaPart = slashParts.length === 2 ? slashParts[1].trim() : null;

  // Tokenize the channel part: values can be numbers, percentages, or angle values
  // (e.g. "120deg", "1.5rad", "0.5turn", "200grad")
  const TOKEN_RE = /none|[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?(%|deg|rad|grad|turn)?/gi;
  const channelTokens = channelsPart.match(TOKEN_RE);
  if (!channelTokens || channelTokens.length !== 3) return null;

  // Helper: parse a single channel token
  const parseValue = (token: string): { value: number; isPercent: boolean; unit: string } | null => {
    if (token.toLowerCase() === 'none') return { value: 0, isPercent: false, unit: '' };
    const m = token.match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(.*)?$/i);
    if (!m) return null;
    const num = parseFloat(m[1]);
    if (isNaN(num)) return null;
    const suffix = (m[2] ?? '').toLowerCase();
    const isPercent = suffix === '%';
    const unit = isPercent ? '%' : suffix;
    return { value: num, isPercent, unit };
  };

  // Parse L
  const lToken = parseValue(channelTokens[0]);
  if (!lToken) return null;
  // L stored 0–100; CSS L is 0–1 (number) or 0%–100% (percentage → /100 → still 0–1 → *100)
  const lInternal = lToken.isPercent ? lToken.value : lToken.value * 100;

  // Parse C
  const cToken = parseValue(channelTokens[1]);
  if (!cToken) return null;
  // CSS Color 4: 100% chroma = 0.4 (reference range for chroma percentage)
  const cInternal = cToken.isPercent ? (cToken.value / 100) * 0.4 : cToken.value;

  // Parse H
  const hRaw = channelTokens[2];
  let hInternal: number;
  if (hRaw.toLowerCase() === 'none') {
    hInternal = 0;
  } else {
    const hMatch = hRaw.match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(deg|rad|grad|turn)?$/i);
    if (!hMatch) return null;
    const hNum = hMatch[1];
    const hUnit = hMatch[2] ?? 'deg';
    hInternal = parseAngleToDeg(hNum, hUnit);
  }

  // Parse A (optional)
  let aInternal = 100; // default fully opaque
  if (alphaPart !== null) {
    const aToken = parseValue(alphaPart.trim());
    if (!aToken) return null;
    // A stored 0–100; CSS A is 0–1 (number) or 0%–100% (percentage)
    aInternal = aToken.isPercent ? aToken.value : aToken.value * 100;
  }

  return {
    l: lInternal,
    c: cInternal,
    h: hInternal,
    a: aInternal,
  };
}
