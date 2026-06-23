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
import { cssToOklcha, oklchaToHex } from '../../../utils/color-oklch';

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
        valueFormat={partial.valueFormat}
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
      Object.defineProperty(input, 'value', {
        value: '#ff',
        writable: true,
        configurable: true,
      });
      // Preact wires controlled text inputs to the native "input" event.
      input.dispatchEvent(new Event('input', { bubbles: true }));
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

// ---------------------------------------------------------------------------
// 10. H1 — Hue circular-distance regression guard
// ---------------------------------------------------------------------------

describe('ColorPicker — hue circular-distance (H1 regression)', () => {
  // Generate deterministic test colors in OKLCH space so the test does not
  // depend on the specific sRGB→OKLCH conversion of an opaque hex guess.
  // L=44 matches PRESET_L_ROWS row 3 (tolerance < 2). C=0.18 = PRESET_C_FIXED.
  const nearZeroHex = oklchaToHex({ l: 44, c: 0.18, h: 2, a: 100 });
  const near359Hex = oklchaToHex({ l: 44, c: 0.18, h: 358, a: 100 });

  it('selects H=0° col at row 3 for a color with hue near 0° (h=2°)', () => {
    renderPicker({ color: nearZeroHex });
    // Row 3 = PRESET_L_ROWS[3] = 44. Col 0 = H=0°.
    const cell = container.querySelector<HTMLElement>(
      '[data-grid-row="3"][data-grid-col="0"]',
    );
    expect(cell).not.toBeNull();
    expect(cell!.getAttribute('aria-selected')).toBe('true');
  });

  it('selects H=0° col at row 3 for a color with hue near 359° (h=358°) — shortest-arc check', () => {
    renderPicker({ color: near359Hex });
    // 358° is only 2° away from 0° via the short arc. The old (h1-h2+360)%360
    // formula would compute 358, not 2, and the cell would NOT be selected.
    const cell = container.querySelector<HTMLElement>(
      '[data-grid-row="3"][data-grid-col="0"]',
    );
    expect(cell).not.toBeNull();
    expect(cell!.getAttribute('aria-selected')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// 11. H2 — Hex input not clobbered by external prop while user is mid-typing
// ---------------------------------------------------------------------------

describe('ColorPicker — hex input not clobbered mid-typing (H2 regression)', () => {
  it('does NOT overwrite a partial hex input when the color prop changes externally', () => {
    renderPicker({ color: '#3366cc' });

    const input = container.querySelector<HTMLInputElement>(
      '.tokenpanel-color-picker-hex-input',
    )!;

    // Simulate user clearing the field and typing a partial value.
    act(() => {
      Object.defineProperty(input, 'value', {
        value: '#33',
        writable: true,
        configurable: true,
      });
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Sanity: partial input should not have called onChange.
    // Now re-render with a different external color.
    act(() => {
      render(<PickerWrapper color="#999999" onChange={vi.fn()} />, container);
    });

    // The input field must still show the in-progress value.
    const inputAfter = container.querySelector<HTMLInputElement>(
      '.tokenpanel-color-picker-hex-input',
    )!;
    expect(inputAfter.value).toBe('#33');
  });
});

// ---------------------------------------------------------------------------
// 12. M2 — role=row wrappers in preset grid
// ---------------------------------------------------------------------------

describe('ColorPicker — role=row wrappers in preset grid (M2)', () => {
  it('renders 6 role=row containers in mini mode', () => {
    renderPicker();
    const rows = container.querySelectorAll('[role="grid"] [role="row"]');
    expect(rows.length).toBe(6);
  });

  it('each role=row contains 6 gridcells in mini mode', () => {
    renderPicker();
    const rows = container.querySelectorAll('[role="grid"] [role="row"]');
    rows.forEach((row) => {
      const cells = row.querySelectorAll('[role="gridcell"]');
      expect(cells.length).toBe(6);
    });
  });

  it('renders 6 role=row containers in expanded mode, each with 12 cells', () => {
    renderPicker();
    const expandBtn = container.querySelector<HTMLElement>(
      '.tokenpanel-color-picker-expand-btn',
    )!;
    fireClick(expandBtn);
    const rows = container.querySelectorAll('[role="grid"] [role="row"]');
    expect(rows.length).toBe(6);
    rows.forEach((row) => {
      const cells = row.querySelectorAll('[role="gridcell"]');
      expect(cells.length).toBe(12);
    });
  });

  it('arrow key navigation still works after role=row wrapper is added', () => {
    const onChange = vi.fn();
    renderPicker({ onChange });
    // Move focus from [0,0] right to [0,1] with ArrowRight.
    const firstCell = container.querySelector<HTMLElement>(
      '[data-grid-row="0"][data-grid-col="0"]',
    )!;
    act(() => {
      firstCell.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
    });
    // After ArrowRight the second cell [0,1] gets focus. Press Enter.
    const secondCell = container.querySelector<HTMLElement>(
      '[data-grid-row="0"][data-grid-col="1"]',
    )!;
    act(() => {
      secondCell.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
    });
    expect(onChange).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// 13. M3 — commit normalizes hex to lowercase
// ---------------------------------------------------------------------------

describe('ColorPicker — commit normalizes hex to lowercase (M3)', () => {
  it('calls onChange with lowercase hex when user types uppercase', () => {
    const onChange = vi.fn();
    renderPicker({ onChange });
    const input = container.querySelector<HTMLInputElement>(
      '.tokenpanel-color-picker-hex-input',
    )!;
    act(() => {
      Object.defineProperty(input, 'value', {
        value: '#ABCDEF',
        writable: true,
        configurable: true,
      });
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith('#abcdef');
  });
});

// ---------------------------------------------------------------------------
// 14. M5 — partial-hex test fires input event (not change)
// ---------------------------------------------------------------------------

describe('ColorPicker — partial hex does NOT call onChange (M5 regression)', () => {
  it('does NOT call onChange for a partial hex string dispatched via input event', () => {
    const onChange = vi.fn();
    renderPicker({ onChange });
    const input = container.querySelector<HTMLInputElement>(
      '.tokenpanel-color-picker-hex-input',
    )!;
    act(() => {
      Object.defineProperty(input, 'value', {
        value: '#33',
        writable: true,
        configurable: true,
      });
      // Preact wires controlled text inputs to the native "input" event.
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 15. Bonus — defaultMode is initial-only
// ---------------------------------------------------------------------------

describe('ColorPicker — defaultMode is initial-only', () => {
  it('later changes to defaultMode prop do NOT update the active mode', () => {
    renderPicker({ defaultMode: 'oklch' });

    // Re-render with a different defaultMode.
    act(() => {
      render(
        <PickerWrapper
          color="#ff0000"
          onChange={vi.fn()}
          defaultMode="hsl"
        />,
        container,
      );
    });

    // Mode should still be OKLCH — defaultMode is initial-only.
    const dialog = getDialog();
    const oklchBtn = dialog.querySelectorAll(
      '[role="group"] [role="button"]',
    )[0] as HTMLElement;
    const hslBtn = dialog.querySelectorAll(
      '[role="group"] [role="button"]',
    )[1] as HTMLElement;
    expect(oklchBtn.getAttribute('aria-pressed')).toBe('true');
    expect(hslBtn.getAttribute('aria-pressed')).toBe('false');
  });
});

// ---------------------------------------------------------------------------
// 16. S3a — valueFormat='oklch' wide-gamut canonical path (#376)
// ---------------------------------------------------------------------------

/** Find a slider host by its aria-label (Lightness / Chroma / Hue / Alpha). */
function getSliderByLabel(ariaLabel: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(
    `[role="slider"][aria-label="${ariaLabel}"]`,
  );
  if (!el) throw new Error(`slider "${ariaLabel}" not found`);
  return el;
}

/**
 * Nudge a slider with a keyboard arrow. The slider's pointer path is inert in
 * jsdom (zero-width rects), but the keydown path calls onChange directly with
 * value ± step, so this is the deterministic way to emit a slider commit.
 */
function fireSliderArrow(ariaLabel: string, key: string): void {
  const slider = getSliderByLabel(ariaLabel);
  act(() => {
    slider.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
}

describe('ColorPicker — valueFormat=hex default unchanged (S3a)', () => {
  it('emits hex (not oklch) on a slider edit when valueFormat is omitted', () => {
    const onChange = vi.fn();
    renderPicker({ color: '#ff0000', onChange, defaultMode: 'oklch' });
    fireSliderArrow('Lightness', 'ArrowUp');
    expect(onChange).toHaveBeenCalledOnce();
    const emitted = onChange.mock.calls[0][0] as string;
    expect(/^#[0-9a-fA-F]{6,8}$/.test(emitted)).toBe(true);
    expect(emitted.startsWith('oklch(')).toBe(false);
  });

  it('emits hex on a preset click when valueFormat is omitted', () => {
    const onChange = vi.fn();
    renderPicker({ onChange });
    fireClick(container.querySelector<HTMLElement>('[role="gridcell"]')!);
    const emitted = onChange.mock.calls[0][0] as string;
    expect(/^#[0-9a-fA-F]{6,8}$/.test(emitted)).toBe(true);
  });
});

describe('ColorPicker — valueFormat=oklch (S3a)', () => {
  it('parses an incoming oklch() prop with wide-gamut chroma and alpha (not sRGB-clamped)', () => {
    // C=0.25 sits beyond what L=70/H=150 can hold in sRGB; it must NOT be clamped.
    renderPicker({
      color: 'oklch(0.7 0.25 150 / 0.5)',
      valueFormat: 'oklch',
      defaultMode: 'oklch',
    });
    // Chroma slider value span shows toFixed(3).
    const rows = container.querySelectorAll('.tokenpanel-color-picker-slider-row');
    const labels = Array.from(rows).map(
      (r) => r.querySelector('.tokenpanel-color-picker-slider-label')?.textContent,
    );
    const cIdx = labels.indexOf('C');
    const aIdx = labels.indexOf('A');
    const cVal = rows[cIdx].querySelector('.tokenpanel-color-picker-slider-value')!
      .textContent;
    const aVal = rows[aIdx].querySelector('.tokenpanel-color-picker-slider-value')!
      .textContent;
    expect(cVal).toBe('0.250'); // chroma preserved, not gamut-clamped
    expect(aVal).toBe('50%'); // alpha ≈ 50 on the 0–100 scale
  });

  it('dragging the L/C/H sliders emits oklch(...) strings, never hex', () => {
    const onChange = vi.fn();
    renderPicker({
      color: 'oklch(0.7 0.25 150 / 0.5)',
      valueFormat: 'oklch',
      onChange,
      defaultMode: 'oklch',
    });
    fireSliderArrow('Lightness', 'ArrowUp');
    fireSliderArrow('Chroma', 'ArrowUp');
    fireSliderArrow('Hue', 'ArrowUp');
    expect(onChange.mock.calls.length).toBe(3);
    for (const call of onChange.mock.calls) {
      expect(call[0] as string).toMatch(/^oklch\(/);
    }
  });

  it('editing only L preserves the original (out-of-sRGB) chroma in the emit', () => {
    const onChange = vi.fn();
    renderPicker({
      color: 'oklch(0.7 0.25 150 / 0.5)',
      valueFormat: 'oklch',
      onChange,
      defaultMode: 'oklch',
    });
    fireSliderArrow('Lightness', 'ArrowUp');
    const emitted = onChange.mock.calls[0][0] as string;
    const parsed = cssToOklcha(emitted)!;
    expect(parsed).not.toBeNull();
    // L changed (was 70, +1 step → 71), chroma & hue & alpha intact.
    expect(parsed.c).toBeCloseTo(0.25, 3);
    expect(parsed.h).toBeCloseTo(150, 1);
    expect(parsed.a).toBeCloseTo(50, 1);
    expect(parsed.l).toBeCloseTo(71, 1);
  });

  it('preset click in oklch mode emits an unclamped oklch(...)', () => {
    const onChange = vi.fn();
    renderPicker({
      color: 'oklch(0.7 0.25 150 / 0.5)',
      valueFormat: 'oklch',
      onChange,
      defaultMode: 'oklch',
    });
    // Click a cell. Preset C is fixed at 0.18; the emitted chroma must match the
    // unclamped preset chroma (clampToSrgbGamut would reduce it for dark/light
    // out-of-gamut rows).
    const cell = container.querySelector<HTMLElement>(
      '[data-grid-row="0"][data-grid-col="0"]',
    )!;
    fireClick(cell);
    const emitted = onChange.mock.calls[0][0] as string;
    expect(emitted).toMatch(/^oklch\(/);
    const parsed = cssToOklcha(emitted)!;
    expect(parsed.c).toBeCloseTo(0.18, 3); // PRESET_C_FIXED, unclamped
  });

  it('the in-picker preview swatch uses an oklch() background in oklch mode', () => {
    renderPicker({
      color: 'oklch(0.7 0.25 150 / 0.5)',
      valueFormat: 'oklch',
      defaultMode: 'oklch',
    });
    const preview = container.querySelector<HTMLElement>(
      '.tokenpanel-color-picker-preview-color',
    )!;
    expect(preview.style.backgroundColor).toMatch(/^oklch\(/);
  });

  it('typing a hex into the hex-input box in oklch mode commits an oklch(...) string, not raw hex', () => {
    const onChange = vi.fn();
    renderPicker({
      color: 'oklch(0.7 0.25 150 / 0.5)',
      valueFormat: 'oklch',
      onChange,
      defaultMode: 'oklch',
    });
    const input = container.querySelector<HTMLInputElement>(
      '.tokenpanel-color-picker-hex-input',
    )!;
    act(() => {
      Object.defineProperty(input, 'value', {
        value: '#00ff00',
        writable: true,
        configurable: true,
      });
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledOnce();
    const emitted = onChange.mock.calls[0][0] as string;
    expect(emitted).toMatch(/^oklch\(/);
    expect(/^#[0-9a-fA-F]{6,8}$/.test(emitted)).toBe(false);
  });

  it('still shows the sRGB hex projection in the hex-input box for reference', () => {
    renderPicker({
      // A safely in-gamut oklch so the hex projection is stable.
      color: 'oklch(0.5 0.05 150 / 1)',
      valueFormat: 'oklch',
      defaultMode: 'oklch',
    });
    const input = container.querySelector<HTMLInputElement>(
      '.tokenpanel-color-picker-hex-input',
    )!;
    expect(/^#[0-9a-fA-F]{6}$/.test(input.value)).toBe(true);
  });

  it('ignores an external color prop change while a slider drag is in flight', () => {
    const onChange = vi.fn();
    renderPicker({
      color: 'oklch(0.7 0.25 150 / 1)',
      valueFormat: 'oklch',
      onChange,
      defaultMode: 'oklch',
    });
    // Start a drag on the L slider track (flips isDraggingRef via pointerdown).
    const sliderTrack = getSliderByLabel('Lightness');
    act(() => {
      sliderTrack.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }),
      );
    });
    // External prop change mid-drag — must be ignored.
    act(() => {
      render(
        <PickerWrapper
          color="oklch(0.2 0.05 30 / 1)"
          valueFormat="oklch"
          onChange={onChange}
        />,
        container,
      );
    });
    // Chroma slider must still reflect the original 0.25, not the new 0.05.
    const rows = container.querySelectorAll('.tokenpanel-color-picker-slider-row');
    const labels = Array.from(rows).map(
      (r) => r.querySelector('.tokenpanel-color-picker-slider-label')?.textContent,
    );
    const cIdx = labels.indexOf('C');
    const cVal = rows[cIdx].querySelector('.tokenpanel-color-picker-slider-value')!
      .textContent;
    expect(cVal).toBe('0.250');
  });

  it('falls back to the hex path when a hex slips into the oklch-mode color prop', () => {
    renderPicker({
      color: '#00ff00',
      valueFormat: 'oklch',
      defaultMode: 'oklch',
    });
    // No throw; the picker renders and the hex-input shows the projection.
    const input = container.querySelector<HTMLInputElement>(
      '.tokenpanel-color-picker-hex-input',
    )!;
    expect(input.value).toBe('#00ff00');
  });
});
