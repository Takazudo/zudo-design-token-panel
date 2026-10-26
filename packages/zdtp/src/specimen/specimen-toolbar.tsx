/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, Show } from '@takazudo/zfb/zudo-react';
import { Checkbox, TextInput } from '../zr/form-controls';
import { read, type MaybeSignal } from '../zr/live';
import type { SpecimenPreset, SpecimenState } from './specimen-state';
import { SPECIMEN_PRESETS } from './specimen-state';

interface SpecimenToolbarProps {
  state: MaybeSignal<SpecimenState>;
  showWidth: boolean;
  onChange: (next: SpecimenState) => void;
  renderOnPage?: MaybeSignal<boolean>;
  onRenderOnPageChange?: (enabled: boolean) => void;
}

const PRESET_OPTIONS: readonly [SpecimenPreset, string][] = [
  ['latin', 'Latin'],
  ['ja', '日本語'],
  ['mixed', 'Mixed'],
];

export default function SpecimenToolbar(props: SpecimenToolbarProps) {
  const { onChange, onRenderOnPageChange } = props;
  const state = computed(() => read(props.state));
  return (
    <div class="tokenpanel-specimen-toolbar">
      <label class="tokenpanel-specimen-field">
        <span class="tokenpanel-specimen-field-label">Preview</span>
        <TextInput
          class="tokenpanel-specimen-text-input"
          value={computed(() => state.value.text)}
          attrs={{ 'aria-label': 'Preview text', placeholder: 'Type your own specimen text…' }}
          onInput={(text) => onChange({ ...state.value, text, overridden: true })}
        />
      </label>
      <div class="tokenpanel-specimen-presets" aria-label="Preview text presets">
        {PRESET_OPTIONS.map(([preset, label]) => {
          const activate = () => onChange({
            ...state.value,
            preset,
            text: SPECIMEN_PRESETS[preset],
            overridden: false,
          });
          const active = computed(() => state.value.preset === preset && !state.value.overridden);
          return (
            <div
              role="button"
              tabindex={0}
              class={computed(() => `tokenpanel-specimen-preset${active.value ? ' is-active' : ''}`)}
              aria-pressed={active}
              on:click={activate}
              on:keydown={(event: KeyboardEvent) => {
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
      <Show when={computed(() => props.showWidth)}>
        {() => (
          <label class="tokenpanel-specimen-width">
            <span>Width</span>
            <TextInput
              type="range"
              value={computed(() => String(state.value.width))}
              attrs={{ min: 240, max: 720, 'aria-label': 'Line-height specimen width' }}
              onInput={(width) => onChange({ ...state.value, width: Number(width) })}
            />
            <span class="tokenpanel-specimen-width-value">{computed(() => `${state.value.width}px`)}</span>
          </label>
        )}
      </Show>
      <label
        class="tokenpanel-specimen-on-page-toggle"
        title="Render the specimen in the host page using its real font, colors, and background"
      >
        <Checkbox
          checked={computed(() => read(props.renderOnPage) ?? false)}
          onChange={(checked) => onRenderOnPageChange?.(checked)}
          aria-label="Render on page"
        />
        <span>Render on page</span>
      </label>
    </div>
  );
}
