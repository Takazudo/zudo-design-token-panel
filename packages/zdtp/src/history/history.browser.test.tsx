// @vitest-environment browser

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import DesignTokenTweakPanel from '../panel';
import { getOpenKey, getPositionKey, getSizeKey } from '../state/tweak-state';
import { FIXTURE_PANEL_CONFIG, flushEffects } from '../__tests__/_test-helpers';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — ?inline is a Vite-specific query not typed in tsconfig
const panelCssModule = import('../styles/panel.css?inline');

let container: HTMLDivElement;
let injectedStyle: HTMLStyleElement | null = null;

async function injectPanelCss(): Promise<void> {
  const panelCss: string = ((await panelCssModule) as { default: string }).default;
  injectedStyle = document.createElement('style');
  injectedStyle.textContent = panelCss;
  document.head.appendChild(injectedStyle);
}

async function mountPanel(width = 700): Promise<void> {
  localStorage.setItem(getOpenKey(FIXTURE_PANEL_CONFIG), '1');
  localStorage.setItem(getPositionKey(FIXTURE_PANEL_CONFIG), JSON.stringify({ top: 20, left: 20 }));
  localStorage.setItem(getSizeKey(FIXTURE_PANEL_CONFIG), JSON.stringify({ width, height: 500 }));
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => render(<DesignTokenTweakPanel instanceConfig={FIXTURE_PANEL_CONFIG} />, container));
  await flushEffects();
}

function shell(): HTMLElement {
  const element = container.querySelector<HTMLElement>('.tokenpanel-shell');
  if (!element) throw new Error('panel shell not mounted');
  return element;
}

async function editSpacing(value: string): Promise<HTMLInputElement> {
  const input = container.querySelector<HTMLInputElement>(
    '[aria-label="--zd-spacing-hgap-md value"]',
  );
  if (!input) throw new Error('spacing input not mounted');
  act(() => {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await flushEffects();
  return input;
}

beforeEach(async () => {
  localStorage.clear();
  document.body.innerHTML = '';
  await injectPanelCss();
});

afterEach(async () => {
  await flushEffects();
  if (container) {
    act(() => render(null, container));
    container.remove();
  }
  injectedStyle?.remove();
  injectedStyle = null;
  localStorage.clear();
});

describe('history controls and snapshots', () => {
  it('undoes and redoes an edit through the header controls and shortcuts', async () => {
    await mountPanel();
    const input = await editSpacing('48px');
    expect(input.value).toBe('48');

    const undo = container.querySelector<HTMLElement>('[aria-label="Undo"]');
    const redo = container.querySelector<HTMLElement>('[aria-label="Redo"]');
    const count = container.querySelector<HTMLElement>('.tokenpanel-history-count');
    expect(undo?.getAttribute('aria-disabled')).not.toBe('true');
    expect(redo?.getAttribute('aria-disabled')).toBe('true');
    expect(count?.textContent).toBe('1/1');
    expect(document.documentElement.style.getPropertyValue('--zd-spacing-hgap-md')).toBe('48px');

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', metaKey: true, bubbles: true, cancelable: true }),
    );
    await flushEffects();
    expect(input.value).toBe('40');
    // The pre-edit state had no override, so undo removes the inline value and
    // lets the host stylesheet's manifest default show through.
    expect(document.documentElement.style.getPropertyValue('--zd-spacing-hgap-md')).toBe('');

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'z',
        metaKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    await flushEffects();
    expect(input.value).toBe('48');
    expect(document.documentElement.style.getPropertyValue('--zd-spacing-hgap-md')).toBe('48px');
  });

  it('opens a history rail, saves A/B, and flips the selected snapshot', async () => {
    await mountPanel();
    await editSpacing('48px');
    container.querySelector<HTMLElement>('[aria-label="History rail"]')?.click();
    await flushEffects();

    expect(shell().classList.contains('is-history-open')).toBe(true);
    expect(container.querySelector('[data-testid="tokenpanel-history-rail"]')).not.toBeNull();

    const saveA = container.querySelector<HTMLElement>('[aria-label="Save snapshot A"]');
    expect(saveA).not.toBeNull();
    saveA?.click();
    await flushEffects();
    expect(JSON.parse(localStorage.getItem('zudo-design-token-panel-snapshot-a') ?? '{}')).toMatchObject({
      identity: expect.any(String),
      savedAt: expect.any(Number),
      edits: 1,
    });

    await editSpacing('52px');
    container.querySelector<HTMLElement>('[aria-label="Save snapshot B"]')?.click();
    await flushEffects();
    expect(document.documentElement.style.getPropertyValue('--zd-spacing-hgap-md')).toBe('52px');

    container.querySelector<HTMLElement>('[aria-label="Compare snapshot A"]')?.click();
    await flushEffects();
    expect(document.documentElement.style.getPropertyValue('--zd-spacing-hgap-md')).toBe('48px');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '\\', bubbles: true, cancelable: true }));
    await flushEffects();
    expect(document.documentElement.style.getPropertyValue('--zd-spacing-hgap-md')).toBe('52px');
  });

  it('hides the rail below its 640px container threshold', async () => {
    await mountPanel(600);
    container.querySelector<HTMLElement>('[aria-label="History rail"]')?.click();
    await flushEffects();
    const rail = container.querySelector<HTMLElement>('[data-testid="tokenpanel-history-rail"]');
    expect(rail).not.toBeNull();
    expect(getComputedStyle(rail!).display).toBe('none');
  });
});
