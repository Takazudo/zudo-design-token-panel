// @vitest-environment browser

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import type { ComponentChildren } from 'preact';
import DesignTokenTweakPanel from '../../panel';
import type { PanelConfig } from '../../config/panel-config';
import { getOpenKey, saveSize } from '../../state/tweak-state';
import { ElementPathOrchestrator } from '../../element-path/element-path-orchestrator';
import { ElementPathToggleButton } from '../../element-path/element-path-toggle-button';
import {
  __resetArmingCoordinatorForTests,
  getCurrentArmingOwnerForTests,
} from '../../picker/arming-coordinator';
import { DOM_TWEAKER_PORTAL_MOUNT_ID, ELPATH_PORTAL_MOUNT_ID } from '../../highlight/find-elements';
import { DomTweakerOrchestrator } from '../dom-tweaker-orchestrator';
import { DomTweakerToggleButton } from '../dom-tweaker-toggle-button';
import { resetAll } from '../lazy/edit-session';
import { DOM_TWEAKER_STYLE_ID } from '../lazy/style-injection';

const DOM_TWEAKER_OWNER_SYMBOL = Symbol.for('@takazudo/zdtp:dom-tweaker-owner');

const THEME_CSS = `
@theme {
  --color-brand: #7c3aed;
}
`;

let containers: HTMLDivElement[] = [];
let createdElements: HTMLElement[] = [];

function makeConfig(storagePrefix: string): PanelConfig {
  return {
    storagePrefix,
    consoleNamespace: `${storagePrefix}Ns`,
    modalClassPrefix: 'zudo-design-token-panel-modal',
    schemaId: `${storagePrefix}/v1`,
    exportFilenameBase: storagePrefix,
    tabs: [],
    domTweaker: { themeCss: THEME_CSS },
  };
}

function resetDomTweakerOwnerForTests(): void {
  const doc = document as unknown as Record<symbol, { ownerStoragePrefix: string | null } | undefined>;
  const state = doc[DOM_TWEAKER_OWNER_SYMBOL];
  if (state) state.ownerStoragePrefix = null;
}

function createContainer(): HTMLDivElement {
  const container = document.createElement('div');
  document.body.append(container);
  containers.push(container);
  return container;
}

function createFixtureElement(className = 'px-2 rounded-md'): HTMLElement {
  const el = document.createElement('div');
  el.id = `dom-tweaker-fixture-${createdElements.length}`;
  el.className = className;
  el.textContent = 'Fixture target';
  el.style.cssText = [
    'position:fixed',
    'left:40px',
    'top:60px',
    'width:140px',
    'height:60px',
    'background:rgb(20 80 140)',
  ].join(';');
  document.body.append(el);
  createdElements.push(el);
  return el;
}

function renderDomTweakerHarness(
  cfg: PanelConfig,
  children: ComponentChildren = <DomTweakerToggleButton />,
): HTMLDivElement {
  const container = createContainer();
  act(() => {
    render(
      <DomTweakerOrchestrator instanceConfig={cfg}>{children}</DomTweakerOrchestrator>,
      container,
    );
  });
  return container;
}

function renderMutualExclusionHarness(cfg: PanelConfig): HTMLDivElement {
  const container = createContainer();
  act(() => {
    render(
      <ElementPathOrchestrator>
        <DomTweakerOrchestrator instanceConfig={cfg}>
          <ElementPathToggleButton />
          <DomTweakerToggleButton />
        </DomTweakerOrchestrator>
      </ElementPathOrchestrator>,
      container,
    );
  });
  return container;
}

function movePointerTo(x: number, y: number): void {
  document.dispatchEvent(
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: x,
      clientY: y,
    }),
  );
}

function pressAlt(): void {
  window.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Alt',
      altKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
}

function releaseAlt(): void {
  window.dispatchEvent(
    new KeyboardEvent('keyup', {
      key: 'Alt',
      altKey: false,
      bubbles: true,
      cancelable: true,
    }),
  );
}

function clickAt(el: Element, x: number, y: number): void {
  el.dispatchEvent(
    new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
    }),
  );
  el.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
    }),
  );
}

function inputText(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function key(target: Element, keyName: string): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: keyName,
      bubbles: true,
      cancelable: true,
    }),
  );
}

async function frame(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

async function flushEffects(): Promise<void> {
  await frame();
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
}

async function waitForAssertion(assertion: () => void, timeoutMs = 5_000): Promise<void> {
  const startedAt = performance.now();
  let lastError: unknown;

  while (performance.now() - startedAt < timeoutMs) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise<void>((resolve) => setTimeout(resolve, 25));
    }
  }

  if (lastError) throw lastError;
  assertion();
}

async function enableDomTweaker(container: ParentNode): Promise<HTMLElement> {
  const toggle = container.querySelector<HTMLElement>('.tokenpanel-domtweaker-toggle')!;
  act(() => {
    toggle.click();
  });
  await waitForAssertion(() => {
    expect(toggle.classList.contains('is-active')).toBe(true);
    expect(toggle.classList.contains('is-ready')).toBe(true);
  });
  return toggle;
}

async function pickFixtureElement(target: Element): Promise<void> {
  act(() => {
    movePointerTo(50, 70);
    pressAlt();
  });
  await waitForAssertion(() => {
    expect(document.querySelector('.tokenpanel-domtweaker-picker-box')).not.toBeNull();
  });
  act(() => {
    clickAt(target, 50, 70);
    releaseAlt();
  });
  await waitForAssertion(() => {
    expect(document.querySelector('.tokenpanel-domtweaker-edit-button')).not.toBeNull();
  });
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
  containers = [];
  createdElements = [];
  resetDomTweakerOwnerForTests();
  __resetArmingCoordinatorForTests();
  resetAll();
});

afterEach(async () => {
  for (const container of containers) {
    act(() => {
      render(null, container);
    });
    container.remove();
  }
  containers = [];
  for (const el of createdElements) el.remove();
  createdElements = [];
  document.getElementById(DOM_TWEAKER_PORTAL_MOUNT_ID)?.remove();
  document.getElementById(ELPATH_PORTAL_MOUNT_ID)?.remove();
  document.getElementById(DOM_TWEAKER_STYLE_ID)?.remove();
  document.documentElement.classList.remove('tokenpanel-domtweaker-inspecting');
  document.documentElement.classList.remove('tokenpanel-elpath-inspecting');
  resetDomTweakerOwnerForTests();
  __resetArmingCoordinatorForTests();
  resetAll();
  localStorage.clear();
  vi.restoreAllMocks();
  await flushEffects();
});

describe.sequential('DOM Tweaker orchestration', () => {
  it('runs the enable → Alt-click → editor → class add → diff export flow', async () => {
    const cfg = makeConfig('domtweak-flow');
    const target = createFixtureElement();
    const container = renderDomTweakerHarness(cfg);
    await flushEffects();

    await enableDomTweaker(container);
    await waitForAssertion(() => {
      expect(getComputedStyle(target).paddingLeft).toBe('8px');
    });

    await pickFixtureElement(target);

    act(() => {
      document.querySelector<HTMLElement>('.tokenpanel-domtweaker-edit-button')!.click();
    });
    await waitForAssertion(() => {
      expect(document.querySelector('.tokenpanel-domtweaker-popover')).not.toBeNull();
    });

    const input = document.querySelector<HTMLInputElement>('.tokenpanel-domtweaker-popover__input')!;
    act(() => {
      inputText(input, 'px-24');
    });
    await frame();
    act(() => {
      key(input, 'Enter');
    });

    await waitForAssertion(() => {
      expect(target.classList.contains('px-2')).toBe(false);
      expect(target.classList.contains('px-24')).toBe(true);
      expect(getComputedStyle(target).paddingLeft).toBe('96px');
    });

    act(() => {
      container.querySelector<HTMLElement>('.tokenpanel-domtweaker-diff-button')!.click();
    });

    await waitForAssertion(() => {
      const textarea = document.querySelector<HTMLTextAreaElement>(
        '[aria-label="DOM Tweaker session diff"]',
      );
      expect(textarea?.value).toContain('selector:');
      expect(textarea?.value).toContain('-px-2');
      expect(textarea?.value).toContain('+px-24');
    });
  });

  it('disable closes the editor, unpins, and stops picking', async () => {
    const cfg = makeConfig('domtweak-disable');
    const target = createFixtureElement();
    const container = renderDomTweakerHarness(cfg);
    await flushEffects();

    const toggle = await enableDomTweaker(container);
    await pickFixtureElement(target);

    act(() => {
      document.querySelector<HTMLElement>('.tokenpanel-domtweaker-edit-button')!.click();
    });
    await waitForAssertion(() => {
      expect(document.querySelector('.tokenpanel-domtweaker-popover')).not.toBeNull();
    });

    act(() => {
      toggle.click();
    });
    await waitForAssertion(() => {
      expect(toggle.classList.contains('is-active')).toBe(false);
      expect(document.querySelector('.tokenpanel-domtweaker-popover')).toBeNull();
      expect(document.querySelector('.tokenpanel-domtweaker-edit-button')).toBeNull();
      expect(document.querySelector('.tokenpanel-domtweaker-pinned-box')).toBeNull();
    });

    act(() => {
      movePointerTo(50, 70);
      pressAlt();
      clickAt(target, 50, 70);
      releaseAlt();
    });
    await flushEffects();

    expect(document.querySelector('.tokenpanel-domtweaker-edit-button')).toBeNull();
  });

  it('coordinates real element-path and DOM Tweaker arming in both directions', async () => {
    const cfg = makeConfig('domtweak-mutual-a');
    const container = renderMutualExclusionHarness(cfg);
    await flushEffects();

    const elementPathToggle = container.querySelector<HTMLElement>('.tokenpanel-elpath-toggle')!;
    const domTweakerToggle = container.querySelector<HTMLElement>('.tokenpanel-domtweaker-toggle')!;

    act(() => {
      elementPathToggle.click();
    });
    await waitForAssertion(() => {
      expect(getCurrentArmingOwnerForTests()).toBe('element-path');
      expect(elementPathToggle.classList.contains('is-active')).toBe(true);
    });

    act(() => {
      domTweakerToggle.click();
    });
    await waitForAssertion(() => {
      expect(getCurrentArmingOwnerForTests()).toBe('dom-tweaker');
      expect(elementPathToggle.classList.contains('is-active')).toBe(false);
      expect(domTweakerToggle.classList.contains('is-active')).toBe(true);
    });

    act(() => {
      domTweakerToggle.click();
    });
    await waitForAssertion(() => {
      expect(domTweakerToggle.classList.contains('is-active')).toBe(false);
    });

    act(() => {
      domTweakerToggle.click();
    });
    await waitForAssertion(() => {
      expect(getCurrentArmingOwnerForTests()).toBe('dom-tweaker');
      expect(domTweakerToggle.classList.contains('is-active')).toBe(true);
    });

    act(() => {
      elementPathToggle.click();
    });
    await waitForAssertion(() => {
      expect(getCurrentArmingOwnerForTests()).toBe('element-path');
      expect(domTweakerToggle.classList.contains('is-active')).toBe(false);
      expect(elementPathToggle.classList.contains('is-active')).toBe(true);
    });
  });

  it('repeated enable/disable cycles remove DOM Tweaker picker listeners', async () => {
    const cfg = makeConfig('domtweak-listeners');
    const container = renderDomTweakerHarness(cfg);
    await flushEffects();

    const addDocumentListener = vi.spyOn(document, 'addEventListener');
    const removeDocumentListener = vi.spyOn(document, 'removeEventListener');
    const addWindowListener = vi.spyOn(window, 'addEventListener');
    const removeWindowListener = vi.spyOn(window, 'removeEventListener');
    const toggle = container.querySelector<HTMLElement>('.tokenpanel-domtweaker-toggle')!;

    for (let i = 0; i < 3; i += 1) {
      act(() => {
        toggle.click();
      });
      await waitForAssertion(() => {
        expect(getCurrentArmingOwnerForTests()).toBe('dom-tweaker');
        expect(toggle.classList.contains('is-active')).toBe(true);
      });

      act(() => {
        toggle.click();
      });
      await waitForAssertion(() => {
        expect(toggle.classList.contains('is-active')).toBe(false);
      });
    }

    const documentAdds = addDocumentListener.mock.calls.filter(([type]) => type === 'mousemove').length;
    const documentRemoves = removeDocumentListener.mock.calls.filter(
      ([type]) => type === 'mousemove',
    ).length;
    expect(documentAdds).toBe(documentRemoves);

    for (const type of ['keydown', 'keyup', 'blur']) {
      const adds = addWindowListener.mock.calls.filter(([eventType]) => eventType === type).length;
      const removes = removeWindowListener.mock.calls.filter(
        ([eventType]) => eventType === type,
      ).length;
      expect(adds).toBe(removes);
    }
  });

  it('restores the enabled toggle from persisted state on a fresh mount', async () => {
    const cfg = makeConfig('domtweak-restore');
    localStorage.setItem(`${cfg.storagePrefix}-domtweaker-enabled`, '1');
    const container = renderDomTweakerHarness(cfg);
    await flushEffects();

    const toggle = container.querySelector<HTMLElement>('.tokenpanel-domtweaker-toggle')!;
    await waitForAssertion(() => {
      expect(toggle.classList.contains('is-active')).toBe(true);
      expect(getCurrentArmingOwnerForTests()).toBe('dom-tweaker');
    });
  });

  it('opens diff export from the panel actions menu path', async () => {
    const cfg = makeConfig('domtweak-panel-action');
    localStorage.setItem(getOpenKey(cfg), '1');
    saveSize({ width: 360, height: 520 }, cfg);
    const container = createContainer();

    act(() => {
      render(<DesignTokenTweakPanel instanceConfig={cfg} />, container);
    });
    await flushEffects();

    act(() => {
      container.querySelector<HTMLElement>('.tokenpanel-actions-menu-btn')!.click();
    });
    await waitForAssertion(() => {
      expect(document.querySelector('.tokenpanel-actions-popover')).not.toBeNull();
    });

    const action = Array.from(
      document.querySelectorAll<HTMLElement>('.tokenpanel-actions-popover .tokenpanel-action-link'),
    ).find((el) => el.textContent === 'DOM Tweaker diff');
    expect(action).not.toBeUndefined();

    act(() => {
      action!.click();
    });

    await waitForAssertion(() => {
      expect(
        document.querySelector<HTMLTextAreaElement>('[aria-label="DOM Tweaker session diff"]'),
      ).not.toBeNull();
    });
  });
});
