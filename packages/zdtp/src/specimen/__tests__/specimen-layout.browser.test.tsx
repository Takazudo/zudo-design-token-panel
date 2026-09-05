// @vitest-environment browser

import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PanelConfig } from '../../config/panel-config';
import { RoleButton } from '../../controls/role-button';
import FontTab from '../../tabs/font-tab';
import type { RowContribution } from '../../tabs/flat/types';
import type { TabConfig } from '../../tokens/tier-model';

const TAB: TabConfig = {
  id: 'font',
  label: 'Font',
  tiers: [
    {
      id: 'scale',
      label: 'Scale',
      preview: 'size',
      items: [
        { id: 'small', cssVar: '--spec-small', label: 'Small', default: '0.75rem', type: { kind: 'length', step: 0.05, unit: 'rem' } },
        { id: 'base', cssVar: '--spec-base', label: 'Base', default: '1rem', type: { kind: 'length', step: 0.05, unit: 'rem' } },
        { id: 'large', cssVar: '--spec-large', label: 'Large', default: '2.5rem', type: { kind: 'length', step: 0.05, unit: 'rem' } },
      ],
    },
    {
      id: 'roles',
      label: 'Roles',
      preview: 'size',
      referencesTier: 'scale',
      items: [
        { id: 'body', cssVar: '--spec-body', label: 'Body', default: 'base', type: { kind: 'text' } },
        { id: 'title', cssVar: '--spec-title', label: 'Title', default: 'large', type: { kind: 'text' } },
      ],
    },
    {
      id: 'leading',
      label: 'Leading',
      preview: 'line-height',
      previewBase: '--spec-base',
      items: [
        { id: 'tight', cssVar: '--spec-tight', label: 'Tight', default: '1.2', type: { kind: 'number', step: 0.05 } },
        { id: 'relaxed', cssVar: '--spec-relaxed', label: 'Relaxed', default: '1.8', type: { kind: 'number', step: 0.05 } },
      ],
    },
    {
      id: 'family',
      label: 'Family',
      preview: 'family',
      items: ['sans', 'serif', 'mono'].map((id) => ({
        id,
        cssVar: `--spec-${id}`,
        label: id,
        default: id,
        type: { kind: 'select' as const, options: ['sans', 'serif', 'mono'] },
      })),
    },
  ],
};

const CFG = {
  storagePrefix: 'specimen-layout-browser',
  consoleNamespace: 'specimenLayoutBrowser',
  modalClassPrefix: 'specimen-layout-browser-modal',
  schemaId: 'specimen-layout-browser/v1',
  exportFilenameBase: 'specimen-layout-browser',
  tabs: [TAB],
} satisfies PanelConfig;

const changedContribution: RowContribution = {
  id: 'changed-fixture',
  className: ({ item }) => item.id === 'large' ? 'is-changed' : undefined,
  trailing: ({ item }) => item.id === 'large' ? (
    <RoleButton className="tokenpanel-changed-revert" onClick={() => undefined} aria-label="Revert large">↶</RoleButton>
  ) : null,
  tail: ({ item }) => item.id === 'large' ? <span className="tokenpanel-changed-tail">default 2.5rem → 3rem</span> : null,
};

let shell: HTMLDivElement;
let style: HTMLStyleElement;

const panelCssModule = import('../../styles/panel.css?inline');

beforeEach(async () => {
  style = document.createElement('style');
  style.textContent = ((await panelCssModule) as { default: string }).default;
  document.head.appendChild(style);
  shell = document.createElement('div');
  shell.className = 'tokenpanel-shell';
  document.body.appendChild(shell);
});

afterEach(() => {
  act(() => render(null, shell));
  shell.remove();
  style.remove();
  localStorage.clear();
});

function overlaps(a: DOMRect, b: DOMRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function assertRowPartsDoNotOverlap(row: HTMLElement): void {
  const parts = Array.from(row.querySelectorAll<HTMLElement>([
    '.tokenpanel-bulk-row-checkbox',
    '.tokenpanel-specimen-meta',
    '.tokenpanel-specimen-size-text',
    '.tokenpanel-specimen-line-height-text',
    '.tokenpanel-row-input-group',
    '.tokenpanel-row-select',
    '.tokenpanel-tier-ref-selector',
    '.tokenpanel-changed-revert',
    '.tokenpanel-chain-button',
    '.tokenpanel-highlight-toggle',
  ].join(','))).filter((part) => part.getBoundingClientRect().width > 0);
  for (let left = 0; left < parts.length; left += 1) {
    for (let right = left + 1; right < parts.length; right += 1) {
      expect(overlaps(parts[left].getBoundingClientRect(), parts[right].getBoundingClientRect())).toBe(false);
    }
  }
}

async function mount(width: number, density: 0 | 1 | 2): Promise<void> {
  shell.style.width = `${width}px`;
  shell.style.setProperty('--tokenpanel-grid-min', density === 0 ? '192px' : density === 1 ? '288px' : '100%');
  await act(() => render(
    <FontTab
      tab={TAB}
      state={{ large: '3rem' }}
      persistFont={() => undefined}
      instanceConfig={CFG}
      onBulkApply={vi.fn()}
      changedContribution={changedContribution}
    />,
    shell,
  ));
  const text = shell.querySelector<HTMLInputElement>('[aria-label="Preview text"]')!;
  await act(() => {
    text.value = '銀河鉄道の夜を旅する活字見本です';
    text.dispatchEvent(new InputEvent('input', { bubbles: true }));
  });
}

describe('specimen density layout', () => {
  for (const width of [700, 440]) {
    for (const density of [0, 1, 2] as const) {
      it(`keeps specimen rows contained at ${width}px and density ${density}`, async () => {
        await mount(width, density);

        const specimenGrids = Array.from(shell.querySelectorAll<HTMLElement>('.tokenpanel-tab-grid--specimen'));
        expect(specimenGrids).toHaveLength(3);
        for (const grid of specimenGrids) {
          expect(getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/)).toHaveLength(1);
          expect(grid.scrollWidth).toBe(grid.clientWidth);
        }
        const tabBody = shell.querySelector<HTMLElement>('.tokenpanel-tab-content')!;
        expect(tabBody.scrollWidth).toBe(tabBody.clientWidth);

        const familyGrid = shell.querySelector<HTMLElement>('[data-testid="font-tier-family"] .tokenpanel-tab-grid')!;
        if (density === 0) {
          expect(getComputedStyle(familyGrid).gridTemplateColumns.trim().split(/\s+/).length).toBeGreaterThanOrEqual(2);
        }

        const samples = Array.from(shell.querySelectorAll<HTMLElement>('[data-testid^="specimen-size-"]'));
        if (width === 700) {
          expect(samples.every((sample) => sample.getBoundingClientRect().width > 120)).toBe(true);
        }

        const scaleRows = Array.from(shell.querySelectorAll<HTMLElement>('[data-testid="font-tier-scale"] [data-address]'));
        const heights = scaleRows.map((row) => row.getBoundingClientRect().height);
        expect(heights).toEqual([...heights].sort((a, b) => a - b));
        expect(heights.at(-1)).toBeGreaterThan(heights[0]);

        for (const row of shell.querySelectorAll<HTMLElement>('.tokenpanel-row--specimen-size, .tokenpanel-row--specimen-line-height')) {
          assertRowPartsDoNotOverlap(row);
        }
        const rows = Array.from(shell.querySelectorAll<HTMLElement>('[data-testid="font-tier-scale"] [data-address]'));
        for (let index = 1; index < rows.length; index += 1) {
          expect(overlaps(rows[index - 1].getBoundingClientRect(), rows[index].getBoundingClientRect())).toBe(false);
        }

        const bulkCheckbox = shell.querySelector<HTMLInputElement>('[data-testid="font-tier-scale"] .tokenpanel-bulk-row-checkbox')!;
        await act(() => {
          bulkCheckbox.click();
        });
        const selectedRow = shell.querySelector<HTMLElement>('[data-testid="font-tier-scale"] .tokenpanel-row--bulk-selected')!;
        assertRowPartsDoNotOverlap(selectedRow);
      });
    }
  }
});
