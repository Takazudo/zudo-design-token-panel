/**
 * Pure, IO-free CSS custom-property value replacement.
 *
 * `applyTokenOverrides(source, overrides)` rewrites the values of one or more
 * CSS custom properties inside the FIRST top-level `:root { ... }` block of a
 * CSS file, preserving surrounding whitespace and trailing inline comments.
 * The module is the regex foundation that the dev-API endpoint (Sub 1454)
 * wraps; it performs no IO, no DOM access, and is safe to import in any
 * environment.
 *
 * Behavior summary
 * ----------------
 * - Only the FIRST top-level `:root { ... }` block is modified. Tokens inside
 *   `@media`, `@layer`, `@supports`, or nested `:root` blocks are IGNORED.
 * - Per-cssVar regex: `(--name:)\s*([\s\S]+?);` with the name regex-escaped.
 *   The non-greedy value capture stops at the first `;`, which preserves any
 *   trailing `/​* ... *​/` inline comment on the same logical line.
 * - A whitespace-trimmed comparison between the old value and the override
 *   decides whether the cssVar lands in `changed` or `unchanged`.
 * - Idempotent: applying the same overrides twice in a row reports every key
 *   as `unchanged` on the second call and produces byte-identical output.
 *
 * Known limitations (if a richer transform is ever needed, swap this module
 * for a real CSS parser such as postcss):
 * - Only `:root` as a bare selector is recognized. Grouped selectors such as
 *   `:root, html { ... }` are NOT treated as a `:root` block.
 * - Nested `:root` under `@media` / `@layer` / `@supports` is intentionally
 *   skipped; see the test matrix in the companion `__tests__` file.
 * - Values containing a literal `;` inside a string or comment would confuse
 *   the non-greedy regex. Not supported.
 * - If the same cssVar is declared multiple times in the top-level `:root`
 *   block, only the FIRST occurrence is rewritten.
 */

export interface ApplyResult {
  /** The new CSS file contents (byte-identical to `source` when nothing
   *  changed, including the "no :root block" case). */
  updated: string;
  /** cssVar names actually rewritten (trimmed new value differs from old). */
  changed: string[];
  /** cssVar names present in the file whose trimmed value already matched
   *  the override. */
  unchanged: string[];
  /** cssVar names in `overrides` that were not found in the first top-level
   *  `:root` block (either because the name is absent, or because no
   *  top-level `:root` block exists). */
  unknown: string[];
}

/**
 * Thrown by {@link applyTokenOverridesOrThrow} when the source has no
 * top-level `:root { ... }` block. Lets the dev-API handler surface a
 * diagnostic message without having to probe the result shape.
 */
export class NoRootBlockError extends Error {
  constructor(message = 'No top-level ":root { ... }" block found in source.') {
    super(message);
    this.name = 'NoRootBlockError';
    Object.setPrototypeOf(this, NoRootBlockError.prototype);
  }
}

interface RootBlockBounds {
  /** Index of the first character INSIDE the `:root { ... }` block (just
   *  after the opening `{`). */
  contentStart: number;
  /** Index of the matching `}` (exclusive end of block content). */
  contentEnd: number;
}

/**
 * Scan `source` with a small state machine that tracks brace depth while
 * skipping CSS block comments and string literals. Returns the bounds of the
 * first top-level `:root { ... }` block, or `null` if none exists.
 *
 * "Top-level" means brace depth is zero at the point `:root` appears, so
 * `:root` blocks nested under `@media`, `@layer`, `@supports`, etc. are
 * deliberately skipped.
 */
function findFirstTopLevelRootBlock(source: string): RootBlockBounds | null {
  const len = source.length;
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

    if (depth === 0 && ch === ':' && source.startsWith(':root', i)) {
      const after = i + 5;
      const nextCh = source[after] ?? '';
      if (!isIdentChar(nextCh)) {
        const braceIdx = skipTriviaToBrace(source, after);
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

function isIdentChar(ch: string): boolean {
  return /[A-Za-z0-9_-]/.test(ch);
}

/**
 * Skip whitespace and block comments starting at `from`, returning the index
 * of the next `{` character, or -1 if anything else intervenes (indicating
 * the `:root` token was not the start of a simple block, e.g. a grouped
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

type SingleReplaceStatus = 'changed' | 'unchanged' | 'unknown';

interface SingleReplaceResult {
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
 * corrupting the user-authored comment. See PR #1440 review item B4.
 */
function maskComments(input: string): string {
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
function replaceOne(content: string, cssVarName: string, newValue: string): SingleReplaceResult {
  const bareName = cssVarName.startsWith('--') ? cssVarName.slice(2) : cssVarName;
  const escaped = escapeRegExp(bareName);
  // Three capture groups so we can re-emit the original whitespace byte-for-byte:
  //   1: the `--name:` prefix
  //   2: whitespace between `:` and the value
  //   3: the value, non-greedy so it stops at the first `;`
  const re = new RegExp('(--' + escaped + ':)(\\s*)([\\s\\S]+?);');
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

/**
 * Rewrite `overrides` into the first top-level `:root { ... }` block of
 * `source` and return an {@link ApplyResult} describing the outcome.
 *
 * If `source` has no top-level `:root` block, the function returns
 * `source` unchanged with every key routed to `unknown` — the companion
 * {@link applyTokenOverridesOrThrow} raises {@link NoRootBlockError} in
 * that case so callers that need a hard failure can distinguish it from a
 * block where merely none of the overrides matched.
 */
export function applyTokenOverrides(
  source: string,
  overrides: Record<string, string>,
): ApplyResult {
  const keys = Object.keys(overrides);
  const bounds = findFirstTopLevelRootBlock(source);
  if (!bounds) {
    return {
      updated: source,
      changed: [],
      unchanged: [],
      unknown: [...keys],
    };
  }

  let content = source.slice(bounds.contentStart, bounds.contentEnd);
  const changed: string[] = [];
  const unchanged: string[] = [];
  const unknown: string[] = [];

  for (const key of keys) {
    const result = replaceOne(content, key, overrides[key]);
    content = result.content;
    if (result.status === 'changed') changed.push(key);
    else if (result.status === 'unchanged') unchanged.push(key);
    else unknown.push(key);
  }

  const updated = source.slice(0, bounds.contentStart) + content + source.slice(bounds.contentEnd);

  return { updated, changed, unchanged, unknown };
}

/**
 * Throwing variant. Same shape as {@link applyTokenOverrides} except it
 * raises {@link NoRootBlockError} when no top-level `:root { ... }` block
 * exists, instead of returning every override under `unknown`. Use this from
 * server-side handlers where "no :root block" is a fatal configuration
 * problem rather than an expected state.
 */
export function applyTokenOverridesOrThrow(
  source: string,
  overrides: Record<string, string>,
): ApplyResult {
  const bounds = findFirstTopLevelRootBlock(source);
  if (!bounds) {
    throw new NoRootBlockError();
  }
  return applyTokenOverrides(source, overrides);
}

/**
 * Low-level predicate exposed primarily for callers that want to report a
 * precise diagnostic without running a full rewrite. Returns `true` iff the
 * source contains at least one top-level `:root { ... }` block.
 */
export function hasTopLevelRootBlock(source: string): boolean {
  return findFirstTopLevelRootBlock(source) !== null;
}
