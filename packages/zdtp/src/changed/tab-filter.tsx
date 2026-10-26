/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed } from '@takazudo/zfb/zudo-react';
import { Checkbox } from '../zr/form-controls';
import { read, type MaybeSignal } from '../zr/live';

export interface ChangedOnlyToggleProps {
  enabled: MaybeSignal<boolean>;
  count: MaybeSignal<number>;
  onChange: (enabled: boolean) => void;
}

/** Transient active-tab Changed-only filter (never persisted). */
export function ChangedOnlyToggle({
  enabled,
  count,
  onChange,
}: ChangedOnlyToggleProps) {
  return (
    <label class="tokenpanel-changed-only-toggle">
      <Checkbox
        checked={enabled}
        onChange={onChange}
        aria-label="Changed only"
        class="tokenpanel-changed-only-checkbox"
      />
      <span>{computed(() => `Changed only (${read(count)})`)}</span>
    </label>
  );
}
