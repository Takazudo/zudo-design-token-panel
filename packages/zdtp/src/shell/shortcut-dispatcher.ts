import { getScope } from '@takazudo/zfb/zudo-react';
import { read, type MaybeSignal } from '../zr/live';

export interface ShortcutBinding {
  key: string | readonly string[];
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  when?: (event: KeyboardEvent) => boolean;
}

type ShortcutHandler = (event: KeyboardEvent) => void;
interface Registration {
  binding: ShortcutBinding;
  handler: ShortcutHandler;
}

export interface ShortcutDispatcher {
  register(binding: ShortcutBinding, handler: ShortcutHandler): () => void;
  /**
   * Route document keydowns to this shell's registrations while `getShell()`
   * is the last-interacted open shell. Returns the detach function.
   */
  attach(getShell: () => Element | null): () => void;
}

let activeOwner: symbol | null = null;
const mountedOwners = new Map<symbol, () => Element | null>();

function resolveActiveOwner(): symbol | null {
  if (activeOwner && mountedOwners.get(activeOwner)?.()?.isConnected) return activeOwner;
  activeOwner = null;
  for (const [owner, getShell] of mountedOwners) {
    if (getShell()?.isConnected) {
      activeOwner = owner;
      break;
    }
    mountedOwners.delete(owner);
  }
  return activeOwner;
}

function isEditable(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  return Boolean(
    element.closest(
      'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]',
    ),
  );
}

function matches(binding: ShortcutBinding, event: KeyboardEvent): boolean {
  const keys = typeof binding.key === 'string' ? [binding.key] : binding.key;
  return (
    keys.includes(event.key) &&
    (binding.metaKey === undefined || binding.metaKey === event.metaKey) &&
    (binding.ctrlKey === undefined || binding.ctrlKey === event.ctrlKey) &&
    (binding.altKey === undefined || binding.altKey === event.altKey) &&
    (binding.shiftKey === undefined || binding.shiftKey === event.shiftKey) &&
    (binding.when?.(event) ?? true)
  );
}

export function createShortcutDispatcher(): ShortcutDispatcher {
  const owner = Symbol('shell-shortcuts');
  const registrations = new Set<Registration>();

  return {
    register(binding, handler) {
      const registration = { binding, handler };
      registrations.add(registration);
      return () => registrations.delete(registration);
    },
    attach(getShell) {
      const documentRef = globalThis.document;
      if (!documentRef) return () => {};
      mountedOwners.set(owner, getShell);
      if (resolveActiveOwner() === null) activeOwner = owner;

      function claimOwnership(event: Event) {
        const target = event.target;
        if (target instanceof Node && getShell()?.contains(target)) activeOwner = owner;
      }
      function dispatch(event: KeyboardEvent) {
        if (resolveActiveOwner() !== owner) return;
        const target = event.target instanceof Element ? event.target : null;
        if (!getShell()?.contains(target) && isEditable(target)) return;
        for (const registration of registrations) {
          if (matches(registration.binding, event)) registration.handler(event);
          if (event.defaultPrevented) break;
        }
      }

      documentRef.addEventListener('pointerdown', claimOwnership, true);
      documentRef.addEventListener('focusin', claimOwnership, true);
      documentRef.addEventListener('keydown', dispatch);
      return () => {
        documentRef.removeEventListener('pointerdown', claimOwnership, true);
        documentRef.removeEventListener('focusin', claimOwnership, true);
        documentRef.removeEventListener('keydown', dispatch);
        mountedOwners.delete(owner);
        if (activeOwner === owner) activeOwner = null;
      };
    },
  };
}

/**
 * Register a shortcut for the lifetime of the calling zudo-react component,
 * while `enabled` holds.
 */
export function useShortcut(
  dispatcher: ShortcutDispatcher,
  binding: ShortcutBinding,
  handler: ShortcutHandler,
  enabled: MaybeSignal<boolean> = true,
): void {
  getScope().effect(() => {
    if (!read(enabled)) return;
    return dispatcher.register(binding, handler);
  });
}
