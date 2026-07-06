/**
 * Pure, IO-free CSS custom-property value replacement.
 *
 * `applyTokenOverrides(source, overrides)` rewrites the values of one or more
 * CSS custom properties inside the FIRST top-level `:root { ... }` block AND
 * the FIRST top-level `@theme { ... }` block (Tailwind v4 design-token scope)
 * of a CSS file, preserving surrounding whitespace and trailing inline
 * comments. The module is the regex foundation that the dev-API endpoint
 * wraps; it performs no IO, no DOM access, and is safe to import in any
 * environment.
 *
 * Behavior summary
 * ----------------
 * - Two top-level blocks are scanned: the FIRST top-level `:root { ... }` block
 *   and the FIRST top-level `@theme { ... }` block (first-of-each-kind only).
 *   Later blocks of either kind, and tokens inside `@media`, `@layer`,
 *   `@supports`, or nested blocks, are IGNORED.
 * - `:root`-first-match-wins: for each override var, `:root` is tried first and
 *   `@theme` is the fallback. A var declared in BOTH blocks is rewritten only
 *   in `:root`.
 * - `@theme` accepts an optional modifier — `@theme`, `@theme inline`,
 *   `@theme static`, `@theme reference`, or a combination — because Tailwind v4
 *   prescribes `@theme inline` precisely when theme values reference other
 *   variables (the mainstream case). `:root` matching stays strict: grouped
 *   selectors such as `:root, html { ... }` are NOT treated as a `:root` block.
 * - Per-cssVar regex: `(--name:)\s*([\s\S]+?);` with the name regex-escaped.
 *   The non-greedy value capture stops at the first `;`, which preserves any
 *   trailing `/​* ... *​/` inline comment on the same logical line.
 * - A whitespace-trimmed comparison between the old value and the override
 *   decides whether the cssVar lands in `changed` or `unchanged`.
 * - Idempotent: applying the same overrides twice in a row reports every key
 *   as `unchanged` on the second call and produces byte-identical output. The
 *   two non-overlapping regions are spliced back in DESCENDING start order so
 *   the earlier region's offsets stay valid through the later region's splice.
 *
 * Known limitations (if a richer transform is ever needed, swap this module
 * for a real CSS parser such as postcss):
 * - Only `:root` as a bare selector is recognized. Grouped selectors such as
 *   `:root, html { ... }` are NOT treated as a `:root` block.
 * - Only the FIRST top-level block of each kind is scanned; a second top-level
 *   `:root` or `@theme` block is ignored.
 * - Nested `:root` / `@theme` under `@media` / `@layer` / `@supports` is
 *   intentionally skipped; see the test matrix in the companion `__tests__`
 *   file.
 * - Values containing a literal `;` inside a string or comment would confuse
 *   the non-greedy regex. Not supported.
 * - If the same cssVar is declared multiple times inside a single scanned
 *   block, only the FIRST occurrence is rewritten.
 */

export interface ApplyResult {
  /** The new CSS file contents (byte-identical to `source` when nothing
   *  changed, including the "no scannable block" case). */
  updated: string;
  /** cssVar names actually rewritten (trimmed new value differs from old). */
  changed: string[];
  /** cssVar names present in a scanned block whose trimmed value already
   *  matched the override. */
  unchanged: string[];
  /** cssVar names in `overrides` that were not found in EITHER the first
   *  top-level `:root` block or the first top-level `@theme` block (the name
   *  is absent, or neither block exists). */
  unknown: string[];
}

/**
 * Thrown by {@link applyTokenOverridesOrThrow} when the source has neither a
 * top-level `:root { ... }` block nor a top-level `@theme { ... }` block. Lets
 * the dev-API handler surface a diagnostic message without having to probe the
 * result shape.
 */
export class NoTokenBlockError extends Error {
  constructor(
    message = 'No top-level ":root { ... }" or "@theme { ... }" block found in source.',
  ) {
    super(message);
    this.name = 'NoTokenBlockError';
    Object.setPrototypeOf(this, NoTokenBlockError.prototype);
  }
}

/**
 * @deprecated Retained as an alias for {@link NoTokenBlockError} so existing
 * `instanceof` / import sites keep working. The scan now covers `@theme`
 * blocks too, so "NoRootBlock" is no longer literally accurate.
 */
export const NoRootBlockError = NoTokenBlockError;

export interface BlockBounds {
  /** Index of the first character INSIDE the block (just after the opening
   *  `{`). */
  contentStart: number;
  /** Index of the matching `}` (exclusive end of block content). */
  contentEnd: number;
}

// NOTE (#508 reuse): `findFirstTopLevelRootBlock`, `findFirstTopLevelThemeBlock`
// (block bounds for "inside a scanned block" classification), and `replaceOne`
// / `maskComments` (the name-escape + comment-mask regex logic) are exported
// below so the Wave-2 "declared but outside scanned blocks" diagnostic can
// reuse them without duplicating the scan/regex. This module is not part of the
// package `exports` map, so these are internal-to-the-package exports only.

/**
 * Scan `source` with a small state machine that tracks brace depth while
 * skipping CSS block comments and string literals. Returns the bounds of the
 * first top-level block introduced by `keyword`, or `null` if none exists.
 *
 * "Top-level" means brace depth is zero at the point `keyword` appears, so
 * blocks nested under `@media`, `@layer`, `@supports`, etc. are deliberately
 * skipped.
 *
 * @param keyword The block introducer to match at depth 0 (e.g. `:root`,
 *   `@theme`). Matched literally; the character immediately after must not be
 *   an identifier character (so `:root` never matches `:rooted` and `@theme`
 *   never matches `@themed`).
 * @param allowModifier When true, one or more whitespace-separated identifier
 *   modifier tokens (e.g. `inline`, `static`, `reference`) may appear between
 *   the keyword and the opening `{` — this is the `@theme inline { ... }`
 *   shape. When false (the `:root` case) only trivia may precede `{`.
 */
function findFirstTopLevelBlock(
  source: string,
  keyword: string,
  allowModifier: boolean,
): BlockBounds | null {
  const len = source.length;
  const kwLen = keyword.length;
  const firstChar = keyword[0];
  let i = 0;
  let depth = 0;

  while (i < len) {
    const ch = source[i];

    // Block comment — /* ... */
    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      if (end === -1) return null;
      i = end + 2;
      continue;
    }

    // String literals — preserve `{`, `}`, `;` inside
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      while (i < len && source[i] !== quote) {
        if (source[i] === '\\' && i + 1 < len) i++;
        i++;
      }
      i++;
      continue;
    }

    if (ch === '{') {
      depth++;
      i++;
      continue;
    }
    if (ch === '}') {
      if (depth > 0) depth--;
      i++;
      continue;
    }

    if (depth === 0 && ch === firstChar && source.startsWith(keyword, i)) {
      const after = i + kwLen;
      const nextCh = source[after] ?? '';
      if (!isIdentChar(nextCh)) {
        const braceIdx = allowModifier
          ? skipTriviaAndModifiersToBrace(source, after)
          : skipTriviaToBrace(source, after);
        if (braceIdx !== -1) {
          const contentStart = braceIdx + 1;
          const contentEnd = findMatchingClose(source, contentStart);
          if (contentEnd !== -1) {
            return { contentStart, contentEnd };
          }
          return null;
        }
      }
    }

    i++;
  }

  return null;
}

/**
 * Bounds of the first top-level `:root { ... }` block, or `null`. Grouped
 * selectors (`:root, html { ... }`) are intentionally NOT matched.
 */
export function findFirstTopLevelRootBlock(source: string): BlockBounds | null {
  return findFirstTopLevelBlock(source, ':root', false);
}

/**
 * Bounds of the first top-level `@theme { ... }` block, or `null`. Tolerates an
 * optional modifier (`@theme inline`, `@theme static`, ...) between `@theme`
 * and the opening `{`.
 */
export function findFirstTopLevelThemeBlock(source: string): BlockBounds | null {
  return findFirstTopLevelBlock(source, '@theme', true);
}

function isIdentChar(ch: string): boolean {
  return /[A-Za-z0-9_-]/.test(ch);
}

/**
 * Skip whitespace and block comments starting at `from`, returning the index
 * of the next `{` character, or -1 if anything else intervenes (indicating
 * the block introducer was not the start of a simple block, e.g. a grouped
 * selector like `:root, html { ... }`).
 */
function skipTriviaToBrace(source: string, from: number): number {
  const len = source.length;
  let j = from;
  while (j < len) {
    const c = source[j];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f') {
      j++;
      continue;
    }
    if (c === '/' && source[j + 1] === '*') {
      const end = source.indexOf('*/', j + 2);
      if (end === -1) return -1;
      j = end + 2;
      continue;
    }
    return c === '{' ? j : -1;
  }
  return -1;
}

/**
 * Like {@link skipTriviaToBrace}, but also tolerates any number of
 * whitespace-separated identifier modifier tokens before the `{`. This is the
 * `@theme inline { ... }` / `@theme static reference { ... }` shape prescribed
 * by Tailwind v4. Returns the index of the `{`, or -1 if a non-identifier,
 * non-trivia character (e.g. `,` in a grouped-like `@theme, html { ... }`)
 * intervenes.
 */
function skipTriviaAndModifiersToBrace(source: string, from: number): number {
  const len = source.length;
  let j = from;
  while (j < len) {
    const c = source[j];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f') {
      j++;
      continue;
    }
    if (c === '/' && source[j + 1] === '*') {
      const end = source.indexOf('*/', j + 2);
      if (end === -1) return -1;
      j = end + 2;
      continue;
    }
    if (c === '{') return j;
    // A modifier token: consume the whole run of identifier characters.
    if (isIdentChar(c)) {
      j++;
      while (j < len && isIdentChar(source[j])) j++;
      continue;
    }
    // Anything else (comma, colon, ...) — not a simple `@theme` block.
    return -1;
  }
  return -1;
}

/**
 * Given an index pointing at the character AFTER an opening `{`, return the
 * index of the matching closing `}`, or -1 on malformed input. Comments and
 * string literals are skipped so their `{`/`}` characters do not affect
 * balance.
 */
function findMatchingClose(source: string, from: number): number {
  const len = source.length;
  let k = from;
  let sub = 1;
  while (k < len) {
    const c = source[k];
    if (c === '/' && source[k + 1] === '*') {
      const end = source.indexOf('*/', k + 2);
      if (end === -1) return -1;
      k = end + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      k++;
      while (k < len && source[k] !== quote) {
        if (source[k] === '\\' && k + 1 < len) k++;
        k++;
      }
      k++;
      continue;
    }
    if (c === '{') {
      sub++;
      k++;
      continue;
    }
    if (c === '}') {
      sub--;
      if (sub === 0) return k;
      k++;
      continue;
    }
    k++;
  }
  return -1;
}

function escapeRegExp(input: string): string {
  return input.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
}

export type SingleReplaceStatus = 'changed' | 'unchanged' | 'unknown';

export interface SingleReplaceResult {
  content: string;
  status: SingleReplaceStatus;
}

/**
 * Replace every CSS block comment (`/​* ... *​/`) with same-length whitespace
 * so the per-declaration regex below cannot match a fake declaration that
 * lives INSIDE a comment. Same-length is critical: the masked string is used
 * only as a search space, but the resulting `match.index` is then sliced
 * straight back into the original (un-masked) `content`, so masked and
 * original must agree byte-for-byte on offsets.
 *
 * Pre-fix behaviour: a `:root` containing
 *
 *   /* --zd-foo: red; *​/
 *   --zd-foo: blue;
 *
 * would have its commented-out value rewritten by the regex (it matches the
 * FIRST occurrence), leaving the live declaration untouched and silently
 * corrupting the user-authored comment.
 */
export function maskComments(input: string): string {
  return input.replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length));
}

/**
 * Replace the value of a single custom property inside `content`. The name
 * may be supplied with or without the leading `--`. Returns the updated
 * content along with a status flag used to populate `changed` / `unchanged`
 * / `unknown` in the top-level {@link ApplyResult}.
 *
 * The match is run against a comment-masked copy of `content` so a
 * commented-out declaration cannot shadow a live one (B4 fix). Edits are
 * still spliced back into the original `content` so trailing inline comments
 * survive byte-for-byte.
 */
export function replaceOne(
  content: string,
  cssVarName: string,
  newValue: string,
): SingleReplaceResult {
  const bareName = cssVarName.startsWith('--') ? cssVarName.slice(2) : cssVarName;
  const escaped = escapeRegExp(bareName);
  // Three capture groups so we can re-emit the original whitespace byte-for-byte:
  //   1: the `--name:` prefix
  //   2: whitespace between `:` and the value
  //   3: the value, non-greedy so it stops at the first `;`
  // The lookbehind (?<![\w-]) prevents a suffix match: searching for `--foo`
  // must not rewrite `--x--foo` when its tail matches (F25 suffix-collision fix).
  const re = new RegExp('(?<![\\w-])(--' + escaped + ':)(\\s*)([\\s\\S]+?);');
  const masked = maskComments(content);
  const match = re.exec(masked);
  if (!match) return { content, status: 'unknown' };

  const [fullMaskedMatch, prefix, whitespace] = match;
  const start = match.index;
  const end = start + fullMaskedMatch.length;

  // Slice the value from the ORIGINAL content. The masked string only
  // changes characters inside `/​* ... *​/` to spaces, and a live declaration
  // (the only thing the regex can now match) sits outside any comment, so
  // the value substring is identical in masked and original — but we still
  // read from `content` so any future mask change can't introduce drift.
  const valueStart = start + prefix.length + whitespace.length;
  const valueEnd = end - 1; // before the trailing ';'
  const oldValue = content.slice(valueStart, valueEnd);

  const trimmedOld = oldValue.trim();
  const trimmedNew = newValue.trim();
  if (trimmedOld === trimmedNew) {
    return { content, status: 'unchanged' };
  }

  const updated =
    content.slice(0, start) + prefix + whitespace + newValue + ';' + content.slice(end);
  return { content: updated, status: 'changed' };
}

interface ScannedRegion {
  start: number;
  end: number;
  /** Live, possibly-rewritten content for this region. */
  content: string;
}

/**
 * Rewrite `overrides` into the first top-level `:root { ... }` block AND the
 * first top-level `@theme { ... }` block of `source`, returning an
 * {@link ApplyResult} describing the outcome.
 *
 * Per override var, `:root` is tried first and `@theme` is the fallback, so a
 * var present in both blocks is rewritten only in `:root` (`:root`-first-match-
 * wins). The two non-overlapping block regions are spliced back into `source`
 * in DESCENDING start order so the earlier region's offsets stay valid.
 *
 * If `source` has neither block, the function returns `source` unchanged with
 * every key routed to `unknown` — the companion {@link applyTokenOverridesOrThrow}
 * raises {@link NoTokenBlockError} in that case so callers that need a hard
 * failure can distinguish it from a file where merely none of the overrides
 * matched.
 */
export function applyTokenOverrides(
  source: string,
  overrides: Record<string, string>,
): ApplyResult {
  const keys = Object.keys(overrides);
  const rootBounds = findFirstTopLevelRootBlock(source);
  const themeBounds = findFirstTopLevelThemeBlock(source);

  if (!rootBounds && !themeBounds) {
    return {
      updated: source,
      changed: [],
      unchanged: [],
      unknown: [...keys],
    };
  }

  let rootContent = rootBounds ? source.slice(rootBounds.contentStart, rootBounds.contentEnd) : null;
  let themeContent = themeBounds
    ? source.slice(themeBounds.contentStart, themeBounds.contentEnd)
    : null;

  const changed: string[] = [];
  const unchanged: string[] = [];
  const unknown: string[] = [];

  for (const key of keys) {
    // Try :root first — a var present in both blocks is rewritten only here.
    if (rootContent !== null) {
      const rootResult = replaceOne(rootContent, key, overrides[key]);
      if (rootResult.status !== 'unknown') {
        rootContent = rootResult.content;
        if (rootResult.status === 'changed') changed.push(key);
        else unchanged.push(key);
        continue;
      }
    }
    // Fall back to @theme.
    if (themeContent !== null) {
      const themeResult = replaceOne(themeContent, key, overrides[key]);
      if (themeResult.status !== 'unknown') {
        themeContent = themeResult.content;
        if (themeResult.status === 'changed') changed.push(key);
        else unchanged.push(key);
        continue;
      }
    }
    unknown.push(key);
  }

  // Splice both regions back in DESCENDING start order. The two blocks are
  // guaranteed non-overlapping (each is a balanced top-level block at brace
  // depth 0), so replacing the later region first leaves the earlier region's
  // offsets untouched.
  const regions: ScannedRegion[] = [];
  if (rootBounds && rootContent !== null) {
    regions.push({ start: rootBounds.contentStart, end: rootBounds.contentEnd, content: rootContent });
  }
  if (themeBounds && themeContent !== null) {
    regions.push({
      start: themeBounds.contentStart,
      end: themeBounds.contentEnd,
      content: themeContent,
    });
  }
  regions.sort((a, b) => b.start - a.start);

  let updated = source;
  for (const region of regions) {
    updated = updated.slice(0, region.start) + region.content + updated.slice(region.end);
  }

  return { updated, changed, unchanged, unknown };
}

/**
 * Throwing variant. Same shape as {@link applyTokenOverrides} except it
 * raises {@link NoTokenBlockError} when the source has neither a top-level
 * `:root { ... }` block nor a top-level `@theme { ... }` block, instead of
 * returning every override under `unknown`. Use this from server-side handlers
 * where "no writable token block" is a fatal configuration problem rather than
 * an expected state.
 */
export function applyTokenOverridesOrThrow(
  source: string,
  overrides: Record<string, string>,
): ApplyResult {
  if (!hasApplicableTokenBlock(source)) {
    throw new NoTokenBlockError();
  }
  return applyTokenOverrides(source, overrides);
}

/**
 * Low-level predicate exposed primarily for callers that want to report a
 * precise diagnostic without running a full rewrite. Returns `true` iff the
 * source contains at least one scannable top-level token block — a `:root`
 * block OR a `@theme` block. Consistent with the {@link applyTokenOverridesOrThrow}
 * throw condition (which fires only when this returns `false`).
 */
export function hasApplicableTokenBlock(source: string): boolean {
  return findFirstTopLevelRootBlock(source) !== null || findFirstTopLevelThemeBlock(source) !== null;
}

/**
 * @deprecated Renamed to {@link hasApplicableTokenBlock} now that the scan
 * covers `@theme` blocks too. Retained as an alias so existing call sites keep
 * working; it returns `true` for a `@theme`-only file (no `:root`).
 */
export const hasTopLevelRootBlock = hasApplicableTokenBlock;
