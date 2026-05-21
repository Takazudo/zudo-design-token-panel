import { createContext } from 'preact';
import type { HighlightState, HighlightSlotSpec } from './highlight-state';

export interface HighlightContextValue {
  state: HighlightState;
  toggle: (cssVar: string) => void;
  setSlot?: (index: number, partial: Partial<HighlightSlotSpec>) => void;
  reset?: () => void;
  matchCounts?: Record<string, number>;
}

export const HighlightContext = createContext<HighlightContextValue | null>(null);
