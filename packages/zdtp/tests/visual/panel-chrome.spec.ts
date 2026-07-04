/**
 * VRT — panel chrome (shell + header + tab bar).
 *
 * Captures the outer panel frame at a fixed 320×360px size. Regressions in:
 *   - Shell border / background / border-radius / box-shadow
 *   - Header layout (title text + close button)
 *   - Tab bar layout (active / inactive tab visual states)
 *   - Font rendering for panel text
 *
 * Both light and dark project runs are committed as separate baselines, so
 * the panel chrome is gated against both host-background contexts.
 */

import { test, expect } from '@playwright/test';
import { buildPage } from './fixture-helpers';

// ---------------------------------------------------------------------------
// Static fixture HTML — deterministic representation of the panel shell
// ---------------------------------------------------------------------------

// Palette of chars chosen to avoid variable-width glyphs in any monospace
// fallback. Close button uses × (U+00D7 MULTIPLICATION SIGN).
const PANEL_CHROME_HTML = `
<div class="tokenpanel-shell"
     style="width:320px; height:360px; font-family: Menlo, Monaco, Consolas, 'Courier New', monospace; position:relative;">

  <!-- Header: title + spacer + close btn -->
  <div class="tokenpanel-header">
    <span class="tokenpanel-title">Design Tokens</span>
    <div class="tokenpanel-spacer"></div>
    <div class="tokenpanel-close-btn" role="button" tabindex="0" aria-label="Close panel">
      <!-- × glyph; SVG path drawn with currentColor so fill defensive reset applies -->
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" stroke-width="1.5"
              stroke-linecap="round" fill="none"/>
      </svg>
    </div>
  </div>

  <!-- Tab bar: Color active, three inactive tabs -->
  <div class="tokenpanel-tabbar">
    <div class="tokenpanel-tabbar-tabs">
      <div class="tokenpanel-tab-button is-active" role="tab" aria-selected="true"  tabindex="0">Color</div>
      <div class="tokenpanel-tab-button"           role="tab" aria-selected="false" tabindex="-1">Spacing</div>
      <div class="tokenpanel-tab-button"           role="tab" aria-selected="false" tabindex="-1">Font</div>
      <div class="tokenpanel-tab-button"           role="tab" aria-selected="false" tabindex="-1">Size</div>
    </div>
  </div>

  <!-- Body: empty (chrome-only snapshot) -->
  <div class="tokenpanel-body"></div>
</div>
`.trim();

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

test('panel-chrome', async ({ page }) => {
  await page.setContent(buildPage(PANEL_CHROME_HTML));

  // Belt-and-braces animation suppression (playwright.config.ts also sets
  // animations: 'disabled', but explicit emulation ensures prefers-reduced-motion
  // media query also fires, covering CSS transition rules gated on it).
  await page.emulateMedia({ reducedMotion: 'reduce' });

  // Wait for fonts to settle before snapping (avoids FOUT-caused layout drift).
  await page.evaluate(() => document.fonts.ready);

  await expect(page.locator('.tokenpanel-shell')).toHaveScreenshot(
    'panel-chrome.png',
  );
});
