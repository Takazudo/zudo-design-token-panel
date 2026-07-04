// @vitest-environment browser
/**
 * F33 + F24: Hostile-host CSS isolation — Level-5 automated browser gate.
 *
 * Converts the manual DevTools harness (hostile-host.mdx) into a
 * deterministic regression gate that runs in CI via Playwright Chromium on
 * every PR.  Two test groups:
 *
 *   F33 — full hostile CSS environment:
 *     Injects the acceptance-criteria hostile block (h1-h6/p/ul/li/table
 *     resets, * { box-sizing: content-box }, svg { fill: red !important },
 *     html { font-size: 20px }, :focus { outline: none }) BEFORE panel CSS
 *     (deployment order) and asserts panel key computed styles survive.
 *
 *   F24 — transform-ancestor fixed positioning:
 *     Creates a CSS transform ancestor on the page and verifies that the
 *     panel shell — appended directly to document.body as a sibling of the
 *     ancestor, NOT a descendant — reports viewport-relative coordinates for
 *     its position:fixed bounding box.
 *
 * See: doc/src/content/docs/internal/hostile-host.mdx §Level-5 automated gate
 * and packages/zdtp/CLAUDE.md §SVG defensive reset.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// Hostile CSS fixture
//
// Covers every acceptance-criteria hostile scenario in a single stylesheet.
// Injected BEFORE panel CSS to simulate real deployment order: host CSS is
// already on the page; the panel injects its CSS at runtime AFTER.
//
// Each rule targets a distinct isolation concern:
//   h1-h6 { font-size: 4rem !important; margin: 2rem 0 !important }
//     → semantic-tag reset; panel uses div[role=heading], not h3/h4
//   p, ul, li, table { margin / padding !important }
//     → structural tag reset; panel uses no p/ul/li/table elements
//   * { box-sizing: content-box }
//     → universal box-sizing; panel CSS counter-resets with :where() scope
//   svg { fill: red !important }
//     → SVG fill kill; panel CSS defensive reset uses !important to beat it
//   html { font-size: 20px }
//     → root font-size shift; panel CSS uses px tokens (not rem), so unaffected
//   :focus { outline: none }
//     → focus kill; panel CSS uses :focus-visible (tested separately in
//       css-a11y.browser.test.ts; included here for integration completeness)
// ---------------------------------------------------------------------------

const HOSTILE_CSS = `
  h1, h2, h3, h4, h5, h6 {
    font-size: 4rem !important;
    margin: 2rem 0 !important;
    color: red !important;
  }
  p, ul, li, table {
    margin: 3rem !important;
    padding: 2rem !important;
    color: red !important;
  }
  * { box-sizing: content-box; }
  svg { fill: red !important; }
  html { font-size: 20px; }
  :focus { outline: none; }
`;

// ---------------------------------------------------------------------------
// Test harness helpers (mirrors css-isolation.browser.test.ts pattern)
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

function createElement(className: string, tag = 'div', parent?: Element): HTMLElement {
  const el = document.createElement(tag);
  el.className = className;
  (parent ?? document.body).appendChild(el);
  injectedElements.push(el);
  return el as HTMLElement;
}

/** Create a minimal SVG element inside `parent` and track it for cleanup. */
function createSvgInside(parent: HTMLElement): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M0 0 L10 10');
  svg.appendChild(path);
  parent.appendChild(svg);
  injectedElements.push(svg);
  return svg;
}

// Import panel CSS as an inline string so computed styles resolve in the browser.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — ?inline is a Vite-specific query not typed in tsconfig
const panelCssModule = import('../styles/panel.css?inline');

async function injectPanelCss(): Promise<void> {
  const panelCss: string = ((await panelCssModule) as { default: string }).default;
  injectStyle(panelCss);
}

function cleanupAll(): void {
  for (const el of injectedStyles) el.remove();
  for (const el of injectedElements) el.remove();
  injectedStyles = [];
  injectedElements = [];
}

beforeEach(() => {
  injectedStyles = [];
  injectedElements = [];
  document.documentElement.style.cssText = '';
  document.body.style.cssText = '';
});

afterEach(() => {
  cleanupAll();
  document.documentElement.style.removeProperty('font-size');
});

// ---------------------------------------------------------------------------
// F33 — Panel chrome survives full hostile CSS environment
//
// For each test: hostile CSS injected FIRST (real deployment order) so the
// panel CSS (injected second) operates as it does in production — resolving
// its declarations later in the author cascade.
// ---------------------------------------------------------------------------

describe('F33 — panel chrome survives full hostile CSS environment', () => {
  async function setupHostile(): Promise<void> {
    // Real deployment order: host CSS first, panel CSS injected at runtime
    // after. The panel CSS declarations win via cascade position (later) or
    // higher specificity (:where scope + class vs bare element/universal).
    injectStyle(HOSTILE_CSS);
    await injectPanelCss();
  }

  // -------------------------------------------------------------------------
  // box-sizing: border-box survives * { box-sizing: content-box }
  // -------------------------------------------------------------------------

  describe('box-sizing reset', () => {
    it('.tokenpanel-shell descendant computes border-box despite * { box-sizing: content-box }', async () => {
      await setupHostile();
      const shell = createElement('tokenpanel-shell');
      const inner = createElement('tokenpanel-body', 'div', shell);
      // The panel's :where scoped box-sizing reset (panel.css) is injected
      // AFTER hostile CSS; at equal specificity (0), later cascade wins.
      expect(getComputedStyle(inner).boxSizing).toBe('border-box');
    });

    it('.tokenpanel-shell root itself computes border-box', async () => {
      await setupHostile();
      const shell = createElement('tokenpanel-shell');
      expect(getComputedStyle(shell).boxSizing).toBe('border-box');
    });
  });

  // -------------------------------------------------------------------------
  // Tab-section heading — div[role=heading] unaffected by h-tag resets
  //
  // The hostile CSS targets `h1-h6` elements. Panel headings are `div`s with
  // `role="heading"`, so hostile h-tag rules cannot reach them. Additionally,
  // panel CSS declares explicit px values (not rem) so the 20px root
  // font-size change does not warp any panel text metrics.
  // -------------------------------------------------------------------------

  describe('tab-section heading — px metrics stable despite h-tag resets + 20px root', () => {
    it('font-size stays 13px despite h-tag { font-size: 4rem !important } and root 20px', async () => {
      await setupHostile();
      const shell = createElement('tokenpanel-shell');
      const heading = createElement('tokenpanel-tab-section-heading', 'div', shell);
      // h1-h6 { font-size: 4rem !important } at 20px root = 80px. The heading is
      // a div, so the h-selector never matches. Panel CSS sets font-size: 13px
      // (absolute px); immune to root font-size changes.
      expect(getComputedStyle(heading).fontSize).toBe('13px');
    });

    it('margin stays 0 despite h-tag { margin: 2rem 0 !important }', async () => {
      await setupHostile();
      const shell = createElement('tokenpanel-shell');
      const heading = createElement('tokenpanel-tab-section-heading', 'div', shell);
      // 2rem at 20px root = 40px. Again: div, not h-element → no match.
      // Panel CSS sets margin: 0 on this class.
      expect(getComputedStyle(heading).marginTop).toBe('0px');
      expect(getComputedStyle(heading).marginBottom).toBe('0px');
    });
  });

  // -------------------------------------------------------------------------
  // SVG fill defensive reset
  //
  // The panel ships a scoped defensive reset on `:where(.tokenpanel-shell) svg`
  // with `fill: currentColor !important`. This is the only mechanism that can
  // beat a hostile `svg { fill: red !important }` at the same specificity
  // (0-0-1): both carry !important, but the panel CSS is injected LATER in
  // the cascade, so the later !important declaration wins at equal specificity.
  //
  // Deliberately removing `!important` from the panel reset makes this test
  // fail — proving the gate catches the regression. (Verify then revert.)
  // -------------------------------------------------------------------------

  describe('SVG fill defensive reset', () => {
    it('SVG fill inside .tokenpanel-shell is not red despite svg { fill: red !important }', async () => {
      await setupHostile();
      const shell = createElement('tokenpanel-shell');
      // Set an explicit color on the shell so currentColor is predictable and
      // distinct from red — this makes the assertion unambiguous.
      shell.style.color = 'rgb(184, 184, 184)';
      const svg = createSvgInside(shell);

      const fillValue = getComputedStyle(svg).fill;
      // The panel's fill: currentColor !important wins over hostile fill: red !important
      // because the panel CSS is injected later (same specificity, same !important).
      expect(fillValue).not.toBe('rgb(255, 0, 0)');
      // Verify it resolves to the shell's own currentColor, not an arbitrary color.
      expect(fillValue).toBe('rgb(184, 184, 184)');
    });

    it('SVG fill inside a nested panel element is also protected', async () => {
      await setupHostile();
      const shell = createElement('tokenpanel-shell');
      shell.style.color = 'rgb(184, 184, 184)';
      // Nest one level deeper to confirm the :where scope covers descendants.
      const header = createElement('tokenpanel-header', 'div', shell);
      header.style.color = 'rgb(136, 136, 136)';
      const svg = createSvgInside(header);

      const fillValue = getComputedStyle(svg).fill;
      expect(fillValue).not.toBe('rgb(255, 0, 0)');
      // Nested element's currentColor inherits from .tokenpanel-header, not shell.
      expect(fillValue).toBe('rgb(136, 136, 136)');
    });
  });

  // -------------------------------------------------------------------------
  // role=button div — hostile button/p/ul/li resets do not apply to divs
  // -------------------------------------------------------------------------

  describe('role=button div chrome — unaffected by hostile element-tag resets', () => {
    it('.tokenpanel-close-btn background stays transparent (hostile button resets do not reach divs)', async () => {
      await setupHostile();
      const shell = createElement('tokenpanel-shell');
      const btn = createElement('tokenpanel-close-btn', 'div', shell);
      // Hostile button/p/ul/li rules target element tag names; this div does not match.
      // panel.css sets background: none → computed as rgba(0, 0, 0, 0).
      expect(getComputedStyle(btn).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    });

    it('.tokenpanel-close-btn padding stays 0 (no hostile universal padding rule)', async () => {
      await setupHostile();
      const shell = createElement('tokenpanel-shell');
      const btn = createElement('tokenpanel-close-btn', 'div', shell);
      // Hostile p/ul/li/table { padding: 2rem !important } — div, not matched.
      expect(getComputedStyle(btn).paddingTop).toBe('0px');
    });
  });
});

// ---------------------------------------------------------------------------
// F24 — Transform-ancestor: panel shell position:fixed survives
//
// Common containing-block trap: CSS `transform`, `filter`, `perspective`,
// `will-change: transform/filter`, `contain: paint/layout/strict`, or
// `content-visibility: auto/hidden` on an ancestor of a `position:fixed`
// element causes the fixed element to resolve against that ancestor instead
// of the viewport.
//
// The panel appends its root div directly to `document.body` in `ensureMounted()`
// (index.tsx). This means the panel root is a SIBLING of host page content
// elements that may carry transforms, NOT a descendant. A sibling's transform
// does not create a containing block for its sibling's descendants.
//
// These tests verify:
//   1. The architecture protects against transform-ancestor trapping (sibling case).
//   2. The trap IS real (inner-element case) — so the protection test is not a no-op.
//
// Known limitation (not tested): if `body` or `html` itself carries a transform
// (e.g. `html { filter: invert(1) }` dark-mode hacks), all fixed elements inside
// body are trapped. See hostile-host.mdx §Transform-ancestor note (F24).
// ---------------------------------------------------------------------------

describe('F24 — panel position:fixed resolves against viewport, not transform ancestor', () => {
  it('panel shell outside transform ancestor is at expected viewport coordinates', async () => {
    await injectPanelCss();
    // Normalize body margin so coordinates are predictable.
    document.body.style.margin = '0';
    document.body.style.padding = '0';

    // Create a transform trap somewhere in the host page content.
    // A host div with CSS transform that would trap position:fixed descendants.
    const trapAncestor = document.createElement('div');
    trapAncestor.style.transform = 'translateZ(0)';
    trapAncestor.style.position = 'absolute';
    trapAncestor.style.top = '300px';
    trapAncestor.style.left = '300px';
    trapAncestor.style.width = '200px';
    trapAncestor.style.height = '200px';
    document.body.appendChild(trapAncestor);
    injectedElements.push(trapAncestor);

    // Panel root appended directly to body — SIBLING of the trap, not inside it.
    // This mirrors the real panel architecture (ensureMounted → body.appendChild).
    const shell = createElement('tokenpanel-shell');
    shell.style.position = 'fixed';
    shell.style.top = '50px';
    shell.style.left = '80px';
    shell.style.width = '300px';
    shell.style.height = '200px';

    const rect = shell.getBoundingClientRect();
    // Shell resolves against the viewport (not the trap ancestor).
    // If the shell were inside the trap, top would be ~350 and left ~380.
    expect(rect.top).toBe(50);
    expect(rect.left).toBe(80);
  });

  it('element INSIDE transform ancestor is trapped — confirms the protective architecture is meaningful', async () => {
    await injectPanelCss();
    document.body.style.margin = '0';
    document.body.style.padding = '0';

    // A transform ancestor: position:fixed descendants resolve against it.
    const trapAncestor = document.createElement('div');
    trapAncestor.style.transform = 'translateZ(0)';
    trapAncestor.style.position = 'absolute';
    trapAncestor.style.top = '300px';
    trapAncestor.style.left = '300px';
    trapAncestor.style.width = '500px';
    trapAncestor.style.height = '500px';
    document.body.appendChild(trapAncestor);
    injectedElements.push(trapAncestor);

    // Trapped element: position:fixed INSIDE the ancestor.
    const trapped = document.createElement('div');
    trapped.style.position = 'fixed';
    trapped.style.top = '0';
    trapped.style.left = '0';
    trapAncestor.appendChild(trapped);
    injectedElements.push(trapped);

    const rect = trapped.getBoundingClientRect();
    // The element resolves against the ancestor box (top=300, left=300 in viewport)
    // rather than the viewport (which would give top=0, left=0).
    // This confirms the transform trap IS active — so the sibling test above
    // is meaningful (not a false negative from the trap not working).
    expect(rect.top).toBe(300);
    expect(rect.left).toBe(300);
  });
});
