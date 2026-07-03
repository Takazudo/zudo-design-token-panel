// @vitest-environment jsdom

/**
 * Overlay dismiss arbitration — Escape layering (F10) + trigger toggle (F11).
 *
 * A "panel base" keydown listener mirrors panel.tsx exactly: bubble phase, bails
 * on `event.defaultPrevented`. It stands in for the panel shell so we can assert
 * that a popover's Escape never also reaches (and would close) the panel.
 */

// jsdom does not polyfill PointerEvent — minimal shim (mirrors color-picker.test.tsx).
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
import { useRef } from 'preact/compat';
import type { JSX } from 'preact';
import { ColorField } from '../components/color-picker/color-field';
import { HighlightSettingsPopover } from '../highlight/highlight-settings-popover';
import {
  HighlightContext,
  type HighlightContextValue,
} from '../highlight/highlight-toggle-button';
import { DEFAULT_HIGHLIGHT_SLOTS, type HighlightState } from '../highlight/highlight-state';
import { __resetDismissLayersForTests } from '../controls/dismiss-layer';

let container: HTMLDivElement;

// Panel-base Escape listener — mirrors panel.tsx (bubble phase, bails on
// defaultPrevented). Counts how many Escapes would have closed the panel.
let panelEscapes = 0;
function panelKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return;
  if (e.defaultPrevented) return;
  panelEscapes++;
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  panelEscapes = 0;
  document.addEventListener('keydown', panelKeyDown);
});

afterEach(() => {
  document.removeEventListener('keydown', panelKeyDown);
  act(() => render(null, container));
  container.remove();
  __resetDismissLayersForTests();
});

function fireEscape(): void {
  act(() => {
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
  });
}

function makeHighlightState(): HighlightState {
  return {
    slots: DEFAULT_HIGHLIGHT_SLOTS.map((s) => ({ ...s })),
    outlineWidth: 2,
    active: {},
  };
}

// ---------------------------------------------------------------------------
// F10 — Escape closes only the topmost layer, never the panel underneath
// ---------------------------------------------------------------------------

describe('F10 — Escape layer arbitration', () => {
  it('one Escape closes the popover WITHOUT reaching the panel base', () => {
    const onChange = vi.fn();
    act(() => {
      render(<ColorField value="#ff0000" onChange={onChange} label="Test" />, container);
    });
    const swatch = container.querySelector('[data-testid="color-field-swatch"]') as HTMLElement;
    act(() => swatch.click());
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();

    fireEscape();

    // Popover closed, panel untouched.
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(panelEscapes).toBe(0);
  });

  it('Escape reaches the panel base when no popover is open', () => {
    act(() => {
      render(<ColorField value="#ff0000" onChange={vi.fn()} label="Test" />, container);
    });
    // Picker closed — no dismiss layer registered.
    fireEscape();
    expect(panelEscapes).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// F10 (nested) — ColorPicker inside HighlightSettingsPopover
// ---------------------------------------------------------------------------

function HighlightWrapper({ onClose }: { onClose: () => void }): JSX.Element {
  const gearRef = useRef<HTMLDivElement>(null);
  const ctx: HighlightContextValue = {
    state: makeHighlightState(),
    toggle: vi.fn(),
    setSlot: vi.fn(),
    setOutlineWidth: vi.fn(),
    reset: vi.fn(),
    disableAll: vi.fn(),
  };
  return (
    <div>
      <div ref={gearRef} />
      <HighlightContext.Provider value={ctx}>
        <HighlightSettingsPopover
          anchorRef={gearRef as React.RefObject<HTMLElement | null>}
          onClose={onClose}
        />
      </HighlightContext.Provider>
    </div>
  );
}

describe('F10 — nested popover (ColorPicker inside HighlightSettingsPopover)', () => {
  it('one Escape closes ONLY the inner picker; a second closes the popover', () => {
    const onClose = vi.fn();
    act(() => render(<HighlightWrapper onClose={onClose} />, container));

    const popover = () => container.querySelector('.tokenpanel-highlight-settings-popover');
    const picker = () => container.querySelector('.tokenpanel-color-picker');

    expect(popover()).not.toBeNull();
    expect(picker()).toBeNull();

    // Open a slot ring → mounts the nested ColorPicker.
    const ring = container.querySelector('.tokenpanel-highlight-settings-ring') as HTMLElement;
    act(() => ring.click());
    expect(picker()).not.toBeNull();

    // Escape #1 — innermost (picker) closes; popover survives; panel untouched.
    fireEscape();
    expect(picker()).toBeNull();
    expect(popover()).not.toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(panelEscapes).toBe(0);

    // Escape #2 — popover requests close; panel still untouched.
    fireEscape();
    expect(onClose).toHaveBeenCalledOnce();
    expect(panelEscapes).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// F11 — clicking a popover's own trigger closes it (no pointerdown/click race)
// ---------------------------------------------------------------------------

describe('F11 — trigger toggle closes an open popover', () => {
  it('clicking the swatch trigger while open closes it (does not reopen)', () => {
    act(() => {
      render(<ColorField value="#ff0000" onChange={vi.fn()} label="Test" />, container);
    });
    const swatch = container.querySelector('[data-testid="color-field-swatch"]') as HTMLElement;

    // Open.
    act(() => swatch.click());
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();

    // Real gesture on the trigger: pointerdown (outside-close candidate) then
    // click (toggle). The anchor-exclusion must keep pointerdown from closing
    // so the click nets to CLOSED instead of reopening.
    act(() => {
      swatch.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
      swatch.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('an outside pointerdown still closes the popover', () => {
    act(() => {
      render(<ColorField value="#ff0000" onChange={vi.fn()} label="Test" />, container);
    });
    const swatch = container.querySelector('[data-testid="color-field-swatch"]') as HTMLElement;
    act(() => swatch.click());
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();

    act(() => {
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
    });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });
});
