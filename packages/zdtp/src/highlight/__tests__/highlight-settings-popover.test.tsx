// @vitest-environment jsdom
/**
 * Tests for HighlightSettingsPopover — 2-column color-only grid + global
 * outline-px input in the header.
 *
 * Isolation strategy:
 * - HighlightContext is imported from ../highlight-toggle-button (the canonical
 *   location defined by #229) and provided as a stub value.
 * - No actual HighlightOrchestrator or storage is exercised here.
 * - The ColorPicker positioning (useLayoutEffect + getBoundingClientRect)
 *   is stubbed to avoid jsdom layout issues.
 *
 * See also: packages/zudo-design-token-panel/CLAUDE.md for hostile-host policy.
 */

// jsdom does not polyfill PointerEvent. Provide a minimal shim (mirrors color-picker.test.tsx).
if (typeof PointerEvent === 'undefined') {
  class PointerEventShim extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).PointerEvent = PointerEventShim;
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { h } from 'preact';
import { HighlightSettingsPopover } from '../highlight-settings-popover';
import { HighlightContext, type HighlightContextValue } from '../highlight-toggle-button';
import type { HighlightState } from '../highlight-state';
import { DEFAULT_HIGHLIGHT_SLOTS } from '../highlight-state';

// ---------------------------------------------------------------------------
// Stub getFixedPopoverStyle — jsdom has no real layout
// ---------------------------------------------------------------------------
vi.mock('../../components/color-picker/index', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../components/color-picker/index')>();
  return {
    ...actual,
    getFixedPopoverStyle: () => ({ position: 'fixed' as const, left: 0, top: 0 }),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(overrides: Partial<HighlightState> = {}): HighlightState {
  return {
    slots: DEFAULT_HIGHLIGHT_SLOTS.map((s) => ({ ...s })),
    outlineWidth: 2,
    active: {},
    ...overrides,
  };
}

function makeCtx(overrides: Partial<HighlightContextValue> = {}): HighlightContextValue {
  return {
    state: makeState(),
    toggle: vi.fn(),
    setSlot: vi.fn(),
    setOutlineWidth: vi.fn(),
    reset: vi.fn(),
    disableAll: vi.fn(),
    matchCounts: {},
    ...overrides,
  };
}

const anchorRef = { current: document.createElement('div') };

// Render the popover wrapped in a HighlightContext.Provider.
function renderPopover(
  ctx: HighlightContextValue,
  container: HTMLDivElement,
  onClose = vi.fn(),
) {
  act(() => {
    render(
      h(HighlightContext.Provider, { value: ctx },
        h(HighlightSettingsPopover, { anchorRef, onClose }),
      ),
      container,
    );
  });
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => render(null, container));
  document.body.removeChild(container);
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HighlightSettingsPopover', () => {
  describe('render basics', () => {
    it('renders a dialog element with aria-label "Highlight outline settings"', () => {
      renderPopover(makeCtx(), container);
      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).not.toBeNull();
      expect(dialog?.getAttribute('aria-label')).toBe('Highlight outline settings');
    });

    it('renders header containing "Highlight outline settings" text', () => {
      renderPopover(makeCtx(), container);
      const header = container.querySelector('.tokenpanel-highlight-settings-header');
      expect(header?.textContent).toContain('Highlight outline settings');
    });

    it('returns null when HighlightContext is not provided', () => {
      act(() => {
        render(
          h(HighlightSettingsPopover, { anchorRef, onClose: vi.fn() }),
          container,
        );
      });
      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeNull();
    });

    it('does not render a native <dialog> element', () => {
      renderPopover(makeCtx(), container);
      const nativeDialogs = container.querySelectorAll('dialog');
      expect(nativeDialogs).toHaveLength(0);
    });

    it('popover root carries .tokenpanel-highlight-settings-popover so --tokentweak-* vars resolve', () => {
      renderPopover(makeCtx(), container);
      const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog).not.toBeNull();
      expect(dialog.classList.contains('tokenpanel-highlight-settings-popover')).toBe(true);
      // Negative assertion: do NOT carry the modal attribute
      expect(dialog.hasAttribute('data-design-token-panel-modal')).toBe(false);
    });

    it('does not render any <button> elements (hostile-host policy)', () => {
      renderPopover(makeCtx(), container);
      const buttons = container.querySelectorAll('button');
      expect(buttons).toHaveLength(0);
    });
  });

  describe('header — global outline width input', () => {
    it('renders a number input in the header', () => {
      renderPopover(makeCtx(), container);
      const input = container.querySelector('.tokenpanel-highlight-settings-outline-input') as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.type).toBe('number');
    });

    it('header input reflects state.outlineWidth (default 2)', () => {
      renderPopover(makeCtx(), container);
      const input = container.querySelector('.tokenpanel-highlight-settings-outline-input') as HTMLInputElement;
      expect(Number(input.value)).toBe(2);
    });

    it('header input reflects custom outlineWidth (5)', () => {
      const ctx = makeCtx({ state: makeState({ outlineWidth: 5 }) });
      renderPopover(ctx, container);
      const input = container.querySelector('.tokenpanel-highlight-settings-outline-input') as HTMLInputElement;
      expect(Number(input.value)).toBe(5);
    });

    it('header input has aria-label for accessibility', () => {
      renderPopover(makeCtx(), container);
      const input = container.querySelector('.tokenpanel-highlight-settings-outline-input') as HTMLInputElement;
      expect(input.getAttribute('aria-label')).toBeTruthy();
    });

    it('renders "px" suffix label next to the input', () => {
      renderPopover(makeCtx(), container);
      const px = container.querySelector('.tokenpanel-highlight-settings-outline-px');
      expect(px?.textContent?.trim()).toBe('px');
    });

    it('onInput on header number input calls setOutlineWidth with parsed integer', () => {
      const setOutlineWidth = vi.fn();
      const ctx = makeCtx({ setOutlineWidth });
      renderPopover(ctx, container);

      const input = container.querySelector('.tokenpanel-highlight-settings-outline-input') as HTMLInputElement;
      act(() => {
        Object.defineProperty(input, 'value', { value: '4', writable: true, configurable: true });
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });

      expect(setOutlineWidth).toHaveBeenCalledWith(4);
    });
  });

  describe('2-column slot grid', () => {
    it('renders 10 rows', () => {
      renderPopover(makeCtx(), container);
      const rows = container.querySelectorAll('.tokenpanel-highlight-settings-row');
      expect(rows).toHaveLength(10);
    });

    it('renders 10 ring swatches', () => {
      renderPopover(makeCtx(), container);
      const rings = container.querySelectorAll('.tokenpanel-highlight-settings-ring');
      expect(rings).toHaveLength(10);
    });

    it('renders 10 name cells', () => {
      renderPopover(makeCtx(), container);
      const names = container.querySelectorAll('.tokenpanel-highlight-settings-name');
      expect(names).toHaveLength(10);
    });

    it('slot list uses 2-column grid class', () => {
      renderPopover(makeCtx(), container);
      const list = container.querySelector('.tokenpanel-highlight-settings-list');
      expect(list).not.toBeNull();
    });

    it('shows slot numbers 1–10', () => {
      renderPopover(makeCtx(), container);
      const nums = container.querySelectorAll('.tokenpanel-highlight-settings-num');
      expect(nums).toHaveLength(10);
      for (let i = 0; i < 10; i++) {
        expect(nums[i].textContent?.trim()).toBe(String(i + 1));
      }
    });

    it('does NOT render any per-row range sliders', () => {
      renderPopover(makeCtx(), container);
      const sliders = container.querySelectorAll('input[type="range"]');
      expect(sliders).toHaveLength(0);
    });

    it('does NOT render per-row .tokenpanel-highlight-settings-px elements', () => {
      renderPopover(makeCtx(), container);
      const readouts = container.querySelectorAll('.tokenpanel-highlight-settings-px');
      // Only the header outline-px suffix should be present (not per-row readouts)
      // The per-row px readouts are removed; only .tokenpanel-highlight-settings-outline-px remains
      expect(readouts).toHaveLength(0);
    });
  });

  describe('ring swatch border', () => {
    it('ring 0 has border reflecting global outlineWidth (2px solid) from state', () => {
      const ctx = makeCtx();
      renderPopover(ctx, container);
      const ring = container.querySelector('.tokenpanel-highlight-settings-ring') as HTMLElement;
      expect(ring.style.border).toContain('2px solid');
    });

    it('ring reflects global outlineWidth=5 in all ring borders', () => {
      const ctx = makeCtx({ state: makeState({ outlineWidth: 5 }) });
      renderPopover(ctx, container);
      const rings = container.querySelectorAll('.tokenpanel-highlight-settings-ring') as NodeListOf<HTMLElement>;
      for (const ring of rings) {
        expect(ring.style.border).toContain('5px solid');
      }
    });
  });

  describe('active vs available labels', () => {
    it('shows "available" for all slots when active map is empty', () => {
      renderPopover(makeCtx(), container);
      const names = container.querySelectorAll('.tokenpanel-highlight-settings-name');
      for (const name of names) {
        expect(name.textContent?.trim()).toBe('available');
      }
    });

    it('shows cssVar for slot assigned in active map, in default text color (is-active class)', () => {
      const ctx = makeCtx({
        state: makeState({
          active: { '--color-brand': 0 },
        }),
      });
      renderPopover(ctx, container);
      const names = container.querySelectorAll('.tokenpanel-highlight-settings-name');
      expect(names[0].textContent?.trim()).toBe('--color-brand');
      expect(names[0].classList.contains('is-active')).toBe(true);
    });

    it('shows "available" for inactive slots (no is-active class)', () => {
      const ctx = makeCtx({
        state: makeState({
          active: { '--color-brand': 0 },
        }),
      });
      renderPopover(ctx, container);
      const names = container.querySelectorAll('.tokenpanel-highlight-settings-name');
      for (let i = 1; i < 10; i++) {
        expect(names[i].textContent?.trim()).toBe('available');
        expect(names[i].classList.contains('is-active')).toBe(false);
      }
    });

    it('shows multiple active cssVars in correct slot positions', () => {
      const ctx = makeCtx({
        state: makeState({
          active: { '--color-brand': 0, '--text-sm': 2 },
        }),
      });
      renderPopover(ctx, container);
      const names = container.querySelectorAll('.tokenpanel-highlight-settings-name');
      expect(names[0].textContent?.trim()).toBe('--color-brand');
      expect(names[1].textContent?.trim()).toBe('available');
      expect(names[2].textContent?.trim()).toBe('--text-sm');
    });
  });

  describe('ring click opens ColorPicker', () => {
    it('clicking ring 0 makes a ColorPicker dialog appear in the DOM', () => {
      renderPopover(makeCtx(), container);
      const ring = container.querySelector('.tokenpanel-highlight-settings-ring') as HTMLElement;

      const pickersBefore = container.querySelectorAll('.tokenpanel-color-picker');
      expect(pickersBefore).toHaveLength(0);

      act(() => {
        ring.click();
      });

      const pickersAfter = container.querySelectorAll('.tokenpanel-color-picker');
      expect(pickersAfter).toHaveLength(1);
    });

    it('ColorPicker onChange calls setSlot with new hex for the opened ring', () => {
      const setSlot = vi.fn();
      const ctx = makeCtx({ setSlot });
      renderPopover(ctx, container);

      const ring = container.querySelector('.tokenpanel-highlight-settings-ring') as HTMLElement;
      act(() => {
        ring.click();
      });

      const hexInput = container.querySelector('.tokenpanel-color-picker-hex-input') as HTMLInputElement;
      expect(hexInput).not.toBeNull();

      act(() => {
        Object.defineProperty(hexInput, 'value', {
          value: '#aabbcc',
          writable: true,
          configurable: true,
        });
        hexInput.dispatchEvent(new Event('input', { bubbles: true }));
      });

      expect(setSlot).toHaveBeenCalledWith(0, { color: '#aabbcc' });
    });

    it('clicking the same ring again closes the ColorPicker', () => {
      renderPopover(makeCtx(), container);
      const ring = container.querySelector('.tokenpanel-highlight-settings-ring') as HTMLElement;

      act(() => { ring.click(); });
      expect(container.querySelectorAll('.tokenpanel-color-picker')).toHaveLength(1);

      act(() => { ring.click(); });
      expect(container.querySelectorAll('.tokenpanel-color-picker')).toHaveLength(0);
    });
  });

  describe('reset button', () => {
    it('renders a "Reset to defaults" button', () => {
      renderPopover(makeCtx(), container);
      const resetBtns = Array.from(container.querySelectorAll('.tokenpanel-highlight-settings-reset-btn'));
      const resetBtn = resetBtns.find((el) => el.textContent?.trim() === 'Reset to defaults');
      expect(resetBtn).not.toBeNull();
    });

    it('reset button has role="button"', () => {
      renderPopover(makeCtx(), container);
      const resetBtns = Array.from(container.querySelectorAll('.tokenpanel-highlight-settings-reset-btn'));
      const resetBtn = resetBtns.find((el) => el.textContent?.trim() === 'Reset to defaults');
      expect(resetBtn?.getAttribute('role')).toBe('button');
    });

    it('clicking reset calls context.reset()', () => {
      const reset = vi.fn();
      const ctx = makeCtx({ reset });
      renderPopover(ctx, container);

      const resetBtns = Array.from(container.querySelectorAll('.tokenpanel-highlight-settings-reset-btn')) as HTMLElement[];
      const resetBtn = resetBtns.find((el) => el.textContent?.trim() === 'Reset to defaults')!;
      act(() => { resetBtn.click(); });

      expect(reset).toHaveBeenCalledTimes(1);
    });

    it('reset button does NOT call toggle, setSlot, setOutlineWidth, or disableAll', () => {
      const toggle = vi.fn();
      const setSlot = vi.fn();
      const setOutlineWidth = vi.fn();
      const reset = vi.fn();
      const disableAll = vi.fn();
      const ctx = makeCtx({ toggle, setSlot, setOutlineWidth, reset, disableAll });
      renderPopover(ctx, container);

      const resetBtns = Array.from(container.querySelectorAll('.tokenpanel-highlight-settings-reset-btn')) as HTMLElement[];
      const resetBtn = resetBtns.find((el) => el.textContent?.trim() === 'Reset to defaults')!;
      act(() => { resetBtn.click(); });

      expect(toggle).not.toHaveBeenCalled();
      expect(setSlot).not.toHaveBeenCalled();
      expect(setOutlineWidth).not.toHaveBeenCalled();
      expect(disableAll).not.toHaveBeenCalled();
    });
  });

  describe('disable all highlights button', () => {
    it('renders a "Disable all highlights" button', () => {
      renderPopover(makeCtx(), container);
      const btns = Array.from(container.querySelectorAll('.tokenpanel-highlight-settings-reset-btn'));
      const disableBtn = btns.find((el) => el.textContent?.trim() === 'Disable all highlights');
      expect(disableBtn).not.toBeNull();
    });

    it('disable button has role="button"', () => {
      renderPopover(makeCtx(), container);
      const btns = Array.from(container.querySelectorAll('.tokenpanel-highlight-settings-reset-btn'));
      const disableBtn = btns.find((el) => el.textContent?.trim() === 'Disable all highlights');
      expect(disableBtn?.getAttribute('role')).toBe('button');
    });

    it('clicking "Disable all highlights" calls context.disableAll()', () => {
      const disableAll = vi.fn();
      const ctx = makeCtx({ disableAll });
      renderPopover(ctx, container);

      const btns = Array.from(container.querySelectorAll('.tokenpanel-highlight-settings-reset-btn')) as HTMLElement[];
      const disableBtn = btns.find((el) => el.textContent?.trim() === 'Disable all highlights')!;
      act(() => { disableBtn.click(); });

      expect(disableAll).toHaveBeenCalledTimes(1);
    });

    it('clicking "Disable all highlights" with 3 active entries invokes disableAll', () => {
      const disableAll = vi.fn();
      const ctx = makeCtx({
        disableAll,
        state: makeState({
          active: { '--color-brand': 0, '--text-sm': 2, '--spacing-md': 5 },
        }),
      });
      renderPopover(ctx, container);

      const btns = Array.from(container.querySelectorAll('.tokenpanel-highlight-settings-reset-btn')) as HTMLElement[];
      const disableBtn = btns.find((el) => el.textContent?.trim() === 'Disable all highlights')!;
      act(() => { disableBtn.click(); });

      expect(disableAll).toHaveBeenCalledTimes(1);
    });

    it('disable button does NOT call toggle, setSlot, or reset', () => {
      const toggle = vi.fn();
      const setSlot = vi.fn();
      const reset = vi.fn();
      const disableAll = vi.fn();
      const ctx = makeCtx({ toggle, setSlot, reset, disableAll });
      renderPopover(ctx, container);

      const btns = Array.from(container.querySelectorAll('.tokenpanel-highlight-settings-reset-btn')) as HTMLElement[];
      const disableBtn = btns.find((el) => el.textContent?.trim() === 'Disable all highlights')!;
      act(() => { disableBtn.click(); });

      expect(toggle).not.toHaveBeenCalled();
      expect(setSlot).not.toHaveBeenCalled();
      expect(reset).not.toHaveBeenCalled();
    });
  });

  describe('close via outside click and Escape', () => {
    it('calls onClose on outside pointerdown', () => {
      const onClose = vi.fn();
      renderPopover(makeCtx(), container, onClose);

      act(() => {
        document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose on Escape keydown', () => {
      const onClose = vi.fn();
      renderPopover(makeCtx(), container, onClose);

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('footer rendered correctly', () => {
    it('renders a footer element', () => {
      renderPopover(makeCtx(), container);
      const footer = container.querySelector('.tokenpanel-highlight-settings-footer');
      expect(footer).not.toBeNull();
    });
  });
});
