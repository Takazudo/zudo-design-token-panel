/**
 * DomTweakerContext — shared eager-side state for the DOM Tweaker feature.
 *
 * Provided by `DomTweakerOrchestrator`; consumed by the header toggle button.
 * The lazy feature runtime is intentionally not exposed here yet — this slice
 * only owns the enabled bit and the first-enable lazy-boundary trigger.
 */

import { createContext } from 'preact';

export type DomTweakerRuntimeStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface DomTweakerContextValue {
  /** Whether DOM Tweaker is enabled for this panel instance. */
  enabled: boolean;
  /** Enable / disable DOM Tweaker. */
  setEnabled: (enabled: boolean) => void;
  /** Toggle DOM Tweaker. */
  toggle: () => void;
  /** Page-lifetime Tailwind runtime status. */
  runtimeStatus: DomTweakerRuntimeStatus;
  /** Open the lazy diff-export modal from the header toggle area. */
  openDiffExport: () => void;
}

export const DomTweakerContext = createContext<DomTweakerContextValue | null>(null);
