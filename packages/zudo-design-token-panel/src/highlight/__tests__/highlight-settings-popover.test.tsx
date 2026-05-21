// @vitest-environment jsdom
/**
 * Tests for HighlightSettingsPopover and the gear button in panel.tsx.
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
    active: {},
    ...overrides,
  };
}

function makeCtx(overrides: Partial<HighlightContextValue> = {}): HighlightContextValue {
  return {
    state: makeState(),
    toggle: vi.fn(),
    setSlot: vi.fn(),
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

    it('renders header text "Highlight outline settings"', () => {
      renderPopover(makeCtx(), container);
      const header = container.querySelector('.tokenpanel-highlight-settings-header');
      expect(header?.textContent?.trim()).toBe('Highlight outline settings');
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

    it('popover root carries data-design-token-panel-modal so --tokentweak-* vars resolve', () => {
      // The popover renders outside .tokenpanel-shell; without this attribute
      // the :where(.tokenpanel-shell, [data-design-token-panel-modal]) token
      // scope never matches and background/color vars fall back to nothing.
      renderPopover(makeCtx(), container);
      const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog).not.toBeNull();
      expect(dialog.hasAttribute('data-design-token-panel-modal')).toBe(true);
    });

    it('does not render any <button> elements (hostile-host policy)', () => {
      renderPopover(makeCtx(), container);
      const buttons = container.querySelectorAll('button');
      expect(buttons).toHaveLength(0);
    });
  });

  describe('10 slot rows', () => {
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

    it('renders 10 sliders', () => {
      renderPopover(makeCtx(), container);
      const sliders = container.querySelectorAll('input[type="range"]');
      // 10 slot sliders (ColorPicker is not open)
      expect(sliders.length).toBeGreaterThanOrEqual(10);
    });

    it('renders 10 px readouts with "px" suffix', () => {
      renderPopover(makeCtx(), container);
      const readouts = container.querySelectorAll('.tokenpanel-highlight-settings-px');
      expect(readouts).toHaveLength(10);
      for (const readout of readouts) {
        expect(readout.textContent).toMatch(/\d+px/);
      }
    });

    it('shows slot numbers 1–10', () => {
      renderPopover(makeCtx(), container);
      const nums = container.querySelectorAll('.tokenpanel-highlight-settings-num');
      expect(nums).toHaveLength(10);
      for (let i = 0; i < 10; i++) {
        expect(nums[i].textContent?.trim()).toBe(String(i + 1));
      }
    });
  });

  describe('ring swatch border', () => {
    it('ring 0 has border reflecting slot 0 outlineWidth (2px solid)', () => {
      const ctx = makeCtx();
      renderPopover(ctx, container);
      const ring = container.querySelector('.tokenpanel-highlight-settings-ring') as HTMLElement;
      // jsdom may normalize hex color to rgb, so only assert outlineWidth and "solid"
      expect(ring.style.border).toContain('2px solid');
    });

    it('ring reflects custom outlineWidth in border-width', () => {
      const ctx = makeCtx({
        state: makeState({
          slots: DEFAULT_HIGHLIGHT_SLOTS.map((s, i) =>
            i === 0 ? { ...s, outlineWidth: 5 } : { ...s },
          ),
        }),
      });
      renderPopover(ctx, container);
      const ring = container.querySelector('.tokenpanel-highlight-settings-ring') as HTMLElement;
      expect(ring.style.border).toContain('5px solid');
    });

    it('ring reflects default outlineWidth of 2px', () => {
      renderPopover(makeCtx(), container);
      const rings = container.querySelectorAll('.tokenpanel-highlight-settings-ring') as NodeListOf<HTMLElement>;
      expect(rings[0].style.border).toContain('2px solid');
    });
  });

  describe('width readout text', () => {
    it('renders "${N}px" for slot 0 with outlineWidth 2', () => {
      renderPopover(makeCtx(), container);
      const readout = container.querySelector('.tokenpanel-highlight-settings-px');
      expect(readout?.textContent?.trim()).toBe('2px');
    });

    it('renders correct px string when outlineWidth is 4', () => {
      const ctx = makeCtx({
        state: makeState({
          slots: DEFAULT_HIGHLIGHT_SLOTS.map((s, i) =>
            i === 0 ? { ...s, outlineWidth: 4 } : { ...s },
          ),
        }),
      });
      renderPopover(ctx, container);
      const readouts = container.querySelectorAll('.tokenpanel-highlight-settings-px');
      expect(readouts[0].textContent?.trim()).toBe('4px');
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

  describe('slider onInput dispatches setSlot', () => {
    it('calls setSlot with new outlineWidth when slider fires onInput', () => {
      const setSlot = vi.fn();
      const ctx = makeCtx({ setSlot });
      renderPopover(ctx, container);

      const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
      expect(slider).not.toBeNull();

      act(() => {
        // Simulate range input event with value 5
        Object.defineProperty(slider, 'value', { value: '5', writable: true });
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      });

      expect(setSlot).toHaveBeenCalledWith(0, { outlineWidth: 5 });
    });

    it('calls setSlot for the correct slot index', () => {
      const setSlot = vi.fn();
      const ctx = makeCtx({ setSlot });
      renderPopover(ctx, container);

      const sliders = container.querySelectorAll('input[type="range"]') as NodeListOf<HTMLInputElement>;
      // fire slot 2 (index 2) slider
      const slider2 = sliders[2];
      act(() => {
        Object.defineProperty(slider2, 'value', { value: '7', writable: true });
        slider2.dispatchEvent(new Event('input', { bubbles: true }));
      });

      expect(setSlot).toHaveBeenCalledWith(2, { outlineWidth: 7 });
    });
  });

  describe('ring click opens ColorPicker', () => {
    it('clicking ring 0 makes a ColorPicker dialog appear in the DOM', () => {
      renderPopover(makeCtx(), container);
      const ring = container.querySelector('.tokenpanel-highlight-settings-ring') as HTMLElement;

      // No picker open initially (the color-picker uses role="dialog")
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

      // Find the hex input inside the color picker and fire the 'input' event
      // (ColorPicker uses Preact's onChange which maps to 'input', not 'change').
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

      // setSlot should have been called with slot 0 and the new hex
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

    it('reset button does NOT call toggle, setSlot, or disableAll', () => {
      const toggle = vi.fn();
      const setSlot = vi.fn();
      const reset = vi.fn();
      const disableAll = vi.fn();
      const ctx = makeCtx({ toggle, setSlot, reset, disableAll });
      renderPopover(ctx, container);

      const resetBtns = Array.from(container.querySelectorAll('.tokenpanel-highlight-settings-reset-btn')) as HTMLElement[];
      const resetBtn = resetBtns.find((el) => el.textContent?.trim() === 'Reset to defaults')!;
      act(() => { resetBtn.click(); });

      expect(toggle).not.toHaveBeenCalled();
      expect(setSlot).not.toHaveBeenCalled();
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
