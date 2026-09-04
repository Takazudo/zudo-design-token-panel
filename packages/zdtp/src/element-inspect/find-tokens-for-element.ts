import {
  probeElementForToken,
  type ProbeTokenKind,
} from '../highlight/find-elements';
import { walkCssRules } from '../highlight/walk-css-rules';
import type {
  TokenAddress,
  TokenIndex,
  TokenIndexEntry,
} from '../utils/token-index';

const CSS_VAR_RE = /var\(\s*(--[-_a-zA-Z0-9]+)/g;

export interface ElementTokenMatch {
  property: string;
  cssVar: string;
  expression: string;
  selector: string;
  addresses: readonly TokenAddress[];
  kind: TokenIndexEntry['kind'];
  changedProperties: readonly string[];
  confirmed: boolean;
  inheritedFrom?: Element;
}

export interface ElementTokenPropertyGroup {
  property: string;
  matches: readonly ElementTokenMatch[];
}

export interface FindTokensForElementResult {
  own: readonly ElementTokenPropertyGroup[];
  inherited: readonly ElementTokenPropertyGroup[];
  warnings: readonly string[];
}

interface Declaration {
  property: string;
  expression: string;
}

interface MatchedDeclaration extends Declaration {
  selector: string;
}

function splitDeclarations(cssText: string): Declaration[] {
  const chunks: string[] = [];
  let start = 0;
  let depth = 0;
  let quote = '';
  let escaped = false;

  for (let i = 0; i < cssText.length; i++) {
    const char = cssText[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote) {
      if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '(') depth++;
    else if (char === ')') depth = Math.max(0, depth - 1);
    else if (char === ';' && depth === 0) {
      chunks.push(cssText.slice(start, i));
      start = i + 1;
    }
  }
  chunks.push(cssText.slice(start));

  return chunks.flatMap((chunk) => {
    const colon = chunk.indexOf(':');
    if (colon < 1) return [];
    const property = chunk.slice(0, colon).trim().toLowerCase();
    const expression = chunk.slice(colon + 1).trim();
    return property && expression ? [{ property, expression }] : [];
  });
}

function variablesIn(expression: string): string[] {
  CSS_VAR_RE.lastIndex = 0;
  return [...expression.matchAll(CSS_VAR_RE)].map((match) => match[1]);
}

function matchesElement(el: Element, selector: string): boolean {
  try {
    return el.matches(selector);
  } catch {
    return false;
  }
}

function collectStyleRules(warnings: string[]): CSSStyleRule[] {
  const rules: CSSStyleRule[] = [];
  for (const sheet of document.styleSheets) {
    let cssRules: CSSRuleList;
    try {
      cssRules = sheet.cssRules;
    } catch {
      warnings.push(`Cross-origin stylesheet skipped: ${sheet.href ?? '(unknown)'}`);
      continue;
    }
    walkCssRules(cssRules, (rule) => rules.push(rule));
  }
  return rules;
}

function declarationsForElement(
  el: Element,
  rules: readonly CSSStyleRule[],
): MatchedDeclaration[] {
  const declarations: MatchedDeclaration[] = [];
  for (const rule of rules) {
    if (!matchesElement(el, rule.selectorText)) continue;
    for (const declaration of splitDeclarations(rule.style.cssText)) {
      declarations.push({ ...declaration, selector: rule.selectorText });
    }
  }
  if (el instanceof HTMLElement || el instanceof SVGElement) {
    for (const declaration of splitDeclarations(el.style.cssText)) {
      declarations.push({ ...declaration, selector: '<inline style>' });
    }
  }
  return declarations;
}

function isInheritedProperty(property: string): boolean {
  return property === 'color' ||
    property === 'font' ||
    property.startsWith('font-') ||
    property === 'line-height' ||
    property === 'letter-spacing';
}

function inheritedClaims(property: string): string[] {
  if (property === 'font') {
    return [
      'font',
      'font-family',
      'font-size',
      'font-style',
      'font-stretch',
      'font-variant',
      'font-weight',
      'line-height',
    ];
  }
  return [property];
}

function propertyOwnsComputed(declared: string, computed: string): boolean {
  if (declared === computed || computed.startsWith(`${declared}-`)) return true;
  if (declared === 'font') return computed.startsWith('font-') || computed === 'line-height';
  if (declared === 'inset') return ['top', 'right', 'bottom', 'left'].includes(computed);
  if (declared === 'inset-block') return ['top', 'bottom'].includes(computed);
  if (declared === 'inset-inline') return ['left', 'right'].includes(computed);
  if (declared === 'padding-inline') return ['padding-left', 'padding-right'].includes(computed);
  if (declared === 'padding-block') return ['padding-top', 'padding-bottom'].includes(computed);
  if (declared === 'margin-inline') return ['margin-left', 'margin-right'].includes(computed);
  if (declared === 'margin-block') return ['margin-top', 'margin-bottom'].includes(computed);
  return false;
}

function toProbeKind(kind: TokenIndexEntry['kind']): ProbeTokenKind {
  return kind;
}

function makeMatches(
  target: Element,
  declarations: readonly MatchedDeclaration[],
  index: TokenIndex,
  inheritedFrom?: Element,
): ElementTokenMatch[] {
  const matches: ElementTokenMatch[] = [];
  const probeCache = new Map<string, readonly string[]>();
  const seen = new Set<string>();

  for (const declaration of declarations) {
    for (const cssVar of variablesIn(declaration.expression)) {
      const addresses = index.addressesForCssVar(cssVar);
      if (addresses.length === 0) continue;
      const entry = index.entry(addresses[0]);
      if (!entry) continue;
      const key = [declaration.property, cssVar, declaration.selector, declaration.expression].join('\u0000');
      if (seen.has(key)) continue;
      seen.add(key);

      const probeKey = `${cssVar}\u0000${entry.kind}`;
      let changedProperties = probeCache.get(probeKey);
      if (!changedProperties) {
        changedProperties = probeElementForToken(target, cssVar, toProbeKind(entry.kind));
        probeCache.set(probeKey, changedProperties);
      }
      const relevantChanges = changedProperties.filter((property) =>
        propertyOwnsComputed(declaration.property, property),
      );
      matches.push({
        property: declaration.property,
        cssVar,
        expression: declaration.expression,
        selector: declaration.selector,
        addresses,
        kind: entry.kind,
        changedProperties: relevantChanges,
        confirmed: relevantChanges.length > 0,
        ...(inheritedFrom ? { inheritedFrom } : {}),
      });
    }
  }
  return matches;
}

function groupByProperty(matches: readonly ElementTokenMatch[]): ElementTokenPropertyGroup[] {
  const groups = new Map<string, ElementTokenMatch[]>();
  for (const match of matches) {
    const group = groups.get(match.property) ?? [];
    group.push(match);
    groups.set(match.property, group);
  }
  return [...groups].map(([property, propertyMatches]) => ({
    property,
    matches: propertyMatches,
  }));
}

/** Find manifest-backed token declarations applying to one element. */
export function findTokensForElement(
  el: Element,
  index: TokenIndex,
): FindTokensForElementResult {
  const warnings: string[] = [];
  const rules = collectStyleRules(warnings);
  const ownDeclarations = declarationsForElement(el, rules);
  const inheritedMatches: ElementTokenMatch[] = [];
  const claimedProperties = new Set<string>();

  let ancestor = el.parentElement;
  while (ancestor) {
    const declarations = declarationsForElement(ancestor, rules);
    const nearest = declarations.filter(({ property }) =>
      isInheritedProperty(property) &&
      inheritedClaims(property).some((claim) => !claimedProperties.has(claim)),
    );
    for (const { property } of nearest) {
      for (const claim of inheritedClaims(property)) claimedProperties.add(claim);
    }
    inheritedMatches.push(...makeMatches(el, nearest, index, ancestor));
    ancestor = ancestor.parentElement;
  }

  return {
    own: groupByProperty(makeMatches(el, ownDeclarations, index)),
    inherited: groupByProperty(inheritedMatches),
    warnings,
  };
}
