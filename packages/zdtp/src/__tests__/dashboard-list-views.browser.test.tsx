// @vitest-environment browser
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderToString } from 'preact-render-to-string';
import { TokenDashboard } from '../dashboard';
import type { TabConfig, TierItem } from '../tokens/tier-model';
// @ts-ignore — Vite supplies stylesheet text for browser verification.
import dashboardCss from '../dashboard/styles.css?inline';

const item = (id: string, value: string, color = false): TierItem => ({
  id, label: id, cssVar: `--view-${id}`, default: value, type: { kind: color ? 'color' : 'text' },
});
const tabs: TabConfig[] = [{ id: 'specimens', label: 'Specimens', tiers: [
  { id: 'space', label: 'Spacing', preview: 'bar', items: [
    item('zero', '0'), item('small', '16px'), item('rem', '2rem'), item('large', '1536px'),
    item('alias', 'var(--view-large)'), item('negative', '-8px'), item('percentage', '50%'),
  ] },
  { id: 'size', label: 'Size', preview: 'size', items: [item('size', '24px'), item('display', '96px')] },
  { id: 'leading', label: 'Leading', preview: 'line-height', previewBase: '--view-size', items: [item('leading', '1.8')] },
  { id: 'family', label: 'Family', preview: 'family', items: [item('family', 'serif')] },
  { id: 'weight', label: 'Weight', preview: 'weight', items: [item('weight', '700')] },
  { id: 'ramp', label: 'Ramp', items: [item('ramp-a', '#fff', true), item('ramp-b', '#888', true), item('ramp-c', '#000', true)] },
] }];
const text = 'Read several lines and compare the room between them. '.repeat(4)
  + '\n\n好きな文章で行間を確認します。\n<img src=x onerror=alert(1)> ' + 'UnbrokenWord'.repeat(25);
let host: HTMLDivElement;
let style: HTMLStyleElement;
let rootFontSize: string;

beforeEach(() => {
  rootFontSize = document.documentElement.style.fontSize;
  document.documentElement.style.fontSize = '16px';
  style = document.createElement('style');
  style.textContent = 'span { font-size:80px; margin:90px; padding:50px; color:red } :focus { outline:none }' + dashboardCss;
  document.head.append(style);
  host = document.createElement('div');
  host.style.width = '300px';
  host.innerHTML = renderToString(<TokenDashboard tabs={tabs} previewText={text} previewOverrides={{ '--view-ramp-b': 'text' }} />);
  document.body.append(host);
});
afterEach(() => {
  host.remove(); style.remove(); document.documentElement.style.fontSize = rootFontSize;
});
function sample(id: string, kind: string): HTMLElement {
  return host.querySelector(`[data-css-var="--view-${id}"] .zdtp-dashboard__sample--${kind}`)!;
}

describe('static dashboard list-view geometry', () => {
  it('preserves zero, large lengths and aliases inside a compact host without shrinking', () => {
    for (const [id, width] of [['zero', 0], ['small', 16], ['rem', 32], ['large', 1536], ['alias', 1536]] as const) {
      expect(sample(id, 'bar').getBoundingClientRect().width).toBe(width);
    }
    expect(sample('negative', 'bar')).toBeNull();
    expect(sample('percentage', 'bar')).toBeNull();
    document.documentElement.style.fontSize = '20px';
    expect(sample('rem', 'bar').getBoundingClientRect().width).toBe(40);
    expect(host.scrollWidth).toBe(host.clientWidth);
  });

  it('provides a named, focus-visible local scroll region for an oversized ruler', () => {
    const scroll = sample('large', 'bar').closest<HTMLElement>('[tabindex="0"]')!;
    expect(scroll.getAttribute('aria-label')).toBeTruthy();
    expect(scroll.scrollWidth).toBeGreaterThan(scroll.clientWidth);
    scroll.focus();
    expect(document.activeElement).toBe(scroll);
    expect(getComputedStyle(scroll).outlineStyle).not.toBe('none');
    scroll.scrollLeft = 256;
    expect(scroll.scrollLeft).toBe(256);
  });

  it('shows complete multiline specimens with the intended font property and base size', () => {
    expect(getComputedStyle(sample('size', 'size')).fontSize).toBe('24px');
    expect(getComputedStyle(sample('leading', 'line-height')).lineHeight).toBe('43.2px');
    expect(getComputedStyle(sample('family', 'family')).fontFamily).toBe('serif');
    expect(getComputedStyle(sample('weight', 'weight')).fontWeight).toBe('700');
    for (const [id, kind] of [['size', 'size'], ['display', 'size'], ['leading', 'line-height']]) {
      const el = sample(id, kind);
      expect(el.textContent).toBe(text);
      expect(el.getBoundingClientRect().height).toBeGreaterThan(88);
      expect(el.scrollHeight).toBeLessThanOrEqual(el.clientHeight + 1);
    }
    expect(host.querySelector('img, script')).toBeNull();
    expect(host.scrollWidth).toBe(host.clientWidth);
  });

  it('keeps overridden ramp stops in one ordered strip with readable metadata', () => {
    const strip = host.querySelector('.zdtp-dashboard__palette')!;
    expect([...strip.querySelectorAll('[data-css-var]')].map(el => el.getAttribute('data-css-var')))
      .toEqual(['--view-ramp-a', '--view-ramp-b', '--view-ramp-c']);
    const stops = [...strip.querySelectorAll<HTMLElement>('[role="listitem"]')];
    expect(new Set(stops.map(el => el.getBoundingClientRect().top)).size).toBe(1);
    expect(stops[1].textContent).toContain('#888');
    expect(stops[1].querySelector('.zdtp-dashboard__sample--color')).toBeNull();
  });
});
