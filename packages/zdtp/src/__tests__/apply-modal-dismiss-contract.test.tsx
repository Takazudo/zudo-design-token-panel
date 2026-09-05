// @vitest-environment jsdom

/**
 * ApplyModal dismissal contract (#446 F13).
 *
 * - Dismissing the SUCCESS view by ANY route (Done / Escape / backdrop / ×)
 *   runs the onApplied cleanup contract exactly once — every route funnels
 *   through the native <dialog> `close` event.
 * - The modal cannot be dismissed mid-fetch (phase === 'applying'): Escape is
 *   blocked via onCancel; the × button and backdrop no-op.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { ApplyModal } from '../apply-modal';
import { __resetPanelConfigForTests } from '../config/panel-config';
import { installFixturePanelConfig, FIXTURE_CLUSTER, FIXTURE_TABS } from './_test-helpers';

let container: HTMLDivElement;
let originalFetch: typeof globalThis.fetch;

const RECT = {
  left: 100,
  top: 100,
  right: 400,
  bottom: 400,
  width: 300,
  height: 300,
  x: 100,
  y: 100,
  toJSON() {},
} as DOMRect;

function colorDefaults() {
  const palette = Array.from({ length: FIXTURE_CLUSTER.paletteSize }, () => '#000000');
  return {
    palette,
    background: 0,
    foreground: 15,
    cursor: 6,
    selectionBg: 0,
    selectionFg: 15,
    semanticMappings: { accent: 6, muted: 8, active: 14 },
    shikiTheme: 'dracula' as const,
  };
}

/** State with a routable (spacing) tweak so the Apply button is enabled. */
function stateWithTweak() {
  return {
    color: colorDefaults(),
    spacing: { 'hsp-md': '24px' },
    typography: {},
    size: {},
  };
}

function installApplyConfig() {
  installFixturePanelConfig({
    applyEndpoint: '/api/dev/design-tokens-apply',
    applyRouting: { zd: 'src/styles/tokens.css' },
    tabs: FIXTURE_TABS,
  });
}

function okResponse(): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ ok: true, updated: [] }),
    text: async () => '',
  } as unknown as Response;
}

async function flush(): Promise<void> {
  await act(async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
}

function dialogEl(): HTMLDialogElement {
  const d = container.querySelector('dialog') as HTMLDialogElement;
  d.getBoundingClientRect = () => RECT;
  return d;
}

function primaryButton(): HTMLElement {
  return container.querySelector('[class*="__button--primary"]') as HTMLElement;
}

async function renderAndSucceed(onClose: () => void, onApplied: () => void): Promise<void> {
  act(() => {
    render(
      <ApplyModal
        state={stateWithTweak()}
        colorDefaults={colorDefaults()}
        open={true}
        onClose={onClose}
        onApplied={onApplied}
      />,
      container,
    );
  });
  // Confirmation is unavailable until the exact dry-run preview settles.
  await flush();
  // Click Apply → applying → (mocked fetch resolves) → success.
  await act(async () => {
    primaryButton().dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await flush();
  expect(container.textContent).toContain('Applied successfully');
}

beforeEach(() => {
  installApplyConfig();
  container = document.createElement('div');
  document.body.appendChild(container);
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  act(() => render(null, container));
  container.remove();
  __resetPanelConfigForTests();
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Success-view dismissal runs onApplied exactly once, by any route
// ---------------------------------------------------------------------------

describe('ApplyModal success view — onApplied runs once per dismissal route', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue(okResponse()) as unknown as typeof fetch;
  });

  it('Done → onApplied once', async () => {
    const onApplied = vi.fn();
    await renderAndSucceed(vi.fn(), onApplied);
    // The success-phase primary button is "Done".
    const done = primaryButton();
    expect(done.textContent).toContain('Done');
    act(() => {
      done.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onApplied).toHaveBeenCalledOnce();
  });

  it('× close button → onApplied once', async () => {
    const onApplied = vi.fn();
    await renderAndSucceed(vi.fn(), onApplied);
    const closeBtn = container.querySelector('[aria-label="Close apply modal"]') as HTMLElement;
    act(() => {
      closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onApplied).toHaveBeenCalledOnce();
  });

  it('backdrop click → onApplied once', async () => {
    const onApplied = vi.fn();
    await renderAndSucceed(vi.fn(), onApplied);
    const d = dialogEl();
    act(() => {
      d.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 5, clientY: 5 }));
      d.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 5, clientY: 5 }));
    });
    expect(onApplied).toHaveBeenCalledOnce();
  });

  it('native close event (Escape route) → onApplied once', async () => {
    const onApplied = vi.fn();
    await renderAndSucceed(vi.fn(), onApplied);
    // The observable end of the Escape path is the dialog's native `close`
    // event — the single choke point every dismissal funnels through.
    const d = dialogEl();
    act(() => {
      d.dispatchEvent(new Event('close'));
    });
    expect(onApplied).toHaveBeenCalledOnce();
  });

  it('does NOT run onApplied twice when Done is followed by another close', async () => {
    const onApplied = vi.fn();
    await renderAndSucceed(vi.fn(), onApplied);
    const d = dialogEl();
    act(() => {
      primaryButton().dispatchEvent(new MouseEvent('click', { bubbles: true })); // Done
    });
    act(() => {
      d.dispatchEvent(new Event('close')); // redundant close
    });
    expect(onApplied).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Applying phase cannot be dismissed mid-fetch
// ---------------------------------------------------------------------------

describe('ApplyModal applying phase — cannot be dismissed mid-fetch', () => {
  beforeEach(() => {
    // Let the required dry-run settle, then keep the write request pending.
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(okResponse())
      .mockImplementation(() => new Promise<Response>(() => {})) as unknown as typeof fetch;
  });

  async function renderAndStartApplying(onClose: () => void): Promise<void> {
    act(() => {
      render(
        <ApplyModal
          state={stateWithTweak()}
          colorDefaults={colorDefaults()}
          open={true}
          onClose={onClose}
          onApplied={vi.fn()}
        />,
        container,
      );
    });
    await flush();
    await act(async () => {
      primaryButton().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.textContent).toContain('Applying');
  }

  it('onCancel blocks the native-dialog Escape while applying', async () => {
    await renderAndStartApplying(vi.fn());
    const d = dialogEl();
    const cancelEvent = new Event('cancel', { cancelable: true });
    act(() => {
      d.dispatchEvent(cancelEvent);
    });
    expect(cancelEvent.defaultPrevented).toBe(true);
  });

  it('the × button does not dismiss while applying', async () => {
    const onClose = vi.fn();
    await renderAndStartApplying(onClose);
    const closeBtn = container.querySelector('[aria-label="Close apply modal"]') as HTMLElement;
    act(() => {
      closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Applying');
  });

  it('a backdrop click does not dismiss while applying', async () => {
    const onClose = vi.fn();
    await renderAndStartApplying(onClose);
    const d = dialogEl();
    act(() => {
      d.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 5, clientY: 5 }));
      d.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 5, clientY: 5 }));
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Applying');
  });
});
