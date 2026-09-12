// @vitest-environment browser
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderToString } from 'preact-render-to-string';
import { TokenDashboard } from '../dashboard';
import type { TabConfig, TierItem } from '../tokens/tier-model';
// @ts-ignore — Vite supplies stylesheet text for browser verification.
import dashboardCss from '../dashboard/styles.css?inline';

type Scheme = 'light' | 'dark';
type Chrome = Scheme | 'host';
type DashboardChromeVar =
  | '--zdtp-dashboard-light-bg'
  | '--zdtp-dashboard-light-fg'
  | '--zdtp-dashboard-dark-bg'
  | '--zdtp-dashboard-dark-fg';

function item(
  id: string,
  value: string,
  kind: TierItem['type']['kind'] = 'text',
  cssVar = `--view-${id}`,
): TierItem {
  return {
    id,
    label: id,
    cssVar,
    default: value,
    type: kind === 'color' ? { kind: 'color' } : { kind: 'text' },
  };
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
      items: [item('bar', '96px')],
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

function mount({ hostScheme = 'light', mode = 'light', chrome = 'light', width = 720, publicVars }: {
  hostScheme?: Scheme;
  mode?: Scheme;
  chrome?: Chrome;
  width?: number;
  publicVars?: Partial<Record<DashboardChromeVar, string>>;
} = {}): { host: HTMLDivElement; root: HTMLElement } {
  host?.remove();
  document.documentElement.style.colorScheme = hostScheme;
  host = document.createElement('div');
  host.style.width = `${width}px`;
  for (const [name, value] of Object.entries(publicVars ?? {})) {
    host.style.setProperty(name, value);
  }
  host.innerHTML = renderToString(
    <TokenDashboard
      tabs={tabs}
      mode={mode}
      chrome={chrome}
      title="Theme contract"
      previewText="Readable specimen text across several lines."
    />,
  );
  document.body.append(host);
  const root = host.querySelector<HTMLElement>('.zdtp-dashboard');
  if (!root) throw new Error('dashboard root was not rendered');

  // #947 adds these regions to the renderer. Keep the CSS contract test
  // runnable on the current renderer by staging its inventory into the same
  // hook when the renderer has not added one yet.
  const inventory = required<HTMLElement>(root, '.zdtp-dashboard__inventory');
  const hasRegion = [...inventory.children].some((child) => child.classList.contains('zdtp-dashboard__region'));
  if (!hasRegion) {
    const region = document.createElement('div');
    region.className = 'zdtp-dashboard__region';
    region.dataset.scheme = mode;
    while (inventory.firstChild) region.append(inventory.firstChild);
    inventory.append(region);
  }
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

function channels(value: string): [number, number, number] {
  const rgbMatch = value.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  if (rgbMatch) return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];

  // Chromium preserves the oklab color space when reporting color-mix().
  // Convert its computed L/a/b channels to sRGB for contrast and lightness
  // comparisons, while keeping the production CSS in perceptual oklab space.
  const oklabMatch = value.match(/^oklab\(\s*([\d.+-]+%?)\s+([\d.+-]+%?)\s+([\d.+-]+%?)/);
  if (oklabMatch) {
    const component = (raw: string) => raw.endsWith('%') ? Number.parseFloat(raw) / 100 : Number.parseFloat(raw);
    const L = component(oklabMatch[1]);
    const a = component(oklabMatch[2]);
    const b = component(oklabMatch[3]);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const toSrgb = (linear: number) => {
      const encoded = linear <= 0.0031308
        ? 12.92 * linear
        : 1.055 * Math.max(linear, 0) ** (1 / 2.4) - 0.055;
      return Math.max(0, Math.min(1, encoded)) * 255;
    };
    return [
      toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
      toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
      toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    ];
  }
  throw new Error(`Expected computed rgb() or oklab() color, got ${value}`);
}

function luminance(value: string): number {
  const [r, g, b] = channels(value).map((channel) => channel / 255);
  const linear = (channel: number) => channel <= 0.03928
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrast(foreground: string, background: string): number {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

function expectColorClose(actual: string, expected: [number, number, number]): void {
  for (const [index, channel] of channels(actual).entries()) {
    expect(channel).toBeCloseTo(expected[index], 0);
  }
}

function opaqueBackground(el: Element): string {
  for (let current: Element | null = el; current; current = current.parentElement) {
    const background = computed(current).backgroundColor;
    if (background !== 'rgba(0, 0, 0, 0)' && background !== 'transparent') return background;
  }
  throw new Error(`No opaque background found for ${el.tagName}.${el.className}`);
}

function shellRegion(root: HTMLElement, scheme: Scheme): HTMLElement {
  return required<HTMLElement>(root, `.zdtp-dashboard__region[data-scheme='${scheme}']`);
}

describe('dashboard chrome color derivation', () => {
  it.each(['light', 'dark'] as const)('keeps foreground/background contrast at 4.5:1 in %s chrome', (scheme) => {
    const { root } = mount({ hostScheme: scheme, mode: scheme, chrome: scheme });
    const header = required<HTMLElement>(root, '.zdtp-dashboard__header');
    const region = shellRegion(root, scheme);
    const card = required<HTMLElement>(root, '.zdtp-dashboard__token');

    expectColorClose(computed(header).backgroundColor, scheme === 'light' ? [248, 250, 252] : [21, 27, 36]);
    expectColorClose(computed(header).color, scheme === 'light' ? [24, 33, 49] : [237, 242, 247]);
    expect(contrast(computed(header).color, computed(header).backgroundColor)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(computed(region).color, computed(region).backgroundColor)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(computed(card).color, computed(card).backgroundColor)).toBeGreaterThanOrEqual(4.5);

    const textLeaves = all<HTMLElement>(root, '*').filter((el) => {
      return el.children.length === 0 && Boolean(el.textContent?.trim());
    });
    for (const text of textLeaves) {
      expect(
        contrast(computed(text).color, opaqueBackground(text)),
        `${text.className}: ${computed(text).color} on ${opaqueBackground(text)}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(['light', 'dark'] as const)('keeps cards on the intended side of the %s surface', (scheme) => {
    const { root } = mount({ hostScheme: scheme, mode: scheme, chrome: scheme });
    const region = shellRegion(root, scheme);
    const card = required<HTMLElement>(root, '.zdtp-dashboard__token');
    const cardLightness = luminance(computed(card).backgroundColor);
    const surfaceLightness = luminance(computed(region).backgroundColor);

    if (scheme === 'light') {
      expect(cardLightness).toBeGreaterThan(surfaceLightness);
    } else {
      expect(cardLightness).toBeLessThanOrEqual(surfaceLightness + 1e-6);
    }
  });

  it('recolors derived chrome when all four public inputs are overridden on an ancestor wrapper', () => {
    const publicVars: Record<DashboardChromeVar, string> = {
      '--zdtp-dashboard-light-bg': '#fff4e6',
      '--zdtp-dashboard-light-fg': '#431407',
      '--zdtp-dashboard-dark-bg': '#0b1220',
      '--zdtp-dashboard-dark-fg': '#fef3c7',
    };
    const { root, host: wrapper } = mount({ hostScheme: 'light', mode: 'light', chrome: 'light' });
    const header = required<HTMLElement>(root, '.zdtp-dashboard__header');
    const region = shellRegion(root, 'light');
    const card = required<HTMLElement>(root, '.zdtp-dashboard__token');
    const before = {
      background: computed(region).backgroundColor,
      foreground: computed(region).color,
      card: computed(card).backgroundColor,
      border: computed(card).borderTopColor,
    };

    for (const [name, value] of Object.entries(publicVars)) wrapper.style.setProperty(name, value);

    expect(computed(header).backgroundColor).not.toBe(before.background);
    expect(computed(region).backgroundColor).not.toBe(before.background);
    expect(computed(region).color).not.toBe(before.foreground);
    expect(computed(card).backgroundColor).not.toBe(before.card);
    expect(computed(card).borderTopColor).not.toBe(before.border);
    expectColorClose(computed(region).backgroundColor, [255, 244, 230]);
    expectColorClose(computed(region).color, [67, 20, 7]);
  });

  it('lets a dark region resolve against its own scheme inside a light dashboard', () => {
    const { root } = mount({ hostScheme: 'light', mode: 'dark', chrome: 'light' });
    const header = required<HTMLElement>(root, '.zdtp-dashboard__header');
    const darkRegion = shellRegion(root, 'dark');

    expect(computed(header).colorScheme).toBe('light');
    expectColorClose(computed(header).backgroundColor, [248, 250, 252]);
    expect(computed(darkRegion).colorScheme).toBe('dark');
    expectColorClose(computed(darkRegion).backgroundColor, [21, 27, 36]);
    expectColorClose(computed(darkRegion).color, [237, 242, 247]);
  });

  it('inherits a dark host scheme for data-chrome="host"', () => {
    const { root } = mount({ hostScheme: 'dark', mode: 'light', chrome: 'host' });
    const header = required<HTMLElement>(root, '.zdtp-dashboard__header');

    expect(computed(root).colorScheme).toBe('dark');
    expect(computed(header).colorScheme).toBe('dark');
    expectColorClose(computed(header).backgroundColor, [21, 27, 36]);
    expectColorClose(computed(header).color, [237, 242, 247]);
  });
});
