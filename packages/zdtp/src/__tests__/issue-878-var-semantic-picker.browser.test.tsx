// @vitest-environment browser

/**
 * Browser repro for #878/#918: a per-mode semantic var() keeps its source
 * expression until the user explicitly converts that mode to a literal.
 *
 * The host root is deliberately separate from the panel so this exercises the
 * resolver's host-context boundary rather than a panel-painted value.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';

import DesignTokenTweakPanel from '../panel';
import { getActivePrimaryCluster, initColorFromScheme, loadPersistedState } from '../state/tweak-state';
import { getOpenKey, getPositionKey, getSizeKey } from '../state/tweak-state';
import { buildApplyOverrides } from '../apply/build-apply-overrides';
import { deserialize, SCHEMA_V3, serialize } from '../utils/design-token-serde';
import type { PanelConfig } from '../config/panel-config';
import type { TabConfig, TierItem } from '../tokens/tier-model';
import type { ColorTweakState, TweakState } from '../state/tweak-state';
import { flushEffects } from './_test-helpers';

// @ts-ignore — ?inline is a Vite-specific query not typed in tsconfig
const panelCssModule = import('../styles/panel.css?inline');

const LIGHT_SOURCE = 'var(--zfb-palette-base-0)';
const DARK_SOURCE = 'var(--zfb-palette-base-6)';
const LIGHT_HOST_COLOR = 'oklch(0.8 0.12 210)';
const DARK_HOST_COLOR = 'oklch(0.35 0.16 30)';
const SEMANTIC_CSS_VAR = '--zfb-color-bg';

function paletteItem(index: number): TierItem {
  return {
    id: `base-${index}`,
    cssVar: `--zfb-palette-base-${index}`,
    label: `Base ${index}`,
    default: index === 0 ? LIGHT_HOST_COLOR : index === 6 ? DARK_HOST_COLOR : '#808080',
    type: { kind: 'color', format: 'oklch' },
  };
}

const COLOR_TAB: TabConfig = {
  id: 'color',
  label: 'Color',
  colorExtras: {
    id: 'zfb-reference-aware',
    label: 'ZFB',
    baseRoles: {},
    baseDefaults: {},
    defaultShikiTheme: 'dracula',
    colorSchemes: {},
    panelSettings: { colorScheme: '', colorMode: false },
    semanticDefaults: {
      bg: { literal: { light: LIGHT_SOURCE, dark: DARK_SOURCE } },
    },
  },
  tiers: [
    {
      id: 'palette',
      label: 'Palette',
      items: Array.from({ length: 7 }, (_, index) => paletteItem(index)),
    },
    {
      id: 'semantic',
      label: 'Semantic',
      semantic: true,
      items: [
        {
          id: 'bg',
          cssVar: SEMANTIC_CSS_VAR,
          label: 'Background',
          default: LIGHT_SOURCE,
          type: { kind: 'color', format: 'oklch' },
        },
      ],
    },
  ],
};

const CONFIG: PanelConfig = {
  storagePrefix: 'issue-878-var-semantic-picker-browser',
  consoleNamespace: 'issue-878-var-semantic-picker-browser',
  modalClassPrefix: 'issue-878-var-semantic-picker-browser-modal',
  schemaId: 'zudo-design-tokens/v1',
  exportFilenameBase: 'issue-878-var-semantic-picker-browser',
  tabs: [COLOR_TAB],
  colorPresets: {},
};

let container: HTMLDivElement;
let panelStyle: HTMLStyleElement;

function fullState(color: ColorTweakState): TweakState {
  return { color, spacing: {}, typography: {}, size: {} };
}

function semanticRow(): HTMLElement {
  const row = container.querySelector<HTMLElement>('[data-testid="tokenpanel-semantic-literal-bg"]');
  if (!row) throw new Error('semantic bg row not found');
  return row;
}

function modeSwatch(mode: 'light' | 'dark'): HTMLElement {
  const label = mode === 'light' ? 'Light' : 'Dark';
  const swatch = semanticRow().querySelector<HTMLElement>(
    `[aria-label="${SEMANTIC_CSS_VAR} (${label}): ${SEMANTIC_CSS_VAR}"]`,
  );
  if (!swatch) throw new Error(`${mode} semantic swatch not found`);
  return swatch;
}

function picker(): HTMLElement {
  const current = container.querySelector<HTMLElement>('.tokenpanel-color-picker');
  if (!current) throw new Error('color picker not open');
  return current;
}

async function openMode(mode: 'light' | 'dark'): Promise<HTMLElement> {
  act(() => modeSwatch(mode).click());
  await flushEffects();
  return picker();
}

async function expandPicker(): Promise<HTMLElement> {
  const current = picker();
  const expand = current.querySelector<HTMLElement>('.tokenpanel-color-picker-expand-btn');
  if (!expand) throw new Error('picker expand control not found');
  act(() => expand.click());
  await flushEffects();
  return picker();
}

async function closePicker(): Promise<void> {
  const close = picker().querySelector<HTMLElement>('.tokenpanel-color-picker-close-btn');
  if (!close) throw new Error('picker close control not found');
  act(() => close.click());
  await flushEffects();
}

function readoutText(): string {
  const readout = picker().querySelector<HTMLElement>('.tokenpanel-color-picker-readout');
  if (!readout) throw new Error('expanded OKLCH readout not found');
  return readout.textContent?.trim() ?? '';
}

function moveLightnessUp(): void {
  const slider = picker().querySelector<HTMLElement>('[role="slider"][aria-label="Lightness"]');
  if (!slider) throw new Error('lightness slider not found');
  act(() => {
    slider.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'ArrowUp',
      bubbles: true,
      cancelable: true,
    }));
  });
}

beforeEach(async () => {
  localStorage.clear();
  document.body.innerHTML = '';
  document.documentElement.style.setProperty('--zfb-palette-base-0', LIGHT_HOST_COLOR);
  document.documentElement.style.setProperty('--zfb-palette-base-6', DARK_HOST_COLOR);

  panelStyle = document.createElement('style');
  panelStyle.textContent = ((await panelCssModule) as { default: string }).default;
  document.head.appendChild(panelStyle);

  localStorage.setItem(getOpenKey(CONFIG), '1');
  localStorage.setItem(getPositionKey(CONFIG), JSON.stringify({ top: 20, left: 20 }));
  localStorage.setItem(getSizeKey(CONFIG), JSON.stringify({ width: 760, height: 560 }));
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => render(<DesignTokenTweakPanel instanceConfig={CONFIG} />, container));
  await flushEffects();
});

afterEach(async () => {
  await flushEffects();
  act(() => render(null, container));
  container.remove();
  panelStyle.remove();
  document.documentElement.removeAttribute('style');
  localStorage.clear();
});

describe('issue #878 reference-aware semantic picker', () => {
  it('resolves light and dark sources, then preserves unconverted state and apply diff on close', async () => {
    const cluster = getActivePrimaryCluster(CONFIG);
    const initialColor = initColorFromScheme(cluster, CONFIG);
    const initialMapping = {
      literal: { light: LIGHT_SOURCE, dark: DARK_SOURCE },
    };
    const initial = fullState(initialColor);

    await openMode('light');
    await expandPicker();
    expect(readoutText()).toBe('L 80% · C 0.120 · H 210°');
    await closePicker();

    await openMode('dark');
    await expandPicker();
    expect(readoutText()).toBe('L 35% · C 0.160 · H 30°');
    await closePicker();

    expect(initialColor.semanticMappings.bg).toEqual(initialMapping);
    expect(loadPersistedState(localStorage, initialColor, cluster, CONFIG)).toBeNull();
    expect(buildApplyOverrides(initial, initialColor, cluster, CONFIG.tabs, COLOR_TAB)).toEqual({});

    // Reopening creates a fresh picker session, so the expression disclosure
    // remains armed and the raw mapping is still the value the row owns.
    await openMode('light');
    expect(picker().querySelector('.tokenpanel-color-picker__disclosure')).not.toBeNull();
    await closePicker();
  });

  it('converts only the edited light side and leaves the dark var() source attached', async () => {
    const cluster = getActivePrimaryCluster(CONFIG);
    const initialColor = initColorFromScheme(cluster, CONFIG);

    await openMode('light');
    const convert = picker().querySelector<HTMLElement>('.tokenpanel-color-picker__convert');
    if (!convert) throw new Error('Edit as literal control not found');
    act(() => convert.click());
    await flushEffects();
    moveLightnessUp();
    await flushEffects();
    await closePicker();

    const edited = loadPersistedState(localStorage, initialColor, cluster, CONFIG);
    if (!edited) throw new Error('edited state was not persisted');
    expect(edited.color.semanticMappings.bg).toEqual({
      literal: {
        light: expect.stringMatching(/^oklch\(/),
        dark: DARK_SOURCE,
      },
    });

    const apply = buildApplyOverrides(edited, initialColor, cluster, CONFIG.tabs, COLOR_TAB);
    expect(apply[SEMANTIC_CSS_VAR]).toMatch(/^light-dark\(oklch\(/);
    expect(apply[SEMANTIC_CSS_VAR]).toContain(`, ${DARK_SOURCE})`);
  });

  it('round-trips unconverted var() strings through SCHEMA_V3 serde and apply', () => {
    const cluster = getActivePrimaryCluster(CONFIG);
    const initialColor = initColorFromScheme(cluster, CONFIG);
    const initial = fullState(initialColor);
    const exported = serialize(
      initial,
      {
        includeDefaults: true,
        colorDefaults: initialColor,
        now: () => new Date('2026-09-09T00:00:00.000Z'),
      },
      CONFIG,
    );

    expect(exported.$schema).toBe(SCHEMA_V3);
    expect(exported.tabs?.color?.semantic?.[SEMANTIC_CSS_VAR]).toEqual({
      literal: { light: LIGHT_SOURCE, dark: DARK_SOURCE },
    });

    const roundTrip = deserialize(JSON.parse(JSON.stringify(exported)), {
      colorDefaults: initialColor,
    }, CONFIG);
    expect(roundTrip.unknownTokens).toEqual([]);
    expect(roundTrip.warnings).toEqual([]);
    expect(roundTrip.state.color.semanticMappings.bg).toEqual({
      literal: { light: LIGHT_SOURCE, dark: DARK_SOURCE },
    });

    const apply = buildApplyOverrides(initial, undefined, cluster, CONFIG.tabs, COLOR_TAB);
    expect(apply[SEMANTIC_CSS_VAR]).toBe(`light-dark(${LIGHT_SOURCE}, ${DARK_SOURCE})`);
  });
});
