/** @jsxImportSource @takazudo/zfb/zudo-react */
/**
 * HighlightToggleButton — eye icon that toggles CSS-variable-based highlighting.
 *
 * Reads the panel's highlight service to determine active state and slot
 * colour. When the service holds null (no orchestrator above the subtree —
 * e.g. in unit tests), the component renders nothing so rows degrade
 * gracefully.
 */

import { computed, Show, type ReadonlySignal } from '@takazudo/zfb/zudo-react';
import { read, type MaybeSignal } from '../zr/live';
import type { HighlightContextValue } from './highlight-context';

export interface HighlightToggleButtonProps {
  cssVar: MaybeSignal<string>;
  highlight: ReadonlySignal<HighlightContextValue | null>;
}

export function HighlightToggleButton(props: HighlightToggleButtonProps) {
  const { highlight } = props;
  const hasContext = computed(() => highlight.value !== null);
  const slotIdx = computed(() => highlight.value?.state.active[read(props.cssVar)]);
  const isActive = computed(() => slotIdx.value !== undefined);

  const handleToggle = () => {
    highlight.value?.toggle(read(props.cssVar));
  };

  const title = computed(() => {
    const cssVar = read(props.cssVar);
    if (!isActive.value) return `Highlight elements using ${cssVar}`;
    const count = highlight.value?.matchCounts?.[cssVar];
    return `Stop highlighting ${cssVar}` + (count !== undefined ? ` (${count} element${count === 1 ? '' : 's'})` : '');
  });
  const style = computed(() => {
    const idx = slotIdx.value;
    const color = idx === undefined ? undefined : highlight.value?.state.slots[idx]?.color;
    return color ? { color } : {};
  });

  return (
    <Show when={hasContext}>
      {() => (
        <div
          role="button"
          tabindex={0}
          class={computed(() => (isActive.value ? 'tokenpanel-highlight-toggle is-active' : 'tokenpanel-highlight-toggle'))}
          on:click={handleToggle}
          on:keydown={(e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleToggle();
            }
          }}
          title={title}
          style={style}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <Show
              when={isActive}
              fallback={() => (
                // eye-off: slashed eye
                <>
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </>
              )}
            >
              {() => (
                // eye-open: outer path + pupil circle
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </Show>
          </svg>
        </div>
      )}
    </Show>
  );
}
