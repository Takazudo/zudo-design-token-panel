// @vitest-environment browser

import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import DesignTokenTweakPanel from '../../panel';
import { getOpenKey, getPositionKey, getSizeKey } from '../../state/tweak-state';
import { FIXTURE_PANEL_CONFIG, flushEffects } from '../../__tests__/_test-helpers';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — ?inline is a Vite-specific query not typed in tsconfig
const panelCssModule = import('../../styles/panel.css?inline');

let container: HTMLDivElement;
let target: HTMLDivElement;
let ancestor: HTMLDivElement;
let hostStyle: HTMLStyleElement;
let panelStyle: HTMLStyleElement;

async function installPanelCss(): Promise<void> {
  const css: string = ((await panelCssModule) as { default: string }).default;
  panelStyle = document.createElement('style');
  panelStyle.textContent = css;
  document.head.appendChild(panelStyle);
}

function installFixtureCss(): void {
  hostStyle = document.createElement('style');
  hostStyle.textContent = `
    * { box-sizing: content-box; margin: 10px !important; }
    svg { fill: red !important; }
    :root {
      --zd-spacing-hgap-md: 8px;
      --radius-lg: 4px;
      --zd-font-base-size: 16px;
      --fixture-p6: rgb(30 90 180);
    }
    .inspect-ancestor { color: var(--fixture-p6); }
    .inspect-target {
      background: var(--fixture-p6);
      padding: var(--zd-spacing-hgap-md);
      border-radius: var(--radius-lg);
      font-size: var(--zd-font-base-size);
    }
  `;
  document.head.appendChild(hostStyle);
}

async function mountPanel(): Promise<void> {
  localStorage.setItem(getOpenKey(FIXTURE_PANEL_CONFIG), '1');
  localStorage.setItem(getPositionKey(FIXTURE_PANEL_CONFIG), JSON.stringify({ top: 20, left: 20 }));
  localStorage.setItem(getSizeKey(FIXTURE_PANEL_CONFIG), JSON.stringify({ width: 700, height: 400 }));
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    render(<DesignTokenTweakPanel instanceConfig={FIXTURE_PANEL_CONFIG} />, container);
  });
  await flushEffects();
}

function moveToTarget(): void {
  const rect = target.getBoundingClientRect();
  document.dispatchEvent(new MouseEvent('mousemove', {
    bubbles: true,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
  }));
}

function clickTarget(): void {
  const rect = target.getBoundingClientRect();
  const clientX = rect.left + rect.width / 2;
  const clientY = rect.top + rect.height / 2;
  target.dispatchEvent(new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
  }));
  target.dispatchEvent(new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
  }));
}

beforeEach(async () => {
  localStorage.clear();
  document.body.innerHTML = '';
  installFixtureCss();
  ancestor = document.createElement('div');
  ancestor.className = 'inspect-ancestor';
  ancestor.style.cssText = 'position:fixed;left:800px;top:580px;width:180px;height:100px';
  target = document.createElement('div');
  target.className = 'inspect-target';
  target.textContent = 'Inspect me';
  ancestor.appendChild(target);
  document.body.appendChild(ancestor);
  await installPanelCss();
  await mountPanel();
});

afterEach(async () => {
  if (container) {
    act(() => render(null, container));
    container.remove();
  }
  target?.remove();
  ancestor?.remove();
  hostStyle?.remove();
  panelStyle?.remove();
  localStorage.clear();
  await flushEffects();
});

describe('element inspect view', () => {
  it('lists token-backed properties, inherited rows, and applies an inline edit', async () => {
    const toggle = container.querySelector<HTMLElement>('.tokenpanel-element-inspect-toggle');
    if (!toggle) throw new Error('element inspect toggle not mounted');
    act(() => toggle.click());
    await flushEffects();
    act(moveToTarget);
    await flushEffects();
    expect(document.querySelector('.tokenpanel-element-inspect-box')).not.toBeNull();

    act(clickTarget);
    await flushEffects();

    const view = container.querySelector<HTMLElement>('.tokenpanel-element-inspect-view');
    expect(view?.textContent).toContain('background');
    expect(view?.textContent).toContain('padding');
    expect(view?.textContent).toContain('border-radius');
    expect(view?.textContent).toContain('font-size');
    expect(view?.textContent).toContain('Inherited from ancestors');
    expect(view?.textContent).toContain('color');

    const input = view?.querySelector<HTMLInputElement>('[data-css-var="--zd-spacing-hgap-md"] input');
    if (!input) throw new Error('spacing inspect input not mounted');
    act(() => {
      input.value = '12';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await flushEffects();
    expect(getComputedStyle(target).paddingTop).toBe('12px');

    const colorJump = view?.querySelector<HTMLElement>('[aria-label*="Jump to Color tab"]');
    expect(colorJump).not.toBeNull();
    act(() => colorJump?.click());
    await flushEffects();
    expect(container.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe('Color');
  });

  it('keeps the body-level inspect marker isolated from hostile host CSS', async () => {
    const toggle = container.querySelector<HTMLElement>('.tokenpanel-element-inspect-toggle');
    if (!toggle) throw new Error('element inspect toggle not mounted');
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'i',
        bubbles: true,
        cancelable: true,
      }));
    });
    await flushEffects();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    const icon = toggle.querySelector<SVGSVGElement>('svg');
    expect(icon).not.toBeNull();
    expect(getComputedStyle(icon!).fill).toBe('none');
    act(moveToTarget);
    await flushEffects();
    const marker = document.querySelector<HTMLElement>('.tokenpanel-element-inspect-box');
    expect(marker).not.toBeNull();
    expect(getComputedStyle(marker!).marginTop).toBe('0px');
    expect(getComputedStyle(marker!).paddingTop).toBe('0px');
    expect(getComputedStyle(marker!).boxSizing).toBe('border-box');
  });

  it('returns to the tab that was active before Inspect after clear', async () => {
    const toggle = container.querySelector<HTMLElement>('.tokenpanel-element-inspect-toggle');
    if (!toggle) throw new Error('element inspect toggle not mounted');
    act(() => toggle.click());
    await flushEffects();
    act(moveToTarget);
    await flushEffects();
    act(clickTarget);
    await flushEffects();

    const clear = container.querySelector<HTMLElement>('[aria-label="Clear inspected element"]');
    if (!clear) throw new Error('inspect clear control not mounted');
    act(() => clear.click());
    await flushEffects();
    expect(container.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe('Spacing');
  });
});
