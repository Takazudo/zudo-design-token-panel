import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STORAGE_PREFIX,
  DEFAULT_TOGGLE_EVENT,
  resolveToggleEventName,
} from '../constants';

describe('constants', () => {
  it('resolves the default event for an omitted prefix', () => {
    expect(resolveToggleEventName({})).toBe(DEFAULT_TOGGLE_EVENT);
  });

  it('keeps the default event and ignores a configured override', () => {
    expect(
      resolveToggleEventName({
        storagePrefix: DEFAULT_STORAGE_PREFIX,
        toggleEvent: 'host:toggle',
      }),
    ).toBe(DEFAULT_TOGGLE_EVENT);
  });

  it('derives an event for a custom prefix when no override is supplied', () => {
    expect(resolveToggleEventName({ storagePrefix: 'custom-panel' })).toBe(
      'toggle-custom-panel',
    );
  });

  it('honors an explicit custom event, including an empty string', () => {
    expect(
      resolveToggleEventName({ storagePrefix: 'custom-panel', toggleEvent: 'host:toggle' }),
    ).toBe('host:toggle');
    expect(resolveToggleEventName({ storagePrefix: 'custom-panel', toggleEvent: '' })).toBe('');
  });

  it('has no imports so it remains a leaf module', () => {
    const source = readFileSync(new URL('../constants.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/^\s*import\b/m);
  });
});
