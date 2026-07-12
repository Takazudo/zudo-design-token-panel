// @vitest-environment jsdom
import { render } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DesignTokenTweakPanel from '../../panel';
import { DomTweakerOrchestrator } from '../dom-tweaker-orchestrator';
import { DomTweakerToggleButton } from '../dom-tweaker-toggle-button';
import { __resetPanelConfigForTests, type PanelConfig } from '../../config/panel-config';
import { getOpenKey } from '../../state/tweak-state';
import { flushEffects } from '../../__tests__/_test-helpers';

const DOM_TWEAKER_OWNER_SYMBOL = Symbol.for('@takazudo/zdtp:dom-tweaker-owner');

const mountedContainers: HTMLElement[] = [];

function makeConfig(prefix: string, domTweaker?: PanelConfig['domTweaker']): PanelConfig {
  return {
    storagePrefix: prefix,
    consoleNamespace: `${prefix}Ns`,
    modalClassPrefix: `${prefix}-modal`,
    schemaId: `${prefix}/v1`,
    exportFilenameBase: prefix,
    tabs: [],
    ...(domTweaker === undefined ? {} : { domTweaker }),
  };
}

async function renderOpenPanel(cfg: PanelConfig): Promise<HTMLElement> {
  localStorage.setItem(getOpenKey(cfg), '1');
  const container = document.createElement('div');
  document.body.appendChild(container);
  mountedContainers.push(container);
  render(<DesignTokenTweakPanel instanceConfig={cfg} />, container);
  await flushEffects();
  return container;
}

function resetDomTweakerOwnerForTests(): void {
  const doc = document as unknown as Record<symbol, { ownerStoragePrefix: string | null } | undefined>;
  const state = doc[DOM_TWEAKER_OWNER_SYMBOL];
  if (state) state.ownerStoragePrefix = null;
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
  resetDomTweakerOwnerForTests();
});

afterEach(() => {
  for (const container of mountedContainers) {
    render(null, container);
    container.remove();
  }
  mountedContainers.length = 0;
  __resetPanelConfigForTests();
  resetDomTweakerOwnerForTests();
  localStorage.clear();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('DomTweakerToggleButton panel integration', () => {
  it('is hidden when PanelConfig.domTweaker is omitted', async () => {
    const container = await renderOpenPanel(makeConfig('domtweak-hidden'));

    expect(container.querySelector('.tokenpanel-domtweaker-toggle')).toBeNull();
  });

  it('is visible with PanelConfig.domTweaker and flips persisted enabled state', async () => {
    const cfg = makeConfig('domtweak-visible', {});
    const container = await renderOpenPanel(cfg);

    let toggle = container.querySelector<HTMLElement>('.tokenpanel-domtweaker-toggle');
    expect(toggle).not.toBeNull();
    expect(toggle!.classList.contains('tokenpanel-tweaker-toggle')).toBe(true);
    expect(localStorage.getItem('domtweak-visible-domtweaker-enabled')).toBeNull();

    toggle!.click();
    await flushEffects();
    toggle = container.querySelector<HTMLElement>('.tokenpanel-domtweaker-toggle');
    expect(localStorage.getItem('domtweak-visible-domtweaker-enabled')).toBe('1');
    expect(toggle!.classList.contains('is-active')).toBe(true);

    toggle!.click();
    await flushEffects();
    toggle = container.querySelector<HTMLElement>('.tokenpanel-domtweaker-toggle');
    expect(localStorage.getItem('domtweak-visible-domtweaker-enabled')).toBe('0');
    expect(toggle!.classList.contains('is-active')).toBe(false);
  });
});

describe('DomTweakerOrchestrator single-active-instance guard', () => {
  it('makes a second instance toggle inert and warns under that instance namespace', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const cfgA = makeConfig('domtweak-a', {});
    const cfgB = makeConfig('domtweak-b', {});
    const container = document.createElement('div');
    document.body.appendChild(container);
    mountedContainers.push(container);

    render(
      <div>
        <DomTweakerOrchestrator instanceConfig={cfgA}>
          <DomTweakerToggleButton />
        </DomTweakerOrchestrator>
        <DomTweakerOrchestrator instanceConfig={cfgB}>
          <DomTweakerToggleButton />
        </DomTweakerOrchestrator>
      </div>,
      container,
    );

    const toggles = container.querySelectorAll<HTMLElement>('.tokenpanel-domtweaker-toggle');
    expect(toggles).toHaveLength(2);

    toggles[0].click();
    await flushEffects();
    toggles[1].click();
    await flushEffects();

    expect(localStorage.getItem('domtweak-a-domtweaker-enabled')).toBe('1');
    expect(localStorage.getItem('domtweak-b-domtweaker-enabled')).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[domtweak-bNs]'));
  });
});
