import type { TierItem } from '../tokens/tier-model';
import { splitLightDark } from '../tokens/mode-dependence';

export interface ModeSides {
  light: string;
  dark: string;
}

/**
 * Resolve the pair shown by a mode row. A stored override is an effective
 * value, so a complete light-dark() override is split for display and a
 * plain override is shown on both sides. With no override the manifest pair
 * is authoritative; this keeps the presentation independent of the ordinary
 * `default` fallback used by generic consumers.
 */
export function resolveModeRowSides(
  item: TierItem,
  value?: string,
  preferValue = false,
): ModeSides {
  if (preferValue && typeof value === 'string' && value.trim().length > 0) {
    return splitLightDark(value) ?? { light: value, dark: value };
  }
  if (item.modes) return { ...item.modes };
  const parsed = typeof value === 'string' ? splitLightDark(value) : null;
  if (parsed) return parsed;
  const fallback = value ?? item.default;
  return { light: fallback, dark: fallback };
}

/**
 * Commit one side of a mode pair as `light-dark(light, dark)`. The untouched
 * side is copied byte-for-byte so a mixed-format pair such as
 * `light-dark(rgb(10, 20, 30), oklch(0.8 0.1 240))` keeps the other side's
 * authored syntax.
 */
export function commitModePair(
  sides: ModeSides,
  side: keyof ModeSides,
  next: string,
): string {
  const light = side === 'light' ? next : sides.light;
  const dark = side === 'dark' ? next : sides.dark;
  return `light-dark(${light}, ${dark})`;
}

export function modeValueFormat(item: TierItem): 'oklch' | 'hex' {
  return item.type.kind === 'color' && item.type.format === 'oklch' ? 'oklch' : 'hex';
}

