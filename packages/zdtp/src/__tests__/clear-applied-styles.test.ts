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
import { FIXTURE_CLUSTER, installFixturePanelConfig } from './_test-helpers';
import {
  applyFullState,
  clearAppliedColorStyles,
  clearAppliedStyles,
  initColorFromScheme,
  type ColorTweakState,
} from '../state/tweak-state';

/**
 * A full TweakState whose primary cluster carries a per-mode `light-dark()`
 * literal, so the real apply path (`applyFullState`) writes
 * `color-scheme: light dark` to :root AND records this instance as its owner
 * (#501). Poking `document.documentElement.style.setProperty('color-scheme',…)`
 * directly is NOT equivalent post-#501: the clear paths only remove a
 * `color-scheme` the panel itself wrote.
 */
function perModeFullState() {
  const color: ColorTweakState = {
    ...initColorFromScheme(FIXTURE_CLUSTER),
    semanticMappings: {
      ...initColorFromScheme(FIXTURE_CLUSTER).semanticMappings,
      accent: { literal: { light: '#ff0000', dark: '#990000' } },
    },
  };
  return { color, spacing: {}, typography: {}, size: {} } as const;
}

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
  // removed it before that fix, leaving it lingering after a Reset even
  // though every color var it was serving had just been wiped.
  //
  // #501 — these two now apply through the REAL path (`applyFullState` with a
  // per-mode-literal state) so the panel actually owns the `color-scheme` it
  // later clears. A directly-poked `color-scheme` the panel never wrote is
  // deliberately left alone by the clear paths now (see
  // issue-501-color-scheme-ownership.test.ts).
  it('clearAppliedColorStyles removes a panel-written color-scheme left by a per-mode literal apply', () => {
    applyFullState(perModeFullState());
    expect(readVar('color-scheme')).toBe('light dark');

    clearAppliedColorStyles();

    expect(readVar('color-scheme')).toBe('');
  });

  it('clearAppliedStyles removes a panel-written color-scheme left by a per-mode literal apply', () => {
    applyFullState(perModeFullState());
    expect(readVar('color-scheme')).toBe('light dark');

    clearAppliedStyles();

    expect(readVar('color-scheme')).toBe('');
  });
});
