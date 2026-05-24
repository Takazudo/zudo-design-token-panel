// @vitest-environment jsdom

/**
 * Apply-modal DOM-hygiene tests (#150).
 *
 * Asserts:
 * - The modal title renders as role=heading with aria-level=2.
 * - The close role-button fires its handler on Enter and Space keypress.
 * - No semantic tags (button, h2) remain in the modal output.
 *
 * Also asserts Apply button gate (#263):
 * - Button is enabled when non-color-only tweaks are present and both
 *   applyEndpoint and applyRouting are configured (hasRoutableEntries > 0).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { ApplyModal } from '../apply-modal';
import { __resetPanelConfigForTests } from '../config/panel-config';
import { installFixturePanelConfig, FIXTURE_CLUSTER, FIXTURE_TABS } from './_test-helpers';

// ---------------------------------------------------------------------------
// Minimal TweakState fixture (nothing overridden → isEmpty = true)
// ---------------------------------------------------------------------------

function makeEmptyState() {
  const paletteSize = FIXTURE_CLUSTER.paletteSize;
  const palette = Array.from({ length: paletteSize }, () => '#000000');
  return {
    color: {
      palette,
      background: 0,
      foreground: 15,
      cursor: 6,
      selectionBg: 0,
      selectionFg: 15,
      semanticMappings: { accent: 6, muted: 8, active: 14 },
      shikiTheme: 'dracula' as const,
    },
    spacing: {},
    typography: {},
    size: {},
  };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let container: HTMLDivElement;

beforeEach(() => {
  installFixturePanelConfig();
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => render(null, container));
  document.body.removeChild(container);
  __resetPanelConfigForTests();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('apply-modal DOM hygiene', () => {
  it('renders the modal title as role=heading with aria-level=2', () => {
    act(() => {
      render(
        <ApplyModal
          state={makeEmptyState()}
          open={true}
          onClose={() => undefined}
          onApplied={() => undefined}
        />,
        container,
      );
    });

    const heading = container.querySelector('[role="heading"]');
    expect(heading).not.toBeNull();
    expect(heading!.getAttribute('aria-level')).toBe('2');
    expect(heading!.textContent).toContain('Apply design tokens');
  });

  it('close role-button has role=button and tabindex=0', () => {
    act(() => {
      render(
        <ApplyModal
          state={makeEmptyState()}
          open={true}
          onClose={() => undefined}
          onApplied={() => undefined}
        />,
        container,
      );
    });

    const closeBtn = container.querySelector('[aria-label="Close apply modal"]');
    expect(closeBtn).not.toBeNull();
    expect(closeBtn!.getAttribute('role')).toBe('button');
    expect(closeBtn!.getAttribute('tabindex')).toBe('0');
    expect(closeBtn!.tagName.toLowerCase()).toBe('div');
  });

  it('fires onClose when close role-button receives an Enter keydown', () => {
    const onClose = vi.fn();

    act(() => {
      render(
        <ApplyModal
          state={makeEmptyState()}
          open={true}
          onClose={onClose}
          onApplied={() => undefined}
        />,
        container,
      );
    });

    const closeBtn = container.querySelector('[aria-label="Close apply modal"]') as HTMLElement;
    expect(closeBtn).not.toBeNull();

    // Dispatch Enter keydown — triggers onKeyDown → requestClose() → dialog.close()
    // → native 'close' event → handleClose → onClose.
    act(() => {
      closeBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('fires onClose when close role-button receives a Space keydown', () => {
    const onClose = vi.fn();

    act(() => {
      render(
        <ApplyModal
          state={makeEmptyState()}
          open={true}
          onClose={onClose}
          onApplied={() => undefined}
        />,
        container,
      );
    });

    const closeBtn = container.querySelector('[aria-label="Close apply modal"]') as HTMLElement;
    expect(closeBtn).not.toBeNull();

    act(() => {
      closeBtn.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders no h2 elements (replaced by role=heading div)', () => {
    act(() => {
      render(
        <ApplyModal
          state={makeEmptyState()}
          open={true}
          onClose={() => undefined}
          onApplied={() => undefined}
        />,
        container,
      );
    });

    const h2s = container.querySelectorAll('h2');
    expect(h2s.length).toBe(0);
  });

  it('renders no button elements (all replaced by role=button divs)', () => {
    act(() => {
      render(
        <ApplyModal
          state={makeEmptyState()}
          open={true}
          onClose={() => undefined}
          onApplied={() => undefined}
        />,
        container,
      );
    });

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(0);
  });

  it('renders no p elements (replaced by divs)', () => {
    act(() => {
      render(
        <ApplyModal
          state={makeEmptyState()}
          open={true}
          onClose={() => undefined}
          onApplied={() => undefined}
        />,
        container,
      );
    });

    const ps = container.querySelectorAll('p');
    expect(ps.length).toBe(0);
  });

  it('renders no header elements (replaced by divs)', () => {
    act(() => {
      render(
        <ApplyModal
          state={makeEmptyState()}
          open={true}
          onClose={() => undefined}
          onApplied={() => undefined}
        />,
        container,
      );
    });

    const headers = container.querySelectorAll('header');
    expect(headers.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Apply button gate — non-color-only payloads (#263)
//
// The Apply button (`aria-disabled`) must be absent (enabled) when:
//   1. At least one non-color token is overridden (non-empty diff → !isEmpty)
//   2. The diff produces at least one routable group (hasRoutableEntries > 0)
//   3. Both applyEndpoint and applyRouting are configured (applyConfigured)
// ---------------------------------------------------------------------------

describe('apply-modal Apply button gate — non-color-only payloads (#263)', () => {
  it('button is enabled when only a spacing token is tweaked and routing covers it', () => {
    // Install a panel config that has applyEndpoint + routing.
    // The spacing tab token cssVar is `--zd-spacing-hgap-md` (from FIXTURE_TABS),
    // so any routing prefix that matches `zd-spacing` or `zd` will produce a
    // routable group.
    installFixturePanelConfig({
      applyEndpoint: '/api/dev/design-tokens-apply',
      applyRouting: { zd: 'src/styles/tokens.css' },
      tabs: FIXTURE_TABS,
    });

    const paletteSize = FIXTURE_CLUSTER.paletteSize;
    const palette = Array.from({ length: paletteSize }, () => '#000000');
    const colorDefaults = {
      palette,
      background: 0,
      foreground: 15,
      cursor: 6,
      selectionBg: 0,
      selectionFg: 15,
      semanticMappings: { accent: 6, muted: 8, active: 14 },
      shikiTheme: 'dracula' as const,
    };
    // State with only a spacing tweak — color is identical to defaults.
    const state = {
      color: colorDefaults,
      spacing: { 'hsp-md': '24px' },
      typography: {},
      size: {},
    };

    act(() => {
      render(
        <ApplyModal
          state={state}
          colorDefaults={colorDefaults}
          open={true}
          onClose={() => undefined}
          onApplied={() => undefined}
        />,
        container,
      );
    });

    // The primary Apply button is the role=button inside the actions area.
    // When enabled, aria-disabled is absent (not set to "true").
    const buttons = container.querySelectorAll('[role="button"]');
    const primaryBtn = Array.from(buttons).find((btn) =>
      btn.className.includes('primary') ||
      // Fallback: look for the first non-close role=button
      !btn.hasAttribute('aria-label'),
    );
    // If the button is disabled, it has aria-disabled="true".
    // Verify it is NOT disabled.
    expect(primaryBtn).not.toBeNull();
    expect(primaryBtn!.getAttribute('aria-disabled')).not.toBe('true');
  });

  it('button is enabled when only a size/radius token is tweaked and routing covers it', () => {
    // `--radius-lg` uses prefix `radius`; configure routing accordingly.
    installFixturePanelConfig({
      applyEndpoint: '/api/dev/design-tokens-apply',
      applyRouting: { radius: 'src/styles/tokens.css' },
      tabs: FIXTURE_TABS,
    });

    const paletteSize = FIXTURE_CLUSTER.paletteSize;
    const palette = Array.from({ length: paletteSize }, () => '#000000');
    const colorDefaults = {
      palette,
      background: 0,
      foreground: 15,
      cursor: 6,
      selectionBg: 0,
      selectionFg: 15,
      semanticMappings: { accent: 6, muted: 8, active: 14 },
      shikiTheme: 'dracula' as const,
    };
    const state = {
      color: colorDefaults,
      spacing: {},
      typography: {},
      size: { 'radius-lg': '16px' },
    };

    act(() => {
      render(
        <ApplyModal
          state={state}
          colorDefaults={colorDefaults}
          open={true}
          onClose={() => undefined}
          onApplied={() => undefined}
        />,
        container,
      );
    });

    const buttons = container.querySelectorAll('[role="button"]');
    const primaryBtn = Array.from(buttons).find((btn) =>
      !btn.hasAttribute('aria-label'),
    );
    expect(primaryBtn).not.toBeNull();
    expect(primaryBtn!.getAttribute('aria-disabled')).not.toBe('true');
  });

  it('button is disabled when non-color token is tweaked but routing does not cover the prefix', () => {
    // applyEndpoint is set but applyRouting has no entry for `radius` prefix.
    installFixturePanelConfig({
      applyEndpoint: '/api/dev/design-tokens-apply',
      applyRouting: { zd: 'src/styles/tokens.css' },
      tabs: FIXTURE_TABS,
    });

    const paletteSize = FIXTURE_CLUSTER.paletteSize;
    const palette = Array.from({ length: paletteSize }, () => '#000000');
    const colorDefaults = {
      palette,
      background: 0,
      foreground: 15,
      cursor: 6,
      selectionBg: 0,
      selectionFg: 15,
      semanticMappings: { accent: 6, muted: 8, active: 14 },
      shikiTheme: 'dracula' as const,
    };
    const state = {
      color: colorDefaults,
      spacing: {},
      typography: {},
      // `--radius-lg` uses the `radius` prefix which is not in the routing map.
      size: { 'radius-lg': '16px' },
    };

    act(() => {
      render(
        <ApplyModal
          state={state}
          colorDefaults={colorDefaults}
          open={true}
          onClose={() => undefined}
          onApplied={() => undefined}
        />,
        container,
      );
    });

    const buttons = container.querySelectorAll('[role="button"]');
    const primaryBtn = Array.from(buttons).find((btn) =>
      !btn.hasAttribute('aria-label'),
    );
    expect(primaryBtn).not.toBeNull();
    // Button should be disabled because hasRoutableEntries = 0 (no routable group).
    expect(primaryBtn!.getAttribute('aria-disabled')).toBe('true');
  });
});
