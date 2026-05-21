/**
 * findElementsUsingToken — walks document.styleSheets and the DOM to find
 * every element that uses a given CSS custom property (including via
 * custom-property alias chains).
 *
 * Panel-internal elements (inside .tokenpanel-shell,
 * [data-design-token-panel-modal], or #tokenpanel-highlight-mount) are
 * excluded from the returned set.
 */

export interface FindElementsResult {
  elements: Element[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Escape a CSS custom-property name so it can be embedded literally in a
 * RegExp. Custom-property names only legitimately contain [A-Za-z0-9_-] in
 * practice, but we escape everything else defensively.
 */
function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a regex that matches `var(--TOKEN_NAME` at the correct right boundary,
 * so --brand does not match --brand-fg.
 * Pattern: /var\(\s*--TOKEN(?![\w-])/
 */
function buildVarRegex(cssVarName: string): RegExp {
  // cssVarName already includes leading dashes, e.g. "--brand"
  return new RegExp(`var\\(\\s*${escapeForRegex(cssVarName)}(?![\\w-])`);
}

/**
 * Paren-aware comma splitter. Only splits on commas at depth 0 so that
 * selectors like `.a:is(.b, .c)` are not broken at the inner comma.
 */
function splitSelectorList(selectorText: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < selectorText.length; i++) {
    const ch = selectorText[i];
    if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
    } else if (ch === ',' && depth === 0) {
      parts.push(selectorText.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(selectorText.slice(start).trim());
  return parts.filter(Boolean);
}

/** Strip trailing pseudo-element (e.g. ::before, ::after). */
const PSEUDO_ELEMENT_RE = /::[\w-]+(\([^)]*\))?$/;

/** Trailing state pseudo-class patterns that are safe to strip. */
const STATE_PSEUDO_RE =
  /:(?:hover|focus|focus-visible|focus-within|active|visited|link|target)(\([^)]*\))?$/;

/**
 * Clean a single selector fragment so it can be used in querySelectorAll to
 * match real elements rather than ephemeral states:
 *   - remove trailing pseudo-element
 *   - remove trailing state pseudo-classes (looping until none remain)
 *   - leave functional pseudo-classes like :not(), :is(), :where(), :has() intact
 */
function cleanSelectorFragment(fragment: string): string {
  let s = fragment;
  // Strip trailing pseudo-element first
  s = s.replace(PSEUDO_ELEMENT_RE, '').trimEnd();
  // Strip trailing state pseudo-classes in a loop
  let prev: string;
  do {
    prev = s;
    s = s.replace(STATE_PSEUDO_RE, '').trimEnd();
  } while (s !== prev);
  return s;
}

// ---------------------------------------------------------------------------
// Alias map builder
// ---------------------------------------------------------------------------

/**
 * Selectors that define token aliases for the whole document.
 * Only :root, html, or [data-theme="..."] (any value) qualify.
 */
function isThemeSelector(sel: string): boolean {
  const s = sel.trim();
  if (s === ':root' || s === 'html') return true;
  // matches [data-theme="..."] or [data-theme='...'] or [data-theme=anything]
  if (/^\[data-theme\s*=/.test(s)) return true;
  return false;
}

/**
 * Walk every CSSStyleRule in the sheet's flat rule list and collect alias
 * declarations of the form:
 *   --TARGET: var(--SOURCE [, fallback])
 * on :root / html / [data-theme="..."] selectors.
 *
 * Returns Map<sourceVar, Set<targetVar>> where both include leading "--".
 *
 * Note: we pass `rules` (already extracted with a try/catch by the caller)
 * rather than the CSSStyleSheet itself to keep recursion clean.
 */
function collectAliases(
  rules: CSSRuleList | Iterable<CSSRule>,
  out: Map<string, Set<string>>,
): void {
  for (const rule of rules) {
    // Recurse into grouping rules (@media, @supports, @layer block, @container)
    // using duck-typing: CSSLayerStatementRule (@layer foo, bar;) has no
    // .cssRules so the duck-typed check filters it automatically.
    if ('cssRules' in rule && rule.cssRules) {
      collectAliases(rule.cssRules as CSSRuleList, out);
      continue;
    }

    if (!(rule instanceof CSSStyleRule)) continue;

    // Split on top-level commas; check each fragment for a theme selector.
    const fragments = splitSelectorList(rule.selectorText);
    const isTheme = fragments.some(isThemeSelector);
    if (!isTheme) continue;

    const { style } = rule;
    for (let i = 0; i < style.length; i++) {
      const prop = style[i];
      if (!prop.startsWith('--')) continue; // only custom properties
      const val = style.getPropertyValue(prop).trim();
      // Match: var(--SOURCE_VAR ...)
      const m = /^var\(\s*(--[\w-]+)/.exec(val);
      if (!m) continue;
      const source = m[1];
      const target = prop;
      if (!out.has(source)) out.set(source, new Set());
      out.get(source)!.add(target);
    }
  }
}

// ---------------------------------------------------------------------------
// BFS forward expansion
// ---------------------------------------------------------------------------

const MAX_ALIAS_DEPTH = 5;

/**
 * Starting from rootVar (e.g. "--brand"), compute all custom properties that
 * are reachable via the alias chain within MAX_ALIAS_DEPTH hops. The root
 * itself is always included.
 */
function expandForward(rootVar: string, aliasMap: Map<string, Set<string>>): Set<string> {
  const reachable = new Set<string>([rootVar]);
  const queue: Array<{ var: string; depth: number }> = [{ var: rootVar, depth: 0 }];

  while (queue.length > 0) {
    const { var: current, depth } = queue.shift()!;
    if (depth >= MAX_ALIAS_DEPTH) continue;
    const targets = aliasMap.get(current);
    if (!targets) continue;
    for (const t of targets) {
      if (!reachable.has(t)) {
        reachable.add(t);
        queue.push({ var: t, depth: depth + 1 });
      }
    }
  }

  return reachable;
}

// ---------------------------------------------------------------------------
// Rule walker
// ---------------------------------------------------------------------------

/**
 * Walk rules in a stylesheet, collecting DOM elements that reference any
 * token in forwardSet. Modifies `elements` (Set) and `warnings` (Array)
 * in-place.
 */
function walkRules(
  rules: CSSRuleList | Iterable<CSSRule>,
  forwardSet: Set<string>,
  regexCache: Map<string, RegExp>,
  elements: Set<Element>,
  warnings: string[],
): void {
  for (const rule of rules) {
    // Recurse into grouping rules — duck-type on cssRules to avoid depending
    // on CSSGroupingRule being exposed in every test environment.
    if ('cssRules' in rule && rule.cssRules) {
      walkRules(rule.cssRules as CSSRuleList, forwardSet, regexCache, elements, warnings);
      continue;
    }

    if (!(rule instanceof CSSStyleRule)) continue;

    const { style, selectorText } = rule;
    let ruleMatchesToken = false;

    // Enumerate properties (not re-parse cssText) for accurate value access.
    for (let i = 0; i < style.length; i++) {
      const prop = style[i];
      const val = style.getPropertyValue(prop);
      for (const cssVar of forwardSet) {
        let re = regexCache.get(cssVar);
        if (!re) {
          re = buildVarRegex(cssVar);
          regexCache.set(cssVar, re);
        }
        if (re.test(val)) {
          ruleMatchesToken = true;
          break;
        }
      }
      if (ruleMatchesToken) break;
    }

    if (!ruleMatchesToken) continue;

    // Collect matching DOM elements via cleaned selector fragments.
    const fragments = splitSelectorList(selectorText);
    for (const fragment of fragments) {
      const cleaned = cleanSelectorFragment(fragment);
      if (!cleaned) continue;
      try {
        const found = document.querySelectorAll(cleaned);
        for (const el of found) {
          elements.add(el);
        }
      } catch {
        // Invalid selector after cleaning — skip silently.
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Panel-internal selectors whose elements must be excluded from results. */
const PANEL_EXCLUSION_SELECTOR =
  '.tokenpanel-shell, [data-design-token-panel-modal], #tokenpanel-highlight-mount';

/**
 * Find all DOM elements that use the given CSS custom property, either
 * directly in a stylesheet rule or via a custom-property alias chain (depth ≤ 5),
 * or via an inline `style` attribute.
 *
 * @param cssVar - The full custom-property name including leading dashes,
 *   e.g. "--brand". Accepts "var(--brand)" defensively (wrapper is stripped).
 */
export function findElementsUsingToken(cssVar: string): FindElementsResult {
  // Defensive normalization: strip whitespace and the var() wrapper if present.
  let normalized = cssVar.trim();
  if (normalized.startsWith('var(')) {
    // strip "var(" prefix and trailing ")"
    normalized = normalized.replace(/^var\(\s*/, '').replace(/\s*\)$/, '').trim();
  }

  const warnings: string[] = [];
  const aliasMap: Map<string, Set<string>> = new Map();

  // Phase 1: build alias map from all accessible stylesheets.
  for (const sheet of document.styleSheets) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      // Cross-origin — record warning and skip.
      const href = (sheet as CSSStyleSheet).href ?? '(unknown)';
      warnings.push(`Cross-origin stylesheet skipped: ${href}`);
      continue;
    }
    collectAliases(rules, aliasMap);
  }

  // Phase 2: BFS expansion to get all aliases of the target token.
  const forwardSet = expandForward(normalized, aliasMap);

  // Phase 3: walk rules to find matching elements.
  const regexCache = new Map<string, RegExp>();
  const elements = new Set<Element>();

  for (const sheet of document.styleSheets) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      // Already logged in phase 1; skip silently here.
      continue;
    }
    walkRules(rules, forwardSet, regexCache, elements, warnings);
  }

  // Phase 4: inline-style hybrid pass — catch elements whose style attribute
  // contains var(--TOKEN_NAME) without any stylesheet rule.
  for (const cssVar of forwardSet) {
    // Fast pre-filter via attribute substring, then post-filter with the
    // right-boundary regex to avoid false positives (e.g. --brand matching
    // --brand-fg).
    const re = buildVarRegex(cssVar);
    // Encode for the attribute substring selector (avoid quoting issues).
    const attrSel = `[style*="var(${cssVar})"]`;
    let candidates: NodeListOf<Element>;
    try {
      candidates = document.querySelectorAll(attrSel);
    } catch {
      continue;
    }
    for (const el of candidates) {
      const styleVal = el.getAttribute('style') ?? '';
      if (re.test(styleVal)) {
        elements.add(el);
      }
    }
  }

  // Phase 5: panel-exclusion filter.
  const filtered: Element[] = [];
  for (const el of elements) {
    const panelAncestor = el.closest(PANEL_EXCLUSION_SELECTOR);
    if (panelAncestor !== null) continue;
    filtered.push(el);
  }

  return { elements: filtered, warnings };
}
