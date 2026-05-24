// @vitest-environment jsdom
/**
 * Unit tests for findElementsUsingToken.
 *
 * Each test runs in JSDOM. Stylesheets are injected via <style> elements and
 * DOM nodes via document.body. Both are cleaned up in afterEach so tests are
 * fully isolated.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findElementsUsingToken } from '../find-elements';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let injectedStyles: HTMLStyleElement[] = [];
let injectedElements: Element[] = [];

/**
 * Inject a <style> element into document.head with the given CSS text.
 * Returns the sheet for further manipulation if needed.
 */
function injectStyle(css: string): CSSStyleSheet {
  const el = document.createElement('style');
  el.textContent = css;
  document.head.appendChild(el);
  injectedStyles.push(el);
  return el.sheet as CSSStyleSheet;
}

/**
 * Create a DOM element in document.body and return it.
 * Optionally set a class and/or inline style.
 */
function createElement(opts: {
  tag?: string;
  className?: string;
  inlineStyle?: string;
  id?: string;
  parent?: Element;
}): HTMLElement {
  const el = document.createElement(opts.tag ?? 'div');
  if (opts.className) el.className = opts.className;
  if (opts.inlineStyle) el.setAttribute('style', opts.inlineStyle);
  if (opts.id) el.id = opts.id;
  (opts.parent ?? document.body).appendChild(el);
  injectedElements.push(el);
  return el;
}

beforeEach(() => {
  injectedStyles = [];
  injectedElements = [];
});

afterEach(() => {
  for (const el of injectedStyles) el.remove();
  for (const el of injectedElements) el.remove();
  injectedStyles = [];
  injectedElements = [];
});

// ---------------------------------------------------------------------------
// Empty case
// ---------------------------------------------------------------------------

describe('empty case', () => {
  it('returns empty arrays when no stylesheets reference the token', () => {
    const result = findElementsUsingToken('--brand');
    expect(result.elements).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Direct match
// ---------------------------------------------------------------------------

describe('direct match', () => {
  it('returns the matching element when a rule references the token', () => {
    const el = createElement({ className: 'foo' });
    injectStyle('.foo { color: var(--brand); }');
    const { elements, warnings } = findElementsUsingToken('--brand');
    expect(elements).toContain(el);
    expect(warnings).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Right-boundary: --brand must NOT match --brand-fg
// ---------------------------------------------------------------------------

describe('right-boundary guard', () => {
  it('does not return elements that only reference a token with a longer name', () => {
    const el = createElement({ className: 'bar' });
    injectStyle('.bar { color: var(--brand-fg); }');
    const { elements } = findElementsUsingToken('--brand');
    expect(elements).not.toContain(el);
  });

  it('still returns an element that references --brand directly alongside a longer-named token', () => {
    const elA = createElement({ className: 'direct-brand' });
    const elB = createElement({ className: 'only-brand-fg' });
    injectStyle('.direct-brand { color: var(--brand); }');
    injectStyle('.only-brand-fg { color: var(--brand-fg); }');
    const { elements } = findElementsUsingToken('--brand');
    expect(elements).toContain(elA);
    expect(elements).not.toContain(elB);
  });
});

// ---------------------------------------------------------------------------
// Alias expansion
// ---------------------------------------------------------------------------

describe('alias expansion', () => {
  it('returns elements using an alias of the target token', () => {
    // :root { --brand-fg: var(--brand); }  =>  --brand aliases to --brand-fg
    injectStyle(':root { --brand-fg: var(--brand); }');
    const el = createElement({ className: 'x' });
    injectStyle('.x { color: var(--brand-fg); }');
    const { elements } = findElementsUsingToken('--brand');
    expect(elements).toContain(el);
  });

  it('does not traverse beyond depth 5', () => {
    // Chain: --a -> --b -> --c -> --d -> --e -> --f -> --g (7 hops, exceeds limit)
    injectStyle(`
      :root {
        --b: var(--a);
        --c: var(--b);
        --d: var(--c);
        --e: var(--d);
        --f: var(--e);
        --g: var(--f);
      }
    `);
    const el = createElement({ className: 'deep' });
    injectStyle('.deep { color: var(--g); }');
    // --g is 6 hops from --a, which exceeds MAX_ALIAS_DEPTH=5
    const { elements } = findElementsUsingToken('--a');
    expect(elements).not.toContain(el);
  });

  it('stops exactly at depth 5 (the 5th hop is included)', () => {
    // Chain: --a -> --b -> --c -> --d -> --e -> --f (5 hops)
    injectStyle(`
      :root {
        --b: var(--a);
        --c: var(--b);
        --d: var(--c);
        --e: var(--d);
        --f: var(--e);
      }
    `);
    const el = createElement({ className: 'depth5' });
    injectStyle('.depth5 { color: var(--f); }');
    // --f is 5 hops from --a (a→b→c→d→e→f), depth cap is 5, so --f IS included
    const { elements } = findElementsUsingToken('--a');
    expect(elements).toContain(el);
  });

  it('handles alias cycles without infinite looping', () => {
    injectStyle(':root { --a: var(--b); --b: var(--a); }');
    const el = createElement({ className: 'cycle' });
    injectStyle('.cycle { color: var(--b); }');
    // Should not throw/hang; --b is reachable from --a in 1 hop
    const { elements } = findElementsUsingToken('--a');
    expect(elements).toContain(el);
  });

  it('recognises html selector as a theme selector for aliases', () => {
    injectStyle('html { --x-alias: var(--x); }');
    const el = createElement({ className: 'html-alias' });
    injectStyle('.html-alias { color: var(--x-alias); }');
    const { elements } = findElementsUsingToken('--x');
    expect(elements).toContain(el);
  });

  it('recognises [data-theme="dark"] selector for aliases', () => {
    injectStyle('[data-theme="dark"] { --t-alias: var(--t); }');
    const el = createElement({ className: 'theme-alias' });
    injectStyle('.theme-alias { color: var(--t-alias); }');
    const { elements } = findElementsUsingToken('--t');
    expect(elements).toContain(el);
  });
});

// ---------------------------------------------------------------------------
// Inline-style hybrid
// ---------------------------------------------------------------------------

describe('inline-style hybrid', () => {
  it('returns an element with a matching inline var()', () => {
    const el = createElement({ inlineStyle: 'color: var(--brand)' });
    const { elements } = findElementsUsingToken('--brand');
    expect(elements).toContain(el);
  });

  it('does not return an inline-style element using a longer-named token', () => {
    const el = createElement({ inlineStyle: 'color: var(--brand-fg)' });
    const { elements } = findElementsUsingToken('--brand');
    expect(elements).not.toContain(el);
  });

  it('returns an alias element that uses inline var()', () => {
    injectStyle(':root { --brand-alias: var(--brand); }');
    const el = createElement({ inlineStyle: 'color: var(--brand-alias)' });
    const { elements } = findElementsUsingToken('--brand');
    expect(elements).toContain(el);
  });
});

// ---------------------------------------------------------------------------
// Cross-origin stylesheet skipping
// ---------------------------------------------------------------------------

describe('cross-origin stylesheet', () => {
  it('skips a sheet that throws SecurityError and records a warning', () => {
    // Inject the real style and DOM element BEFORE overriding styleSheets so
    // the real sheet is included in the snapshot we'll inject the fake into.
    const el = createElement({ className: 'after-xorigin' });
    injectStyle('.after-xorigin { color: var(--brand); }');

    // Create a fake CSSStyleSheet that throws on .cssRules access
    const fakeSheet = {
      href: 'https://cross-origin.example/styles.css',
      get cssRules(): CSSRuleList {
        throw new DOMException('Blocked by CORS', 'SecurityError');
      },
    } as unknown as CSSStyleSheet;

    // Temporarily prepend the fake sheet by overriding document.styleSheets.
    // Capture the live list NOW (after the injectStyle above) so real sheets
    // are included.
    const realSheetArray = Array.from(document.styleSheets);
    const fakeList = [fakeSheet, ...realSheetArray];

    // Save the prototype descriptor so we can restore it cleanly.
    const docProto = Object.getPrototypeOf(document) as typeof Document.prototype;
    const originalDesc = Object.getOwnPropertyDescriptor(docProto, 'styleSheets');

    Object.defineProperty(document, 'styleSheets', {
      value: fakeList,
      configurable: true,
      writable: false,
    });

    try {
      const { elements, warnings } = findElementsUsingToken('--brand');
      expect(warnings.some((w) => w.includes('cross-origin.example'))).toBe(true);
      // The real sheet still gets scanned
      expect(elements).toContain(el);
    } finally {
      // Remove the own-property override so the prototype getter takes back control.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (document as any).styleSheets;
      // If there was a custom descriptor on the prototype (unusual), put it back.
      if (originalDesc) {
        Object.defineProperty(docProto, 'styleSheets', originalDesc);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// @media / nested rule recursion
// ---------------------------------------------------------------------------

describe('@media recursion', () => {
  it('finds elements referenced inside @media rules', () => {
    const el = createElement({ className: 'media-rule' });
    injectStyle('@media (min-width: 1px) { .media-rule { color: var(--brand); } }');
    const { elements } = findElementsUsingToken('--brand');
    expect(elements).toContain(el);
  });

  it('finds elements referenced inside nested @supports rules', () => {
    const el = createElement({ className: 'supports-rule' });
    injectStyle('@supports (display: grid) { .supports-rule { background: var(--brand); } }');
    const { elements } = findElementsUsingToken('--brand');
    expect(elements).toContain(el);
  });
});

// ---------------------------------------------------------------------------
// Selector cleanup
// ---------------------------------------------------------------------------

describe('selector cleanup', () => {
  it('matches .btn element from a .btn:hover rule', () => {
    const el = createElement({ className: 'btn' });
    injectStyle('.btn:hover { color: var(--brand); }');
    const { elements } = findElementsUsingToken('--brand');
    expect(elements).toContain(el);
  });

  it('matches .btn element from a .btn::before rule', () => {
    const el = createElement({ className: 'btn' });
    injectStyle('.btn::before { content: var(--brand); }');
    const { elements } = findElementsUsingToken('--brand');
    expect(elements).toContain(el);
  });

  it('matches .btn from a .btn:hover:focus rule (multi-strip)', () => {
    const el = createElement({ className: 'btn-multi' });
    injectStyle('.btn-multi:hover:focus { color: var(--brand); }');
    const { elements } = findElementsUsingToken('--brand');
    expect(elements).toContain(el);
  });

  it('preserves :not() and returns the base element', () => {
    const el = createElement({ className: 'btn-not' });
    injectStyle('.btn-not:not(:hover) { color: var(--brand); }');
    const { elements } = findElementsUsingToken('--brand');
    // :not(:hover) ends with ')' so the state pseudo strip regex does NOT match
    expect(elements).toContain(el);
  });

  it('strips outer :hover from .btn:is(.a, .b):hover, leaves :is(...) intact', () => {
    // Create a div that matches .btn-is.a
    const el = createElement({ className: 'btn-is a' });
    injectStyle('.btn-is:is(.a, .b):hover { color: var(--brand); }');
    const { elements } = findElementsUsingToken('--brand');
    expect(elements).toContain(el);
  });

  it('handles comma-separated selectors and skips empty fragments', () => {
    const elA = createElement({ className: 'comma-a' });
    const elB = createElement({ className: 'comma-b' });
    injectStyle('.comma-a, .comma-b { color: var(--brand); }');
    const { elements } = findElementsUsingToken('--brand');
    expect(elements).toContain(elA);
    expect(elements).toContain(elB);
  });
});

// ---------------------------------------------------------------------------
// Panel exclusion
// ---------------------------------------------------------------------------

describe('panel exclusion', () => {
  it('excludes elements inside .tokenpanel-shell', () => {
    const shell = createElement({ className: 'tokenpanel-shell' });
    const inner = createElement({ className: 'inner-panel', parent: shell });
    injectStyle('.inner-panel { color: var(--brand); }');
    const { elements } = findElementsUsingToken('--brand');
    expect(elements).not.toContain(inner);
  });

  it('excludes elements inside [data-design-token-panel-modal]', () => {
    const modal = createElement({});
    modal.setAttribute('data-design-token-panel-modal', '');
    const inner = createElement({ className: 'inside-modal', parent: modal });
    injectStyle('.inside-modal { color: var(--brand); }');
    const { elements } = findElementsUsingToken('--brand');
    expect(elements).not.toContain(inner);
  });

  it('excludes elements inside #tokenpanel-highlight-mount', () => {
    const mount = createElement({ id: 'tokenpanel-highlight-mount' });
    const inner = createElement({ className: 'inside-mount', parent: mount });
    injectStyle('.inside-mount { color: var(--brand); }');
    const { elements } = findElementsUsingToken('--brand');
    expect(elements).not.toContain(inner);
  });

  it('keeps elements that are NOT inside any panel shell', () => {
    const el = createElement({ className: 'outside-panel' });
    injectStyle('.outside-panel { color: var(--brand); }');
    const { elements } = findElementsUsingToken('--brand');
    expect(elements).toContain(el);
  });
});

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

describe('deduplication', () => {
  it('returns each element only once even if matched by multiple rules', () => {
    const el = createElement({ className: 'dedup' });
    injectStyle('.dedup { color: var(--brand); }');
    injectStyle('.dedup { background: var(--brand); }');
    const { elements } = findElementsUsingToken('--brand');
    const count = elements.filter((e) => e === el).length;
    expect(count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Normalization: var() wrapper stripping
// ---------------------------------------------------------------------------

describe('normalization', () => {
  it('accepts "var(--brand)" as input and behaves identically to "--brand"', () => {
    const el = createElement({ className: 'norm' });
    injectStyle('.norm { color: var(--brand); }');
    const withWrapper = findElementsUsingToken('var(--brand)');
    const withoutWrapper = findElementsUsingToken('--brand');
    expect(withWrapper.elements).toContain(el);
    expect(withoutWrapper.elements).toContain(el);
  });
});
