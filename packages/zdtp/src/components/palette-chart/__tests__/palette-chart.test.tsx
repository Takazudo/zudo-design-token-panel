// @vitest-environment jsdom
/**
 * Unit tests for {@link PaletteChart} — the OKLCH L/C/H curve editor ported
 * from pgen's PrismChart.
 *
 * Test environment caveats (mirror the color-picker tests):
 *   - jsdom does not polyfill PointerEvent → minimal shim below.
 *   - setPointerCapture/releasePointerCapture are not implemented in jsdom; the
 *     component swallows the resulting throws via try/catch.
 *   - getBoundingClientRect returns zero-sized rects by default → tests that
 *     depend on rect.height stub it on the relevant channel SVG.
 *
 * Pixel ↔ value mapping (matches palette-chart.tsx eventToValue + palette-curve
 * yToValue): with a mocked rect of { top: 0, height: 200 }, normY = clientY/200
 * and, for the L channel (CHANNEL_MAX = 100), value v sits at clientY = 200·(1 −
 * v/100). So clientY 100 → L = 50, and moving UP to clientY 60 → L = 70 (+20).
 */

// jsdom does not polyfill PointerEvent. Provide a minimal shim that carries
// pointerId + clientX/clientY (MouseEvent base already carries clientX/clientY).
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
import { PaletteChart } from '../palette-chart';
import type { Channel } from '../palette-chart';
import type { Oklcha } from '../../../utils/color-oklch';
import { MAX_OKLCH_CHROMA } from '../../../utils/color-oklch';

const VIEW_H = 200;
const L_MAX = 100;

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

/** A fixed, valid palette. Only L values matter for the L-channel drag tests. */
function makeColors(lValues: number[]): Oklcha[] {
  return lValues.map((l) => ({ l, c: 0.1, h: 200, a: 100 }));
}

/** clientY that maps to L value `v` under the 1:1 mocked rect (y = 200 − 2v). */
function clientYForL(v: number): number {
  return VIEW_H * (1 - v / L_MAX);
}

type ChartProps = {
  colors: Array<Oklcha | null>;
  selectedIndex?: number;
  visibleChannels?: { l: boolean; c: boolean; h: boolean };
  onChange?: (i: number, c: Channel, v: number) => void;
  onSelectIndex?: (i: number) => void;
  onToggleChannel?: (c: Channel) => void;
  onChangeStart?: () => void;
  onChangeEnd?: () => void;
};

function renderChart(props: ChartProps): void {
  act(() => {
    render(
      <PaletteChart
        colors={props.colors}
        selectedIndex={props.selectedIndex ?? 0}
        visibleChannels={
          props.visibleChannels ?? { l: true, c: true, h: true }
        }
        onChange={props.onChange ?? vi.fn()}
        onSelectIndex={props.onSelectIndex ?? vi.fn()}
        onToggleChannel={props.onToggleChannel ?? vi.fn()}
        onChangeStart={props.onChangeStart}
        onChangeEnd={props.onChangeEnd}
      />,
      container,
    );
  });
}

/** Stub a channel SVG's rect to { top: 0, height: 200 } so normY = clientY/200. */
function primeChannelSvg(channel: Channel): SVGSVGElement {
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
    (el as Element & { setPointerCapture: () => void }).setPointerCapture =
      () => {};
  if (!el.releasePointerCapture)
    (
      el as Element & { releasePointerCapture: () => void }
    ).releasePointerCapture = () => {};
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

function getHitLine(channel: Channel): SVGPolylineElement {
  const el = container.querySelector<SVGPolylineElement>(
    `[data-testid="palette-chart-hit-line-${channel}"]`,
  );
  if (!el) throw new Error(`${channel}-channel hit-line not found`);
  return el;
}

function getNodeHit(channel: Channel, index: number): SVGCircleElement {
  const el = container.querySelector<SVGCircleElement>(
    `.tokenpanel-palette-chart-node-hit[data-node-hit="${index}"][data-channel="${channel}"]`,
  );
  if (!el) throw new Error(`node hit ${channel}/${index} not found`);
  return el;
}

/** Collapse onChange calls into the final value per node index. */
function finalValuesByIndex(
  onChange: ReturnType<typeof vi.fn>,
  count: number,
): number[] {
  const out = Array.from({ length: count }, () => NaN);
  for (const call of onChange.mock.calls) {
    const [index, , value] = call as [number, Channel, number];
    out[index] = value;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('PaletteChart — rendering', () => {
  it('preserves invalid slots without fabricating bands or edit nodes', () => {
    renderChart({
      colors: [makeColors([30])[0], null, makeColors([70])[0]],
      visibleChannels: { l: true, c: false, h: false },
    });
    expect(container.querySelectorAll('[data-band-index]').length).toBe(3);
    expect(container.querySelector('[data-band-index="1"]')?.getAttribute('data-invalid')).toBe('true');
    expect(container.querySelector('[data-node-hit="1"]')).toBeNull();
    expect(getNodeHit('l', 2)).not.toBeNull();
  });
  it('renders one band per color', () => {
    renderChart({ colors: makeColors([30, 50, 70, 90]) });
    const bands = container.querySelectorAll(
      '.tokenpanel-palette-chart-bands rect[data-band-index]',
    );
    expect(bands.length).toBe(4);
  });

  it('renders an L, C and H curve when all channels are visible', () => {
    renderChart({ colors: makeColors([30, 50, 70]) });
    for (const channel of ['l', 'c', 'h'] as const) {
      expect(
        container.querySelector(`[data-testid="palette-chart-curve-${channel}"]`),
      ).not.toBeNull();
    }
  });

  it('hides a curve layer when its visibleChannels flag is false', () => {
    renderChart({
      colors: makeColors([30, 50, 70]),
      visibleChannels: { l: true, c: false, h: false },
    });
    expect(
      container.querySelector('[data-testid="palette-chart-curve-l"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="palette-chart-curve-c"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-testid="palette-chart-curve-h"]'),
    ).toBeNull();
  });

  it('renders N node-hit sliders per visible channel', () => {
    renderChart({
      colors: makeColors([30, 50, 70]),
      visibleChannels: { l: true, c: false, h: false },
    });
    const sliders = container.querySelectorAll(
      '.tokenpanel-palette-chart-node-hit[data-channel="l"][role="slider"]',
    );
    expect(sliders.length).toBe(3);
  });

  it('marks the selected band at full opacity and dims the rest', () => {
    renderChart({ colors: makeColors([30, 50, 70]), selectedIndex: 1 });
    const bands = Array.from(
      container.querySelectorAll(
        '.tokenpanel-palette-chart-bands rect[data-band-index]',
      ),
    );
    const opacity = (i: number) => bands[i].getAttribute('opacity');
    expect(opacity(1)).toBe('1');
    expect(opacity(0)).not.toBe('1');
    expect(opacity(2)).not.toBe('1');
  });

  it('uses no native <button> or banned semantic tags', () => {
    renderChart({ colors: makeColors([30, 50, 70]) });
    expect(container.querySelector('button')).toBeNull();
    for (const tag of ['h1', 'h2', 'h3', 'h4', 'p', 'ul', 'li', 'a', 'table']) {
      expect(container.querySelector(tag)).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// Per-node drag
// ---------------------------------------------------------------------------

describe('PaletteChart — per-node drag', () => {
  it('dragging a node fires onChange(index, channel, value) for ONLY that node', () => {
    const onChange = vi.fn();
    renderChart({
      colors: makeColors([30, 50, 40]),
      visibleChannels: { l: true, c: false, h: false },
      onChange,
    });
    const svg = primeChannelSvg('l');
    const node = getNodeHit('l', 1);
    stubPointerCapture(node);

    // pointerdown must target the node hit-circle so the delegated handler's
    // closest('[data-node-hit]') resolves and per-node drag engages.
    firePointer(node, 'pointerdown', { pointerId: 2, clientY: clientYForL(50) });
    firePointer(svg, 'pointermove', { pointerId: 2, clientY: clientYForL(75) });

    const touched = new Set(onChange.mock.calls.map((c) => c[0]));
    expect(touched.has(1)).toBe(true);
    expect(touched.has(0)).toBe(false);
    expect(touched.has(2)).toBe(false);
    const last = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(last).toEqual([1, 'l', 75]);
  });

  it('fires onChangeStart on pointer-down and onChangeEnd on pointer-up', () => {
    const onChangeStart = vi.fn();
    const onChangeEnd = vi.fn();
    renderChart({
      colors: makeColors([30, 50, 40]),
      visibleChannels: { l: true, c: false, h: false },
      onChangeStart,
      onChangeEnd,
    });
    const svg = primeChannelSvg('l');
    const node = getNodeHit('l', 1);
    stubPointerCapture(node);

    firePointer(node, 'pointerdown', { pointerId: 3, clientY: clientYForL(50) });
    expect(onChangeStart).toHaveBeenCalledTimes(1);
    expect(onChangeEnd).not.toHaveBeenCalled();

    firePointer(svg, 'pointerup', { pointerId: 3, clientY: clientYForL(50) });
    expect(onChangeEnd).toHaveBeenCalledTimes(1);
  });

  it('selects the node index on pointer-down', () => {
    const onSelectIndex = vi.fn();
    renderChart({
      colors: makeColors([30, 50, 40]),
      visibleChannels: { l: true, c: false, h: false },
      onSelectIndex,
    });
    primeChannelSvg('l');
    const node = getNodeHit('l', 2);
    stubPointerCapture(node);
    firePointer(node, 'pointerdown', { pointerId: 4, clientY: clientYForL(40) });
    expect(onSelectIndex).toHaveBeenCalledWith(2);
  });

  it('stops an in-flight node drag when that dense slot becomes null', () => {
    const onChange = vi.fn();
    renderChart({
      colors: makeColors([50, 60]),
      visibleChannels: { l: true, c: false, h: false },
      onChange,
    });
    const svg = primeChannelSvg('l');
    const node = getNodeHit('l', 0);
    stubPointerCapture(node);
    firePointer(node, 'pointerdown', { pointerId: 10, clientY: clientYForL(50) });

    renderChart({
      colors: [null, makeColors([60])[0]],
      visibleChannels: { l: true, c: false, h: false },
      onChange,
    });
    firePointer(svg, 'pointermove', { pointerId: 10, clientY: clientYForL(70) });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('quantizes the C channel to a 0.001 grid (not integer rounding)', () => {
    const onChange = vi.fn();
    // C nodes; values irrelevant — we just drive a clientY and read the value.
    renderChart({
      colors: [
        { l: 50, c: 0.1, h: 200, a: 100 },
        { l: 50, c: 0.2, h: 200, a: 100 },
      ],
      visibleChannels: { l: false, c: true, h: false },
      onChange,
    });
    const svg = primeChannelSvg('c');
    const node = getNodeHit('c', 0);
    stubPointerCapture(node);
    firePointer(node, 'pointerdown', { pointerId: 5, clientY: VIEW_H / 2 });
    firePointer(svg, 'pointermove', { pointerId: 5, clientY: VIEW_H / 2 });
    // clientY = 100 → normY = 0.5 → c = MAX/2 ≈ 0.185, snapped to 0.001 grid.
    const last = onChange.mock.calls[onChange.mock.calls.length - 1];
    const value = last[2] as number;
    expect(value).toBeCloseTo(MAX_OKLCH_CHROMA / 2, 3);
    // Quantized to the 0.001 grid → an integer number of milli-units.
    expect(Math.round(value * 1000)).toBeCloseTo(value * 1000, 6);
  });
});

// ---------------------------------------------------------------------------
// Whole-curve drag (clamp behaviour — the binding signal, per pgen)
// ---------------------------------------------------------------------------

describe('PaletteChart — whole-curve vertical drag', () => {
  it('skips null slots in whole-curve callbacks and clamps from valid nodes only', () => {
    const onChange = vi.fn();
    renderChart({
      colors: [makeColors([30])[0], null, ...makeColors([50, 60])],
      visibleChannels: { l: true, c: false, h: false },
      onChange,
    });
    const svg = primeChannelSvg('l');
    const hitLine = getHitLine('l');
    stubPointerCapture(hitLine);
    firePointer(hitLine, 'pointerdown', { clientY: clientYForL(40) });
    firePointer(svg, 'pointermove', { clientY: clientYForL(50) });
    expect(new Set(onChange.mock.calls.map((call) => call[0]))).toEqual(new Set([0, 2, 3]));
  });
  function setupCurveDrag(lValues: number[]) {
    const onChange = vi.fn();
    renderChart({
      colors: makeColors(lValues),
      visibleChannels: { l: true, c: false, h: false },
      onChange,
    });
    primeChannelSvg('l');
    const hitLine = getHitLine('l');
    stubPointerCapture(hitLine);
    return { hitLine, onChange };
  }

  it('translates every node by the same delta when dragged up (shape preserved)', () => {
    const start = [30, 50, 40];
    const { hitLine, onChange } = setupCurveDrag(start);
    firePointer(hitLine, 'pointerdown', { clientY: clientYForL(50) });
    firePointer(hitLine, 'pointermove', { clientY: clientYForL(70) });

    const finals = finalValuesByIndex(onChange, start.length);
    expect(finals).toEqual([50, 70, 60]); // each shifted by +20
    expect(finals[1] - finals[0]).toBe(start[1] - start[0]);
    expect(finals[2] - finals[0]).toBe(start[2] - start[0]);
  });

  it('translates every node down by a negative delta', () => {
    const start = [60, 80, 70];
    const { hitLine, onChange } = setupCurveDrag(start);
    firePointer(hitLine, 'pointerdown', { clientY: clientYForL(70) });
    firePointer(hitLine, 'pointermove', { clientY: clientYForL(50) });

    expect(finalValuesByIndex(onChange, start.length)).toEqual([40, 60, 50]);
  });

  it('clamps the upward drag so the highest node stops at CHANNEL_MAX', () => {
    const start = [70, 90, 80]; // headroom = 10
    const { hitLine, onChange } = setupCurveDrag(start);
    firePointer(hitLine, 'pointerdown', { clientY: clientYForL(50) });
    firePointer(hitLine, 'pointermove', { clientY: clientYForL(90) }); // +40 requested

    const finals = finalValuesByIndex(onChange, start.length);
    expect(finals).toEqual([80, 100, 90]); // delta clamped to +10
    expect(Math.max(...finals)).toBe(L_MAX);
    expect(finals[1] - finals[0]).toBe(start[1] - start[0]);
  });

  it('clamps the downward drag so the lowest node stops at 0', () => {
    const start = [15, 45, 30]; // headroom = 15
    const { hitLine, onChange } = setupCurveDrag(start);
    firePointer(hitLine, 'pointerdown', { clientY: clientYForL(50) });
    firePointer(hitLine, 'pointermove', { clientY: clientYForL(10) }); // -40 requested

    const finals = finalValuesByIndex(onChange, start.length);
    expect(finals).toEqual([0, 30, 15]); // delta clamped to -15
    expect(Math.min(...finals)).toBe(0);
    expect(finals[1] - finals[0]).toBe(start[1] - start[0]);
  });

  it('does not render a hit-line when the curve has only one node', () => {
    renderChart({
      colors: makeColors([50]),
      visibleChannels: { l: true, c: false, h: false },
    });
    expect(
      container.querySelector('[data-testid="palette-chart-hit-line-l"]'),
    ).toBeNull();
  });

  it('fires onChangeStart once on grab and onChangeEnd once on release', () => {
    const onChangeStart = vi.fn();
    const onChangeEnd = vi.fn();
    renderChart({
      colors: makeColors([30, 50, 40]),
      visibleChannels: { l: true, c: false, h: false },
      onChangeStart,
      onChangeEnd,
    });
    primeChannelSvg('l');
    const hitLine = getHitLine('l');
    stubPointerCapture(hitLine);

    firePointer(hitLine, 'pointerdown', { clientY: clientYForL(50) });
    firePointer(hitLine, 'pointermove', { clientY: clientYForL(60) });
    expect(onChangeStart).toHaveBeenCalledTimes(1);
    expect(onChangeEnd).not.toHaveBeenCalled();

    firePointer(hitLine, 'pointerup', { clientY: clientYForL(60) });
    expect(onChangeEnd).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Keyboard navigation
// ---------------------------------------------------------------------------

describe('PaletteChart — keyboard navigation', () => {
  function fireKey(el: Element, key: string, shiftKey = false): void {
    act(() => {
      el.dispatchEvent(
        new KeyboardEvent('keydown', { key, shiftKey, bubbles: true }),
      );
    });
  }

  it('ArrowUp increments the L node by 1', () => {
    const onChange = vi.fn();
    renderChart({
      colors: makeColors([50]),
      visibleChannels: { l: true, c: false, h: false },
      onChange,
    });
    fireKey(getNodeHit('l', 0), 'ArrowUp');
    expect(onChange).toHaveBeenCalledWith(0, 'l', 51);
  });

  it('Shift+ArrowUp increments the L node by 10', () => {
    const onChange = vi.fn();
    renderChart({
      colors: makeColors([50]),
      visibleChannels: { l: true, c: false, h: false },
      onChange,
    });
    fireKey(getNodeHit('l', 0), 'ArrowUp', true);
    expect(onChange).toHaveBeenCalledWith(0, 'l', 60);
  });

  it('Home sets the node to 0 and End to the channel max', () => {
    const onChange = vi.fn();
    renderChart({
      colors: makeColors([50]),
      visibleChannels: { l: true, c: false, h: false },
      onChange,
    });
    const node = getNodeHit('l', 0);
    fireKey(node, 'Home');
    expect(onChange).toHaveBeenLastCalledWith(0, 'l', 0);
    fireKey(node, 'End');
    expect(onChange).toHaveBeenLastCalledWith(0, 'l', 100);
  });

  it('opens and closes the commit boundary around an atomic keyboard edit', () => {
    const onChangeStart = vi.fn();
    const onChangeEnd = vi.fn();
    renderChart({
      colors: makeColors([50]),
      visibleChannels: { l: true, c: false, h: false },
      onChangeStart,
      onChangeEnd,
    });
    fireKey(getNodeHit('l', 0), 'ArrowUp');
    expect(onChangeStart).toHaveBeenCalledTimes(1);
    expect(onChangeEnd).toHaveBeenCalledTimes(1);
  });

  it('H clamps at 360 (no wrap past the top)', () => {
    const onChange = vi.fn();
    renderChart({
      colors: [{ l: 50, c: 0.1, h: 360, a: 100 }],
      visibleChannels: { l: false, c: false, h: true },
      onChange,
    });
    fireKey(getNodeHit('h', 0), 'ArrowUp');
    // 360 + 1 → clamped to 360, NOT wrapped to 1.
    expect(onChange).toHaveBeenCalledWith(0, 'h', 360);
  });

  it('H clamps at 0 (no wrap below the bottom)', () => {
    const onChange = vi.fn();
    renderChart({
      colors: [{ l: 50, c: 0.1, h: 0, a: 100 }],
      visibleChannels: { l: false, c: false, h: true },
      onChange,
    });
    fireKey(getNodeHit('h', 0), 'ArrowDown');
    // 0 − 1 → clamped to 0, NOT wrapped to 359.
    expect(onChange).toHaveBeenCalledWith(0, 'h', 0);
  });

  it('exposes role=slider with aria-valuemin/max/now per channel', () => {
    renderChart({
      colors: [{ l: 42, c: 0.1, h: 200, a: 100 }],
      visibleChannels: { l: true, c: false, h: true },
    });
    const lNode = getNodeHit('l', 0);
    expect(lNode.getAttribute('role')).toBe('slider');
    expect(lNode.getAttribute('aria-valuemin')).toBe('0');
    expect(lNode.getAttribute('aria-valuemax')).toBe('100');
    expect(lNode.getAttribute('aria-valuenow')).toBe('42');

    const hNode = getNodeHit('h', 0);
    expect(hNode.getAttribute('aria-valuemax')).toBe('360');
    expect(hNode.getAttribute('aria-valuenow')).toBe('200');
  });
});

// ---------------------------------------------------------------------------
// Ellipse counter-scaling (true circles under preserveAspectRatio="none")
// ---------------------------------------------------------------------------

describe('PaletteChart — node counter-scaling', () => {
  it('draws visual nodes as <ellipse> with equal rx/ry at the default (square) scale', () => {
    renderChart({
      colors: makeColors([50]),
      visibleChannels: { l: true, c: false, h: false },
    });
    // No ResizeObserver measurement has run (jsdom rect is zero), so chartSize
    // stays at the viewBox → scaleX === scaleY === 1 → rx === ry (true circle).
    const ellipse = container.querySelector<SVGEllipseElement>(
      '.tokenpanel-palette-chart-node-visual',
    );
    expect(ellipse).not.toBeNull();
    expect(ellipse!.tagName.toLowerCase()).toBe('ellipse');
    expect(ellipse!.getAttribute('rx')).toBe(ellipse!.getAttribute('ry'));
  });
});
