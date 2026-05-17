// @vitest-environment jsdom

/**
 * Unit tests for ColorPicker.
 *
 * Scope:
 *  1. Rendering — dialog, header, mode toggle, expand button, hex input, preview,
 *     slider section, preset grid
 *  2. Mode toggle — OKLCH ↔ HSL; localStorage persistence; no onChange emit
 *  3. Shell toggle — mini ↔ expanded; grid column count; readout visibility
 *  4. Hex input — commit on valid 6-digit; commit on valid 8-digit; no commit on partial
 *  5. Preset grid — structure, aria-selected, click commits hex
 *  6. usePopoverClose — Escape closes; outside pointerdown closes;
 *     inside pointerdown does NOT close; no scroll close (regression guard)
 *  7. useSyncedHex — prop update syncs; ignored while dragging
 *  8. DOM hygiene — no <button>, no blocked semantic tags
 *  9. Slider rendering — all 4 OKLCH sliders; all 4 HSL sliders
 */

// jsdom does not polyfill PointerEvent. Provide a minimal shim.
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
import { ColorPicker, LOCAL_STORAGE_KEY } from '../color-picker';
import type { ColorPickerProps } from '../color-picker';

// ---------------------------------------------------------------------------
// Test harness helpers
// ---------------------------------------------------------------------------

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  // Clear localStorage before each test so mode persistence does not bleed.
  try {
    window.localStorage.clear();
  } catch {
    // ignore
  }
});

afterEach(() => {
  act(() => render(null, container));
  container.remove();
});

/**
 * Wrapper component that owns an anchorRef and renders ColorPicker with it.
 * This mirrors real usage: parent keeps ref to its trigger element.
 */
function PickerWrapper(props: Omit<ColorPickerProps, 'anchorRef' | 'onClose'> & {
  onClose?: () => void;
}): JSX.Element {
  const anchorRef = useRef<HTMLDivElement>(null);
  return (
    <div>
      <div ref={anchorRef} style={{ width: 40, height: 40 }} />
      <ColorPicker
        {...props}
        anchorRef={anchorRef as React.RefObject<HTMLElement | null>}
        onClose={props.onClose ?? (() => {})}
      />
    </div>
  );
}

function renderPicker(
  partial: Partial<ColorPickerProps> & { onClose?: () => void } = {},
): void {
  act(() => {
    render(
      <PickerWrapper
        color={partial.color ?? '#ff0000'}
        onChange={partial.onChange ?? vi.fn()}
        label={partial.label}
        defaultMode={partial.defaultMode}
        onClose={partial.onClose ?? (() => {})}
      />,
      container,
    );
  });
}

function getDialog(): HTMLElement {
  const el = container.querySelector<HTMLElement>('[role="dialog"]');
  if (!el) throw new Error('dialog not found');
  return el;
}

function fireKey(el: Element, key: string): void {
  act(() => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
}

// Note: firePointerDown is used only via opts.outside=true path to test
// outside-click close behavior. The el parameter is unused in that case.
function firePointerDownOutside(): void {
  act(() => {
    document.body.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }),
    );
  });
}

function firePointerDownInside(el: Element): void {
  act(() => {
    el.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }),
    );
  });
}

function fireClick(el: Element): void {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

// ---------------------------------------------------------------------------
// 1. Rendering
// ---------------------------------------------------------------------------

describe('ColorPicker — rendering', () => {
  it('renders a dialog element with aria-label containing "Color picker"', () => {
    renderPicker();
    const dialog = getDialog();
    expect(dialog.getAttribute('aria-label')).toContain('Color picker');
  });

  it('renders the label in the header when label prop is passed', () => {
    renderPicker({ label: 'Background' });
    const dialog = getDialog();
    expect(dialog.textContent).toContain('Background');
  });

  it('renders the mode toggle group with OKLCH and HSL buttons', () => {
    renderPicker();
    const dialog = getDialog();
    const modeGroup = dialog.querySelector('[role="group"][aria-label="Color mode"]');
    expect(modeGroup).not.toBeNull();
    const btns = modeGroup!.querySelectorAll('[role="button"]');
    expect(btns.length).toBe(2);
    expect(btns[0].textContent).toBe('OKLCH');
    expect(btns[1].textContent).toBe('HSL');
  });

  it('renders the expand/collapse button', () => {
    renderPicker();
    const dialog = getDialog();
    const btn = dialog.querySelector<HTMLElement>('.tokenpanel-color-picker-expand-btn');
    expect(btn).not.toBeNull();
    expect(btn!.getAttribute('role')).toBe('button');
  });

  it('renders the hex input with the initial color', () => {
    renderPicker({ color: '#aabbcc' });
    const input = container.querySelector<HTMLInputElement>(
      '.tokenpanel-color-picker-hex-input',
    );
    expect(input).not.toBeNull();
    expect(input!.value).toBe('#aabbcc');
  });

  it('renders the preview color div', () => {
    renderPicker({ color: '#aabbcc' });
    const preview = container.querySelector('.tokenpanel-color-picker-preview-color');
    expect(preview).not.toBeNull();
  });

  it('renders no checkerboard when color is 6-digit hex (fully opaque)', () => {
    renderPicker({ color: '#ff0000' });
    const checker = container.querySelector('.tokenpanel-color-picker-preview-checkerboard');
    expect(checker).toBeNull();
  });

  it('renders the checkerboard when color is 8-digit hex with alpha', () => {
    renderPicker({ color: '#ff000080' });
    const checker = container.querySelector('.tokenpanel-color-picker-preview-checkerboard');
    expect(checker).not.toBeNull();
  });

  it('renders the preset grid with role=grid', () => {
    renderPicker();
    const grid = container.querySelector('[role="grid"]');
    expect(grid).not.toBeNull();
  });

  it('renders 36 grid cells in mini mode (6 rows × 6 cols)', () => {
    renderPicker();
    const cells = container.querySelectorAll('[role="gridcell"]');
    expect(cells.length).toBe(36);
  });

  it('renders the sliders section', () => {
    renderPicker();
    const sliders = container.querySelector('.tokenpanel-color-picker-sliders');
    expect(sliders).not.toBeNull();
  });

  it('does NOT render the readout in mini mode', () => {
    renderPicker();
    const readout = container.querySelector('.tokenpanel-color-picker-readout');
    expect(readout).toBeNull();
  });

  it('renders with data-mode-shell="mini" by default', () => {
    renderPicker();
    const dialog = getDialog();
    expect(dialog.getAttribute('data-mode-shell')).toBe('mini');
  });
});

// ---------------------------------------------------------------------------
// 2. Mode toggle
// ---------------------------------------------------------------------------

describe('ColorPicker — mode toggle', () => {
  it('defaults to OKLCH mode when no defaultMode is given', () => {
    renderPicker();
    const dialog = getDialog();
    const modeGroup = dialog.querySelector('[role="group"][aria-label="Color mode"]');
    const btns = modeGroup!.querySelectorAll<HTMLElement>('[role="button"]');
    expect(btns[0].getAttribute('aria-pressed')).toBe('true'); // OKLCH
    expect(btns[1].getAttribute('aria-pressed')).toBe('false'); // HSL
  });

  it('switches to HSL mode when HSL button is clicked', () => {
    renderPicker();
    const dialog = getDialog();
    const modeGroup = dialog.querySelector('[role="group"]');
    const hslBtn = modeGroup!.querySelectorAll<HTMLElement>('[role="button"]')[1];
    fireClick(hslBtn);
    expect(hslBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('persists mode to localStorage on toggle', () => {
    renderPicker();
    const dialog = getDialog();
    const hslBtn = dialog.querySelectorAll('[role="group"] [role="button"]')[1] as HTMLElement;
    fireClick(hslBtn);
    expect(window.localStorage.getItem(LOCAL_STORAGE_KEY)).toBe('hsl');
  });

  it('reads persisted mode from localStorage on mount', () => {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, 'hsl');
    renderPicker();
    const dialog = getDialog();
    const oklchBtn = dialog.querySelectorAll('[role="group"] [role="button"]')[0] as HTMLElement;
    const hslBtn = dialog.querySelectorAll('[role="group"] [role="button"]')[1] as HTMLElement;
    expect(oklchBtn.getAttribute('aria-pressed')).toBe('false');
    expect(hslBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('does NOT call onChange when toggling modes', () => {
    const onChange = vi.fn();
    renderPicker({ onChange });
    const dialog = getDialog();
    const hslBtn = dialog.querySelectorAll('[role="group"] [role="button"]')[1] as HTMLElement;
    fireClick(hslBtn);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows 4 sliders in OKLCH mode: L, C, H, A', () => {
    renderPicker({ defaultMode: 'oklch' });
    const rows = container.querySelectorAll('.tokenpanel-color-picker-slider-row');
    expect(rows.length).toBe(4);
    const labels = Array.from(rows).map(
      (r) => r.querySelector('.tokenpanel-color-picker-slider-label')?.textContent,
    );
    expect(labels).toEqual(['L', 'C', 'H', 'A']);
  });

  it('shows 4 sliders in HSL mode: H, S, L, A', () => {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, 'hsl');
    renderPicker();
    const rows = container.querySelectorAll('.tokenpanel-color-picker-slider-row');
    expect(rows.length).toBe(4);
    const labels = Array.from(rows).map(
      (r) => r.querySelector('.tokenpanel-color-picker-slider-label')?.textContent,
    );
    expect(labels).toEqual(['H', 'S', 'L', 'A']);
  });

  it('toggles mode via Enter key on mode button', () => {
    renderPicker();
    const dialog = getDialog();
    const hslBtn = dialog.querySelectorAll('[role="group"] [role="button"]')[1] as HTMLElement;
    act(() => {
      hslBtn.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
    });
    expect(hslBtn.getAttribute('aria-pressed')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// 3. Shell toggle (mini ↔ expanded)
// ---------------------------------------------------------------------------

describe('ColorPicker — shell toggle', () => {
  it('starts in mini mode with 36 cells', () => {
    renderPicker();
    expect(container.querySelectorAll('[role="gridcell"]').length).toBe(36);
  });

  it('switches to expanded mode and shows 72 cells (6×12) on expand click', () => {
    renderPicker();
    const expandBtn = container.querySelector<HTMLElement>(
      '.tokenpanel-color-picker-expand-btn',
    )!;
    fireClick(expandBtn);
    expect(container.querySelectorAll('[role="gridcell"]').length).toBe(72);
    expect(getDialog().getAttribute('data-mode-shell')).toBe('expanded');
  });

  it('shows readout in expanded mode', () => {
    renderPicker();
    const expandBtn = container.querySelector<HTMLElement>(
      '.tokenpanel-color-picker-expand-btn',
    )!;
    fireClick(expandBtn);
    const readout = container.querySelector('.tokenpanel-color-picker-readout');
    expect(readout).not.toBeNull();
  });

  it('collapses back to mini mode on second expand click', () => {
    renderPicker();
    const expandBtn = container.querySelector<HTMLElement>(
      '.tokenpanel-color-picker-expand-btn',
    )!;
    fireClick(expandBtn);
    fireClick(expandBtn);
    expect(container.querySelectorAll('[role="gridcell"]').length).toBe(36);
    expect(getDialog().getAttribute('data-mode-shell')).toBe('mini');
  });

  it('expand button toggles aria-expanded attribute', () => {
    renderPicker();
    const expandBtn = container.querySelector<HTMLElement>(
      '.tokenpanel-color-picker-expand-btn',
    )!;
    expect(expandBtn.getAttribute('aria-expanded')).toBe('false');
    fireClick(expandBtn);
    expect(expandBtn.getAttribute('aria-expanded')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// 4. Hex input
// ---------------------------------------------------------------------------

describe('ColorPicker — hex input', () => {
  it('calls onChange with a valid 6-digit hex on input', () => {
    const onChange = vi.fn();
    renderPicker({ color: '#ff0000', onChange });
    const input = container.querySelector<HTMLInputElement>(
      '.tokenpanel-color-picker-hex-input',
    )!;
    act(() => {
      // Preact wires controlled text inputs to the native "input" event.
      Object.defineProperty(input, 'value', {
        value: '#00ff00',
        writable: true,
        configurable: true,
      });
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith('#00ff00');
  });

  it('calls onChange with a valid 8-digit hex on input', () => {
    const onChange = vi.fn();
    renderPicker({ color: '#ff000080', onChange });
    const input = container.querySelector<HTMLInputElement>(
      '.tokenpanel-color-picker-hex-input',
    )!;
    act(() => {
      // Preact wires controlled text inputs to the native "input" event.
      // Set via Object.defineProperty so the getter reports the new value,
      // then fire "input" to trigger the onChange handler.
      Object.defineProperty(input, 'value', {
        value: '#00ff0080',
        writable: true,
        configurable: true,
      });
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith('#00ff0080');
  });

  it('does NOT call onChange for a partial hex string', () => {
    const onChange = vi.fn();
    renderPicker({ onChange });
    const input = container.querySelector<HTMLInputElement>(
      '.tokenpanel-color-picker-hex-input',
    )!;
    act(() => {
      input.value = '#ff';
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('syncs hex input value when the color prop changes', () => {
    renderPicker({ color: '#ff0000' });
    // Re-render with a new color
    act(() => {
      render(
        <PickerWrapper color="#0000ff" onChange={vi.fn()} />,
        container,
      );
    });
    const input = container.querySelector<HTMLInputElement>(
      '.tokenpanel-color-picker-hex-input',
    );
    expect(input!.value).toBe('#0000ff');
  });
});

// ---------------------------------------------------------------------------
// 5. Preset grid
// ---------------------------------------------------------------------------

describe('ColorPicker — preset grid', () => {
  it('first grid cell has tabIndex=0, rest have tabIndex=-1', () => {
    renderPicker();
    const cells = container.querySelectorAll<HTMLElement>('[role="gridcell"]');
    expect(cells[0]!.tabIndex).toBe(0);
    // All other cells should be -1
    const others = Array.from(cells).slice(1);
    expect(others.every((c) => c.tabIndex === -1)).toBe(true);
  });

  it('all grid cells have data-grid-row and data-grid-col attributes', () => {
    renderPicker();
    const cells = container.querySelectorAll<HTMLElement>('[role="gridcell"]');
    cells.forEach((cell) => {
      expect(cell.hasAttribute('data-grid-row')).toBe(true);
      expect(cell.hasAttribute('data-grid-col')).toBe(true);
    });
  });

  it('clicking a preset cell calls onChange with a valid hex', () => {
    const onChange = vi.fn();
    renderPicker({ onChange });
    const cell = container.querySelector<HTMLElement>('[role="gridcell"]');
    fireClick(cell!);
    expect(onChange).toHaveBeenCalledOnce();
    const emitted = onChange.mock.calls[0][0] as string;
    expect(/^#[0-9a-fA-F]{6}$/.test(emitted) || /^#[0-9a-fA-F]{8}$/.test(emitted)).toBe(true);
  });

  it('grid cells have data-oog attribute (in/out-of-gamut marker)', () => {
    renderPicker();
    const cells = container.querySelectorAll<HTMLElement>('[role="gridcell"]');
    cells.forEach((cell) => {
      const oog = cell.getAttribute('data-oog');
      expect(oog === 'true' || oog === 'false').toBe(true);
    });
  });

  it('Enter key on a grid cell commits the preset', () => {
    const onChange = vi.fn();
    renderPicker({ onChange });
    const cell = container.querySelector<HTMLElement>('[role="gridcell"]')!;
    act(() => {
      cell.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
    });
    expect(onChange).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// 6. usePopoverClose
// ---------------------------------------------------------------------------

describe('ColorPicker — usePopoverClose', () => {
  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    renderPicker({ onClose });
    fireKey(document.body, 'Escape');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when pointerdown fires outside the dialog', () => {
    const onClose = vi.fn();
    renderPicker({ onClose });
    firePointerDownOutside();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does NOT call onClose when pointerdown fires inside the dialog', () => {
    const onClose = vi.fn();
    renderPicker({ onClose });
    const dialog = getDialog();
    firePointerDownInside(dialog);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does NOT close on scroll (regression guard — no scroll listener)', () => {
    const onClose = vi.fn();
    renderPicker({ onClose });
    act(() => {
      window.dispatchEvent(new Event('scroll'));
      document.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 7. useSyncedHex — prop-driven sync and drag gate
// ---------------------------------------------------------------------------

describe('ColorPicker — useSyncedHex', () => {
  it('syncs internal hex when the color prop changes while not dragging', () => {
    renderPicker({ color: '#ff0000' });
    act(() => {
      render(<PickerWrapper color="#00ff00" onChange={vi.fn()} />, container);
    });
    const input = container.querySelector<HTMLInputElement>(
      '.tokenpanel-color-picker-hex-input',
    );
    expect(input!.value).toBe('#00ff00');
  });

  it('does NOT sync the color prop while a slider drag is in flight', () => {
    // Render with red.
    renderPicker({ color: '#ff0000' });

    // Trigger pointerdown on the first slider track (role="slider") to flip
    // isDraggingRef.current = true via CustomSlider's addEventListener handler.
    const sliderTrack = container.querySelector<HTMLElement>('[role="slider"]')!;
    act(() => {
      sliderTrack.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }),
      );
    });

    // Re-render with a new external color — the drag gate should suppress sync.
    act(() => {
      render(<PickerWrapper color="#00ff00" onChange={vi.fn()} />, container);
    });

    // Hex input must still show the original value — drag is still in flight.
    const input = container.querySelector<HTMLInputElement>(
      '.tokenpanel-color-picker-hex-input',
    )!;
    expect(input.value).toBe('#ff0000');
  });
});

// ---------------------------------------------------------------------------
// 8. DOM hygiene
// ---------------------------------------------------------------------------

describe('ColorPicker — DOM hygiene', () => {
  it('renders no <button> elements', () => {
    renderPicker();
    expect(container.querySelectorAll('button').length).toBe(0);
  });

  it('renders no <h1>–<h6> elements', () => {
    renderPicker();
    const headings = container.querySelectorAll('h1,h2,h3,h4,h5,h6');
    expect(headings.length).toBe(0);
  });

  it('renders no <ul>, <ol>, <li> elements', () => {
    renderPicker();
    const lists = container.querySelectorAll('ul,ol,li');
    expect(lists.length).toBe(0);
  });

  it('renders no <p> elements', () => {
    renderPicker();
    expect(container.querySelectorAll('p').length).toBe(0);
  });

  it('renders no <a> elements', () => {
    renderPicker();
    expect(container.querySelectorAll('a').length).toBe(0);
  });

  it('all interactive role="button" elements have tabIndex=0', () => {
    renderPicker();
    const btns = container.querySelectorAll<HTMLElement>('[role="button"]');
    btns.forEach((btn) => {
      expect(btn.tabIndex).toBe(0);
    });
  });

  it('the hex input is a permitted form element', () => {
    renderPicker();
    const inputs = container.querySelectorAll('input');
    // Exactly one input for hex
    expect(inputs.length).toBe(1);
    expect(inputs[0]!.type).toBe('text');
  });
});

// ---------------------------------------------------------------------------
// 9. Slider rendering
// ---------------------------------------------------------------------------

describe('ColorPicker — slider rendering', () => {
  it('renders 4 slider rows in OKLCH mode', () => {
    renderPicker({ defaultMode: 'oklch' });
    const rows = container.querySelectorAll('.tokenpanel-color-picker-slider-row');
    expect(rows.length).toBe(4);
  });

  it('renders 4 slider rows in HSL mode', () => {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, 'hsl');
    renderPicker();
    const rows = container.querySelectorAll('.tokenpanel-color-picker-slider-row');
    expect(rows.length).toBe(4);
  });

  it('each slider host has role="slider"', () => {
    renderPicker();
    const sliders = container.querySelectorAll('[role="slider"]');
    expect(sliders.length).toBe(4);
  });
});
