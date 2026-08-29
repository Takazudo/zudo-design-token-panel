// @vitest-environment jsdom

/**
 * Unit tests for PaletteEditView (#395) — Edit-mode grouped grid + per-group
 * OKLCH curve editor + readout + batched commit.
 *
 * Test environment caveats (mirror palette-chart.test.tsx):
 *   - jsdom does not polyfill PointerEvent → minimal shim below.
 *   - setPointerCapture is not implemented in jsdom → stub on the node.
 *   - getBoundingClientRect returns a zero rect by default → prime the channel
 *     SVG to { top: 0, height: 200 } so clientY maps 1:1 to the L value.
 *
 * Acceptance focus:
 *   - Selecting a group reveals its curve editor; selecting a step drives the
 *     readout.
 *   - Channel toggle hides/shows L/C/H curves.
 *   - Out-of-gamut steps carry the dashed flag and PERSIST the raw OKLCH.
 *   - 3 simulated drag-move events → multiple live local updates + EXACTLY ONE
 *     onCommitBatch (single persist) on pointer-up.
 */

// jsdom does not polyfill PointerEvent. Minimal shim carrying pointerId.
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
import PaletteEditView from '../palette/palette-edit-view';
import type { TabConfig } from '../../tokens/tier-model';
import type { TabOverrides } from '../../apply/tier-resolver';
import { cssToOklcha } from '../../utils/color-oklch';

const VIEW_H = 200;
const L_MAX = 100;

// ---------------------------------------------------------------------------
// Fixture: two groups, gray (3 steps) + brand (2 steps).
// gray-2 is an intentionally out-of-gamut OKLCH (very high chroma at high L).
// ---------------------------------------------------------------------------

const TAB_FIXTURE: TabConfig = {
  id: 'palette',
  label: 'Palette',
  tiers: [
    {
      id: 'gray',
      label: 'Grayscale',
      items: [
        {
          id: 'gray-0',
          cssVar: '--palette-gray-0',
          label: 'Gray 0',
          default: 'oklch(20% 0.01 250)',
          type: { kind: 'color', format: 'oklch' },
        },
        {
          id: 'gray-1',
          cssVar: '--palette-gray-1',
          label: 'Gray 1',
          default: 'oklch(50% 0.01 250)',
          type: { kind: 'color', format: 'oklch' },
        },
        {
          id: 'gray-2',
          // Out of sRGB gamut: high lightness with extreme chroma.
          cssVar: '--palette-gray-2',
          label: 'Gray 2',
          default: 'oklch(90% 0.35 250)',
          type: { kind: 'color', format: 'oklch' },
        },
      ],
    },
    {
      id: 'brand',
      label: 'Brand',
      items: [
        {
          id: 'brand-0',
          cssVar: '--palette-brand-0',
          label: 'Brand 0',
          default: 'oklch(40% 0.12 255)',
          type: { kind: 'color', format: 'oklch' },
        },
        {
          id: 'brand-1',
          cssVar: '--palette-brand-1',
          label: 'Brand 1',
          default: 'oklch(70% 0.10 255)',
          type: { kind: 'color', format: 'oklch' },
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => render(null, container));
  container.remove();
  vi.restoreAllMocks();
});

interface RenderProps {
  tab?: TabConfig;
  overrides?: TabOverrides;
  onChange?: (tierId: string, itemId: string, next: string) => void;
  onCommitBatch?: (tierId: string, patch: Record<string, string>) => void;
}

function renderView(props: RenderProps = {}): void {
  act(() => {
    render(
      <PaletteEditView
        tab={props.tab ?? TAB_FIXTURE}
        overrides={props.overrides ?? {}}
        onChange={props.onChange ?? vi.fn()}
        onCommitBatch={props.onCommitBatch}
      />,
      container,
    );
  });
}

/** clientY that maps to L value `v` under the 1:1 mocked rect (y = 200 − 2v). */
function clientYForL(v: number): number {
  return VIEW_H * (1 - v / L_MAX);
}

/** Prime a channel SVG's rect to { top: 0, height: 200 }. */
function primeChannelSvg(channel: 'l' | 'c' | 'h'): SVGSVGElement {
  const svg = container.querySelector<SVGSVGElement>(
    `[data-testid="palette-chart-curve-${channel}"]`,
  );
  if (!svg) throw new Error(`${channel}-channel curve SVG not found`);
  svg.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: 300,
      height: VIEW_H,
      right: 300,
      bottom: VIEW_H,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  return svg;
}

function stubPointerCapture(el: Element): void {
  if (!el.setPointerCapture)
    (el as Element & { setPointerCapture: () => void }).setPointerCapture = () => {};
  if (!el.releasePointerCapture)
    (el as Element & { releasePointerCapture: () => void }).releasePointerCapture = () => {};
}

function firePointer(
  el: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  init: { clientY?: number; pointerId?: number } = {},
): void {
  act(() => {
    el.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        pointerId: init.pointerId ?? 1,
        clientY: init.clientY ?? 0,
      }),
    );
  });
}

function getNodeHit(channel: 'l' | 'c' | 'h', index: number): SVGCircleElement {
  const el = container.querySelector<SVGCircleElement>(
    `.tokenpanel-palette-chart-node-hit[data-node-hit="${index}"][data-channel="${channel}"]`,
  );
  if (!el) throw new Error(`node hit ${channel}/${index} not found`);
  return el;
}

/**
 * Click a group's collapsed header to toggle it. Groups start collapsed (#517),
 * so a test that needs the swatch strip or curve editor must open the group
 * first. Single-open accordion: opening one closes any other.
 */
function openGroup(tierId: string): void {
  const header = container.querySelector<HTMLElement>(
    `[data-testid="palette-edit-group-header-${tierId}"]`,
  );
  if (!header) throw new Error(`group header ${tierId} not found`);
  act(() => {
    header.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

// ---------------------------------------------------------------------------
// Grouped grid + heading structure
// ---------------------------------------------------------------------------

describe('PaletteEditView — grouped grid', () => {
  it('renders one section per tier with its label as the only level-3 heading', () => {
    renderView();
    const grayHeading = container.querySelector(
      '[data-testid="palette-edit-tier-gray"] [role="heading"]',
    );
    const brandHeading = container.querySelector(
      '[data-testid="palette-edit-tier-brand"] [role="heading"]',
    );
    expect(grayHeading?.textContent).toBe('Grayscale');
    expect(brandHeading?.textContent).toBe('Brand');

    // Exactly one heading per tier (one-tier-one-heading policy).
    expect(
      container.querySelectorAll('[data-testid="palette-edit-tier-gray"] [role="heading"]').length,
    ).toBe(1);
    expect(
      container.querySelectorAll('[role="heading"][aria-level="3"]').length,
    ).toBe(2);
  });

  it('renders one swatch per step in the opened group (only the open group shows swatches)', () => {
    renderView();
    // Collapsed by default → no swatch strips at all.
    expect(
      container.querySelectorAll('[data-testid^="palette-edit-swatch-"]').length,
    ).toBe(0);

    openGroup('gray');
    expect(
      container.querySelectorAll(
        '[data-testid="palette-edit-swatches-gray"] [data-testid^="palette-edit-swatch-"]',
      ).length,
    ).toBe(3);

    // Single-open: opening brand closes gray, so only brand's strip remains.
    openGroup('brand');
    expect(
      container.querySelectorAll(
        '[data-testid="palette-edit-swatches-brand"] [data-testid^="palette-edit-swatch-"]',
      ).length,
    ).toBe(2);
    expect(
      container.querySelectorAll(
        '[data-testid="palette-edit-swatches-gray"] [data-testid^="palette-edit-swatch-"]',
      ).length,
    ).toBe(0);
  });

  it('renders every group collapsed by default — no curve editor visible', () => {
    renderView();
    expect(
      container.querySelector('[data-testid="palette-edit-editor-gray"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-testid="palette-edit-editor-brand"]'),
    ).toBeNull();
    // Both headers report collapsed via aria-expanded.
    expect(
      container
        .querySelector('[data-testid="palette-edit-group-header-gray"]')
        ?.getAttribute('aria-expanded'),
    ).toBe('false');
    expect(
      container
        .querySelector('[data-testid="palette-edit-group-header-brand"]')
        ?.getAttribute('aria-expanded'),
    ).toBe('false');
  });

  it('opening a group reveals only that group\'s curve editor', () => {
    renderView();
    openGroup('gray');
    expect(
      container.querySelector('[data-testid="palette-edit-editor-gray"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="palette-edit-editor-brand"]'),
    ).toBeNull();
    expect(
      container
        .querySelector('[data-testid="palette-edit-group-header-gray"]')
        ?.getAttribute('aria-expanded'),
    ).toBe('true');
  });

  it('opening another group closes the previously open one (single-open accordion)', () => {
    renderView();
    openGroup('gray');
    expect(
      container.querySelector('[data-testid="palette-edit-editor-gray"]'),
    ).not.toBeNull();

    openGroup('brand');
    expect(
      container.querySelector('[data-testid="palette-edit-editor-brand"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="palette-edit-editor-gray"]'),
    ).toBeNull();
  });

  it('re-clicking an open group header closes it, and it can be reopened', () => {
    renderView();
    openGroup('gray');
    expect(
      container.querySelector('[data-testid="palette-edit-editor-gray"]'),
    ).not.toBeNull();

    // Toggle closed.
    openGroup('gray');
    expect(
      container.querySelector('[data-testid="palette-edit-editor-gray"]'),
    ).toBeNull();
    expect(
      container
        .querySelector('[data-testid="palette-edit-group-header-gray"]')
        ?.getAttribute('aria-expanded'),
    ).toBe('false');

    // Reopen cleanly.
    openGroup('gray');
    expect(
      container.querySelector('[data-testid="palette-edit-editor-gray"]'),
    ).not.toBeNull();
  });

  it('switching groups resets selectedIndex so the new group\'s selection stays in range', () => {
    renderView();
    openGroup('gray');
    // Select gray-2 (index 2) — valid in gray (3 steps).
    const gray2 = container.querySelector<HTMLElement>(
      '[data-testid="palette-edit-swatch-gray-2"]',
    );
    act(() => {
      gray2!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(gray2!.getAttribute('aria-pressed')).toBe('true');

    // Switch to brand (only 2 steps) — index 2 would be out of range.
    openGroup('brand');
    // Selection reset to step 0: brand-0 is selected, not an out-of-range index.
    expect(
      container
        .querySelector('[data-testid="palette-edit-swatch-brand-0"]')
        ?.getAttribute('aria-pressed'),
    ).toBe('true');
    // Readout reflects brand-0, confirming the clamp landed on a real step.
    const token = container.querySelector('[data-testid="palette-readout-token"]');
    expect(token?.textContent).toContain('--palette-brand-0');
  });
});

// ---------------------------------------------------------------------------
// DOM hygiene
// ---------------------------------------------------------------------------

describe('PaletteEditView — DOM hygiene', () => {
  it('uses no native button or banned semantic tags (collapsed or open)', () => {
    renderView();
    openGroup('gray'); // exercise the richer open DOM (headers + editor)
    for (const tag of [
      'button', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li',
      'a', 'table', 'details', 'summary',
    ]) {
      expect(container.querySelector(tag)).toBeNull();
    }
  });

  it('group headers are div[role="button"] with tabIndex and aria-expanded', () => {
    renderView();
    const header = container.querySelector('[data-testid="palette-edit-group-header-gray"]');
    expect(header?.tagName.toLowerCase()).toBe('div');
    expect(header?.getAttribute('role')).toBe('button');
    expect(header?.getAttribute('tabindex')).toBe('0');
    expect(header?.getAttribute('aria-expanded')).toBe('false'); // collapsed by default
  });

  it('swatches are div[role="button"] with tabIndex and aria-pressed', () => {
    renderView();
    openGroup('gray');
    const swatch = container.querySelector('[data-testid="palette-edit-swatch-gray-0"]');
    expect(swatch?.tagName.toLowerCase()).toBe('div');
    expect(swatch?.getAttribute('role')).toBe('button');
    expect(swatch?.getAttribute('tabindex')).toBe('0');
    expect(swatch?.getAttribute('aria-pressed')).toBe('true'); // step 0 selected on open
  });
});

// ---------------------------------------------------------------------------
// Collapsed headers + preview chips
// ---------------------------------------------------------------------------

describe('PaletteEditView — collapsed headers + preview chips', () => {
  it('each collapsed header shows a chevron and one preview chip per step', () => {
    renderView();
    const grayChips = container.querySelectorAll(
      '[data-testid="palette-edit-group-header-gray"] .tokenpanel-palette-edit-preview-chip',
    );
    const brandChips = container.querySelectorAll(
      '[data-testid="palette-edit-group-header-brand"] .tokenpanel-palette-edit-preview-chip',
    );
    expect(grayChips.length).toBe(3);
    expect(brandChips.length).toBe(2);
    // Chevron SVG present in the header.
    expect(
      container.querySelector(
        '[data-testid="palette-edit-group-header-gray"] .tokenpanel-palette-edit-group-chevron svg',
      ),
    ).not.toBeNull();
  });

  it('the preview-chip strip is decorative (aria-hidden)', () => {
    renderView();
    const preview = container.querySelector(
      '[data-testid="palette-edit-group-header-gray"] .tokenpanel-palette-edit-group-preview',
    );
    expect(preview?.getAttribute('aria-hidden')).toBe('true');
  });

  it('Enter and Space on a header toggle it open', () => {
    renderView();
    const grayHeader = container.querySelector<HTMLElement>(
      '[data-testid="palette-edit-group-header-gray"]',
    );
    act(() => {
      grayHeader!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(
      container.querySelector('[data-testid="palette-edit-editor-gray"]'),
    ).not.toBeNull();
    expect(grayHeader!.getAttribute('aria-expanded')).toBe('true');

    // Space toggles it back closed.
    act(() => {
      grayHeader!.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });
    expect(
      container.querySelector('[data-testid="palette-edit-editor-gray"]'),
    ).toBeNull();
  });

  it('preview chip color tracks override state', () => {
    renderView();
    const chipDefault = container.querySelector<HTMLElement>(
      '[data-testid="palette-edit-group-header-gray"] .tokenpanel-palette-edit-preview-chip',
    )!.style.background;

    // Override gray-0 to a visibly different color; its chip must repaint.
    renderView({ overrides: { gray: { 'gray-0': 'oklch(50% 0.2 20)' } } });
    const chipOverridden = container.querySelector<HTMLElement>(
      '[data-testid="palette-edit-group-header-gray"] .tokenpanel-palette-edit-preview-chip',
    )!.style.background;

    expect(chipOverridden).not.toBe('');
    expect(chipOverridden).not.toBe(chipDefault);
    // Fill is a resolved hex, never a host-overridable CSS var.
    expect(chipOverridden).not.toContain('var(');
  });
});

// ---------------------------------------------------------------------------
// Channel toggle
// ---------------------------------------------------------------------------

describe('PaletteEditView — channel toggle', () => {
  it('all three channels visible when a group is open', () => {
    renderView();
    openGroup('gray');
    for (const ch of ['l', 'c', 'h'] as const) {
      expect(
        container.querySelector(`[data-testid="palette-chart-curve-${ch}"]`),
      ).not.toBeNull();
    }
  });

  it('toggling a channel off hides that curve', () => {
    renderView();
    openGroup('gray');
    const cToggle = container.querySelector<HTMLElement>(
      '[data-testid="palette-edit-channel-c"]',
    );
    act(() => {
      cToggle!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(
      container.querySelector('[data-testid="palette-chart-curve-c"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-testid="palette-chart-curve-l"]'),
    ).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Readout
// ---------------------------------------------------------------------------

describe('PaletteEditView — readout', () => {
  it('shows OKLCH / Hex / RGB rows for the selected step', () => {
    renderView();
    openGroup('gray');
    expect(container.querySelector('[data-testid="palette-readout-oklch"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="palette-readout-hex"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="palette-readout-rgb"]')).not.toBeNull();
    // Token row reflects the selected step's cssVar.
    const token = container.querySelector('[data-testid="palette-readout-token"]');
    expect(token?.textContent).toContain('--palette-gray-0');
  });

  it('readout updates when a different step is selected', () => {
    renderView();
    openGroup('gray');
    const swatch = container.querySelector<HTMLElement>(
      '[data-testid="palette-edit-swatch-gray-1"]',
    );
    act(() => {
      swatch!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const token = container.querySelector('[data-testid="palette-readout-token"]');
    expect(token?.textContent).toContain('--palette-gray-1');
  });
});

// ---------------------------------------------------------------------------
// Out-of-gamut handling
// ---------------------------------------------------------------------------

describe('PaletteEditView — out-of-gamut', () => {
  it('flags an out-of-gamut step with the dashed marker', () => {
    renderView();
    openGroup('gray');
    const oog = container.querySelector('[data-testid="palette-edit-swatch-gray-2"]');
    const inGamut = container.querySelector('[data-testid="palette-edit-swatch-gray-0"]');
    expect(oog?.getAttribute('data-out-of-gamut')).toBe('true');
    expect(inGamut?.getAttribute('data-out-of-gamut')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Batched commit (LOAD-BEARING)
// ---------------------------------------------------------------------------

describe('PaletteEditView — batched commit', () => {
  it('3 drag-move events produce live updates but EXACTLY ONE commit on pointer-up', () => {
    const onCommitBatch = vi.fn();
    const onChange = vi.fn();
    renderView({ onCommitBatch, onChange });
    openGroup('gray');

    const svg = primeChannelSvg('l');
    const node = getNodeHit('l', 1); // gray-1, L channel
    stubPointerCapture(node);

    // Pointer-down on the node opens the gesture (onChangeStart → transient).
    firePointer(node, 'pointerdown', { pointerId: 5, clientY: clientYForL(50) });

    // Three drag-move events at distinct L values → three live local repaints.
    firePointer(svg, 'pointermove', { pointerId: 5, clientY: clientYForL(60) });
    firePointer(svg, 'pointermove', { pointerId: 5, clientY: clientYForL(70) });
    firePointer(svg, 'pointermove', { pointerId: 5, clientY: clientYForL(80) });

    // No persist mid-drag.
    expect(onCommitBatch).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();

    // Live repaint: the selected node's aria-valuenow tracks the last move (L=80).
    const liveNode = getNodeHit('l', 1);
    expect(liveNode.getAttribute('aria-valuenow')).toBe('80');

    // Pointer-up flushes EXACTLY ONE batched commit.
    firePointer(svg, 'pointerup', { pointerId: 5, clientY: clientYForL(80) });

    expect(onCommitBatch).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();

    const [tierId, patch] = onCommitBatch.mock.calls[0];
    expect(tierId).toBe('gray');
    // Only the dragged step changed; its committed L is 80.
    expect(Object.keys(patch)).toEqual(['gray-1']);
    const committed = cssToOklcha(patch['gray-1']);
    expect(committed).not.toBeNull();
    expect(committed!.l).toBeCloseTo(80, 5);
  });

  it('whole-curve drag commits every changed step in one batch', () => {
    const onCommitBatch = vi.fn();
    renderView({ onCommitBatch });
    openGroup('gray');

    const svg = primeChannelSvg('l');
    const hitLine = container.querySelector<SVGPolylineElement>(
      '[data-testid="palette-chart-hit-line-l"]',
    );
    if (!hitLine) throw new Error('l-channel hit-line not found');
    stubPointerCapture(hitLine);

    // Grab the line and translate the whole ramp up by some delta.
    firePointer(hitLine, 'pointerdown', { pointerId: 6, clientY: clientYForL(50) });
    firePointer(svg, 'pointermove', { pointerId: 6, clientY: clientYForL(55) });
    firePointer(svg, 'pointerup', { pointerId: 6, clientY: clientYForL(55) });

    expect(onCommitBatch).toHaveBeenCalledTimes(1);
    const [tierId, patch] = onCommitBatch.mock.calls[0];
    expect(tierId).toBe('gray');
    // All three gray steps shifted in one gesture.
    expect(Object.keys(patch).sort()).toEqual(['gray-0', 'gray-1', 'gray-2']);
  });

  it('persists RAW OKLCH for an out-of-gamut result — no silent clamp', () => {
    const onCommitBatch = vi.fn();
    // Select the brand group first so we drag a step whose chroma can push it
    // out of gamut. Simpler: drag gray-2 (already OOG) L down and confirm the
    // committed chroma is preserved (not clamped to a smaller value).
    renderView({ onCommitBatch });
    openGroup('gray');

    const svg = primeChannelSvg('l');
    const node = getNodeHit('l', 2); // gray-2 (chroma 0.35, out of gamut)
    stubPointerCapture(node);

    firePointer(node, 'pointerdown', { pointerId: 7, clientY: clientYForL(90) });
    firePointer(svg, 'pointermove', { pointerId: 7, clientY: clientYForL(85) });
    firePointer(svg, 'pointerup', { pointerId: 7, clientY: clientYForL(85) });

    expect(onCommitBatch).toHaveBeenCalledTimes(1);
    const [, patch] = onCommitBatch.mock.calls[0];
    const committed = cssToOklcha(patch['gray-2']);
    expect(committed).not.toBeNull();
    // Raw chroma is preserved exactly — NOT gamut-clamped down.
    expect(committed!.c).toBeCloseTo(0.35, 3);
    expect(committed!.l).toBeCloseTo(85, 5);
  });

  it('falls back to per-item onChange when no onCommitBatch is wired', () => {
    const onChange = vi.fn();
    renderView({ onChange }); // no onCommitBatch
    openGroup('gray');

    const svg = primeChannelSvg('l');
    const node = getNodeHit('l', 1);
    stubPointerCapture(node);

    firePointer(node, 'pointerdown', { pointerId: 8, clientY: clientYForL(50) });
    firePointer(svg, 'pointermove', { pointerId: 8, clientY: clientYForL(70) });
    firePointer(svg, 'pointerup', { pointerId: 8, clientY: clientYForL(70) });

    // One changed step → exactly one onChange on commit (not per frame).
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toBe('gray');
    expect(onChange.mock.calls[0][1]).toBe('gray-1');
  });

  it('fallback emits only the filtered patch when a step becomes invalid mid-gesture', () => {
    const onChange = vi.fn();
    renderView({ onChange });
    openGroup('gray');
    const svg = primeChannelSvg('l');
    const hitLine = container.querySelector<SVGPolylineElement>(
      '[data-testid="palette-chart-hit-line-l"]',
    )!;
    stubPointerCapture(hitLine);

    firePointer(hitLine, 'pointerdown', { pointerId: 9, clientY: clientYForL(50) });
    firePointer(svg, 'pointermove', { pointerId: 9, clientY: clientYForL(55) });
    // The gesture accumulator contains all three steps, but gray-1 is no
    // longer persistable by the time the commit boundary closes.
    renderView({ onChange, overrides: { gray: { 'gray-1': 'var(--gray-1)' } } });
    firePointer(svg, 'pointerup', { pointerId: 9, clientY: clientYForL(55) });

    expect(onChange.mock.calls.map((call) => call[1])).toEqual(['gray-0', 'gray-2']);
    expect(onChange.mock.calls.every((call) => typeof call[2] === 'string')).toBe(true);
  });
});

describe('PaletteEditView — static CSS colors and invalid slots (#625)', () => {
  const tab: TabConfig = {
    id: 'palette', label: 'Palette', tiers: [{
      id: 'paper', label: 'Paper', items: [
        { id: 'white', cssVar: '--paper-white', label: 'White', default: '#ffffff', type: { kind: 'color', format: 'oklch' } },
        { id: 'invalid', cssVar: '--paper-context', label: 'Context', default: 'var(--paper)', type: { kind: 'color', format: 'oklch' } },
        { id: 'offwhite', cssVar: '--paper-offwhite', label: 'Off white', default: '#f6f4ee', type: { kind: 'color', format: 'oklch' } },
        { id: 'rgb', cssVar: '--paper-rgb', label: 'RGB', default: 'rgb(10 20 30 / 50%)', type: { kind: 'color', format: 'oklch' } },
        { id: 'hsl', cssVar: '--paper-hsl', label: 'HSL', default: 'hsl(120 50% 50%)', type: { kind: 'color', format: 'oklch' } },
        { id: 'mix', cssVar: '--paper-mix', label: 'Mix', default: 'color-mix(in srgb, red, blue)', type: { kind: 'color', format: 'oklch' } },
      ],
    }],
  };

  it('renders exact white/off-white repro colors and parses rgb/hsl with alpha', () => {
    renderView({ tab });
    const chips = container.querySelectorAll<HTMLElement>('.tokenpanel-palette-edit-preview-chip');
    expect(chips[0].style.background).toBe('rgb(255, 255, 255)');
    expect(chips[2].style.background).toBe('rgb(246, 244, 238)');
    expect(chips[3].style.background).toContain('rgba(10, 20, 30, 0.5)');
    expect(chips[4].style.background).not.toBe('');
    expect(chips[1].classList.contains('is-invalid')).toBe(true);
    expect(chips[5].classList.contains('is-invalid')).toBe(true);

    openGroup('paper');
    expect(container.querySelector<HTMLElement>('[data-testid="palette-edit-swatch-white"]')?.style.background).toBe('rgb(255, 255, 255)');
    expect(container.querySelector('[data-band-index="0"]')?.getAttribute('fill')).toBe('#ffffff');
    expect(container.querySelector('[data-band-index="2"]')?.getAttribute('fill')).toBe('#f6f4ee');
    expect(container.querySelector('[data-testid="palette-readout-hex"]')?.textContent).toContain('#ffffff');
    const rgb = container.querySelector<HTMLElement>('[data-testid="palette-edit-swatch-rgb"]')!;
    act(() => { rgb.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(container.querySelector('[data-testid="palette-readout-hex"]')?.textContent).toContain('#0a141e80');
    expect(container.querySelector('[data-testid="palette-readout-oklch"]')?.textContent).toContain('/ 0.50');
  });

  it('keeps invalid positions visible, names their value, and exposes no editor/node', () => {
    renderView({ tab });
    openGroup('paper');
    const invalid = container.querySelector<HTMLElement>('[data-testid="palette-edit-swatch-invalid"]')!;
    expect(invalid.getAttribute('data-invalid')).toBe('true');
    expect(invalid.getAttribute('aria-label')).toContain('var(--paper)');
    expect(container.querySelector('[data-node-hit="1"]')).toBeNull();
    act(() => { invalid.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(container.querySelector('[data-testid="color-field-swatch"]')).toBeNull();
    expect(container.querySelector('[data-testid="palette-readout-invalid-value"]')?.textContent).toContain('var(--paper)');
  });

  it('uses current validity when an invalid selected step becomes directly editable', () => {
    const onChange = vi.fn();
    renderView({
      tab,
      onChange,
      overrides: { paper: { white: 'var(--paper-white)' } },
    });
    openGroup('paper');
    expect(container.querySelector('[data-testid="color-field-swatch"]')).toBeNull();

    renderView({
      tab,
      onChange,
      overrides: { paper: { white: 'oklch(50% 0 0)' } },
    });
    const field = container.querySelector<HTMLElement>('[data-testid="color-field-swatch"]')!;
    act(() => { field.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const lightness = container.querySelector<HTMLElement>('[role="slider"][aria-label="Lightness"]')!;
    expect(lightness).not.toBeNull();
    act(() => {
      lightness.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    });
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0].slice(0, 2)).toEqual(['paper', 'white']);
  });

  it('excludes invalid slots from whole-curve batch patches', () => {
    const onCommitBatch = vi.fn();
    renderView({ tab, onCommitBatch });
    openGroup('paper');
    const svg = primeChannelSvg('l');
    const hitLine = container.querySelector<SVGPolylineElement>('[data-testid="palette-chart-hit-line-l"]')!;
    stubPointerCapture(hitLine);
    firePointer(hitLine, 'pointerdown', { clientY: clientYForL(50) });
    firePointer(svg, 'pointermove', { clientY: clientYForL(45) });
    firePointer(svg, 'pointerup', { clientY: clientYForL(45) });
    const patch = onCommitBatch.mock.calls[0][1] as Record<string, string>;
    expect(patch.invalid).toBeUndefined();
    expect(patch.mix).toBeUndefined();
    expect(Object.keys(patch)).toEqual(expect.arrayContaining(['white', 'offwhite', 'rgb', 'hsl']));
  });
});
