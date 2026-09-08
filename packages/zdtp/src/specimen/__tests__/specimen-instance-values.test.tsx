// @vitest-environment jsdom

import { act } from 'preact/test-utils';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { __resetInstanceBindingsForTests } from '../../index';
import { configurePanel, __resetPanelConfigForTests, panelRootId, type PanelConfig } from '../../config/panel-config';
import { __resetHostMutationsForTests } from '../../host/host-mutations';
import { flushEffects } from '../../__tests__/_test-helpers';
import { specimenFontStyle } from '../specimen-tab-body';
import type { TabConfig } from '../../tokens/tier-model';

const tab: TabConfig = {
  id: 'font', label: 'Font', tiers: [
    { id: 'family', label: 'Family', preview: 'family', items: [
      { id: 'family', label: 'Family', cssVar: '--spec-family', default: 'serif', type: { kind: 'text' } },
    ] },
    { id: 'weight', label: 'Weight', preview: 'weight', items: [
      { id: 'weight', label: 'Weight', cssVar: '--spec-weight', default: '400', type: { kind: 'number', step: 100 } },
    ] },
    { id: 'scale', label: 'Scale', preview: 'size', items: [
      { id: 'size', label: 'Size', cssVar: '--spec-size', default: '18px', type: { kind: 'length', unit: 'px', step: 1 } },
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

beforeEach(() => {
  __resetInstanceBindingsForTests();
  __resetPanelConfigForTests();
  __resetHostMutationsForTests();
  localStorage.clear();
  document.body.innerHTML = '';
  const host = document.createElement('style');
  host.id = 'specimen-host-vars';
  host.textContent = ':root { --spec-size: 18px; --spec-body: 18px; --spec-family: serif; --spec-weight: 400; }';
  document.head.appendChild(host);
});

afterEach(async () => {
  __resetInstanceBindingsForTests();
  __resetHostMutationsForTests();
  __resetPanelConfigForTests();
  await flushEffects();
  document.body.innerHTML = '';
  document.getElementById('specimen-host-vars')?.remove();
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
    expect(sample.style.fontSize).toBe(size);
    expect(sample.style.fontFamily).toBe(family);
    expect(sample.style.fontWeight).toBe(weight);
    expect(sample.getAttribute('style')).not.toContain('var(');
  }
  const leading = root.querySelector<HTMLElement>(page
    ? '.tokenpanel-on-page-specimen-line-height-text' : '.tokenpanel-specimen-line-height-text')!;
  expect(leading.style.lineHeight).toBe('1.5');
  expect(leading.style.fontFamily).toBe(family);
  expect(leading.style.fontWeight).toBe(weight);
}

it('keeps both renderers on their own configured instance, including a mounted sink portal', async () => {
  const apply = vi.fn();
  const a = config('specimen-a');
  const b = config('specimen-b', { apply, clear: vi.fn() });
  const handleA = configurePanel(a);
  const handleB = configurePanel(b);
  handleA.open();
  handleB.open();
  await flushEffects();
  const rootA = document.getElementById(panelRootId(a))!;
  const rootB = document.getElementById(panelRootId(b))!;

  await edit(rootB, 'size', '32');
  await edit(rootB, 'family', 'monospace');
  await edit(rootB, 'weight', '700');
  assertSamples(rootB, false, '32px', 'monospace', '700');
  assertSamples(rootA, false, '18px', 'serif', '400');
  expect(apply.mock.calls.flatMap(([pairs]) => pairs)).toContainEqual(['--spec-size', '32px']);
  expect(document.documentElement.style.getPropertyValue('--spec-size')).not.toBe('32px');

  const toggle = rootB.querySelector<HTMLInputElement>('[aria-label="Render on page"]')!;
  await act(() => toggle.click());
  await flushEffects();
  const portal = document.querySelector('[data-zdtp-specimen]')!;
  expect(portal).not.toBeNull();
  assertSamples(portal, true, '32px', 'monospace', '700');

  await edit(rootB, 'size', '48');
  await edit(rootB, 'family', 'sans-serif');
  await edit(rootB, 'weight', '900');
  expect(document.querySelector('[data-zdtp-specimen]')).toBe(portal);
  assertSamples(portal, true, '48px', 'sans-serif', '900');
  assertSamples(rootB, false, '48px', 'sans-serif', '900');

  await edit(rootA, 'size', '24');
  await edit(rootA, 'family', 'cursive');
  await edit(rootA, 'weight', '300');
  expect(document.documentElement.style.getPropertyValue('--spec-size')).toBe('24px');
  assertSamples(rootA, false, '24px', 'cursive', '300');
  assertSamples(rootB, false, '48px', 'sans-serif', '900');
  assertSamples(portal, true, '48px', 'sans-serif', '900');
  handleA.destroy();
  handleB.destroy();
});


it('resolves semantic family and weight previews through their source tiers', () => {
  const semanticTab: TabConfig = {
    ...tab,
    tiers: [
      { ...tab.tiers[0], id: 'family-role', referencesTier: 'family', items: [
        { ...tab.tiers[0].items[0], id: 'body-family', default: 'family' },
      ] },
      { ...tab.tiers[1], id: 'weight-role', referencesTier: 'weight', items: [
        { ...tab.tiers[1].items[0], id: 'body-weight', default: 'weight' },
      ] },
      ...tab.tiers.map((tier) => ({ ...tier, preview: undefined })),
    ],
  };
  expect(specimenFontStyle(semanticTab, (item) => item.default)).toEqual({
    fontFamily: 'serif', fontWeight: '400',
  });
  const edits: Record<string, string> = { family: 'monospace', weight: '700' };
  expect(specimenFontStyle(semanticTab, (item) => edits[item.id] ?? item.default)).toEqual({
    fontFamily: 'monospace', fontWeight: '700',
  });
});
