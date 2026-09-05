/**
 * VRT — the four persisted shell modes against light and dark host pages.
 *
 * The Playwright config runs every case in both colour-scheme projects, giving
 * the Wave-3 confirmation matrix: float / right / bottom / mini × light / dark.
 */

import { expect, test } from '@playwright/test';
import { buildPage } from './fixture-helpers';

type DockMode = 'float' | 'right' | 'bottom' | 'mini';

const SEARCH_ICON = `
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <circle cx="6" cy="6" r="4" fill="none" stroke="currentColor"/>
    <path d="M9 9l3 3" fill="none" stroke="currentColor"/>
  </svg>`;

function shellFixture(mode: Exclude<DockMode, 'mini'>): string {
  const modifier = mode === 'float' ? '' : ` is-docked-${mode}`;
  const style = mode === 'float'
    ? 'position:fixed;left:84px;top:52px;width:520px;height:480px'
    : mode === 'right'
      ? 'position:fixed;right:0;top:0;width:440px;height:600px'
      : 'position:fixed;left:0;bottom:0;width:800px;height:340px';

  return `
    <div class="tokenpanel-shell${modifier}" style="${style};font-family:Menlo,Monaco,Consolas,'Courier New',monospace">
      <div class="tokenpanel-header">
        <span class="tokenpanel-title">zdtp</span>
        <div class="tokenpanel-search-control">
          <span class="tokenpanel-search-glyph">${SEARCH_ICON}</span>
          <input class="tokenpanel-search-input" value="spacing" aria-label="Filter tokens" />
          <span class="tokenpanel-search-key">⌘K</span>
        </div>
        <div class="tokenpanel-spacer"></div>
        <div class="tokenpanel-history-controls" role="group" aria-label="History controls">
          <div class="tokenpanel-history-button" role="button" aria-label="Undo">↶</div>
          <span class="tokenpanel-history-count">2/2</span>
        </div>
        <div class="tokenpanel-close-btn" role="button" aria-label="Close panel">×</div>
      </div>
      <div class="tokenpanel-tabbar">
        <div class="tokenpanel-tabbar-tabs">
          <div class="tokenpanel-tab-button" role="tab">Color <span class="tokenpanel-changed-tab-badge">1</span></div>
          <div class="tokenpanel-tab-button is-active" role="tab" aria-selected="true">Spacing <span class="tokenpanel-changed-tab-badge">2</span></div>
          <div class="tokenpanel-tab-button" role="tab">Font</div>
          <div class="tokenpanel-tab-button" role="tab">Size</div>
        </div>
      </div>
      <div class="tokenpanel-body">
        <div class="tokenpanel-search-matchbar"><span class="tokenpanel-search-match-count">4</span> of 4 tokens</div>
        <div class="tokenpanel-tab-section">
          <div class="tokenpanel-tab-section-heading" role="heading" aria-level="3">Horizontal spacing</div>
          <div class="tokenpanel-row tokenpanel-row--bulk-selected">
            <input class="tokenpanel-bulk-checkbox" type="checkbox" checked />
            <span class="tokenpanel-label">--zfb-hsp-md</span>
            <span class="tokenpanel-bulk-preview">1rem <span class="tokenpanel-bulk-preview-arrow">→</span> <span class="tokenpanel-bulk-preview-new">1.1rem</span></span>
          </div>
        </div>
        <div class="tokenpanel-bulk-action-bar">
          <span class="tokenpanel-bulk-selection-count">3 selected</span>
          <label class="tokenpanel-bulk-operation">× <input class="tokenpanel-bulk-number-input is-active" value="1.1" /></label>
          <div class="tokenpanel-bulk-apply" role="button">Apply to selection</div>
        </div>
      </div>
      <div class="tokenpanel-footer">
        <div class="tokenpanel-changed-footer-content">
          <span class="tokenpanel-changed-summary"><span class="tokenpanel-changed-summary-count">3</span> tokens changed across <span class="tokenpanel-changed-summary-count">1</span> tab</span>
          <span class="tokenpanel-changed-footer-spacer"></span>
          <div class="tokenpanel-action-link tokenpanel-changed-copy" role="button">Copy diff</div>
          <div class="tokenpanel-action-link tokenpanel-changed-revert-all" role="button">Revert all</div>
        </div>
      </div>
      <div class="${mode === 'float' ? 'tokenpanel-resize-handle' : `tokenpanel-dock-resize-handle is-${mode}`}"></div>
    </div>`;
}

function miniFixture(): string {
  return `
    <div class="tokenpanel-mini-pill" style="font-family:Menlo,Monaco,Consolas,'Courier New',monospace">
      <span class="tokenpanel-mini-pill-brand">zdtp</span>
      <span class="tokenpanel-mini-pill-changed-count">3</span>
      <span class="tokenpanel-mini-pill-changes">changes</span>
      <span class="tokenpanel-mini-pill-divider"></span>
      <span class="tokenpanel-mini-pill-undo">↶</span>
      <div class="tokenpanel-mini-pill-apply" role="button">Apply</div>
      <div class="tokenpanel-mini-pill-expand" role="button" aria-label="Expand panel">${SEARCH_ICON}</div>
    </div>`;
}

for (const mode of ['float', 'right', 'bottom', 'mini'] as const) {
  test(`dock-${mode}`, async ({ page }) => {
    await page.setContent(buildPage(mode === 'mini' ? miniFixture() : shellFixture(mode)));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => document.fonts.ready);

    const target = page.locator(mode === 'mini' ? '.tokenpanel-mini-pill' : '.tokenpanel-shell');
    await expect(target).toHaveScreenshot(`dock-${mode}.png`);
  });
}
