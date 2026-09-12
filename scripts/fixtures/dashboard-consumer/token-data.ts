import type { TabConfig, DashboardPreviewKind } from '@takazudo/zdtp/dashboard';

export const tokenTabs: readonly TabConfig[] = [{
  id: 'palette', label: 'Palette', tiers: [{
    id: 'ocean', label: 'Ocean', items: [
      { id: 'pale', label: 'Pale', cssVar: '--consumer-pale', default: '#eef4ff', type: { kind: 'color' } },
      { id: 'deep', label: 'Deep', cssVar: '--consumer-deep', default: '#18243a', type: { kind: 'color' } },
      { id: 'paired', label: 'Paired', cssVar: '--consumer-paired', default: '#dbeafe', type: { kind: 'color' }, modes: { light: '#dbeafe', dark: '#1e3a8a' } },
    ],
  }],
}, {
  id: 'component', label: 'Component defaults', tiers: [{
    id: 'semantic', label: 'Semantic colors', items: [
      { id: 'surface', label: 'Surface', cssVar: '--consumer-surface', default: 'light-dark(var(--consumer-pale), var(--consumer-deep))', type: { kind: 'text' } },
    ],
  }, {
    id: 'space', label: 'Spacing', preview: 'bar', items: [
      { id: 'zero', label: 'Zero', cssVar: '--consumer-zero', default: '0', type: { kind: 'text' } },
      { id: 'space', label: 'Space', cssVar: '--consumer-space', default: '2rem', type: { kind: 'text' } },
      { id: 'alias', label: 'Alias', cssVar: '--consumer-alias', default: 'var(--consumer-space)', type: { kind: 'text' } },
      { id: 'large', label: 'Large', cssVar: '--consumer-large', default: '1536px', type: { kind: 'text' } },
      { id: 'missing', label: 'Missing', cssVar: '--consumer-missing', default: 'var(--consumer-absent)', type: { kind: 'text' } },
    ],
  }, {
    id: 'type', label: 'Typography', items: [
      { id: 'size', label: 'Body size', cssVar: '--consumer-size', default: '24px', type: { kind: 'text' } },
      { id: 'family', label: 'Body family', cssVar: '--consumer-family', default: 'serif', type: { kind: 'text' } },
      { id: 'weight', label: 'Body weight', cssVar: '--consumer-weight', default: '700', type: { kind: 'text' } },
    ],
  }, {
    id: 'leading', label: 'Line height', preview: 'line-height', previewBase: '--consumer-size', items: [
      { id: 'leading', label: 'Reading rhythm', cssVar: '--consumer-leading', default: '1.8', type: { kind: 'text' } },
    ],
  }],
}];

export const previewOverrides: Readonly<Record<string, DashboardPreviewKind>> = {
  '--consumer-surface': 'color',
  '--consumer-size': 'size',
  '--consumer-family': 'family',
  '--consumer-weight': 'weight',
};
export const previewText = 'A reading passage should wrap across several lines so we can compare rhythm and spacing. '.repeat(3)
  + '\n\n好きな文章で行間を確認します。\n<img src=x onerror=alert(1)> & plain text';
