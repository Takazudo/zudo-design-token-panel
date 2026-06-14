/**
 * ElementPathContext — shared state for the Element Path Copy feature.
 *
 * Provided by `ElementPathOrchestrator`; consumed by the header toggle button
 * (`ElementPathToggleButton`) and the inspector overlay. When the context is
 * null (component rendered outside the orchestrator — e.g. a bare unit test),
 * consumers degrade gracefully and render nothing.
 */

import { createContext } from 'preact';

export interface ElementPathContextValue {
  /** Whether inspect mode is enabled (persisted). */
  enabled: boolean;
  /** Enable / disable inspect mode. */
  setEnabled: (enabled: boolean) => void;
  /** Toggle inspect mode. */
  toggle: () => void;
}

export const ElementPathContext = createContext<ElementPathContextValue | null>(null);
