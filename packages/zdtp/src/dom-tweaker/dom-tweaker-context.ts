/**
 * DOM Tweaker controller — shared eager-side state for the feature.
 *
 * Created by `useDomTweaker` (the orchestrator) and handed to the header
 * toggle button. The lazy feature runtime is intentionally not exposed here —
 * the eager side only owns the enabled bit and the first-enable lazy trigger.
 */

import type { ReadonlySignal } from '@takazudo/zfb/zudo-react';

export type DomTweakerRuntimeStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface DomTweakerController {
  /** Whether DOM Tweaker is enabled for this panel instance. */
  enabled: ReadonlySignal<boolean>;
  /** Enable / disable DOM Tweaker. */
  setEnabled: (enabled: boolean) => void;
  /** Toggle DOM Tweaker. */
  toggle: () => void;
  /** Page-lifetime Tailwind runtime status. */
  runtimeStatus: ReadonlySignal<DomTweakerRuntimeStatus>;
  /** Open the lazy diff-export modal from the header toggle area. */
  openDiffExport: () => void;
}
