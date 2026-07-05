// @vitest-environment jsdom

/**
 * `clearAppliedColorStyles` vs `clearAppliedStyles` — the scheme-change clear
 * split introduced for #347.
 *
 * Background: a host light/dark toggle (`color-scheme-changed`) re-seeds the
 * absolute color palette, but spacing / typography / size tweaks are
 * scheme-INDEPENDENT and must survive the toggle. The panel's scheme-change
 * handler therefore clears only the color cluster vars via
 * `clearAppliedColorStyles`, while a full panel reset (Reset / Apply) uses
 * `clearAppliedStyles` to wipe everything.
 *
 * These tests pin the contract directly on `document.documentElement` inline
 * vars so a regression that re-broadens the scheme-change wipe is caught.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __resetPanelConfigForTests } from '../config/panel-config';
import { installFixturePanelConfig } from './_test-helpers';
import { clearAppliedColorStyles, clearAppliedStyles } from '../state/tweak-state';

// CSS vars written by FIXTURE_CLUSTER / FIXTURE_TABS (see _test-helpers.ts).
const COLOR_VARS = ['--fixture-p0', '--fixture-p6', '--fixture-semantic-accent'];
const NON_COLOR_VARS = ['--zd-spacing-hgap-md', '--zd-font-base-size', '--radius-lg'];

/** Apply representative color + non-color inline vars to `:root`. */
function seedAppliedVars(): void {
  const root = document.documentElement;
  root.style.setProperty('--fixture-p0', '#111111');
  root.style.setProperty('--fixture-p6', '#666666');
  root.style.setProperty('--fixture-semantic-accent', '#abcdef');
  root.style.setProperty('--zd-spacing-hgap-md', '40px');
  root.style.setProperty('--zd-font-base-size', '1.4rem');
  root.style.setProperty('--radius-lg', '8px');
}

function readVar(name: string): string {
  return document.documentElement.style.getPropertyValue(name);
}

describe('clearAppliedColorStyles / clearAppliedStyles split (#347)', () => {
  beforeEach(() => {
    installFixturePanelConfig();
    document.documentElement.removeAttribute('style');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('style');
    __resetPanelConfigForTests();
  });

  it('clearAppliedColorStyles removes color cluster vars but preserves spacing/font/size vars', () => {
    seedAppliedVars();

    clearAppliedColorStyles();

    // Color cluster vars are gone.
    for (const v of COLOR_VARS) {
      expect(readVar(v)).toBe('');
    }
    // Non-color tweaks survive the color-only clear — this is the #347 fix.
    expect(readVar('--zd-spacing-hgap-md')).toBe('40px');
    expect(readVar('--zd-font-base-size')).toBe('1.4rem');
    expect(readVar('--radius-lg')).toBe('8px');
  });

  it('clearAppliedStyles removes both color cluster vars AND spacing/font/size vars', () => {
    seedAppliedVars();

    clearAppliedStyles();

    for (const v of [...COLOR_VARS, ...NON_COLOR_VARS]) {
      expect(readVar(v)).toBe('');
    }
  });

  // #474 (S13) — a per-mode literal semantic value (#472) causes the apply
  // path to set `color-scheme: light dark` on :root. Neither clear path
  // removed it before this fix, leaving it lingering after a Reset even
  // though every color var it was serving had just been wiped.
  it('clearAppliedColorStyles also removes a lingering color-scheme left by a per-mode literal apply', () => {
    seedAppliedVars();
    document.documentElement.style.setProperty('color-scheme', 'light dark');

    clearAppliedColorStyles();

    expect(readVar('color-scheme')).toBe('');
  });

  it('clearAppliedStyles also removes a lingering color-scheme left by a per-mode literal apply', () => {
    seedAppliedVars();
    document.documentElement.style.setProperty('color-scheme', 'light dark');

    clearAppliedStyles();

    expect(readVar('color-scheme')).toBe('');
  });
});
