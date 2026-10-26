import { useContext, useLayoutEffect, useRef } from 'preact/hooks';
import { batch, signal, type Signal } from '@takazudo/zfb/zudo-react';
import { useTokenChainContext, type TokenChainContextValue } from '../chain/token-chain-context';
import { useTooltipController } from '../controls/tooltip-preact';
import type { HighlightContextValue } from '../highlight/highlight-context';
import { HighlightContext } from '../highlight/highlight-context-preact';
import { useLayerActiveSetter } from '../shell/layer-activity';
import type { PanelServices } from './panel-services';

/**
 * Build the stable `PanelServices` object for a zudo-react subtree from the
 * Preact contexts above a bridge (epic #1075). Context changes update the
 * service signals rather than replacing the object.
 */
export function usePanelServices(): PanelServices {
  const tooltip = useTooltipController();
  const highlight = useContext(HighlightContext);
  const chain = useTokenChainContext();
  const setLayerActive = useLayerActiveSetter();
  const ref = useRef<{
    services: PanelServices;
    highlight: Signal<HighlightContextValue | null>;
    chain: Signal<TokenChainContextValue | null>;
  } | null>(null);
  if (ref.current === null) {
    const highlightSignal = signal<HighlightContextValue | null>(highlight);
    const chainSignal = signal<TokenChainContextValue | null>(chain);
    ref.current = {
      services: { tooltip, highlight: highlightSignal, chain: chainSignal, setLayerActive },
      highlight: highlightSignal,
      chain: chainSignal,
    };
  }
  const current = ref.current;
  useLayoutEffect(() => {
    batch(() => {
      current.highlight.value = highlight;
      current.chain.value = chain;
    });
  }, [current, highlight, chain]);
  return current.services;
}
