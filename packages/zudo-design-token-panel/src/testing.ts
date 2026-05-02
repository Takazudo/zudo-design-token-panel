/**
 * /testing sub-export — test-utility symbols for storage-key continuity tests.
 *
 * Re-exports symbols that consumers need to write storage-key continuity and
 * manifest-ordering tests without reaching into the package's internal source
 * paths. Intended for use in test files only — not for production code.
 *
 * Consumer usage:
 *   import { configurePanel, storageKey_open, ... } from '@takazudo/zudo-design-token-panel/testing';
 */

// ---------------------------------------------------------------------------
// From src/config/panel-config.ts
// ---------------------------------------------------------------------------
export {
  configurePanel,
  storageKey_open,
  storageKey_position,
  storageKey_stateV1,
  storageKey_stateV2,
  storageKey_visible,
  __resetPanelConfigForTests,
} from './config/panel-config';
export type { PanelConfig } from './config/panel-config';

// ---------------------------------------------------------------------------
// From src/state/tweak-state.ts
// ---------------------------------------------------------------------------
export { getStorageKeyV1, getStorageKeyV2, loadPersistedState } from './state/tweak-state';
export type { ColorTweakState, StorageLike } from './state/tweak-state';

// ---------------------------------------------------------------------------
// From src/tokens/manifest.ts
// ---------------------------------------------------------------------------
export { GROUP_ORDER, FONT_GROUP_ORDER, SIZE_GROUP_ORDER, GROUP_TITLES } from './tokens/manifest';
