import type { TabConfig, TierItem } from '@takazudo/zdtp/dashboard';

// Dashboard-only examples; these deliberately include unresolved declarations.
const length = (id: string, label: string, value: string): TierItem => ({
  id, label, cssVar: `--dashboard-example-${id}`, default: value,
  type: { kind: 'length', step: 1, unit: 'px' },
});

export const dashboardPreviewText = `A quiet page gives each sentence enough room. Compare the shape of letters, the spacing between words, and the rhythm as this passage wraps onto several lines.

好きな文章で、文字の大きさと行間を確かめましょう。日本語と English、数字 0123456789 を並べると、フォントごとの違いが見えてきます。読む速度に合わせて、自然な余白を探してください。`;

export const dashboardFixtureTabs: readonly TabConfig[] = [{
  id: 'ruler-examples', label: 'Spacing limits', tiers: [{
    id: 'rulers', label: 'Actual size and readable fallbacks', preview: 'bar', items: [
      length('zero', 'Zero spacing', '0'),
      length('large', 'Large spacing — scroll the ruler to see the complete 1536 CSS px length', '1536px'),
      length('base', 'Local spacing source', '2rem'),
      length('alias', 'Direct alias to the local spacing source', 'var(--dashboard-example-base)'),
      length('missing', 'Missing external spacing source', 'var(--dashboard-example-not-defined)'),
      length('expression', 'Expression retained without guessed ruler geometry', 'calc(2rem + 8px)'),
    ],
  }],
}, {
  id: 'palette-examples', label: 'Grouped colors', tiers: [{
    id: 'ocean-ramp', label: 'Ocean ramp', items: [
      ['50', '#eff6ff'], ['200', '#bfdbfe'], ['400', '#60a5fa'],
      ['600', '#2563eb'], ['800', '#1e40af'], ['950', '#172554'],
    ].map(([stop, value]): TierItem => ({
      id: `ocean-${stop}`, label: `Ocean ${stop}`, cssVar: `--dashboard-example-ocean-${stop}`,
      default: value, type: { kind: 'color', format: 'hex' },
    })),
  }],
}, {
  id: 'type-examples', label: 'Your own reading passage', tiers: [{
    id: 'text-size', label: 'Font size', preview: 'size',
    items: [length('body-size', 'Body text', '18px'), length('large-size', 'Large text', '32px')],
  }, {
    id: 'text-leading', label: 'Line height', preview: 'line-height', previewBase: '--dashboard-example-body-size',
    items: ['1.4', '1.8'].map((value): TierItem => ({
      id: `leading-${value}`, label: `Line height ${value}`, cssVar: `--dashboard-example-leading-${value.replace('.', '-')}`,
      default: value, type: { kind: 'text' },
    })),
  }],
}];

// The light-dark() sample keeps its inventory scheme as host chrome changes.
export const dashboardHostFixtureTabs: readonly TabConfig[] = [{
  id: 'host-theme', label: 'Inventory stays in its own mode', tiers: [{
    id: 'scheme-color', label: 'Mode-scoped color', items: [{
      id: 'scheme-ink', label: 'Light/dark inventory ink', cssVar: '--dashboard-example-scheme-ink',
      default: 'light-dark(#244f94, #93c5fd)', type: { kind: 'text' },
    }],
  }, {
    id: 'scheme-type', label: 'Typography specimen', preview: 'size',
    items: [length('host-body-size', 'Body text', '18px')],
  }],
}];

export const dashboardHostPreviewOverrides = {
  '--dashboard-example-scheme-ink': 'color',
} as const;
