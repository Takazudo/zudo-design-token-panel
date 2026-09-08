// @vitest-environment browser
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderToString } from 'preact-render-to-string';
import { TokenDashboard } from '../dashboard';
import type { TabConfig, TierItem } from '../tokens/tier-model';
// @ts-ignore — Vite supplies stylesheet text for browser verification.
import dashboardCss from '../dashboard/styles.css?inline';

type Scheme = 'light' | 'dark';
type Chrome = Scheme | 'host';

const colors = {
  light: {
    background: 'rgb(248, 250, 252)',
    foreground: 'rgb(24, 33, 49)',
    muted: 'rgb(83, 97, 116)',
    border: 'rgb(220, 225, 232)',
    card: 'rgb(255, 255, 255)',
    diagnosticBackground: 'rgb(255, 245, 230)',
    diagnosticForeground: 'rgb(112, 70, 18)',
    diagnosticAccent: 'rgb(157, 100, 26)',
    focus: 'rgb(36, 92, 170)',
  },
  dark: {
    background: 'rgb(21, 27, 36)',
    foreground: 'rgb(237, 242, 247)',
    muted: 'rgb(172, 185, 203)',
    border: 'rgb(70, 83, 103)',
    card: 'rgb(32, 41, 54)',
    diagnosticBackground: 'rgb(59, 44, 24)',
    diagnosticForeground: 'rgb(255, 218, 163)',
    diagnosticAccent: 'rgb(228, 173, 92)',
    focus: 'rgb(100, 136, 184)',
  },
} as const;

function item(
  id: string,
  value: string,
  kind: TierItem['type']['kind'] = 'text',
  cssVar = `--view-${id}`,
): TierItem {
  return { id, label: id, cssVar, default: value, type: kind === 'color' ? { kind: 'color' } : { kind: 'text' } };
}

const tabs: TabConfig[] = [{
  id: 'tokens',
  label: 'Tokens',
  tiers: [
    {
      id: 'palette',
      label: 'Palette',
      items: [
        item('plain', '#3468a8', 'color'),
        item('mode', 'light-dark(#f7fbff, #142235)', 'color'),
        item('alias', 'var(--x)', 'color', '--view-alias'),
        item('x', '#b95c28', 'color', '--x'),
      ],
    },
    {
      id: 'spacing',
      label: 'Spacing',
      preview: 'bar',
      items: [item('bar', '96px'), item('bar-alias', 'var(--view-bar)', 'text')],
    },
    {
      id: 'radius',
      label: 'Radius',
      preview: 'radius',
      items: [item('radius', '12px')],
    },
    {
      id: 'shadow',
      label: 'Shadow',
      items: [item('shadow', '0 2px 5px #334155')],
    },
    {
      id: 'type-size',
      label: 'Size',
      preview: 'size',
      items: [item('size', '24px')],
    },
    {
      id: 'type-family',
      label: 'Family',
      preview: 'family',
      items: [item('family', 'serif')],
    },
    {
      id: 'type-weight',
      label: 'Weight',
      preview: 'weight',
      items: [item('weight', '700')],
    },
    {
      id: 'type-leading',
      label: 'Leading',
      preview: 'line-height',
      previewBase: '--view-size',
      items: [item('leading', '1.6')],
    },
    {
      id: 'diagnostics',
      label: 'Diagnostics',
      items: [item('external', 'var(--host-color)', 'color')],
    },
  ],
}];

let style: HTMLStyleElement;
let host: HTMLDivElement | undefined;
let originalDocumentStyle = '';

beforeEach(() => {
  originalDocumentStyle = document.documentElement.getAttribute('style') ?? '';
  style = document.createElement('style');
  style.textContent = dashboardCss;
  document.head.append(style);
  document.documentElement.style.colorScheme = 'light';
});

afterEach(() => {
  host?.remove();
  style.remove();
  document.documentElement.setAttribute('style', originalDocumentStyle);
  host = undefined;
});

function mount({ hostScheme = 'light', mode = 'light', chrome, width = 720 }: {
  hostScheme?: Scheme;
  mode?: Scheme;
  chrome?: Chrome;
  width?: number;
} = {}): { host: HTMLDivElement; root: HTMLElement } {
  host?.remove();
  document.documentElement.style.colorScheme = hostScheme;
  host = document.createElement('div');
  host.style.width = `${width}px`;
  const props = {
    tabs,
    mode,
    title: 'Theme contract',
    previewText: 'Readable specimen text across several lines.',
    previewOverrides: { '--view-shadow': 'shadow' as const },
    ...(chrome === undefined ? {} : { chrome }),
  };
  host.innerHTML = renderToString(<TokenDashboard {...props} />);
  document.body.append(host);
  const root = host.querySelector<HTMLElement>('.zdtp-dashboard');
  if (!root) throw new Error('dashboard root was not rendered');
  return { host, root };
}

function computed(el: Element): CSSStyleDeclaration {
  return getComputedStyle(el);
}

function required<T extends Element>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Expected ${selector}`);
  return el;
}

function all<T extends Element>(root: ParentNode, selector: string): T[] {
  return [...root.querySelectorAll<T>(selector)];
}

function rgb(value: string): [number, number, number] {
  const match = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)$/);
  if (!match) throw new Error(`Expected computed rgb() color, got ${value}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function contrast(foreground: string, background: string): number {
  const luminance = (value: string): number => {
    const [r, g, b] = rgb(value).map((channel) => channel / 255);
    const linear = (channel: number) => channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  };
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

function opaqueBackground(el: Element): string {
  for (let current: Element | null = el; current; current = current.parentElement) {
    const background = computed(current).backgroundColor;
    if (background !== 'rgba(0, 0, 0, 0)' && background !== 'transparent') return background;
  }
  throw new Error(`No opaque background found for ${el.tagName}.${el.className}`);
}

function expectChrome(root: HTMLElement, scheme: Scheme): void {
  const expected = colors[scheme];
  const card = required<HTMLElement>(root, '.zdtp-dashboard__token');
  const header = required<HTMLElement>(root, '.zdtp-dashboard__header');
  const tabHeader = required<HTMLElement>(root, '.zdtp-dashboard__tab-header');
  const variable = required<HTMLElement>(root, '.zdtp-dashboard__variable');
  const reference = required<HTMLElement>(root, '.zdtp-dashboard__reference');
  const value = required<HTMLElement>(root, '.zdtp-dashboard__value');
  const diagnostic = required<HTMLElement>(root, '.zdtp-dashboard__diagnostic');

  expect(computed(root).backgroundColor).toBe(expected.background);
  expect(computed(root).color).toBe(expected.foreground);
  expect(computed(root).borderTopColor).toBe(expected.border);
  expect(computed(card).backgroundColor).toBe(expected.card);
  expect(computed(card).color).toBe(expected.foreground);
  expect(computed(card).borderTopColor).toBe(expected.border);
  expect(computed(variable).color).toBe(expected.muted);
  expect(computed(reference).color).toBe(expected.muted);
  expect(computed(value).color).toBe(expected.foreground);
  expect(computed(header).borderBottomColor).toBe(expected.border);
  expect(computed(tabHeader).borderBottomColor).toBe(expected.border);
  expect(computed(diagnostic).backgroundColor).toBe(expected.diagnosticBackground);
  expect(computed(diagnostic).color).toBe(expected.diagnosticForeground);
  expect(computed(diagnostic).borderInlineStartColor).toBe(expected.diagnosticAccent);

  for (const scroll of all<HTMLElement>(root, '.zdtp-dashboard__scroll')) {
    scroll.focus();
    expect(computed(scroll).outlineStyle).toBe('solid');
    expect(computed(scroll).outlineColor).toBe(expected.focus);
  }
}

function specimenSnapshot(root: HTMLElement): string {
  const snapshot = (selector: string, properties: readonly string[]) => all<HTMLElement>(root, selector).map((el) => ({
    key: el.closest<HTMLElement>('[data-css-var]')?.dataset.cssVar ?? '',
    className: el.className,
    rect: [el.getBoundingClientRect().x, el.getBoundingClientRect().y, el.getBoundingClientRect().width, el.getBoundingClientRect().height],
    values: properties.map((property) => computed(el).getPropertyValue(property)),
  }));
  return JSON.stringify({
    specimens: snapshot('.zdtp-dashboard__specimen', ['background-color', 'color-scheme']),
    samples: snapshot('.zdtp-dashboard__sample', ['background-color', 'box-shadow']),
    sampleBorders: snapshot('.zdtp-dashboard__sample--radius, .zdtp-dashboard__sample--shadow', ['border-top-color']),
    palette: snapshot('.zdtp-dashboard__palette', ['background-color']),
    rulers: snapshot('.zdtp-dashboard__ruler', ['width', 'background-color']),
  });
}

function inventoryProperties(root: HTMLElement): string {
  const inventory = required<HTMLElement>(root, '.zdtp-dashboard__inventory');
  const properties: string[] = [];
  for (let index = 0; index < inventory.style.length; index++) {
    const property = inventory.style.item(index);
    if (property.startsWith('--')) properties.push(property);
  }
  return JSON.stringify(properties.sort().map((property) => [property, computed(inventory).getPropertyValue(property)]));
}

describe('static dashboard chrome and specimen color-scheme ownership', () => {
  it.each<[Scheme, Scheme]>([
    ['light', 'light'], ['light', 'dark'], ['dark', 'light'], ['dark', 'dark'],
  ])('host chrome follows %s while mode specimens remain %s', (hostScheme, mode) => {
    const { root } = mount({ hostScheme, mode, chrome: 'host' });
    expect(root.dataset.chrome).toBe('host');
    expect(computed(root).colorScheme).toBe(hostScheme);
    expectChrome(root, hostScheme);
    for (const specimen of all<HTMLElement>(root, '.zdtp-dashboard__specimen')) {
      expect(computed(specimen).colorScheme).toBe(mode);
    }
  });

  it('switches host chrome without changing declared inventory, specimen colors, or geometry', () => {
    const { root } = mount({ hostScheme: 'light', mode: 'dark', chrome: 'host' });
    const beforeSpecimens = specimenSnapshot(root);
    const beforeInventory = inventoryProperties(root);
    expectChrome(root, 'light');

    document.documentElement.style.colorScheme = 'dark';

    expect(computed(root).backgroundColor).toBe(colors.dark.background);
    expect(computed(root).color).toBe(colors.dark.foreground);
    expect(specimenSnapshot(root)).toBe(beforeSpecimens);
    expect(inventoryProperties(root)).toBe(beforeInventory);
    expectChrome(root, 'dark');
  });

  it('keeps fixed chrome independent of host scheme and defaults to light', () => {
    for (const chrome of ['light', 'dark'] as const) {
      document.documentElement.style.colorScheme = 'light';
      const lightHost = mount({ hostScheme: 'light', mode: 'dark', chrome });
      const lightSnapshot = specimenSnapshot(lightHost.root);
      const lightChrome = [computed(lightHost.root).backgroundColor, computed(lightHost.root).color];
      expectChrome(lightHost.root, chrome);

      document.documentElement.style.colorScheme = 'dark';
      const darkHost = mount({ hostScheme: 'dark', mode: 'dark', chrome });
      expect([computed(darkHost.root).backgroundColor, computed(darkHost.root).color]).toEqual(lightChrome);
      expect(specimenSnapshot(darkHost.root)).toBe(lightSnapshot);
      expectChrome(darkHost.root, chrome);
    }

    const explicitLight = mount({ hostScheme: 'dark', mode: 'light', chrome: 'light' });
    const explicitLightChrome = [computed(explicitLight.root).backgroundColor, computed(explicitLight.root).color];
    const omitted = mount({ hostScheme: 'dark', mode: 'light', chrome: undefined });
    expect([computed(omitted.root).backgroundColor, computed(omitted.root).color]).toEqual(explicitLightChrome);
    expect(computed(omitted.root).colorScheme).toBe('light');
    expectChrome(omitted.root, 'light');
  });

  it('uses an explicit light host choice regardless of the preferred host scheme', () => {
    document.documentElement.style.colorScheme = 'light';
    const { root } = mount({ hostScheme: 'light', mode: 'dark', chrome: 'host' });
    expect(computed(root).colorScheme).toBe('light');
    expectChrome(root, 'light');
  });

  it('isolates panel edits on :root from the dashboard inventory scope', () => {
    const { root } = mount({ hostScheme: 'dark', mode: 'light', chrome: 'host' });
    const beforeSpecimens = specimenSnapshot(root);
    const beforeInventory = inventoryProperties(root);
    const beforeChrome = [computed(root).backgroundColor, computed(root).color];

    document.documentElement.style.setProperty('--view-plain', '#00ff00');
    document.documentElement.style.setProperty('--view-mode', 'light-dark(#000, #fff)');
    document.documentElement.style.setProperty('--x', '#0000ff');
    document.documentElement.style.setProperty('--view-alias', 'var(--view-mode)');

    expect([computed(root).backgroundColor, computed(root).color]).toEqual(beforeChrome);
    expect(specimenSnapshot(root)).toBe(beforeSpecimens);
    expect(inventoryProperties(root)).toBe(beforeInventory);
    expect(computed(required<HTMLElement>(root, '[data-css-var="--view-alias"] .zdtp-dashboard__sample--color')).backgroundColor)
      .toBe('rgb(185, 92, 40)');
  });

  it('fits a 360px container without horizontal shell overflow', () => {
    const { host: narrowHost, root } = mount({ hostScheme: 'light', mode: 'dark', chrome: 'host', width: 360 });
    expect(root.clientWidth).toBeLessThanOrEqual(360);
    expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
    expect(narrowHost.scrollWidth).toBeLessThanOrEqual(narrowHost.clientWidth);
  });
});

describe('static dashboard chrome contrast', () => {
  it.each(['light', 'dark'] as const)('keeps every text pair and affordance readable in %s chrome', (scheme) => {
    const { root } = mount({ hostScheme: scheme, mode: 'light', chrome: scheme });

    const textLeaves = all<HTMLElement>(root, '*').filter((el) => {
      return el.children.length === 0 && Boolean(el.textContent?.trim());
    });
    for (const text of textLeaves) {
      const textColor = computed(text).color;
      const background = opaqueBackground(text);
      expect(contrast(textColor, background), `${text.className}: ${textColor} on ${background}`).toBeGreaterThanOrEqual(4.5);
    }

    for (const scroll of all<HTMLElement>(root, '.zdtp-dashboard__scroll')) {
      scroll.focus();
      expect(contrast(computed(scroll).outlineColor, opaqueBackground(scroll)), `${scroll.className} focus outline`)
        .toBeGreaterThanOrEqual(3);
    }

    for (const diagnostic of all<HTMLElement>(root, '.zdtp-dashboard__diagnostic')) {
      expect(contrast(computed(diagnostic).borderInlineStartColor, computed(diagnostic).backgroundColor), 'diagnostic accent')
        .toBeGreaterThanOrEqual(3);
    }
  });
});
