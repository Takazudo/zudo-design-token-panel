/**
 * build-element-path — pure DOM → annotated-path generator.
 *
 * Produces a structured `ElementPathResult` describing a single host element,
 * plus a `formatElementPath()` that renders it into the multi-line "annotated
 * block" the Element Path Copy feature writes to the clipboard.
 *
 * Why an annotated block (not bare XPath / a single selector)?
 * ----------------------------------------------------------
 * The panel's whole reason to exist is better human↔AI communication about a
 * page. A bare `/html/body/div[2]/...` (or even a terse CSS selector) tells an
 * AI *where* an element is but nothing about *what* it is. The block bundles:
 *
 *   - `selector`   — a minimal, querySelector-able unique CSS selector so the
 *                    element can be re-located programmatically.
 *   - `breadcrumb` — a human-readable tag/class ancestor chain (no nth-* noise)
 *                    so a reader can picture the structure at a glance.
 *   - `role`       — explicit or implicit ARIA role (semantics).
 *   - `text`       — a short trimmed text snippet (what the element *says*).
 *   - `attrs`      — a few identifying attributes (id / data-testid / href / …).
 *   - `size`       — rendered width × height in CSS px.
 *
 * Everything here is pure and DOM-only (no Preact), so it unit-tests cleanly
 * under jsdom.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ElementPathResult {
  /** One-line descriptor, e.g. `a.cta#signup`. */
  summary: string;
  /** Minimal unique CSS selector (querySelector-able). */
  selector: string;
  /** Readable ancestor chain with tag + first class, e.g. `body > nav.nav > a.cta`. */
  breadcrumb: string;
  /** Explicit or implicit ARIA role, or null when none is meaningful. */
  role: string | null;
  /** Trimmed, whitespace-collapsed, truncated text snippet, or null when empty. */
  text: string | null;
  /** A few identifying attributes rendered as `name="value"` strings. */
  attrs: string[];
  /** Rendered size in CSS px (0×0 when not laid out / detached). */
  size: { width: number; height: number };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Max length of the copied text snippet before it is truncated with an ellipsis. */
const MAX_TEXT_LENGTH = 60;

/** Max number of breadcrumb segments (deepest N) to keep the chain readable. */
const MAX_BREADCRUMB_DEPTH = 8;

/**
 * Attributes worth surfacing, in priority order. These are the ones that most
 * help a human or AI identify an element without re-reading the DOM.
 */
const IDENTIFYING_ATTRS = [
  'id',
  'data-testid',
  'data-test',
  'data-test-id',
  'name',
  'type',
  'href',
  'aria-label',
  'alt',
  'placeholder',
  'title',
] as const;

/** Max identifying attributes to include. */
const MAX_ATTRS = 5;

/**
 * Implicit ARIA roles for the common HTML elements. Intentionally small — this
 * is a hint for communication, not a spec-complete ARIA mapping. Elements whose
 * implicit role depends on context/attributes (`a` without `href`, `input` of
 * an exotic type, etc.) are handled in `implicitRole()`.
 */
const IMPLICIT_ROLE_BY_TAG: Record<string, string> = {
  nav: 'navigation',
  main: 'main',
  header: 'banner',
  footer: 'contentinfo',
  aside: 'complementary',
  section: 'region',
  article: 'article',
  button: 'button',
  ul: 'list',
  ol: 'list',
  li: 'listitem',
  table: 'table',
  img: 'img',
  form: 'form',
  select: 'combobox',
  textarea: 'textbox',
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
};

// ---------------------------------------------------------------------------
// CSS identifier escaping
// ---------------------------------------------------------------------------

/**
 * Escape a string for safe use as a CSS identifier (class / id segment).
 * Prefers the native `CSS.escape`; falls back to a conservative manual escape
 * for environments where it is unavailable (older jsdom, etc.).
 */
export function cssEscapeIdent(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  // Minimal fallback: backslash-escape anything outside [A-Za-z0-9_-], and
  // guard a leading digit (invalid as the first char of an identifier).
  return value
    .replace(/^[0-9]/, (d) => `\\3${d} `)
    .replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
}

// ---------------------------------------------------------------------------
// Class helpers
// ---------------------------------------------------------------------------

/**
 * Return the element's class list, filtered to "stable-looking" classes.
 *
 * Utility/atomic and hash-suffixed classes (e.g. Tailwind's `px-4`, CSS-module
 * `Button_root__a1b2c`, styled-components `sc-xxxx`) make selectors brittle and
 * breadcrumbs noisy. We drop classes that look machine-generated so the human
 * breadcrumb stays readable. The unique-selector path does NOT rely on classes
 * (it uses :nth-of-type), so dropping them never breaks uniqueness.
 */
function stableClasses(el: Element): string[] {
  const raw = (el.getAttribute('class') ?? '').trim();
  if (!raw) return [];
  return raw
    .split(/\s+/)
    .filter((c) => c.length > 0)
    // Drop machine-generated class fragments that make selectors/breadcrumbs
    // noisy: CSS-module (`Button__root`), styled-components (`sc-xxxx`), emotion
    // (`css-1a2b3c`), and bare hashes (6+ chars mixing letters and digits).
    .filter((c) => !/__|^sc-|^css-[a-z0-9]{4,}/i.test(c))
    .filter((c) => !(/[a-z][0-9]|[0-9][a-z]/i.test(c) && c.length >= 6));
}

// ---------------------------------------------------------------------------
// Unique selector
// ---------------------------------------------------------------------------

function isUnique(selector: string, el: Element): boolean {
  const doc = el.ownerDocument;
  if (!doc) return false;
  try {
    const matches = doc.querySelectorAll(selector);
    return matches.length === 1 && matches[0] === el;
  } catch {
    // Malformed selector (exotic tag/id) — treat as non-unique.
    return false;
  }
}

/** `:nth-of-type(n)` suffix when the element has same-tag siblings, else ''. */
function nthOfTypeSuffix(el: Element): string {
  const parent = el.parentElement;
  if (!parent) return '';
  const tag = el.tagName;
  const sameTag = Array.from(parent.children).filter((c) => c.tagName === tag);
  if (sameTag.length <= 1) return '';
  const index = sameTag.indexOf(el) + 1;
  return `:nth-of-type(${index})`;
}

/**
 * Selector segment for a single element: tag + nth-of-type if needed.
 *
 * Uses `localName` (not `tagName.toLowerCase()`) so camel-cased SVG elements
 * like `linearGradient` keep their exact case — CSS type selectors are
 * case-sensitive for non-HTML elements, so lowercasing would break the match.
 */
function segmentFor(el: Element): string {
  return el.localName + nthOfTypeSuffix(el);
}

/**
 * Build a minimal unique CSS selector for `el`.
 *
 * Strategy (closest to DevTools "Copy selector"):
 *  1. If the element has a unique, valid id → `#id` (shortest possible).
 *  2. Otherwise walk ancestors, prepending `tag:nth-of-type(n)` segments, and
 *     stop as soon as the accumulated selector matches exactly one element.
 *     An ancestor with a unique id anchors the chain early.
 *  3. If we reach the root without uniqueness (degenerate DOM), return the
 *     full chain anyway — it is the best available.
 */
export function buildUniqueSelector(el: Element): string {
  // Root element — `html` is always unique and has no useful ancestor chain.
  if (el.tagName === 'HTML') return 'html';

  // Fast path: unique id.
  const id = el.getAttribute('id');
  if (id) {
    const idSelector = `#${cssEscapeIdent(id)}`;
    if (isUnique(idSelector, el)) return idSelector;
  }

  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current.nodeType === 1 && current.tagName !== 'HTML') {
    // Anchor on an ancestor's unique id when available — shortens the chain.
    const curId = current.getAttribute('id');
    if (curId) {
      const idSel = `#${cssEscapeIdent(curId)}`;
      if (isUnique(idSel, current)) {
        parts.unshift(idSel);
        const candidate = parts.join(' > ');
        if (isUnique(candidate, el)) return candidate;
        // id anchored but chain still not unique — keep climbing from parent.
        current = current.parentElement;
        continue;
      }
    }

    parts.unshift(segmentFor(current));
    const candidate = parts.join(' > ');
    if (isUnique(candidate, el)) return candidate;

    current = current.parentElement;
  }

  return parts.join(' > ');
}

// ---------------------------------------------------------------------------
// Breadcrumb
// ---------------------------------------------------------------------------

/**
 * Build a readable ancestor chain `tag.firstClass > … > tag.firstClass`,
 * limited to the deepest `MAX_BREADCRUMB_DEPTH` segments. No nth-* noise — this
 * is for humans, not querySelector.
 */
export function buildBreadcrumb(el: Element): string {
  const segments: string[] = [];
  let current: Element | null = el;

  while (current && current.nodeType === 1 && current.tagName !== 'HTML') {
    const tag = current.localName;
    const cls = stableClasses(current)[0];
    segments.unshift(cls ? `${tag}.${cls}` : tag);
    current = current.parentElement;
  }

  if (segments.length > MAX_BREADCRUMB_DEPTH) {
    return '… > ' + segments.slice(-MAX_BREADCRUMB_DEPTH).join(' > ');
  }
  return segments.join(' > ');
}

// ---------------------------------------------------------------------------
// Role / text / attrs / summary
// ---------------------------------------------------------------------------

/** Resolve explicit `role` attribute, else a small implicit-role mapping. */
export function resolveRole(el: Element): string | null {
  const explicit = el.getAttribute('role');
  if (explicit && explicit.trim()) return explicit.trim();

  const tag = el.tagName.toLowerCase();
  if (tag === 'a') {
    return el.hasAttribute('href') ? 'link' : null;
  }
  if (tag === 'input') {
    const type = (el.getAttribute('type') ?? 'text').toLowerCase();
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    if (type === 'button' || type === 'submit' || type === 'reset') return 'button';
    if (type === 'range') return 'slider';
    if (type === 'hidden') return null;
    return 'textbox';
  }
  return IMPLICIT_ROLE_BY_TAG[tag] ?? null;
}

/** Trimmed, whitespace-collapsed, truncated text snippet, or null when empty. */
export function resolveText(el: Element): string | null {
  const raw = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (!raw) return null;
  if (raw.length <= MAX_TEXT_LENGTH) return raw;
  return raw.slice(0, MAX_TEXT_LENGTH - 1).trimEnd() + '…';
}

/** Collect up to `MAX_ATTRS` identifying attributes as `name="value"` strings. */
export function resolveAttrs(el: Element): string[] {
  const out: string[] = [];
  for (const name of IDENTIFYING_ATTRS) {
    if (out.length >= MAX_ATTRS) break;
    const value = el.getAttribute(name);
    if (value === null) continue;
    const trimmed = value.replace(/\s+/g, ' ').trim();
    if (!trimmed) continue;
    const shown = trimmed.length > 40 ? trimmed.slice(0, 39) + '…' : trimmed;
    out.push(`${name}="${shown}"`);
  }
  return out;
}

/** One-line descriptor: `tag#id.class1.class2` (id first, then up to 2 classes). */
export function buildSummary(el: Element): string {
  const tag = el.localName;
  const id = el.getAttribute('id');
  const classes = stableClasses(el).slice(0, 2);
  let out = tag;
  if (id) out += `#${id}`;
  for (const c of classes) out += `.${c}`;
  return out;
}

// ---------------------------------------------------------------------------
// Top-level builder + formatter
// ---------------------------------------------------------------------------

export function buildElementPath(el: Element): ElementPathResult {
  let size = { width: 0, height: 0 };
  if (typeof (el as HTMLElement).getBoundingClientRect === 'function') {
    const rect = el.getBoundingClientRect();
    size = { width: Math.round(rect.width), height: Math.round(rect.height) };
  }

  return {
    summary: buildSummary(el),
    selector: buildUniqueSelector(el),
    breadcrumb: buildBreadcrumb(el),
    role: resolveRole(el),
    text: resolveText(el),
    attrs: resolveAttrs(el),
    size,
  };
}

/**
 * Render an `ElementPathResult` into the multi-line annotated block copied to
 * the clipboard. Only meaningful fields are emitted (no empty `role:`/`text:`
 * lines), so the block stays compact for small/anonymous elements.
 */
export function formatElementPath(result: ElementPathResult): string {
  const lines: string[] = [];
  lines.push(`element:  ${result.summary}`);
  lines.push(`selector: ${result.selector}`);
  lines.push(`path:     ${result.breadcrumb}`);
  if (result.role) lines.push(`role:     ${result.role}`);
  if (result.text) lines.push(`text:     "${result.text}"`);
  if (result.attrs.length > 0) lines.push(`attrs:    ${result.attrs.join(', ')}`);
  lines.push(`size:     ${result.size.width} × ${result.size.height}`);
  return lines.join('\n');
}

/** Convenience: build + format in one call. */
export function buildElementPathString(el: Element): string {
  return formatElementPath(buildElementPath(el));
}
