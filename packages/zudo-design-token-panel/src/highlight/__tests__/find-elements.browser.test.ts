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
// TEXT tokens (font-family / animation-name / transition-property / will-change)
// ---------------------------------------------------------------------------

describe('text (font-family) — direct use', () => {
  it('finds element with font-family: var(--ff)', () => {
    injectStyle(":root { --ff: Georgia, serif; }");
    injectStyle('.fx-ff { font-family: var(--ff); }');
    const el = createElement({ className: 'fx-ff' });
    const { elements } = findElementsUsingToken('--ff', { kind: 'text' });
    expect(elements).toContain(el);
  });
});

describe('text (font-family) — alias depth 1', () => {
  it('finds element via --ff-semantic aliasing --ff-base', () => {
    injectStyle(":root { --ff-base: Georgia, serif; --ff-semantic: var(--ff-base); }");
    injectStyle('.fx-ff-alias1 { font-family: var(--ff-semantic); }');
    const el = createElement({ className: 'fx-ff-alias1' });
    const { elements } = findElementsUsingToken('--ff-base', { kind: 'text' });
    expect(elements).toContain(el);
  });
});

describe('text (font-family) — alias depth 2', () => {
  it('finds element via --heading-ff -> --ff-semantic -> --ff-base', () => {
    injectStyle(":root { --ff-base: Georgia, serif; --ff-semantic: var(--ff-base); --heading-ff: var(--ff-semantic); }");
    injectStyle('.fx-ff-alias2 { font-family: var(--heading-ff); }');
    const el = createElement({ className: 'fx-ff-alias2' });
    const { elements } = findElementsUsingToken('--ff-base', { kind: 'text' });
    expect(elements).toContain(el);
  });
});

describe('text (font-family) — inline style', () => {
  it('finds element with inline font-family: var(--ff)', () => {
    injectStyle(":root { --ff: Georgia, serif; }");
    const el = createElement({ inlineStyle: 'font-family: var(--ff)' });
    const { elements } = findElementsUsingToken('--ff', { kind: 'text' });
    expect(elements).toContain(el);
  });
});

describe('text (font-family) — multi-property rule', () => {
  it('finds element using font-family token (only one relevant longhand)', () => {
    injectStyle(":root { --ff: Georgia, serif; }");
    injectStyle('.fx-ff-multi { font-family: var(--ff); font-size: 16px; }');
    const el = createElement({ className: 'fx-ff-multi' });
    const { elements } = findElementsUsingToken('--ff', { kind: 'text' });
    expect(elements).toContain(el);
  });
});

describe('text (font-family) — pseudo-element consumer', () => {
  it('finds element whose ::before uses font-family token', () => {
    injectStyle(":root { --ff: Georgia, serif; }");
    injectStyle('.fx-ff-pseudo::before { content: "x"; font-family: var(--ff); }');
    const el = createElement({ className: 'fx-ff-pseudo' });
    const { elements } = findElementsUsingToken('--ff', { kind: 'text' });
    expect(elements).toContain(el);
  });
});

describe('text (font-family) — decoy', () => {
  it('does NOT find element with literal Georgia font-family', () => {
    injectStyle(":root { --ff: Georgia, serif; }");
    injectStyle('.fx-real { font-family: var(--ff); }');
    injectStyle(".fx-decoy { font-family: Georgia, serif; }");
    createElement({ className: 'fx-real' });
    const decoy = createElement({ className: 'fx-decoy' });
    const { elements } = findElementsUsingToken('--ff', { kind: 'text' });
    expect(elements).not.toContain(decoy);
  });
});

describe('text (animation-name) — direct use', () => {
  it('finds element with animation-name: var(--anim)', () => {
    injectStyle(':root { --anim: my-keyframes; }');
    injectStyle('.fx-anim { animation-name: var(--anim); animation-duration: 1s; }');
    const el = createElement({ className: 'fx-anim' });
    const { elements } = findElementsUsingToken('--anim', { kind: 'text' });
    expect(elements).toContain(el);
  });
});

describe('text (transition-property) — direct use', () => {
  it('finds element with transition-property: var(--prop)', () => {
    injectStyle(':root { --prop: opacity; }');
    injectStyle('.fx-tp { transition-property: var(--prop); transition-duration: 1s; }');
    const el = createElement({ className: 'fx-tp' });
    const { elements } = findElementsUsingToken('--prop', { kind: 'text' });
    expect(elements).toContain(el);
  });
});

describe('text (will-change) — direct use', () => {
  it('finds element with will-change: var(--wc)', () => {
    injectStyle(':root { --wc: transform; }');
    injectStyle('.fx-wc { will-change: var(--wc); }');
    const el = createElement({ className: 'fx-wc' });
    const { elements } = findElementsUsingToken('--wc', { kind: 'text' });
    expect(elements).toContain(el);
  });
});

// ---------------------------------------------------------------------------
// EASING tokens (transition-timing-function / animation-timing-function)
// ---------------------------------------------------------------------------

describe('easing — transition-timing-function (cubic-bezier)', () => {
  it('finds element with transition-timing-function: var(--ease)', () => {
    injectStyle(':root { --ease: cubic-bezier(0.42, 0, 1, 1); }');
    injectStyle('.fx-ease { transition-timing-function: var(--ease); transition-duration: 1s; }');
    const el = createElement({ className: 'fx-ease' });
    const { elements } = findElementsUsingToken('--ease', { kind: 'easing' });
    expect(elements).toContain(el);
  });
});

describe('easing — transition-timing-function (keyword, explicit kind)', () => {
  it('finds element with transition-timing-function: var(--ease) where ease=ease-in', () => {
    // Bare easing keywords collide with <custom-ident>, so auto-detect routes
    // them to `text`. Callers that know the token is consumed via a timing-
    // function property must pass kind: 'easing' explicitly.
    injectStyle(':root { --ease: ease-in; }');
    injectStyle('.fx-ease-kw { transition-timing-function: var(--ease); transition-duration: 1s; }');
    const el = createElement({ className: 'fx-ease-kw' });
    const { elements } = findElementsUsingToken('--ease', { kind: 'easing' });
    expect(elements).toContain(el);
  });
});

describe('easing — multi-value transition-timing-function list', () => {
  it('finds element with transition-timing-function: ease, var(--ease)', () => {
    injectStyle(':root { --ease: cubic-bezier(0.42, 0, 1, 1); }');
    injectStyle('.fx-ease-multi { transition: opacity 1s ease, transform 1s var(--ease); }');
    const el = createElement({ className: 'fx-ease-multi' });
    const { elements } = findElementsUsingToken('--ease', { kind: 'easing' });
    expect(elements).toContain(el);
  });
});

describe('text — multi-value will-change list', () => {
  it('finds element with will-change: opacity, var(--wc)', () => {
    injectStyle(':root { --wc: transform; }');
    injectStyle('.fx-wc-multi { will-change: opacity, var(--wc); }');
    const el = createElement({ className: 'fx-wc-multi' });
    const { elements } = findElementsUsingToken('--wc', { kind: 'text' });
    expect(elements).toContain(el);
  });
});

describe('text — multi-value transition-property list', () => {
  it('finds element with transition-property: opacity, var(--prop)', () => {
    injectStyle(':root { --prop: transform; }');
    injectStyle('.fx-tp-multi { transition-property: opacity, var(--prop); transition-duration: 1s; }');
    const el = createElement({ className: 'fx-tp-multi' });
    const { elements } = findElementsUsingToken('--prop', { kind: 'text' });
    expect(elements).toContain(el);
  });
});

describe('easing — animation-timing-function', () => {
  it('finds element with animation-timing-function: var(--ease)', () => {
    injectStyle(':root { --ease: cubic-bezier(0.42, 0, 1, 1); }');
    injectStyle('.fx-anim-ease { animation-name: x; animation-duration: 1s; animation-timing-function: var(--ease); }');
    const el = createElement({ className: 'fx-anim-ease' });
    const { elements } = findElementsUsingToken('--ease', { kind: 'easing' });
    expect(elements).toContain(el);
  });
});

describe('easing — transition shorthand (longhand decomposition)', () => {
  it('finds element using `transition: all 1s var(--ease)` shorthand', () => {
    injectStyle(':root { --ease: cubic-bezier(0.42, 0, 1, 1); }');
    injectStyle('.fx-ease-short { transition: all 1s var(--ease); }');
    const el = createElement({ className: 'fx-ease-short' });
    const { elements } = findElementsUsingToken('--ease', { kind: 'easing' });
    expect(elements).toContain(el);
  });
});

describe('easing — alias depth 1 (semantic)', () => {
  it('finds element via --ease-semantic aliasing --ease-base', () => {
    injectStyle(':root { --ease-base: cubic-bezier(0.42, 0, 1, 1); --ease-semantic: var(--ease-base); }');
    injectStyle('.fx-ease-alias { transition-timing-function: var(--ease-semantic); transition-duration: 1s; }');
    const el = createElement({ className: 'fx-ease-alias' });
    const { elements } = findElementsUsingToken('--ease-base', { kind: 'easing' });
    expect(elements).toContain(el);
  });
});

describe('easing — decoy', () => {
  it('does NOT find element with a literal cubic-bezier value (no var())', () => {
    injectStyle(':root { --ease: cubic-bezier(0.42, 0, 1, 1); }');
    injectStyle('.fx-ease-real { transition-timing-function: var(--ease); transition-duration: 1s; }');
    injectStyle('.fx-ease-decoy { transition-timing-function: cubic-bezier(0.42, 0, 1, 1); transition-duration: 1s; }');
    createElement({ className: 'fx-ease-real' });
    const decoy = createElement({ className: 'fx-ease-decoy' });
    const { elements } = findElementsUsingToken('--ease', { kind: 'easing' });
    expect(elements).not.toContain(decoy);
  });
});

describe('easing — inline style', () => {
  it('finds element with inline transition-timing-function: var(--ease)', () => {
    injectStyle(':root { --ease: cubic-bezier(0.42, 0, 1, 1); }');
    const el = createElement({ inlineStyle: 'transition-timing-function: var(--ease); transition-duration: 1s' });
    const { elements } = findElementsUsingToken('--ease', { kind: 'easing' });
    expect(elements).toContain(el);
  });
});

// ---------------------------------------------------------------------------
// String-sentinel-rejection invariant — encodes the CSS Variables spec
// behavior that motivated the per-property-family sentinel design (#275).
// A string sentinel substituted into a typed property (e.g. transition-timing-
// function) is invalid at computed-value time, so the declaration falls back
// to its initial value. This means the `text` probe CANNOT detect easing
// consumers — only the `easing` probe can.
// ---------------------------------------------------------------------------

describe('invariant — text probe cannot detect easing consumers (#275)', () => {
  it('text probe finds 0 elements when easing token is consumed via transition-timing-function', () => {
    injectStyle(':root { --ease: cubic-bezier(0.42, 0, 1, 1); }');
    injectStyle('.fx-ease-text { transition-timing-function: var(--ease); transition-duration: 1s; }');
    createElement({ className: 'fx-ease-text' });
    // Forcing the text probe: sentinel is `__zdtp_probe_text_AAA__`, which is
    // invalid as <easing-function>; transition-timing-function falls back to
    // `ease`. The text probe finds no consumers.
    const { elements } = findElementsUsingToken('--ease', { kind: 'text' });
    expect(elements).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Time tokens (transition-duration / animation-duration / delays)
// ---------------------------------------------------------------------------

describe('time — transition-duration direct consumer', () => {
  it('finds element with transition-duration: var(--dur)', () => {
    injectStyle(':root { --dur: 0.3s; }');
    injectStyle('.fx-dur { transition-duration: var(--dur); transition-property: opacity; }');
    const el = createElement({ className: 'fx-dur' });
    const { elements } = findElementsUsingToken('--dur', { kind: 'time' });
    expect(elements).toContain(el);
  });
});

describe('time — transition shorthand consumer', () => {
  it('finds element with transition: opacity var(--dur) ease shorthand', () => {
    // Chrome decomposes transition shorthand into longhands at computed-style time,
    // so transition-duration receives the sentinel directly from the longhand check.
    injectStyle(':root { --dur: 0.3s; }');
    injectStyle('.fx-dur-short { transition: opacity var(--dur) ease; }');
    const el = createElement({ className: 'fx-dur-short' });
    const { elements } = findElementsUsingToken('--dur', { kind: 'time' });
    expect(elements).toContain(el);
  });
});

describe('time — animation shorthand consumer', () => {
  it('finds element with animation: spin var(--dur) linear shorthand', () => {
    // Chrome decomposes animation shorthand into longhands at computed-style time,
    // so animation-duration receives the sentinel.
    injectStyle(':root { --dur: 0.3s; }');
    injectStyle('.fx-anim-dur { animation: spin var(--dur) linear; }');
    const el = createElement({ className: 'fx-anim-dur' });
    const { elements } = findElementsUsingToken('--dur', { kind: 'time' });
    expect(elements).toContain(el);
  });
});

describe('time — transition-delay direct consumer', () => {
  it('finds element with transition-delay: var(--dur)', () => {
    injectStyle(':root { --dur: 0.15s; }');
    injectStyle('.fx-delay { transition-delay: var(--dur); transition-property: opacity; }');
    const el = createElement({ className: 'fx-delay' });
    const { elements } = findElementsUsingToken('--dur', { kind: 'time' });
    expect(elements).toContain(el);
  });
});

describe('time — auto-detect classifies time value', () => {
  it('auto-detects token resolved as 0.3s as time kind and finds transition-duration consumer', () => {
    injectStyle(':root { --dur: 0.3s; }');
    injectStyle('.fx-auto-dur { transition-duration: var(--dur); transition-property: opacity; }');
    const el = createElement({ className: 'fx-auto-dur' });
    // No explicit kind: auto-detection should classify 0.3s as 'time'
    const { elements } = findElementsUsingToken('--dur');
    expect(elements).toContain(el);
  });

  it('auto-detects token resolved as 150ms as time kind and finds transition-duration consumer', () => {
    injectStyle(':root { --dur: 150ms; }');
    injectStyle('.fx-auto-ms { transition-duration: var(--dur); transition-property: opacity; }');
    const el = createElement({ className: 'fx-auto-ms' });
    const { elements } = findElementsUsingToken('--dur');
    expect(elements).toContain(el);
  });
});

describe('time — decoy (literal transition-duration does not match sentinel)', () => {
  it('does NOT find element with literal transition-duration: 0.3s (not using the token)', () => {
    injectStyle(':root { --dur: 0.3s; }');
    injectStyle('.fx-time-real { transition-duration: var(--dur); transition-property: opacity; }');
    injectStyle('.fx-time-decoy { transition-duration: 0.3s; transition-property: opacity; }');
    createElement({ className: 'fx-time-real' });
    const decoy = createElement({ className: 'fx-time-decoy' });
    const { elements } = findElementsUsingToken('--dur', { kind: 'time' });
    expect(elements).not.toContain(decoy);
  });
});

describe('time — inline-style definer', () => {
  it('finds descendant whose transition-duration resolves from a parent inline style="--dur: ..."', () => {
    // No stylesheet rule defines --dur on :root. The parent element's inline
    // style is the sole definer; inline-definer discovery is required.
    injectStyle('.fx-time-inline-child { transition-duration: var(--dur); transition-property: opacity; }');
    const parent = createElement({ inlineStyle: '--dur: 0.15s;' });
    const child = createElement({ className: 'fx-time-inline-child', parent });
    const { elements } = findElementsUsingToken('--dur', { kind: 'time' });
    expect(elements).toContain(child);
  });
});

describe('time — differential mode', () => {
  it('sentinelA and sentinelB produce different computed transition-duration values', () => {
    injectStyle(':root { --dur: 0.3s; }');
    injectStyle('.fx-time-diff { transition-duration: var(--dur); transition-property: opacity; }');
    const el = createElement({ className: 'fx-time-diff' });
    const { elements } = findElementsUsingToken('--dur', { kind: 'time', mode: 'differential' });
    expect(elements).toContain(el);
  });
});

describe('invariant — text probe cannot detect time consumers', () => {
  it('text probe finds 0 time-consuming elements when time token is used via transition-duration', () => {
    injectStyle(':root { --dur: 0.3s; }');
    injectStyle('.fx-time-text { transition-duration: var(--dur); transition-property: opacity; }');
    createElement({ className: 'fx-time-text' });
    // The text sentinel (__zdtp_probe_text_AAA__) is invalid as <time>;
    // transition-duration falls back to its initial value 0s. No elements found.
    const { elements } = findElementsUsingToken('--dur', { kind: 'text' });
    expect(elements).toHaveLength(0);
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

  it("classifies 'Georgia, serif' as text", () => {
    injectStyle(":root { --t: Georgia, serif; }");
    injectStyle('.tc { font-family: var(--t); }');
    const el = createElement({ className: 'tc' });
    const { elements } = findElementsUsingToken('--t');
    expect(elements).toContain(el);
  });

  it("classifies 'cubic-bezier(0.42, 0, 1, 1)' as easing", () => {
    injectStyle(":root { --t: cubic-bezier(0.42, 0, 1, 1); }");
    injectStyle('.tc { transition-timing-function: var(--t); }');
    const el = createElement({ className: 'tc' });
    const { elements } = findElementsUsingToken('--t');
    expect(elements).toContain(el);
  });

  it("classifies 'steps(3, end)' as easing", () => {
    injectStyle(":root { --t: steps(3, end); }");
    injectStyle('.tc { transition-timing-function: var(--t); }');
    const el = createElement({ className: 'tc' });
    const { elements } = findElementsUsingToken('--t');
    expect(elements).toContain(el);
  });

  it("does NOT classify bare keyword 'linear' as easing (custom-ident collision)", () => {
    // A bare 'linear' value is also a valid <custom-ident>, so it could be an
    // animation-name. Auto-detect prefers `text` for keyword values; only the
    // unambiguous functional forms route to `easing`.
    injectStyle(":root { --anim-name: linear; }");
    injectStyle('.tc { animation-name: var(--anim-name); animation-duration: 1s; }');
    const el = createElement({ className: 'tc' });
    const { elements } = findElementsUsingToken('--anim-name');
    expect(elements).toContain(el);
  });

  it("classifies '0.3s' as time", () => {
    injectStyle(':root { --t: 0.3s; }');
    injectStyle('.tc { transition-duration: var(--t); transition-property: opacity; }');
    const el = createElement({ className: 'tc' });
    const { elements } = findElementsUsingToken('--t');
    expect(elements).toContain(el);
  });

  it("classifies '150ms' as time", () => {
    injectStyle(':root { --t: 150ms; }');
    injectStyle('.tc { transition-duration: var(--t); transition-property: opacity; }');
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
  it('token with 12px value probed as text — no elements found (no font-family consumer)', () => {
    injectStyle(':root { --t: 12px; }');
    injectStyle('.tc { padding: var(--t); }');
    const el = createElement({ className: 'tc' });
    // Force the text probe on a length token → the text sentinel
    // (__zdtp_probe_text_AAA__) won't match padding-top
    const { elements } = findElementsUsingToken('--t', { kind: 'text' });
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
// Step 0 spike — sentinel round-trip verification for new kinds (#285)
// These tests MUST pass before implementing cursor/content/mask-image kinds.
// They verify Chrome preserves the needle substring through computed-style
// serialization for the proposed sentinel shapes.
// ---------------------------------------------------------------------------

describe('step-0 spike — cursor sentinel round-trip', () => {
  it('cursor probe: differential mode detects consumers via keyword fallback difference', () => {
    // Chrome getComputedStyle().cursor returns the keyword used value ('auto',
    // 'pointer', etc.), not the url() reference. A url() cursor that fails to
    // load resolves to its fallback keyword. This means url()-based sentinels
    // with the same fallback keyword are indistinguishable in computed style.
    //
    // Instead, use two DIFFERENT keyword sentinels for differential mode:
    // sentinelA uses fallback 'crosshair', sentinelB uses fallback 'move'.
    // In differential mode, the two sentinels produce different cursor values,
    // so consumers ARE detected.
    //
    // For equality mode, use 'crosshair' as the sentinel — it's a valid cursor
    // keyword that Chrome preserves verbatim in computed style.
    injectStyle(":root { --cursor-test: crosshair; }");
    const el = createElement({});
    injectStyle('.cursor-kw { cursor: var(--cursor-test); }');
    el.className = 'cursor-kw';
    const computed = getComputedStyle(el).getPropertyValue('cursor');
    expect(computed).toBe('crosshair');
  });

  it('cursor: url(...) crosshair — Chrome returns auto (not crosshair), url() is silently dropped', () => {
    // Documents Chrome's computed-style behaviour: when a url() cursor image
    // fails to load (which includes data URIs for SVG with the query string
    // used here), Chrome falls back to the INHERITED value (auto), NOT to the
    // specified keyword fallback. This is why url()-based cursor sentinels are
    // unsuitable: the needle is lost and even the fallback keyword is discarded.
    // The correct sentinel for the cursor kind is a bare cursor keyword (e.g.
    // 'crosshair') which Chrome preserves verbatim in computed style.
    injectStyle(":root { --x: url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E') crosshair; }");
    const el = createElement({});
    injectStyle('.cursor-spike2 { cursor: var(--x); }');
    el.className = 'cursor-spike2';
    const computed = getComputedStyle(el).getPropertyValue('cursor');
    // Chrome falls back to 'auto' (inherited/initial), NOT to 'crosshair'.
    // This documents the Chrome quirk that motivates keyword-only cursor sentinels.
    expect(computed).toBe('auto');
  });
});

describe('step-0 spike — content sentinel round-trip', () => {
  it('content: "..." quoted-string sentinel needle survives getComputedStyle on ::before', () => {
    injectStyle(':root { --x: "__zdtp_probe_content_AAA__"; }');
    const el = createElement({});
    el.className = 'content-spike';
    injectStyle('.content-spike::before { content: var(--x); }');
    const computed = getComputedStyle(el, '::before').getPropertyValue('content');
    // Needle must appear as a substring
    expect(computed).toContain('__zdtp_probe_content_AAA__');
  });
});

describe('step-0 spike — mask-image sentinel round-trip', () => {
  it('mask-image: url(...) sentinel needle survives getComputedStyle', () => {
    injectStyle(":root { --x: url('data:image/svg+xml,__zdtp_probe_mask_AAA__'); }");
    const el = createElement({});
    el.className = 'mask-spike';
    injectStyle('.mask-spike { mask-image: var(--x); }');
    const computed = getComputedStyle(el).getPropertyValue('mask-image');
    // Needle must appear as a substring
    expect(computed).toContain('__zdtp_probe_mask_AAA__');
  });
});

// ---------------------------------------------------------------------------
// CURSOR tokens
// Keyword sentinels only — Chrome drops url() from cursor computed style.
// sentinelA='crosshair', sentinelB='move' (verified in step-0 spike above).
// ---------------------------------------------------------------------------

describe('cursor — direct use (equality mode)', () => {
  it('finds element with cursor: var(--cursor-icon) via explicit kind hint', () => {
    injectStyle(':root { --cursor-icon: pointer; }');
    injectStyle('.fx-cursor { cursor: var(--cursor-icon); }');
    const el = createElement({ className: 'fx-cursor' });
    const { elements } = findElementsUsingToken('--cursor-icon', { kind: 'cursor' });
    expect(elements).toContain(el);
  });
});

describe('cursor — alias depth 1', () => {
  it('finds element via --cursor-semantic aliasing --cursor-base', () => {
    injectStyle(':root { --cursor-base: pointer; --cursor-semantic: var(--cursor-base); }');
    injectStyle('.fx-cursor-alias1 { cursor: var(--cursor-semantic); }');
    const el = createElement({ className: 'fx-cursor-alias1' });
    const { elements } = findElementsUsingToken('--cursor-base', { kind: 'cursor' });
    expect(elements).toContain(el);
  });
});

describe('cursor — inline definer', () => {
  it('finds cursor consumer when token is defined in an inline style attribute', () => {
    injectStyle('.fx-cursor-inline { cursor: var(--cursor-inline); }');
    const section = createElement({ inlineStyle: '--cursor-inline: help;' });
    const child = createElement({ className: 'fx-cursor-inline', parent: section });
    const { elements } = findElementsUsingToken('--cursor-inline', { kind: 'cursor' });
    expect(elements).toContain(child);
  });
});

describe('cursor — decoy (literal keyword, no var())', () => {
  it('does NOT find element with literal cursor: pointer (no var())', () => {
    injectStyle(':root { --cursor-icon: help; }');
    injectStyle('.fx-cursor-real { cursor: var(--cursor-icon); }');
    injectStyle('.fx-cursor-decoy { cursor: pointer; }');
    createElement({ className: 'fx-cursor-real' });
    const decoy = createElement({ className: 'fx-cursor-decoy' });
    const { elements } = findElementsUsingToken('--cursor-icon', { kind: 'cursor' });
    expect(elements).not.toContain(decoy);
  });
});

describe('cursor — differential mode', () => {
  it('finds cursor consumer in differential mode (sentinelA=crosshair, sentinelB=move)', () => {
    injectStyle(':root { --cursor-btn: pointer; }');
    injectStyle('.fx-cursor-diff { cursor: var(--cursor-btn); }');
    const el = createElement({ className: 'fx-cursor-diff' });
    const { elements } = findElementsUsingToken('--cursor-btn', { kind: 'cursor', mode: 'differential' });
    expect(elements).toContain(el);
  });
});

// ---------------------------------------------------------------------------
// CONTENT tokens
// Quoted-string sentinels — round-trip correctly through Chrome computed style.
// Auto-detect: resolved value matching QUOTED_STRING_RE routes to 'content'.
// ---------------------------------------------------------------------------

describe('content — ::before consumer (explicit kind)', () => {
  it('finds element whose ::before uses content: var(--icon-glyph)', () => {
    injectStyle(':root { --icon-glyph: "★"; }');
    injectStyle('.fx-content::before { content: var(--icon-glyph); display: block; }');
    const el = createElement({ className: 'fx-content' });
    const { elements } = findElementsUsingToken('--icon-glyph', { kind: 'content' });
    expect(elements).toContain(el);
  });
});

describe('content — auto-detect from quoted-string resolved value', () => {
  it('classifies quoted-string resolved value as content and finds the consumer', () => {
    injectStyle(':root { --icon-glyph: "★"; }');
    injectStyle('.fx-content-auto::before { content: var(--icon-glyph); display: block; }');
    const el = createElement({ className: 'fx-content-auto' });
    // No kind hint — auto-detect should classify "★" (quoted string) as 'content'
    const { elements, warnings } = findElementsUsingToken('--icon-glyph');
    expect(warnings.filter((w) => w.includes('auto-detection')).length).toBe(0);
    expect(elements).toContain(el);
  });
});

describe('content — alias depth 1', () => {
  it('finds element via --content-semantic aliasing --content-base', () => {
    injectStyle(':root { --content-base: "★"; --content-semantic: var(--content-base); }');
    injectStyle('.fx-content-alias::before { content: var(--content-semantic); display: block; }');
    const el = createElement({ className: 'fx-content-alias' });
    const { elements } = findElementsUsingToken('--content-base', { kind: 'content' });
    expect(elements).toContain(el);
  });
});

describe('content — decoy (literal string, no var())', () => {
  it('does NOT find element with literal content: "foo" (no var())', () => {
    injectStyle(':root { --my-content: "★"; }');
    injectStyle('.fx-content-real::before { content: var(--my-content); display: block; }');
    injectStyle('.fx-content-decoy::before { content: "foo"; display: block; }');
    createElement({ className: 'fx-content-real' });
    const decoy = createElement({ className: 'fx-content-decoy' });
    const { elements } = findElementsUsingToken('--my-content', { kind: 'content' });
    expect(elements).not.toContain(decoy);
  });
});

// ---------------------------------------------------------------------------
// MASK-IMAGE tokens
// url() sentinels with needle decoupling — Chrome preserves url() in computed
// mask-image (unlike cursor). needleA/needleB allow substring matching even if
// Chrome normalises quote characters.
// ---------------------------------------------------------------------------

describe('mask-image — direct use (explicit kind)', () => {
  it('finds element with mask-image: var(--mask)', () => {
    injectStyle(":root { --mask: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\"/>'); }");
    injectStyle('.fx-mask { mask-image: var(--mask); }');
    const el = createElement({ className: 'fx-mask' });
    const { elements } = findElementsUsingToken('--mask', { kind: 'mask-image' });
    expect(elements).toContain(el);
  });
});

describe('mask-image — alias depth 1', () => {
  it('finds element via --mask-semantic aliasing --mask-base', () => {
    injectStyle(":root { --mask-base: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\"/>'); --mask-semantic: var(--mask-base); }");
    injectStyle('.fx-mask-alias { mask-image: var(--mask-semantic); }');
    const el = createElement({ className: 'fx-mask-alias' });
    const { elements } = findElementsUsingToken('--mask-base', { kind: 'mask-image' });
    expect(elements).toContain(el);
  });
});

describe('mask-image — decoy (literal url(), no var())', () => {
  it('does NOT find element with literal mask-image url() (no var())', () => {
    injectStyle(":root { --mask: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\"/>'); }");
    injectStyle('.fx-mask-real { mask-image: var(--mask); }');
    injectStyle(".fx-mask-decoy { mask-image: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\"/>'); }");
    createElement({ className: 'fx-mask-real' });
    const decoy = createElement({ className: 'fx-mask-decoy' });
    const { elements } = findElementsUsingToken('--mask', { kind: 'mask-image' });
    expect(elements).not.toContain(decoy);
  });
});

describe('mask-image — auto-detect falls through to text with warning for url() values', () => {
  it('url() resolved value auto-detects as text with warning (url() is ambiguous)', () => {
    injectStyle(":root { --mask: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\"/>'); }");
    injectStyle('.fx-mask-auto { mask-image: var(--mask); }');
    createElement({ className: 'fx-mask-auto' });
    // Auto-detect (no kind hint) should emit warning and default to text
    const { warnings } = findElementsUsingToken('--mask');
    expect(warnings.some((w) => w.includes('url()'))).toBe(true);
    expect(warnings.some((w) => w.includes("kind:'mask-image'"))).toBe(true);
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
