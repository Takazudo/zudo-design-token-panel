// @vitest-environment browser

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import DesignTokenTweakPanel from '../panel';
import GenericItemEditor from '../tabs/_generic-item-editor';
import type { PanelConfig } from '../config/panel-config';
import type { TabConfig, TierItem } from '../tokens/tier-model';
import { densityToGridMin, getDensityKey, getOpenKey, getPositionKey, getSizeKey, type PanelDensity } from '../state/tweak-state';
import { zudoDocConfigs } from '../../../../playground/config/zudo-doc-manifest.generated';
import { FIXTURE_PANEL_CONFIG, flushEffects } from './_test-helpers';

// @ts-ignore — Vite CSS text import
const panelCssModule = import('../styles/panel.css?inline');

const LONG_LABEL = 'A complete friendly label that must wrap without losing any of its words';
const items: TierItem[] = [
  { id: 'numeric', cssVar: '--fit-a-long-numeric-token-name', label: LONG_LABEL, default: '-12.5px', type: { kind: 'length', unit: 'px', units: ['px', 'rem'], step: 0.1 } },
  { id: 'pill', cssVar: '--fit-radius', label: 'Radius', default: '8px', type: { kind: 'length', unit: 'px', step: 1 }, pill: { value: '9999px', customDefault: '8px' } },
  { id: 'select', cssVar: '--fit-select', label: LONG_LABEL, default: 'normal', type: { kind: 'select', options: ['normal', 'multiply', 'a deliberately long selected option for native-field inspection'] } },
  { id: 'text', cssVar: '--fit-text', label: LONG_LABEL, default: 'short text', type: { kind: 'text' } },
  { id: 'native-color', cssVar: '--fit-native-color', label: LONG_LABEL, default: '#123456', type: { kind: 'color' } },
  { id: 'oklch', cssVar: '--fit-oklch', label: LONG_LABEL, default: 'oklch(0.6 0.1 30)', type: { kind: 'color', format: 'oklch' } },
];
const controlsTab: TabConfig = {
  id: 'fit-controls', label: 'Fit controls', tiers: [
    { id: 'raw', label: 'Controls', items },
    { id: 'refs', label: 'References', referencesTier: 'raw', items: [
      { id: 'ref', cssVar: '--fit-reference', label: LONG_LABEL, default: 'numeric', type: { kind: 'length', unit: 'px', step: 1 } },
    ] },
  ],
};
const colorTab = FIXTURE_PANEL_CONFIG.tabs.find((tab) => tab.id === 'color')!;
const EXTRA_CONFIG: PanelConfig = {
  ...FIXTURE_PANEL_CONFIG,
  storagePrefix: 'grid-fit-controls',
  tabs: [controlsTab, {
    ...colorTab,
    colorExtras: { ...colorTab.colorExtras!, label: 'Long Color cluster name for heading fit' },
    tiers: colorTab.tiers,
  }],
};

// A Color cluster intentionally selects one semantic tier. Separate configs
// ensure the literal/grouped shapes actually render instead of being ignored
// behind the legacy semantic tier.
function colorConfig(shape: 'index' | 'literal' | 'grouped'): PanelConfig {
  if (shape === 'index') return EXTRA_CONFIG;
  return {
    ...EXTRA_CONFIG,
    tabs: [controlsTab, {
      ...EXTRA_CONFIG.tabs[1]!,
      tiers: [colorTab.tiers[0]!, {
        id: shape, label: shape, semantic: true,
        ...(shape === 'grouped' ? { referencesRamps: [{ tier: 'palette' }] } : {}),
        items: [{
          id: shape, cssVar: `--fit-semantic-${shape}`, label: LONG_LABEL,
          // A bare local palette item is intentionally resolved as an index
          // before referencesRamps; qualify the tier to request a real ref.
          default: shape === 'literal' ? 'oklch(0.6 0.2 30)' : 'palette:fixture-p6',
          type: { kind: 'color', format: 'oklch' },
        }],
      }],
    }],
  };
}

let host: HTMLDivElement;
let style: HTMLStyleElement;
const EPS = 0.6;
const TARGETS = [
  '.tokenpanel-row-label', '.tokenpanel-row-label-sub', '.tokenpanel-row-number-input',
  '.tokenpanel-row-unit', '.tokenpanel-row-select', '.tokenpanel-row-text-input',
  '.tokenpanel-tier-ref-selector', '.tokenpanel-tier-ref-select', '.tokenpanel-bulk-checkbox',
  '.tokenpanel-chain-button', '.tokenpanel-highlight-toggle', '.tokenpanel-changed-revert',
  '.tokenpanel-pill-toggle', '.tokenpanel-color-field-swatch', '.tokenpanel-palette-trigger',
  '.tokenpanel-per-mode-toggle', '.tokenpanel-per-mode-label', '.tokenpanel-row-color-input',
  '.tokenpanel-semantic-resolved-chip',
].join(',');

function required<T extends HTMLElement>(selector: string, parent: ParentNode = host): T {
  const node = parent.querySelector<T>(selector);
  if (!node) throw new Error(`Missing expected fixture shape: ${selector}`);
  return node;
}
function visible(element: HTMLElement): boolean {
  return element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
}
function contentBox(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const css = getComputedStyle(element);
  return {
    left: rect.left + parseFloat(css.borderLeftWidth) + parseFloat(css.paddingLeft),
    right: rect.right - parseFloat(css.borderRightWidth) - parseFloat(css.paddingRight),
    top: rect.top + parseFloat(css.borderTopWidth) + parseFloat(css.paddingTop),
    bottom: rect.bottom - parseFloat(css.borderBottomWidth) - parseFloat(css.paddingBottom),
  };
}
type Box = Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>;
function inside(actual: Box, allocated: Box, context: string) {
  expect(actual.left, `${context}: left`).toBeGreaterThanOrEqual(allocated.left - EPS);
  expect(actual.right, `${context}: right`).toBeLessThanOrEqual(allocated.right + EPS);
  expect(actual.top, `${context}: top`).toBeGreaterThanOrEqual(allocated.top - EPS);
  expect(actual.bottom, `${context}: bottom`).toBeLessThanOrEqual(allocated.bottom + EPS);
}
function intersects(a: Box, b: Box): boolean {
  return Math.min(a.right, b.right) - Math.max(a.left, b.left) > EPS
    && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > EPS;
}
function fullText(element: HTMLElement, allocated = element.getBoundingClientRect()) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  let count = 0;
  while ((node = walker.nextNode())) {
    if (!node.textContent?.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()];
    expect(rects.length, node.textContent).toBeGreaterThan(0);
    for (const rect of rects) inside(rect, allocated, node.textContent);
    count++;
  }
  expect(count, 'text must be present').toBeGreaterThan(0);
}
function effectiveTarget(element: HTMLElement): Box {
  const rect = element.getBoundingClientRect();
  const pseudo = getComputedStyle(element, '::after');
  if (pseudo.content === 'none' || pseudo.content === 'normal') return rect;
  // These controls have absolute inset pseudo-targets; include both axes.
  return {
    left: rect.left + (parseFloat(pseudo.left) || 0),
    right: rect.right - (parseFloat(pseudo.right) || 0),
    top: rect.top + (parseFloat(pseudo.top) || 0),
    bottom: rect.bottom - (parseFloat(pseudo.bottom) || 0),
  };
}
function nativeValueFits(input: HTMLInputElement) {
  const css = getComputedStyle(input);
  const probe = document.createElement('span');
  probe.style.cssText = `position:fixed;visibility:hidden;white-space:pre;font:${css.font};letter-spacing:${css.letterSpacing}`;
  probe.textContent = input.value;
  document.body.appendChild(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  expect(width, `native numeric value ${input.value}`).toBeLessThanOrEqual(input.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight) + EPS);
}
function checkCards(root: HTMLElement, compactText = true) {
  const cards = [...root.querySelectorAll<HTMLElement>('.tokenpanel-card')].filter(visible);
  expect(cards.length).toBeGreaterThan(0);
  for (const card of cards) {
    expect(card.querySelector('.tokenpanel-card'), 'no nested named card').toBeNull();
    const allocated = contentBox(card);
    const compact = allocated.right - allocated.left <= 319;
    // Roomy legacy icon targets retain their existing 4px overhang into
    // section padding. Compact cards must allocate that clearance internally.
    expect(card.scrollWidth, 'card overflow must not replace body overflow').toBeLessThanOrEqual(card.clientWidth + (compact ? 0 : 4));
    const targets = [...card.querySelectorAll<HTMLElement>(TARGETS)].filter(visible);
    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) inside(target.getBoundingClientRect(), allocated, target.className);
    for (const input of card.querySelectorAll<HTMLInputElement>('.tokenpanel-row-number-input')) nativeValueFits(input);
    for (let i = 0; i < targets.length; i++) {
      for (const other of targets.slice(i + 1)) {
        const target = targets[i]!;
        // An input inside its selector, pill label, or token subtitle is
        // intentional nesting; independent controls must not intersect.
        if (target.contains(other) || other.contains(target)) continue;
        expect(intersects(target.getBoundingClientRect(), other.getBoundingClientRect()), `${target.className} overlaps ${other.className}`).toBe(false);
      }
    }
    const actions = [...card.querySelectorAll<HTMLElement>('.tokenpanel-chain-button, .tokenpanel-highlight-toggle, .tokenpanel-changed-revert')].filter(visible);
    for (const [index, action] of actions.entries()) {
      const hit = effectiveTarget(action);
      // Vertical pseudo-targets may extend into the row gap, but horizontal
      // targets must stay within reserved card clearance in compact mode.
      if (compact) inside(hit, { ...allocated, top: allocated.top - 4, bottom: allocated.bottom + 4 }, `${action.className} effective target`);
      for (const other of actions.slice(index + 1)) expect(intersects(hit, effectiveTarget(other))).toBe(false);
      for (const other of targets) {
        if (action === other || action.contains(other) || other.contains(action)) continue;
        expect(intersects(hit, other.getBoundingClientRect()), `${action.className} target obstructs ${other.className}`).toBe(false);
      }
    }
    if (compact && compactText) {
      for (const label of card.querySelectorAll<HTMLElement>('.tokenpanel-row-label, .tokenpanel-palette-trigger-label, .tokenpanel-changed-tail')) {
        if (visible(label)) fullText(label);
      }
    }
  }
}
function checkGridAndBody(root: HTMLElement) {
  const body = required('.tokenpanel-body');
  // #766 baseline: cozy 320px float, scrollWidth 331 vs clientWidth 318.
  // This equality must fail when the universal floor clamp is reverted.
  expect(body.scrollWidth).toBe(body.clientWidth);
  for (const grid of root.querySelectorAll<HTMLElement>('.tokenpanel-tab-grid, .tokenpanel-color-base-grid')) {
    if (!visible(grid)) continue;
    const box = contentBox(grid);
    const tracks = getComputedStyle(grid).gridTemplateColumns.split(' ').map(parseFloat);
    const gap = parseFloat(getComputedStyle(grid).columnGap);
    expect(tracks.reduce((sum, width) => sum + width, 0) + gap * (tracks.length - 1))
      .toBeLessThanOrEqual(box.right - box.left + EPS);
    for (const card of grid.children) {
      inside(card.getBoundingClientRect(), box, 'card fits allocated grid');
      expect(card.getBoundingClientRect().width).toBeLessThanOrEqual(Math.max(...tracks) + EPS);
    }
  }
}
async function edit(input: HTMLInputElement | HTMLSelectElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  await flushEffects();
}
async function mount(cfg: PanelConfig, width: number, density: PanelDensity, tab: string) {
  localStorage.setItem(getOpenKey(cfg), '1');
  localStorage.setItem(getPositionKey(cfg), JSON.stringify({ left: 20, top: 20 }));
  localStorage.setItem(getSizeKey(cfg), JSON.stringify({ width, height: 760 }));
  localStorage.setItem(getDensityKey(cfg), String(density));
  act(() => render(<DesignTokenTweakPanel instanceConfig={cfg} />, host));
  await flushEffects();
  const button = [...host.querySelectorAll<HTMLElement>('[role="tab"]')].find((node) => node.textContent === tab);
  if (!button) throw new Error(`Missing tab ${tab}`);
  await page.elementLocator(button).click();
  await flushEffects();
  await document.fonts.ready;
  return required<HTMLElement>('[role="tabpanel"]:not([hidden])');
}

beforeEach(async () => {
  localStorage.clear();
  await page.viewport(1440, 1000);
  style = document.createElement('style');
  style.textContent = ((await panelCssModule) as { default: string }).default;
  document.head.appendChild(style);
  host = document.createElement('div');
  document.body.appendChild(host);
});
afterEach(async () => {
  act(() => render(null, host));
  host.remove();
  style.remove();
  localStorage.clear();
  await page.viewport(1280, 800);
});

describe('full vendored zudo-doc minimum card fit', () => {
  it.each([0, 1, 2] as const)('fits the real Color semantic controls and help heading / density %i', async (density) => {
    const root = await mount(zudoDocConfigs.dark, 320, density, 'Color');
    const tab = zudoDocConfigs.dark.tabs.find((candidate) => candidate.id === 'color')!;
    const expected = tab.tiers.filter((tier) => tier.semantic).reduce((sum, tier) => sum + tier.items.length, 0);
    expect(expected).toBeGreaterThan(0);
    expect(root.querySelectorAll('.tokenpanel-card')).toHaveLength(expected);
    expect(root.querySelectorAll('.tokenpanel-tier-ref-select')).toHaveLength(expected);
    checkGridAndBody(root);
    checkCards(root);
    const heading = required('.tokenpanel-tab-section-heading--with-help', root);
    inside(heading.getBoundingClientRect(), contentBox(heading.parentElement!), 'vendored Color heading');
    fullText(heading);
    inside(effectiveTarget(required('.tokenpanel-help-icon', heading)), heading.parentElement!.getBoundingClientRect(), 'vendored help target');
  });

  it.each([0, 1, 2] as const)('fits unchanged, mixed and all-editable-changed Spacing at 320px / density %i', async (density) => {
    const root = await mount(zudoDocConfigs.dark, 320, density, 'Spacing');
    const inputs = [...root.querySelectorAll<HTMLInputElement>('.tokenpanel-row-number-input')];
    expect(inputs).toHaveLength(23);
    expect(root.querySelectorAll('.tokenpanel-row-label')).toHaveLength(23);
    expect(root.querySelectorAll('.tokenpanel-row-unit')).toHaveLength(21);
    const readonly = inputs.filter((input) => input.disabled);
    expect(readonly.map((input) => input.closest<HTMLElement>('[data-css-var]')!.dataset.cssVar))
      .toEqual(['--spacing-0', '--spacing-px', '--zd-sidebar-w']);
    for (const cssVar of ['--spacing-0', '--zd-sidebar-w']) {
      const row = required(`[data-css-var="${cssVar}"]`, root);
      expect(row.querySelector('.tokenpanel-row-unit'), `${cssVar} is explicitly unitless`).toBeNull();
    }
    const editable = inputs.filter((input) => !input.disabled);
    expect(editable).toHaveLength(20);
    expect(root.querySelectorAll('.tokenpanel-bulk-row-checkbox')).toHaveLength(20);
    expect(root.querySelectorAll('.tokenpanel-chain-button')).toHaveLength(23);
    expect(root.querySelectorAll('.tokenpanel-highlight-toggle')).toHaveLength(23);
    checkGridAndBody(root);
    checkCards(root);
    await edit(inputs[0]!, '-12.5');
    expect(root.querySelectorAll('.is-changed')).toHaveLength(1);
    checkGridAndBody(root);
    checkCards(root);
    // Respect the real manifest's three readonly rows. All writable rows
    // change, including every row of the hsp/vsp/icon tiers.
    for (const [index, input] of editable.entries()) await edit(input, String(-20.5 - index));
    expect(root.querySelectorAll('.tokenpanel-changed-revert')).toHaveLength(20);
    expect(root.querySelectorAll('.tokenpanel-changed-tail')).toHaveLength(20);
    for (const input of readonly) expect(input.closest('.is-changed')).toBeNull();
    checkGridAndBody(root);
    checkCards(root);
  });

  it.each([380, 440, 700, 1152])('retains outer geometry and cozy/wide semantics at %ipx', async (width) => {
    const root = await mount(zudoDocConfigs.dark, width, 1, 'Spacing');
    expect(required('.tokenpanel-shell').getBoundingClientRect().width).toBeCloseTo(width, 1);
    expect(getComputedStyle(required('.tokenpanel-shell')).getPropertyValue('--tokenpanel-grid-min').trim()).toBe('288px');
    checkGridAndBody(root);
    checkCards(root);
    for (const grid of root.querySelectorAll<HTMLElement>('.tokenpanel-tab-grid')) {
      const box = contentBox(grid);
      const gap = parseFloat(getComputedStyle(grid).columnGap);
      const count = Math.min(grid.children.length, Math.max(1, Math.floor((box.right - box.left + gap) / (288 + gap))));
      expect(getComputedStyle(grid).gridTemplateColumns.split(' ')).toHaveLength(count);
    }
    // Drive the real density control even when it lives in Panel actions.
    const shell = required('.tokenpanel-shell');
    let slider = [...shell.querySelectorAll<HTMLInputElement>('.tokenpanel-density-slider')].find(visible);
    if (!slider) {
      await page.elementLocator(required('.tokenpanel-actions-menu-btn')).click();
      await flushEffects();
      slider = [...shell.querySelectorAll<HTMLInputElement>('.tokenpanel-density-slider')].find(visible);
    }
    if (!slider) throw new Error('Missing accessible density control');
    await edit(slider, '2');
    for (const grid of root.querySelectorAll<HTMLElement>('.tokenpanel-tab-grid')) expect(getComputedStyle(grid).gridTemplateColumns.split(' ')).toHaveLength(1);
    checkGridAndBody(root);
  });

  it.each([0, 1, 2] as const)('preserves specimen full-width grids and transparent regions / density %i', async (density) => {
    // The vendored config currently has no preview tiers; keep this absent
    // shape explicit rather than silently accepting an empty selector set.
    const cfg: PanelConfig = {
      ...EXTRA_CONFIG,
      tabs: [{
        id: 'font', label: 'Font', tiers: [
          { ...FIXTURE_PANEL_CONFIG.tabs[1]!.tiers[0]!, preview: 'size' },
          { id: 'line-height', label: 'Line height', preview: 'line-height', items: [
            { id: 'line', cssVar: '--fit-line-height', label: 'Line height', default: '1.4', type: { kind: 'number', step: 0.1 } },
          ] },
        ],
      }],
    };
    const root = await mount(cfg, 320, density, 'Font');
    const grids = [...root.querySelectorAll<HTMLElement>('.tokenpanel-tab-grid--specimen')];
    expect(grids).toHaveLength(2);
    for (const grid of grids) {
      expect(getComputedStyle(grid).gridTemplateColumns.split(' ')).toHaveLength(1);
      expect(getComputedStyle(grid).paddingLeft).toBe('4px');
      expect(getComputedStyle(grid).paddingRight).toBe('4px');
      for (const region of grid.querySelectorAll('.tokenpanel-card-label, .tokenpanel-card-editor, .tokenpanel-card-actions')) expect(getComputedStyle(region).display).toBe('contents');
      for (const head of grid.querySelectorAll('.tokenpanel-row-head')) expect(getComputedStyle(head).display).toBe('grid');
    }
  });
});

describe('bounded absent control shapes and interactions', () => {
  it.each([0, 1, 2] as const)('fits every editor shape at 320px / density %i', async (density) => {
    const root = await mount(EXTRA_CONFIG, 320, density, 'Fit controls');
    const counts: Record<string, number> = {
      '.tokenpanel-row-label': 7, '.tokenpanel-row-label-sub': 7,
      '.tokenpanel-row-number-input': 2, '.tokenpanel-row-unit': 2,
      '.tokenpanel-row-select': 1, '.tokenpanel-row-text-input': 1,
      '.tokenpanel-tier-ref-selector': 1, '.tokenpanel-tier-ref-select': 1,
      '.tokenpanel-pill-toggle': 1, '.tokenpanel-row-color-input': 1,
      '.tokenpanel-color-field-swatch': 1, '.tokenpanel-chain-button': 7,
      '.tokenpanel-highlight-toggle': 7,
    };
    for (const [selector, count] of Object.entries(counts)) expect(root.querySelectorAll(selector), selector).toHaveLength(count);
    checkGridAndBody(root);
    checkCards(root);
    const numeric = required<HTMLInputElement>('.tokenpanel-row-number-input', root);
    await edit(numeric, '-2.75');
    const unit = required('.tokenpanel-row-unit--interactive', root);
    await page.elementLocator(unit).click();
    expect(unit.textContent).toBe('rem');
    unit.focus();
    await userEvent.keyboard('{Enter}');
    await flushEffects();
    expect(unit.textContent).toBe('px');
    const numericRow = numeric.closest<HTMLElement>('[data-testid]')!;
    numeric.focus();
    for (const target of [unit, ...numericRow.querySelectorAll<HTMLElement>('.tokenpanel-card-actions [tabindex="0"]')]) {
      await userEvent.keyboard('{Tab}');
      expect(document.activeElement).toBe(target);
      expect(getComputedStyle(target).order).toBe('0');
    }
    await edit(required<HTMLSelectElement>('.tokenpanel-row-select', root), 'multiply');
    await edit(required<HTMLInputElement>('.tokenpanel-row-text-input', root), 'edited text');
    const ref = required<HTMLSelectElement>('.tokenpanel-tier-ref-select', root);
    const nextOption = [...ref.options].find((option) => option.value !== ref.value && !option.disabled)!;
    await edit(ref, nextOption.value);
    expect(ref.value).toBe(nextOption.value);
    const bulk = required<HTMLInputElement>('.tokenpanel-bulk-row-checkbox', root);
    await page.elementLocator(bulk).click();
    expect(bulk.checked).toBe(true);
    const highlight = required('.tokenpanel-highlight-toggle', root);
    await page.elementLocator(highlight).click();
    await flushEffects();
    await expect.poll(() => highlight.title).toMatch(/^Stop highlighting --fit-a-long-numeric-token-name/);
    const chain = required('.tokenpanel-chain-button', root);
    await page.elementLocator(chain).click();
    await flushEffects();
    expect(chain.getAttribute('aria-expanded')).toBe('true');
    await userEvent.keyboard('{Escape}');
    await flushEffects();
    const pill = required<HTMLInputElement>('.tokenpanel-pill-toggle-checkbox', root);
    await page.elementLocator(pill).click();
    expect(pill.checked).toBe(true);
    checkGridAndBody(root);
    checkCards(root);
    await page.elementLocator(required('.tokenpanel-changed-revert', root)).click();
    await flushEffects();
    expect(numeric.value).toBe('-12.5');
    checkCards(root);
  });

  it.each(([0, 1, 2] as const).flatMap((density) => (['index', 'literal', 'grouped'] as const).map((shape) => ({ density, shape }))))('fits Color $shape controls / density $density', async ({ density, shape }) => {
    const root = await mount(colorConfig(shape), 320, density, 'Color');
    expect(root.querySelectorAll('.tokenpanel-palette-trigger')).toHaveLength(shape === 'index' ? 5 : 2);
    expect(root.querySelectorAll('[data-testid="tokenpanel-semantic-literal-literal"]')).toHaveLength(shape === 'literal' ? 1 : 0);
    expect(root.querySelectorAll('[data-testid="tokenpanel-semantic-ref-grouped"]')).toHaveLength(shape === 'grouped' ? 1 : 0);
    expect(root.querySelectorAll('.tokenpanel-tier-ref-select')).toHaveLength(shape === 'grouped' ? 1 : 0);
    const palette = required('.tokenpanel-color-palette-grid', root);
    const paletteBox = contentBox(palette);
    const paletteGap = parseFloat(getComputedStyle(palette).columnGap);
    const expectedColumns = Math.min(16, Math.floor((paletteBox.right - paletteBox.left + paletteGap) / (56 + paletteGap)));
    expect(getComputedStyle(palette).gridTemplateColumns.split(' ')).toHaveLength(expectedColumns);
    expect(palette.querySelectorAll('.tokenpanel-color-swatch-button')).toHaveLength(16);
    for (const swatch of palette.querySelectorAll('.tokenpanel-color-swatch-button')) expect(swatch.getBoundingClientRect().width).toBe(56);
    const heading = required('.tokenpanel-tab-section-heading--with-help', root);
    const section = heading.parentElement!;
    inside(heading.getBoundingClientRect(), contentBox(section), 'Color help heading');
    fullText(heading);
    const help = required('.tokenpanel-help-icon', heading);
    inside(effectiveTarget(help), section.getBoundingClientRect(), 'unobstructed help target');
    checkGridAndBody(root);
    checkCards(root);
    if (shape === 'literal') {
      const literal = required('[data-testid="tokenpanel-semantic-literal-literal"]', root);
      expect(literal.querySelectorAll('.tokenpanel-color-field-swatch')).toHaveLength(1);
      await page.elementLocator(required('input[type="checkbox"]', literal)).click();
      await flushEffects();
      expect(literal.querySelectorAll('.tokenpanel-color-field-swatch')).toHaveLength(2);
    }
    if (shape === 'grouped') {
      const ref = required<HTMLSelectElement>('.tokenpanel-tier-ref-select', root);
      const next = [...ref.options].find((option) => option.textContent === 'Literal…');
      if (!next) throw new Error('Missing grouped literal option');
      await edit(ref, next.value);
      expect(root.querySelectorAll('.tokenpanel-color-field-swatch')).toHaveLength(1);
      const row = required('[data-testid="tokenpanel-semantic-ref-grouped"]', root);
      await page.elementLocator(required('input[type="checkbox"]', row)).click();
      await flushEffects();
      expect(row.querySelectorAll('.tokenpanel-color-field-swatch')).toHaveLength(2);
    }
    checkGridAndBody(root);
    checkCards(root);
    const trigger = required('.tokenpanel-palette-trigger', root);
    await page.elementLocator(trigger).click();
    await flushEffects();
    const popover = required('[role="listbox"]', root);
    inside(popover.getBoundingClientRect(), { left: 0, top: 0, right: innerWidth, bottom: innerHeight }, 'palette popover remains viewport-positioned');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await flushEffects();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    checkGridAndBody(root);
    checkCards(root);
  });

  it.each([192, 318.5, 319, 319.5, 320])('uses actual %ipx card width inside a larger shell', async (width) => {
    const root = await mount(EXTRA_CONFIG, 700, 0, 'Fit controls');
    expect(getComputedStyle(required('.tokenpanel-shell')).getPropertyValue('--tokenpanel-grid-min').trim()).toBe(densityToGridMin(0));
    const grid = required('.tokenpanel-tab-grid', root);
    // Isolate the exact card boundary without changing the shell breakpoint.
    grid.style.width = `${width}px`;
    grid.style.gridTemplateColumns = 'minmax(0, 1fr)';
    await flushEffects();
    const card = required('.tokenpanel-card', grid);
    expect(card.getBoundingClientRect().width).toBeCloseTo(width, 1);
    expect(getComputedStyle(required('.tokenpanel-card-label', card)).display).toBe(width <= 319 ? 'flex' : 'contents');
    if (width <= 319) checkCards(grid);
    else expect(getComputedStyle(required('.tokenpanel-row-head', card)).flexWrap).toBe('nowrap');
  });

  it('keeps long native values editable while recording their finite visible viewport', async () => {
    const root = await mount(EXTRA_CONFIG, 320, 1, 'Fit controls');
    const input = required<HTMLInputElement>('.tokenpanel-row-text-input', root);
    const long = 'A native text value longer than its field can display simultaneously '.repeat(4);
    await edit(input, long);
    expect(input.value).toBe(long);
    expect(input.scrollWidth).toBeGreaterThan(input.clientWidth);
    input.focus();
    await userEvent.keyboard('{End}');
    expect(input.selectionStart).toBe(long.length);
    await userEvent.keyboard('{Home}');
    expect(input.selectionStart).toBe(0);
    const select = required<HTMLSelectElement>('.tokenpanel-row-select', root);
    const option = select.options[select.options.length - 1]!;
    await edit(select, option.value);
    expect(select.selectedOptions[0]!.textContent).toBe(option.textContent);
    // Native inputs/selects retain a finite text viewport. Full value and
    // keyboard access are tested separately from box fit; arbitrary-length
    // simultaneous native-value readability is NOT certified by this test.
    checkCards(root);
  });

  it('applies the same card structure to every legacy editor branch without nesting pills', async () => {
    act(() => render(<div className="tokenpanel-shell" style={{ position: 'static', width: '320px' }}>
      <div className="tokenpanel-tab-grid" style={{ width: '192px' }}>
        {items.map((item) => <GenericItemEditor key={item.id} item={item} value={item.default} onChange={() => {}} />)}
      </div>
    </div>, host));
    await flushEffects();
    expect(host.querySelectorAll('.tokenpanel-card')).toHaveLength(items.length);
    expect(host.querySelectorAll('.tokenpanel-card .tokenpanel-card')).toHaveLength(0);
    checkCards(required('.tokenpanel-tab-grid'));
  });
});
