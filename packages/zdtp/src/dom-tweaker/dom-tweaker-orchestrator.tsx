/**
 * DomTweakerOrchestrator — eager-side scaffold for DOM Tweaker.
 *
 * Responsibilities:
 *   1. Lifts and persists the `enabled` flag.
 *   2. Provides DomTweakerContext to descendants (the header toggle button).
 *   3. Enforces the document-global single-active-instance guard.
 *   4. Creates the body-level portal mount for the future lazy UI/runtime.
 *   5. Dynamically imports the lazy boundary on first enable and passes only
 *      explicit scalar config values into that boundary.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ComponentChildren, JSX } from 'preact';
import { createPortal } from 'preact/compat';
import {
  DomTweakerContext,
  type DomTweakerContextValue,
  type DomTweakerRuntimeStatus,
} from './dom-tweaker-context';
import { loadDomTweakerEnabled, saveDomTweakerEnabled } from './dom-tweaker-state';
import { usePortalMount } from '../utils/use-portal-mount';
import type { PanelConfig } from '../config/panel-config';
import type { DomTweakerLazyBoundaryProps } from './lazy';
import { DOM_TWEAKER_PORTAL_MOUNT_ID } from '../highlight/find-elements';

type DomTweakerLazyBoundaryComponent = (
  props: DomTweakerLazyBoundaryProps,
) => JSX.Element | null;

const DOM_TWEAKER_OWNER_SYMBOL = Symbol.for('@takazudo/zdtp:dom-tweaker-owner');

interface DomTweakerOwnerState {
  ownerStoragePrefix: string | null;
}

function getDomTweakerOwnerState(): DomTweakerOwnerState | null {
  if (typeof document === 'undefined') return null;
  const doc = document as unknown as Record<symbol, DomTweakerOwnerState | undefined>;
  let state = doc[DOM_TWEAKER_OWNER_SYMBOL];
  if (!state) {
    state = { ownerStoragePrefix: null };
    doc[DOM_TWEAKER_OWNER_SYMBOL] = state;
  }
  return state;
}

function warnDomTweakerAlreadyActive(cfg: PanelConfig, ownerStoragePrefix: string): void {
  console.warn(
    `[${cfg.consoleNamespace}] [design-token-panel] DOM Tweaker is already active for ` +
      `storagePrefix "${ownerStoragePrefix}". Only one DOM Tweaker can run per document; ` +
      'this toggle is inert.',
  );
}

function acquireDomTweakerInstance(cfg: PanelConfig): boolean {
  const state = getDomTweakerOwnerState();
  if (state === null) return true;
  if (state.ownerStoragePrefix === null || state.ownerStoragePrefix === cfg.storagePrefix) {
    state.ownerStoragePrefix = cfg.storagePrefix;
    return true;
  }
  warnDomTweakerAlreadyActive(cfg, state.ownerStoragePrefix);
  return false;
}

function releaseDomTweakerInstance(cfg: PanelConfig): void {
  const state = getDomTweakerOwnerState();
  if (state?.ownerStoragePrefix === cfg.storagePrefix) {
    state.ownerStoragePrefix = null;
  }
}

interface LazyPortalProps {
  enabled: boolean;
  instanceConfig: PanelConfig;
  LazyBoundary: DomTweakerLazyBoundaryComponent | null;
  showDiffExport: boolean;
  onCloseDiffExport: () => void;
  onRuntimeStatusChange: (status: DomTweakerRuntimeStatus) => void;
  onArmingRevoked: () => void;
}

function LazyPortal({
  enabled,
  instanceConfig,
  LazyBoundary,
  showDiffExport,
  onCloseDiffExport,
  onRuntimeStatusChange,
  onArmingRevoked,
}: LazyPortalProps) {
  const mountNode = usePortalMount(DOM_TWEAKER_PORTAL_MOUNT_ID);
  if (!mountNode || LazyBoundary === null || instanceConfig.domTweaker === undefined) {
    return null;
  }
  return createPortal(
    <LazyBoundary
      enabled={enabled}
      storagePrefix={instanceConfig.storagePrefix}
      themeCss={instanceConfig.domTweaker.themeCss}
      consoleNamespace={instanceConfig.consoleNamespace}
      modalClassPrefix={instanceConfig.modalClassPrefix}
      showDiffExport={showDiffExport}
      onCloseDiffExport={onCloseDiffExport}
      onRuntimeStatusChange={onRuntimeStatusChange}
      onArmingRevoked={onArmingRevoked}
    />,
    mountNode,
  );
}

export function DomTweakerOrchestrator({
  children,
  instanceConfig,
}: {
  children: ComponentChildren;
  instanceConfig: PanelConfig;
}) {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    if (instanceConfig.domTweaker === undefined) return false;
    if (!loadDomTweakerEnabled(instanceConfig)) return false;
    return acquireDomTweakerInstance(instanceConfig);
  });
  const [LazyBoundary, setLazyBoundary] = useState<DomTweakerLazyBoundaryComponent | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<DomTweakerRuntimeStatus>('idle');
  const [showDiffExport, setShowDiffExport] = useState(false);
  const lazyImportPromiseRef = useRef<Promise<void> | null>(null);

  const setEnabled = useCallback(
    (next: boolean) => {
      if (next) {
        if (instanceConfig.domTweaker === undefined) return;
        if (!acquireDomTweakerInstance(instanceConfig)) return;
      } else {
        releaseDomTweakerInstance(instanceConfig);
        setShowDiffExport(false);
      }
      setEnabledState(next);
      saveDomTweakerEnabled(next, instanceConfig);
    },
    [instanceConfig],
  );

  const toggle = useCallback(() => {
    setEnabled(!enabled);
  }, [enabled, setEnabled]);

  const openDiffExport = useCallback(() => {
    setShowDiffExport(true);
  }, []);

  const closeDiffExport = useCallback(() => {
    setShowDiffExport(false);
  }, []);

  useEffect(() => {
    return () => {
      releaseDomTweakerInstance(instanceConfig);
    };
  }, [instanceConfig]);

  useEffect(() => {
    if ((!enabled && !showDiffExport) || LazyBoundary !== null || lazyImportPromiseRef.current !== null) {
      return;
    }
    if (enabled) setRuntimeStatus('loading');
    lazyImportPromiseRef.current = import('./lazy')
      .then((mod) => {
        setLazyBoundary(() => mod.DomTweakerLazyBoundary);
      })
      .catch((err: unknown) => {
        lazyImportPromiseRef.current = null;
        if (enabled) setRuntimeStatus('error');
        console.warn(
          `[${instanceConfig.consoleNamespace}] [design-token-panel] Failed to load DOM Tweaker lazy boundary.`,
          err,
        );
      });
  }, [enabled, LazyBoundary, showDiffExport, instanceConfig.consoleNamespace]);

  const ctxValue = useMemo<DomTweakerContextValue>(
    () => ({ enabled, setEnabled, toggle, runtimeStatus, openDiffExport }),
    [enabled, openDiffExport, runtimeStatus, setEnabled, toggle],
  );

  return (
    <>
      <DomTweakerContext.Provider value={ctxValue}>{children}</DomTweakerContext.Provider>
      <LazyPortal
        enabled={enabled}
        instanceConfig={instanceConfig}
        LazyBoundary={LazyBoundary}
        showDiffExport={showDiffExport}
        onCloseDiffExport={closeDiffExport}
        onRuntimeStatusChange={setRuntimeStatus}
        onArmingRevoked={() => setEnabled(false)}
      />
    </>
  );
}
