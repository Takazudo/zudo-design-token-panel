// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { ImportModal } from '../import-modal';
import type { ColorTweakState, TweakState } from '../state/tweak-state';
import { __resetPanelConfigForTests } from '../config/panel-config';
import { FIXTURE_CLUSTER, FIXTURE_TABS, installFixturePanelConfig } from './_test-helpers';
import { SCHEMA_V3 } from '../utils/design-token-serde';

let container: HTMLDivElement;

const colorDefaults: ColorTweakState = {
  palette: Array.from({ length: FIXTURE_CLUSTER.paletteSize }, () => '#000000'),
  background: 0,
  foreground: 15,
  cursor: 6,
  selectionBg: 0,
  selectionFg: 15,
  semanticMappings: { accent: 6, muted: 8, active: 14 },
  shikiTheme: 'dracula',
};

function makeState(overrides: Partial<TweakState> = {}): TweakState {
  return {
    color: {
      ...colorDefaults,
      palette: [...colorDefaults.palette],
      semanticMappings: { ...colorDefaults.semanticMappings },
    },
    spacing: {},
    typography: {},
    size: {},
    ...overrides,
  };
}

function modalText(...tabs: Record<string, unknown>[]): string {
  return JSON.stringify({ $schema: SCHEMA_V3, tabs: Object.assign({}, ...tabs) });
}

function roleButton(label: string): HTMLElement {
  const match = [...container.querySelectorAll<HTMLElement>('[role="button"]')]
    .find((node) => node.textContent?.trim() === label);
  if (!match) throw new Error(`role button ${label} not found`);
  return match;
}

function setJson(value: string): void {
  const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
  act(() => {
    textarea.value = value;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function analyze(): void {
  act(() => {
    roleButton('Analyze').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function loadByKeyboard(key: 'Enter' | ' ' = 'Enter'): void {
  act(() => {
    roleButton('Load').dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
}

function tabCheckbox(label: string): HTMLInputElement {
  const row = [...container.querySelectorAll<HTMLLabelElement>('label')]
    .find((node) => node.textContent?.includes(label));
  const input = row?.querySelector<HTMLInputElement>('input[type="checkbox"]');
  if (!input) throw new Error(`tab checkbox ${label} not found`);
  return input;
}

function modeRadio(value: string): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>(`input[type="radio"][value="${value}"]`);
  if (!input) throw new Error(`radio ${value} not found`);
  return input;
}

function mount(current = makeState(), onLoad = vi.fn()) {
  act(() => {
    render(
      <ImportModal
        onClose={vi.fn()}
        onLoad={onLoad}
        colorDefaults={colorDefaults}
        current={current}
      />,
      container,
    );
  });
  return onLoad;
}

beforeEach(() => {
  installFixturePanelConfig({ tabs: FIXTURE_TABS });
  container = document.createElement('div');
  document.body.appendChild(container);
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

afterEach(() => {
  act(() => render(null, container));
  container.remove();
  __resetPanelConfigForTests();
  delete (HTMLDialogElement.prototype as { showModal?: unknown }).showModal;
  delete (HTMLDialogElement.prototype as { close?: unknown }).close;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('ImportModal scoped loading', () => {
  it('analyzes automatically after the debounce and loads the default scope', () => {
    vi.useFakeTimers();
    const onLoad = mount();
    setJson(modalText({ spacing: { raw: { '--zd-spacing-hgap-md': '24px' } } }));

    expect(container.textContent).toContain('Analyzing');
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(container.textContent).not.toContain('Import scope');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(container.textContent).toContain('Import scope');

    loadByKeyboard();
    expect(onLoad).toHaveBeenCalledOnce();
    expect(onLoad.mock.calls[0][0].spacing).toEqual({ 'hsp-md': '24px' });
  });

  it('ignores a stale debounced analysis after newer input arrives', () => {
    vi.useFakeTimers();
    mount();
    setJson(modalText({ spacing: { raw: { '--zd-spacing-hgap-md': '12px' } } }));
    act(() => {
      vi.advanceTimersByTime(150);
    });
    setJson(modalText({ size: { raw: { '--radius-lg': '4px' } } }));
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(container.textContent).not.toContain('Import scope');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(container.textContent).toContain('Size');
    expect(container.textContent).not.toContain('Spacing');
  });

  it('keeps an unchecked tab from replacing its current state', () => {
    const current = makeState({
      spacing: { 'hsp-md': '10px' },
      size: { 'radius-lg': '20px' },
    });
    const onLoad = mount(current);
    setJson(modalText(
      { spacing: { raw: { '--zd-spacing-hgap-md': '24px' } } },
      { size: { raw: { '--radius-lg': '4px' } } },
    ));
    analyze();

    const size = tabCheckbox('Size');
    expect(size.checked).toBe(true);
    act(() => {
      size.checked = false;
      size.dispatchEvent(new Event('change', { bubbles: true }));
    });
    loadByKeyboard(' ');

    expect(onLoad.mock.calls[0][0].spacing).toEqual({ 'hsp-md': '24px' });
    expect(onLoad.mock.calls[0][0].size).toEqual({ 'radius-lg': '20px' });
  });

  it('passes swap mode selection through to deserialize', () => {
    const onLoad = mount();
    setJson(modalText({
      color: { palette: { '--fixture-p0': 'light-dark(#ffffff, #111111)' } },
    }));
    analyze();

    expect(container.textContent).toContain('Mode sides found:');
    const swap = modeRadio('swap');
    act(() => {
      swap.checked = true;
      swap.dispatchEvent(new Event('change', { bubbles: true }));
    });
    loadByKeyboard();

    expect(onLoad.mock.calls[0][0].color.palette[0]).toBe('light-dark(#111111, #ffffff)');
  });

  it('passes merge strategy selection and current state through to deserialize', () => {
    const current = makeState({
      spacing: { 'vsp-sm': '22px' },
    });
    const onLoad = mount(current);
    setJson(modalText({ spacing: { raw: { '--zd-spacing-hgap-md': '24px' } } }));
    analyze();

    const merge = modeRadio('merge');
    act(() => {
      merge.checked = true;
      merge.dispatchEvent(new Event('change', { bubbles: true }));
    });
    loadByKeyboard();

    expect(onLoad.mock.calls[0][0].spacing).toEqual({
      'hsp-md': '24px',
      'vsp-sm': '22px',
    });
  });

  it('shows foreign tabs as disabled and lists unknown entries', () => {
    mount();
    setJson(modalText(
      { spacing: { raw: { '--zd-spacing-hgap-md': '24px', '--unknown': '1px' } } },
      { foreign: { raw: { '--foreign': '1px' } } },
    ));
    analyze();

    expect(container.textContent).toContain('Unknown tokens (will be skipped)');
    expect(container.textContent).toContain('--unknown');
    expect(container.textContent).toContain('not in this panel');
    expect(tabCheckbox('foreign').disabled).toBe(true);
  });
});
