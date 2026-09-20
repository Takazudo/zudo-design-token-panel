// @vitest-environment jsdom

/**
 * Unit tests for the extracted ModesRow pair-commit editor (#971).
 *
 * Pair-commit cases call `commitModePair` / `ModesEditorFields.onChange`
 * directly. ColorPicker is only opened in one smoke test.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { options, type VNode } from 'preact';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import type { ColorFieldProps } from '../../components/color-picker/color-field';
import type { TierItem } from '../../tokens/tier-model';
import {
  commitModePair,
  ModesEditorFields,
  ModesRow,
  resolveModeRowSides,
} from '../modes-row';

let container: HTMLDivElement;
const colorFieldProps = new Map<'light' | 'dark', ColorFieldProps>();
let prevVnode: typeof options.vnode;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  colorFieldProps.clear();
  prevVnode = options.vnode;
  // Capture ColorField props so pair-commit tests can call onChange without
  // driving ColorPicker (#971).
  options.vnode = (vnode: VNode) => {
    prevVnode?.(vnode);
    const type = vnode.type;
    if (typeof type === 'function' && type.name === 'ColorField') {
      const props = vnode.props as unknown as ColorFieldProps;
      if (props.resolveMode === 'light' || props.resolveMode === 'dark') {
        colorFieldProps.set(props.resolveMode, props);
      }
    }
  };
});

afterEach(() => {
  options.vnode = prevVnode;
  act(() => render(null, container));
  container.remove();
});

const MIXED_SIDES = {
  light: 'rgb(10, 20, 30)',
  dark: 'oklch(0.8 0.1 240)',
} as const;

function modeItem(overrides: Partial<TierItem> = {}): TierItem {
  return {
    id: 'surface',
    cssVar: '--mode-surface',
    label: 'Surface',
    default: '#abcdef',
    type: { kind: 'color' },
    modes: { light: '#ffffff', dark: '#111111' },
    ...overrides,
  };
}

function renderFields(
  item: TierItem,
  onChange: (next: string) => void,
  sides = item.modes ? { ...item.modes } : { light: item.default, dark: item.default },
): void {
  act(() => {
    render(<ModesEditorFields item={item} sides={sides} onChange={onChange} />, container);
  });
}

function renderRow(
  item: TierItem,
  props: Partial<{ onChange: (next: string) => void; sides: { light: string; dark: string } }> = {},
): void {
  act(() => {
    render(<ModesRow item={item} {...props} />, container);
  });
}

function swatches(): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-testid="color-field-swatch"]'));
}

function fireColorFieldChange(resolveMode: 'light' | 'dark', next: string): void {
  const handler = colorFieldProps.get(resolveMode)?.onChange;
  if (!handler) {
    throw new Error(`ModesEditorFields onChange for ${resolveMode} was not captured`);
  }
  act(() => {
    handler(next);
  });
}

describe('commitModePair', () => {
  it('replaces the edited side and preserves the other side bytes', () => {
    expect(commitModePair({ light: '#ffffff', dark: '#111111' }, 'light', '#00ff00'))
      .toBe('light-dark(#00ff00, #111111)');
    expect(commitModePair({ light: '#ffffff', dark: '#111111' }, 'dark', '#0000ff'))
      .toBe('light-dark(#ffffff, #0000ff)');
  });

  it('keeps the #946 mixed-format dark bytes when editing light', () => {
    expect(commitModePair(MIXED_SIDES, 'light', '#ff0000'))
      .toBe('light-dark(#ff0000, oklch(0.8 0.1 240))');
  });

  it('keeps the #946 mixed-format light bytes when editing dark', () => {
    expect(commitModePair(MIXED_SIDES, 'dark', '#00ff00'))
      .toBe('light-dark(rgb(10, 20, 30), #00ff00)');
  });

  it('writes light-dark(new, oldPlain) after a both-sides-equal flat override', () => {
    const item = modeItem();
    const sides = resolveModeRowSides(item, '#cccccc', true);
    expect(sides).toEqual({ light: '#cccccc', dark: '#cccccc' });
    expect(commitModePair(sides, 'light', '#0000ff')).toBe('light-dark(#0000ff, #cccccc)');
  });

  it('still emits a pair when both sides become equal', () => {
    expect(commitModePair({ light: '#ffffff', dark: '#111111' }, 'light', '#111111'))
      .toBe('light-dark(#111111, #111111)');
  });
});

describe('ModesEditorFields', () => {
  it('renders two ColorFields with Light/Dark labels and no Per-mode checkbox', () => {
    renderFields(modeItem(), vi.fn());

    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
    expect(container.querySelector('.tokenpanel-per-mode-toggle')).toBeNull();
    expect(container.querySelectorAll('.tokenpanel-per-mode-field')).toHaveLength(2);
    expect(
      Array.from(container.querySelectorAll('.tokenpanel-per-mode-label')).map((el) => el.textContent),
    ).toEqual(['Light', 'Dark']);
    expect(container.querySelector('[aria-label="Surface (Light): --mode-surface"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Surface (Dark): --mode-surface"]')).not.toBeNull();
    expect(swatches()).toHaveLength(2);
    expect(colorFieldProps.get('light')?.valueFormat).toBe('hex');
    expect(colorFieldProps.get('light')?.resolveMode).toBe('light');
    expect(colorFieldProps.get('dark')?.resolveMode).toBe('dark');
  });

  it('gives ColorFields to text-kind modes items as well', () => {
    renderFields(modeItem({ type: { kind: 'text' } }), vi.fn());
    expect(swatches()).toHaveLength(2);
    expect(container.querySelector('input[type="color"]')).toBeNull();
    expect(colorFieldProps.get('light')?.valueFormat).toBe('hex');
    expect(colorFieldProps.get('dark')?.valueFormat).toBe('hex');
  });

  it('uses oklch valueFormat only for color items with format oklch', () => {
    renderFields(modeItem({ type: { kind: 'color', format: 'oklch' } }), vi.fn());
    expect(colorFieldProps.get('light')?.valueFormat).toBe('oklch');
    expect(colorFieldProps.get('dark')?.valueFormat).toBe('oklch');

    renderFields(modeItem({ type: { kind: 'color', format: 'hex' } }), vi.fn());
    expect(colorFieldProps.get('light')?.valueFormat).toBe('hex');
    expect(colorFieldProps.get('dark')?.valueFormat).toBe('hex');
  });

  it('does not use banned semantic tags', () => {
    renderFields(modeItem(), vi.fn());
    expect(container.querySelectorAll('button, h1, h2, h3, h4, h5, h6, p, a').length).toBe(0);
  });

  it('commits a ColorField change through onChange as a preserved pair', () => {
    const onChange = vi.fn();
    renderFields(modeItem({ modes: { ...MIXED_SIDES } }), onChange, { ...MIXED_SIDES });

    fireColorFieldChange('light', '#ff0000');
    expect(onChange).toHaveBeenCalledWith('light-dark(#ff0000, oklch(0.8 0.1 240))');

    onChange.mockClear();
    fireColorFieldChange('dark', 'oklch(0.2 0.05 30)');
    expect(onChange).toHaveBeenCalledWith('light-dark(rgb(10, 20, 30), oklch(0.2 0.05 30))');
  });

  it('opens the picker from both div[role="button"] swatches', () => {
    renderFields(modeItem(), vi.fn());
    const buttons = swatches();
    expect(buttons).toHaveLength(2);

    for (const swatch of buttons) {
      expect(swatch.tagName).toBe('DIV');
      expect(swatch.getAttribute('role')).toBe('button');
      expect(swatch.getAttribute('tabindex')).toBe('0');
    }

    act(() => {
      buttons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.querySelector('.tokenpanel-color-picker')).not.toBeNull();

    act(() => {
      container
        .querySelector<HTMLElement>('.tokenpanel-color-picker-close-btn')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.querySelector('.tokenpanel-color-picker')).toBeNull();

    act(() => {
      buttons[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.querySelector('.tokenpanel-color-picker')).not.toBeNull();
  });
});

describe('ModesRow', () => {
  it('keeps chips and editor-disabled without onChange', () => {
    renderRow(modeItem());
    const row = container.querySelector('.tokenpanel-modes-row')!;
    expect(row.classList.contains('tokenpanel-row--editor-disabled')).toBe(true);
    expect(row.querySelectorAll('.tokenpanel-modes-chip')).toHaveLength(2);
    expect(swatches()).toHaveLength(0);
  });

  it('keeps chips and editor-disabled when readonly even with onChange', () => {
    renderRow(modeItem({ readonly: true }), { onChange: vi.fn() });
    const row = container.querySelector('.tokenpanel-modes-row')!;
    expect(row.classList.contains('tokenpanel-row--editor-disabled')).toBe(true);
    expect(row.querySelectorAll('.tokenpanel-modes-chip')).toHaveLength(2);
    expect(swatches()).toHaveLength(0);
    expect(container.querySelector('.tokenpanel-color-picker')).toBeNull();
  });

  it('renders ModesEditorFields when onChange is provided', () => {
    const onChange = vi.fn();
    renderRow(modeItem(), { onChange });
    const row = container.querySelector('.tokenpanel-modes-row')!;
    expect(row.classList.contains('tokenpanel-row--editor-disabled')).toBe(false);
    expect(row.querySelectorAll('.tokenpanel-modes-chip')).toHaveLength(0);
    expect(swatches()).toHaveLength(2);

    fireColorFieldChange('light', '#00ff00');
    expect(onChange).toHaveBeenCalledWith('light-dark(#00ff00, #111111)');
  });
});
