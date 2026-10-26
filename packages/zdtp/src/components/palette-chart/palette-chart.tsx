/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, For, getScope, Show, signal, type ReadonlySignal, type Ref } from '@takazudo/zfb/zudo-react';
import {
  CHANNEL_MAX,
  stepX as stepXNorm,
  valueToY as valueToYNorm,
  yToValue as yToValueNorm,
  type Channel,
} from '../../utils/palette-curve';
import { oklchaToHex, type Oklcha } from '../../utils/color-oklch';
import { read, type Reactive } from '../../zr/live';
import { Rebuild } from '../../zr/rebuild';

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
/** Inert readonly blocker radius in screen pixels; covers the curve hit stroke. */
const READONLY_BLOCK_R_PX = CURVE_HIT_STROKE_W / 2 + 2;

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
  /**
   * Dense per-index write permission, separate from color validity. A valid
   * readonly color remains painted in the bands/curves, but receives no node
   * hit target and is excluded from whole-curve editing.
   */
  editable: boolean[];
  /** Dense stable item identities used to invalidate stale index-based gestures. */
  identities: string[];
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
interface CurveSegment {
  points: string;
}

function curveSegments(colors: Array<Oklcha | null>, channel: Channel): CurveSegment[] {
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
  return segments.map((points) => ({ points: points.join(' ') }));
}

/**
 * Pointer paths follow each valid visual edge but stop short of readonly
 * endpoints. This preserves whole-curve grabbing from the writable portion of
 * a mixed edge without making the locked marker coordinate pointer-active.
 */
function curveHitSegments(
  colors: Array<Oklcha | null>,
  editable: boolean[],
  channel: Channel,
): string[] {
  const hitSegments: string[] = [];
  const readonlyTrim = 0.2;
  for (let i = 0; i < colors.length - 1; i += 1) {
    const from = colors[i];
    const to = colors[i + 1];
    if (!from || !to || (!editable[i] && !editable[i + 1])) continue;
    const fromPoint = {
      x: stepX(i, colors.length),
      y: valueToY(channelValue(from, channel), channel),
    };
    const toPoint = {
      x: stepX(i + 1, colors.length),
      y: valueToY(channelValue(to, channel), channel),
    };
    const pointAt = (ratio: number) => ({
      x: fromPoint.x + (toPoint.x - fromPoint.x) * ratio,
      y: fromPoint.y + (toPoint.y - fromPoint.y) * ratio,
    });
    const hitFrom = pointAt(editable[i] ? 0 : readonlyTrim);
    const hitTo = pointAt(editable[i + 1] ? 1 : 1 - readonlyTrim);
    hitSegments.push(
      `${hitFrom.x.toFixed(2)},${hitFrom.y.toFixed(2)} ${hitTo.x.toFixed(2)},${hitTo.y.toFixed(2)}`,
    );
  }
  return hitSegments;
}

// ── Component ───────────────────────────────────────────────────────────────

type ChartDrag =
  | { kind: 'node'; index: number; identity: string; channel: Channel }
  | {
      kind: 'curve';
      channel: Channel;
      startPointerValue: number;
      startValues: Array<number | null>;
      startIdentities: Array<string | null>;
    };

/** Shared, live state each channel layer reads. */
interface ChartModel {
  colors: ReadonlySignal<Array<Oklcha | null>>;
  editable: ReadonlySignal<boolean[]>;
  identities: ReadonlySignal<string[]>;
  selectedIndex: ReadonlySignal<number>;
  nodeRx: ReadonlySignal<number>;
  nodeRy: ReadonlySignal<number>;
  /** Tracks the in-flight drag. Discriminated so the node and curve move
   *  paths can never cross-fire. */
  drag: { current: ChartDrag | null };
  onChange: PaletteChartProps['onChange'];
  onSelectIndex: PaletteChartProps['onSelectIndex'];
  onChangeStart?: () => void;
  onChangeEnd?: () => void;
}

export function PaletteChart(props: Reactive<
  PaletteChartProps,
  'onChange' | 'onSelectIndex' | 'onToggleChannel' | 'onChangeStart' | 'onChangeEnd'
>) {
  // onToggleChannel is part of the controlled contract (the parent renders the
  // real channel-toggle UI and owns visibleChannels) — the chart only consumes
  // visibleChannels, so it is intentionally not used here.
  const colors = computed(() => read(props.colors));
  const editable = computed(() => read(props.editable));
  const visibleChannels = computed(() => read(props.visibleChannels));

  // Live rendered size of the chart box, tracked so node markers can be
  // counter-scaled back to true circles under `preserveAspectRatio="none"`.
  // Initialised to the viewBox so the first paint and non-DOM environments
  // (no ResizeObserver) render an undistorted circle.
  const container: Ref<HTMLDivElement> = { current: null };
  const chartSize = signal({ w: VIEW_W, h: VIEW_H });
  getScope().onActivate(() => {
    const el = container.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const prev = chartSize.value;
      if (rect.width > 0 && rect.height > 0 && (prev.w !== rect.width || prev.h !== rect.height)) {
        chartSize.value = { w: rect.width, h: rect.height };
      }
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  });

  // User-unit radii that render the node as a true on-screen circle of
  // NODE_R_VISUAL_PX regardless of the panel's aspect ratio: a length of `r`
  // user units maps to `r · (renderedDim / viewDim)` px, so divide out that
  // scale per axis.
  const scaleX = computed(() => (chartSize.value.w > 0 ? chartSize.value.w / VIEW_W : 1));
  const scaleY = computed(() => (chartSize.value.h > 0 ? chartSize.value.h / VIEW_H : 1));

  const model: ChartModel = {
    colors,
    editable,
    identities: computed(() => read(props.identities)),
    selectedIndex: computed(() => read(props.selectedIndex)),
    nodeRx: computed(() => NODE_R_VISUAL_PX / scaleX.value),
    nodeRy: computed(() => NODE_R_VISUAL_PX / scaleY.value),
    drag: { current: null },
    onChange: props.onChange,
    onSelectIndex: props.onSelectIndex,
    onChangeStart: props.onChangeStart,
    onChangeEnd: props.onChangeEnd,
  };

  const bandIndexes = computed(() => colors.value.map((_, i) => i));
  const blockers = computed(() => CHANNELS.flatMap((channel) => {
    if (!visibleChannels.value[channel]) return [];
    return colors.value.flatMap((c, i) => (c && !editable.value[i] ? [{ channel, index: i }] : []));
  }));

  return (
    <div
      class="tokenpanel-palette-chart"
      data-testid="palette-chart"
      ref={container}
    >
      {/* ── Background bands (one SVG, full height) ─────────────────────── */}
      <svg
        class="tokenpanel-palette-chart-bands"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        role="presentation"
        data-testid="palette-chart-bands"
      >
        <For each={bandIndexes} by={(i) => i}>
          {(entry) => {
            const i = entry.value;
            const color = computed(() => colors.value[i] ?? null);
            const valid = computed(() => color.value !== null);
            return (
              <rect
                x={computed(() => (i / colors.value.length) * VIEW_W)}
                y={0}
                width={computed(() => VIEW_W / Math.max(1, colors.value.length))}
                height={VIEW_H}
                fill={computed(() => (color.value ? oklchaToHex(color.value) : null))}
                data-band-index={i}
                data-invalid={computed(() => (valid.value ? null : true))}
                data-readonly={computed(() => (valid.value && !editable.value[i] ? true : null))}
                class={computed(() => (valid.value ? null : 'tokenpanel-palette-chart-band is-invalid'))}
                opacity={computed(() => (i === model.selectedIndex.value ? 1 : 0.82))}
              />
            );
          }}
        </For>
      </svg>

      {/* ── One overlay SVG per channel — own Y-domain, shared pixel height ── */}
      {CHANNELS.map((channel) => (
        <Show when={computed(() => visibleChannels.value[channel] && colors.value.length > 0)}>
          {() => <ChannelLayer channel={channel} model={model} />}
        </Show>
      ))}
      {/* A final SVG sits above every channel layer. Its inert ellipses prevent
          any underlying node/curve target (including another stacked channel)
          from winning hit-testing at a readonly marker coordinate. */}
      <svg
        class="tokenpanel-palette-chart-blockers"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        role="presentation"
        aria-hidden="true"
      >
        <For each={blockers} by={(blocker) => `${blocker.channel}:${blocker.index}`}>
          {(entry) => {
            const { channel, index } = entry.value;
            const color = computed(() => colors.value[index]);
            return (
              <ellipse
                class="tokenpanel-palette-chart-readonly-blocker"
                cx={computed(() => stepX(index, colors.value.length))}
                cy={computed(() => (color.value ? valueToY(channelValue(color.value, channel), channel) : 0))}
                rx={computed(() => READONLY_BLOCK_R_PX / scaleX.value)}
                ry={computed(() => READONLY_BLOCK_R_PX / scaleY.value)}
                fill="transparent"
                data-readonly-blocker={index}
                data-channel={channel}
              />
            );
          }}
        </For>
      </svg>
    </div>
  );
}

/**
 * Which nodes, segments and hit targets a channel layer has. Values move the
 * existing elements; only a change here rebuilds the layer's children, so a
 * drag never loses its pointer capture to a re-render.
 */
function layerStructure(colors: Array<Oklcha | null>, editable: boolean[], identities: string[]): string {
  return colors
    .map((c, i) => `${c ? 1 : 0}${c && editable[i] ? 1 : 0}${identities[i] ?? ''}`)
    .join('|');
}

function ChannelLayer({ channel, model }: { channel: Channel; model: ChartModel }) {
  const { colors, editable, identities, drag } = model;
  const svg: Ref<SVGSVGElement> = { current: null };

  /** Map a clientY to a clamped+quantized channel value via this layer's SVG rect. */
  const eventToValue = (clientY: number): number => {
    const el = svg.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    // Guard against a zero-size rect (jsdom without a mocked rect) so unit
    // tests that mock getBoundingClientRect still map correctly.
    const normY = rect.height > 0 ? (clientY - rect.top) / rect.height : 0;
    return quantize(yToValueNorm(normY, channel), channel);
  };

  // ── Pointer wiring ────────────────────────────────────────────────────────
  //
  // One delegated `pointerdown` listener inspects the target to find whether a
  // node hit-circle or the curve hit-line was grabbed, then move/up listeners
  // on the SVG drive the active drag. Pointer capture keeps the stream flowing
  // when the pointer leaves the grabbed element.
  getScope().onActivate(() => {
    const el = svg.current;
    if (!el) return;

    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Element | null;
      if (!target) return;

      const nodeHit = target.closest<SVGElement>('[data-node-hit]');
      const hitLine = target.closest<SVGElement>('[data-hit-line]');

      if (nodeHit) {
        // Per-node drag wins over curve drag.
        const index = Number(nodeHit.getAttribute('data-node-hit'));
        if (!colors.value[index] || !editable.value[index]) return;
        const identity = identities.value[index];
        if (!identity) return;
        e.preventDefault();
        // Stop the event from also being read as a curve grab.
        e.stopPropagation();
        try {
          nodeHit.setPointerCapture(e.pointerId);
        } catch {
          // jsdom does not implement setPointerCapture; ignore.
        }
        drag.current = { kind: 'node', index, identity, channel };
        model.onSelectIndex(index);
        model.onChangeStart?.();
        return;
      }

      if (hitLine) {
        e.preventDefault();
        try {
          hitLine.setPointerCapture(e.pointerId);
        } catch {
          // jsdom does not implement setPointerCapture; ignore.
        }
        const startValues = colors.value.map((c, index) =>
          c && editable.value[index] ? channelValue(c, channel) : null,
        );
        const startIdentities = startValues.map((value, index) =>
          value === null ? null : identities.value[index] ?? null,
        );
        if (!startValues.some((value) => value !== null)) return;
        drag.current = {
          kind: 'curve',
          channel,
          startPointerValue: eventToValue(e.clientY),
          startValues,
          startIdentities,
        };
        model.onChangeStart?.();
      }
    }

    function handlePointerMove(e: PointerEvent) {
      const current = drag.current;
      if (!current || current.channel !== channel) return;
      const liveColors = colors.value;
      const liveEditable = editable.value;
      const liveIdentities = identities.value;

      if (current.kind === 'node') {
        if (
          !liveColors[current.index] ||
          !liveEditable[current.index] ||
          liveIdentities[current.index] !== current.identity
        ) return;
        model.onChange(current.index, channel, eventToValue(e.clientY));
        return;
      }

      // Whole-curve drag — translate every node by ONE clamped delta so the
      // shape is preserved and translation stops when any node hits the
      // channel's [0, CHANNEL_MAX] boundary (Prism parity).
      const { startValues, startIdentities, startPointerValue } = current;
      if (startValues.length === 0) return;
      const max = CHANNEL_MAX[channel];
      const rawDelta = eventToValue(e.clientY) - startPointerValue;
      const stillLive = (index: number) =>
        Boolean(liveColors[index]) &&
        Boolean(liveEditable[index]) &&
        liveIdentities[index] === startIdentities[index];
      const editableValues = startValues.filter(
        (value, index): value is number => value !== null && stillLive(index),
      );
      if (editableValues.length === 0) return;
      const minV = Math.min(...editableValues);
      const maxV = Math.max(...editableValues);
      const delta = clamp(rawDelta, -minV, max - maxV);
      startValues.forEach((v, i) => {
        if (v === null || !stillLive(i)) return;
        model.onChange(i, channel, quantize(v + delta, channel));
      });
    }

    function endDrag() {
      if (!drag.current || drag.current.channel !== channel) return;
      drag.current = null;
      model.onChangeEnd?.();
    }

    el.addEventListener('pointerdown', handlePointerDown);
    el.addEventListener('pointermove', handlePointerMove);
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
    return () => {
      el.removeEventListener('pointerdown', handlePointerDown);
      el.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('pointerup', endDrag);
      el.removeEventListener('pointercancel', endDrag);
    };
  });

  /** Keyboard handler for a focused node. Mirrors CustomSlider's key map. */
  const handleNodeKeyDown = (e: KeyboardEvent, index: number, identity: string) => {
    const color = colors.value[index];
    if (!color || !editable.value[index] || identities.value[index] !== identity) return;
    const value = channelValue(color, channel);
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
    model.onSelectIndex(index);
    // Keyboard edits are atomic — open and close the commit boundary around
    // the single value change so the parent persists one step.
    model.onChangeStart?.();
    model.onChange(index, channel, quantize(clamp(next, 0, max), channel));
    model.onChangeEnd?.();
  };

  const structure = computed(() => layerStructure(colors.value, editable.value, identities.value));

  return (
    <svg
      ref={svg}
      class={`tokenpanel-palette-chart-curve tokenpanel-palette-chart-curve--${channel}`}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="none"
      role="presentation"
      data-testid={`palette-chart-curve-${channel}`}
      data-channel={channel}
    >
      <Rebuild value={structure}>
        {() => {
          const initialColors = colors.value;
          const hitCount = curveHitSegments(initialColors, editable.value, channel).length;
          const segmentCount = curveSegments(initialColors, channel).length;
          const hitPoints = computed(() => curveHitSegments(colors.value, editable.value, channel));
          const segmentPoints = computed(() => curveSegments(colors.value, channel));
          const nodeIndexes = initialColors.flatMap((c, i) => (c ? [i] : []));
          return (
            <>
              {/* Whole-curve drag hit area — transparent fat line beneath the
                  visible curve. Renders FIRST so the node hit circles (rendered
                  after) win an overlapping pointer-down. `pointer-events: stroke`
                  (CSS) makes only the stroke grabbable, so the stacked channel
                  SVGs don't steal events from lower channels. */}
              {Array.from({ length: hitCount }, (_, segmentIndex) => (
                <polyline
                  class="tokenpanel-palette-chart-hit-line"
                  points={computed(() => hitPoints.value[segmentIndex] ?? '')}
                  fill="none"
                  stroke="transparent"
                  stroke-width={CURVE_HIT_STROKE_W}
                  stroke-linejoin="round"
                  stroke-linecap="round"
                  data-hit-line={channel}
                  data-testid={`palette-chart-hit-line-${channel}`}
                  data-channel={channel}
                />
              ))}
              {Array.from({ length: segmentCount }, (_, segmentIndex) => (
                <g>
                  <polyline
                    class="tokenpanel-palette-chart-line"
                    points={computed(() => segmentPoints.value[segmentIndex]?.points ?? '')}
                    fill="none"
                    stroke-width={CURVE_STROKE_W}
                  />
                </g>
              ))}
              {nodeIndexes.map((i) => (
                <ChartNode
                  channel={channel}
                  index={i}
                  editable={Boolean(editable.value[i])}
                  identity={identities.value[i] ?? ''}
                  model={model}
                  onKeyDown={handleNodeKeyDown}
                />
              ))}
            </>
          );
        }}
      </Rebuild>
    </svg>
  );
}

function ChartNode({
  channel,
  index,
  editable,
  identity,
  model,
  onKeyDown,
}: {
  channel: Channel;
  index: number;
  editable: boolean;
  identity: string;
  model: ChartModel;
  onKeyDown: (e: KeyboardEvent, index: number, identity: string) => void;
}) {
  const { colors } = model;
  const value = computed(() => {
    const color = colors.value[index];
    return color ? channelValue(color, channel) : 0;
  });
  const x = computed(() => stepX(index, colors.value.length));
  const y = computed(() => valueToY(value.value, channel));
  return (
    <g data-node-index={index} data-readonly={editable ? null : true}>
      {/* Visual node (non-interactive — the hit circle handles pointers).
          Drawn as an ellipse with rx/ry counter-scaled so it lands as a true
          NODE_R_VISUAL_PX-radius circle despite preserveAspectRatio="none"
          stretching the viewBox. */}
      <ellipse
        class={editable
          ? 'tokenpanel-palette-chart-node-visual'
          : 'tokenpanel-palette-chart-node-visual is-readonly'}
        cx={x}
        cy={y}
        rx={model.nodeRx}
        ry={model.nodeRy}
        stroke-width={computed(() => (index === model.selectedIndex.value ? 3 : 2))}
        aria-hidden="true"
      />
      {/* Hit area — carries pointer capture (via delegation) + keyboard.
          role="slider" so it is operable without a pointer. */}
      {editable ? (
        <circle
          class="tokenpanel-palette-chart-node-hit"
          cx={x}
          cy={y}
          r={NODE_R_HIT}
          fill="transparent"
          tabindex={0}
          role="slider"
          aria-label={`${channel.toUpperCase()} of color ${index + 1}`}
          aria-valuemin={0}
          aria-valuemax={CHANNEL_MAX[channel]}
          aria-valuenow={value}
          data-channel={channel}
          data-node-hit={index}
          on:keydown={(e: KeyboardEvent) => onKeyDown(e, index, identity)}
          on:focus={() => model.onSelectIndex(index)}
        />
      ) : null}
    </g>
  );
}

export default PaletteChart;
