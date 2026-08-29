import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/compat';
import type { JSX } from 'preact';
import {
  CHANNEL_MAX,
  stepX as stepXNorm,
  valueToY as valueToYNorm,
  yToValue as yToValueNorm,
  type Channel,
} from '../../utils/palette-curve';
import { oklchaToHex, type Oklcha } from '../../utils/color-oklch';

/**
 * PaletteChart — controlled, presentational OKLCH L/C/H curve editor.
 *
 * Ported from pgen's PrismChart (OKHsl H/S/L) to zdtp's OKLCH L/C/H space.
 * Composition:
 *   • Background = N vertical color bands, one per palette color. Band `i` is
 *     painted `oklchaToHex(colors[i])` and spans the FULL chart height. The
 *     selected band renders at full opacity; the rest are dimmed.
 *   • One overlaid draggable curve per VISIBLE channel — L, C, H — EACH IN ITS
 *     OWN SVG with its OWN Y-domain (L 0–100, C 0–MAX_OKLCH_CHROMA, H 0–360)
 *     mapped to the SAME pixel height. The vertical bands (x = step) are the
 *     only shared reference; the three channels deliberately do NOT share one
 *     numeric Y axis (Prism's key trick).
 *   • N nodes per curve at x = stepIndex (centered over band `i`), y = inverted
 *     channel value. Dragging a node vertically reports the new value.
 *
 * Ownership boundary: this chart is FULLY CONTROLLED. It owns no color state;
 * `colors` is the single source of truth supplied by the parent (#395). It only
 * CONSUMES `visibleChannels` (to draw/hide each curve) and reports intents via
 * `onChange` / `onSelectIndex` / `onToggleChannel`. Commit boundaries for
 * batched persistence are signalled by `onChangeStart` / `onChangeEnd`.
 *
 * Drag modes (Prism parity):
 *   • Per-node drag — grab a single node and move it vertically.
 *   • Whole-curve drag — grab the connecting LINE and translate EVERY node of
 *     that channel by one clamped delta, preserving the curve's relative shape
 *     and stopping when any node hits 0 or CHANNEL_MAX.
 *   Nodes WIN over line drag: the node hit circles render AFTER the hit-polyline
 *   within the same SVG, so a pointer-down on a node hits the circle (DOM order
 *   within an SVG determines paint/hit precedence).
 */

export type { Oklcha } from '../../utils/color-oklch';
export type { Channel } from '../../utils/palette-curve';

// ── Geometry constants ──────────────────────────────────────────────────────
//
// All values are SVG user units. Each channel SVG uses the same viewBox so the
// per-band x positions line up across the stacked layers. The background-band
// SVG shares the same viewBox too.

const VIEW_W = 300;
const VIEW_H = 200;

/**
 * Visual node radius in ON-SCREEN PIXELS (not SVG user units).
 *
 * The chart SVGs use `preserveAspectRatio="none"`, so the 300×200 user space is
 * stretched independently in x and y to fill the panel's flex box. A plain
 * `<circle r=…>` in user units therefore renders as an ellipse whenever the
 * panel aspect ≠ VIEW_W/VIEW_H. To keep a TRUE circle of a CONSTANT size at any
 * panel size, the node is drawn as an `<ellipse>` whose user-unit rx/ry are
 * counter-scaled by the live render scale (see nodeRx/nodeRy), landing at
 * exactly this pixel radius on screen.
 */
const NODE_R_VISUAL_PX = 4;
/** Invisible hit-area radius (SVG user units) — larger than the visual node. */
const NODE_R_HIT = 11;
/** Curve stroke width (SVG user units). */
const CURVE_STROKE_W = 2;
/**
 * Whole-curve drag hit-area stroke width (SVG user units) — a fat transparent
 * line beneath the visible curve so the line is easy to grab. Wider than the
 * visible stroke; nodes still win because they render after it.
 */
const CURVE_HIT_STROKE_W = 16;

/** Render order of channel curves (drawn bottom-up; later = on top). */
const CHANNELS: readonly Channel[] = ['l', 'c', 'h'] as const;

// ── Per-channel quantization ────────────────────────────────────────────────
//
// L and H are whole-number domains (0–100, 0–360). C is a sub-unit domain
// (0–0.37) where integer rounding would collapse it to 0; it follows the
// OklchPicker convention of a 0.001 step. `quantize` snaps a raw value to the
// channel's grid, and `keyStep` is the keyboard arrow increment.

const CHANNEL_STEP = { l: 1, c: 0.001, h: 1 } as const;

function quantize(value: number, channel: Channel): number {
  const step = CHANNEL_STEP[channel];
  // Snap to the step grid; toFixed-free to avoid float string churn.
  return Math.round(value / step) * step;
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface PaletteChartProps {
  /**
   * Dense palette slots in OKLCH space. A null slot preserves its index/band,
   * but has no numeric curve node and is not editable.
   */
  colors: Array<Oklcha | null>;
  /** Index of the currently selected color/step (highlighted band + node column). */
  selectedIndex: number;
  /** Which curves are drawn. Owned by the parent; chart only consumes. */
  visibleChannels: { l: boolean; c: boolean; h: boolean };
  /** Fired when a node is dragged/keyed — value is clamped+quantized to the channel range. */
  onChange: (index: number, channel: Channel, value: number) => void;
  /** Fired when a node/band is picked. */
  onSelectIndex: (i: number) => void;
  /** Fired to request a channel visibility toggle. Chart does NOT own the state. */
  onToggleChannel: (c: Channel) => void;
  /**
   * Commit-boundary start. Fires ONCE at the beginning of an edit gesture:
   * pointer-down on a node or curve line, or the first key of a keyboard edit.
   * The parent (#395) opens a transient/preview write here.
   */
  onChangeStart?: () => void;
  /**
   * Commit-boundary end. Fires ONCE when the edit gesture completes: pointer-up
   * / pointer-cancel, or immediately after a keyboard edit. The parent batches
   * the whole gesture into a single persist on this signal.
   */
  onChangeEnd?: () => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Clamp `v` to the inclusive range [lo, hi]. */
function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Center x (SVG user units) of band/step `i` for `count` bands. */
function stepX(i: number, count: number): number {
  if (count <= 0) return VIEW_W / 2;
  return stepXNorm(i, count) * VIEW_W;
}

/** Map a channel value to a y in SVG user units (inverted: max value → top). */
function valueToY(value: number, channel: Channel): number {
  return valueToYNorm(value, channel) * VIEW_H;
}

/** Read the channel value off an Oklcha color. */
function channelValue(color: Oklcha, channel: Channel): number {
  return color[channel];
}

/** Build the polyline points string for one channel's curve. */
function curveSegments(colors: Array<Oklcha | null>, channel: Channel): string[] {
  const segments: string[][] = [];
  let current: string[] = [];
  colors.forEach((c, i) => {
    if (c) {
      const x = stepX(i, colors.length);
      const y = valueToY(channelValue(c, channel), channel);
      current.push(`${x.toFixed(2)},${y.toFixed(2)}`);
      return;
    }
    if (current.length > 0) segments.push(current);
    current = [];
  });
  if (current.length > 0) segments.push(current);
  return segments.map((points) => points.join(' '));
}

// ── Component ───────────────────────────────────────────────────────────────

function PaletteChartImpl({
  colors,
  selectedIndex,
  visibleChannels,
  onChange,
  onSelectIndex,
  // onToggleChannel is part of the controlled contract (the parent renders the
  // real channel-toggle UI and owns visibleChannels) — the chart only consumes
  // visibleChannels, so it is intentionally not destructured/used here.
  onChangeStart,
  onChangeEnd,
}: PaletteChartProps): JSX.Element {
  // One SVG ref per channel layer — drag maps clientY against the SVG that owns
  // the dragged node, so each channel resolves against its own rect/Y-domain.
  const svgRefs = {
    l: useRef<SVGSVGElement>(null),
    c: useRef<SVGSVGElement>(null),
    h: useRef<SVGSVGElement>(null),
  };

  // Live rendered size of the chart box, tracked so node markers can be
  // counter-scaled back to true circles under `preserveAspectRatio="none"`.
  // Initialised to the viewBox so the first paint and non-DOM environments
  // (no ResizeObserver) render an undistorted circle.
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartSize, setChartSize] = useState({ w: VIEW_W, h: VIEW_H });
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setChartSize((prev) =>
          prev.w === rect.width && prev.h === rect.height
            ? prev
            : { w: rect.width, h: rect.height },
        );
      }
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // User-unit radii that render the node as a true on-screen circle of
  // NODE_R_VISUAL_PX regardless of the panel's aspect ratio: a length of `r`
  // user units maps to `r · (renderedDim / viewDim)` px, so divide out that
  // scale per axis.
  const scaleX = chartSize.w > 0 ? chartSize.w / VIEW_W : 1;
  const scaleY = chartSize.h > 0 ? chartSize.h / VIEW_H : 1;
  const nodeRx = NODE_R_VISUAL_PX / scaleX;
  const nodeRy = NODE_R_VISUAL_PX / scaleY;

  // Keep callbacks in refs so the imperative pointer listeners (registered once
  // per channel SVG) always call the latest props without re-subscribing.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSelectIndexRef = useRef(onSelectIndex);
  onSelectIndexRef.current = onSelectIndex;
  const onChangeStartRef = useRef(onChangeStart);
  onChangeStartRef.current = onChangeStart;
  const onChangeEndRef = useRef(onChangeEnd);
  onChangeEndRef.current = onChangeEnd;

  // Snapshot of the live `colors` so curve-drag pointer-down reads the latest
  // node values without churning the listener registration.
  const colorsRef = useRef<Array<Oklcha | null>>(colors);
  colorsRef.current = colors;

  // Tracks the in-flight drag. Discriminated so the node and curve move paths
  // can never cross-fire: a node drag and a whole-curve drag are mutually
  // exclusive and each path bails unless `kind` matches.
  const dragRef = useRef<
    | { kind: 'node'; index: number; channel: Channel }
    | {
        kind: 'curve';
        channel: Channel;
        startPointerValue: number;
        startValues: Array<number | null>;
      }
    | null
  >(null);

  // Pre-compute band fills once per `colors` change. No contrast badges — that
  // lives in Check mode (#394).
  const bands = useMemo(
    () =>
      colors.map((c, i) => ({
        index: i,
        x: (i / colors.length) * VIEW_W,
        width: VIEW_W / Math.max(1, colors.length),
        fill: c ? oklchaToHex(c) : undefined,
        valid: c !== null,
      })),
    [colors],
  );

  /** Map a clientY to a clamped+quantized channel value via the channel's SVG rect. */
  const eventToValue = useCallback(
    (clientY: number, channel: Channel): number => {
      const svg = svgRefs[channel].current;
      if (!svg) return 0;
      const rect = svg.getBoundingClientRect();
      // Guard against a zero-size rect (jsdom without a mocked rect) so unit
      // tests that mock getBoundingClientRect still map correctly.
      const normY = rect.height > 0 ? (clientY - rect.top) / rect.height : 0;
      const raw = yToValueNorm(normY, channel);
      return quantize(raw, channel);
    },
    // svgRefs is a stable object of stable refs — read at call time.
    [],
  );

  // ── Imperative pointer wiring ─────────────────────────────────────────────
  //
  // Pointer handlers are registered via addEventListener (NOT JSX onPointer*
  // props): Preact's JSX event delegation checks `lowerCaseName in dom` to pick
  // the event name, but jsdom does NOT expose `onpointerdown` etc. on elements,
  // so Preact registers the wrong-cased "PointerDown" and dispatched
  // "pointerdown" events never fire the handler. addEventListener bypasses that
  // heuristic and works in both jsdom and browsers (matches CustomSlider).
  //
  // We delegate per channel SVG: one `pointerdown` listener inspects the target
  // to find whether a node hit-circle or the curve hit-line was grabbed, then
  // move/up listeners on the SVG drive the active drag. Pointer capture keeps
  // the stream flowing when the pointer leaves the grabbed element.
  useEffect(() => {
    const channels = CHANNELS;
    const cleanups: Array<() => void> = [];

    for (const channel of channels) {
      const svg = svgRefs[channel].current;
      if (!svg) continue;

      function handlePointerDown(e: PointerEvent) {
        const target = e.target as Element | null;
        if (!target) return;

        const nodeHit = target.closest<SVGElement>('[data-node-hit]');
        const hitLine = target.closest<SVGElement>('[data-hit-line]');

        if (nodeHit) {
          // Per-node drag wins over curve drag.
          const index = Number(nodeHit.getAttribute('data-node-hit'));
          if (!colorsRef.current[index]) return;
          e.preventDefault();
          // Stop the event from also being read as a curve grab.
          e.stopPropagation();
          try {
            nodeHit.setPointerCapture(e.pointerId);
          } catch {
            // jsdom does not implement setPointerCapture; ignore.
          }
          dragRef.current = { kind: 'node', index, channel };
          onSelectIndexRef.current(index);
          onChangeStartRef.current?.();
          return;
        }

        if (hitLine) {
          e.preventDefault();
          try {
            hitLine.setPointerCapture(e.pointerId);
          } catch {
            // jsdom does not implement setPointerCapture; ignore.
          }
          const startValues = colorsRef.current.map((c) =>
            c ? channelValue(c, channel) : null,
          );
          if (!startValues.some((value) => value !== null)) return;
          dragRef.current = {
            kind: 'curve',
            channel,
            startPointerValue: eventToValue(e.clientY, channel),
            startValues,
          };
          onChangeStartRef.current?.();
        }
      }

      function handlePointerMove(e: PointerEvent) {
        const drag = dragRef.current;
        if (!drag || drag.channel !== channel) return;

        if (drag.kind === 'node') {
          if (!colorsRef.current[drag.index]) return;
          onChangeRef.current(
            drag.index,
            channel,
            eventToValue(e.clientY, channel),
          );
          return;
        }

        // Whole-curve drag — translate every node by ONE clamped delta so the
        // shape is preserved and translation stops when any node hits the
        // channel's [0, CHANNEL_MAX] boundary (Prism parity).
        const { startValues, startPointerValue } = drag;
        if (startValues.length === 0) return;
        const max = CHANNEL_MAX[channel];
        const rawDelta = eventToValue(e.clientY, channel) - startPointerValue;
        const editableValues = startValues.filter((value): value is number => value !== null);
        const minV = Math.min(...editableValues);
        const maxV = Math.max(...editableValues);
        const delta = clamp(rawDelta, -minV, max - maxV);
        startValues.forEach((v, i) => {
          if (v === null || !colorsRef.current[i]) return;
          onChangeRef.current(i, channel, quantize(v + delta, channel));
        });
      }

      function endDrag() {
        if (!dragRef.current || dragRef.current.channel !== channel) return;
        dragRef.current = null;
        onChangeEndRef.current?.();
      }

      svg.addEventListener('pointerdown', handlePointerDown);
      svg.addEventListener('pointermove', handlePointerMove);
      svg.addEventListener('pointerup', endDrag);
      svg.addEventListener('pointercancel', endDrag);

      cleanups.push(() => {
        svg.removeEventListener('pointerdown', handlePointerDown);
        svg.removeEventListener('pointermove', handlePointerMove);
        svg.removeEventListener('pointerup', endDrag);
        svg.removeEventListener('pointercancel', endDrag);
      });
    }

    return () => {
      for (const c of cleanups) c();
    };
    // Re-subscribe when the set of mounted channel SVGs changes (visibility
    // toggle) — a hidden channel unmounts its SVG, so its listeners must be
    // re-attached when it re-appears.
  }, [visibleChannels.l, visibleChannels.c, visibleChannels.h, eventToValue]);

  /** Keyboard handler for a focused node. Mirrors CustomSlider's key map. */
  const handleNodeKeyDown = useCallback(
    (e: KeyboardEvent, index: number, channel: Channel, value: number) => {
      if (!colorsRef.current[index]) return;
      const max = CHANNEL_MAX[channel];
      const step = CHANNEL_STEP[channel];
      const coarse = step * 10;
      let next: number | null = null;
      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowRight':
          next = value + (e.shiftKey ? coarse : step);
          break;
        case 'ArrowDown':
        case 'ArrowLeft':
          next = value - (e.shiftKey ? coarse : step);
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = max;
          break;
        default:
          return;
      }
      e.preventDefault();
      onSelectIndexRef.current(index);
      // Keyboard edits are atomic — open and close the commit boundary around
      // the single value change so the parent persists one step.
      onChangeStartRef.current?.();
      onChangeRef.current(index, channel, quantize(clamp(next, 0, max), channel));
      onChangeEndRef.current?.();
    },
    [],
  );

  const hasColors = colors.length > 0;

  return (
    <div
      className="tokenpanel-palette-chart"
      data-testid="palette-chart"
      ref={containerRef}
    >
      {/* ── Background bands (one SVG, full height) ─────────────────────── */}
      <svg
        className="tokenpanel-palette-chart-bands"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        role="presentation"
        data-testid="palette-chart-bands"
      >
        {bands.map((b) => (
          <rect
            key={`band-${b.index}`}
            x={b.x}
            y={0}
            width={b.width}
            height={VIEW_H}
            fill={b.fill}
            data-band-index={b.index}
            data-invalid={b.valid ? undefined : true}
            className={b.valid ? undefined : 'tokenpanel-palette-chart-band is-invalid'}
            opacity={b.index === selectedIndex ? 1 : 0.82}
          />
        ))}
      </svg>

      {/* ── One overlay SVG per channel — own Y-domain, shared pixel height ── */}
      {CHANNELS.map((channel) => {
        if (!visibleChannels[channel] || !hasColors) return null;
        return (
          <svg
            key={`curve-${channel}`}
            ref={svgRefs[channel]}
            className={`tokenpanel-palette-chart-curve tokenpanel-palette-chart-curve--${channel}`}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            preserveAspectRatio="none"
            role="presentation"
            data-testid={`palette-chart-curve-${channel}`}
            data-channel={channel}
          >
            {/* Whole-curve drag hit area — transparent fat line beneath the
                visible curve. Renders FIRST so the node hit circles (rendered
                after) win an overlapping pointer-down. `pointer-events: stroke`
                (CSS) makes only the stroke grabbable, so the stacked channel
                SVGs don't steal events from lower channels. */}
            {curveSegments(colors, channel).map((points, segmentIndex) => (
              <g key={`segment-${channel}-${segmentIndex}`}>
                {points.includes(' ') && (
                  <polyline
                    className="tokenpanel-palette-chart-hit-line"
                    points={points}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={CURVE_HIT_STROKE_W}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    data-hit-line={channel}
                    data-testid={`palette-chart-hit-line-${channel}`}
                    data-channel={channel}
                  />
                )}
                <polyline
                  className="tokenpanel-palette-chart-line"
                  points={points}
                  fill="none"
                  strokeWidth={CURVE_STROKE_W}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
              </g>
            ))}
            {colors.map((c, i) => {
              if (!c) return null;
              const value = channelValue(c, channel);
              const x = stepX(i, colors.length);
              const y = valueToY(value, channel);
              const isSelected = i === selectedIndex;
              return (
                <g key={`node-${channel}-${i}`} data-node-index={i}>
                  {/* Visual node (non-interactive — the hit circle handles
                      pointers). Drawn as an ellipse with rx/ry counter-scaled
                      so it lands as a true NODE_R_VISUAL_PX-radius circle
                      despite preserveAspectRatio="none" stretching the viewBox. */}
                  <ellipse
                    className="tokenpanel-palette-chart-node-visual"
                    cx={x}
                    cy={y}
                    rx={nodeRx}
                    ry={nodeRy}
                    strokeWidth={isSelected ? 3 : 2}
                    vectorEffect="non-scaling-stroke"
                    aria-hidden="true"
                    pointerEvents="none"
                  />
                  {/* Hit area — carries pointer capture (via delegation) +
                      keyboard. role="slider" so it is operable without a
                      pointer. */}
                  <circle
                    className="tokenpanel-palette-chart-node-hit"
                    cx={x}
                    cy={y}
                    r={NODE_R_HIT}
                    fill="transparent"
                    tabIndex={0}
                    role="slider"
                    aria-label={`${channel.toUpperCase()} of color ${i + 1}`}
                    aria-valuemin={0}
                    aria-valuemax={CHANNEL_MAX[channel]}
                    aria-valuenow={value}
                    data-channel={channel}
                    data-node-hit={i}
                    onKeyDown={(e: JSX.TargetedKeyboardEvent<SVGCircleElement>) =>
                      handleNodeKeyDown(e, i, channel, value)
                    }
                    onFocus={() => onSelectIndexRef.current(i)}
                  />
                </g>
              );
            })}
          </svg>
        );
      })}
    </div>
  );
}

/**
 * Memoized so parent re-renders that don't change props don't re-walk every
 * band/curve/node. The drag state lives in refs, so a controlled-value update
 * from the parent flows back through props as the single source of truth.
 */
export const PaletteChart = memo(PaletteChartImpl);

export default PaletteChart;
