import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { pushDismissLayer } from '../../controls/dismiss-layer';
import { filterSuggestions } from './suggestions';
import { ensureDomTweakerStyles } from './style-injection';
import {
  type TrackedElementRect,
  useTrackedElementRect,
} from './pinned-selection-overlay';

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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeClassEditorPosition(rect: TrackedElementRect): JSX.CSSProperties {
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

function useDismissablePopover(
  containerRef: { current: HTMLElement | null },
  onClose: () => void,
  enabled: boolean,
): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!enabled) return;

    function handlePointerDown(e: PointerEvent): void {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (containerRef.current?.contains(target)) return;
      onCloseRef.current();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    const removeLayer = pushDismissLayer({
      onEscape: () => onCloseRef.current(),
      getElement: () => containerRef.current,
    });
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      removeLayer();
    };
  }, [containerRef, enabled]);
}

export function ClassEditorPopup({
  target,
  selectorSummary,
  currentClasses,
  suggestions,
  onAddClass,
  onRemoveClass,
  onClose,
  visible = true,
}: ClassEditorPopupProps): JSX.Element | null {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    ensureDomTweakerStyles();
  }, []);

  const rect = useTrackedElementRect(target, visible, onClose);
  const filteredSuggestions = useMemo(
    () => filterSuggestions(query.trim(), SUGGESTION_LIMIT, suggestions),
    [query, suggestions],
  );

  useDismissablePopover(containerRef, onClose, visible && rect !== null);

  useEffect(() => {
    if (!visible || rect === null) return;
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [rect, visible]);

  if (!visible || rect === null) return null;

  function commitClass(className: string): void {
    const trimmed = className.trim();
    if (!trimmed) return;
    onAddClass(trimmed);
    setQuery('');
    setActiveIndex(-1);
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      if (filteredSuggestions.length === 0) return;
      e.preventDefault();
      setActiveIndex((index) => (index + 1) % filteredSuggestions.length);
      return;
    }
    if (e.key === 'ArrowUp') {
      if (filteredSuggestions.length === 0) return;
      e.preventDefault();
      setActiveIndex((index) =>
        index <= 0 ? filteredSuggestions.length - 1 : index - 1,
      );
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const selected =
        activeIndex >= 0 ? filteredSuggestions[activeIndex] : undefined;
      commitClass(selected ?? query);
    }
  }

  const listboxId = 'tokenpanel-domtweaker-suggestions';
  const hasSuggestions = filteredSuggestions.length > 0;

  return (
    <div
      ref={containerRef}
      className="tokenpanel-domtweaker-popover"
      data-tokenpanel-domtweaker-popover=""
      style={computeClassEditorPosition(rect)}
    >
      <div className="tokenpanel-domtweaker-popover__header">
        <div
          role="heading"
          aria-level={2}
          className="tokenpanel-domtweaker-popover__title"
        >
          Classes
        </div>
        <div
          role="button"
          tabIndex={0}
          className="tokenpanel-domtweaker-popover__close"
          aria-label="Close class editor"
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            onClose();
          }}
        >
          ×
        </div>
      </div>

      <div className="tokenpanel-domtweaker-popover__summary">{selectorSummary}</div>

      <div className="tokenpanel-domtweaker-popover__chips">
        {currentClasses.map((className) => (
          <span key={className} className="tokenpanel-domtweaker-popover__chip">
            <span className="tokenpanel-domtweaker-popover__chip-text">
              {className}
            </span>
            <span
              role="button"
              tabIndex={0}
              className="tokenpanel-domtweaker-popover__chip-remove"
              aria-label={`Remove ${className}`}
              onClick={() => onRemoveClass(className)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                onRemoveClass(className);
              }}
            >
              ×
            </span>
          </span>
        ))}
      </div>

      <div
        className="tokenpanel-domtweaker-popover__input-wrap"
        onKeyDown={handleKeyDown}
      >
        <input
          ref={inputRef}
          className="tokenpanel-domtweaker-popover__input"
          value={query}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={hasSuggestions}
          aria-controls={hasSuggestions ? listboxId : undefined}
          placeholder="Add Tailwind class…"
          onInput={(e) => {
            setQuery(e.currentTarget.value);
            setActiveIndex(-1);
          }}
        />
        {hasSuggestions && (
          <div
            id={listboxId}
            role="listbox"
            className="tokenpanel-domtweaker-popover__listbox"
          >
            {filteredSuggestions.map((suggestion, index) => (
              <div
                key={suggestion}
                role="option"
                aria-selected={index === activeIndex}
                className="tokenpanel-domtweaker-popover__option"
                onClick={() => commitClass(suggestion)}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
