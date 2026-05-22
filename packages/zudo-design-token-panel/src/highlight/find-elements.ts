/**
 * findElementsUsingToken — uses a sentinel-substitution probe to find every
 * DOM element whose computed style reflects a given CSS custom property.
 *
 * ## How it works (high level)
 *
 * 1. **Type detection.** If `options.kind` is supplied, use it. Otherwise
 *    read `getComputedStyle(documentElement).getPropertyValue(cssVar)` and
 *    classify the resolved value via regex to determine which sentinel values
 *    and property lists to use.
 *
 * 2. **Definer discovery (v2).** Walk all `document.styleSheets` looking for
 *    every `CSSStyleRule` that directly declares `cssVar` in its declaration
 *    block. Each matched `selectorText` becomes a "definer selector".
 *    Cross-origin sheets that throw on `.cssRules` are skipped with a warning.
 *
 * 3. **Override apply.** The sentinel value is written (via `setProperty` with
 *    `important` priority) on `:root` and on every element matched by a
 *    definer selector. This ensures cascade overrides (e.g. `[data-theme]`
 *    blocks) are also covered. Panel-internal elements are skipped.
 *
 * 4. **Force layout.** `void document.documentElement.offsetHeight` flushes
 *    style recalculation so computed styles are current.
 *
 * 5. **DOM walk.** Every element in `document.body` (including `body` itself)
 *    and their `::before` / `::after` pseudo-elements are inspected:
 *    - *Equality mode*: checks whether any type-relevant longhand equals the
 *      sentinel, or whether any compound property substring-contains it.
 *    - *Differential mode*: probes twice (sentinel A then B); elements whose
 *      computed properties differ between A and B are consumers. Catches
 *      calc/min/max/clamp transforms that equality mode misses.
 *
 * 6. **Restore.** Inline overrides are removed in LIFO order, fully
 *    synchronously — no `await`, `setTimeout`, or `requestAnimationFrame`
 *    between apply and restore.
 *
 * ## Known limitations
 *
 * - **Cross-origin stylesheets**: sheets from a different origin throw on
 *   `.cssRules` and are skipped (a warning is emitted). Tokens defined only in
 *   cross-origin sheets will not have their definer selectors discovered; the
 *   `:root` override is still applied, so root-level consumers are still found.
 * - **adoptedStyleSheets**: not iterated; tokens defined only via the
 *   `adoptedStyleSheets` API will not be discovered.
 * - **Shadow DOM**: elements inside shadow roots are not walked; tokens
 *   consumed inside shadow trees are not found.
 * - **Pseudo-elements**: only `::before` and `::after` are checked. Other
 *   pseudo-elements (e.g. `::placeholder`, `::selection`, `::marker`) are not
 *   inspected.
 * - **Browser min-font-size preference**: if `font-size` is overridden by the
 *   browser's minimum-font-size setting, the length sentinel (7.137951px) may
 *   be floored and equality mode will fail to detect `font-size` consumers.
 *   Differential mode is more robust in this case.
 */

export interface FindElementsResult {
  elements: Element[];
  warnings: string[];
}

export interface FindElementsOptions {
  /** Explicit token type. Skips auto-detection when supplied. */
  kind?: 'color' | 'length' | 'number' | 'text' | 'easing' | 'time' | 'cursor' | 'content' | 'mask-image';
  /**
   * Probe mode.
   *   equality (default): single sentinel; fast; misses calc/min/max/clamp.
   *   differential: two sentinels; catches transforms; ~4–6× slower.
   */
  mode?: 'equality' | 'differential';
}

// ---------------------------------------------------------------------------
// Token-type registry  (lifted verbatim from probe.js; font shorthand dropped
// from text compounds per production spec)
//
// Per-property-family sentinels: the CSS Variables spec causes invalid var()
// substitutions to be treated as `unset` at the consuming property, so a
// string sentinel never appears in computed style for typed properties like
// `transition-timing-function`. Each kind picks a sentinel format the
// consuming properties will accept verbatim:
//   - color      → rgb()
//   - length     → px
//   - number     → bare float in (0, 1)
//   - text       → custom-ident (font-family / animation-name / transition-property / will-change)
//   - easing     → cubic-bezier() (transition-timing-function / animation-timing-function)
//   - time       → <time> value in seconds (transition-duration / animation-duration / delays)
//   - cursor     → bare keyword ('crosshair' / 'move'); Chrome computed style drops
//                  url() from cursor values (the url() fails to load silently and
//                  Chrome falls back to auto, not even the specified fallback keyword).
//                  Keyword sentinels are the only shape that round-trips correctly.
//                  Caveat: elements with literal cursor:crosshair/move will be
//                  false-positives.
//   - content    → quoted string with high-entropy needle; quoted-string values
//                  round-trip through Chrome computed style correctly.
//   - mask-image → url() with data-URI needle; Chrome preserves the url() value
//                  in computed style for mask-image (unlike cursor).
// ---------------------------------------------------------------------------

interface TokenTypeConfig {
  sentinelA: string;
  sentinelB: string;
  longhands: string[];
  compounds: string[];
  /**
   * Substring to search for in compound-property includes() check.
   * When omitted, defaults to sentinelA / sentinelB respectively.
   * Use this when Chrome may normalise the sentinel value (e.g. quote
   * characters in url() or content strings) so that the serialised computed
   * value differs from the literal sentinel string while still containing
   * the high-entropy needle substring.
   */
  needleA?: string;
  needleB?: string;
}

const TOKEN_TYPES: Record<string, TokenTypeConfig> = {
  color: {
    sentinelA: 'rgb(123, 234, 17)',
    sentinelB: 'rgb(231, 17, 234)',
    longhands: [
      'color',
      'background-color',
      'border-top-color',
      'border-right-color',
      'border-bottom-color',
      'border-left-color',
      'outline-color',
      'caret-color',
      'text-decoration-color',
      'accent-color',
      'fill',
      'stroke',
      'column-rule-color',
    ],
    compounds: [
      'box-shadow',
      'text-shadow',
      'background-image',
      'border-image-source',
    ],
  },
  length: {
    // Small + weird so it survives min()/clamp() ceilings (typical 20–60px)
    // and stays inside Chrome's internal font-size limits. Differential pair
    // spans a wide range so min/max/clamp produce different results between A and B.
    // Precision note: Chrome truncates computed px values to 5 decimal places,
    // so sentinels use ≤5 decimal places to round-trip correctly in equality mode.
    sentinelA: '7.13795px',
    sentinelB: '83.26541px',
    longhands: [
      'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
      'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
      'top', 'right', 'bottom', 'left',
      'width', 'height',
      'min-width', 'max-width', 'min-height', 'max-height',
      'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
      'border-top-left-radius', 'border-top-right-radius',
      'border-bottom-left-radius', 'border-bottom-right-radius',
      'outline-width', 'outline-offset',
      'row-gap', 'column-gap',
      'font-size',
      'line-height',
      'letter-spacing', 'word-spacing', 'text-indent',
      'column-width', 'column-rule-width',
      'text-decoration-thickness', 'text-underline-offset',
    ],
    compounds: [
      'box-shadow', 'text-shadow',
      'background-position', 'background-size',
      'transform', 'transform-origin',
      'perspective-origin', 'mask-position',
      'translate',
    ],
  },
  number: {
    // Sentinels are kept in (0, 1) so they round-trip through opacity without
    // clamping. Chrome returns exact values for opacity/flex-grow in this range.
    // Note: line-height always returns a computed px value in Chrome (used value),
    // so equality mode cannot detect line-height consumers — use differential mode.
    sentinelA: '0.12346',
    sentinelB: '0.98765',
    longhands: [
      'line-height',     // unitless — equality mode won't hit in Chrome (px used value); differential does
      'opacity',
      'z-index',
      'font-weight',
      'flex-grow', 'flex-shrink',
      'order',
      'column-count',
      'tab-size',
    ],
    compounds: [],
  },
  text: {
    sentinelA: '__zdtp_probe_text_AAA__',
    sentinelB: '__zdtp_probe_text_BBB__',
    // Properties that accept an arbitrary custom-ident (or list of idents).
    // The CSS parser preserves the sentinel string verbatim for these, so
    // equality mode finds single-value consumers by exact match.
    longhands: ['font-family', 'animation-name', 'transition-property', 'will-change'],
    // Same properties listed as compounds so the substring check catches
    // comma-separated multi-value consumers like
    // `transition-property: opacity, var(--prop)`, where Chrome serializes
    // the computed value as a list containing the sentinel.
    // font / transition / animation shorthands intentionally omitted: Chrome
    // returns empty string for getComputedStyle(...).font when longhands
    // disagree, and the longhands above already cover every consumer.
    compounds: ['font-family', 'animation-name', 'transition-property', 'will-change'],
  },
  easing: {
    // cubic-bezier() with high-entropy coordinates that round-trip exactly
    // through Chrome's computed-style serialization. Coordinates picked to
    // avoid collision with common timing functions used in real code.
    sentinelA: 'cubic-bezier(0.12347, 0.67891, 0.13573, 0.24679)',
    sentinelB: 'cubic-bezier(0.98763, 0.43217, 0.86419, 0.75319)',
    longhands: ['transition-timing-function', 'animation-timing-function'],
    // Same properties as compounds so the substring check catches
    // comma-separated multi-value lists like
    // `transition-timing-function: ease, var(--easing)`.
    // `transition` / `animation` shorthands decompose into their longhands
    // at computed-style time, so substring match on the shorthand is not
    // needed.
    compounds: ['transition-timing-function', 'animation-timing-function'],
  },
  time: {
    // Oddly-shaped sentinel <time> values in seconds. Deliberately outside the
    // typical 0.1s–1s range used in real-world transitions so they won't
    // collide with literal values in host stylesheets.
    // 5 decimal places matches Chrome's computed-value serialization precision.
    sentinelA: '7.13721s',
    sentinelB: '83.26519s',
    longhands: [
      'transition-duration',
      'transition-delay',
      'animation-duration',
      'animation-delay',
    ],
    // Same properties as compounds so the substring check catches
    // comma-separated multi-value lists like
    // `transition-duration: 0.15s, var(--dur)`, where Chrome serializes the
    // computed value as a list containing the sentinel.
    compounds: [
      'transition-duration',
      'transition-delay',
      'animation-duration',
      'animation-delay',
    ],
  },
  cursor: {
    // Chrome computed-style drops url() from cursor values: a cursor with
    // url(...) fallback-keyword is normalised to just the fallback keyword when
    // the url resource loads, or to 'auto' when it fails. Bare cursor-keyword
    // sentinels are the only shape that round-trips correctly through
    // getComputedStyle (verified in step-0 spike, see find-elements.browser.test.ts).
    // Caveat: any element with literal cursor:crosshair or cursor:move (no var())
    // will be a false-positive; this is an acceptable trade-off per #285.
    sentinelA: 'crosshair',
    sentinelB: 'move',
    longhands: ['cursor'],
    compounds: ['cursor'],
  },
  content: {
    // Quoted-string values round-trip through Chrome's getComputedStyle verbatim.
    // The double-quoted sentinel is written to the CSS var and Chrome preserves
    // the quotes in the serialised computed content value. needleA/needleB are
    // the substrings to search for because Chrome may normalise quote style
    // (single→double) around the outer wrapper.
    sentinelA: '"__zdtp_probe_content_AAA__"',
    sentinelB: '"__zdtp_probe_content_BBB__"',
    needleA: '__zdtp_probe_content_AAA__',
    needleB: '__zdtp_probe_content_BBB__',
    // content is only valid on pseudo-elements (::before / ::after). It also
    // applies to elements with display:none, but the panel focuses on visible
    // elements. Listed in both longhands and compounds so the substring check
    // catches any serialization variation.
    longhands: ['content'],
    compounds: ['content'],
  },
  'mask-image': {
    // Chrome preserves url() values in computed mask-image (unlike cursor).
    // needleA/needleB are the substrings to search for because Chrome may
    // normalise quote characters around the url() parameter (single→double).
    sentinelA: "url(\"data:image/svg+xml,__zdtp_probe_mask_AAA__\")",
    sentinelB: "url(\"data:image/svg+xml,__zdtp_probe_mask_BBB__\")",
    needleA: '__zdtp_probe_mask_AAA__',
    needleB: '__zdtp_probe_mask_BBB__',
    longhands: ['mask-image'],
    compounds: ['mask-image'],
  },
};

const PSEUDOS: Array<string | null> = [null, '::before', '::after'];

// ---------------------------------------------------------------------------
// Panel exclusion selector (constant value kept from legacy implementation)
// ---------------------------------------------------------------------------

const PANEL_EXCLUSION_SELECTOR =
  '.tokenpanel-shell, [data-design-token-panel-modal], #tokenpanel-highlight-mount';

// ---------------------------------------------------------------------------
// Type detection
// ---------------------------------------------------------------------------

/**
 * CSS named color keywords to recognise during auto-detection.
 * Not exhaustive — covers common and standard CSS Level 4 named colors.
 */
const NAMED_COLOR_RE =
  /^(transparent|currentcolor|currentColor|inherit|initial|unset|red|blue|green|black|white|gray|grey|silver|yellow|orange|purple|pink|brown|cyan|magenta|lime|olive|navy|maroon|teal|aqua|fuchsia|coral|salmon|gold|khaki|violet|indigo|crimson|lavender|beige|ivory|chocolate|tomato|orchid|plum|turquoise|tan|sienna|peru|papayawhip|peachpuff|moccasin|mistyrose|linen|lemonchiffon|honeydew|gainsboro)$/i;

/** Functional color notations. */
const FUNCTIONAL_COLOR_RE = /^(rgb|rgba|hsl|hsla|color|oklch|hwb|lab|lch)\(/i;

/** Hex color. */
const HEX_COLOR_RE = /^#/;

/** CSS length — numeric followed by a length unit. */
const LENGTH_RE = /^-?\d+(\.\d+)?(px|rem|em|vh|vw|vmin|vmax|pt|pc|in|cm|mm|ex|ch|fr)%?$/;

/** Bare unitless number (including floating point). */
const BARE_NUMBER_RE = /^-?\d+(\.\d+)?$/;

/**
 * CSS <easing-function> values in their UNAMBIGUOUS functional forms
 * (`cubic-bezier(...)`, `steps(...)`, `linear(...)`). Bare easing keywords
 * like `ease`, `ease-in`, `linear`, `step-start` are deliberately NOT matched
 * here: they collide with `<custom-ident>`, so a token like
 * `--anim-name: linear` consumed via `animation-name` must auto-detect as
 * `text`. If a token value really is a bare easing keyword consumed via
 * `transition-timing-function`, the caller (or a future tier-kind extension)
 * must pass `kind: 'easing'` explicitly.
 */
const EASING_RE = /^(cubic-bezier|steps|linear)\(/i;

/**
 * CSS <time> values: a numeric value (integer or decimal) followed by `s` or
 * `ms` (case-insensitive). Handles `1s`, `1.5s`, `.5s`, `150ms`, `0.3S`.
 */
const TIME_RE = /^-?(?:\d+\.?\d*|\.\d+)(ms|s)$/i;

/**
 * CSS quoted string — the `content` property accepts quoted strings, and the
 * resolved value is serialized with surrounding double-quotes.
 */
const QUOTED_STRING_RE = /^".*"$/;

/**
 * CSS url() function — used by mask-image, cursor, background-image, etc.
 * Cannot distinguish cursor vs mask-image from value shape alone; auto-detect
 * falls through to 'text' with a warning. Use an explicit kind hint to probe
 * url()-consuming properties correctly (mask-image needs kind:'mask-image';
 * cursor needs kind:'cursor').
 */
const URL_RE = /^url\(/i;

/**
 * detectKind — infers the token kind from the resolved value on documentElement.
 *
 * Branch order (first match wins):
 *   1. empty value → warning, default to 'color'
 *   2. functional / hex / named color → 'color'
 *   3. CSS length → 'length'
 *   4. bare number → 'number'
 *   5. unambiguous easing function → 'easing'
 *   6. <time> value → 'time'
 *   7. quoted string → 'content'
 *   8. url() → warning + fall through to 'text'
 *      (url() values are used by cursor AND mask-image; the shape alone is
 *      ambiguous. Supply kind:'cursor' or kind:'mask-image' explicitly when
 *      the manifest knows the consuming property.)
 *   9. anything else → 'text'
 */
function detectKind(
  cssVar: string,
  warnings: string[],
): 'color' | 'length' | 'number' | 'text' | 'easing' | 'time' | 'content' {
  const resolved = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVar)
    .trim();

  if (!resolved) {
    warnings.push(
      `type auto-detection inconclusive for ${cssVar}; defaulting to color — supply kind explicitly if this is incorrect`,
    );
    return 'color';
  }

  if (FUNCTIONAL_COLOR_RE.test(resolved) || HEX_COLOR_RE.test(resolved) || NAMED_COLOR_RE.test(resolved)) {
    return 'color';
  }
  if (LENGTH_RE.test(resolved)) {
    return 'length';
  }
  if (BARE_NUMBER_RE.test(resolved)) {
    return 'number';
  }
  if (EASING_RE.test(resolved)) {
    return 'easing';
  }
  if (TIME_RE.test(resolved)) {
    return 'time';
  }
  if (QUOTED_STRING_RE.test(resolved)) {
    return 'content';
  }
  if (URL_RE.test(resolved)) {
    // url() resolved values can be cursor, mask-image, background-image, etc.
    // The value shape alone is ambiguous — fall through to 'text' and warn.
    // Supply kind:'cursor' or kind:'mask-image' explicitly for url()-typed tokens.
    warnings.push(
      `type auto-detection inconclusive for ${cssVar}: resolved value starts with url(); ` +
        `defaulting to text — supply kind:'cursor' or kind:'mask-image' explicitly if this is a cursor or mask-image token`,
    );
    return 'text';
  }
  return 'text';
}

// ---------------------------------------------------------------------------
// Definer discovery (v2)
// ---------------------------------------------------------------------------

function walkCssRules(
  rules: CSSRuleList | Iterable<CSSRule>,
  cssVar: string,
  out: Set<string>,
): void {
  for (const rule of rules) {
    if (rule instanceof CSSStyleRule) {
      // Check this rule's own declaration block for cssVar.
      const s = rule.style;
      for (let i = 0; i < s.length; i++) {
        if (s[i] === cssVar) {
          out.add(rule.selectorText);
          break;
        }
      }
      // Also recurse into nested rules (CSS nesting, Chrome 125+).
      // CSSStyleRule.cssRules is always present in modern Chrome but may be empty.
      if ((rule as unknown as { cssRules?: CSSRuleList }).cssRules?.length) {
        walkCssRules(
          (rule as unknown as { cssRules: CSSRuleList }).cssRules,
          cssVar,
          out,
        );
      }
    } else if ('cssRules' in rule && rule.cssRules) {
      // Recurse into grouping rules: @media, @supports, @layer, @container.
      walkCssRules(rule.cssRules as CSSRuleList, cssVar, out);
    }
  }
}

function collectDefinerSelectors(cssVar: string, warnings: string[]): Set<string> {
  const out = new Set<string>();
  for (const sheet of document.styleSheets) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      const href = (sheet as CSSStyleSheet).href ?? '(unknown)';
      warnings.push(`Cross-origin stylesheet skipped: ${href}`);
      continue;
    }
    walkCssRules(rules, cssVar, out);
  }
  return out;
}

/**
 * Find elements that define the token via an inline `style` attribute
 * (e.g. `<section style="--brand: red">`). Stylesheet rules alone don't reach
 * these definers, so descendants resolve the original value during the probe
 * and consumers under the inline subtree are missed without this pass.
 */
function collectInlineDefinerElements(cssVar: string): Set<Element> {
  const out = new Set<Element>();
  const candidates = document.querySelectorAll<HTMLElement>('[style]');
  for (const el of candidates) {
    if (el.style.getPropertyValue(cssVar) !== '') {
      out.add(el);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Override apply / restore
// ---------------------------------------------------------------------------

interface OverrideEntry {
  el: Element;
  original: string;
  originalPriority: string;
}

function applyOverride(
  cssVar: string,
  sentinel: string,
  definerSelectors: Set<string>,
  inlineDefinerElements: Set<Element>,
  warnings: string[],
): OverrideEntry[] {
  const overridden: OverrideEntry[] = [];
  const root = document.documentElement;
  const seen = new WeakSet<Element>();

  // Always apply to :root
  overridden.push({
    el: root,
    original: root.style.getPropertyValue(cssVar),
    originalPriority: root.style.getPropertyPriority(cssVar),
  });
  root.style.setProperty(cssVar, sentinel, 'important');
  seen.add(root);

  const applyToElement = (el: Element): void => {
    if (seen.has(el)) return;
    // Skip panel-internal elements during apply (defense-in-depth)
    try {
      if (el.closest(PANEL_EXCLUSION_SELECTOR) !== null) return;
    } catch {
      // Ignore if closest() fails
    }
    overridden.push({
      el,
      original: (el as HTMLElement).style.getPropertyValue(cssVar),
      originalPriority: (el as HTMLElement).style.getPropertyPriority(cssVar),
    });
    (el as HTMLElement).style.setProperty(cssVar, sentinel, 'important');
    seen.add(el);
  };

  for (const selector of definerSelectors) {
    let matches: NodeListOf<Element>;
    try {
      matches = document.querySelectorAll(selector);
    } catch {
      // Valid CSS but throws in querySelectorAll (e.g. :has(), complex pseudo)
      warnings.push(`definer selector unparseable: ${selector}`);
      continue;
    }
    for (const el of matches) applyToElement(el);
  }

  for (const el of inlineDefinerElements) applyToElement(el);

  return overridden;
}

function restoreOverride(cssVar: string, overridden: OverrideEntry[]): void {
  for (let i = overridden.length - 1; i >= 0; i--) {
    const { el, original, originalPriority } = overridden[i];
    if (original) {
      (el as HTMLElement).style.setProperty(cssVar, original, originalPriority);
    } else {
      (el as HTMLElement).style.removeProperty(cssVar);
    }
  }
}

// ---------------------------------------------------------------------------
// Computed style snapshot helpers
// ---------------------------------------------------------------------------

function snapshotComputed(
  el: Element,
  pseudo: string | null,
  propsToCheck: string[],
): Record<string, string> | null {
  let cs: CSSStyleDeclaration;
  try {
    cs = getComputedStyle(el, pseudo);
  } catch {
    return null;
  }
  const snap: Record<string, string> = {};
  for (const name of propsToCheck) {
    snap[name] = cs.getPropertyValue(name);
  }
  return snap;
}

function findFirstChange(
  snapA: Record<string, string> | null,
  snapB: Record<string, string> | null,
): string | null {
  if (!snapA || !snapB) return null;
  for (const name in snapA) {
    if (snapA[name] !== snapB[name]) return name;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Find all DOM elements whose computed style reflects the given CSS custom
 * property.
 *
 * Uses a **sentinel-substitution probe**:
 * 1. Override `cssVar` with a high-entropy sentinel value on `:root` and every
 *    stylesheet definer (v2 algorithm).
 * 2. Force a style recalculation.
 * 3. Walk the DOM checking which elements absorbed the sentinel.
 * 4. Restore all overrides synchronously.
 *
 * @param cssVar  The full custom-property name including leading dashes,
 *   e.g. `"--brand"`. Accepts `"var(--brand)"` defensively.
 * @param options  Optional configuration:
 *   - `kind`: explicit token type (`'color' | 'length' | 'number' | 'text' | 'easing' | 'time' | 'cursor' | 'content' | 'mask-image'`).
 *     `text` covers any property accepting an arbitrary custom-ident
 *     (font-family, animation-name, transition-property, will-change).
 *     `easing` covers timing-function properties (transition-timing-function,
 *     animation-timing-function). `time` covers duration and delay properties
 *     (transition-duration, transition-delay, animation-duration, animation-delay).
 *     `cursor` covers the cursor property using keyword sentinels (Chrome drops
 *     url() from cursor computed style). `content` covers the content property
 *     using quoted-string sentinels. `mask-image` covers the mask-image property
 *     using url() sentinels.
 *     When omitted the type is auto-detected from the resolved value on
 *     `documentElement`. `url()` resolved values auto-detect as `text` with
 *     a warning — supply kind:'cursor' or kind:'mask-image' explicitly for
 *     url()-typed tokens. If the token has no value on `:root` (empty resolved
 *     value) a warning is emitted and `color` is assumed.
 *   - `mode`: `'equality'` (default, fast) checks whether computed longhands
 *     equal the sentinel; `'differential'` probes twice (sentinels A and B)
 *     and marks consumers where any property differs — catches `calc()`,
 *     `min()`, `max()`, `clamp()` transforms that equality mode misses.
 *
 * ## Known limitations
 *
 * - Cross-origin stylesheets are skipped (a warning is emitted).
 * - `adoptedStyleSheets` are not iterated.
 * - Shadow DOM elements are not walked.
 * - Only `::before` and `::after` pseudo-elements are checked.
 * - Browser min-font-size preference may floor the length sentinel (7.137951px),
 *   causing equality mode to miss `font-size` consumers.
 */
export function findElementsUsingToken(
  cssVar: string,
  options?: FindElementsOptions,
): FindElementsResult {
  // Defensive normalization: strip whitespace and var() wrapper if present.
  let normalized = cssVar.trim();
  if (normalized.startsWith('var(')) {
    normalized = normalized.replace(/^var\(\s*/, '').replace(/\s*\)$/, '').trim();
  }

  const warnings: string[] = [];
  const mode = options?.mode ?? 'equality';

  // Phase 1: determine token type
  const kind: 'color' | 'length' | 'number' | 'text' | 'easing' | 'time' | 'cursor' | 'content' | 'mask-image' =
    options?.kind ?? detectKind(normalized, warnings);

  const conf = TOKEN_TYPES[kind] ?? TOKEN_TYPES.color;

  // Phase 2: definer discovery (stylesheets + inline style="--token: ..." attrs)
  const definerSelectors = collectDefinerSelectors(normalized, warnings);
  const inlineDefinerElements = collectInlineDefinerElements(normalized);

  // Phase 3: probe
  const candidates: Element[] = [document.body, ...document.body.querySelectorAll('*')];
  const hitElements = new Set<Element>();

  if (mode === 'equality') {
    const { sentinelA, longhands, compounds } = conf;
    // needleA defaults to sentinelA when not specified (color / length / number /
    // text / easing). For kinds where Chrome normalises the serialised value
    // (content / mask-image), needleA is the high-entropy substring that
    // survives normalisation even when the sentinel's quote style changes.
    const needleA = conf.needleA ?? sentinelA;

    const overridden = applyOverride(
      normalized,
      sentinelA,
      definerSelectors,
      inlineDefinerElements,
      warnings,
    );
    void document.documentElement.offsetHeight;

    for (const el of candidates) {
      for (const pseudo of PSEUDOS) {
        let cs: CSSStyleDeclaration;
        try {
          cs = getComputedStyle(el, pseudo);
        } catch {
          continue;
        }
        let hit = false;
        for (const prop of longhands) {
          if (cs.getPropertyValue(prop) === sentinelA) {
            hit = true;
            break;
          }
        }
        if (!hit) {
          for (const prop of compounds) {
            const v = cs.getPropertyValue(prop);
            if (v && v.includes(needleA)) {
              hit = true;
              break;
            }
          }
        }
        if (hit) {
          hitElements.add(el);
          break; // no need to check more pseudos once element is a hit
        }
      }
    }

    restoreOverride(normalized, overridden);
  } else {
    // Differential mode
    const { sentinelA, sentinelB, longhands, compounds } = conf;
    const propsToCheck = [...longhands, ...compounds];

    // Phase A: apply sentinelA, snapshot
    const overA = applyOverride(
      normalized,
      sentinelA,
      definerSelectors,
      inlineDefinerElements,
      warnings,
    );
    void document.documentElement.offsetHeight;

    const snapsA = new Map<Element, Array<Record<string, string> | null>>();
    for (const el of candidates) {
      snapsA.set(el, PSEUDOS.map((p) => snapshotComputed(el, p, propsToCheck)));
    }
    restoreOverride(normalized, overA);

    // Phase B: apply sentinelB, compare
    const overB = applyOverride(
      normalized,
      sentinelB,
      definerSelectors,
      inlineDefinerElements,
      warnings,
    );
    void document.documentElement.offsetHeight;

    for (const el of candidates) {
      const snapsAEntry = snapsA.get(el)!;
      for (let pi = 0; pi < PSEUDOS.length; pi++) {
        const snapB = snapshotComputed(el, PSEUDOS[pi], propsToCheck);
        if (findFirstChange(snapsAEntry[pi], snapB) !== null) {
          hitElements.add(el);
          break;
        }
      }
    }
    restoreOverride(normalized, overB);
  }

  // Phase 4: panel-exclusion filter (defense-in-depth)
  const filtered: Element[] = [];
  for (const el of hitElements) {
    try {
      if (el.closest(PANEL_EXCLUSION_SELECTOR) !== null) continue;
    } catch {
      // Ignore if closest() fails (exotic elements)
    }
    filtered.push(el);
  }

  return { elements: filtered, warnings };
}
