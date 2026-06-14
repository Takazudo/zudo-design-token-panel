// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadElementPathEnabled,
  saveElementPathEnabled,
} from '../element-path-state';
import { __resetPanelConfigForTests } from '../../config/panel-config';
import { installFixturePanelConfig } from '../../__tests__/_test-helpers';

beforeEach(() => {
  installFixturePanelConfig();
  localStorage.clear();
});

afterEach(() => {
  __resetPanelConfigForTests();
  localStorage.clear();
});

describe('element-path enabled persistence', () => {
  it('defaults to false when nothing is persisted', () => {
    expect(loadElementPathEnabled()).toBe(false);
  });

  it('round-trips true through save → load', () => {
    saveElementPathEnabled(true);
    expect(loadElementPathEnabled()).toBe(true);
  });

  it('round-trips false through save → load', () => {
    saveElementPathEnabled(true);
    saveElementPathEnabled(false);
    expect(loadElementPathEnabled()).toBe(false);
  });

  it('writes under the storagePrefix-derived key', () => {
    saveElementPathEnabled(true);
    expect(localStorage.getItem('zudo-design-token-panel-elpath-enabled')).toBe('1');
  });

  it('treats any non-"1" stored value as disabled', () => {
    localStorage.setItem('zudo-design-token-panel-elpath-enabled', 'yes');
    expect(loadElementPathEnabled()).toBe(false);
  });
});
