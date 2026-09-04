import { beforeEach, describe, expect, it } from 'vitest';
import { loadLastApplied, saveLastApplied, unsavedCssVars } from '../last-applied';
import { FIXTURE_PANEL_CONFIG } from '../../__tests__/_test-helpers';

describe('last applied baseline', () => {
  beforeEach(() => localStorage.clear());

  it('persists per instance and compares structurally', () => {
    saveLastApplied({ '--a': '1' }, FIXTURE_PANEL_CONFIG);
    expect(loadLastApplied(FIXTURE_PANEL_CONFIG)).toEqual({ '--a': '1' });
    expect(unsavedCssVars({ '--a': '1' }, { '--a': '1' })).toEqual([]);
    expect(unsavedCssVars({ '--a': '2', '--b': '3' }, { '--a': '1' })).toEqual(['--a', '--b']);
  });
});
// @vitest-environment jsdom
