/** Real Chromium regression for #861: overlapping host variables and an iframe sink. */

import { act } from 'preact/test-utils';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { __resetInstanceBindingsForTests } from '../index';
import { configurePanel, __resetPanelConfigForTests, panelRootId, type PanelConfig } from '../config/panel-config';
import { __resetHostMutationsForTests } from '../host/host-mutations';
import { flushEffects } from './_test-helpers';
import type { TabConfig } from '../tokens/tier-model';

const tab: TabConfig = {
  id: 'font', label: 'Font', tiers: [
    { id: 'family', label: 'Family', preview: 'family', items: [
      { id: 'family', label: 'Family', cssVar: '--spec-family', default: 'serif', type: { kind: 'text' } },
    ] },
    { id: 'weight', label: 'Weight', preview: 'weight', items: [
      { id: 'weight', label: 'Weight', cssVar: '--spec-weight', default: '400', type: { kind: 'number', step: 100 } },
    ] },
    { id: 'scale', label: 'Scale', preview: 'size', items: [
      { id: 'size', label: 'Size', cssVar: '--spec-size', default: '40px', type: { kind: 'length', unit: 'px', step: 1 } },
    ] },
    { id: 'semantic', label: 'Semantic', preview: 'size', referencesTier: 'scale', items: [
      { id: 'body', label: 'Body', cssVar: '--spec-body', default: 'size', type: { kind: 'text' } },
    ] },
    { id: 'leading', label: 'Leading', preview: 'line-height', items: [
      { id: 'leading', label: 'Leading', cssVar: '--spec-leading', default: '1.5', type: { kind: 'number', step: 0.1 } },
    ] },
  ],
};

function config(prefix: string, applySink?: PanelConfig['applySink']): PanelConfig {
  return { storagePrefix: prefix, consoleNamespace: prefix, modalClassPrefix: prefix,
    schemaId: `${prefix}/v1`, exportFilenameBase: prefix, tabs: [tab], applySink };
}

// @ts-ignore — Vite's inline CSS query is not part of the package tsconfig.
import panelCss from '../styles/panel.css?inline';

let fixtureStyles: HTMLStyleElement;
let sinkFrame: HTMLIFrameElement;

beforeEach(() => {
  __resetInstanceBindingsForTests();
  __resetPanelConfigForTests();
  __resetHostMutationsForTests();
  localStorage.clear();

  const host = document.createElement('style');
  fixtureStyles = host;
  host.id = 'specimen-host-vars';
  host.textContent = panelCss + ':root { --spec-size: 40px; --spec-body: 40px; --spec-family: serif; --spec-weight: 400; }';
  document.head.appendChild(host);
});

afterEach(async () => {
  __resetInstanceBindingsForTests();
  __resetHostMutationsForTests();
  __resetPanelConfigForTests();
  await flushEffects();

  fixtureStyles.remove();
  sinkFrame?.remove();
  localStorage.clear();
});

async function edit(root: HTMLElement, id: string, value: string) {
  const input = root.querySelector<HTMLInputElement>(`[data-testid="tier-item-${id}"] input:not([type="checkbox"])`)!;
  expect(input).not.toBeNull();
  await act(() => {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await flushEffects();
}

function assertSamples(root: Element, page: boolean, size: string, family: string, weight: string) {
  for (const id of ['size', 'body']) {
    const selector = page
      ? `[data-testid="on-page-specimen-size-${id}"] .tokenpanel-on-page-specimen-size-text`
      : `[data-testid="specimen-size-${id}"]`;
    const sample = root.querySelector<HTMLElement>(selector)!;
    expect(sample).not.toBeNull();
    expect(getComputedStyle(sample).fontSize).toBe(size);
    expect(getComputedStyle(sample).fontFamily).toBe(family);
    expect(getComputedStyle(sample).fontWeight).toBe(weight);
    expect(sample.getAttribute('style')).not.toContain('var(');
  }
  const leading = root.querySelector<HTMLElement>(page
    ? '.tokenpanel-on-page-specimen-line-height-text' : '.tokenpanel-specimen-line-height-text')!;
  expect(Number.parseFloat(getComputedStyle(leading).lineHeight)).toBeCloseTo(Number.parseFloat(getComputedStyle(leading).fontSize) * 1.5);
  expect(getComputedStyle(leading).fontFamily).toBe(family);
  expect(getComputedStyle(leading).fontWeight).toBe(weight);
}

function report(stage: string, a: Element, b: Element, portal?: Element) {
  function measure(root: Element, page = false) {
    const sample = root.querySelector(page
      ? '[data-testid="on-page-specimen-size-size"] .tokenpanel-on-page-specimen-size-text'
      : '[data-testid="specimen-size-size"]')!;
    const style = getComputedStyle(sample);
    return { size: style.fontSize, family: style.fontFamily, weight: style.fontWeight };
  }
  return JSON.stringify({ stage, A: measure(a), B: measure(b),
    ...(portal ? { BPortal: measure(portal, true) } : {}) });
}

it('keeps both renderers on their own configured instance, including a mounted sink portal', async ({ annotate }) => {
  const iframe = document.createElement('iframe');
  sinkFrame = iframe;
  // Wait for the iframe's own document before capturing its root: initial
  // about:blank navigation can otherwise replace the element the sink writes.
  await new Promise<void>((resolve) => {
    iframe.addEventListener('load', () => resolve(), { once: true });
    iframe.srcdoc = '<!doctype html><html><head></head><body></body></html>';
    document.body.appendChild(iframe);
  });
  const iframeRoot = iframe.contentDocument!.documentElement;
  const apply: NonNullable<PanelConfig['applySink']>['apply'] = (pairs) => {
    for (const [name, value] of pairs) iframeRoot.style.setProperty(name, value);
  };
  const a = config('specimen-a');
  const b = config('specimen-b', { apply, clear: (names) => {
    for (const name of names) iframeRoot.style.removeProperty(name);
  } });
  const handleA = configurePanel(a);
  const handleB = configurePanel(b);
  handleA.open();
  handleB.open();
  await flushEffects();
  const rootA = document.getElementById(panelRootId(a))!;
  const rootB = document.getElementById(panelRootId(b))!;

  assertSamples(rootA, false, '40px', 'serif', '400');
  assertSamples(rootB, false, '40px', 'serif', '400');
  await edit(rootB, 'size', '80');
  await edit(rootB, 'family', 'monospace');
  await edit(rootB, 'weight', '700');
  assertSamples(rootB, false, '80px', 'monospace', '700');
  assertSamples(rootA, false, '40px', 'serif', '400');
  expect(iframeRoot).toBe(iframe.contentDocument!.documentElement);
  expect(iframeRoot.style.getPropertyValue('--spec-size')).toBe('80px');
  expect(iframe.contentWindow!.getComputedStyle(iframeRoot).getPropertyValue('--spec-size').trim()).toBe('80px');
  expect(document.documentElement.style.getPropertyValue('--spec-size')).not.toBe('80px');

  await annotate(report('sink edited, in panel', rootA, rootB), 'measurement');
  await edit(rootA, 'family', 'Courier New');
  await edit(rootA, 'weight', '900');
  assertSamples(rootA, false, '40px', '"Courier New"', '900');
  assertSamples(rootB, false, '80px', 'monospace', '700');
  await annotate(report('host edited, in panel', rootA, rootB), 'measurement');

  const toggle = rootB.querySelector<HTMLInputElement>('[aria-label="Render on page"]')!;
  await act(() => toggle.click());
  await flushEffects();
  const portal = document.querySelector('[data-zdtp-specimen]')!;
  expect(portal).not.toBeNull();
  assertSamples(portal, true, '80px', 'monospace', '700');

  await edit(rootB, 'size', '48');
  await edit(rootB, 'family', 'sans-serif');
  await edit(rootB, 'weight', '900');
  expect(document.querySelector('[data-zdtp-specimen]')).toBe(portal);
  assertSamples(rootA, false, '40px', '"Courier New"', '900');
  await annotate(report('sink edited, retained portal', rootA, rootB, portal), 'measurement');
  assertSamples(portal, true, '48px', 'sans-serif', '900');
  assertSamples(rootB, false, '48px', 'sans-serif', '900');

  await edit(rootA, 'size', '24');
  await edit(rootA, 'family', 'cursive');
  await edit(rootA, 'weight', '300');
  expect(document.documentElement.style.getPropertyValue('--spec-size')).toBe('24px');
  assertSamples(rootA, false, '24px', 'cursive', '300');
  assertSamples(rootB, false, '48px', 'sans-serif', '900');
  assertSamples(portal, true, '48px', 'sans-serif', '900');
  await annotate(report('host edited, retained portal', rootA, rootB, portal), 'measurement');
  expect(iframe.contentWindow!.getComputedStyle(iframeRoot).getPropertyValue('--spec-size').trim()).toBe('48px');
  expect(iframe.contentWindow!.getComputedStyle(iframeRoot).getPropertyValue('--spec-family').trim()).toBe('sans-serif');
  expect(iframe.contentWindow!.getComputedStyle(iframeRoot).getPropertyValue('--spec-weight').trim()).toBe('900');
  handleA.destroy();
  handleB.destroy();
  iframe.remove();
});
