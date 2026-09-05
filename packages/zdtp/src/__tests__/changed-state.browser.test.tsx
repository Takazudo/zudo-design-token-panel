// @vitest-environment browser

/** Focused browser coverage for the S7 changed-state shell wiring. */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import DesignTokenTweakPanel from '../panel';
import { getOpenKey, getPositionKey, getSizeKey } from '../state/tweak-state';
import { FIXTURE_PANEL_CONFIG, flushEffects } from './_test-helpers';

// @ts-ignore — ?inline is a Vite-specific query not typed in tsconfig
const panelCssModule = import('../styles/panel.css?inline');

const CFG = FIXTURE_PANEL_CONFIG;

let container: HTMLDivElement;
let panelStyle: HTMLStyleElement;

function setInputValue(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

async function mountPanel(): Promise<void> {
  localStorage.setItem(getOpenKey(CFG), '1');
  localStorage.setItem(getPositionKey(CFG), JSON.stringify({ top: 20, left: 20 }));
  localStorage.setItem(getSizeKey(CFG), JSON.stringify({ width: 760, height: 560 }));
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    render(<DesignTokenTweakPanel instanceConfig={CFG} />, container);
  });
  await flushEffects();
}

beforeEach(async () => {
  localStorage.clear();
  document.body.innerHTML = '';
  panelStyle = document.createElement('style');
  panelStyle.textContent = ((await panelCssModule) as { default: string }).default;
  document.head.appendChild(panelStyle);
  await mountPanel();
});

afterEach(async () => {
  await flushEffects();
  act(() => render(null, container));
  container.remove();
  panelStyle.remove();
  localStorage.clear();
});

describe('changed state', () => {
  it('marks an edited flat row, filters it, and reverts through the transaction path', async () => {
    const input = container.querySelector<HTMLInputElement>('[aria-label="--zd-spacing-hgap-md value"]');
    if (!input) throw new Error('spacing input not found');
    const row = () => container.querySelector<HTMLElement>('[data-testid="tier-item-hsp-md"]');

    expect(row()?.classList.contains('is-changed')).toBe(false);
    expect(container.querySelector('[data-testid="tokenpanel-changed-tab-badge-spacing"]')).toBeNull();
    expect(container.querySelector('[data-testid="tokenpanel-changed-summary"]')?.textContent)
      .toContain('No changes');

    setInputValue(input, '44px');
    await flushEffects();

    expect(row()?.classList.contains('is-changed')).toBe(true);
    expect(container.querySelector('.tokenpanel-changed-tail')?.textContent)
      .toContain('default 40px → 44px');
    expect(container.querySelector('[data-testid="tokenpanel-changed-tab-badge-spacing"]')?.textContent).toBe('1');
    expect(container.querySelector('[data-testid="tokenpanel-changed-summary"]')?.textContent)
      .toContain('1 token changed across 1 tab');

    const changedOnly = container.querySelector<HTMLInputElement>('.tokenpanel-changed-only-checkbox');
    if (!changedOnly) throw new Error('Changed only checkbox not found');
    changedOnly.click();
    await flushEffects();
    expect(container.querySelector('[data-testid="tier-item-hsp-md"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="tier-item-vsp-sm"]')).toBeNull();

    const revert = row()?.querySelector<HTMLElement>('.tokenpanel-changed-revert');
    if (!revert) throw new Error('row revert control not found');
    revert.click();
    await flushEffects();
    expect(row()).toBeNull();
    expect(container.querySelector('[data-testid="tokenpanel-changed-empty"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="tokenpanel-changed-tab-badge-spacing"]')).toBeNull();
    expect(container.querySelector('[data-testid="tokenpanel-changed-summary"]')?.textContent)
      .toContain('No changes');
  });

  it('marks a Color semantic row and restores its active-identity baseline', async () => {
    const colorTab = Array.from(container.querySelectorAll<HTMLElement>('[role="tab"]'))
      .find((tab) => tab.textContent?.trim().startsWith('Color'));
    if (!colorTab) throw new Error('Color tab not found');
    colorTab.click();
    await flushEffects();

    const row = container.querySelector<HTMLElement>('[data-address="color/semantic/accent"]');
    if (!row) throw new Error('Color semantic row not found');
    const trigger = row.querySelector<HTMLElement>('[role="button"]');
    if (!trigger) throw new Error('Color semantic selector not found');
    trigger.click();
    await flushEffects();
    const option = container.querySelector<HTMLElement>('[role="option"][aria-label^="--fixture-p0"]');
    if (!option) throw new Error('Color palette option not found');
    option.click();
    await flushEffects();

    expect(row.classList.contains('is-changed')).toBe(true);
    expect(row.querySelector('.tokenpanel-changed-marker')).not.toBeNull();
    const revert = row.querySelector<HTMLElement>('.tokenpanel-changed-revert');
    if (!revert) throw new Error('Color revert control not found');
    revert.click();
    await flushEffects();
    expect(container.querySelector('[data-address="color/semantic/accent"]')?.classList.contains('is-changed'))
      .toBe(false);
  });
});
