import {
  DEFAULT_STORAGE_PREFIX,
  DEFAULT_TOGGLE_EVENT,
  EAGER_LOAD_GATE_KEY_SUFFIXES,
  EAGER_LOAD_GATE_STATE_FAMILY,
  resolveToggleEventName,
} from '@takazudo/zdtp/constants';

const prefix: string = DEFAULT_STORAGE_PREFIX;
const historicalEvent: string = DEFAULT_TOGGLE_EVENT;
const resolvedEvent: string = resolveToggleEventName({ storagePrefix: prefix });

const suffixes: Record<
  string,
  { readonly acceptedValues: readonly string[]; readonly requiredConfig: string | null }
> = EAGER_LOAD_GATE_KEY_SUFFIXES;

const stateRules: {
  readonly blank: boolean;
  readonly jsonNull: boolean;
  readonly object: string;
  readonly array: string;
  readonly primitive: boolean;
  readonly malformedJson: boolean;
} = EAGER_LOAD_GATE_STATE_FAMILY.valueRules;

const familyMatch: boolean = EAGER_LOAD_GATE_STATE_FAMILY.matchesKey(
  prefix,
  `${prefix}-state-v2`,
);

// Keep all public values in the type-check input, including nested metadata.
void [historicalEvent, resolvedEvent, suffixes, stateRules, familyMatch];
