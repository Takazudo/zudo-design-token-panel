import { createContext } from 'preact';
import { useCallback, useContext, useEffect, useMemo, useRef } from 'preact/compat';
import type { ComponentChildren, RefObject } from 'preact';

export interface ShortcutBinding {
  key: string | readonly string[];
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  when?: (event: KeyboardEvent) => boolean;
}

type ShortcutHandler = (event: KeyboardEvent) => void;
type Registration = { getBinding: () => ShortcutBinding; handler: ShortcutHandler };

interface ShortcutContextValue {
  register: (registration: Registration) => () => void;
}

const ShortcutContext = createContext<ShortcutContextValue | null>(null);
let activeOwner: symbol | null = null;
const mountedOwners = new Map<symbol, RefObject<HTMLDivElement>>();

function resolveActiveOwner(): symbol | null {
  if (activeOwner && mountedOwners.get(activeOwner)?.current?.isConnected) return activeOwner;
  activeOwner = null;
  for (const [owner, shellRef] of mountedOwners) {
    if (shellRef.current?.isConnected) {
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

export function ShortcutProvider({
  shellRef,
  enabled,
  children,
}: {
  shellRef: RefObject<HTMLDivElement>;
  enabled: boolean;
  children: ComponentChildren;
}) {
  const owner = useRef(Symbol('shell-shortcuts'));
  const registrations = useRef(new Set<Registration>());

  const register = useCallback((registration: Registration) => {
    registrations.current.add(registration);
    return () => registrations.current.delete(registration);
  }, []);

  useEffect(() => {
    if (!enabled) {
      mountedOwners.delete(owner.current);
      if (activeOwner === owner.current) activeOwner = null;
      return;
    }
    const documentRef = globalThis.document;
    if (!documentRef) return;
    mountedOwners.set(owner.current, shellRef);
    if (resolveActiveOwner() === null) activeOwner = owner.current;

    function claimOwnership(event: Event) {
      const target = event.target;
      if (target instanceof Node && shellRef.current?.contains(target)) activeOwner = owner.current;
    }
    function dispatch(event: KeyboardEvent) {
      if (resolveActiveOwner() !== owner.current) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!shellRef.current?.contains(target) && isEditable(target)) return;
      for (const registration of registrations.current) {
        if (matches(registration.getBinding(), event)) registration.handler(event);
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
      mountedOwners.delete(owner.current);
      if (activeOwner === owner.current) activeOwner = null;
    };
  }, [enabled, shellRef]);

  const value = useMemo(() => ({ register }), [register]);
  return <ShortcutContext.Provider value={value}>{children}</ShortcutContext.Provider>;
}

export function useShortcut(
  binding: ShortcutBinding,
  handler: ShortcutHandler,
  enabled = true,
): void {
  const context = useContext(ShortcutContext);
  if (!context) throw new Error('useShortcut must be used within ShortcutProvider');
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const bindingRef = useRef(binding);
  bindingRef.current = binding;
  useEffect(() => {
    if (!enabled) return;
    return context.register({
      getBinding: () => bindingRef.current,
      handler: (event) => handlerRef.current(event),
    });
  }, [context, enabled]);
}
