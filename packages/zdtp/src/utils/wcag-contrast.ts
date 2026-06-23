/**
 * WCAG 2.1 contrast ratio and score helpers.
 *
 * Implements the WCAG 2.1 relative-luminance formula:
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 *
 * Score thresholds:
 *   Normal text:  ratio < 4.5 → 'Fail', 4.5 ≤ ratio < 7 → 'AA', ratio ≥ 7 → 'AAA'
 *   Large text:   ratio < 3.0 → 'Fail', 3.0 ≤ ratio < 4.5 → 'AA', ratio ≥ 4.5 → 'AAA'
 */

/** Contrast score bucket — three values matching the WCAG AA·AAA·Fail model. */
export type ContrastScoreLabel = 'Fail' | 'AA' | 'AAA';

/** Parse a hex color string (#rgb or #rrggbb) to [r, g, b] (0–255). */
function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  // Expand 3-digit shorthand (#fff → #ffffff)
  if (/^[0-9a-fA-F]{3}$/.test(h)) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    throw new Error(`Invalid hex color: "${hex}"`);
  }
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Convert a single 0–255 sRGB channel to its linear-light value. */
function linearize(channel8bit: number): number {
  const c = channel8bit / 255;
  // WCAG 2.1 formula (IEC 61966-2-1 sRGB TRC)
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Compute WCAG 2.1 relative luminance for a hex color.
 * Luminance is in [0, 1] — 0 for black, 1 for white.
 */
function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  // WCAG 2.1 luminance formula: Y = 0.2126 R + 0.7152 G + 0.0722 B
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * Compute WCAG 2.1 contrast ratio between two hex colors.
 * Result is in [1, 21]. The order of arguments does not matter.
 *
 * Examples:
 *   contrastRatio('#000000', '#ffffff') === 21
 *   contrastRatio('#ffffff', '#000000') === 21
 */
export function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  // WCAG 2.1 contrast ratio formula
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Map a WCAG 2.1 contrast ratio to a score label.
 *
 * Normal text thresholds (default): 4.5 (AA), 7 (AAA).
 * Large text thresholds (large: true): 3.0 (AA), 4.5 (AAA).
 * Large text is defined as ≥ 18pt regular or ≥ 14pt bold (WCAG 2.1 §1.4.3).
 */
export function contrastScore(
  ratio: number,
  opts?: { large?: boolean },
): ContrastScoreLabel {
  if (opts?.large) {
    // Large text thresholds: AA ≥ 3.0, AAA ≥ 4.5
    if (ratio >= 4.5) return 'AAA';
    if (ratio >= 3.0) return 'AA';
    return 'Fail';
  }
  // Normal text thresholds: AA ≥ 4.5, AAA ≥ 7
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  return 'Fail';
}
