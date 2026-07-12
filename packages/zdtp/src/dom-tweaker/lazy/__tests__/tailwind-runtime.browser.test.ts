// @vitest-environment browser

import { afterEach, describe, expect, it } from 'vitest';
import { ensureRuntime } from '../tailwind-runtime';

const THEME_CSS = `
@theme {
  --color-brand: #7c3aed;
}
`;

let injectedStyles: HTMLStyleElement[] = [];
let injectedElements: Element[] = [];

function injectStyle(css: string): HTMLStyleElement {
  const el = document.createElement('style');
  el.textContent = css;
  document.head.append(el);
  injectedStyles.push(el);
  return el;
}

function createElement(opts: {
  tag?: string;
  className?: string;
  text?: string;
  style?: string;
}): HTMLElement {
  const el = document.createElement(opts.tag ?? 'div');
  if (opts.className) el.className = opts.className;
  if (opts.text) el.textContent = opts.text;
  if (opts.style) el.setAttribute('style', opts.style);
  document.body.append(el);
  injectedElements.push(el);
  return el;
}

function cleanupFixture(): void {
  for (const el of injectedStyles) el.remove();
  for (const el of injectedElements) el.remove();
  injectedStyles = [];
  injectedElements = [];
  document.body.removeAttribute('style');
  document.body.removeAttribute('class');
  document.documentElement.removeAttribute('style');
}

afterEach(() => {
  cleanupFixture();
});

describe.sequential('DOM Tweaker Tailwind runtime', () => {
  it('compiles purged utilities without preflight, preserves host styles, and bridges themeCss', async () => {
    injectStyle(`
      @layer theme, base, components, utilities;

      @layer theme {
        :root {
          --spacing: 0.25rem;
        }
      }

      @layer components {
        body {
          background: rgb(243 244 246);
          color: rgb(17 24 39);
        }
      }

      @layer utilities {
        .px-2 {
          padding-inline: calc(var(--spacing) * 2);
        }
      }
    `);

    const purged = createElement({ className: 'px-24' });
    const themed = createElement({ className: 'bg-brand' });
    const heading = createElement({ tag: 'h1', text: 'No preflight canary' });
    const beforeBodyStyle = getComputedStyle(document.body);
    const beforeBackground = beforeBodyStyle.backgroundColor;
    const beforeColor = beforeBodyStyle.color;
    const beforeHeadingRatio = fontSizeRatio(heading, document.body);

    expect(getComputedStyle(purged).paddingLeft).toBe('0px');
    expect(beforeHeadingRatio).toBeCloseTo(2, 3);

    const handle = await ensureRuntime({ themeCss: THEME_CSS });

    expect(handle.ready).toBe(true);
    expect(handle.styleElement.type).toBe('text/tailwindcss');
    expect(handle.styleElement.textContent).toContain(
      '@import "tailwindcss/theme.css" layer(theme);',
    );
    expect(handle.styleElement.textContent).toContain(
      '@import "tailwindcss/utilities.css" layer(utilities);',
    );
    expect(handle.styleElement.textContent).not.toContain('@import "tailwindcss";');
    expect(handle.styleElement.textContent).not.toContain('preflight');

    await waitForComputedStyle(purged, (style) => style.paddingLeft, '96px');
    await waitForComputedStyle(themed, (style) => style.backgroundColor, 'rgb(124, 58, 237)');

    const afterBodyStyle = getComputedStyle(document.body);
    expect(afterBodyStyle.backgroundColor).toBe(beforeBackground);
    expect(afterBodyStyle.color).toBe(beforeColor);
    expect(fontSizeRatio(heading, document.body)).toBeCloseTo(2, 3);
  });

  it('compiles unseen classes added after readiness', async () => {
    await ensureRuntime({ themeCss: THEME_CSS });
    const el = createElement({ className: '' });

    expect(getComputedStyle(el).marginTop).toBe('0px');
    el.className = 'mt-12';

    await waitForComputedStyle(el, (style) => style.marginTop, '48px');
  });

  it('memoizes the page-lifetime singleton and creates one Tailwind input style', async () => {
    const first = await ensureRuntime({ themeCss: THEME_CSS });
    const second = await ensureRuntime({
      themeCss: '@theme { --color-ignored-after-first-call: #000; }',
    });

    expect(second).toBe(first);
    expect(document.querySelectorAll('style[data-zdtp-dom-tweaker-tailwind-runtime]')).toHaveLength(
      1,
    );
  });
});

function fontSizeRatio(el: Element, parent: Element): number {
  return (
    Number.parseFloat(getComputedStyle(el).fontSize) /
    Number.parseFloat(getComputedStyle(parent).fontSize)
  );
}

async function waitForComputedStyle(
  el: Element,
  read: (style: CSSStyleDeclaration) => string,
  expected: string,
): Promise<void> {
  const startedAt = performance.now();

  while (performance.now() - startedAt < 2_000) {
    const actual = read(getComputedStyle(el));
    if (actual === expected) return;
    await new Promise((resolve) => window.setTimeout(resolve, 25));
  }

  expect(read(getComputedStyle(el))).toBe(expected);
}
