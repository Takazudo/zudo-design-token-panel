// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'preact-render-to-string';
import { TokenDashboard, type DashboardPreviewKind, type TokenDashboardProps } from '../index';
import type { TabConfig, TierConfig, TierItem } from '../../tokens/tier-model';

function item(id: string, value: string, extra: Partial<TierItem> = {}): TierItem {
  return { id, label: id, cssVar: `--${id}`, default: value, type: { kind: 'text' }, ...extra };
}

function tabs(tiers: TierConfig[]): TabConfig[] {
  return [{ id: 'tokens', label: 'Tokens', tiers }];
}

function inventory(items: TierItem[], extra: Partial<TierConfig> = {}): TabConfig[] {
  return tabs([{ id: 'values', label: 'Values', items, ...extra }]);
}

function render(props: TokenDashboardProps) {
  const html = renderToString(<TokenDashboard {...props} />);
  const container = document.createElement('div');
  container.innerHTML = html;
  return { html, container };
}

describe('static TokenDashboard', () => {
  it('renders complete grouped defaults and generic fallback for every editor kind', () => {
    const kinds: TierItem['type'][] = [
      { kind: 'text' }, { kind: 'color' }, { kind: 'length', unit: 'px', step: 1 },
      { kind: 'number', step: 1 }, { kind: 'select', options: ['auto'] },
      { kind: 'cursor' }, { kind: 'content' }, { kind: 'mask-image' },
      { kind: 'future-editor' } as unknown as TierItem['type'],
    ];
    const data = inventory(kinds.map((type, index) => item(`token-${index}`, type.kind === 'color' ? '#123456' : 'auto', { type })));
    const { container } = render({ tabs: data });
    expect(container.querySelectorAll('[role="listitem"]')).toHaveLength(kinds.length);
    expect(container.querySelectorAll('[role="heading"]')).toHaveLength(3);
    expect(container.textContent).toContain('9 tokens');
    expect(container.textContent).toContain('Declared defaults · light mode');
    for (let index = 0; index < kinds.length; index++) {
      const card = container.querySelector(`[data-css-var="--token-${index}"]`)!;
      expect(card.querySelector('.zdtp-dashboard__value')?.textContent).toBe(index === 1 ? '#123456' : 'auto');
    }
    expect(container.querySelectorAll('.zdtp-dashboard__preview')).toHaveLength(1);
  });

  it('uses explicit tier previews and per-variable overrides without label heuristics', () => {
    const samples: [DashboardPreviewKind, string, string][] = [
      ['color', '#123456', 'background-color'], ['bar', '2rem', 'inline-size'],
      ['radius', '8px', 'border-radius'], ['shadow', '0 2px 4px #123', 'box-shadow'],
      ['size', '24px', 'font-size'], ['family', 'serif', 'font-family'],
      ['weight', '700', 'font-weight'], ['line-height', '1.6', 'line-height'],
    ];
    const data = inventory(samples.map(([kind, value]) => item(kind, value)));
    const overrides = Object.fromEntries(samples.map(([kind]) => [`--${kind}`, kind]));
    const { container } = render({ tabs: data, previewOverrides: overrides });
    for (const [kind, , property] of samples) {
      const sample = container.querySelector(`.zdtp-dashboard__sample--${kind}`)!;
      expect(sample.getAttribute('style')).toContain(`${property}:`);
    }
    const tierPreview = render({ tabs: inventory([item('spacing', '1rem'), item('duration', '100ms')], { preview: 'bar' }), previewOverrides: { '--duration': 'duration' } });
    expect(tierPreview.container.querySelectorAll('.zdtp-dashboard__sample--bar')).toHaveLength(1);
    expect(tierPreview.container.querySelector('[data-css-var="--duration"]')?.textContent).toContain('100ms');
    expect(render({ tabs: inventory([item('shadow', '0 2px 4px #123')]) }).container.querySelector('.zdtp-dashboard__preview')).toBeNull();
  });

  it('preserves declared reference readouts and scopes one complete graph to the inventory', () => {
    const data = tabs([
      { id: 'raw', label: 'Raw', items: [item('base', '#123', { type: { kind: 'color' } })] },
      { id: 'aliases', label: 'Aliases', referencesTier: 'raw', items: [item('alias', 'base', { type: { kind: 'color' } })] },
    ]);
    const { container } = render({ tabs: data, mode: 'dark' });
    const scope = container.querySelector('.zdtp-dashboard__inventory') as HTMLElement;
    expect(scope.style.getPropertyValue('--base')).toBe('#123');
    expect(scope.style.getPropertyValue('--alias')).toBe('var(--base)');
    expect(scope.style.colorScheme).toBe('dark');
    const root = container.firstElementChild!;
    expect(root.hasAttribute('style')).toBe(false);
    expect(container.querySelectorAll('[style*="--base:"]')).toHaveLength(1);
    const card = container.querySelector('[data-css-var="--alias"]')!;
    expect(card.querySelector('.zdtp-dashboard__value')?.textContent).toBe('base');
    expect(card.textContent).toContain('CSS: var(--base)');
    expect(card.textContent).toContain('References: --base');
    expect(document.documentElement.style.getPropertyValue('--base')).toBe('');
  });

  it('keeps auto pills and non-length values as text instead of misleading bars', () => {
    const data = inventory([
      item('auto', 'auto', { pill: { value: 'auto', customDefault: '20px' } }),
      item('duration', '100ms'), item('number', '12'), item('empty', ''),
      item('zero', '0'),
    ], { preview: 'bar' });
    const { container } = render({ tabs: data });
    expect(container.querySelectorAll('.zdtp-dashboard__sample--bar')).toHaveLength(1);
    expect(container.querySelector('[data-css-var="--auto"] .zdtp-dashboard__value')?.textContent).toBe('auto');
    expect(container.textContent).not.toContain('20px');
    expect(container.textContent).toContain('100ms');
  });

  it('shows diagnostics and no unreliable preview for missing, cyclic, or unsafe values', () => {
    const data = inventory([
      item('external', 'var(--outside, red)'), item('cycle', 'var(--cycle)'),
      item('unsafe', 'red;position:fixed'), item('asset', 'url(https://example.invalid/pixel)'),
      item('context', 'currentColor'),
    ], { preview: 'bar' });
    const { container } = render({ tabs: data });
    expect(container.querySelectorAll('[role="listitem"]')).toHaveLength(5);
    expect(container.querySelectorAll('.zdtp-dashboard__preview')).toHaveLength(0);
    expect(container.textContent).toContain('5 with diagnostics');
    for (const code of ['external-reference', 'cyclic-reference', 'unsafe-css', 'context-dependent']) {
      expect(container.querySelector(`[data-diagnostic="${code}"]`)).not.toBeNull();
    }
    const styles = [...container.querySelectorAll('[style]')].map((node) => node.getAttribute('style')).join('');
    expect(styles).not.toContain('position:fixed');
    expect(styles).not.toContain('example.invalid');
  });

  it('escapes labels, titles, CSS variable names and declaration text', () => {
    const hostile = '<img src=x onerror="alert(1)">&';
    const { container, html } = render({
      title: hostile,
      tabs: inventory([item('unsafe', hostile, { label: hostile, cssVar: `--bad"${hostile}` })], { label: hostile }),
    });
    expect(container.querySelector('img, script')).toBeNull();
    expect(container.querySelector('[onerror]')).toBeNull();
    expect(container.textContent).toContain(hostile);
    expect(html).toContain('&lt;img');
  });

  it('selects declared light/dark semantic values without initializing panel state', () => {
    const data = tabs([{ id: 'semantic', label: 'Semantic', semantic: true, items: [item('surface', '#fff', { type: { kind: 'color' } })] }]);
    data[0].colorExtras = {
      id: 'colors', baseRoles: {}, baseDefaults: {}, colorSchemes: {}, defaultShikiTheme: 'none',
      panelSettings: { colorMode: false, colorScheme: 'none' },
      semanticDefaults: { surface: { literal: { light: '#fafafa', dark: '#181818' } } },
    };
    expect(render({ tabs: data }).container.querySelector('.zdtp-dashboard__value')?.textContent).toBe('#fafafa');
    expect(render({ tabs: data, mode: 'dark' }).container.querySelector('.zdtp-dashboard__value')?.textContent).toBe('#181818');
  });

  it('has no generated IDs across siblings or separately rendered fragments', () => {
    const data = inventory([item('value', '1px')]);
    const siblings = renderToString(<><TokenDashboard tabs={data} /><TokenDashboard tabs={data} /></>);
    const separate = renderToString(<TokenDashboard tabs={data} />) + renderToString(<TokenDashboard tabs={data} />);
    for (const html of [siblings, separate]) {
      expect(html).not.toMatch(/\bid=/);
      expect(html).not.toMatch(/\baria-(?:labelledby|describedby)=/);
    }
    const explicit = renderToString(<TokenDashboard tabs={data} id="first" />) + renderToString(<TokenDashboard tabs={data} id="second" />);
    expect(explicit.match(/\bid="/g)).toHaveLength(2);
    expect(explicit).toContain('id="first"');
    expect(explicit).toContain('id="second"');
  });

  it('renders without browser globals and contains only inert div/span markup', () => {
    const data = inventory([item('color', '#123', { type: { kind: 'color' } })]);
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('document', undefined);
    vi.stubGlobal('localStorage', undefined);
    let html: string;
    try {
      html = renderToString(<TokenDashboard tabs={data} />);
    } finally {
      vi.unstubAllGlobals();
    }
    expect(html!).toContain('#123');
    const container = document.createElement('div');
    container.innerHTML = html!;
    expect([...container.querySelectorAll('*')].every((element) => ['DIV', 'SPAN'].includes(element.tagName))).toBe(true);
    expect(container.querySelector('[role="button"], a, script, style, img, input')).toBeNull();
  });

  it('uses a known safe line-height base and ignores unknown or malformed bases', () => {
    const data = tabs([
      { id: 'size', label: 'Size', items: [item('base', '20px')] },
      { id: 'height', label: 'Height', preview: 'line-height', previewBase: '--base', items: [item('height', '1.5')] },
    ]);
    const style = () => render({ tabs: data }).container.querySelector('.zdtp-dashboard__sample--line-height')?.getAttribute('style');
    expect(style()).toContain('font-size:var(--base)');
    data[0].tiers[1].previewBase = '--missing';
    expect(style()).not.toContain('font-size');
    data[0].tiers[1].previewBase = '--base);position:fixed';
    expect(style()).not.toContain('position');
  });

  it('renders an explicit empty inventory and omits notes-only content', () => {
    expect(render({ tabs: [] }).container.textContent).toContain('No tokens declared.');
    const notes = { id: 'notes', label: 'Notes', tiers: [] } as TabConfig;
    expect(render({ tabs: [notes] }).container.textContent).not.toContain('Notes');
  });
});

describe('token-specific list layouts', () => {
  it('keeps exact ruler lengths, including large lengths, zero, and direct local aliases', () => {
    const values = [item('zero', '0'), item('large', '1536px'), item('root', '2rem'), item('alias', 'var(--large)'), item('chain', 'var(--alias)')];
    const { container } = render({ tabs: inventory(values, { preview: 'bar' }) });
    expect([...container.querySelectorAll('.zdtp-dashboard__sample--bar')].map((node) => node.getAttribute('style')))
      .toEqual(['inline-size:0;', 'inline-size:1536px;', 'inline-size:2rem;', 'inline-size:1536px;', 'inline-size:1536px;']);
    expect(container.querySelectorAll('.zdtp-dashboard__ruler-scroll[tabindex="0"][aria-label]')).toHaveLength(5);
    expect(container.querySelector('[data-css-var="--chain"]')?.textContent).toContain('var(--alias)');
  });

  it('does not invent ruler geometry for negative, contextual or compound declarations', () => {
    const values = ['-1px', '10%', '2em', 'calc(8px + 8px)', 'var(--missing)', 'auto'];
    const { container } = render({ tabs: inventory(values.map((value, i) => item(`value-${i}`, value)), { preview: 'bar' }) });
    expect(container.querySelector('.zdtp-dashboard__sample--bar')).toBeNull();
    expect(container.querySelectorAll('.zdtp-dashboard__preview-unavailable')).toHaveLength(values.length);
    expect(container.querySelectorAll('[role="listitem"]')).toHaveLength(values.length);
  });

  it('groups structural palette stops without reordering overridden or invalid entries', () => {
    const color = (id: string, value: string) => item(id, value, { type: { kind: 'color' } });
    const { container } = render({ tabs: tabs([
      { id: 'ramp', label: 'Ramp', items: [color('first', '#fff'), color('invalid', 'var(--missing)'), color('last', '#123')] },
      { id: 'semantic', label: 'Semantic', semantic: true, items: [color('semantic', '#eee')] },
      { id: 'ref', label: 'Ref', referencesTier: 'ramp', items: [color('reference', 'first')] },
    ]), previewOverrides: { '--first': 'text' } });
    expect(container.querySelectorAll('.zdtp-dashboard__palette')).toHaveLength(1);
    expect([...container.querySelectorAll('.zdtp-dashboard__palette [data-css-var]')].map((node) => node.getAttribute('data-css-var'))).toEqual(['--first', '--invalid', '--last']);
    expect(container.querySelector('[data-css-var="--first"] .zdtp-dashboard__sample')).toBeNull();
    expect(container.querySelector('[data-css-var="--invalid"] [data-diagnostic]')).not.toBeNull();
    expect(container.querySelectorAll('[role="listitem"]')).toHaveLength(5);
  });

  it('uses wide multiline typography with escaped custom and explicitly empty text', () => {
    const data = inventory([item('size', '24px')], { preview: 'size' });
    const defaults = render({ tabs: data }).container;
    expect(defaults.querySelector('.zdtp-dashboard__token--wide')).not.toBeNull();
    expect(defaults.querySelector('.zdtp-dashboard__sample--size')?.textContent).toContain('\n\n読みやすさ');
    const text = '<script>alert(1)</script>\n\n長い文章   preserved spaces';
    const custom = render({ tabs: data, previewText: text }).container;
    expect(custom.querySelector('script')).toBeNull();
    expect(custom.querySelector('.zdtp-dashboard__sample--size')?.textContent).toBe(text);
    expect(custom.querySelector('.zdtp-dashboard__preview--typography[tabindex="0"][aria-label]')).not.toBeNull();
    expect(render({ tabs: data, previewText: '' }).container.querySelector('.zdtp-dashboard__sample--size')?.textContent).toBe('');
  });
});
