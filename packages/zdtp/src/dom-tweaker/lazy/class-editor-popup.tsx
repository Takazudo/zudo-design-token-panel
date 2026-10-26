/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, For, getScope, Show, signal, type ReadonlySignal, type Ref } from '@takazudo/zfb/zudo-react';
import { pushDismissLayer } from '../../controls/dismiss-layer';
import { filterSuggestions } from './suggestions';
import { ensureDomTweakerStyles } from './style-injection';
import {
  type TrackedElementRect,
  trackElementRect,
} from './pinned-selection-overlay';
import { read, type Reactive } from '../../zr/live';

const POPOVER_WIDTH = 320;
const POPOVER_ESTIMATED_HEIGHT = 300;
const VIEWPORT_GAP = 8;
const SUGGESTION_LIMIT = 8;

export interface ClassEditorPopupProps {
  target: Element | null;
  selectorSummary: string;
  currentClasses: readonly string[];
  suggestions: readonly string[];
  onAddClass: (className: string) => void;
  onRemoveClass: (className: string) => void;
  onClose: () => void;
  visible?: boolean;
}

export type ClassEditorPopupStaticKeys = 'suggestions' | 'onAddClass' | 'onRemoveClass' | 'onClose';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeClassEditorPosition(rect: TrackedElementRect): Record<string, string> {
  const maxLeft = Math.max(VIEWPORT_GAP, window.innerWidth - POPOVER_WIDTH - VIEWPORT_GAP);
  const left = clamp(rect.left, VIEWPORT_GAP, maxLeft);
  const belowTop = rect.bottom + VIEWPORT_GAP;
  const top =
    belowTop + POPOVER_ESTIMATED_HEIGHT <= window.innerHeight
      ? belowTop
      : Math.max(VIEWPORT_GAP, rect.top - POPOVER_ESTIMATED_HEIGHT - VIEWPORT_GAP);

  return {
    left: `${left}px`,
    top: `${top}px`,
  };
}

function onActivateKey(handler: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    handler();
  };
}

export function ClassEditorPopup(props: Reactive<ClassEditorPopupProps, ClassEditorPopupStaticKeys>) {
  const { suggestions, onAddClass, onRemoveClass, onClose } = props;
  getScope().onActivate(() => {
    ensureDomTweakerStyles();
  });

  const visible = computed(() => read(props.visible) ?? true);
  const rect = trackElementRect(props.target, visible, onClose);

  return (
    <Show when={computed(() => visible.value && rect.value !== null)}>
      {() => (
        <ClassEditorBody
          rect={rect}
          selectorSummary={computed(() => read(props.selectorSummary))}
          currentClasses={computed(() => read(props.currentClasses))}
          suggestions={suggestions}
          onAddClass={onAddClass}
          onRemoveClass={onRemoveClass}
          onClose={onClose}
        />
      )}
    </Show>
  );
}

function ClassEditorBody(props: {
  rect: ReadonlySignal<TrackedElementRect | null>;
  selectorSummary: ReadonlySignal<string>;
  currentClasses: ReadonlySignal<readonly string[]>;
  suggestions: readonly string[];
  onAddClass: (className: string) => void;
  onRemoveClass: (className: string) => void;
  onClose: () => void;
}) {
  const { rect, suggestions, onAddClass, onRemoveClass, onClose } = props;
  const container: Ref<HTMLDivElement> = { current: null };
  const input: Ref<HTMLInputElement> = { current: null };
  const query = signal('');
  const activeIndex = signal(-1);
  const filteredSuggestions = computed(() =>
    filterSuggestions(query.value.trim(), SUGGESTION_LIMIT, suggestions));
  const hasSuggestions = computed(() => filteredSuggestions.value.length > 0);

  const scope = getScope();
  scope.onActivate(() => {
    function handlePointerDown(e: PointerEvent): void {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (container.current?.contains(target)) return;
      onClose();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    const removeLayer = pushDismissLayer({
      onEscape: () => onClose(),
      getElement: () => container.current,
    });
    window.requestAnimationFrame(() => input.current?.focus());
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      removeLayer();
    };
  });
  scope.effect(() => {
    const value = query.value;
    if (input.current && input.current.value !== value) input.current.value = value;
  });

  function commitClass(className: string): void {
    const trimmed = className.trim();
    if (!trimmed) return;
    onAddClass(trimmed);
    query.value = '';
    activeIndex.value = -1;
  }

  function handleKeyDown(e: KeyboardEvent): void {
    const count = filteredSuggestions.value.length;
    if (e.key === 'Escape') {
      // The dismiss-layer stack may already have closed this popover.
      if (e.defaultPrevented) return;
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      if (count === 0) return;
      e.preventDefault();
      activeIndex.value = (activeIndex.value + 1) % count;
      return;
    }
    if (e.key === 'ArrowUp') {
      if (count === 0) return;
      e.preventDefault();
      activeIndex.value = activeIndex.value <= 0 ? count - 1 : activeIndex.value - 1;
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const selected =
        activeIndex.value >= 0 ? filteredSuggestions.value[activeIndex.value] : undefined;
      commitClass(selected ?? query.value);
    }
  }

  const listboxId = 'tokenpanel-domtweaker-suggestions';

  return (
    <div
      ref={container}
      class="tokenpanel-domtweaker-popover"
      data-tokenpanel-domtweaker-popover=""
      style={computed(() => (rect.value ? computeClassEditorPosition(rect.value) : {}))}
    >
      <div class="tokenpanel-domtweaker-popover__header">
        <div
          role="heading"
          aria-level={2}
          class="tokenpanel-domtweaker-popover__title"
        >
          Classes
        </div>
        <div
          role="button"
          tabindex={0}
          class="tokenpanel-domtweaker-popover__close"
          aria-label="Close class editor"
          on:click={onClose}
          on:keydown={onActivateKey(onClose)}
        >
          ×
        </div>
      </div>

      <div class="tokenpanel-domtweaker-popover__summary">{props.selectorSummary}</div>

      <div class="tokenpanel-domtweaker-popover__chips">
        <For each={props.currentClasses} by={(className) => className}>
          {(entry) => {
            const className = entry.value;
            const remove = () => onRemoveClass(className);
            return (
              <span class="tokenpanel-domtweaker-popover__chip">
                <span class="tokenpanel-domtweaker-popover__chip-text">
                  {className}
                </span>
                <span
                  role="button"
                  tabindex={0}
                  class="tokenpanel-domtweaker-popover__chip-remove"
                  aria-label={`Remove ${className}`}
                  on:click={remove}
                  on:keydown={onActivateKey(remove)}
                >
                  ×
                </span>
              </span>
            );
          }}
        </For>
      </div>

      <div
        class="tokenpanel-domtweaker-popover__input-wrap"
        on:keydown={handleKeyDown}
      >
        <input
          ref={input}
          class="tokenpanel-domtweaker-popover__input"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={hasSuggestions}
          aria-controls={computed(() => (hasSuggestions.value ? listboxId : null))}
          placeholder="Add Tailwind class…"
          on:input={(e) => {
            query.value = (e.currentTarget as HTMLInputElement).value;
            activeIndex.value = -1;
          }}
        />
        <Show when={hasSuggestions}>
          {() => (
            <div
              id={listboxId}
              role="listbox"
              class="tokenpanel-domtweaker-popover__listbox"
            >
              <For each={filteredSuggestions} by={(suggestion) => suggestion}>
                {(entry) => {
                  const suggestion = entry.value;
                  return (
                    <div
                      role="option"
                      aria-selected={computed(() =>
                        filteredSuggestions.value.indexOf(suggestion) === activeIndex.value)}
                      class="tokenpanel-domtweaker-popover__option"
                      on:click={() => commitClass(suggestion)}
                    >
                      {suggestion}
                    </div>
                  );
                }}
              </For>
            </div>
          )}
        </Show>
      </div>
    </div>
  );
}
