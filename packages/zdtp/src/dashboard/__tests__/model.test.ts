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
    expect(model.include).toBe('all');
    expect(model.tabs.map((entry) => entry.id)).toEqual(['tokens']);
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
    expect(model.rows.find((row) => row.itemId === 'mode-expression')).toMatchObject({ cssValue: '#fff', resolvedValue: '#fff' });
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

describe('mode-aware dashboard rows', () => {
  const modes = ['light', 'dark', 'host'] as const;
  const includes = ['all', 'mode-dependent', 'mode-independent'] as const;
  const sides = { light: '#eee', dark: '#111' };
  const mixedTabs = [
    tab([
      tier('mixed', [
        item('fixed', '#abc', { cssVar: '--fixed-color', type: { kind: 'color' } }),
        item('themed', '#777', { modes: sides, type: { kind: 'color' } }),
      ]),
      tier('aliases', [item('themed-alias', 'themed'), item('fixed-alias', 'fixed')], { referencesTier: 'mixed' }),
      tier('expressions', [item('mix', 'color-mix(in oklab, var(--themed-alias), var(--fixed-color))')]),
      tier('empty', []),
    ]),
    tab([tier('only-fixed', [item('fixed-only', '2rem')])], { id: 'static' }),
    tab([tier('only-paired', [item('changing-only', 'light-dark(#fff, #222)')])], { id: 'changing' }),
    tab([], { id: 'empty' }),
  ];

  it.each(modes.flatMap((mode) => includes.map((include) => ({ mode, include }))))(
    'selects $mode values and filters $include rows after building the whole graph',
    ({ mode, include }) => {
      const snapshot = JSON.stringify(mixedTabs);
      const model = buildDashboardModel(mixedTabs, { mode, include });
      const visible = model.tabs.map((entry) => ({
        id: entry.id,
        tiers: entry.tiers.map((entry) => ({ id: entry.id, rows: entry.rows.map((row) => row.itemId) })),
      }));
      const expected = {
        all: [
          { id: 'tokens', tiers: [
            { id: 'mixed', rows: ['fixed', 'themed'] },
            { id: 'aliases', rows: ['themed-alias', 'fixed-alias'] },
            { id: 'expressions', rows: ['mix'] },
          ] },
          { id: 'static', tiers: [{ id: 'only-fixed', rows: ['fixed-only'] }] },
          { id: 'changing', tiers: [{ id: 'only-paired', rows: ['changing-only'] }] },
        ],
        'mode-dependent': [
          { id: 'tokens', tiers: [
            { id: 'mixed', rows: ['themed'] },
            { id: 'aliases', rows: ['themed-alias'] },
            { id: 'expressions', rows: ['mix'] },
          ] },
          { id: 'changing', tiers: [{ id: 'only-paired', rows: ['changing-only'] }] },
        ],
        'mode-independent': [
          { id: 'tokens', tiers: [
            { id: 'mixed', rows: ['fixed'] },
            { id: 'aliases', rows: ['fixed-alias'] },
          ] },
          { id: 'static', tiers: [{ id: 'only-fixed', rows: ['fixed-only'] }] },
        ],
      };
      expect(model).toMatchObject({ mode, include });
      expect(visible).toEqual(expected[include]);
      expect(model.rows.map((row) => row.itemId)).toEqual([
        'fixed', 'themed', 'themed-alias', 'fixed-alias', 'mix', 'fixed-only', 'changing-only',
      ]);
      const selected = mode === 'host' ? 'light-dark(#eee, #111)' : sides[mode];
      expect(model.declarations).toEqual({
        '--fixed-color': '#abc', '--themed': selected,
        '--themed-alias': 'var(--themed)', '--fixed-alias': 'var(--fixed-color)',
        '--mix': 'color-mix(in oklab, var(--themed-alias), var(--fixed-color))',
        '--fixed-only': '2rem',
        '--changing-only': mode === 'host' ? 'light-dark(#fff, #222)' : mode === 'light' ? '#fff' : '#222',
      });
      expect(model.rows.find((row) => row.itemId === 'themed')).toMatchObject({
        modeDependent: true, sides, origin: 'modes', defaultValue: '#777',
        declaredValue: selected, cssValue: selected, resolvedValue: mode === 'host' ? null : selected,
      });
      expect(model.rows.find((row) => row.itemId === 'themed-alias')).toMatchObject({
        modeDependent: true, sides: null, origin: 'reference', cssValue: 'var(--themed)',
        resolvedValue: mode === 'host' ? null : selected, references: [{ cssVar: '--themed' }],
      });
      expect(model.rows.find((row) => row.itemId === 'mix')).toMatchObject({
        modeDependent: true, sides: null, origin: 'reference',
        resolvedValue: mode === 'host' ? null : model.declarations['--mix'],
        references: [{ cssVar: '--themed-alias' }, { cssVar: '--fixed-color' }],
      });
      for (const id of ['fixed', 'fixed-alias', 'fixed-only']) {
        expect(model.rows.find((row) => row.itemId === id)).toMatchObject({ modeDependent: false, sides: null, origin: null });
      }
      expect(model.rows.find((row) => row.itemId === 'fixed-alias')?.resolvedValue).toBe('#abc');
      expect(model.diagnostics).toEqual([]);
      expect(JSON.stringify(mixedTabs)).toBe(snapshot);
    },
  );

  it.each(modes)('uses direct-pair precedence, semantic overrides and the shared parser in %s mode', (mode) => {
    const tabs = [tab([
      tier('semantic', [
        item('modes-first', 'light-dark(#333, #444)', { modes: sides }),
        item('modes-over-ref', 'missing', { modes: sides }),
        item('default-over-ref', 'light-dark(#333, #444)'),
        item('semantic-first', 'light-dark(#333, #444)'),
        item('string-pair', '#555'),
        item('string-fixed', 'light-dark(#333, #444)'),
        item('parsed', '  LiGhT-DaRk( rgb(1, 2, 3), color-mix(in oklab, red, blue) )  '),
      ], { semantic: true, referencesTier: 'missing' }),
      tier('raw', [
        item('nonsemantic', '#678'),
        item('same-sides', '#777', { modes: { light: '#abc', dark: '#abc' } }),
        item('nested', 'light-dark(light-dark(red, blue), green)'),
        item('multiple', 'light-dark(red, blue) green'),
      ]),
    ], { colorExtras: extras({ semanticDefaults: {
      'modes-first': { literal: { light: '#aaa', dark: '#bbb' } },
      'modes-over-ref': { ref: { tab: 'absent', tier: 'absent', item: 'absent' } },
      'default-over-ref': { ref: { tab: 'absent', tier: 'absent', item: 'absent' } },
      'semantic-first': { literal: { light: '#aaa', dark: '#bbb' } },
      'string-pair': { literal: 'light-dark(#ccc, #ddd)' },
      'string-fixed': { literal: '#999' },
      nonsemantic: { literal: { light: '#aaa', dark: '#bbb' } },
    } }) })];
    const model = buildDashboardModel(tabs, { mode });
    const expected = [
      { itemId: 'modes-first', origin: 'modes', sides },
      { itemId: 'modes-over-ref', origin: 'modes', sides },
      { itemId: 'default-over-ref', origin: 'default', sides: { light: '#333', dark: '#444' } },
      { itemId: 'semantic-first', origin: 'semantic', sides: { light: '#aaa', dark: '#bbb' } },
      { itemId: 'string-pair', origin: 'default', sides: { light: '#ccc', dark: '#ddd' } },
      { itemId: 'parsed', origin: 'default', sides: { light: 'rgb(1, 2, 3)', dark: 'color-mix(in oklab, red, blue)' } },
      { itemId: 'same-sides', origin: 'modes', sides: { light: '#abc', dark: '#abc' } },
    ];
    for (const pair of expected) {
      const value = mode === 'host' ? `light-dark(${pair.sides.light}, ${pair.sides.dark})` : pair.sides[mode];
      expect(model.rows.find((row) => row.itemId === pair.itemId)).toMatchObject({
        ...pair, modeDependent: true, cssValue: value, declaredValue: value,
        resolvedValue: mode === 'host' ? null : value, references: [],
      });
    }
    expect(model.declarations['--string-fixed']).toBe('#999');
    expect(model.declarations['--nonsemantic']).toBe('#678');
    for (const id of ['string-fixed', 'nonsemantic', 'nested', 'multiple']) {
      expect(model.rows.find((row) => row.itemId === id)).toMatchObject({ modeDependent: false, sides: null, origin: null });
    }
    expect(model.diagnostics).toEqual([]);
  });

  it.each(modes)('propagates through base roles, cross-tab ramps, palette indices and CSS references in %s mode', (mode) => {
    const model = buildDashboardModel([
      tab([tier('semantic', [item('cross-ref', '#fff'), item('cross-ramp', 'themed')], {
        semantic: true, referencesRamps: [{ tab: 'tokens', tier: 'palette' }],
      })], { id: 'color', colorExtras: extras({ semanticDefaults: {
        'cross-ref': { ref: { tab: 'tokens', tier: 'palette', item: 'themed' } },
      } }) }),
      tab([
        tier('css', [item('downstream', 'var(--css-role)'), item('css-role', 'var(--background)')]),
        tier('aliases', [item('background-alias', 'bg'), item('index-alias', 'ink'), item('role-alias', 'ink')], { referencesTier: 'palette' }),
        tier('palette', [
          item('themed', '#777', { modes: sides, type: { kind: 'color' } }),
          item('ink', '#123', { type: { kind: 'color' } }),
        ]),
      ], { colorExtras: extras({
        baseRoles: { background: '--background', foreground: '--foreground' },
        baseDefaults: { background: 0, foreground: 1 },
        semanticDefaults: { 'index-alias': 0, 'role-alias': 'bg' },
      }) }),
    ], { mode });
    for (const id of ['cross-ref', 'cross-ramp', 'downstream', 'css-role', 'background-alias', 'index-alias', 'role-alias', 'background']) {
      const row = model.rows.find((row) => row.itemId === id)!;
      expect(row).toMatchObject({ modeDependent: true, origin: 'reference', sides: null });
      expect(row.cssValue).not.toBeNull();
      if (mode === 'host') expect(row.resolvedValue).toBeNull();
      else if (!['downstream', 'css-role'].includes(id)) expect(row.resolvedValue).toBe(sides[mode]);
    }
    expect(model.rows.find((row) => row.itemId === 'foreground')).toMatchObject({
      modeDependent: false, origin: null, sides: null, resolvedValue: '#123',
    });
    expect(model.declarations).toMatchObject({
      '--cross-ref': 'var(--themed)', '--cross-ramp': 'var(--themed)',
      '--downstream': 'var(--css-role)', '--css-role': 'var(--background)',
      '--background': 'var(--themed)', '--foreground': 'var(--ink)',
    });
    expect(model.diagnostics).toEqual([]);
  });

  it.each(modes)('terminates propagation across cycles and retains diagnostics under every filter in %s mode', (mode) => {
    const tabs = [tab([tier('values', [
      item('child', 'var(--left)'),
      item('left', 'color-mix(in oklab, var(--right), var(--themed))'),
      item('right', 'var(--left)'),
      item('themed', '#777', { modes: sides }),
      item('self-cycle', 'var(--self-cycle)'),
      item('external', 'var(--host, #fff)'),
    ])])];
    const complete = buildDashboardModel(tabs, { mode });
    for (const include of includes) {
      const model = buildDashboardModel(tabs, { mode, include });
      expect(model.diagnostics).toEqual(complete.diagnostics);
      expect(model.declarations).toEqual(complete.declarations);
      for (const id of ['child', 'left', 'right']) {
        expect(model.rows.find((row) => row.itemId === id)).toMatchObject({
          modeDependent: true, origin: 'reference', sides: null, cssValue: null, resolvedValue: null,
        });
      }
      for (const id of ['left', 'right', 'self-cycle']) {
        expect(model.rows.find((row) => row.itemId === id)?.diagnostics.some((entry) => entry.code === 'cyclic-reference')).toBe(true);
      }
      expect(model.rows.find((row) => row.itemId === 'child')?.diagnostics.some((entry) => entry.code === 'invalid-reference')).toBe(true);
      expect(model.rows.find((row) => row.itemId === 'self-cycle')?.modeDependent).toBe(false);
      expect(model.rows.find((row) => row.itemId === 'external')).toMatchObject({
        modeDependent: false, cssValue: 'var(--host, #fff)', resolvedValue: null,
        diagnostics: [{ code: 'external-reference' }],
      });
    }
  });

  it.each(modes)('applies existing CSS safety and context diagnostics to the active %s values', (mode) => {
    const model = buildDashboardModel([tab([
      tier('raw', [
        item('unsafe', '#777', { modes: { light: 'red; position: fixed', dark: '#123' } }),
        item('context', '#777', { modes: { light: '#eee', dark: 'var(--host-background)' } }),
      ]),
      tier('aliases', [item('unsafe-alias', 'unsafe'), item('context-alias', 'context')], { referencesTier: 'raw' }),
    ])], { mode });
    for (const id of ['unsafe', 'unsafe-alias']) {
      const row = model.rows.find((row) => row.itemId === id)!;
      expect(row.modeDependent).toBe(true);
      if (mode === 'dark') expect(row.resolvedValue).toBe('#123');
      else {
        expect(row.cssValue).toBeNull();
        expect(row.resolvedValue).toBeNull();
        expect(model.declarations).not.toHaveProperty(row.cssVar);
        expect(row.diagnostics.some((entry) => entry.code === (id === 'unsafe' ? 'unsafe-css' : 'invalid-reference'))).toBe(true);
      }
    }
    for (const id of ['context', 'context-alias']) {
      const row = model.rows.find((row) => row.itemId === id)!;
      expect(row.modeDependent).toBe(true);
      expect(row.cssValue).not.toBeNull();
      expect(row.resolvedValue).toBe(mode === 'light' ? '#eee' : null);
      if (mode !== 'light') expect(row.diagnostics.some((entry) => entry.code === (id === 'context' ? 'external-reference' : 'context-dependent'))).toBe(true);
    }
    if (mode === 'host') expect(model.declarations['--context']).toBe('light-dark(#eee, var(--host-background))');
  });

  it('keeps the positional mode compatible and defaults options independently', () => {
    function legacyModel(mode?: 'light' | 'dark') {
      return buildDashboardModel(mixedTabs, mode);
    }
    expect(legacyModel()).toEqual(buildDashboardModel(mixedTabs));
    expect(legacyModel('dark')).toEqual(buildDashboardModel(mixedTabs, { mode: 'dark' }));
    expect(buildDashboardModel(mixedTabs, 'dark')).toEqual(buildDashboardModel(mixedTabs, { mode: 'dark' }));
    expect(buildDashboardModel(mixedTabs, 'host')).toEqual(buildDashboardModel(mixedTabs, { mode: 'host' }));
    expect(buildDashboardModel(mixedTabs, {})).toEqual(buildDashboardModel(mixedTabs));
    expect(buildDashboardModel(mixedTabs, { include: 'mode-dependent' })).toMatchObject({ mode: 'light', include: 'mode-dependent' });
  });
});
