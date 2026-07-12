/**
 * Pure Tailwind-class suggestion generation for the DOM Tweaker lazy chunk.
 *
 * This module deliberately has no DOM reads, IO, global state mutation, or
 * eager package-root export. The prototype-sized static list lives behind the
 * DOM Tweaker lazy boundary, and callers may merge in host `@theme` CSS when
 * the tweaker runtime is already active.
 */

const COLOR_UTILITY_PREFIXES = ['bg', 'text', 'border'] as const;

const SPACING_UTILITY_PREFIXES = [
  'p',
  'px',
  'py',
  'pt',
  'pr',
  'pb',
  'pl',
  'm',
  'mx',
  'my',
  'mt',
  'mr',
  'mb',
  'ml',
  'gap',
  'gap-x',
  'gap-y',
  'w',
  'h',
  'space-x',
  'space-y',
] as const;

const STATIC_SPACING_SCALE = [
  '0',
  '0.5',
  '1',
  '1.5',
  '2',
  '2.5',
  '3',
  '4',
  '5',
  '6',
  '8',
  '10',
  '12',
  '14',
  '16',
  '20',
  '24',
  '32',
  '40',
  '48',
  '64',
] as const;

const STATIC_COLOR_PALETTE = [
  'slate',
  'gray',
  'red',
  'orange',
  'amber',
  'yellow',
  'green',
  'emerald',
  'teal',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'pink',
  'rose',
] as const;

const STATIC_COLOR_SHADES = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  '950',
] as const;

const STATIC_TEXT_SIZES = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'] as const;

const STATIC_FONT_WEIGHTS = [
  'thin',
  'light',
  'normal',
  'medium',
  'semibold',
  'bold',
  'extrabold',
  'black',
] as const;

const STATIC_RADII = ['none', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'] as const;

const STATIC_LAYOUT_AND_EFFECT_UTILITIES = [
  'rounded',
  'flex',
  'inline-flex',
  'grid',
  'block',
  'inline-block',
  'hidden',
  'flex-row',
  'flex-col',
  'flex-wrap',
  'grow',
  'shrink-0',
  'items-start',
  'items-center',
  'items-end',
  'items-stretch',
  'justify-start',
  'justify-center',
  'justify-end',
  'justify-between',
  'border',
  'border-0',
  'border-2',
  'border-4',
  'shadow',
  'shadow-sm',
  'shadow-md',
  'shadow-lg',
  'shadow-xl',
  'underline',
  'line-through',
  'uppercase',
  'lowercase',
  'capitalize',
  'italic',
  'truncate',
  'w-full',
  'h-full',
  'w-auto',
  'h-auto',
  'max-w-sm',
  'max-w-md',
  'max-w-lg',
  'max-w-xl',
  'opacity-50',
  'opacity-75',
  'opacity-100',
  'cursor-pointer',
  'select-none',
  'text-center',
  'text-left',
  'text-right',
  'leading-none',
  'leading-tight',
  'leading-normal',
  'leading-relaxed',
  'tracking-tight',
  'tracking-wide',
] as const;

/**
 * Prototype-sized static Tailwind candidate list, carried forward from the
 * DOM Tweaker feasibility prototype's `buildSuggestions()` coverage.
 */
export function buildStaticSuggestions(): string[] {
  const out = new Set<string>();

  addSpacingSuggestions(out, STATIC_SPACING_SCALE);

  for (const color of STATIC_COLOR_PALETTE) {
    for (const shade of STATIC_COLOR_SHADES) {
      addColorSuggestions(out, `${color}-${shade}`);
    }
  }

  // The feasibility prototype included this bridge token to prove custom
  // Tailwind v4 theme classes compile. Host `@theme` parsing below dedupes it
  // when `--color-brand` is present in real theme CSS.
  addColorSuggestions(out, 'brand');

  for (const size of STATIC_TEXT_SIZES) out.add(`text-${size}`);
  for (const weight of STATIC_FONT_WEIGHTS) out.add(`font-${weight}`);
  for (const radius of STATIC_RADII) out.add(`rounded-${radius}`);
  for (const utility of STATIC_LAYOUT_AND_EFFECT_UTILITIES) out.add(utility);

  return sortSuggestions(out);
}

export const STATIC_SUGGESTIONS: readonly string[] = Object.freeze(buildStaticSuggestions());

/**
 * Derive DOM Tweaker candidates from Tailwind v4 `@theme` custom properties.
 *
 * Supported namespaces:
 * - `--color-X` -> `bg-X`, `text-X`, `border-X`
 * - `--spacing-X` -> spacing-family utilities such as `p-X`, `px-X`,
 *   `gap-X`, `w-X`, `space-x-X`, etc.
 *
 * Unknown namespaces are ignored.
 */
export function buildThemeSuggestions(themeCss: string): string[] {
  const out = new Set<string>();

  for (const propertyName of parseThemeCustomPropertyNames(themeCss)) {
    if (propertyName.startsWith('--color-')) {
      const name = propertyName.slice('--color-'.length);
      if (isThemeTokenName(name)) addColorSuggestions(out, name);
      continue;
    }

    if (propertyName.startsWith('--spacing-')) {
      const name = propertyName.slice('--spacing-'.length);
      if (isThemeTokenName(name)) addSpacingSuggestions(out, [name]);
    }
  }

  return sortSuggestions(out);
}

/**
 * Build the full suggestion list from the static prototype list and optional
 * host theme CSS. The result is always sorted and deduped.
 */
export function buildSuggestions(themeCss = ''): string[] {
  if (themeCss.length === 0) return [...STATIC_SUGGESTIONS];
  return sortSuggestions([...STATIC_SUGGESTIONS, ...buildThemeSuggestions(themeCss)]);
}

export function filterSuggestions(query: string, limit: number): string[];
export function filterSuggestions(
  query: string,
  limit: number,
  suggestions: readonly string[],
): string[];
export function filterSuggestions(
  query: string,
  limit: number,
  suggestions: readonly string[] = STATIC_SUGGESTIONS,
): string[] {
  const cappedLimit = Math.max(0, Math.floor(limit));
  if (query.length === 0 || cappedLimit === 0) return [];

  const out: string[] = [];
  for (const suggestion of suggestions) {
    if (!suggestion.startsWith(query)) continue;
    out.push(suggestion);
    if (out.length >= cappedLimit) break;
  }
  return out;
}

function addColorSuggestions(out: Set<string>, name: string): void {
  for (const prefix of COLOR_UTILITY_PREFIXES) out.add(`${prefix}-${name}`);
}

function addSpacingSuggestions(out: Set<string>, scale: readonly string[]): void {
  for (const prefix of SPACING_UTILITY_PREFIXES) {
    for (const value of scale) out.add(`${prefix}-${value}`);
  }
}

function sortSuggestions(values: Iterable<string>): string[] {
  return [...new Set(values)].sort();
}

function isThemeTokenName(name: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(name);
}

function parseThemeCustomPropertyNames(themeCss: string): string[] {
  const names = new Set<string>();

  for (const block of readThemeBlocks(themeCss)) {
    for (const name of readTopLevelCustomPropertyNames(block)) {
      names.add(name);
    }
  }

  return [...names].sort();
}

function readThemeBlocks(source: string): string[] {
  const blocks: string[] = [];
  let i = 0;
  let depth = 0;

  while (i < source.length) {
    const commentEnd = skipComment(source, i);
    if (commentEnd !== null) {
      i = commentEnd;
      continue;
    }

    const stringEnd = skipString(source, i);
    if (stringEnd !== null) {
      i = stringEnd;
      continue;
    }

    const ch = source[i];
    if (ch === '{') {
      depth++;
      i++;
      continue;
    }
    if (ch === '}') {
      depth = Math.max(0, depth - 1);
      i++;
      continue;
    }

    if (depth === 0 && source.startsWith('@theme', i)) {
      const braceIndex = findThemePreludeBrace(source, i + '@theme'.length);
      if (braceIndex !== -1) {
        const contentStart = braceIndex + 1;
        const contentEnd = findMatchingCloseBrace(source, contentStart);
        if (contentEnd === -1) break;
        blocks.push(source.slice(contentStart, contentEnd));
        i = contentEnd + 1;
        continue;
      }
    }

    i++;
  }

  return blocks;
}

function findThemePreludeBrace(source: string, from: number): number {
  if (from < source.length && !isThemePreludeBoundary(source[from])) return -1;

  let i = from;
  while (i < source.length) {
    const commentEnd = skipComment(source, i);
    if (commentEnd !== null) {
      i = commentEnd;
      continue;
    }

    const ch = source[i];
    if (isCssWhitespace(ch)) {
      i++;
      continue;
    }
    if (ch === '{') return i;
    if (isIdentStart(ch)) {
      i++;
      while (i < source.length && isPreludeTokenChar(source[i])) i++;
      continue;
    }
    if (ch === '(') {
      const parenEnd = findMatchingCloseParen(source, i + 1);
      if (parenEnd === -1) return -1;
      i = parenEnd + 1;
      continue;
    }

    return -1;
  }

  return -1;
}

function readTopLevelCustomPropertyNames(block: string): string[] {
  const names = new Set<string>();
  let i = 0;
  let depth = 0;

  while (i < block.length) {
    const commentEnd = skipComment(block, i);
    if (commentEnd !== null) {
      i = commentEnd;
      continue;
    }

    const stringEnd = skipString(block, i);
    if (stringEnd !== null) {
      i = stringEnd;
      continue;
    }

    const ch = block[i];
    if (ch === '{') {
      depth++;
      i++;
      continue;
    }
    if (ch === '}') {
      depth = Math.max(0, depth - 1);
      i++;
      continue;
    }

    if (depth === 0 && block.startsWith('--', i)) {
      let end = i + 2;
      while (end < block.length && isCustomPropertyNameChar(block[end])) end++;

      const propertyName = block.slice(i, end);
      let cursor = end;
      while (cursor < block.length && isCssWhitespace(block[cursor])) cursor++;
      if (propertyName.length > 2 && block[cursor] === ':') {
        names.add(propertyName);
      }
      i = end;
      continue;
    }

    i++;
  }

  return [...names].sort();
}

function skipComment(source: string, from: number): number | null {
  if (source[from] !== '/' || source[from + 1] !== '*') return null;
  const end = source.indexOf('*/', from + 2);
  return end === -1 ? source.length : end + 2;
}

function skipString(source: string, from: number): number | null {
  const quote = source[from];
  if (quote !== '"' && quote !== "'") return null;

  let i = from + 1;
  while (i < source.length) {
    if (source[i] === '\\') {
      i += 2;
      continue;
    }
    if (source[i] === quote) return i + 1;
    i++;
  }

  return source.length;
}

function findMatchingCloseBrace(source: string, contentStart: number): number {
  let i = contentStart;
  let depth = 1;

  while (i < source.length) {
    const commentEnd = skipComment(source, i);
    if (commentEnd !== null) {
      i = commentEnd;
      continue;
    }

    const stringEnd = skipString(source, i);
    if (stringEnd !== null) {
      i = stringEnd;
      continue;
    }

    if (source[i] === '{') depth++;
    if (source[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }

  return -1;
}

function findMatchingCloseParen(source: string, contentStart: number): number {
  let i = contentStart;
  let depth = 1;

  while (i < source.length) {
    const stringEnd = skipString(source, i);
    if (stringEnd !== null) {
      i = stringEnd;
      continue;
    }

    if (source[i] === '(') depth++;
    if (source[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }

  return -1;
}

function isThemePreludeBoundary(ch: string): boolean {
  return ch === '{' || isCssWhitespace(ch) || ch === '/';
}

function isCssWhitespace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f';
}

function isIdentStart(ch: string): boolean {
  return /[A-Za-z_-]/.test(ch);
}

function isPreludeTokenChar(ch: string): boolean {
  return /[A-Za-z0-9_-]/.test(ch);
}

function isCustomPropertyNameChar(ch: string): boolean {
  return /[A-Za-z0-9_-]/.test(ch);
}
