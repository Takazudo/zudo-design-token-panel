// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __resetHostMutationsForTests,
  claimHostDock,
  releaseHostMutations,
} from '../host-mutations';

describe('host mutation ownership', () => {
  beforeEach(() => {
    document.body.removeAttribute('style');
    document.documentElement.removeAttribute('style');
  });

  afterEach(() => __resetHostMutationsForTests());

  it('captures and restores body margin and root inset values including priority', () => {
    document.body.style.setProperty('margin-right', '13px', 'important');
    document.documentElement.style.setProperty('--zdtp-dock-inset-right', '2rem', 'important');

    expect(claimHostDock('a', 'right', 440)).toBe(true);
    expect(document.body.style.getPropertyValue('margin-right')).toBe('440px');
    expect(document.documentElement.style.getPropertyValue('--zdtp-dock-inset-right')).toBe('440px');

    releaseHostMutations('a');
    expect(document.body.style.getPropertyValue('margin-right')).toBe('13px');
    expect(document.body.style.getPropertyPriority('margin-right')).toBe('important');
    expect(document.documentElement.style.getPropertyValue('--zdtp-dock-inset-right')).toBe('2rem');
    // jsdom does not retain priorities for custom properties; the body
    // declaration above exercises exact priority capture/restoration here.
  });

  it('updates a same-owner claim without replacing its original snapshot', () => {
    document.body.style.marginBottom = '7px';
    expect(claimHostDock('a', 'bottom', 340)).toBe(true);
    expect(claimHostDock('a', 'bottom', 410)).toBe(true);
    releaseHostMutations('a');
    expect(document.body.style.marginBottom).toBe('7px');
  });

  it('rejects a second owner on the same edge but allows the other edge', () => {
    expect(claimHostDock('a', 'right', 440)).toBe(true);
    expect(claimHostDock('b', 'right', 500)).toBe(false);
    expect(claimHostDock('b', 'bottom', 340)).toBe(true);
  });

  it('publishes the inset without changing the body margin when reflow is none', () => {
    document.body.style.setProperty('margin-right', '9px', 'important');
    expect(claimHostDock('a', 'right', 440, 'none')).toBe(true);
    expect(document.body.style.getPropertyValue('margin-right')).toBe('9px');
    expect(document.body.style.getPropertyPriority('margin-right')).toBe('important');
    expect(document.documentElement.style.getPropertyValue('--zdtp-dock-inset-right')).toBe('440px');
  });
});
