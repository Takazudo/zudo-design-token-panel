import type { SpecimenPreset, SpecimenState } from './specimen-state';
import { SPECIMEN_PRESETS } from './specimen-state';

interface SpecimenToolbarProps {
  state: SpecimenState;
  showWidth: boolean;
  onChange: (next: SpecimenState) => void;
}

const PRESET_OPTIONS: readonly [SpecimenPreset, string][] = [
  ['latin', 'Latin'],
  ['ja', '日本語'],
  ['mixed', 'Mixed'],
];

export default function SpecimenToolbar({ state, showWidth, onChange }: SpecimenToolbarProps) {
  return (
    <div className="tokenpanel-specimen-toolbar">
      <label className="tokenpanel-specimen-field">
        <span className="tokenpanel-specimen-field-label">Preview</span>
        <input
          className="tokenpanel-specimen-text-input"
          aria-label="Preview text"
          value={state.text}
          placeholder="Type your own specimen text…"
          onInput={(event) => onChange({
            ...state,
            text: event.currentTarget.value,
            overridden: true,
          })}
        />
      </label>
      <div className="tokenpanel-specimen-presets" aria-label="Preview text presets">
        {PRESET_OPTIONS.map(([preset, label]) => {
          const activate = () => onChange({
            ...state,
            preset,
            text: SPECIMEN_PRESETS[preset],
            overridden: false,
          });
          return (
            <div
              key={preset}
              role="button"
              tabIndex={0}
              className={`tokenpanel-specimen-preset${state.preset === preset && !state.overridden ? ' is-active' : ''}`}
              aria-pressed={state.preset === preset && !state.overridden}
              onClick={activate}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  activate();
                }
              }}
            >
              {label}
            </div>
          );
        })}
      </div>
      {showWidth && (
        <label className="tokenpanel-specimen-width">
          <span>Width</span>
          <input
            type="range"
            min={240}
            max={720}
            value={state.width}
            aria-label="Line-height specimen width"
            onInput={(event) => onChange({ ...state, width: Number(event.currentTarget.value) })}
          />
          <span className="tokenpanel-specimen-width-value">{state.width}px</span>
        </label>
      )}
    </div>
  );
}
