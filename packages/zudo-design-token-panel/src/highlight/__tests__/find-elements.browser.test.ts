// @vitest-environment browser
/**
 * Comprehensive browser-mode tests for findElementsUsingToken.
 *
 * Runs under vitest browser mode with Playwright Chromium (set up in Wave 1).
 * Each describe block covers a distinct area of the probe algorithm spec.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findElementsUsingToken } from '../find-elements';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let injectedStyles: HTMLStyleElement[] = [];
let injectedElements: Element[] = [];

function injectStyle(css: string): HTMLStyleElement {
  const el = document.createElement('style');
  el.textContent = css;
  document.head.appendChild(el);
  injectedStyles.push(el);
  return el;
}

function createElement(opts: {
  tag?: string;
  className?: string;
  inlineStyle?: string;
  id?: string;
  parent?: Element;
  attrs?: Record<string, string>;
}): HTMLElement {
  const el = document.createElement(opts.tag ?? 'div');
  if (opts.className) el.className = opts.className;
  if (opts.inlineStyle) el.setAttribute('style', opts.inlineStyle);
  if (opts.id) el.id = opts.id;
  if (opts.attrs) {
    for (const [k, v] of Object.entries(opts.attrs)) el.setAttribute(k, v);
  }
  (opts.parent ?? document.body).appendChild(el);
  injectedElements.push(el);
  return el;
}

beforeEach(() => {
  injectedStyles = [];
  injectedElements = [];
  // Reset any inline styles left on root/body from prior tests
  document.documentElement.style.cssText = '';
  document.body.style.cssText = '';
  // Reset data-theme attribute on body if any test set it
  document.body.removeAttribute('data-theme');
});

afterEach(() => {
  for (const el of injectedStyles) el.remove();
  for (const el of injectedElements) el.remove();
  injectedStyles = [];
  injectedElements = [];
  document.documentElement.style.cssText = '';
  document.body.style.cssText = '';
  document.body.removeAttribute('data-theme');
});

// ---------------------------------------------------------------------------
// COLOR tokens
// ---------------------------------------------------------------------------

describe('color — direct use', () => {
  it('finds element with color: var(--brand-blue) via stylesheet', () => {
    injectStyle(':root { --brand-blue: #3b82f6; }');
    injectStyle('.fx-direct { color: var(--brand-blue); }');
    const el = createElement({ className: 'fx-direct' });
    const { elements } = findElementsUsingToken('--brand-blue');
    expect(elements).toContain(el);
  });

  it('finds element with background-color: var(--brand-blue)', () => {
    injectStyle(':root { --brand-blue: #3b82f6; }');
    injectStyle('.fx-bg { background-color: var(--brand-blue); }');
    const el = createElement({ className: 'fx-bg' });
    const { elements } = findElementsUsingToken('--brand-blue');
    expect(elements).toContain(el);
  });

  it('does NOT return decoy element with literal value matching sentinel', () => {
    injectStyle(':root { --brand-blue: #3b82f6; }');
    injectStyle('.fx-direct { color: var(--brand-blue); }');
    injectStyle('.fx-decoy { color: #3b82f6; }');
    createElement({ className: 'fx-direct' });
    const decoy = createElement({ className: 'fx-decoy' });
    const { elements } = findElementsUsingToken('--brand-blue');
    // Decoy must NOT be found (it has a literal value, not computed from the token)
    expect(elements).not.toContain(decoy);
  });
});

describe('color — alias depth 1 (semantic)', () => {
  it('finds element via --color-primary aliasing --brand-blue', () => {
    injectStyle(':root { --brand-blue: #3b82f6; --color-primary: var(--brand-blue); }');
    injectStyle('.fx-alias-1 { color: var(--color-primary); }');
    const el = createElement({ className: 'fx-alias-1' });
    const { elements } = findElementsUsingToken('--brand-blue');
    expect(elements).toContain(el);
  });
});

describe('color — alias depth 2 (component)', () => {
  it('finds element via --button-primary-bg -> --color-primary -> --brand-blue', () => {
    injectStyle(':root { --brand-blue: #3b82f6; --color-primary: var(--brand-blue); --button-primary-bg: var(--color-primary); }');
    injectStyle('.fx-alias-2 { background-color: var(--button-primary-bg); }');
    const el = createElement({ className: 'fx-alias-2' });
    const { elements } = findElementsUsingToken('--brand-blue');
    expect(elements).toContain(el);
  });
});

describe('color — inline style', () => {
  it('finds element with inline style color: var(--brand-blue)', () => {
    injectStyle(':root { --brand-blue: #3b82f6; }');
    const el = createElement({ inlineStyle: 'color: var(--brand-blue)' });
    const { elements } = findElementsUsingToken('--brand-blue');
    expect(elements).toContain(el);
  });
});

describe('color — multi-property rule', () => {
  it('finds element whose rule uses token in both background and border-color', () => {
    injectStyle(':root { --brand-blue: #3b82f6; }');
    injectStyle('.fx-multi { background-color: var(--brand-blue); border-color: var(--brand-blue); }');
    const el = createElement({ className: 'fx-multi' });
    const { elements } = findElementsUsingToken('--brand-blue');
    expect(elements).toContain(el);
  });
});

describe('color — compound property consumer (box-shadow)', () => {
  it('finds element with box-shadow: 0 2px 8px var(--brand-blue)', () => {
    injectStyle(':root { --brand-blue: #3b82f6; }');
    injectStyle('.fx-shadow { box-shadow: 0 2px 8px var(--brand-blue); }');
    const el = createElement({ className: 'fx-shadow' });
    const { elements } = findElementsUsingToken('--brand-blue');
    expect(elements).toContain(el);
  });

  it('finds element with text-shadow using token', () => {
    injectStyle(':root { --brand-color: red; }');
    injectStyle('.fx-text-shadow { text-shadow: 1px 1px 2px var(--brand-color); }');
    const el = createElement({ className: 'fx-text-shadow' });
    const { elements } = findElementsUsingToken('--brand-color');
    expect(elements).toContain(el);
  });
});

describe('color — pseudo-element consumer', () => {
  it('finds element whose ::before uses the color token', () => {
    injectStyle(':root { --brand-blue: #3b82f6; }');
    injectStyle('.fx-pseudo { position: relative; } .fx-pseudo::before { content: ""; color: var(--brand-blue); display: block; }');
    const el = createElement({ className: 'fx-pseudo' });
    const { elements } = findElementsUsingToken('--brand-blue');
    expect(elements).toContain(el);
  });
});

describe('color — right-boundary guard', () => {
  it('probing --brand does NOT find element that only uses --brand-fg', () => {
    injectStyle(':root { --brand: #3b82f6; --brand-fg: #ef4444; }');
    injectStyle('.fx-brand-fg { color: var(--brand-fg); }');
    const el = createElement({ className: 'fx-brand-fg' });
    const { elements } = findElementsUsingToken('--brand');
    expect(elements).not.toContain(el);
  });

  it('sentinel set on --brand does not affect --brand-fg resolution', () => {
    injectStyle(':root { --brand: red; --brand-fg: blue; }');
    injectStyle('.consumer { color: var(--brand-fg); }');
    const el = createElement({ className: 'consumer' });
    // After probe, --brand-fg should still resolve to blue (rgb(0, 0, 255))
    const { elements } = findElementsUsingToken('--brand');
    expect(elements).not.toContain(el);
    // Verify restoration: --brand-fg still resolves to blue
    const cs = getComputedStyle(el);
    expect(cs.getPropertyValue('color')).toBe('rgb(0, 0, 255)');
  });
});

// ---------------------------------------------------------------------------
// LENGTH tokens
// ---------------------------------------------------------------------------

describe('length — font-size direct', () => {
  it('finds element with font-size: var(--font-size-lg)', () => {
    injectStyle(':root { --font-size-lg: 20px; }');
    injectStyle('.fx-fs-direct { font-size: var(--font-size-lg); }');
    const el = createElement({ className: 'fx-fs-direct' });
    const { elements } = findElementsUsingToken('--font-size-lg', { kind: 'length' });
    expect(elements).toContain(el);
  });
});

describe('length — padding direct', () => {
  it('finds element with padding: var(--space)', () => {
    injectStyle(':root { --space: 16px; }');
    injectStyle('.fx-pad { padding: var(--space); }');
    const el = createElement({ className: 'fx-pad' });
    const { elements } = findElementsUsingToken('--space', { kind: 'length' });
    expect(elements).toContain(el);
  });
});

describe('length — alias depth 1', () => {
  it('finds element via --space-semantic aliasing --space-base', () => {
    injectStyle(':root { --space-base: 16px; --space-semantic: var(--space-base); }');
    injectStyle('.fx-len-alias1 { padding: var(--space-semantic); }');
    const el = createElement({ className: 'fx-len-alias1' });
    const { elements } = findElementsUsingToken('--space-base', { kind: 'length' });
    expect(elements).toContain(el);
  });
});

describe('length — alias depth 2', () => {
  it('finds element via --card-pad -> --space-semantic -> --space-base', () => {
    injectStyle(':root { --space-base: 16px; --space-semantic: var(--space-base); --card-pad: var(--space-semantic); }');
    injectStyle('.fx-len-alias2 { padding: var(--card-pad); }');
    const el = createElement({ className: 'fx-len-alias2' });
    const { elements } = findElementsUsingToken('--space-base', { kind: 'length' });
    expect(elements).toContain(el);
  });
});

describe('length — inline style', () => {
  it('finds element with inline style padding: var(--space)', () => {
    injectStyle(':root { --space: 16px; }');
    const el = createElement({ inlineStyle: 'padding: var(--space)' });
    const { elements } = findElementsUsingToken('--space', { kind: 'length' });
    expect(elements).toContain(el);
  });
});

describe('length — multi-property rule', () => {
  it('finds element using token in both padding and margin', () => {
    injectStyle(':root { --space: 16px; }');
    injectStyle('.fx-len-multi { padding: var(--space); margin-top: var(--space); }');
    const el = createElement({ className: 'fx-len-multi' });
    const { elements } = findElementsUsingToken('--space', { kind: 'length' });
    expect(elements).toContain(el);
  });
});

describe('length — compound property (box-shadow with length)', () => {
  it('finds element with box-shadow: 0 var(--space) 0 #fff', () => {
    injectStyle(':root { --space: 16px; }');
    injectStyle('.fx-len-shadow { box-shadow: 0 var(--space) 0 #fff; }');
    const el = createElement({ className: 'fx-len-shadow' });
    const { elements } = findElementsUsingToken('--space', { kind: 'length' });
    expect(elements).toContain(el);
  });
});

describe('length — pseudo-element consumer', () => {
  it('finds element whose ::after uses the length token for font-size', () => {
    injectStyle(':root { --font-size-sm: 12px; }');
    injectStyle('.fx-len-pseudo::after { content: ""; font-size: var(--font-size-sm); display: block; }');
    const el = createElement({ className: 'fx-len-pseudo' });
    const { elements } = findElementsUsingToken('--font-size-sm', { kind: 'length' });
    expect(elements).toContain(el);
  });
});

describe('length — decoy', () => {
  it('does NOT find element with literal 16px (same resolved value as --space)', () => {
    injectStyle(':root { --space: 16px; }');
    injectStyle('.fx-real { padding: var(--space); }');
    injectStyle('.fx-decoy { padding: 16px; }');
    createElement({ className: 'fx-real' });
    const decoy = createElement({ className: 'fx-decoy' });
    const { elements } = findElementsUsingToken('--space', { kind: 'length' });
    expect(elements).not.toContain(decoy);
  });
});

// ---------------------------------------------------------------------------
// NUMBER tokens
// ---------------------------------------------------------------------------

describe('number — line-height direct', () => {
  it('finds element with line-height: var(--lh) in differential mode', () => {
    // Chrome returns line-height as a computed px value (used value), not the unitless
    // sentinel — so equality mode misses it. Differential mode catches it.
    injectStyle(':root { --lh: 1.5; }');
    injectStyle('.fx-lh { line-height: var(--lh); }');
    const el = createElement({ className: 'fx-lh' });
    const { elements } = findElementsUsingToken('--lh', { kind: 'number', mode: 'differential' });
    expect(elements).toContain(el);
  });
});

describe('number — opacity direct', () => {
  it('finds element with opacity: var(--op) in equality mode', () => {
    // Sentinel 0.12346 is within (0,1) so Chrome returns it verbatim for opacity.
    injectStyle(':root { --op: 0.8; }');
    injectStyle('.fx-op { opacity: var(--op); }');
    const el = createElement({ className: 'fx-op' });
    const { elements } = findElementsUsingToken('--op', { kind: 'number', mode: 'equality' });
    expect(elements).toContain(el);
  });
});

describe('number — alias depth 1', () => {
  it('finds element via --lh-semantic aliasing --lh-base (differential)', () => {
    injectStyle(':root { --lh-base: 1.5; --lh-semantic: var(--lh-base); }');
    injectStyle('.fx-num-alias1 { line-height: var(--lh-semantic); }');
    const el = createElement({ className: 'fx-num-alias1' });
    // line-height: differential mode needed (Chrome returns px computed value)
    const { elements } = findElementsUsingToken('--lh-base', { kind: 'number', mode: 'differential' });
    expect(elements).toContain(el);
  });
});

describe('number — alias depth 2', () => {
  it('finds element via --body-lh -> --lh-semantic -> --lh-base (differential)', () => {
    injectStyle(':root { --lh-base: 1.5; --lh-semantic: var(--lh-base); --body-lh: var(--lh-semantic); }');
    injectStyle('.fx-num-alias2 { line-height: var(--body-lh); }');
    const el = createElement({ className: 'fx-num-alias2' });
    // line-height: differential mode needed
    const { elements } = findElementsUsingToken('--lh-base', { kind: 'number', mode: 'differential' });
    expect(elements).toContain(el);
  });
});

describe('number — inline style', () => {
  it('finds element with inline opacity: var(--op) in equality mode', () => {
    // Use opacity (not line-height) for equality mode: opacity returns sentinel verbatim
    injectStyle(':root { --op: 0.5; }');
    const el = createElement({ inlineStyle: 'opacity: var(--op)' });
    const { elements } = findElementsUsingToken('--op', { kind: 'number', mode: 'equality' });
    expect(elements).toContain(el);
  });
});

describe('number — multi-property rule', () => {
  it('finds element using token in both line-height and opacity (differential)', () => {
    // Multi-property: both line-height and opacity use the token.
    // Differential mode catches both (line-height can't be matched by equality in Chrome).
    injectStyle(':root { --ratio: 0.9; }');
    injectStyle('.fx-num-multi { line-height: var(--ratio); opacity: var(--ratio); }');
    const el = createElement({ className: 'fx-num-multi' });
    const { elements } = findElementsUsingToken('--ratio', { kind: 'number', mode: 'differential' });
    expect(elements).toContain(el);
  });
});

describe('number — pseudo-element consumer', () => {
  it('finds element whose ::before uses opacity: var(--op) in equality mode', () => {
    // Sentinel 0.12346 is within (0,1) so Chrome returns it verbatim for opacity.
    injectStyle(':root { --op: 0.5; }');
    injectStyle('.fx-num-pseudo::before { content: "x"; display: block; opacity: var(--op); }');
    const el = createElement({ className: 'fx-num-pseudo' });
    const { elements } = findElementsUsingToken('--op', { kind: 'number', mode: 'equality' });
    expect(elements).toContain(el);
  });
});

describe('number — decoy', () => {
  it('does NOT find element with literal opacity value matching the token', () => {
    // Use opacity (rounds cleanly) and a literal value that differs from sentinel.
    injectStyle(':root { --op: 0.8; }');
    injectStyle('.fx-real { opacity: var(--op); }');
    injectStyle('.fx-decoy { opacity: 0.8; }'); // literal value, same as token; but token overridden by sentinel
    createElement({ className: 'fx-real' });
    const decoy = createElement({ className: 'fx-decoy' });
    const { elements } = findElementsUsingToken('--op', { kind: 'number', mode: 'equality' });
    expect(elements).not.toContain(decoy);
  });
});

// ---------------------------------------------------------------------------
// FONT-FAMILY tokens
// ---------------------------------------------------------------------------

describe('fontFamily — direct use', () => {
  it('finds element with font-family: var(--ff)', () => {
    injectStyle(":root { --ff: Georgia, serif; }");
    injectStyle('.fx-ff { font-family: var(--ff); }');
    const el = createElement({ className: 'fx-ff' });
    const { elements } = findElementsUsingToken('--ff', { kind: 'fontFamily' });
    expect(elements).toContain(el);
  });
});

describe('fontFamily — alias depth 1', () => {
  it('finds element via --ff-semantic aliasing --ff-base', () => {
    injectStyle(":root { --ff-base: Georgia, serif; --ff-semantic: var(--ff-base); }");
    injectStyle('.fx-ff-alias1 { font-family: var(--ff-semantic); }');
    const el = createElement({ className: 'fx-ff-alias1' });
    const { elements } = findElementsUsingToken('--ff-base', { kind: 'fontFamily' });
    expect(elements).toContain(el);
  });
});

describe('fontFamily — alias depth 2', () => {
  it('finds element via --heading-ff -> --ff-semantic -> --ff-base', () => {
    injectStyle(":root { --ff-base: Georgia, serif; --ff-semantic: var(--ff-base); --heading-ff: var(--ff-semantic); }");
    injectStyle('.fx-ff-alias2 { font-family: var(--heading-ff); }');
    const el = createElement({ className: 'fx-ff-alias2' });
    const { elements } = findElementsUsingToken('--ff-base', { kind: 'fontFamily' });
    expect(elements).toContain(el);
  });
});

describe('fontFamily — inline style', () => {
  it('finds element with inline font-family: var(--ff)', () => {
    injectStyle(":root { --ff: Georgia, serif; }");
    const el = createElement({ inlineStyle: 'font-family: var(--ff)' });
    const { elements } = findElementsUsingToken('--ff', { kind: 'fontFamily' });
    expect(elements).toContain(el);
  });
});

describe('fontFamily — multi-property rule', () => {
  it('finds element using font-family token (only one relevant longhand)', () => {
    injectStyle(":root { --ff: Georgia, serif; }");
    injectStyle('.fx-ff-multi { font-family: var(--ff); font-size: 16px; }');
    const el = createElement({ className: 'fx-ff-multi' });
    const { elements } = findElementsUsingToken('--ff', { kind: 'fontFamily' });
    expect(elements).toContain(el);
  });
});

describe('fontFamily — pseudo-element consumer', () => {
  it('finds element whose ::before uses font-family token', () => {
    injectStyle(":root { --ff: Georgia, serif; }");
    injectStyle('.fx-ff-pseudo::before { content: "x"; font-family: var(--ff); }');
    const el = createElement({ className: 'fx-ff-pseudo' });
    const { elements } = findElementsUsingToken('--ff', { kind: 'fontFamily' });
    expect(elements).toContain(el);
  });
});

describe('fontFamily — decoy', () => {
  it('does NOT find element with literal Georgia font-family', () => {
    injectStyle(":root { --ff: Georgia, serif; }");
    injectStyle('.fx-real { font-family: var(--ff); }');
    injectStyle(".fx-decoy { font-family: Georgia, serif; }");
    createElement({ className: 'fx-real' });
    const decoy = createElement({ className: 'fx-decoy' });
    const { elements } = findElementsUsingToken('--ff', { kind: 'fontFamily' });
    expect(elements).not.toContain(decoy);
  });
});

// ---------------------------------------------------------------------------
// Cascade fixtures
// ---------------------------------------------------------------------------

describe('cascade — [data-theme="dark"] redefine', () => {
  it('finds consumer inside [data-theme="dark"] where token is redefined', () => {
    injectStyle(':root { --brand: blue; } [data-theme="dark"] { --brand: lightblue; }');
    injectStyle('.themed-consumer { color: var(--brand); }');

    // Set up: body has data-theme="dark", consumer is inside it
    document.body.setAttribute('data-theme', 'dark');
    const consumer = createElement({ className: 'themed-consumer' });

    const { elements } = findElementsUsingToken('--brand', { kind: 'color' });
    expect(elements).toContain(consumer);
  });
});

describe('cascade — element-scoped redefine (.card pattern)', () => {
  it('finds .card via definer-walk on --card-bg', () => {
    injectStyle(':root { --brand-blue: #3b82f6; }');
    injectStyle('.card { --card-bg: var(--brand-blue); background-color: var(--card-bg); }');
    const card = createElement({ className: 'card' });
    const { elements } = findElementsUsingToken('--card-bg', { kind: 'color' });
    expect(elements).toContain(card);
  });
});

describe('cascade — scoped definer where root has no value', () => {
  it('auto-detects type as color, emits warning, finds consumer', () => {
    injectStyle('body { --section-bg: blue; } .x { background-color: var(--section-bg); }');
    const el = createElement({ className: 'x' });
    // Without kind: auto-detect on empty root value → warning + defaults to color
    const { elements, warnings } = findElementsUsingToken('--section-bg');
    expect(warnings.some((w) => w.includes('--section-bg'))).toBe(true);
    expect(elements).toContain(el);
  });

  it('with kind: color — finds consumer without warning', () => {
    injectStyle('body { --section-bg: blue; } .x { background-color: var(--section-bg); }');
    const el = createElement({ className: 'x' });
    const { elements, warnings } = findElementsUsingToken('--section-bg', { kind: 'color' });
    // No auto-detection warning when kind is explicitly provided
    expect(warnings.filter((w) => w.includes('auto-detection')).length).toBe(0);
    expect(elements).toContain(el);
  });
});

describe('cascade — inline-style definer (scoped override on a subtree)', () => {
  it('finds descendants whose var(--token) resolves from a parent inline style="--token: ..."', () => {
    // No stylesheet rule defines --brand. A parent inline style is the sole definer.
    // Without inline-definer discovery, the sentinel applied to :root never reaches the child
    // because the parent's inline style wins the cascade for --brand in this subtree.
    injectStyle('.brand-text { color: var(--brand); }');
    const section = createElement({
      tag: 'section',
      inlineStyle: '--brand: #112233;',
    });
    const child = createElement({
      className: 'brand-text',
      parent: section,
    });
    const { elements } = findElementsUsingToken('--brand', { kind: 'color' });
    expect(elements).toContain(child);
  });

  it('handles inline definer plus stylesheet definer together (no double-apply error)', () => {
    injectStyle(':root { --shared: red; }');
    injectStyle('.consumer { color: var(--shared); }');
    const section = createElement({
      tag: 'section',
      inlineStyle: '--shared: blue;',
    });
    const child = createElement({ className: 'consumer', parent: section });
    const { elements } = findElementsUsingToken('--shared', { kind: 'color' });
    expect(elements).toContain(child);
  });
});

describe('cascade — body element as consumer', () => {
  it('finds body itself when it uses a token', () => {
    injectStyle(':root { --page-bg: #fff; }');
    injectStyle('body { background-color: var(--page-bg); }');
    // body is an injected element in this case but not removed; make sure the test is self-contained
    const { elements } = findElementsUsingToken('--page-bg', { kind: 'color' });
    expect(elements).toContain(document.body);
  });
});

// ---------------------------------------------------------------------------
// Transform-resistant cases (differential mode)
// ---------------------------------------------------------------------------

describe('differential mode — calc', () => {
  it('equality misses calc consumer; differential hits it', () => {
    injectStyle(':root { --space: 16px; }');
    injectStyle('.fx-calc { padding: calc(var(--space) * 2); }');
    const el = createElement({ className: 'fx-calc' });

    // Equality should miss (result is 32px, not the sentinel value)
    const eqResult = findElementsUsingToken('--space', { kind: 'length', mode: 'equality' });
    expect(eqResult.elements).not.toContain(el);

    // Differential should hit
    const diffResult = findElementsUsingToken('--space', { kind: 'length', mode: 'differential' });
    expect(diffResult.elements).toContain(el);
  });
});

describe('differential mode — min()', () => {
  it('min(var(--space), 30px) — equality HITS with 7px sentinel (< 30); differential also hits', () => {
    injectStyle(':root { --space: 16px; }');
    injectStyle('.fx-min { padding: min(var(--space), 30px); }');
    const el = createElement({ className: 'fx-min' });

    // Equality with 7.137951px: min(7.137951px, 30px) = 7.137951px → HITS
    const eqResult = findElementsUsingToken('--space', { kind: 'length', mode: 'equality' });
    expect(eqResult.elements).toContain(el);

    const diffResult = findElementsUsingToken('--space', { kind: 'length', mode: 'differential' });
    expect(diffResult.elements).toContain(el);
  });

  it('max(var(--space), 10px) — equality MISSES (7px < 10px floor); differential hits', () => {
    injectStyle(':root { --space: 16px; }');
    injectStyle('.fx-max { padding: max(var(--space), 10px); }');
    const el = createElement({ className: 'fx-max' });

    // Equality with 7.137951px: max(7.137951px, 10px) = 10px ≠ sentinel → MISSES
    const eqResult = findElementsUsingToken('--space', { kind: 'length', mode: 'equality' });
    expect(eqResult.elements).not.toContain(el);

    // Differential: sentinelA=7.13px → max=10px, sentinelB=83.26px → max=83.26px → DIFFERENT → HITS
    const diffResult = findElementsUsingToken('--space', { kind: 'length', mode: 'differential' });
    expect(diffResult.elements).toContain(el);
  });

  it('clamp(10px, var(--font), 50px) — differential hits', () => {
    injectStyle(':root { --font: 20px; }');
    injectStyle('.fx-clamp { font-size: clamp(10px, var(--font), 50px); }');
    const el = createElement({ className: 'fx-clamp' });

    const diffResult = findElementsUsingToken('--font', { kind: 'length', mode: 'differential' });
    expect(diffResult.elements).toContain(el);
  });
});

// ---------------------------------------------------------------------------
// Panel exclusion
// ---------------------------------------------------------------------------

describe('panel exclusion', () => {
  it('element inside .tokenpanel-shell is NOT returned', () => {
    injectStyle(':root { --brand: red; }');
    injectStyle('.inner { color: var(--brand); }');

    const shell = createElement({ className: 'tokenpanel-shell' });
    const inner = createElement({ className: 'inner', parent: shell });

    const { elements } = findElementsUsingToken('--brand', { kind: 'color' });
    expect(elements).not.toContain(inner);
  });

  it('element inside [data-design-token-panel-modal] is NOT returned', () => {
    injectStyle(':root { --brand: red; }');
    injectStyle('.modal-inner { color: var(--brand); }');

    const modal = createElement({ attrs: { 'data-design-token-panel-modal': '' } });
    const inner = createElement({ className: 'modal-inner', parent: modal });

    const { elements } = findElementsUsingToken('--brand', { kind: 'color' });
    expect(elements).not.toContain(inner);
  });

  it('element inside #tokenpanel-highlight-mount is NOT returned', () => {
    injectStyle(':root { --brand: red; }');
    injectStyle('.mount-inner { color: var(--brand); }');

    const mount = createElement({ id: 'tokenpanel-highlight-mount' });
    const inner = createElement({ className: 'mount-inner', parent: mount });

    const { elements } = findElementsUsingToken('--brand', { kind: 'color' });
    expect(elements).not.toContain(inner);
  });

  it('definer-walk panel mutation check: no inline-style mutation on panel-internal element', () => {
    injectStyle(':root { --brand: red; }');
    injectStyle('.tokenpanel-shell { --brand: blue; }');
    injectStyle('.panel-consumer { color: var(--brand); }');

    const shell = createElement({ className: 'tokenpanel-shell' });
    const panelEl = createElement({ className: 'panel-consumer', parent: shell });

    let mutationFired = false;
    const observer = new MutationObserver(() => { mutationFired = true; });
    observer.observe(panelEl, { attributes: true, attributeFilter: ['style'] });

    findElementsUsingToken('--brand', { kind: 'color' });

    observer.disconnect();
    expect(mutationFired).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Cross-origin stylesheet warning
// ---------------------------------------------------------------------------

describe('cross-origin stylesheet', () => {
  it('emits warning for cross-origin sheet and still finds consumers in accessible sheets', () => {
    injectStyle(':root { --brand: red; }');
    injectStyle('.xorigin-consumer { color: var(--brand); }');
    const el = createElement({ className: 'xorigin-consumer' });

    // Create a fake sheet that throws on .cssRules
    const fakeSheet = {
      href: 'https://cross-origin.example/styles.css',
      get cssRules(): CSSRuleList {
        throw new DOMException('Blocked by CORS', 'SecurityError');
      },
    } as unknown as CSSStyleSheet;

    const realSheets = Array.from(document.styleSheets);
    const fakeList = [fakeSheet, ...realSheets];

    const docProto = Object.getPrototypeOf(document) as typeof Document.prototype;
    const originalDesc = Object.getOwnPropertyDescriptor(docProto, 'styleSheets');

    Object.defineProperty(document, 'styleSheets', {
      value: fakeList,
      configurable: true,
      writable: false,
    });

    try {
      const { elements, warnings } = findElementsUsingToken('--brand', { kind: 'color' });
      expect(warnings.some((w) => w.includes('cross-origin.example'))).toBe(true);
      expect(elements).toContain(el);
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (document as any).styleSheets;
      if (originalDesc) {
        Object.defineProperty(docProto, 'styleSheets', originalDesc);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Type detection — auto vs. hint
// ---------------------------------------------------------------------------

describe('type detection — auto-classify resolved value', () => {
  it("classifies 'red' (named color) as color", () => {
    injectStyle(':root { --t: red; }');
    injectStyle('.tc { color: var(--t); }');
    const el = createElement({ className: 'tc' });
    const { elements } = findElementsUsingToken('--t');
    expect(elements).toContain(el);
  });

  it("classifies '#fff' (hex) as color", () => {
    injectStyle(':root { --t: #fff; }');
    injectStyle('.tc { background-color: var(--t); }');
    const el = createElement({ className: 'tc' });
    const { elements } = findElementsUsingToken('--t');
    expect(elements).toContain(el);
  });

  it("classifies 'rgb(...)' as color", () => {
    injectStyle(':root { --t: rgb(0, 0, 255); }');
    injectStyle('.tc { color: var(--t); }');
    const el = createElement({ className: 'tc' });
    const { elements } = findElementsUsingToken('--t');
    expect(elements).toContain(el);
  });

  it("classifies 'oklch(...)' as color", () => {
    injectStyle(':root { --t: oklch(0.7 0.15 200); }');
    injectStyle('.tc { color: var(--t); }');
    const el = createElement({ className: 'tc' });
    const { elements } = findElementsUsingToken('--t');
    expect(elements).toContain(el);
  });

  it("classifies '12px' as length", () => {
    injectStyle(':root { --t: 12px; }');
    injectStyle('.tc { padding: var(--t); }');
    const el = createElement({ className: 'tc' });
    const { elements } = findElementsUsingToken('--t');
    expect(elements).toContain(el);
  });

  it("classifies '1.5rem' as length", () => {
    injectStyle(':root { --t: 1.5rem; }');
    injectStyle('.tc { padding: var(--t); }');
    const el = createElement({ className: 'tc' });
    const { elements } = findElementsUsingToken('--t');
    expect(elements).toContain(el);
  });

  it("classifies '1.5' (bare number) as number", () => {
    // line-height returns px in Chrome (equality can't match); use opacity instead
    // which returns the sentinel verbatim when it's in (0,1).
    injectStyle(':root { --t: 1.5; }');
    injectStyle('.tc { opacity: var(--t); }');
    const el = createElement({ className: 'tc' });
    // Default mode (equality). Since --t = 1.5 > 1, opacity clamps to 1 normally,
    // but the sentinel 0.12346 < 1 so it WON'T be clamped when the override is applied.
    const { elements } = findElementsUsingToken('--t');
    expect(elements).toContain(el);
  });

  it("classifies 'Georgia, serif' as fontFamily", () => {
    injectStyle(":root { --t: Georgia, serif; }");
    injectStyle('.tc { font-family: var(--t); }');
    const el = createElement({ className: 'tc' });
    const { elements } = findElementsUsingToken('--t');
    expect(elements).toContain(el);
  });

  it("empty resolved value emits warning and defaults to color", () => {
    // Token with no :root definition
    injectStyle('.tc { color: var(--never-on-root); }');
    createElement({ className: 'tc' });
    const { warnings } = findElementsUsingToken('--never-on-root');
    expect(warnings.some((w) => w.includes('--never-on-root'))).toBe(true);
  });
});

describe('type detection — kind hint overrides auto-detect', () => {
  it('token with 12px value probed as fontFamily — no elements found (no font-family consumer)', () => {
    injectStyle(':root { --t: 12px; }');
    injectStyle('.tc { padding: var(--t); }');
    const el = createElement({ className: 'tc' });
    // Force fontFamily probe on a length token → the fontFamily sentinel
    // (__zdtp_probe_ff_AAA__) won't match padding-top
    const { elements } = findElementsUsingToken('--t', { kind: 'fontFamily' });
    expect(elements).not.toContain(el);
  });
});

// ---------------------------------------------------------------------------
// Synchronous invariant
// ---------------------------------------------------------------------------

describe('synchronous invariant', () => {
  it('no inline-style changes observable via rAF scheduled before the call', async () => {
    injectStyle(':root { --brand: red; }');
    injectStyle('.sync-consumer { color: var(--brand); }');
    createElement({ className: 'sync-consumer' });

    const before = document.documentElement.style.cssText;

    // Schedule a rAF BEFORE the synchronous probe call
    let rafStyleText: string | undefined;
    const rafDone = new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        rafStyleText = document.documentElement.style.cssText;
        resolve();
      });
    });

    // Synchronous call — apply and restore happen in same task
    findElementsUsingToken('--brand', { kind: 'color' });

    // After synchronous return, style must already be restored
    const after = document.documentElement.style.cssText;
    expect(after).toBe(before);

    // Wait for the rAF — it should also see the restored state
    await rafDone;
    expect(rafStyleText).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// Empty token (truly unused / never defined)
// ---------------------------------------------------------------------------

describe('empty token', () => {
  it('returns empty elements and a warning for --never-defined', () => {
    const { elements, warnings } = findElementsUsingToken('--never-defined');
    expect(elements).toHaveLength(0);
    expect(warnings.some((w) => w.includes('--never-defined'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

describe('deduplication', () => {
  it('returns each element only once even when matched by multiple rules', () => {
    injectStyle(':root { --brand: red; }');
    injectStyle('.dedup { color: var(--brand); }');
    injectStyle('.dedup { background-color: var(--brand); }');
    const el = createElement({ className: 'dedup' });
    const { elements } = findElementsUsingToken('--brand', { kind: 'color' });
    const count = elements.filter((e) => e === el).length;
    expect(count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// var() wrapper input normalization
// ---------------------------------------------------------------------------

describe('var() wrapper normalization', () => {
  it('accepts "var(--brand)" and behaves identically to "--brand"', () => {
    injectStyle(':root { --brand: red; }');
    injectStyle('.norm { color: var(--brand); }');
    const el = createElement({ className: 'norm' });
    const withWrapper = findElementsUsingToken('var(--brand)', { kind: 'color' });
    const withoutWrapper = findElementsUsingToken('--brand', { kind: 'color' });
    expect(withWrapper.elements).toContain(el);
    expect(withoutWrapper.elements).toContain(el);
  });
});

// ---------------------------------------------------------------------------
// @media recursion
// ---------------------------------------------------------------------------

describe('@media recursion', () => {
  it('finds elements referenced inside @media rules', () => {
    injectStyle(':root { --brand: red; }');
    injectStyle('@media (min-width: 1px) { .media-rule { color: var(--brand); } }');
    const el = createElement({ className: 'media-rule' });
    const { elements } = findElementsUsingToken('--brand', { kind: 'color' });
    expect(elements).toContain(el);
  });

  it('finds elements referenced inside nested @supports rules', () => {
    injectStyle(':root { --brand: red; }');
    injectStyle('@supports (display: grid) { .supports-rule { background-color: var(--brand); } }');
    const el = createElement({ className: 'supports-rule' });
    const { elements } = findElementsUsingToken('--brand', { kind: 'color' });
    expect(elements).toContain(el);
  });
});
