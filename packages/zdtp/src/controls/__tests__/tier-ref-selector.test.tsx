// @vitest-environment jsdom

/**
 * Unit tests for TierRefSelector — the grouped ref-or-literal control (S9,
 * #470).
 *
 * Test structure:
 *  1. Flat/intra-tab mode (font/spacing/size/generic-tab consumers) —
 *     no `<optgroup>`, bare intra-tab ref options, "Literal…" is a
 *     revert-to-default signal (no editor renders).
 *  2. Grouped ref-or-literal mode (Color tab semantic tiers that declare
 *     `referencesRamps`) — one `<optgroup>` per ramp source (cross-tab),
 *     picking a ramp option emits `{ ref }`, picking "Literal…" (or already
 *     being in literal mode) renders an editable OKLCH `ColorField` and
 *     emits `{ literal }`.
 *  3. DOM hygiene — native `<select>`/`<option>`/`<optgroup>` only, no
 *     `role="listbox"`/`role="option"`, no `<button>`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import TierRefSelector, {
  type TierRefSelectorValue,
  type TierRefTarget,
} from '../tier-ref-selector';
import type { TabConfig } from '../../tokens/tier-model';

// ---------------------------------------------------------------------------
// Fixture: 2-tier easing tab (flat / intra-tab mode)
// ---------------------------------------------------------------------------

const EASING_TAB: TabConfig = {
  id: 'easing',
  label: 'Easing',
  tiers: [
    {
      id: 'raw',
      label: 'Raw curves',
      items: [
        {
          id: 'ease-in',
          cssVar: '--easing-ease-in',
          label: 'Ease in',
          default: 'cubic-bezier(0.42, 0, 1, 1)',
          type: { kind: 'text' },
        },
        {
          id: 'ease-out',
          cssVar: '--easing-ease-out',
          label: 'Ease out',
          default: 'cubic-bezier(0, 0, 0.58, 1)',
          type: { kind: 'text' },
        },
        {
          id: 'linear',
          cssVar: '--easing-linear',
          label: 'Linear',
          default: 'linear',
          type: { kind: 'text' },
        },
      ],
    },
    {
      id: 'semantic',
      label: 'Semantic roles',
      referencesTier: 'raw',
      items: [
        {
          id: 'tab-open',
          cssVar: '--easing-tab-open',
          label: 'Tab open',
          default: 'ease-out',
          type: { kind: 'text' },
        },
        {
          id: 'tab-close',
          cssVar: '--easing-tab-close',
          label: 'Tab close',
          default: 'ease-in',
          type: { kind: 'text' },
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Fixture: cross-tab ramp source (grouped ref-or-literal mode)
// ---------------------------------------------------------------------------

const RAMP_PALETTE_TAB: TabConfig = {
  id: 'palette',
  label: 'Palette',
  tiers: [
    {
      id: 'base',
      label: 'Base',
      items: [
        { id: 'base-1', cssVar: '--palette-base-1', label: 'Base 1', default: 'oklch(0.98 0 0)', type: { kind: 'color', format: 'oklch' } },
        { id: 'base-2', cssVar: '--palette-base-2', label: 'Base 2', default: 'oklch(0.9 0 0)', type: { kind: 'color', format: 'oklch' } },
        { id: 'base-3', cssVar: '--palette-base-3', label: 'Base 3', default: 'oklch(0.8 0 0)', type: { kind: 'color', format: 'oklch' } },
      ],
    },
    {
      id: 'accent',
      label: 'Accent',
      items: [
        { id: 'accent-1', cssVar: '--palette-accent-1', label: 'Accent 1', default: 'oklch(0.6 0.2 30)', type: { kind: 'color', format: 'oklch' } },
        { id: 'accent-2', cssVar: '--palette-accent-2', label: 'Accent 2', default: 'oklch(0.5 0.2 30)', type: { kind: 'color', format: 'oklch' } },
      ],
    },
  ],
};

const GROUPED_COLOR_TAB: TabConfig = {
  id: 'color',
  label: 'Color',
  tiers: [
    {
      id: 'semantic',
      label: 'Semantic',
      semantic: true,
      referencesRamps: [{ tab: 'palette', tier: 'base' }, { tab: 'palette', tier: 'accent' }],
      items: [
        { id: 'surface', cssVar: '--zd-surface', label: 'Surface', default: 'base-3', type: { kind: 'color' } },
      ],
    },
  ],
};

const ALL_TABS: readonly TabConfig[] = [GROUPED_COLOR_TAB, RAMP_PALETTE_TAB];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => {
    render(null, container);
  });
  container.remove();
});

/** Default previewValueFor for the flat/easing fixture — returns the raw item's manifest default. */
function defaultPreviewValueFor(ref: TierRefTarget): string {
  const rawTier = EASING_TAB.tiers[0];
  const item = rawTier.items.find((i) => i.id === ref.item);
  return item?.default ?? ref.item;
}

function renderFlatSelector(
  value: TierRefSelectorValue,
  onChange: (itemId: string, next: TierRefSelectorValue) => void,
  previewValueFor: (ref: TierRefTarget) => string = defaultPreviewValueFor,
) {
  act(() => {
    render(
      <TierRefSelector
        tab={EASING_TAB}
        tierId="semantic"
        itemId="tab-open"
        value={value}
        onChange={onChange}
        previewValueFor={previewValueFor}
      />,
      container,
    );
  });
}

/** previewValueFor for the grouped fixture — returns the ramp item's manifest default. */
function rampPreviewValueFor(ref: TierRefTarget): string {
  const targetTab = ref.tab ? ALL_TABS.find((t) => t.id === ref.tab) : GROUPED_COLOR_TAB;
  const item = targetTab?.tiers.find((t) => t.id === ref.tier)?.items.find((i) => i.id === ref.item);
  return item?.default ?? ref.item;
}

function renderGroupedSelector(
  value: TierRefSelectorValue,
  onChange: (itemId: string, next: TierRefSelectorValue) => void,
  previewValueFor: (ref: TierRefTarget) => string = rampPreviewValueFor,
  defaultMode?: 'light' | 'dark',
) {
  act(() => {
    render(
      <TierRefSelector
        tab={GROUPED_COLOR_TAB}
        tabs={ALL_TABS}
        tierId="semantic"
        itemId="surface"
        value={value}
        onChange={onChange}
        previewValueFor={previewValueFor}
        label="Surface"
        cssVar="--zd-surface"
        defaultMode={defaultMode}
      />,
      container,
    );
  });
}

/** Fire a native change event on a checkbox, toggling its checked state. */
function fireCheckboxToggle(checkbox: HTMLInputElement, checked: boolean) {
  act(() => {
    checkbox.checked = checked;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function getSelect(): HTMLSelectElement {
  const el = container.querySelector<HTMLSelectElement>('select.tokenpanel-tier-ref-select');
  if (!el) throw new Error('select.tokenpanel-tier-ref-select not found');
  return el;
}

function getOptions(): HTMLOptionElement[] {
  return Array.from(getSelect().querySelectorAll('option'));
}

function getOptgroups(): HTMLOptGroupElement[] {
  return Array.from(getSelect().querySelectorAll('optgroup'));
}

function findOptionByText(needle: string): HTMLOptionElement {
  const opt = getOptions().find((o) => (o.textContent ?? '').includes(needle));
  if (!opt) throw new Error(`no option with text containing "${needle}"`);
  return opt;
}

/** Fire a native change event on a select element, setting its value first. */
function fireSelectChange(select: HTMLSelectElement, newValue: string) {
  act(() => {
    Object.defineProperty(select, 'value', { value: newValue, writable: true, configurable: true });
    select.value = newValue;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

// ===========================================================================
// 1. Flat / intra-tab mode (font/spacing/size/generic-tab)
// ===========================================================================

describe('TierRefSelector — flat/intra-tab mode', () => {
  it('renders a native <select> element', () => {
    renderFlatSelector({ ref: { tier: 'raw', item: 'ease-out' } }, vi.fn());
    expect(getSelect()).not.toBeNull();
  });

  it('renders one option per raw tier item plus the Literal option, with NO optgroup', () => {
    renderFlatSelector({ ref: { tier: 'raw', item: 'ease-out' } }, vi.fn());
    // 3 raw items + 1 Literal sentinel = 4 options, flat (no grouping).
    expect(getOptions().length).toBe(4);
    expect(getOptgroups().length).toBe(0);
  });

  it('does NOT use role=listbox or role=option markup', () => {
    renderFlatSelector({ ref: { tier: 'raw', item: 'ease-out' } }, vi.fn());
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect(container.querySelector('[role="option"]')).toBeNull();
  });

  it('selected value matches the current ref item', () => {
    renderFlatSelector({ ref: { tier: 'raw', item: 'ease-out' } }, vi.fn());
    const selected = getOptions().find((o) => o.selected);
    expect(selected?.textContent).toContain('--easing-ease-out');
  });

  it('renders a disabled, selected placeholder when the ref is unrecognised (issue #479 nit n3)', () => {
    const onChange = vi.fn();
    renderFlatSelector({ ref: { tier: 'raw', item: 'unknown-id' } }, onChange);
    const selected = getOptions().find((o) => o.selected);
    expect(selected?.textContent).toContain('unresolved: raw/unknown-id');
    expect(selected?.disabled).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('picking a real option out of the unresolved placeholder emits a valid { ref }', () => {
    const onChange = vi.fn();
    renderFlatSelector({ ref: { tier: 'raw', item: 'unknown-id' } }, onChange);

    fireSelectChange(getSelect(), findOptionByText('--easing-linear').value);

    expect(onChange).toHaveBeenCalledWith('tab-open', { ref: { tier: 'raw', item: 'linear' } });
  });

  it('each raw item option label includes cssVar and preview value', () => {
    renderFlatSelector({ ref: { tier: 'raw', item: 'ease-out' } }, vi.fn());
    const opt = findOptionByText('--easing-ease-in');
    expect(opt.textContent).toContain('cubic-bezier(0.42, 0, 1, 1)');
  });

  it('truncates long preview values in option labels', () => {
    const longValue = 'a'.repeat(40);
    const previewValueFor = (ref: TierRefTarget) => (ref.item === 'ease-in' ? longValue : ref.item);
    renderFlatSelector({ ref: { tier: 'raw', item: 'ease-out' } }, vi.fn(), previewValueFor);
    const opt = findOptionByText('--easing-ease-in');
    expect(opt.textContent).toContain('…');
    expect(opt.textContent).not.toContain(longValue);
  });

  it('Literal option is last, labelled "Literal…"', () => {
    renderFlatSelector({ ref: { tier: 'raw', item: 'ease-out' } }, vi.fn());
    const options = getOptions();
    expect(options[options.length - 1].textContent).toContain('Literal');
  });

  it('does NOT render a literal editor even when the value is { literal } (flat mode has no editor)', () => {
    renderFlatSelector({ literal: 'whatever' }, vi.fn());
    expect(container.querySelector('[data-testid="color-field-swatch"]')).toBeNull();
  });

  it('calls onChange with { ref } when the user picks a different raw item', () => {
    const onChange = vi.fn();
    renderFlatSelector({ ref: { tier: 'raw', item: 'ease-in' } }, onChange);

    fireSelectChange(getSelect(), findOptionByText('--easing-ease-out').value);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('tab-open', { ref: { tier: 'raw', item: 'ease-out' } });
  });

  it('calls onChange with { ref } when linear is selected', () => {
    const onChange = vi.fn();
    renderFlatSelector({ ref: { tier: 'raw', item: 'ease-in' } }, onChange);

    fireSelectChange(getSelect(), findOptionByText('--easing-linear').value);

    expect(onChange).toHaveBeenCalledWith('tab-open', { ref: { tier: 'raw', item: 'linear' } });
  });

  it('calls onChange with { literal } when "Literal…" is picked (consumer treats this as revert-to-default)', () => {
    const onChange = vi.fn();
    renderFlatSelector({ ref: { tier: 'raw', item: 'ease-in' } }, onChange);

    fireSelectChange(getSelect(), findOptionByText('Literal').value);

    expect(onChange).toHaveBeenCalledTimes(1);
    const [, next] = onChange.mock.calls[0]!;
    expect('literal' in next).toBe(true);
  });
});

// ===========================================================================
// 2. Grouped ref-or-literal mode (Color tab cross-tab ramps, S9 #470)
// ===========================================================================

describe('TierRefSelector — grouped ref-or-literal mode', () => {
  it('renders one <optgroup> per referencesRamps source, labelled by the source tier', () => {
    renderGroupedSelector({ ref: { tab: 'palette', tier: 'base', item: 'base-3' } }, vi.fn());
    const groups = getOptgroups();
    expect(groups.length).toBe(2);
    expect(groups.map((g) => g.label)).toEqual(['Base', 'Accent']);
  });

  it('each optgroup contains one option per ramp item, plus a trailing Literal option outside any group', () => {
    renderGroupedSelector({ ref: { tab: 'palette', tier: 'base', item: 'base-3' } }, vi.fn());
    const groups = getOptgroups();
    expect(groups[0].querySelectorAll('option').length).toBe(3); // base-1/2/3
    expect(groups[1].querySelectorAll('option').length).toBe(2); // accent-1/2
    // Literal option lives directly under <select>, not inside an <optgroup>.
    const select = getSelect();
    const directOptions = Array.from(select.children).filter(
      (c) => c.tagName.toLowerCase() === 'option',
    );
    expect(directOptions.length).toBe(1);
    expect(directOptions[0].textContent).toContain('Literal');
  });

  it('ramp option labels include the item cssVar and its preview value', () => {
    renderGroupedSelector({ ref: { tab: 'palette', tier: 'base', item: 'base-3' } }, vi.fn());
    const opt = findOptionByText('--palette-accent-2');
    expect(opt.textContent).toContain('oklch(0.5 0.2 30)');
  });

  it('selects the option matching the current { ref } value', () => {
    renderGroupedSelector({ ref: { tab: 'palette', tier: 'accent', item: 'accent-2' } }, vi.fn());
    const selected = getOptions().find((o) => o.selected);
    expect(selected?.textContent).toContain('--palette-accent-2');
  });

  it('does NOT render a literal editor while a ramp ref is selected', () => {
    renderGroupedSelector({ ref: { tab: 'palette', tier: 'base', item: 'base-3' } }, vi.fn());
    expect(container.querySelector('[data-testid="color-field-swatch"]')).toBeNull();
  });

  it('renders a disabled, selected placeholder when a cross-tab ref no longer resolves (issue #479 nit n3)', () => {
    const onChange = vi.fn();
    renderGroupedSelector({ ref: { tab: 'palette', tier: 'base', item: 'gone' } }, onChange);
    const selected = getOptions().find((o) => o.selected);
    expect(selected?.textContent).toContain('unresolved: base/gone');
    expect(selected?.disabled).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
    // Stays out of the literal editor too — it's neither a resolved ref nor a literal.
    expect(container.querySelector('[data-testid="color-field-swatch"]')).toBeNull();
  });

  it('picking a real ramp option out of the unresolved placeholder emits a valid { ref }', () => {
    const onChange = vi.fn();
    renderGroupedSelector({ ref: { tab: 'palette', tier: 'base', item: 'gone' } }, onChange);

    fireSelectChange(getSelect(), findOptionByText('--palette-accent-2').value);

    expect(onChange).toHaveBeenCalledWith('surface', {
      ref: { tab: 'palette', tier: 'accent', item: 'accent-2' },
    });
  });

  it('selecting a ramp option emits { ref: { tab, tier, item } }', () => {
    const onChange = vi.fn();
    renderGroupedSelector({ ref: { tab: 'palette', tier: 'base', item: 'base-1' } }, onChange);

    fireSelectChange(getSelect(), findOptionByText('--palette-accent-2').value);

    expect(onChange).toHaveBeenCalledWith('surface', {
      ref: { tab: 'palette', tier: 'accent', item: 'accent-2' },
    });
  });

  it('selecting "Literal…" emits { literal } seeded from the currently resolved preview', () => {
    const onChange = vi.fn();
    renderGroupedSelector({ ref: { tab: 'palette', tier: 'base', item: 'base-3' } }, onChange);

    fireSelectChange(getSelect(), findOptionByText('Literal').value);

    expect(onChange).toHaveBeenCalledWith('surface', { literal: 'oklch(0.8 0 0)' });
  });

  it('renders an editable OKLCH ColorField swatch when the value is already { literal }', () => {
    renderGroupedSelector({ literal: 'oklch(0.5 0.1 200)' }, vi.fn());
    const swatch = container.querySelector('[data-testid="color-field-swatch"]') as HTMLElement;
    expect(swatch).not.toBeNull();
    expect(swatch.style.backgroundColor).toContain('oklch');
  });

  it('the select shows "Literal…" selected when the value is { literal }', () => {
    renderGroupedSelector({ literal: 'oklch(0.5 0.1 200)' }, vi.fn());
    const selected = getOptions().find((o) => o.selected);
    expect(selected?.textContent).toContain('Literal');
  });

  describe('editing the literal swatch', () => {
    beforeEach(() => {
      // Pin the in-picker display mode so the OKLCH (L/C/H) sliders render
      // deterministically, mirroring the color-tab.test.tsx suite.
      localStorage.setItem('tokenpanel.colorPicker.mode', 'oklch');
    });
    afterEach(() => {
      localStorage.removeItem('tokenpanel.colorPicker.mode');
    });

    it('dispatches { literal: <new oklch string> } when the picker value changes', () => {
      const onChange = vi.fn();
      renderGroupedSelector({ literal: 'oklch(0.5 0.1 200)' }, onChange);

      const swatchBtn = container.querySelector('[data-testid="color-field-swatch"]') as HTMLElement;
      act(() => swatchBtn.click());
      const slider = container.querySelector('[role="dialog"] [role="slider"]') as HTMLElement;
      expect(slider).not.toBeNull();
      act(() => {
        slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      });

      expect(onChange).toHaveBeenCalled();
      const [itemId, next] = onChange.mock.calls.at(-1)!;
      expect(itemId).toBe('surface');
      expect(next).toEqual({ literal: expect.stringMatching(/^oklch\(/) });
    });
  });
});

// ===========================================================================
// 3. Per-mode (light/dark) literal editor (S12, #473)
// ===========================================================================

describe('TierRefSelector — per-mode literal editor', () => {
  it('renders a "Per-mode" checkbox alongside a single-mode literal, unchecked', () => {
    renderGroupedSelector({ literal: 'oklch(0.5 0.1 200)' }, vi.fn());
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).not.toBeNull();
    expect(checkbox.checked).toBe(false);
    // Still exactly one editable swatch (single-mode).
    expect(container.querySelectorAll('[data-testid="color-field-swatch"]').length).toBe(1);
  });

  it('renders two ColorField swatches (Light / Dark), checkbox checked, for a per-mode value', () => {
    renderGroupedSelector({ literal: { light: 'oklch(0.9 0 0)', dark: 'oklch(0.2 0 0)' } }, vi.fn());
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(container.querySelectorAll('[data-testid="color-field-swatch"]').length).toBe(2);
    expect(
      container.querySelector('[aria-label="Surface (Light): --zd-surface"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[aria-label="Surface (Dark): --zd-surface"]'),
    ).not.toBeNull();
  });

  it('checking "Per-mode" on a single-mode literal seeds both sides from the current value', () => {
    const onChange = vi.fn();
    renderGroupedSelector({ literal: 'oklch(0.5 0.1 200)' }, onChange);

    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireCheckboxToggle(checkbox, true);

    expect(onChange).toHaveBeenCalledWith('surface', {
      literal: { light: 'oklch(0.5 0.1 200)', dark: 'oklch(0.5 0.1 200)' },
    });
  });

  it('unchecking "Per-mode" collapses to the light side by default (defaultMode="light")', () => {
    const onChange = vi.fn();
    renderGroupedSelector(
      { literal: { light: 'oklch(0.9 0 0)', dark: 'oklch(0.2 0 0)' } },
      onChange,
    );

    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireCheckboxToggle(checkbox, false);

    expect(onChange).toHaveBeenCalledWith('surface', { literal: 'oklch(0.9 0 0)' });
  });

  it('unchecking "Per-mode" collapses to the dark side when defaultMode="dark"', () => {
    const onChange = vi.fn();
    renderGroupedSelector(
      { literal: { light: 'oklch(0.9 0 0)', dark: 'oklch(0.2 0 0)' } },
      onChange,
      undefined,
      'dark',
    );

    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireCheckboxToggle(checkbox, false);

    expect(onChange).toHaveBeenCalledWith('surface', { literal: 'oklch(0.2 0 0)' });
  });

  describe('editing the light/dark swatches independently', () => {
    beforeEach(() => {
      localStorage.setItem('tokenpanel.colorPicker.mode', 'oklch');
    });
    afterEach(() => {
      localStorage.removeItem('tokenpanel.colorPicker.mode');
    });

    it('editing the Light swatch updates only the light side, leaving dark untouched', () => {
      const onChange = vi.fn();
      renderGroupedSelector(
        { literal: { light: 'oklch(0.5 0.1 200)', dark: 'oklch(0.3 0.1 200)' } },
        onChange,
      );

      const lightSwatch = container.querySelector(
        '[aria-label="Surface (Light): --zd-surface"]',
      ) as HTMLElement;
      act(() => lightSwatch.click());
      const slider = container.querySelector('[role="dialog"] [role="slider"]') as HTMLElement;
      expect(slider).not.toBeNull();
      act(() => {
        slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      });

      expect(onChange).toHaveBeenCalled();
      const [itemId, next] = onChange.mock.calls.at(-1)!;
      expect(itemId).toBe('surface');
      expect(next).toEqual({
        literal: { light: expect.stringMatching(/^oklch\(/), dark: 'oklch(0.3 0.1 200)' },
      });
    });

    it('editing the Dark swatch updates only the dark side, leaving light untouched', () => {
      const onChange = vi.fn();
      renderGroupedSelector(
        { literal: { light: 'oklch(0.5 0.1 200)', dark: 'oklch(0.3 0.1 200)' } },
        onChange,
      );

      const darkSwatch = container.querySelector(
        '[aria-label="Surface (Dark): --zd-surface"]',
      ) as HTMLElement;
      act(() => darkSwatch.click());
      const slider = container.querySelector('[role="dialog"] [role="slider"]') as HTMLElement;
      expect(slider).not.toBeNull();
      act(() => {
        slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      });

      expect(onChange).toHaveBeenCalled();
      const [itemId, next] = onChange.mock.calls.at(-1)!;
      expect(itemId).toBe('surface');
      expect(next).toEqual({
        literal: { light: 'oklch(0.5 0.1 200)', dark: expect.stringMatching(/^oklch\(/) },
      });
    });
  });

  it('a ref-mode row (no literal value) shows no "Per-mode" checkbox', () => {
    renderGroupedSelector({ ref: { tab: 'palette', tier: 'base', item: 'base-3' } }, vi.fn());
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
  });

  it('flat/intra-tab mode never shows a "Per-mode" checkbox (grouped-only feature)', () => {
    renderFlatSelector({ literal: 'whatever' }, vi.fn());
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
  });
});

// ===========================================================================
// 4. Resolved preview chip + per-mode labels (issue #544)
// ===========================================================================

describe('TierRefSelector — semantic resolved preview chip (#544)', () => {
  it('grouped ref mode renders the resolved ramp color before the <select>', () => {
    renderGroupedSelector(
      { ref: { tab: 'palette', tier: 'base', item: 'base-3' } },
      vi.fn(),
    );
    const chip = container.querySelector('.tokenpanel-semantic-resolved-chip') as HTMLElement;
    expect(chip).not.toBeNull();
    expect(chip.style.backgroundColor).toBe('oklch(0.8 0 0)');
    expect(chip.nextElementSibling).toBe(getSelect());
  });

  it('grouped literal mode renders the single literal color', () => {
    renderGroupedSelector({ literal: 'oklch(0.5 0.1 200)' }, vi.fn());
    const chip = container.querySelector('.tokenpanel-semantic-resolved-chip') as HTMLElement;
    expect(chip.style.backgroundColor).toBe('oklch(0.5 0.1 200)');
  });

  it('grouped per-mode literal resolves the chip with the configured default mode', () => {
    renderGroupedSelector(
      { literal: { light: 'oklch(0.9 0 0)', dark: 'oklch(0.2 0 0)' } },
      vi.fn(),
      rampPreviewValueFor,
      'dark',
    );
    const chip = container.querySelector('.tokenpanel-semantic-resolved-chip') as HTMLElement;
    expect(chip.style.backgroundColor).toBe('oklch(0.2 0 0)');
  });

  it('flat/intra-tab mode keeps its existing rendering without a color chip', () => {
    renderFlatSelector({ ref: { tier: 'raw', item: 'ease-out' } }, vi.fn());
    expect(container.querySelector('.tokenpanel-semantic-resolved-chip')).toBeNull();
  });

  it('the chip is decorative and never collides with interactive swatch selectors', () => {
    renderGroupedSelector({ literal: 'oklch(0.5 0.1 200)' }, vi.fn());
    const chip = container.querySelector('.tokenpanel-semantic-resolved-chip') as HTMLElement;
    expect(chip.getAttribute('aria-hidden')).toBe('true');
    expect(chip.getAttribute('role')).toBeNull();
    expect(chip.getAttribute('data-testid')).toBeNull();
    expect(chip.classList.contains('tokenpanel-color-field-swatch')).toBe(false);
    expect(container.querySelectorAll('[data-testid="color-field-swatch"]').length).toBe(1);
  });

  it('per-mode fields show Light/Dark text while preserving ColorField aria-labels', () => {
    renderGroupedSelector(
      { literal: { light: 'oklch(0.9 0 0)', dark: 'oklch(0.2 0 0)' } },
      vi.fn(),
    );
    expect(
      Array.from(container.querySelectorAll('.tokenpanel-per-mode-label')).map(
        (label) => label.textContent,
      ),
    ).toEqual(['Light', 'Dark']);
    expect(
      container.querySelector(
        '[data-testid="color-field-swatch"][aria-label="Surface (Light): --zd-surface"]',
      ),
    ).not.toBeNull();
    expect(
      container.querySelector(
        '[data-testid="color-field-swatch"][aria-label="Surface (Dark): --zd-surface"]',
      ),
    ).not.toBeNull();
  });

  it('renders zero per-row help icons', () => {
    renderGroupedSelector(
      { literal: { light: 'oklch(0.9 0 0)', dark: 'oklch(0.2 0 0)' } },
      vi.fn(),
    );
    expect(container.querySelector('.tokenpanel-help-icon')).toBeNull();
  });
});

// ===========================================================================
// 5. DOM hygiene (CLAUDE.md panel policy)
// ===========================================================================

describe('TierRefSelector — DOM hygiene', () => {
  it('flat mode renders no <button> elements', () => {
    renderFlatSelector({ ref: { tier: 'raw', item: 'ease-out' } }, vi.fn());
    expect(container.querySelector('button')).toBeNull();
  });

  it('grouped mode renders no <button> elements, even with the literal editor open', () => {
    renderGroupedSelector({ literal: 'oklch(0.5 0.1 200)' }, vi.fn());
    expect(container.querySelector('button')).toBeNull();
  });

  it('grouped mode renders no <button> elements with the per-mode fields open', () => {
    renderGroupedSelector({ literal: { light: 'oklch(0.9 0 0)', dark: 'oklch(0.2 0 0)' } }, vi.fn());
    expect(container.querySelector('button')).toBeNull();
  });

  it('only uses permitted form-control tags (select/option/optgroup/input/label)', () => {
    renderGroupedSelector({ ref: { tab: 'palette', tier: 'base', item: 'base-3' } }, vi.fn());
    expect(getSelect().tagName.toLowerCase()).toBe('select');
    expect(getOptgroups().length).toBeGreaterThan(0);
  });

  it('renders no banned semantic tags with the per-mode fields open', () => {
    renderGroupedSelector({ literal: { light: 'oklch(0.9 0 0)', dark: 'oklch(0.2 0 0)' } }, vi.fn());
    expect(
      container.querySelector('h1,h2,h3,h4,h5,h6,ul,ol,li,table,a,details,summary'),
    ).toBeNull();
  });
});
