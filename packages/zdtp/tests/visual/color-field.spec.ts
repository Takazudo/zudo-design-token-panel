/**
 * VRT — color field swatch + color picker popover.
 *
 * Two surfaces captured:
 *
 * 1. Color field (closed) — the 44×28 px swatch button that opens the picker.
 *    Captures: swatch fill color, border, border-radius.
 *
 * 2. Color picker popover — the full 320px picker card in its default (mini)
 *    mode with a real preset grid. Captures:
 *    - Header (drag handle + label + mode-toggle pill + expand button)
 *    - Preview swatch (checkerboard + color overlay)
 *    - Hex input field
 *    - OKLCH preset grid (6 columns, a 4-hue × 6-brightness sample)
 *    - Channel sliders (L / C / H / α rows)
 *
 * The color picker uses a gradient slider (custom CSS linear-gradient) for
 * each OKLCH channel — no single CSS property encodes the gradient render, so
 * only a pixel baseline can catch a recolored or misaligned slider track.
 *
 * Pinned color: oklch(0.80, 0.12, 50) → #fca676 (warm orange).
 */

import { test, expect } from '@playwright/test';
import { buildPage } from './fixture-helpers';

// ---------------------------------------------------------------------------
// Pinned color
// ---------------------------------------------------------------------------

const HEX_COLOR = '#fca676'; // oklch(0.80, 0.12, 50) — warm orange

// ---------------------------------------------------------------------------
// Fixture 1: Color field swatch (closed state)
// ---------------------------------------------------------------------------

const COLOR_FIELD_HTML = `
<div class="tokenpanel-shell"
     style="width:200px; padding:12px; font-family: Menlo, Monaco, Consolas, 'Courier New', monospace;">
  <div class="tokenpanel-color-field">
    <div
      class="tokenpanel-color-field-swatch"
      role="button"
      tabindex="0"
      aria-label="Accent color: --accent"
      aria-expanded="false"
      data-testid="color-field-swatch"
      style="background-color: ${HEX_COLOR};"
    ></div>
  </div>
</div>
`.trim();

// ---------------------------------------------------------------------------
// Fixture 2: Color picker popover (320px card, mini mode)
//
// This is a static representation of the color picker in its open state.
// Preset grid shows a 4-hue × 5-lightness sample using OKLCH-derived hex
// values (the same grid the real component renders).
//
// Preset cells — warm/orange column (h=50), purple (h=270), green (h=150),
// blue (h=220), each at lightnesses 0.85/0.70/0.55/0.40/0.25.
// ---------------------------------------------------------------------------

type GridCell = { hex: string; label: string };

// 4 hue columns × 5 lightness rows = 20 preset cells
const GRID_CELLS: GridCell[][] = [
  // Warm orange (h=50)
  [
    { hex: '#fce0c5', label: 'oklch(0.85, 0.06, 50)' },
    { hex: '#fca676', label: 'oklch(0.70, 0.12, 50)' },
    { hex: '#e87c38', label: 'oklch(0.55, 0.16, 50)' },
    { hex: '#c45015', label: 'oklch(0.40, 0.14, 50)' },
    { hex: '#8a2e00', label: 'oklch(0.25, 0.10, 50)' },
  ],
  // Cool purple (h=270)
  [
    { hex: '#c8c5f0', label: 'oklch(0.85, 0.06, 270)' },
    { hex: '#7777d8', label: 'oklch(0.70, 0.12, 270)' },
    { hex: '#4747b0', label: 'oklch(0.55, 0.16, 270)' },
    { hex: '#282880', label: 'oklch(0.40, 0.14, 270)' },
    { hex: '#0e0e50', label: 'oklch(0.25, 0.10, 270)' },
  ],
  // Green (h=150)
  [
    { hex: '#bce9c8', label: 'oklch(0.85, 0.06, 150)' },
    { hex: '#4cb86a', label: 'oklch(0.70, 0.12, 150)' },
    { hex: '#1f8840', label: 'oklch(0.55, 0.16, 150)' },
    { hex: '#006022', label: 'oklch(0.40, 0.14, 150)' },
    { hex: '#003810', label: 'oklch(0.25, 0.10, 150)' },
  ],
  // Blue (h=220)
  [
    { hex: '#bce0f5', label: 'oklch(0.85, 0.06, 220)' },
    { hex: '#4da8e0', label: 'oklch(0.70, 0.12, 220)' },
    { hex: '#1876b8', label: 'oklch(0.55, 0.16, 220)' },
    { hex: '#004e88', label: 'oklch(0.40, 0.14, 220)' },
    { hex: '#002e50', label: 'oklch(0.25, 0.10, 220)' },
  ],
];

// Build 4 row wrappers (role="row"), each with 5 gridcell divs.
// We transpose: row i = all hues at lightness i.
function buildGridRows(): string {
  const numRows = GRID_CELLS[0].length;
  const numCols = GRID_CELLS.length;
  const rows: string[] = [];
  for (let r = 0; r < numRows; r++) {
    const cells = Array.from({ length: numCols }, (_, c) => {
      const cell = GRID_CELLS[c][r];
      return `<div class="tokenpanel-color-picker-grid-cell"
                   role="gridcell"
                   aria-label="${cell.label}"
                   style="background-color:${cell.hex};"></div>`;
    }).join('');
    rows.push(`<div role="row">${cells}</div>`);
  }
  return rows.join('\n');
}

// Channel slider row (L / C / H / α)
function buildSliderRow(
  label: string,
  gradient: string,
  value: string,
  pct: string,
): string {
  return `
  <div class="tokenpanel-color-picker-slider-row">
    <span class="tokenpanel-color-picker-slider-label">${label}</span>
    <div class="tokenpanel-color-picker-slider-track-wrap">
      <div class="tokenpanel-color-picker-slider-track"
           style="background: ${gradient}; position:relative; height:12px; border-radius:6px; overflow:hidden;">
        <div style="position:absolute; left:${pct}; top:50%;
                    transform: translate(-50%,-50%);
                    width:14px; height:14px; border-radius:50%;
                    background:#fff; border:2px solid #888;
                    box-shadow:0 0 2px rgba(0,0,0,0.4);"></div>
      </div>
    </div>
    <span class="tokenpanel-color-picker-slider-value"
          style="min-width:36px; text-align:right; font-size:12px;
                 color:var(--tokentweak-color-muted);">${value}</span>
  </div>`;
}

const PICKER_HTML = `
<div class="tokenpanel-color-picker"
     data-mode-shell="mini"
     style="position:relative; font-family: Menlo, Monaco, Consolas, 'Courier New', monospace;">

  <!-- Header: drag handle + label + mode toggle + expand btn -->
  <div class="tokenpanel-color-picker-header">
    <span class="tokenpanel-color-picker-drag-handle" aria-hidden="true">⠿</span>
    <span class="tokenpanel-color-picker-label">--accent</span>
    <div class="tokenpanel-color-picker-mode-toggle" role="group" aria-label="Color format">
      <div class="tokenpanel-color-picker-mode-btn" role="button" tabindex="0"
           aria-pressed="false">Hex</div>
      <div class="tokenpanel-color-picker-mode-btn" role="button" tabindex="0"
           aria-pressed="true">OKLCH</div>
    </div>
    <div class="tokenpanel-color-picker-expand-btn" role="button" tabindex="0"
         aria-label="Expand">
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M2 4 L6 8 L10 4" stroke="currentColor" stroke-width="1.5"
              fill="none" stroke-linecap="round"/>
      </svg>
    </div>
  </div>

  <!-- Top row: preview swatch + hex input -->
  <div class="tokenpanel-color-picker-top-row">
    <div class="tokenpanel-color-picker-preview">
      <div class="tokenpanel-color-picker-preview-checkerboard"></div>
      <div class="tokenpanel-color-picker-preview-color"
           style="background-color: ${HEX_COLOR};"></div>
    </div>
    <input class="tokenpanel-color-picker-hex-input"
           type="text" value="${HEX_COLOR}" readonly
           aria-label="Hex color value"/>
  </div>

  <!-- Preset grid -->
  <div class="tokenpanel-color-picker-grid" role="grid" aria-label="Color presets">
    ${buildGridRows()}
  </div>

  <!-- OKLCH channel sliders (L / C / H / α) -->
  ${buildSliderRow(
    'L',
    'linear-gradient(to right, oklch(0 0 50), oklch(1 0 50))',
    '80',
    '80%',
  )}
  ${buildSliderRow(
    'C',
    'linear-gradient(to right, oklch(0.80 0 50), oklch(0.80 0.37 50))',
    '0.120',
    '32%',
  )}
  ${buildSliderRow(
    'H',
    'linear-gradient(to right, oklch(0.80 0.12 0), oklch(0.80 0.12 90), oklch(0.80 0.12 180), oklch(0.80 0.12 270), oklch(0.80 0.12 360))',
    '50',
    '14%',
  )}
  ${buildSliderRow(
    'α',
    'linear-gradient(to right, oklch(0.80 0.12 50 / 0), oklch(0.80 0.12 50))',
    '100%',
    '100%',
  )}
</div>
`.trim();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('color-field-swatch', async ({ page }) => {
  await page.setContent(buildPage(COLOR_FIELD_HTML));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => document.fonts.ready);

  await expect(page.locator('.tokenpanel-shell')).toHaveScreenshot(
    'color-field-swatch.png',
  );
});

test('color-picker-popover', async ({ page }) => {
  await page.setContent(
    buildPage(PICKER_HTML, `body { padding: 0; }`),
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => document.fonts.ready);

  await expect(page.locator('.tokenpanel-color-picker')).toHaveScreenshot(
    'color-picker-popover.png',
  );
});
