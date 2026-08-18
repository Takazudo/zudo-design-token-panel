// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shouldAutoload, setAutoload, rememberAutoload, clearAutoload } from '../autoload-state';
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

  it('returns false when stored value is an arbitrary string (not "1"/"auto")', () => {
    localStorage.setItem('zudo-design-token-panel:autoload', 'yes');
    expect(shouldAutoload(DEFAULT_CFG)).toBe(false);
  });

  it('returns false for a near-miss of the auto-remembered value', () => {
    localStorage.setItem('zudo-design-token-panel:autoload', 'AUTO');
    expect(shouldAutoload(DEFAULT_CFG)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Provenance value matrix (#576)
// ---------------------------------------------------------------------------

describe('shouldAutoload — provenance value matrix', () => {
  it('returns true for the explicit-owner value "1"', () => {
    localStorage.setItem('zudo-design-token-panel:autoload', '1');
    expect(shouldAutoload(DEFAULT_CFG)).toBe(true);
  });

  it('returns true for the auto-remembered value "auto"', () => {
    localStorage.setItem('zudo-design-token-panel:autoload', 'auto');
    expect(shouldAutoload(DEFAULT_CFG)).toBe(true);
  });
});

describe('rememberAutoload — auto-remembered provenance', () => {
  it('writes "auto" when no flag is stored', () => {
    rememberAutoload(DEFAULT_CFG);
    expect(localStorage.getItem('zudo-design-token-panel:autoload')).toBe('auto');
  });

  it('makes shouldAutoload true', () => {
    rememberAutoload(DEFAULT_CFG);
    expect(shouldAutoload(DEFAULT_CFG)).toBe(true);
  });

  it('does NOT downgrade an existing explicit "1"', () => {
    setAutoload(DEFAULT_CFG, true);
    rememberAutoload(DEFAULT_CFG);
    expect(localStorage.getItem('zudo-design-token-panel:autoload')).toBe('1');
  });

  it('is idempotent — a second call leaves "auto" in place', () => {
    rememberAutoload(DEFAULT_CFG);
    rememberAutoload(DEFAULT_CFG);
    expect(localStorage.getItem('zudo-design-token-panel:autoload')).toBe('auto');
  });

  it('overwrites a disarmed "0" (opening the panel re-arms autoload)', () => {
    setAutoload(DEFAULT_CFG, false);
    rememberAutoload(DEFAULT_CFG);
    expect(localStorage.getItem('zudo-design-token-panel:autoload')).toBe('auto');
  });

  it('is cleared by clearAutoload like any other value', () => {
    rememberAutoload(DEFAULT_CFG);
    clearAutoload(DEFAULT_CFG);
    expect(localStorage.getItem('zudo-design-token-panel:autoload')).toBeNull();
    expect(shouldAutoload(DEFAULT_CFG)).toBe(false);
  });

  it('an explicit enable after auto-remember upgrades "auto" to "1"', () => {
    rememberAutoload(DEFAULT_CFG);
    setAutoload(DEFAULT_CFG, true);
    expect(localStorage.getItem('zudo-design-token-panel:autoload')).toBe('1');
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

  it('rememberAutoload is a no-op in SSR environment (no throw)', () => {
    vi.stubGlobal('window', undefined);
    expect(() => rememberAutoload(DEFAULT_CFG)).not.toThrow();
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

  it('rememberAutoload does not throw when localStorage.setItem throws (quota exceeded)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => rememberAutoload(DEFAULT_CFG)).not.toThrow();
  });

  it('rememberAutoload does not throw when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(() => rememberAutoload(DEFAULT_CFG)).not.toThrow();
  });

  it('clearAutoload does not throw when localStorage.removeItem throws', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(() => clearAutoload(DEFAULT_CFG)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// autoRememberOnOpen gate (#578)
// ---------------------------------------------------------------------------

describe('rememberAutoload — autoRememberOnOpen: false gate', () => {
  it('does not write the flag when no value is stored', () => {
    const cfg: PanelConfig = { ...DEFAULT_CFG, autoRememberOnOpen: false };
    rememberAutoload(cfg);
    expect(localStorage.getItem('zudo-design-token-panel:autoload')).toBeNull();
    expect(shouldAutoload(cfg)).toBe(false);
  });

  it('leaves no :autoload key after an open+close cycle (open never persists)', () => {
    const cfg: PanelConfig = { ...DEFAULT_CFG, autoRememberOnOpen: false };
    rememberAutoload(cfg); // simulated open
    clearAutoload(cfg); // simulated close teardown (no-op here since nothing was written)
    expect(localStorage.getItem('zudo-design-token-panel:autoload')).toBeNull();
  });

  it('does not clobber an existing explicit "1" (still a no-op, value untouched)', () => {
    const cfg: PanelConfig = { ...DEFAULT_CFG, autoRememberOnOpen: false };
    setAutoload(cfg, true);
    rememberAutoload(cfg);
    expect(localStorage.getItem('zudo-design-token-panel:autoload')).toBe('1');
  });

  it('does not throw in SSR environment (window undefined)', () => {
    const cfg: PanelConfig = { ...DEFAULT_CFG, autoRememberOnOpen: false };
    vi.stubGlobal('window', undefined);
    expect(() => rememberAutoload(cfg)).not.toThrow();
  });
});

describe('rememberAutoload — autoRememberOnOpen default / explicit true', () => {
  it('omitted (default) still writes "auto"', () => {
    const cfg: PanelConfig = { ...DEFAULT_CFG };
    delete (cfg as { autoRememberOnOpen?: boolean }).autoRememberOnOpen;
    rememberAutoload(cfg);
    expect(localStorage.getItem('zudo-design-token-panel:autoload')).toBe('auto');
  });

  it('explicit true still writes "auto"', () => {
    const cfg: PanelConfig = { ...DEFAULT_CFG, autoRememberOnOpen: true };
    rememberAutoload(cfg);
    expect(localStorage.getItem('zudo-design-token-panel:autoload')).toBe('auto');
  });
});

describe('enableAutoload path (setAutoload) — unaffected by autoRememberOnOpen: false', () => {
  it('setAutoload(cfg, true) still writes "1" regardless of autoRememberOnOpen', () => {
    const cfg: PanelConfig = { ...DEFAULT_CFG, autoRememberOnOpen: false };
    setAutoload(cfg, true);
    expect(localStorage.getItem('zudo-design-token-panel:autoload')).toBe('1');
    expect(shouldAutoload(cfg)).toBe(true);
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

  it('rememberAutoload writes "auto" under the custom-prefix key only', () => {
    const customCfg: PanelConfig = { ...DEFAULT_CFG, storagePrefix: 'foo' };
    rememberAutoload(customCfg);
    expect(localStorage.getItem('foo:autoload')).toBe('auto');
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
