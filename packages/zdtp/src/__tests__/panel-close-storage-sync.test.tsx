// @vitest-environment jsdom

/**
 * Regression test for the panel-close storage desync bug (#157 items 1 & 2).
 *
 * Problem 1 — ESC key does not close the panel (#157 item 1):
 *   The panel had no document-level keyboard listener. Pressing Escape would
 *   close native <dialog> modals (export/import/apply) but had no effect on
 *   the panel itself.
 *
 * Problem 2 — panel auto-reopens after internal close (#157 item 2):
 *   Closing via the X button called setOpen(false), which ran the
 *   useEffect([open]) block and removed localStorage['-open']. But it did NOT
 *   touch localStorage[':visible']. On the next page load, index.tsx's
 *   reapplyFromStorage() calls wasVisible() which reads ':visible' === '1',
 *   and shows the panel — re-opening it against the user's intent.
 *
 * Fix (Approach A):
 *   panel.tsx's useEffect([open]) now writes ':visible' to '1'/'0' in lockstep
 *   with the '-open' key write. ESC is handled by a document-level keydown
 *   effect installed only while open===true, which calls setOpen(false).
 *
 * Storage shape after close (MANDATORY — the root cause IS the desync):
 *   - localStorage[`${storagePrefix}:visible`] === '0'
 *   - localStorage[`${storagePrefix}-open`] === null
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getOpenKey } from '../state/tweak-state';
import {
  __resetPanelConfigForTests,
  getPanelConfig,
  panelRootId,
  storageKey_visible,
} from '../config/panel-config';
import { flushEffects } from './_test-helpers';

const STORAGE_KEY_VISIBLE = storageKey_visible(getPanelConfig());
const PANEL_ROOT_ID = panelRootId(getPanelConfig());
const OPEN_PANEL_HEADER_TEXT = 'zdtp';
const TOGGLE_EVENT = 'toggle-design-token-panel';

describe('panel close — storage sync', () => {
  beforeEach(() => {
    __resetPanelConfigForTests();
    localStorage.clear();
    document.body.innerHTML = '';
    const w = window as unknown as Record<string, unknown>;
    delete w.__zudoDesignTokenPanelAdapter;
    delete w.__zudoDesignTokenPanelLifecycle;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('X-click clears both -open (null) and :visible ("0") so next page-load does not reopen', async () => {
    await import('../index');

    // Open the panel via toggle event.
    window.dispatchEvent(new CustomEvent(TOGGLE_EVENT));
    await flushEffects();

    const root = document.getElementById(PANEL_ROOT_ID);
    expect(root, 'panel root mounts').not.toBeNull();
    expect(root!.textContent ?? '').toContain(OPEN_PANEL_HEADER_TEXT);
    expect(localStorage.getItem(getOpenKey())).toBe('1');
    expect(localStorage.getItem(STORAGE_KEY_VISIBLE)).toBe('1');

    // Click the X close button inside the panel.
    const closeBtn = root!.querySelector<HTMLElement>('.tokenpanel-close-btn');
    expect(closeBtn, 'close button renders while panel is open').not.toBeNull();
    closeBtn!.click();
    await flushEffects();

    // Panel content should be gone.
    expect(root!.textContent ?? '').not.toContain(OPEN_PANEL_HEADER_TEXT);

    // MANDATORY storage assertions — both keys must reflect "closed".
    // -open must be absent (null), not '0'.
    expect(
      localStorage.getItem(getOpenKey()),
      'after X-click: -open must be null',
    ).toBeNull();
    // :visible must be '0', not '1' — this is the key that wasVisible() reads.
    // Before the fix it remained '1', causing reapplyFromStorage to reopen the
    // panel on next load.
    expect(
      localStorage.getItem(STORAGE_KEY_VISIBLE),
      'after X-click: :visible must be "0"',
    ).toBe('0');
  });

  it('ESC does NOT close the panel when a modal is open (modal has priority)', async () => {
    // jsdom does not implement HTMLDialogElement.showModal(), so we define a
    // no-op on the prototype to prevent the exception that would otherwise
    // abort the test before the modal state is set.
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = () => undefined;
    }
    vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(() => undefined);

    await import('../index');

    // Open the panel.
    window.dispatchEvent(new CustomEvent(TOGGLE_EVENT));
    await flushEffects();

    const root = document.getElementById(PANEL_ROOT_ID);
    expect(root!.textContent ?? '').toContain(OPEN_PANEL_HEADER_TEXT);

    // Click the Export button to open a modal (sets showExport=true in panel state).
    const exportBtn = root!.querySelector<HTMLElement>('.tokenpanel-action-link');
    expect(exportBtn, 'Export button should render').not.toBeNull();
    exportBtn!.click();
    await flushEffects();

    // Now dispatch ESC. With showExport=true, the panel's ESC handler must
    // stand down and let the native <dialog> handle it first.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await flushEffects();

    // Panel must still be open — the ESC handler should have returned early
    // due to the modal-priority guard.
    expect(
      localStorage.getItem(getOpenKey()),
      'after ESC with modal open: -open must still be "1"',
    ).toBe('1');
    expect(
      localStorage.getItem(STORAGE_KEY_VISIBLE),
      'after ESC with modal open: :visible must still be "1"',
    ).toBe('1');

    vi.restoreAllMocks();
  });

  it('ESC key clears both -open (null) and :visible ("0") when no modal is open', async () => {
    await import('../index');

    // Open via toggle event.
    window.dispatchEvent(new CustomEvent(TOGGLE_EVENT));
    await flushEffects();

    const root = document.getElementById(PANEL_ROOT_ID);
    expect(root!.textContent ?? '').toContain(OPEN_PANEL_HEADER_TEXT);
    expect(localStorage.getItem(getOpenKey())).toBe('1');
    expect(localStorage.getItem(STORAGE_KEY_VISIBLE)).toBe('1');

    // Dispatch ESC on the document.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await flushEffects();

    // Panel should be closed.
    expect(root!.textContent ?? '').not.toContain(OPEN_PANEL_HEADER_TEXT);

    // MANDATORY storage assertions.
    expect(
      localStorage.getItem(getOpenKey()),
      'after ESC: -open must be null',
    ).toBeNull();
    expect(
      localStorage.getItem(STORAGE_KEY_VISIBLE),
      'after ESC: :visible must be "0"',
    ).toBe('0');
  });
});
