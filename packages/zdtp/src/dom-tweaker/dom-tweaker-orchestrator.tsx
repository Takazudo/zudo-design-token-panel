/** @jsxImportSource @takazudo/zfb/zudo-react */
/**
 * DomTweakerOrchestrator — eager-side scaffold for DOM Tweaker.
 *
 * Responsibilities:
 *   1. Lifts and persists the `enabled` flag.
 *   2. Returns the controller the header toggle button reads.
 *   3. Enforces the document-global single-active-instance guard.
 *   4. Creates the body-level portal mount for the future lazy UI/runtime.
 *   5. Dynamically imports the lazy boundary on first enable and passes only
 *      explicit scalar config values into that boundary.
 */

import { getScope, signal, type Child, type Component } from '@takazudo/zfb/zudo-react';
import type { DomTweakerController, DomTweakerRuntimeStatus } from './dom-tweaker-context';
import { loadDomTweakerEnabled, saveDomTweakerEnabled } from './dom-tweaker-state';
import { useMountPortal } from '../zr/portal';
import { Rebuild } from '../zr/rebuild';
import type { Reactive } from '../zr/live';
import type { PanelConfig } from '../config/panel-config';
import type { DomTweakerLazyBoundaryProps, DomTweakerLazyBoundaryStaticKeys } from './lazy';
import { DOM_TWEAKER_PORTAL_MOUNT_ID } from '../highlight/find-elements';

type DomTweakerLazyBoundaryComponent = Component<
  Reactive<DomTweakerLazyBoundaryProps, DomTweakerLazyBoundaryStaticKeys>
>;

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

/**
 * Run the eager side of DOM Tweaker for the calling component's lifetime: the
 * persisted enabled bit, the single-instance guard, and the lazy boundary,
 * imported on first enable and rendered into its body-level portal.
 */
export function useDomTweaker(instanceConfig: PanelConfig): DomTweakerController {
  const domTweaker = instanceConfig.domTweaker;
  const enabled = signal<boolean>(
    domTweaker !== undefined &&
      loadDomTweakerEnabled(instanceConfig) &&
      acquireDomTweakerInstance(instanceConfig),
  );
  const LazyBoundary = signal<DomTweakerLazyBoundaryComponent | null>(null);
  const runtimeStatus = signal<DomTweakerRuntimeStatus>('idle');
  const showDiffExport = signal(false);
  let lazyImport: Promise<void> | null = null;

  const setEnabled = (next: boolean) => {
    if (next) {
      if (domTweaker === undefined) return;
      if (!acquireDomTweakerInstance(instanceConfig)) return;
    } else {
      releaseDomTweakerInstance(instanceConfig);
      showDiffExport.value = false;
    }
    enabled.value = next;
    saveDomTweakerEnabled(next, instanceConfig);
  };

  const toggle = () => setEnabled(!enabled.value);
  const openDiffExport = () => {
    showDiffExport.value = true;
  };

  const scope = getScope();
  scope.onCleanup(() => releaseDomTweakerInstance(instanceConfig));

  scope.effect(() => {
    const wanted = enabled.value || showDiffExport.value;
    if (!wanted || lazyImport !== null) return;
    const loadingForEnable = enabled.value;
    if (loadingForEnable) runtimeStatus.value = 'loading';
    lazyImport = import('./lazy')
      .then((mod) => {
        LazyBoundary.value = mod.DomTweakerLazyBoundary;
      })
      .catch((err: unknown) => {
        lazyImport = null;
        if (enabled.value) runtimeStatus.value = 'error';
        console.warn(
          `[${instanceConfig.consoleNamespace}] [design-token-panel] Failed to load DOM Tweaker lazy boundary.`,
          err,
        );
      });
  });

  if (domTweaker !== undefined) {
    useMountPortal(DOM_TWEAKER_PORTAL_MOUNT_ID, () => (
      <Rebuild value={LazyBoundary}>
        {(Boundary) => (Boundary === null ? null : (
          <Boundary
            enabled={enabled}
            storagePrefix={instanceConfig.storagePrefix}
            themeCss={domTweaker.themeCss}
            consoleNamespace={instanceConfig.consoleNamespace}
            modalClassPrefix={instanceConfig.modalClassPrefix}
            showDiffExport={showDiffExport}
            onCloseDiffExport={() => {
              showDiffExport.value = false;
            }}
            onRuntimeStatusChange={(status) => {
              runtimeStatus.value = status;
            }}
            onArmingRevoked={() => setEnabled(false)}
          />
        ))}
      </Rebuild>
    ));
  }

  return { enabled, setEnabled, toggle, runtimeStatus, openDiffExport };
}

/** Component form of `useDomTweaker`, for isolated use. */
export function DomTweakerOrchestrator(props: {
  instanceConfig: PanelConfig;
  children?: (controller: DomTweakerController) => Child;
}) {
  const controller = useDomTweaker(props.instanceConfig);
  return props.children ? props.children(controller) : null;
}
