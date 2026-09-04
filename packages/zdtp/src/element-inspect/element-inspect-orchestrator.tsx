import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { createPortal } from 'preact/compat';
import {
  AltClickPicker,
  ELEMENT_INSPECT_PICKER_FEATURE_ID,
  type AltClickPickerHandle,
} from '../picker';
import { PANEL_EXCLUSION_SELECTOR } from '../highlight/find-elements';
import { usePortalMount } from '../utils/use-portal-mount';
import { buildSummary } from '../element-path/build-element-path';
import { buildTokenIndex, type TokenIndex } from '../utils/token-index';
import type { PanelConfig } from '../config/panel-config';
import type { TweakState } from '../state/tweak-state';
import type { CommitTweakStateOptions, TweakStateUpdater } from '../state/transaction';
import type { FlatTabEntry, TokenAddress } from '../tabs/flat/types';
import { tokenAddressKey as flatTokenAddressKey } from '../tabs/flat/types';
import { TokenControllerProvider } from '../tabs/flat/token-controller';
import { findTokensForElement, type FindTokensForElementResult } from './find-tokens-for-element';
import {
  ElementInspectContext,
  type ElementInspectContextValue,
} from './element-inspect-context';
import {
  ELEMENT_INSPECT_PICKER_CLASS_NAMES,
  ELEMENT_INSPECT_PORTAL_MOUNT_ID,
  ElementInspectOverlay,
} from './element-inspect-overlay';

type CommitTweakState = (
  reason: string,
  next: TweakStateUpdater,
  options?: CommitTweakStateOptions,
) => void;

function readCssVar(cssVar: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() || fallback;
  } catch {
    return fallback;
  }
}

function valueForEntry(
  tabId: string,
  tierId: string,
  itemId: string,
  item: FlatTabEntry['item'],
  cssVar: string,
  state: TweakState | null,
): string {
  if (tabId === 'color' || tabId === 'color-secondary') {
    return readCssVar(cssVar, item.default);
  }
  if (tabId === 'spacing') return state?.spacing[itemId] ?? item.default;
  if (tabId === 'font') return state?.typography[itemId] ?? item.default;
  if (tabId === 'size') return state?.size[itemId] ?? item.default;
  return state?.tabs?.[tabId]?.[tierId]?.[itemId] ?? item.default;
}

function buildControllerEntries(
  config: PanelConfig,
  state: TweakState | null,
  tokenIndex: TokenIndex,
): Map<string, FlatTabEntry> {
  const entries = new Map<string, FlatTabEntry>();
  for (const tab of config.tabs) {
    for (const tier of tab.tiers) {
      for (const item of tier.items) {
        const address = { tabId: tab.id, tierId: tier.id, itemId: item.id };
        const indexed = tokenIndex.entry(address);
        const cssVar = indexed?.cssVar ?? item.cssVar;
        entries.set(flatTokenAddressKey(address), {
          address,
          tab,
          tier,
          item,
          value: valueForEntry(tab.id, tier.id, item.id, item, cssVar, state),
          kind: item.type.kind,
        });
      }
    }
  }
  return entries;
}

function updateStateAtAddress(previous: TweakState, address: TokenAddress, next: string): TweakState {
  if (address.tabId === 'spacing') {
    return { ...previous, spacing: { ...previous.spacing, [address.itemId]: next } };
  }
  if (address.tabId === 'font') {
    return { ...previous, typography: { ...previous.typography, [address.itemId]: next } };
  }
  if (address.tabId === 'size') {
    return { ...previous, size: { ...previous.size, [address.itemId]: next } };
  }
  return {
    ...previous,
    tabs: {
      ...previous.tabs,
      [address.tabId]: {
        ...previous.tabs?.[address.tabId],
        [address.tierId]: {
          ...previous.tabs?.[address.tabId]?.[address.tierId],
          [address.itemId]: next,
        },
      },
    },
  };
}

function deleteStateAtAddress(previous: TweakState, address: TokenAddress): TweakState {
  if (address.tabId === 'spacing' || address.tabId === 'font' || address.tabId === 'size') {
    const sliceName = address.tabId === 'spacing' ? 'spacing' : address.tabId === 'font' ? 'typography' : 'size';
    const slice = { ...previous[sliceName] };
    delete slice[address.itemId];
    return { ...previous, [sliceName]: slice };
  }
  const tab = { ...previous.tabs?.[address.tabId] };
  const tier = { ...tab[address.tierId] };
  delete tier[address.itemId];
  return {
    ...previous,
    tabs: { ...previous.tabs, [address.tabId]: { ...tab, [address.tierId]: tier } },
  };
}

interface ElementInspectPortalProps {
  armed: boolean;
  pickerRef: { current: AltClickPickerHandle | null };
  pinned: Element | null;
  onElementPicked: (element: Element) => void;
  onPinnedDetached: () => void;
  onArmingRevoked: () => void;
}

function ElementInspectPortal({
  armed,
  pickerRef,
  pinned,
  onElementPicked,
  onPinnedDetached,
  onArmingRevoked,
}: ElementInspectPortalProps) {
  const mountNode = usePortalMount(ELEMENT_INSPECT_PORTAL_MOUNT_ID);
  useEffect(() => {
    // The portal mount is created by an effect. Include it in this seam's
    // dependencies so an already-armed toggle also arms the picker when the
    // first mount appears after the orchestrator's initial render.
    if (mountNode && armed) pickerRef.current?.arm();
  }, [armed, mountNode, pickerRef]);
  if (!mountNode) return null;
  return createPortal(
    <>
      <AltClickPicker
        ref={pickerRef}
        enabled={armed}
        featureId={ELEMENT_INSPECT_PICKER_FEATURE_ID}
        onElementPicked={onElementPicked}
        onArmingRevoked={onArmingRevoked}
        classNames={ELEMENT_INSPECT_PICKER_CLASS_NAMES}
        excludeSelector={PANEL_EXCLUSION_SELECTOR}
        getLabelText={buildSummary}
      />
      <ElementInspectOverlay pinned={pinned} onPinnedDetached={onPinnedDetached} />
    </>,
    mountNode,
  );
}

export interface ElementInspectOrchestratorProps {
  children: ComponentChildren;
  instanceConfig: PanelConfig;
  state: TweakState | null;
  commitTweakState: CommitTweakState;
  onInspectTabOpen: () => void;
  onInspectTabClear: () => void;
  onJumpToColorTab?: () => void;
  panelOpen?: boolean;
}

export function ElementInspectOrchestrator({
  children,
  instanceConfig,
  state,
  commitTweakState,
  onInspectTabOpen,
  onInspectTabClear,
  onJumpToColorTab,
  panelOpen = true,
}: ElementInspectOrchestratorProps) {
  const tokenIndex = useMemo(() => buildTokenIndex(instanceConfig), [instanceConfig]);
  const [armed, setArmed] = useState(false);
  const [pinned, setPinned] = useState<Element | null>(null);
  const [result, setResult] = useState<FindTokensForElementResult | null>(null);
  const pickerRef = useRef<import('../picker').AltClickPickerHandle | null>(null);

  const pin = useCallback((element: Element) => {
    if (!element.isConnected) return;
    setPinned(element);
    setResult(findTokensForElement(element, tokenIndex));
    onInspectTabOpen();
  }, [onInspectTabOpen, tokenIndex]);

  const arm = useCallback(() => setArmed(true), []);
  const disarm = useCallback(() => {
    pickerRef.current?.disarm();
    setArmed(false);
  }, []);
  useEffect(() => {
    if (!panelOpen) disarm();
  }, [disarm, panelOpen]);
  useEffect(() => {
    if (!armed || typeof window === 'undefined') return;
    const handleBlur = () => disarm();
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [armed, disarm]);
  const toggle = useCallback(() => {
    setArmed((value) => {
      const next = !value;
      if (!next) pickerRef.current?.disarm();
      return next;
    });
  }, []);

  const handlePick = useCallback((element: Element) => {
    pin(element);
    pickerRef.current?.disarm();
    setArmed(false);
  }, [pin]);

  const clear = useCallback(() => {
    pickerRef.current?.disarm();
    setArmed(false);
    setPinned(null);
    setResult(null);
    onInspectTabClear();
  }, [onInspectTabClear]);

  const handleArmingRevoked = useCallback(() => {
    setArmed(false);
  }, []);

  const handlePinnedDetached = useCallback(() => {
    setPinned(null);
    setResult(null);
    onInspectTabClear();
  }, [onInspectTabClear]);

  const setValue = useCallback((address: TokenAddress, next: string) => {
    commitTweakState(
      'element-inspect-adjust',
      (previous) => updateStateAtAddress(previous, address, next),
      { address: `element-inspect.${address.tabId}.${address.tierId}.${address.itemId}` },
    );
  }, [commitTweakState]);

  const deleteValue = useCallback((address: TokenAddress) => {
    commitTweakState(
      'element-inspect-revert',
      (previous) => deleteStateAtAddress(previous, address),
      { address: `element-inspect.${address.tabId}.${address.tierId}.${address.itemId}` },
    );
  }, [commitTweakState]);

  const entries = useMemo(
    () => buildControllerEntries(instanceConfig, state, tokenIndex),
    [instanceConfig, state, tokenIndex],
  );
  const contextValue = useMemo<ElementInspectContextValue>(
    () => ({ armed, pinned, result, arm, disarm, toggle, pin, clear }),
    [arm, armed, clear, disarm, pin, result, toggle, pinned],
  );
  const jumpToColorTab = useCallback(() => onJumpToColorTab?.(), [onJumpToColorTab]);

  return (
    <TokenControllerProvider
      entries={entries}
      setValue={setValue}
      deleteValue={deleteValue}
      jumpTo={onJumpToColorTab ? jumpToColorTab : undefined}
    >
      <ElementInspectContext.Provider value={contextValue}>
        {children}
        <ElementInspectPortal
          armed={armed}
          pickerRef={pickerRef}
          pinned={pinned}
          onElementPicked={handlePick}
          onPinnedDetached={handlePinnedDetached}
          onArmingRevoked={handleArmingRevoked}
        />
      </ElementInspectContext.Provider>
    </TokenControllerProvider>
  );
}
