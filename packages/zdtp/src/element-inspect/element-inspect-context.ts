import { createContext } from 'preact';
import type { FindTokensForElementResult } from './find-tokens-for-element';

/** The synthetic tab id used by the transient element-inspect view. */
export const ELEMENT_INSPECT_TAB_ID = 'inspect';

export interface ElementInspectContextValue {
  /** Whether the picker is armed by the header toggle or the `I` shortcut. */
  armed: boolean;
  /** The page element currently pinned for inspection. */
  pinned: Element | null;
  /** Scanner output for the pinned element. */
  result: FindTokensForElementResult | null;
  /** Arm the picker programmatically. */
  arm: () => void;
  /** Disarm the picker without clearing the pinned element. */
  disarm: () => void;
  /** Toggle picker arming. */
  toggle: () => void;
  /** Pin a host element and refresh its token scan. */
  pin: (element: Element) => void;
  /** Clear the pinned element and return to the tab that preceded Inspect. */
  clear: () => void;
}

export const ElementInspectContext = createContext<ElementInspectContextValue | null>(null);
