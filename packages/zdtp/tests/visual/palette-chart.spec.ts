/**
 * VRT — palette chart (OKLCH L/C/H SVG curve editor).
 *
 * The palette chart is a rendered-image surface: layered SVGs where the visual
 * output (color bands + L/C/H curves + node markers) is the product. No single
 * CSS computed-style assertion can stand in for "the curve is in the right
 * place"; a pixel-diff baseline is the only regression net that catches a
 * shifted curve or a wrong node position.
 *
 * Fixture: 3-color palette at pinned OKLCH values, all 3 channels visible,
 * color 1 (index=1) selected. Static SVG — no Preact runtime needed.
 *
 * Pinned colors (computed via culori, deterministic):
 *   Color 0: oklch(0.80, 0.12,  50) → #fca676  (warm orange)
 *   Color 1: oklch(0.55, 0.20, 270) → #4761e4  (cool purple, selected)
 *   Color 2: oklch(0.70, 0.15, 150) → #4cb86a  (cool green)
 *
 * SVG geometry (VIEW_W=300, VIEW_H=200, 3 bands):
 *   stepX(i, 3) = (i + 0.5) / 3 × 300  → 50, 150, 250
 *   valueToY_L(v)   = (1 - v/100)  × 200
 *   valueToY_C(v)   = (1 - v/0.37) × 200   (MAX_OKLCH_CHROMA = 0.37)
 *   valueToY_H(v)   = (1 - v/360)  × 200
 *
 *   Container size: 600×280 px  → scaleX=2, scaleY=1.4
 *   nodeRx = NODE_R_VISUAL_PX (4) / scaleX = 2.00
 *   nodeRy = NODE_R_VISUAL_PX (4) / scaleY ≈ 2.86
 *
 * L curve points:  "50.00,40.00 150.00,90.00 250.00,60.00"
 * C curve points:  "50.00,135.14 150.00,91.89 250.00,118.92"
 * H curve points:  "50.00,172.22 150.00,50.00 250.00,116.67"
 */

import { test, expect } from '@playwright/test';
import { buildPage } from './fixture-helpers';

// ---------------------------------------------------------------------------
// Pre-computed SVG constants
// ---------------------------------------------------------------------------

// Curve polyline points (pre-computed from palette-curve.ts math, see header)
const L_POINTS = '50.00,40.00 150.00,90.00 250.00,60.00';
const C_POINTS = '50.00,135.14 150.00,91.89 250.00,118.92';
const H_POINTS = '50.00,172.22 150.00,50.00 250.00,116.67';

// Node ellipse radii counter-scaled to produce a true 4px-radius circle
// when the 300×200 SVG viewBox is rendered at 600×280 px.
const NODE_RX = '2.00';
const NODE_RY = '2.86';

// Hex fills (pinned colors, see header)
const COLOR_0_HEX = '#fca676'; // warm orange — unselected (opacity 0.82)
const COLOR_1_HEX = '#4761e4'; // cool purple — selected  (opacity 1)
const COLOR_2_HEX = '#4cb86a'; // cool green  — unselected (opacity 0.82)

// Channel step x positions
const X = [50, 150, 250];

// Node y positions per channel
const L_Y = [40.0, 90.0, 60.0];
const C_Y = [135.14, 91.89, 118.92];
const H_Y = [172.22, 50.0, 116.67];

// ---------------------------------------------------------------------------
// Build a static SVG channel-curve overlay
// ---------------------------------------------------------------------------

function buildCurveLayer(
  channel: 'l' | 'c' | 'h',
  points: string,
  ys: number[],
  selectedIdx: number,
): string {
  const nodes = X.map((x, i) => {
    const y = ys[i];
    const isSelected = i === selectedIdx;
    const strokeW = isSelected ? 3 : 2;
    return `
      <g data-node-index="${i}">
        <!-- Visual node (non-interactive) -->
        <ellipse
          class="tokenpanel-palette-chart-node-visual"
          cx="${x}" cy="${y.toFixed(2)}"
          rx="${NODE_RX}" ry="${NODE_RY}"
          stroke-width="${strokeW}"
          vector-effect="non-scaling-stroke"
          aria-hidden="true"
          pointer-events="none"
        />
        <!-- Hit area (keyboard-operable slider) -->
        <circle
          class="tokenpanel-palette-chart-node-hit"
          cx="${x}" cy="${y.toFixed(2)}"
          r="11"
          fill="transparent"
          tabindex="0"
          role="slider"
          aria-label="${channel.toUpperCase()} of color ${i + 1}"
          aria-valuemin="0"
          aria-valuenow="${y.toFixed(2)}"
          data-channel="${channel}"
          data-node-hit="${i}"
        />
      </g>`;
  }).join('');

  return `
    <svg
      class="tokenpanel-palette-chart-curve tokenpanel-palette-chart-curve--${channel}"
      viewBox="0 0 300 200"
      preserveAspectRatio="none"
      role="presentation"
      data-testid="palette-chart-curve-${channel}"
      data-channel="${channel}"
    >
      <!-- Transparent hit-line beneath the visible curve (whole-curve drag area) -->
      <polyline
        class="tokenpanel-palette-chart-hit-line"
        points="${points}"
        fill="none"
        stroke="transparent"
        stroke-width="16"
        stroke-linejoin="round"
        stroke-linecap="round"
        vector-effect="non-scaling-stroke"
        data-hit-line="${channel}"
      />
      <!-- Visible curve line -->
      <polyline
        class="tokenpanel-palette-chart-line"
        points="${points}"
        fill="none"
        stroke-width="2"
        vector-effect="non-scaling-stroke"
        pointer-events="none"
      />
      ${nodes}
    </svg>`;
}

// ---------------------------------------------------------------------------
// Full palette chart fixture HTML
// ---------------------------------------------------------------------------

// selectedIndex = 1 (Color 1 / cool purple)
const SELECTED_IDX = 1;

const PALETTE_CHART_HTML = `
<div class="tokenpanel-shell"
     style="width:640px; padding:12px; font-family: Menlo, Monaco, Consolas, 'Courier New', monospace;">

  <!-- Palette chart container at fixed 600×280 px -->
  <div class="tokenpanel-palette-chart"
       style="width:600px; height:280px;"
       data-testid="palette-chart">

    <!-- Background bands layer — one rect per color -->
    <svg
      class="tokenpanel-palette-chart-bands"
      viewBox="0 0 300 200"
      preserveAspectRatio="none"
      role="presentation"
      data-testid="palette-chart-bands"
    >
      <rect x="0"   y="0" width="100" height="200" fill="${COLOR_0_HEX}"
            data-band-index="0" opacity="0.82"/>
      <rect x="100" y="0" width="100" height="200" fill="${COLOR_1_HEX}"
            data-band-index="1" opacity="1"/>
      <rect x="200" y="0" width="100" height="200" fill="${COLOR_2_HEX}"
            data-band-index="2" opacity="0.82"/>
    </svg>

    <!-- L channel curve -->
    ${buildCurveLayer('l', L_POINTS, L_Y, SELECTED_IDX)}

    <!-- C channel curve -->
    ${buildCurveLayer('c', C_POINTS, C_Y, SELECTED_IDX)}

    <!-- H channel curve -->
    ${buildCurveLayer('h', H_POINTS, H_Y, SELECTED_IDX)}

  </div>
</div>
`.trim();

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

test('palette-chart', async ({ page }) => {
  await page.setContent(buildPage(PALETTE_CHART_HTML));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => document.fonts.ready);

  await expect(page.locator('.tokenpanel-palette-chart')).toHaveScreenshot(
    'palette-chart.png',
  );
});
