import type { HighlightState, HighlightSlotSpec } from './highlight-state';
import type { TokenAddress } from '../utils/token-index';

export interface HighlightContextValue {
  state: HighlightState;
  toggle: (cssVar: string) => void;
  /** Optional — when the orchestrator computes match counts it injects them here for title attributes. */
  matchCounts?: Record<string, number>;
  /** Lazily probe and cache the number of page elements using one token address. */
  requestMatchCount?: (address: TokenAddress) => number | undefined;
  /** Optional — orchestrator may expose setSlot for slot colour editing. */
  setSlot?: (index: number, partial: Partial<HighlightSlotSpec>) => void;
  /** Optional — orchestrator may expose setOutlineWidth for global outline width editing. */
  setOutlineWidth?: (width: number) => void;
  /** Optional — orchestrator may expose reset to clear all active highlights. */
  reset?: () => void;
  /** Optional — orchestrator may expose disableAll to clear the active map while preserving slot colours. */
  disableAll?: () => void;
}
