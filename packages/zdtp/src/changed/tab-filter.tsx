import type { JSX } from 'preact';

export interface ChangedOnlyToggleProps {
  enabled: boolean;
  count: number;
  onChange: (enabled: boolean) => void;
}

/** Transient active-tab Changed-only filter (never persisted). */
export function ChangedOnlyToggle({
  enabled,
  count,
  onChange,
}: ChangedOnlyToggleProps): JSX.Element {
  return (
    <label className="tokenpanel-changed-only-toggle">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => onChange((event.currentTarget as HTMLInputElement).checked)}
        aria-label="Changed only"
        className="tokenpanel-changed-only-checkbox"
      />
      <span>Changed only ({count})</span>
    </label>
  );
}
