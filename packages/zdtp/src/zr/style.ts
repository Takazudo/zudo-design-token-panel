import type { CSSProperties } from '@takazudo/zfb/zudo-react';

// CSS properties whose numeric values take no unit (React's unitless list,
// trimmed to what the panel uses).
const UNITLESS = new Set([
  'opacity',
  'z-index',
  'flex',
  'flex-grow',
  'flex-shrink',
  'font-weight',
  'line-height',
  'order',
]);

/**
 * Convert a React-style style object (camelCase keys, bare numbers as
 * px) into zudo-react's form (kebab-case keys, explicit units).
 */
export function toZrStyle(style: Readonly<Record<string, string | number | null | undefined>>): CSSProperties {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(style)) {
    if (value === null || value === undefined || value === '') continue;
    const name = key.startsWith('--') ? key : key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    out[name] = typeof value === 'number' && !UNITLESS.has(name) ? `${value}px` : String(value);
  }
  return out as CSSProperties;
}
