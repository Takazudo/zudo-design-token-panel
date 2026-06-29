// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shouldAutoload, setAutoload, clearAutoload } from '../autoload-state';
import { __resetPanelConfigForTests, type PanelConfig } from '../../config/panel-config';
import { installFixturePanelConfig, FIXTURE_PANEL_CONFIG } from '../../__tests__/_test-helpers';

const DEFAULT_CFG: PanelConfig = FIXTURE_PANEL_CONFIG;

beforeEach(() => {
  installFixturePanelConfig();
  localStorage.clear();
});

afterEach(() => {
  __resetPanelConfigForTests();
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('shouldAutoload — default false', () => {
  it('returns false when nothing is persisted (no value in storage)', () => {
    expect(shouldAutoload(DEFAULT_CFG)).toBe(false);
  });

  it('returns false when stored value is "0"', () => {
    localStorage.setItem('zudo-design-token-panel:autoload', '0');
    expect(shouldAutoload(DEFAULT_CFG)).toBe(false);
  });

  it('returns false when stored value is an arbitrary string (not "1")', () => {
    localStorage.setItem('zudo-design-token-panel:autoload', 'yes');
    expect(shouldAutoload(DEFAULT_CFG)).toBe(false);
  });
});

describe('shouldAutoload / setAutoload — read-write round-trip', () => {
  it('returns true after setAutoload(cfg, true)', () => {
    setAutoload(DEFAULT_CFG, true);
    expect(shouldAutoload(DEFAULT_CFG)).toBe(true);
  });

  it('returns false after setAutoload(cfg, false)', () => {
    setAutoload(DEFAULT_CFG, true);
    setAutoload(DEFAULT_CFG, false);
    expect(shouldAutoload(DEFAULT_CFG)).toBe(false);
  });

  it('returns false after clearAutoload', () => {
    setAutoload(DEFAULT_CFG, true);
    clearAutoload(DEFAULT_CFG);
    expect(shouldAutoload(DEFAULT_CFG)).toBe(false);
  });
});

describe('setAutoload — storage key shape', () => {
  it('writes "1" under the correct colon-separated key when on=true', () => {
    setAutoload(DEFAULT_CFG, true);
    expect(localStorage.getItem('zudo-design-token-panel:autoload')).toBe('1');
  });

  it('writes "0" under the correct colon-separated key when on=false', () => {
    setAutoload(DEFAULT_CFG, false);
    expect(localStorage.getItem('zudo-design-token-panel:autoload')).toBe('0');
  });
});

describe('SSR tolerance (no window)', () => {
  it('shouldAutoload returns false in SSR environment (window undefined)', () => {
    vi.stubGlobal('window', undefined);
    expect(shouldAutoload(DEFAULT_CFG)).toBe(false);
  });

  it('setAutoload is a no-op in SSR environment (no throw)', () => {
    vi.stubGlobal('window', undefined);
    expect(() => setAutoload(DEFAULT_CFG, true)).not.toThrow();
  });

  it('clearAutoload is a no-op in SSR environment (no throw)', () => {
    vi.stubGlobal('window', undefined);
    expect(() => clearAutoload(DEFAULT_CFG)).not.toThrow();
  });
});

describe('quota-throw tolerance', () => {
  it('shouldAutoload returns false when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(shouldAutoload(DEFAULT_CFG)).toBe(false);
  });

  it('setAutoload does not throw when localStorage.setItem throws (quota exceeded)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => setAutoload(DEFAULT_CFG, true)).not.toThrow();
  });

  it('clearAutoload does not throw when localStorage.removeItem throws', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(() => clearAutoload(DEFAULT_CFG)).not.toThrow();
  });
});

describe('custom storagePrefix', () => {
  it('uses the custom prefix in the storage key (key is foo:autoload)', () => {
    const customCfg: PanelConfig = { ...DEFAULT_CFG, storagePrefix: 'foo' };
    setAutoload(customCfg, true);
    expect(localStorage.getItem('foo:autoload')).toBe('1');
  });

  it('shouldAutoload reads from the custom-prefix key, not the default', () => {
    const customCfg: PanelConfig = { ...DEFAULT_CFG, storagePrefix: 'foo' };
    setAutoload(customCfg, true);
    expect(shouldAutoload(customCfg)).toBe(true);
    // Default-prefix key must remain untouched
    expect(localStorage.getItem('zudo-design-token-panel:autoload')).toBeNull();
  });

  it('clearAutoload removes the custom-prefix key', () => {
    const customCfg: PanelConfig = { ...DEFAULT_CFG, storagePrefix: 'foo' };
    setAutoload(customCfg, true);
    clearAutoload(customCfg);
    expect(localStorage.getItem('foo:autoload')).toBeNull();
    expect(shouldAutoload(customCfg)).toBe(false);
  });
});
