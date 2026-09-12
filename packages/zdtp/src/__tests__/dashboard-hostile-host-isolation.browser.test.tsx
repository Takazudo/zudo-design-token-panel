// @vitest-environment browser
/**
 * #943: static dashboard isolation from host-global CSS.
 *
 * The clean snapshot is captured before the hostile stylesheet exists. The
 * hostile snapshot is rendered after the host rules and then the dashboard
 * stylesheet are injected, matching the runtime deployment order.
 *
 * Hostile rules covered by this gate:
 *   body { font-family: Georgia, serif; letter-spacing: .08em }
 *   div { line-height: 2.2; text-transform: uppercase }
 *   span { font-style: italic; letter-spacing: .2em }
 *   * { box-sizing: content-box }
 *   svg { fill: red !important }
 *   :root { color-scheme: dark }
 *
 * Reset additions discovered by this gate:
 *   - None. The dashboard's existing scoped resets cover these selectors.
 */

import { renderToString } from 'preact-render-to-string';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TokenDashboard } from '../dashboard';
import type { TabConfig } from '../tokens/tier-model';
// @ts-ignore — Vite supplies stylesheet text for browser verification.
import dashboardCss from '../dashboard/styles.css?inline';

const HOSTILE_CSS = `
  body { font-family: Georgia, serif; letter-spacing: .08em; }
  div { line-height: 2.2; text-transform: uppercase; }
  span { font-style: italic; letter-spacing: .2em; }
  * { box-sizing: content-box; }
  svg { fill: red !important; }
  :root { color-scheme: dark; }
`;

const FIXTURE_TABS: readonly TabConfig[] = [{
  id: 'hostile-fixture',
  label: 'Hostile fixture',
  tiers: [
    {
      id: 'colors',
      label: 'Colors',
      items: [{
        id: 'surface',
        label: 'Surface color',
        cssVar: '--dashboard-hostile-color',
        default: '#2f6caa',
        type: { kind: 'color', format: 'hex' },
      }],
    },
    {
      id: 'lengths',
      label: 'Lengths',
      preview: 'bar',
      items: [{
        id: 'space',
        label: 'Content spacing',
        cssVar: '--dashboard-hostile-length',
        default: '32px',
        type: { kind: 'length', step: 1, unit: 'px' },
      }],
    },
    {
      id: 'text',
      label: 'Text',
      items: [{
        id: 'copy',
        label: 'Body copy',
        cssVar: '--dashboard-hostile-text',
        default: 'Body copy',
        type: { kind: 'text' },
      }],
    },
    {
      id: 'font',
      label: 'Font',
      preview: 'family',
      items: [{
        id: 'body',
        label: 'Body font',
        cssVar: '--dashboard-hostile-font',
        default: 'Arial, sans-serif',
        type: { kind: 'text' },
      }],
    },
  ],
}];

const PROPERTIES = [
  'font-family',
  'font-size',
  'line-height',
  'letter-spacing',
  'text-transform',
  'font-style',
  'box-sizing',
  'background-color',
  'color',
] as const;

type Snapshot = Record<string, Record<(typeof PROPERTIES)[number], string>>;

const TARGETS = {
  title: '.zdtp-dashboard__title',
  tokenName: '[data-css-var="--dashboard-hostile-color"] .zdtp-dashboard__name',
  tokenValue: '[data-css-var="--dashboard-hostile-length"] .zdtp-dashboard__value',
  specimen: '[data-css-var="--dashboard-hostile-font"] .zdtp-dashboard__sample--family',
  specimenSurface: '[data-css-var="--dashboard-hostile-font"] .zdtp-dashboard__specimen',
} as const;

let mountedHosts: HTMLDivElement[] = [];
let mountedStyles: HTMLStyleElement[] = [];

function required<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Expected ${selector}`);
  return element;
}

function injectStyle(css: string): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
  mountedStyles.push(style);
  return style;
}

function mountDashboard(chrome: 'light' | 'dark', hostile: boolean): HTMLElement {
  if (hostile) injectStyle(HOSTILE_CSS);
  injectStyle(dashboardCss);

  const host = document.createElement('div');
  host.style.width = '720px';
  host.innerHTML = renderToString(
    <TokenDashboard
      tabs={FIXTURE_TABS}
      chrome={chrome}
      title="Dashboard isolation fixture"
      previewText="A specimen sentence demonstrates the font tier preview."
    />,
  );
  document.body.append(host);
  mountedHosts.push(host);
  return required<HTMLElement>(host, '.zdtp-dashboard');
}

function snapshot(root: ParentNode): Snapshot {
  return Object.fromEntries(
    Object.entries(TARGETS).map(([name, selector]) => {
      const style = getComputedStyle(required(root, selector));
      return [name, Object.fromEntries(PROPERTIES.map((property) => [property, style.getPropertyValue(property).trim()]))];
    }),
  ) as Snapshot;
}

beforeEach(() => {
  mountedHosts = [];
  mountedStyles = [];
  document.documentElement.removeAttribute('style');
  document.body.removeAttribute('style');
});

afterEach(() => {
  for (const host of mountedHosts) host.remove();
  for (const style of mountedStyles) style.remove();
  mountedHosts = [];
  mountedStyles = [];
  document.documentElement.removeAttribute('style');
  document.body.removeAttribute('style');
});

describe('dashboard hostile-host CSS isolation', () => {
  it.each(['light', 'dark'] as const)('keeps dashboard metrics and surfaces stable in %s chrome', (chrome) => {
    // Capture a genuinely clean render before adding any hostile selectors.
    const clean = snapshot(mountDashboard(chrome, false));

    // Remove the clean document and stylesheet before constructing the second
    // render, so the two snapshots cannot accidentally share hostile styling.
    for (const host of mountedHosts) host.remove();
    for (const style of mountedStyles) style.remove();
    mountedHosts = [];
    mountedStyles = [];

    const hostile = snapshot(mountDashboard(chrome, true));

    // Guard against a vacuous comparison if the fixture or its CSS stops
    // rendering the intended surfaces.
    expect(clean.title['font-size']).toBe('22px');
    expect(clean.tokenValue['font-size']).toBe('12px');
    expect(clean.specimen['font-size']).toBe('18px');
    expect(clean.specimen['font-family']).toContain('Arial');
    expect(clean.title['box-sizing']).toBe('border-box');
    expect(clean.specimenSurface['box-sizing']).toBe('border-box');

    expect(hostile).toEqual(clean);
  });
});
