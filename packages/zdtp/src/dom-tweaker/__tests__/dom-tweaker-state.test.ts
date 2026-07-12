// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  loadDomTweakerEnabled,
  saveDomTweakerEnabled,
  storageKey_domTweakerEnabled,
} from '../dom-tweaker-state';
import {
  __resetPanelConfigForTests,
  configurePanel,
  type PanelConfig,
} from '../../config/panel-config';
import { installFixturePanelConfig } from '../../__tests__/_test-helpers';

beforeEach(() => {
  installFixturePanelConfig({ domTweaker: {} });
  localStorage.clear();
});

afterEach(() => {
  __resetPanelConfigForTests();
  localStorage.clear();
});

describe('dom-tweaker enabled persistence', () => {
  it('defaults to false when nothing is persisted', () => {
    expect(loadDomTweakerEnabled()).toBe(false);
  });

  it('round-trips true through save → load', () => {
    saveDomTweakerEnabled(true);
    expect(loadDomTweakerEnabled()).toBe(true);
  });

  it('round-trips false through save → load', () => {
    saveDomTweakerEnabled(true);
    saveDomTweakerEnabled(false);
    expect(loadDomTweakerEnabled()).toBe(false);
  });

  it('writes under the storagePrefix-derived key', () => {
    saveDomTweakerEnabled(true);
    expect(localStorage.getItem('zudo-design-token-panel-domtweaker-enabled')).toBe('1');
  });

  it('treats any non-"1" stored value as disabled', () => {
    localStorage.setItem('zudo-design-token-panel-domtweaker-enabled', 'yes');
    expect(loadDomTweakerEnabled()).toBe(false);
  });

  it('derives the no-arg storage key at call time after late configurePanel', () => {
    __resetPanelConfigForTests();
    const cfg: PanelConfig = {
      storagePrefix: 'late-domtweak',
      consoleNamespace: 'lateDomtweak',
      modalClassPrefix: 'late-domtweak-modal',
      schemaId: 'late-domtweak/v1',
      exportFilenameBase: 'late-domtweak',
      tabs: [],
      domTweaker: {},
    };
    configurePanel(cfg);

    localStorage.setItem('late-domtweak-domtweaker-enabled', '1');

    expect(storageKey_domTweakerEnabled()).toBe('late-domtweak-domtweaker-enabled');
    expect(loadDomTweakerEnabled()).toBe(true);
    expect(localStorage.getItem('zudo-design-token-panel-domtweaker-enabled')).toBeNull();
  });
});
