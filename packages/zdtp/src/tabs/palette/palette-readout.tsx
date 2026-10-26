/** @jsxImportSource @takazudo/zfb/zudo-react */
/**
 * PaletteReadout — the per-step color readout shown beneath the active group's
 * curve editor (#395).
 *
 * Shows the selected step's token name plus its value in three notations:
 * OKLCH (the raw stored value, even when out of gamut), Hex, and RGB. Hex/RGB
 * are derived through `oklchaToHex`, which clamps at the sRGB boundary — so the
 * displayed hex/rgb may differ from the raw OKLCH when the step is out of gamut.
 *
 * DOM-hygiene: no banned semantic tags. Token/value rows are plain <div>s; the
 * monospace styling is carried by the companion CSS class, not a <code>/<pre>.
 */

import { computed, Show, type ReadonlySignal } from '@takazudo/zfb/zudo-react';
import type { Oklcha } from '../../utils/color-oklch';
import { oklchaToHex } from '../../utils/color-oklch';

export interface PaletteReadoutProps {
  /** The selected step's raw OKLCH value (never gamut-clamped). */
  oklcha: ReadonlySignal<Oklcha>;
  /** CSS custom-property name of the selected step (e.g. `--palette-gray-3`). */
  cssVar: ReadonlySignal<string>;
  /** True when the raw OKLCH value falls outside the sRGB gamut. */
  outOfGamut: ReadonlySignal<boolean>;
}

/** Parse a #rrggbb / #rrggbbaa hex string to an `rgb(r, g, b)` display string. */
function hexToRgbString(hex: string): string {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
  if (!m) return 'rgb(0, 0, 0)';
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Format the raw OKLCH as a compact, human-readable triple. */
function formatOklch(o: Oklcha): string {
  const l = o.l.toFixed(1);
  const c = o.c.toFixed(3);
  const h = o.h.toFixed(0);
  if (o.a >= 100) return `oklch(${l}% ${c} ${h})`;
  const a = (o.a / 100).toFixed(2);
  return `oklch(${l}% ${c} ${h} / ${a})`;
}

export default function PaletteReadout({ oklcha, cssVar, outOfGamut }: PaletteReadoutProps) {
  // Hex/RGB are the CLAMPED rendering of the raw value — oklchaToHex maps
  // through sRGB, so these notations show what the swatch actually paints.
  const hex = computed(() => oklchaToHex(oklcha.value));
  const rgb = computed(() => hexToRgbString(hex.value));
  const oklch = computed(() => formatOklch(oklcha.value));

  return (
    <div class="tokenpanel-palette-readout" data-testid="palette-readout">
      <div
        class="tokenpanel-palette-readout-swatch"
        style={computed(() => ({ background: hex.value }))}
        aria-hidden="true"
      />
      <div class="tokenpanel-palette-readout-rows">
        <div class="tokenpanel-palette-readout-row" data-testid="palette-readout-token">
          <span class="tokenpanel-palette-readout-key">token</span>
          <span class="tokenpanel-palette-readout-val">{cssVar}</span>
        </div>
        <div class="tokenpanel-palette-readout-row" data-testid="palette-readout-oklch">
          <span class="tokenpanel-palette-readout-key">OKLCH</span>
          <span class="tokenpanel-palette-readout-val">{oklch}</span>
        </div>
        <div class="tokenpanel-palette-readout-row" data-testid="palette-readout-hex">
          <span class="tokenpanel-palette-readout-key">Hex</span>
          <span class="tokenpanel-palette-readout-val">{hex}</span>
        </div>
        <div class="tokenpanel-palette-readout-row" data-testid="palette-readout-rgb">
          <span class="tokenpanel-palette-readout-key">RGB</span>
          <span class="tokenpanel-palette-readout-val">{rgb}</span>
        </div>
        <Show when={outOfGamut}>
          {() => (
            <div
              class="tokenpanel-palette-readout-gamut"
              data-testid="palette-readout-gamut"
            >
              out of sRGB gamut — Hex/RGB are clamped; the saved OKLCH is exact
            </div>
          )}
        </Show>
      </div>
    </div>
  );
}
