export interface Hsla {
  h: number;
  s: number;
  l: number;
  a: number; // a ∈ [0, 100]
}

const INVALID_HSLA: Hsla = { h: 0, s: 0, l: 0, a: 100 };

// Accepts #rgb, #rgba, #rrggbb, #rrggbbaa; returns '' for anything else.
function expandHex(hex: string): string {
  const lower = hex.toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(lower)) return lower;
  if (/^#[0-9a-f]{8}$/.test(lower)) return lower;
  if (/^#[0-9a-f]{3}$/.test(lower)) {
    return `#${lower[1]}${lower[1]}${lower[2]}${lower[2]}${lower[3]}${lower[3]}`;
  }
  if (/^#[0-9a-f]{4}$/.test(lower)) {
    return `#${lower[1]}${lower[1]}${lower[2]}${lower[2]}${lower[3]}${lower[3]}${lower[4]}${lower[4]}`;
  }
  return '';
}

export function hexToHsla(hex: string): Hsla {
  const expanded = expandHex(hex);
  if (!expanded) return { ...INVALID_HSLA };

  const r = parseInt(expanded.slice(1, 3), 16) / 255;
  const g = parseInt(expanded.slice(3, 5), 16) / 255;
  const b = parseInt(expanded.slice(5, 7), 16) / 255;

  // Alpha: present in 8-digit form only; default to fully opaque.
  const a =
    expanded.length === 9
      ? Math.round((parseInt(expanded.slice(7, 9), 16) / 255) * 100)
      : 100;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100), a };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100), a };
}

export function hslaToHex(h: number, s: number, l: number, a: number): string {
  // Clamp inputs to valid ranges to prevent malformed hex output from out-of-range
  // values that can arrive via slider math or user input.
  s = Math.max(0, Math.min(100, s));
  l = Math.max(0, Math.min(100, l));
  a = Math.max(0, Math.min(100, a));
  h = ((h % 360) + 360) % 360;
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');

  const rgb = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

  if (a === 100) return rgb;

  const alphaByte = Math.round((a / 100) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${rgb}${alphaByte}`;
}
