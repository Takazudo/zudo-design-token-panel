// @vitest-environment browser
/**
 * Browser acceptance checks for header token search and the command palette.
 *
 * The panel is mounted with the real shell and CSS so this covers the
 * shortcut/layer wiring and address-based focus path in addition to the
 * pure-search unit tests.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import DesignTokenTweakPanel from '../panel';
import type { PanelConfig } from '../config/panel-config';
import type { TabConfig } from '../tokens/tier-model';
import { getOpenKey, getPositionKey, getSizeKey } from '../state/tweak-state';
import { FIXTURE_PANEL_CONFIG, flushEffects } from './_test-helpers';

// @ts-ignore — ?inline is a Vite-specific query not typed in tsconfig
const panelCssModule = import('../styles/panel.css?inline');

const PALETTE_TAB: TabConfig = {
  id: 'palette',
  label: 'Palette',
  tiers: [
    {
      id: 'accent',
      label: 'Accent',
      items: [
        {
          id: 'palette-accent',
          cssVar: '--palette-accent',
          label: 'Accent',
          default: 'oklch(65% 0.16 40)',
          type: { kind: 'color', format: 'oklch' },
        },
      ],
    },
  ],
};

const CONFIG: PanelConfig = {
  ...FIXTURE_PANEL_CONFIG,
  tabs: [...FIXTURE_PANEL_CONFIG.tabs, PALETTE_TAB],
};

let container: HTMLDivElement;
let panelStyle: HTMLStyleElement;

function setInputValue(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function dispatchKey(target: EventTarget, key: string, options: KeyboardEventInit = {}): void {
  target.dispatchEvent(new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  }));
}

async function mountPanel(): Promise<void> {
  localStorage.setItem(getOpenKey(CONFIG), '1');
  localStorage.setItem(getPositionKey(CONFIG), JSON.stringify({ top: 20, left: 20 }));
  localStorage.setItem(getSizeKey(CONFIG), JSON.stringify({ width: 760, height: 560 }));
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    render(<DesignTokenTweakPanel instanceConfig={CONFIG} />, container);
  });
  await flushEffects();
}

function searchInput(): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('.tokenpanel-search-input');
  if (!input) throw new Error('header search input not found');
  return input;
}

function commandInput(): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('.tokenpanel-command-palette-input');
  if (!input) throw new Error('command palette input not found');
  return input;
}

function activeTabLabel(): string | null {
  return container.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.textContent ?? null;
}

beforeEach(async () => {
  localStorage.clear();
  const css: string = ((await panelCssModule) as { default: string }).default;
  panelStyle = document.createElement('style');
  panelStyle.textContent = css;
  document.head.appendChild(panelStyle);
  await mountPanel();
});

afterEach(async () => {
  await flushEffects();
  act(() => {
    render(null, container);
  });
  container.remove();
  panelStyle.remove();
  localStorage.clear();
});

describe('header token filter', () => {
  it('focuses with /, filters rows while typing, and clears with Escape', async () => {
    dispatchKey(document, '/');
    expect(document.activeElement).toBe(searchInput());

    setInputValue(searchInput(), 'hsp-md');
    await flushEffects();
    const matchbar = container.querySelector('[data-testid="tokenpanel-search-matchbar"]');
    expect(matchbar?.textContent).toContain('1 of 2 in Spacing');
    expect(container.querySelector('[data-testid="tier-item-hsp-md"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="tier-item-vsp-sm"]')).toBeNull();

    dispatchKey(searchInput(), 'Escape');
    await flushEffects();
    expect(searchInput().value).toBe('');
    expect(document.activeElement).not.toBe(searchInput());
  });

  it('switches to another tab through a match chip without losing the query', async () => {
    setInputValue(searchInput(), 'radius');
    await flushEffects();
    const chip = Array.from(container.querySelectorAll<HTMLElement>('.tokenpanel-search-chip'))
      .find((candidate) => candidate.textContent?.includes('Size'));
    expect(chip).not.toBeUndefined();
    act(() => chip!.click());
    await flushEffects();

    expect(activeTabLabel()).toBe('Size');
    expect(searchInput().value).toBe('radius');
    expect(container.querySelector('[data-testid="tier-item-radius-lg"]')).not.toBeNull();
  });
});

describe('command palette token navigation', () => {
  it('shows unconfigured Apply as unavailable and does not select it', async () => {
    dispatchKey(document, 'k', { ctrlKey: true });
    await flushEffects();
    setInputValue(commandInput(), 'apply');
    await flushEffects();

    const apply = Array.from(
      container.querySelectorAll<HTMLElement>('.tokenpanel-command-palette-item'),
    ).find((candidate) => candidate.textContent?.includes('Apply'));
    expect(apply?.getAttribute('aria-disabled')).toBe('true');
    expect(apply?.title).toContain('configure an apply endpoint');
    expect(apply?.textContent).toContain('unavailable');

    dispatchKey(commandInput(), 'Enter');
    await flushEffects();
    expect(container.querySelector('[role="dialog"][aria-label="Command palette"]')).not.toBeNull();
    expect(container.querySelector('[data-design-token-panel-modal-variant="apply"]')).toBeNull();
  });

  it('opens with Ctrl+K and jumps to a flat-tab token on Enter', async () => {
    dispatchKey(document, 'k', { ctrlKey: true });
    await flushEffects();
    expect(container.querySelector('[role="dialog"][aria-label="Command palette"]')).not.toBeNull();

    setInputValue(commandInput(), 'radius-lg');
    await flushEffects();
    dispatchKey(commandInput(), 'Enter');
    await flushEffects();

    expect(container.querySelector('[role="dialog"][aria-label="Command palette"]')).toBeNull();
    expect(activeTabLabel()).toBe('Size');
    const row = container.querySelector<HTMLElement>('[data-testid="tier-item-radius-lg"]');
    expect(row).not.toBeNull();
    expect(document.activeElement).toBe(row!.querySelector('input'));
  });

  it('jumps to Color and Palette addresses, expanding the Palette group', async () => {
    dispatchKey(document, 'k', { metaKey: true });
    await flushEffects();
    setInputValue(commandInput(), 'fixture-p6');
    await flushEffects();
    dispatchKey(commandInput(), 'Enter');
    await flushEffects();
    expect(activeTabLabel()).toBe('Color');
    expect(container.querySelector('[data-address="color/palette/fixture-p6"]')).not.toBeNull();

    dispatchKey(document, 'k', { ctrlKey: true });
    await flushEffects();
    setInputValue(commandInput(), 'palette-accent');
    await flushEffects();
    dispatchKey(commandInput(), 'Enter');
    await flushEffects();
    expect(activeTabLabel()).toBe('Palette');
    const paletteSwatch = container.querySelector<HTMLElement>('[data-testid="palette-edit-swatch-palette-accent"]');
    expect(paletteSwatch).not.toBeNull();
    expect(container.querySelector('[data-testid="palette-edit-group-header-accent"][aria-expanded="true"]')).not.toBeNull();
    expect(document.activeElement).toBe(paletteSwatch);
  });
});
