import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PanelConfig } from '../config/panel-config';
import type { TabConfig } from '../tokens/tier-model';
import FontTab from '../tabs/font-tab';

const TAB: TabConfig = {
  id: 'font',
  label: 'Font',
  tiers: [{
    id: 'scale',
    label: 'Scale',
    preview: 'size',
    items: [
      { id: 'large', cssVar: '--spec-large', label: 'Large', default: '2rem', type: { kind: 'length', step: 0.1, unit: 'rem' } },
      { id: 'small', cssVar: '--spec-small', label: 'Small', default: '12px', type: { kind: 'length', step: 1, unit: 'px' } },
      { id: 'fluid', cssVar: '--spec-fluid', label: 'Fluid', default: 'calc(1rem + 1vw)', type: { kind: 'length', step: 1, unit: 'px' } },
    ],
  }],
};

const CFG = {
  storagePrefix: 'specimen-browser',
  consoleNamespace: 'specimenBrowser',
  modalClassPrefix: 'specimen-browser-modal',
  schemaId: 'specimen-browser/v1',
  exportFilenameBase: 'specimen-browser',
  tabs: [TAB],
} satisfies PanelConfig;

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  document.documentElement.style.setProperty('--spec-large', '32px');
  document.documentElement.style.setProperty('--spec-small', '12px');
});

afterEach(() => {
  act(() => render(null, container));
  container.remove();
  document.documentElement.style.removeProperty('--spec-large');
  document.documentElement.style.removeProperty('--spec-small');
  localStorage.clear();
});

describe('font specimen browser rendering', () => {
  it('uses token values as computed font sizes and sorts unresolved values last', async () => {
    await act(() => render(
      <FontTab tab={TAB} state={{}} persistFont={() => undefined} instanceConfig={CFG} />,
      container,
    ));
    const specimens = Array.from(container.querySelectorAll<HTMLElement>('[data-testid^="specimen-size-"]'));
    expect(specimens.map((element) => element.dataset.testid)).toEqual([
      'specimen-size-small',
      'specimen-size-large',
      'specimen-size-fluid',
    ]);
    expect(getComputedStyle(specimens[0]).fontSize).toBe('12px');
    expect(getComputedStyle(specimens[1]).fontSize).toBe('32px');
  });

  it('re-renders every specimen row when Japanese preview text is typed and persists it', async () => {
    await act(() => render(
      <FontTab tab={TAB} state={{}} persistFont={() => undefined} instanceConfig={CFG} />,
      container,
    ));
    const input = container.querySelector<HTMLInputElement>('[aria-label="Preview text"]');
    expect(input).not.toBeNull();
    await act(() => {
      input!.value = '銀河鉄道の夜';
      input!.dispatchEvent(new InputEvent('input', { bubbles: true }));
    });
    const specimens = Array.from(container.querySelectorAll<HTMLElement>('[data-testid^="specimen-size-"]'));
    expect(specimens).toHaveLength(3);
    expect(specimens.every((element) => element.textContent === '銀河鉄道の夜')).toBe(true);
    const stored = JSON.parse(localStorage.getItem('specimen-browser-specimen') ?? '{}') as Record<string, unknown>;
    expect(stored).toMatchObject({ text: '銀河鉄道の夜', preset: 'ja', overridden: true, width: 420 });
  });
});
