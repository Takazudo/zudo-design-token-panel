// @vitest-environment jsdom

import { render } from 'preact';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { __resetInstanceBindingsForTests, __resetSpawnSlotsForTests } from '../index';
import { __resetPanelConfigForTests, configurePanel, type PanelConfig, type PanelInstanceHandle } from '../config/panel-config';

const config: PanelConfig = {
  storagePrefix: 'close-recovery',
  consoleNamespace: 'closeRecovery',
  modalClassPrefix: 'close-recovery-modal',
  schemaId: 'close-recovery/v1',
  exportFilenameBase: 'close-recovery',
  autoRememberOnOpen: false,
  tabs: [],
};
const handles: PanelInstanceHandle[] = [];

function create(prefix = config.storagePrefix) {
  const handle = configurePanel({ ...config, storagePrefix: prefix, consoleNamespace: prefix });
  handles.push(handle);
  return handle;
}

function root(prefix = config.storagePrefix) {
  return document.getElementById(`${prefix}-root`)!;
}

function expectClosed(prefix = config.storagePrefix) {
  expect(root(prefix).childElementCount).toBe(0);
  expect(localStorage.getItem(`${prefix}-open`)).toBeNull();
  expect(localStorage.getItem(`${prefix}:visible`)).toBe('0');
}

function closeClick(prefix = config.storagePrefix) {
  root(prefix).querySelector<HTMLElement>('[aria-label="Close panel"]')!.click();
}

beforeEach(() => {
  __resetInstanceBindingsForTests();
  __resetSpawnSlotsForTests();
  __resetPanelConfigForTests();
  document.body.innerHTML = '';
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const handle of handles.splice(0)) handle.destroy();
  __resetInstanceBindingsForTests();
  __resetSpawnSlotsForTests();
  __resetPanelConfigForTests();
  vi.clearAllTimers();
  vi.useRealTimers();
  document.body.innerHTML = '';
  localStorage.clear();
});

it.each([245, 248, 249, 250, 251])('keeps UI Close closed at %i ms across recovery (#1046)', async (delay) => {
  const handle = create();
  handle.open();
  await vi.advanceTimersByTimeAsync(delay);
  expect(root().querySelector('.tokenpanel-shell')).not.toBeNull();
  expect(localStorage.getItem('close-recovery-open')).toBe('1');
  expect(localStorage.getItem('close-recovery:visible')).toBe('1');

  closeClick();
  await Promise.resolve();
  expectClosed();
  await vi.advanceTimersByTimeAsync(Math.max(0, 250 - delay));
  await vi.advanceTimersByTimeAsync(150);
  expectClosed();
  handle.open();
  await vi.advanceTimersByTimeAsync(400);
  expect(root().querySelectorAll('.tokenpanel-shell')).toHaveLength(1);
});

it.each(['Enter', ' ', 'Escape', 'public'])('keeps %s close authoritative at 248 ms', async (path) => {
  const handle = create();
  handle.open();
  await vi.advanceTimersByTimeAsync(248);
  expect(root().querySelector('.tokenpanel-shell')).not.toBeNull();
  if (path === 'public') handle.close();
  else {
    const target = path === 'Escape' ? document : root().querySelector('[aria-label="Close panel"]')!;
    target.dispatchEvent(new KeyboardEvent('keydown', { key: path, bubbles: true }));
  }
  await Promise.resolve();
  expectClosed();
  await vi.advanceTimersByTimeAsync(400);
  expectClosed();
});

it('does not let an obsolete close effect overwrite an immediate explicit reopen', async () => {
  const handle = create();
  handle.open();
  await vi.advanceTimersByTimeAsync(248);
  closeClick();
  await Promise.resolve();
  expectClosed();
  handle.open();
  await vi.advanceTimersByTimeAsync(400);
  expect(root().querySelectorAll('.tokenpanel-shell')).toHaveLength(1);
  expect(localStorage.getItem('close-recovery-open')).toBe('1');
  expect(localStorage.getItem('close-recovery:visible')).toBe('1');
});

it('cancels recovery even when closed intent cannot be persisted', async () => {
  const handle = create();
  handle.open();
  await vi.advanceTimersByTimeAsync(248);
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('denied'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
  closeClick();
  await vi.advanceTimersByTimeAsync(400);
  expect(root().childElementCount).toBe(0);
  expect(localStorage.getItem('close-recovery-open')).toBe('1');
  vi.restoreAllMocks();
  handle.open();
  await vi.advanceTimersByTimeAsync(400);
  expect(root().querySelectorAll('.tokenpanel-shell')).toHaveLength(1);
});

it('closes safely when storage reads and writes throw', async () => {
  create().open();
  await vi.advanceTimersByTimeAsync(248);
  for (const method of ['getItem', 'setItem', 'removeItem'] as const) {
    vi.spyOn(Storage.prototype, method).mockImplementation(() => { throw new Error('denied'); });
  }
  closeClick();
  await vi.advanceTimersByTimeAsync(400);
  expect(root().childElementCount).toBe(0);
});

it('preserves closed visibility when only removing the open key fails', async () => {
  create().open();
  await vi.advanceTimersByTimeAsync(248);
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('denied'); });
  closeClick();
  await vi.advanceTimersByTimeAsync(400);
  expect(root().childElementCount).toBe(0);
  expect(localStorage.getItem('close-recovery-open')).toBe('1');
  expect(localStorage.getItem('close-recovery:visible')).toBe('0');
});

it('cancels only the closing prefix while a genuinely dead sibling recovers', async () => {
  create().open();
  create('sibling').open();
  await vi.advanceTimersByTimeAsync(248);
  expect(root('sibling').querySelector('.tokenpanel-shell')).not.toBeNull();
  render(null, root('sibling'));
  closeClick();
  await vi.advanceTimersByTimeAsync(400);
  expectClosed();
  expect(root('sibling').querySelectorAll('.tokenpanel-shell')).toHaveLength(1);
  expect(localStorage.getItem('sibling-open')).toBe('1');
});

it('does not leave recovery or close callbacks behind after destroy/recreate', async () => {
  const handle = create();
  handle.open();
  await vi.advanceTimersByTimeAsync(248);
  closeClick();
  handle.destroy();
  handles.splice(handles.indexOf(handle), 1);
  const replacement = create();
  replacement.open();
  await vi.advanceTimersByTimeAsync(400);
  expect(root().querySelectorAll('.tokenpanel-shell')).toHaveLength(1);
  closeClick();
  await vi.advanceTimersByTimeAsync(400);
  expectClosed();
});
