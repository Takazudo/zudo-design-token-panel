/** @jsxImportSource @takazudo/zfb/zudo-react */
import { batch, computed, getScope, signal, type ReadonlySignal } from '@takazudo/zfb/zudo-react';
import type { AltClickPickerHandle } from '../picker';
import { useMountPortal } from '../zr/portal';
import { buildTokenIndex, type TokenIndex } from '../utils/token-index';
import type { PanelConfig } from '../config/panel-config';
import type { TweakState } from '../state/tweak-state';
import type { CommitTweakStateOptions, TweakStateUpdater } from '../state/transaction';
import type { FlatTabEntry, TokenAddress } from '../tabs/flat/types';
import { tokenAddressKey as flatTokenAddressKey } from '../tabs/flat/types';
import type { TokenControllerRegistry } from '../tabs/flat/token-controller';
import { findTokensForElement, type FindTokensForElementResult } from './find-tokens-for-element';
import type { ElementInspectController } from './element-inspect-context';
import { ELEMENT_INSPECT_PORTAL_MOUNT_ID, ElementInspectLayer } from './element-inspect-overlay';

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

export interface ElementInspectOptions {
  instanceConfig: PanelConfig;
  state: ReadonlySignal<TweakState | null>;
  commitTweakState: CommitTweakState;
  onInspectTabOpen: () => void;
  onInspectTabClear: () => void;
  onJumpToColorTab?: () => void;
  panelOpen?: ReadonlySignal<boolean>;
}

/**
 * Run the element → tokens inspector for the calling component's lifetime:
 * the picker and pinned marker render in a body-level portal, and the
 * returned controller drives the header toggle and the Inspect view.
 */
export function useElementInspect({
  instanceConfig,
  state,
  commitTweakState,
  onInspectTabOpen,
  onInspectTabClear,
  onJumpToColorTab,
  panelOpen,
}: ElementInspectOptions): ElementInspectController {
  const tokenIndex = buildTokenIndex(instanceConfig);
  const armed = signal(false);
  const pinned = signal<Element | null>(null);
  const result = signal<FindTokensForElementResult | null>(null);
  const pickerHandle: { current: AltClickPickerHandle | null } = { current: null };

  const pin = (element: Element) => {
    if (!element.isConnected) return;
    batch(() => {
      pinned.value = element;
      result.value = findTokensForElement(element, tokenIndex);
    });
    onInspectTabOpen();
  };

  const arm = () => {
    armed.value = true;
  };
  const disarm = () => {
    pickerHandle.current?.disarm();
    armed.value = false;
  };
  const toggle = () => {
    const next = !armed.value;
    if (!next) pickerHandle.current?.disarm();
    armed.value = next;
  };

  const handlePick = (element: Element) => {
    pin(element);
    disarm();
  };

  const clear = () => {
    disarm();
    batch(() => {
      pinned.value = null;
      result.value = null;
    });
    onInspectTabClear();
  };

  const handlePinnedDetached = () => {
    batch(() => {
      pinned.value = null;
      result.value = null;
    });
    onInspectTabClear();
  };

  const scope = getScope();
  if (panelOpen) {
    scope.effect(() => {
      if (!panelOpen.value) disarm();
    });
  }
  scope.effect(() => {
    if (!armed.value) return;
    const handleBlur = () => disarm();
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  });

  const setValue = (address: TokenAddress, next: string) => {
    commitTweakState(
      'element-inspect-adjust',
      (previous) => updateStateAtAddress(previous, address, next),
      { address: `element-inspect.${address.tabId}.${address.tierId}.${address.itemId}` },
    );
  };

  const deleteValue = (address: TokenAddress) => {
    commitTweakState(
      'element-inspect-revert',
      (previous) => deleteStateAtAddress(previous, address),
      { address: `element-inspect.${address.tabId}.${address.tierId}.${address.itemId}` },
    );
  };

  const jumpTo = onJumpToColorTab ? () => onJumpToColorTab() : undefined;
  const tokens = computed<TokenControllerRegistry>(() => ({
    entries: buildControllerEntries(instanceConfig, state.value, tokenIndex),
    setValue,
    deleteValue,
    ...(jumpTo ? { jumpTo } : {}),
  }));

  useMountPortal(ELEMENT_INSPECT_PORTAL_MOUNT_ID, () => (
    <ElementInspectLayer
      armed={armed}
      pinned={pinned}
      pickerHandle={pickerHandle}
      onElementPicked={handlePick}
      onPinnedDetached={handlePinnedDetached}
      onArmingRevoked={() => {
        armed.value = false;
      }}
    />
  ));
  // The toggle only enables the picker; arm it too so the next click picks
  // without holding Alt.
  scope.effect(() => {
    if (armed.value) pickerHandle.current?.arm();
  });

  return { armed, pinned, result, tokens, arm, disarm, toggle, pin, clear };
}
