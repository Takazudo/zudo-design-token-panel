import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { zudoDocConfigs } from '../../../../playground/config/zudo-doc-manifest.generated';
import DesignTokenTweakPanel from '../panel';
import { assertValidPanelConfig, type PanelConfig } from '../config/panel-config';
import { getOpenKey } from '../state/tweak-state';

let container: HTMLDivElement | undefined;

async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
  });
}

async function verifyEveryTab(config: PanelConfig): Promise<void> {
  assertValidPanelConfig(config);
  localStorage.setItem(getOpenKey(config), '1');
  const mountContainer = document.createElement('div');
  container = mountContainer;
  document.body.appendChild(mountContainer);

  act(() => render(<DesignTokenTweakPanel instanceConfig={config} />, mountContainer));
  await settle();

  for (const tab of config.tabs) {
    const trigger = Array.from(mountContainer.querySelectorAll<HTMLElement>('[role="tab"]'))
      .find((candidate) => candidate.textContent?.trim() === tab.label);
    expect(trigger, `missing tab trigger for ${tab.id}`).toBeDefined();
    act(() => trigger?.click());
    await settle();

    const panel = mountContainer.querySelector<HTMLElement>(
      `[role="tabpanel"][aria-labelledby="${trigger?.id}"]`,
    );
    expect(panel?.hidden, `${tab.id} tab panel should be visible`).toBe(false);
    expect(
      panel?.querySelectorAll('[role="heading"][aria-level="3"]').length,
      `${tab.id} should render exactly one heading per tier`,
    ).toBe(tab.tiers.length);
  }
}

afterEach(() => {
  if (container) {
    const mountContainer = container;
    act(() => render(null, mountContainer));
    mountContainer.remove();
    container = undefined;
  }
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('vendored zudo-doc consumer manifest', () => {
  for (const mode of ['light', 'dark'] as const) {
    it(`validates and renders every ${mode} tab without console errors`, async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const windowErrors: string[] = [];
      const onError = (event: ErrorEvent) => windowErrors.push(event.message);
      window.addEventListener('error', onError);
      try {
        await verifyEveryTab(zudoDocConfigs[mode]);
      } finally {
        window.removeEventListener('error', onError);
      }
      expect(windowErrors).toEqual([]);
      expect(consoleError).not.toHaveBeenCalled();
    });
  }
});
