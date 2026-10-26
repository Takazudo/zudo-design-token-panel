/**
 * Element Path Copy controller — shared state for the feature.
 *
 * Created by `useElementPath` (the orchestrator) and handed to the header
 * toggle button. A toggle rendered without a controller renders nothing.
 */

import type { ReadonlySignal } from '@takazudo/zfb/zudo-react';

export interface ElementPathController {
  /** Whether inspect mode is enabled (persisted). */
  enabled: ReadonlySignal<boolean>;
  /** Enable / disable inspect mode. */
  setEnabled: (enabled: boolean) => void;
  /** Toggle inspect mode. */
  toggle: () => void;
}
