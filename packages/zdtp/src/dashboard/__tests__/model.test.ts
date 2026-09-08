import { describe, expect, it, vi } from 'vitest';
import { buildDashboardModel } from '../model';
import type { ColorClusterExtras, TabConfig, TierConfig, TierItem } from '../../tokens/tier-model';

function item(id: string, value: string, extra: Partial<TierItem> = {}): TierItem {
  return { id, cssVar: `--${id}`, label: id, default: value, type: { kind: 'text' }, ...extra };
}

function tier(id: string, items: TierItem[], extra: Partial<TierConfig> = {}): TierConfig {
  return { id, label: id, items, ...extra };
}

function tab(tiers: TierConfig[], extra: Partial<TabConfig> = {}): TabConfig {
  return { id: 'tokens', label: 'Tokens', tiers, ...extra };
}

function extras(extra: Partial<ColorClusterExtras> = {}): ColorClusterExtras {
  return {
    id: 'test', baseRoles: {}, baseDefaults: {}, defaultShikiTheme: 'default', colorSchemes: {},
    panelSettings: { colorMode: false, colorScheme: 'default' }, ...extra,
  };
}

function byVar(tabs: TabConfig[], cssVar: string) {
  return buildDashboardModel(tabs).rows.find((row) => row.cssVar === cssVar)!;
}

const palette = tier('palette', [
  item('paper', '#fff', { cssVar: '--custom-paper', type: { kind: 'color' } }),
  item('ink', '#123', { cssVar: '--ink-900', type: { kind: 'color' } }),
]);

describe('declared dashboard defaults', () => {
  it('preserves input order, labels, previews, every editor kind, and unknown literal CSS', () => {
    const tabs = [tab([
      tier('sizes', [item('medium', '2.5rem', { type: { kind: 'length', step: 1, unit: 'rem' } })], { preview: 'size', previewBase: '--medium' }),
      tier('other', [item('future', 'future-color(123)', { type: { kind: 'future-editor' } as unknown as TierItem['type'] }), item('content', '"<b>&"', { type: { kind: 'content' } })]),
    ], { label: '<Tokens & examples>' }), tab([], { id: 'empty', label: 'Empty' })];
    const snapshot = JSON.stringify(tabs);
    const model = buildDashboardModel(tabs);
    expect(model.mode).toBe('light');
    expect(model.tabs.map((entry) => entry.id)).toEqual(['tokens', 'empty']);
    expect(model.rows.map((row) => row.itemId)).toEqual(['medium', 'future', 'content']);
    expect(model.tabs[0].label).toBe('<Tokens & examples>');
    expect(model.tabs[0].tiers[0]).toMatchObject({ preview: 'size', previewBase: '--medium' });
    expect(model.rows[1]).toMatchObject({ kind: 'future-editor', declaredValue: 'future-color(123)', cssValue: 'future-color(123)' });
    expect(JSON.stringify(tabs)).toBe(snapshot);
  });

  it('preserves the declared pill default instead of the editor customDefault', () => {
    const row = byVar([tab([tier('values', [item('width', 'auto', { pill: { value: 'auto', customDefault: '20px' } })])])], '--width');
    expect(row).toMatchObject({ defaultValue: 'auto', declaredValue: 'auto', cssValue: 'auto', resolvedValue: 'auto' });
  });

  it('follows declared reference chains without same-id or first-item fallback', () => {
    const tabs = [tab([
      tier('raw', [item('first', '1px'), item('large', '40px')]),
      tier('aliases', [item('first', 'large', { cssVar: '--alias' }), item('bad', 'missing')], { referencesTier: 'raw' }),
      tier('uses', [item('button', 'first')], { referencesTier: 'aliases' }),
    ])];
    const model = buildDashboardModel(tabs);
    expect(model.declarations).toMatchObject({ '--alias': 'var(--large)', '--button': 'var(--alias)' });
    expect(model.rows.find((row) => row.itemId === 'button')).toMatchObject({ resolvedValue: '40px', references: [{ cssVar: '--alias' }] });
    expect(model.rows.find((row) => row.itemId === 'bad')).toMatchObject({ declaredValue: 'missing', cssValue: null, resolvedValue: null, diagnostics: [{ code: 'missing-reference' }] });
    expect(model.declarations).not.toHaveProperty('--bad');
  });

  it('reports missing tabs, tiers and duplicate reference paths instead of picking the first', () => {
    const model = buildDashboardModel([
      tab([tier('raw', [item('same', '1px'), item('same', '2px', { cssVar: '--other' })]),
        tier('refs', [item('alias', 'same')], { referencesTier: 'raw' }),
        tier('broken', [item('absent', 'x')], { referencesTier: 'missing' })]),
      tab([tier('semantic', [item('cross', '#fff')], { semantic: true })], {
        id: 'color', colorExtras: extras({ semanticDefaults: { cross: { ref: { tab: 'missing', tier: 'ramp', item: 'x' } } } }),
      }),
    ]);
    expect(model.rows.find((row) => row.itemId === 'alias')?.diagnostics.some((entry) => entry.code === 'ambiguous-reference')).toBe(true);
    for (const cssVar of ['--absent', '--cross']) expect(model.rows.find((row) => row.cssVar === cssVar)?.diagnostics.some((entry) => entry.code === 'missing-reference')).toBe(true);
    expect(model.declarations).toEqual({});
  });

  it('resolves cross-tab ramps and selected-mode semantic overrides', () => {
    const tabs = [tab([palette], { id: 'ramps' }), tab([
      tier('semantic', [item('surface', 'palette:paper'), item('text', 'paper'), item('override', 'paper'), item('named', 'red'), item('expression', 'color-mix(in oklab, red, blue)')], {
        semantic: true, referencesRamps: [{ tab: 'ramps', tier: 'palette' }],
      }),
    ], {
      id: 'color', colorExtras: extras({ semanticDefaults: {
        text: { literal: { light: 'var(--ink-900)', dark: '#fff' } },
        override: { ref: { tab: 'ramps', tier: 'palette', item: 'ink' } },
      } }),
    })];
    const light = buildDashboardModel(tabs);
    const dark = buildDashboardModel(tabs, 'dark');
    expect(light.declarations).toMatchObject({ '--surface': 'var(--custom-paper)', '--text': 'var(--ink-900)', '--override': 'var(--ink-900)', '--named': 'red' });
    expect(dark.declarations['--text']).toBe('#fff');
    expect(light.rows.find((row) => row.itemId === 'override')?.resolvedValue).toBe('#123');
    expect(light.rows.find((row) => row.itemId === 'expression')?.resolvedValue).toBe('color-mix(in oklab, red, blue)');
    expect(light.diagnostics).toEqual([]);
  });

  it('uses the first declared ramp for bare ids and diagnoses ambiguous qualified ramps', () => {
    const model = buildDashboardModel([
      tab([palette], { id: 'first' }), tab([tier('palette', [item('other', '#333')])], { id: 'second' }),
      tab([tier('semantic', [item('bare', 'paper'), item('qualified', 'palette:paper'), item('missing', 'nope')], {
        semantic: true, referencesRamps: [{ tab: 'first', tier: 'palette' }, { tab: 'second', tier: 'palette' }],
      })], { id: 'color' }),
    ]);
    expect(model.declarations['--bare']).toBe('var(--custom-paper)');
    expect(model.rows.find((row) => row.itemId === 'qualified')?.diagnostics[0].code).toBe('ambiguous-reference');
    expect(model.rows.find((row) => row.itemId === 'missing')?.diagnostics[0].code).toBe('missing-reference');
  });

  it('uses actual palette item cssVars and explicit base defaults, including extra base-role rows', () => {
    const model = buildDashboardModel([tab([
      palette,
      tier('semantic', [item('surface', 'bg'), item('text', 'fg'), item('accent', 'paper'), item('literal', 'ink')], { referencesTier: 'palette' }),
    ], { id: 'color', colorExtras: extras({
      baseRoles: { background: '--background', foreground: '--foreground' },
      baseDefaults: { background: 0, foreground: 1 },
      semanticDefaults: { accent: 1, literal: { literal: '#abc' } },
    }) })]);
    expect(model.declarations).toMatchObject({
      '--surface': 'var(--custom-paper)', '--text': 'var(--ink-900)',
      '--accent': 'var(--ink-900)', '--literal': '#abc',
      '--background': 'var(--custom-paper)', '--foreground': 'var(--ink-900)',
    });
    expect(model.rows.filter((row) => row.source === 'base-role').map((row) => row.cssVar)).toEqual(['--background', '--foreground']);
    expect(model.diagnostics).toEqual([]);
  });

  it('prioritizes a real palette id over a same-spelled base sentinel', () => {
    const model = buildDashboardModel([tab([
      tier('palette', [item('bg', '#abc', { cssVar: '--palette-bg', type: { kind: 'color' } })]),
      tier('semantic', [item('surface', 'bg')], { referencesTier: 'palette' }),
    ], { id: 'color', colorExtras: extras() })]);
    expect(model.declarations['--surface']).toBe('var(--palette-bg)');
  });

  it('never replaces an explicit reference tier with an unrelated matching palette item', () => {
    const model = buildDashboardModel([tab([
      palette, tier('semantic', [item('surface', 'paper')], { semantic: true, referencesTier: 'absent' }),
    ])]);
    expect(model.rows.find((row) => row.itemId === 'surface')).toMatchObject({ cssValue: null, diagnostics: [{ code: 'missing-reference' }] });
  });

  it('preserves modern semantic literals when a legacy palette pointer remains', () => {
    const model = buildDashboardModel([tab([
      palette,
      tier('semantic', [item('hex', '#abcdef'), item('named', 'red'),
        item('expression', 'color-mix(in oklab, red, blue)'), item('alias', 'paper')], {
        semantic: true, referencesTier: 'palette',
      }),
    ])]);
    expect(model.declarations).toMatchObject({
      '--hex': '#abcdef', '--named': 'red',
      '--expression': 'color-mix(in oklab, red, blue)', '--alias': 'var(--custom-paper)',
    });
    expect(model.diagnostics).toEqual([]);
  });

  it('resolves declared ramps alongside a retained legacy palette pointer', () => {
    const model = buildDashboardModel([
      tab([tier('brand', [item('brand-600', '#123abc', { cssVar: '--brand-blue', type: { kind: 'color' } })])], { id: 'ramps' }),
      tab([palette, tier('semantic', [item('accent', 'brand:brand-600'), item('bare', 'brand-600')], {
        semantic: true, referencesTier: 'palette', referencesRamps: [{ tab: 'ramps', tier: 'brand' }],
      })]),
    ]);
    expect(model.declarations).toMatchObject({ '--accent': 'var(--brand-blue)', '--bare': 'var(--brand-blue)' });
    expect(model.diagnostics).toEqual([]);
  });

  it('does not read named presets or panel initialization defaults', () => {
    const metadata = extras({ baseRoles: { background: '--background' } });
    Object.defineProperties(metadata, {
      colorSchemes: { get() { throw new Error('must not read schemes'); } },
      panelSettings: { get() { throw new Error('must not initialize the editor'); } },
    });
    const model = buildDashboardModel([tab([palette, tier('semantic', [item('surface', 'bg')], { semantic: true })], { colorExtras: metadata })]);
    expect(model.rows.find((row) => row.itemId === 'surface')).toMatchObject({ cssValue: null, diagnostics: [{ code: 'missing-base-default' }] });
    expect(model.rows.find((row) => row.source === 'base-role')).toMatchObject({ cssValue: null, diagnostics: [{ code: 'missing-base-default' }] });
  });

  it('diagnoses invalid indices and legacy palettes that cannot be chosen unambiguously', () => {
    for (const index of [-1, 2, 0.5, NaN]) {
      const model = buildDashboardModel([tab([palette, tier('semantic', [item('bad', 'paper')], { semantic: true })], { colorExtras: extras({ semanticDefaults: { bad: index } }) })]);
      expect(model.rows.find((row) => row.itemId === 'bad')?.diagnostics[0].code).toBe('invalid-palette-index');
    }
    const row = byVar([tab([palette, tier('second', [item('red', 'red', { type: { kind: 'color' } })]), tier('semantic', [item('bad', 'paper')], { semantic: true })], { colorExtras: extras({ semanticDefaults: { bad: 0 } }) })], '--bad');
    expect(row).toMatchObject({ cssValue: null, diagnostics: [{ code: 'unsupported-palette' }] });
  });

  it('preserves all duplicate declarations and disables their dependents', () => {
    const model = buildDashboardModel([tab([
      tier('raw', [item('a', 'red', { cssVar: '--shared' }), item('b', 'blue', { cssVar: '--shared' })]),
      tier('refs', [item('ref', 'a')], { referencesTier: 'raw' }),
    ])]);
    expect(model.rows).toHaveLength(3);
    expect(new Set(model.rows.map((row) => row.key)).size).toBe(3);
    expect(model.rows.every((row) => row.cssValue === null && row.resolvedValue === null)).toBe(true);
    expect(model.diagnostics.some((entry) => entry.code === 'duplicate-variable')).toBe(true);
    expect(model.declarations).toEqual({});
  });

  it('diagnoses base-role collisions rather than overwriting tier items', () => {
    const model = buildDashboardModel([tab([palette, tier('raw', [item('background', 'red')])], { colorExtras: extras({ baseRoles: { background: '--background' }, baseDefaults: { background: 0 } }) })]);
    expect(model.rows.filter((row) => row.cssVar === '--background')).toHaveLength(2);
    expect(model.declarations).not.toHaveProperty('--background');
  });

  it('detects both declared-reference cycles and CSS var cycles and disables downstream previews', () => {
    const model = buildDashboardModel([tab([
      tier('a', [item('one', 'two')], { referencesTier: 'b' }),
      tier('b', [item('two', 'one')], { referencesTier: 'a' }),
      tier('c', [item('child', 'one')], { referencesTier: 'a' }),
      tier('css', [item('left', 'calc(var(--right) + 1px)'), item('right', 'var(--left, 1px)')]),
    ])]);
    expect(model.declarations).toEqual({});
    for (const id of ['one', 'two', 'left', 'right']) expect(model.rows.find((row) => row.itemId === id)?.diagnostics.some((entry) => entry.code === 'cyclic-reference')).toBe(true);
    expect(model.rows.find((row) => row.itemId === 'child')?.diagnostics.some((entry) => entry.code === 'invalid-reference')).toBe(true);
  });

  it('retains CSS expressions and flags external dependencies without claiming computed values', () => {
    const model = buildDashboardModel([tab([tier('values', [
      item('base', '2rem'), item('calc', 'calc(var(--base) * 2)'),
      item('nested-known', 'calc(var(--calc, var(--base)) * 2)'),
      item('mode-expression', 'light-dark(#fff, #123)'),
      item('inherit', '4px'), item('known-keyword-name', 'var(--inherit)'),
      item('external', 'var(--host, 10px)'), item('nested', 'var(--external)'),
      item('current', 'currentColor'), item('environment', 'env(safe-area-inset-top)'),
      item('quoted', '"var(--not-a-reference); <script>&"'),
    ])])]);
    expect(model.rows.find((row) => row.itemId === 'calc')).toMatchObject({ cssValue: 'calc(var(--base) * 2)', resolvedValue: 'calc(var(--base) * 2)' });
    expect(model.rows.find((row) => row.itemId === 'nested-known')).toMatchObject({ cssValue: 'calc(var(--calc, var(--base)) * 2)', resolvedValue: 'calc(var(--calc, var(--base)) * 2)', references: [{ cssVar: '--calc' }, { cssVar: '--base' }] });
    expect(model.rows.find((row) => row.itemId === 'mode-expression')).toMatchObject({ cssValue: 'light-dark(#fff, #123)', resolvedValue: 'light-dark(#fff, #123)' });
    expect(model.rows.find((row) => row.itemId === 'known-keyword-name')?.diagnostics).toEqual([]);
    for (const id of ['external', 'nested', 'current', 'environment']) expect(model.rows.find((row) => row.itemId === id)?.resolvedValue).toBeNull();
    expect(model.rows.find((row) => row.itemId === 'external')?.diagnostics[0].code).toBe('external-reference');
    expect(model.rows.find((row) => row.itemId === 'quoted')?.diagnostics).toEqual([]);
    expect(model.declarations['--quoted']).toBe('"var(--not-a-reference); <script>&"');
  });

  it.each([
    'red; position: fixed', 'red}body{color:red', 'url(https://example.invalid/image.png)',
    'image-set("https://example.invalid/a.png" 1x)', 'u\\72l(https://example.invalid/image.png)',
    'red !important', 'var(--x, url("x"))', 'calc(2px', '"unfinished', 'red /* unfinished',
  ])('keeps unsafe CSS visible but out of all declaration scopes: %s', (value) => {
    const model = buildDashboardModel([tab([tier('raw', [item('bad', value)]), tier('refs', [item('alias', 'bad')], { referencesTier: 'raw' })])]);
    expect(model.rows[0]).toMatchObject({ declaredValue: value, cssValue: null, resolvedValue: null });
    expect(model.rows[0].diagnostics[0].code).toBe('unsafe-css');
    expect(model.rows[1].cssValue).toBeNull();
    expect(model.declarations).toEqual({});
  });

  it('rejects declaration-breaking CSS names and keeps labels/defaults unchanged for renderer escaping', () => {
    const label = '<img src=x onerror=alert(1)>';
    const model = buildDashboardModel([tab([tier('raw', [item('bad', '#fff', { label, cssVar: '--x; color' }), item('__proto__', '<script>')])])]);
    expect(model.rows[0]).toMatchObject({ label, cssValue: null, diagnostics: [{ code: 'invalid-variable' }] });
    expect(model.rows[1].declaredValue).toBe('<script>');
  });

  it('skips notes pseudo-tabs without reading their arbitrary HTML', () => {
    const notes = { id: 'notes', label: 'Notes', tiers: [] } as TabConfig;
    Object.defineProperty(notes, 'notesExtras', { get() { throw new Error('notes must remain opaque'); } });
    expect(buildDashboardModel([notes, tab([tier('raw', [item('visible', '1px')])])])).toMatchObject({ tabs: [{ id: 'tokens' }], rows: [{ itemId: 'visible' }] });
  });

  it('imports and runs without DOM or panel configuration access', async () => {
    vi.resetModules();
    vi.doMock('../../config/panel-config', () => { throw new Error('panel config must not be imported'); });
    const browserGlobals = ['window', 'document', 'localStorage'] as const;
    const saved = browserGlobals.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
    try {
      for (const name of browserGlobals) Object.defineProperty(globalThis, name, { configurable: true, get() { throw new Error(`must not read ${name}`); } });
      const { buildDashboardModel: build } = await import('../model');
      expect(build([tab([tier('raw', [item('value', '1px')])])])).toMatchObject({ declarations: { '--value': '1px' } });
    } finally {
      for (const [name, descriptor] of saved) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else Reflect.deleteProperty(globalThis, name);
      }
      vi.doUnmock('../../config/panel-config');
    }
  });
});
