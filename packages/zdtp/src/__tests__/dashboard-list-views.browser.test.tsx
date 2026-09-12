// @vitest-environment browser
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderToString } from 'preact-render-to-string';
import { TokenDashboard } from '../dashboard';
import type { TabConfig, TierItem } from '../tokens/tier-model';
// @ts-ignore — Vite supplies stylesheet text for browser verification.
import dashboardCss from '../dashboard/styles.css?inline';

const item = (id: string, value: string, color = false): TierItem => ({
  id, label: id, cssVar: `--view-${id}`, default: value, type: { kind: color ? 'color' : 'text' },
});
const tabs: TabConfig[] = [{ id: 'specimens', label: 'Specimens', tiers: [
  { id: 'space', label: 'Spacing', preview: 'bar', items: [
    item('zero', '0'), item('small', '16px'), item('rem', '2rem'), item('large', '1536px'),
    item('alias', 'var(--view-large)'), item('negative', '-8px'), item('percentage', '50%'),
  ] },
  { id: 'size', label: 'Size', preview: 'size', items: [item('size', '24px'), item('display', '96px')] },
  { id: 'leading', label: 'Leading', preview: 'line-height', previewBase: '--view-size', items: [item('leading', '1.8')] },
  { id: 'family', label: 'Family', preview: 'family', items: [item('family', 'serif')] },
  { id: 'weight', label: 'Weight', preview: 'weight', items: [item('weight', '700')] },
  { id: 'ramp', label: 'Ramp', items: [item('ramp-a', '#fff', true), item('ramp-b', '#888', true), item('ramp-c', '#000', true)] },
] }];
const text = 'Read several lines and compare the room between them. '.repeat(4)
  + '\n\n好きな文章で行間を確認します。\n<img src=x onerror=alert(1)> ' + 'UnbrokenWord'.repeat(25);
const modeTabs: TabConfig[] = [
  { id: 'colors', label: 'Colors', tiers: [
    { id: 'mixed', label: 'Mixed colors', items: [
      item('fixed', '#3a6b9c', true),
      { ...item('themed', '#777', true), modes: { light: 'var(--view-fixed)', dark: '#202938' } },
      item('parsed', 'light-dark(#f4f4f4, #1f1f1f)', true),
    ] },
    { id: 'aliases', label: 'Aliases', referencesTier: 'mixed', items: [item('themed-alias', 'themed', true)] },
    { id: 'semantic', label: 'Semantic', semantic: true, items: [item('semantic', '#777', true)] },
  ], colorExtras: {
    id: 'colors', baseRoles: {}, baseDefaults: {}, colorSchemes: {}, defaultShikiTheme: 'none',
    panelSettings: { colorMode: false, colorScheme: 'none' },
    semanticDefaults: { semantic: { literal: { light: '#fff', dark: '#111' } } },
  } },
  { id: 'layout', label: 'Layout', tiers: [
    { id: 'size', label: 'Size', preview: 'size', items: [item('size', '24px')] },
    { id: 'space', label: 'Spacing', preview: 'bar', items: [item('space', '32px')] },
    { id: 'radius', label: 'Radius', preview: 'radius', items: [item('radius', '8px')] },
  ] },
];
let host: HTMLDivElement;
let style: HTMLStyleElement;
let rootFontSize: string;

beforeEach(() => {
  rootFontSize = document.documentElement.style.fontSize;
  document.documentElement.style.fontSize = '16px';
  style = document.createElement('style');
  style.textContent = 'span { font-size:80px; margin:90px; padding:50px; color:red } :focus { outline:none }' + dashboardCss;
  document.head.append(style);
  host = document.createElement('div');
  host.style.width = '300px';
  host.innerHTML = renderToString(<TokenDashboard tabs={tabs} previewText={text} previewOverrides={{ '--view-ramp-b': 'text' }} />);
  document.body.append(host);
});
afterEach(() => {
  host.remove(); style.remove(); document.documentElement.style.fontSize = rootFontSize;
});
function sample(id: string, kind: string): HTMLElement {
  return host.querySelector(`[data-css-var="--view-${id}"] .zdtp-dashboard__sample--${kind}`)!;
}
function required(root: ParentNode, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Expected ${selector}`);
  return element;
}
function regionFor(root: ParentNode, id: string): HTMLElement {
  return required(root, `[data-css-var="--view-${id}"]`).closest<HTMLElement>('.zdtp-dashboard__region')!;
}
function colorPaint(root: ParentNode, id: string) {
  const region = getComputedStyle(regionFor(root, id));
  const card = required(root, `[data-css-var="--view-${id}"]`);
  const specimen = getComputedStyle(required(card, '.zdtp-dashboard__specimen'));
  return {
    surface: region.backgroundColor,
    foreground: region.color,
    checkerboard: specimen.backgroundImage,
    sample: getComputedStyle(required(card, '.zdtp-dashboard__sample--color')).backgroundColor,
  };
}

describe('static dashboard list-view geometry', () => {
  it('preserves zero, large lengths and aliases inside a compact host without shrinking', () => {
    for (const [id, width] of [['zero', 0], ['small', 16], ['rem', 32], ['large', 1536], ['alias', 1536]] as const) {
      expect(sample(id, 'bar').getBoundingClientRect().width).toBe(width);
    }
    expect(sample('negative', 'bar')).toBeNull();
    expect(sample('percentage', 'bar')).toBeNull();
    document.documentElement.style.fontSize = '20px';
    expect(sample('rem', 'bar').getBoundingClientRect().width).toBe(40);
    expect(host.scrollWidth).toBe(host.clientWidth);
  });

  it('provides a named, focus-visible local scroll region for an oversized ruler', () => {
    const scroll = sample('large', 'bar').closest<HTMLElement>('[tabindex="0"]')!;
    expect(scroll.getAttribute('aria-label')).toBeTruthy();
    expect(scroll.scrollWidth).toBeGreaterThan(scroll.clientWidth);
    scroll.focus();
    expect(document.activeElement).toBe(scroll);
    expect(getComputedStyle(scroll).outlineStyle).not.toBe('none');
    scroll.scrollLeft = 256;
    expect(scroll.scrollLeft).toBe(256);
  });

  it('shows complete multiline specimens with the intended font property and base size', () => {
    expect(getComputedStyle(sample('size', 'size')).fontSize).toBe('24px');
    expect(getComputedStyle(sample('leading', 'line-height')).lineHeight).toBe('43.2px');
    expect(getComputedStyle(sample('family', 'family')).fontFamily).toBe('serif');
    expect(getComputedStyle(sample('weight', 'weight')).fontWeight).toBe('700');
    for (const [id, kind] of [['size', 'size'], ['display', 'size'], ['leading', 'line-height']]) {
      const el = sample(id, kind);
      expect(el.textContent).toBe(text);
      expect(el.getBoundingClientRect().height).toBeGreaterThan(88);
      expect(el.scrollHeight).toBeLessThanOrEqual(el.clientHeight + 1);
    }
    expect(host.querySelector('img, script')).toBeNull();
    expect(host.scrollWidth).toBe(host.clientWidth);
  });

  it('keeps overridden ramp stops in one ordered strip with readable metadata', () => {
    const strip = host.querySelector('.zdtp-dashboard__palette')!;
    expect([...strip.querySelectorAll('[data-css-var]')].map(el => el.getAttribute('data-css-var')))
      .toEqual(['--view-ramp-a', '--view-ramp-b', '--view-ramp-c']);
    const stops = [...strip.querySelectorAll<HTMLElement>('[role="listitem"]')];
    expect(new Set(stops.map(el => el.getBoundingClientRect().top)).size).toBe(1);
    expect(stops[1].textContent).toContain('#888');
    expect(stops[1].querySelector('.zdtp-dashboard__sample--color')).toBeNull();
  });
});

describe('dashboard mode regions', () => {
  it('keeps empty and fully filtered inventories in the shell scheme on a dark host', () => {
    host.style.colorScheme = 'dark';
    host.style.backgroundColor = '#111';
    for (const [data, message] of [[[], 'No tokens declared.'], [tabs, 'No tokens match this view.']] as const) {
      host.innerHTML = renderToString(<TokenDashboard tabs={data} mode="host" chrome="light" include="mode-dependent" />);
      const header = required(host, '.zdtp-dashboard__header');
      const empty = required(host, '.zdtp-dashboard__empty');
      expect(empty.textContent).toBe(message);
      expect(getComputedStyle(empty).colorScheme).toBe('light');
      expect(getComputedStyle(empty).backgroundColor).toBe(getComputedStyle(header).backgroundColor);
      expect(required(host, '.zdtp-dashboard__count').textContent).toBe('0 tokens');
      expect(host.querySelector('.zdtp-dashboard__region')).toBeNull();
    }
  });

  it('paints dark dependent rows beside a light shell and independent specimens', () => {
    host.style.colorScheme = 'light';
    host.innerHTML = renderToString(<>
      <TokenDashboard id="mixed" tabs={modeTabs} mode="dark" chrome="light" />
      <TokenDashboard id="dark-chrome" tabs={modeTabs} chrome="dark" include="mode-independent" />
    </>);
    const root = required(host, '#mixed');
    const header = required(root, '.zdtp-dashboard__header');
    const dependent = regionFor(root, 'themed');
    const independent = regionFor(root, 'fixed');
    const darkHeader = required(host, '#dark-chrome .zdtp-dashboard__header');
    expect([...root.querySelectorAll('.zdtp-dashboard__region')]).toEqual([dependent, independent]);
    expect(getComputedStyle(root).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(header).colorScheme).toBe('light');
    expect(getComputedStyle(dependent).colorScheme).toBe('dark');
    expect(getComputedStyle(dependent).backgroundColor).toBe(getComputedStyle(darkHeader).backgroundColor);
    expect(getComputedStyle(independent).backgroundColor).toBe(getComputedStyle(header).backgroundColor);
    expect(getComputedStyle(dependent).backgroundColor).not.toBe(getComputedStyle(header).backgroundColor);
    expect(colorPaint(root, 'themed').sample).toBe('rgb(32, 41, 56)');
    expect(colorPaint(root, 'fixed').sample).toBe('rgb(58, 107, 156)');
    expect(colorPaint(root, 'themed').checkerboard).toContain('repeating-conic-gradient');
    expect(colorPaint(root, 'themed').checkerboard).not.toBe(colorPaint(root, 'fixed').checkerboard);

    for (const id of ['size', 'radius']) {
      const specimen = required(root, `[data-css-var="--view-${id}"] .zdtp-dashboard__specimen`);
      expect(specimen.style.colorScheme).toBe('light');
      expect(getComputedStyle(specimen).backgroundColor).toBe('rgb(238, 241, 245)');
      expect(getComputedStyle(specimen).color).toBe('rgb(24, 33, 49)');
    }
    const tabBlocks = [...independent.querySelectorAll<HTMLElement>('.zdtp-dashboard__tab')];
    expect(tabBlocks).toHaveLength(2);
    expect(tabBlocks[1].getBoundingClientRect().top - tabBlocks[0].getBoundingClientRect().bottom).toBeCloseTo(32, 1);
    expect(host.scrollWidth).toBe(host.clientWidth);
  });

  it('inherits host mode through a light shell and updates surfaces, checkerboards and aliases after mount', () => {
    host.style.colorScheme = 'dark';
    host.innerHTML = renderToString(<>
      <TokenDashboard id="host-mode" tabs={modeTabs} mode="host" chrome="light" />
      <TokenDashboard id="light-mode" tabs={modeTabs} mode="light" include="mode-dependent" />
      <TokenDashboard id="dark-mode" tabs={modeTabs} mode="dark" include="mode-dependent" />
    </>);
    const root = required(host, '#host-mode');
    const light = required(host, '#light-mode');
    const dark = required(host, '#dark-mode');
    const inventory = required(root, '.zdtp-dashboard__inventory');
    const header = required(root, '.zdtp-dashboard__header');
    const dependent = regionFor(root, 'themed');
    const independent = regionFor(root, 'fixed');
    const specimen = required(dependent, '[data-css-var="--view-themed"] .zdtp-dashboard__specimen');
    expect(dependent.dataset.scheme).toBe('host');
    expect(specimen.style.colorScheme).toBe('inherit');
    for (const element of [root, inventory, dependent, specimen]) expect(getComputedStyle(element).colorScheme).toBe('dark');
    expect(getComputedStyle(header).colorScheme).toBe('light');
    expect(getComputedStyle(independent).colorScheme).toBe('light');
    const shellBackground = getComputedStyle(header).backgroundColor;
    const independentPaint = colorPaint(root, 'fixed');
    const darkPaint = colorPaint(root, 'themed');
    expect(darkPaint.checkerboard).not.toBe('none');
    for (const id of ['themed', 'themed-alias', 'parsed', 'semantic']) {
      expect(colorPaint(root, id)).toEqual(colorPaint(dark, id));
    }

    host.style.colorScheme = 'light';

    expect(required(root, '[data-css-var="--view-themed"] .zdtp-dashboard__specimen')).toBe(specimen);
    for (const element of [root, inventory, dependent, specimen]) expect(getComputedStyle(element).colorScheme).toBe('light');
    for (const id of ['themed', 'themed-alias', 'parsed', 'semantic']) {
      expect(colorPaint(root, id)).toEqual(colorPaint(light, id));
    }
    const lightPaint = colorPaint(root, 'themed');
    expect(lightPaint.surface).not.toBe(darkPaint.surface);
    expect(lightPaint.checkerboard).not.toBe(darkPaint.checkerboard);
    expect(lightPaint.sample).toBe('rgb(58, 107, 156)');
    expect(getComputedStyle(header).backgroundColor).toBe(shellBackground);
    expect(colorPaint(root, 'fixed')).toEqual(independentPaint);
  });

  it('composes one copy of dependent rows per mode and one total copy of independent rows', () => {
    host.innerHTML = renderToString(<>
      <TokenDashboard id="light-only" tabs={modeTabs} mode="light" include="mode-dependent" />
      <TokenDashboard id="dark-only" tabs={modeTabs} mode="dark" include="mode-dependent" />
      <TokenDashboard id="independent-only" tabs={modeTabs} include="mode-independent" />
    </>);
    const dependentVars = ['--view-themed', '--view-parsed', '--view-themed-alias', '--view-semantic'];
    const independentVars = ['--view-fixed', '--view-size', '--view-space', '--view-radius'];
    for (const [id, expected] of [['light-only', dependentVars], ['dark-only', dependentVars], ['independent-only', independentVars]] as const) {
      const root = required(host, `#${id}`);
      expect([...root.querySelectorAll('[data-css-var]')].map((row) => row.getAttribute('data-css-var'))).toEqual(expected);
      expect(root.querySelectorAll('.zdtp-dashboard__region')).toHaveLength(1);
      expect(required(root, '.zdtp-dashboard__count').textContent).toBe(`${expected.length} tokens`);
      expect(required(root, '.zdtp-dashboard__inventory').style.getPropertyValue('--view-fixed')).toBe('#3a6b9c');
    }
    const fixtureVars = modeTabs.flatMap((tab) => tab.tiers.flatMap((tier) => tier.items.map((entry) => entry.cssVar)));
    expect(new Set([...dependentVars, ...independentVars])).toEqual(new Set(fixtureVars));
    for (const cssVar of fixtureVars) {
      const cards = [...host.querySelectorAll(`[data-css-var="${cssVar}"]`)];
      expect(cards).toHaveLength(dependentVars.includes(cssVar) ? 2 : 1);
      expect(cards.map((card) => card.closest('.zdtp-dashboard')!.id))
        .toEqual(dependentVars.includes(cssVar) ? ['light-only', 'dark-only'] : ['independent-only']);
    }
    expect(colorPaint(required(host, '#light-only'), 'themed-alias').sample).toBe('rgb(58, 107, 156)');
    expect(colorPaint(required(host, '#dark-only'), 'themed-alias').sample).toBe('rgb(32, 41, 56)');
  });
});
