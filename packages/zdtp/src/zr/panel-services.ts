import { signal, type ReadonlySignal } from '@takazudo/zfb/zudo-react';
import type { TokenChainContextValue } from '../chain/token-chain-context';
import type { TooltipController } from '../controls/tooltip-controller';
import type { HighlightContextValue } from '../highlight/highlight-context';

/**
 * Panel-wide services a zudo-react subtree reads. zudo-react has no context,
 * so the subtree root receives one stable object and passes it down.
 */
export interface PanelServices {
  tooltip: TooltipController | null;
  highlight: ReadonlySignal<HighlightContextValue | null>;
  chain: ReadonlySignal<TokenChainContextValue | null>;
  setLayerActive: ((id: string, active: boolean) => void) | null;
}

/** Services with nothing attached — rows degrade to no tooltip/highlight/chain. */
export function createPanelServices(partial: Partial<PanelServices> = {}): PanelServices {
  return {
    tooltip: null,
    highlight: signal(null),
    chain: signal(null),
    setLayerActive: null,
    ...partial,
  };
}
