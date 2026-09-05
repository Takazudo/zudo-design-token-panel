import * as constants from '@takazudo/zdtp/constants';

const {
  DEFAULT_STORAGE_PREFIX,
  DEFAULT_TOGGLE_EVENT,
  EAGER_LOAD_GATE_KEY_SUFFIXES,
  EAGER_LOAD_GATE_STATE_FAMILY,
  resolveToggleEventName,
} = constants;

// Exercise every exported value so a tree-shaker cannot hide an unreferenced
// export from this consumer check.
const eagerSignals = Object.entries(EAGER_LOAD_GATE_KEY_SUFFIXES).map(
  ([suffix, signal]) => ({
    suffix,
    acceptedValues: [...signal.acceptedValues],
    requiredConfig: signal.requiredConfig,
  }),
);
const stateValueRules = Object.entries(EAGER_LOAD_GATE_STATE_FAMILY.valueRules).map(
  ([name, value]) => ({ name, value }),
);
const defaultEvent = resolveToggleEventName({});
const customEvent = resolveToggleEventName({
  storagePrefix: 'packed-constants-consumer',
  toggleEvent: 'host:toggle',
});
const stateFamilyMatch = EAGER_LOAD_GATE_STATE_FAMILY.matchesKey(
  'packed-constants-consumer',
  'packed-constants-consumer-state-v2',
);

const baseline = globalThis.__zdtpConstantsBaseline;
const registry = globalThis[Symbol.for('@takazudo/zdtp:singleton')];
const panelNodes = document.querySelectorAll('[class*="tokenpanel"], [id*="tokenpanel"]').length;
const styleNodes = document.querySelectorAll('style, link[rel="stylesheet"]').length;
const globalSideEffects = Object.getOwnPropertyNames(globalThis).filter(
  (key) =>
    !baseline?.globalKeys?.includes(key) &&
    key !== '__zdtpConstantsBaseline' &&
    key !== '__zdtpConstantsSmoke' &&
    !key.startsWith('__vite'),
);

globalThis.__zdtpConstantsSmoke = {
  exportedKeys: Object.keys(constants).sort(),
  defaultPrefix: DEFAULT_STORAGE_PREFIX,
  defaultToggleEvent: DEFAULT_TOGGLE_EVENT,
  defaultEvent,
  customEvent,
  eagerSignals,
  stateValueRules,
  stateFamilyMatch,
  baseline,
  panelNodes,
  styleNodes,
  globalSideEffects,
  registryPresent: registry !== undefined,
  registrySize: registry?.instances instanceof Map ? registry.instances.size : 0,
};
