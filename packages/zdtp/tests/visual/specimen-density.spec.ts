import { expect, test } from '@playwright/test';
import { buildPage } from './fixture-helpers';

const icon = (className: string, label: string) => `
  <div class="${className}" role="button" tabindex="0" aria-label="${label}">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4 12h16M12 4v16" />
    </svg>
  </div>`;

const numericRow = (
  id: string,
  cssVar: string,
  value: string,
  px: string,
  size: string,
) => `
  <div class="tokenpanel-row--stacked tokenpanel-row--specimen-size" data-address="font/scale/${id}">
    <div class="tokenpanel-row-head">
      <input type="checkbox" class="tokenpanel-bulk-checkbox tokenpanel-bulk-row-checkbox" aria-label="Select ${id}">
      <span class="tokenpanel-specimen-size-leading">
        <span class="tokenpanel-specimen-meta"><span>${cssVar}</span><span>${id} · ${px}</span></span>
        <span class="tokenpanel-specimen-size-text" style="font-size:${size}">銀河鉄道の夜を旅する活字見本です</span>
      </span>
      <span class="tokenpanel-row-label">${id}</span>
      <div class="tokenpanel-row-input-group"><input class="tokenpanel-row-number-input" value="${value}"><span class="tokenpanel-row-unit">rem</span></div>
      ${icon('tokenpanel-chain-button', `Show chain for ${id}`)}
      ${icon('tokenpanel-highlight-toggle', `Highlight ${id}`)}
    </div>
  </div>`;

const lineHeightRow = (id: string, value: string, linePx: string) => `
  <div class="tokenpanel-row--stacked tokenpanel-row--specimen-line-height" data-address="font/leading/${id}">
    <div class="tokenpanel-row-head">
      <input type="checkbox" class="tokenpanel-bulk-checkbox tokenpanel-bulk-row-checkbox" aria-label="Select ${id}">
      <span class="tokenpanel-specimen-line-height-leading">
        <span class="tokenpanel-specimen-meta"><span>--spec-${id}</span><span>${id} · ${linePx} line at 16px</span></span>
        <span class="tokenpanel-specimen-line-height-text" style="font-size:16px;line-height:${value};width:min(420px, 100%);--tokenpanel-specimen-line:${linePx}">銀河鉄道の夜を旅する活字見本です 銀河鉄道の夜を旅する活字見本です</span>
      </span>
      <span class="tokenpanel-row-label">${id}</span>
      <div class="tokenpanel-row-input-group"><input class="tokenpanel-row-number-input" value="${value}"></div>
      ${icon('tokenpanel-chain-button', `Show chain for ${id}`)}
      ${icon('tokenpanel-highlight-toggle', `Highlight ${id}`)}
    </div>
  </div>`;

const FIXTURE = `
<div class="tokenpanel-shell" style="position:relative;width:700px;--tokenpanel-grid-min:192px">
  <div class="tokenpanel-body" style="padding:16px">
    <div class="tokenpanel-tab-content">
      <div class="tokenpanel-tab-section">
        <div role="heading" aria-level="3" class="tokenpanel-tab-section-heading">Font scale</div>
        <div class="tokenpanel-tab-grid tokenpanel-tab-grid--specimen">
          ${numericRow('xs', '--spec-xs', '0.75', '12px', '12px')}
          ${numericRow('base', '--spec-base', '1', '16px', '16px')}
          ${numericRow('xl', '--spec-xl', '2.5', '40px', '40px')}
        </div>
      </div>
      <div class="tokenpanel-tab-section">
        <div role="heading" aria-level="3" class="tokenpanel-tab-section-heading">Line height</div>
        <div class="tokenpanel-tab-grid tokenpanel-tab-grid--specimen">
          ${lineHeightRow('tight', '1.2', '19.2px')}
          ${lineHeightRow('relaxed', '1.8', '28.8px')}
        </div>
      </div>
    </div>
  </div>
</div>`.trim();

test('specimen-density', async ({ page }) => {
  await page.setContent(buildPage(FIXTURE));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.tokenpanel-shell')).toHaveScreenshot('specimen-density.png');
});
