/** @jsxImportSource @takazudo/zfb/zudo-react */
import { computed, getScope, Show, signal, type ReadonlySignal } from '@takazudo/zfb/zudo-react';
import { read, type MaybeSignal, type Reactive } from '../../zr/live';
import { ensureDomTweakerStyles } from './style-injection';

export interface TrackedElementRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface PinnedSelectionOverlayProps {
  /** Element picked by the DOM Tweaker coordinator. */
  target: Element | null;
  /** Defaults to true. Passing false keeps the component mounted but inert. */
  visible?: boolean;
  /** Fired once when the pinned element leaves the document. */
  onTargetDisconnected?: () => void;
}

export interface EditIconButtonProps {
  /** Element picked by the DOM Tweaker coordinator. */
  target: Element | null;
  /** Defaults to true. Passing false keeps the component mounted but inert. */
  visible?: boolean;
  /** Opens the class editor popover. */
  onOpenEditor: () => void;
  /** Accessible label for the icon-only control. */
  label?: string;
}

function rectFromDomRect(rect: DOMRect): TrackedElementRect {
  return {
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

function rectsEqual(a: TrackedElementRect | null, b: TrackedElementRect): boolean {
  return (
    a !== null &&
    a.top === b.top &&
    a.left === b.left &&
    a.right === b.right &&
    a.bottom === b.bottom &&
    a.width === b.width &&
    a.height === b.height
  );
}

/**
 * Track `target`'s viewport rect every frame while visible; null while hidden,
 * absent, or detached. Call during component setup.
 */
export function trackElementRect(
  target: MaybeSignal<Element | null>,
  visible: MaybeSignal<boolean | undefined>,
  onTargetDisconnected?: () => void,
): ReadonlySignal<TrackedElementRect | null> {
  const rect = signal<TrackedElementRect | null>(null);

  getScope().effect(() => {
    const trackedTarget = read(target);
    if ((read(visible) ?? true) === false || !trackedTarget) {
      rect.value = null;
      return;
    }

    let rafId = 0;
    let cancelled = false;
    let disconnectedNotified = false;
    let current: TrackedElementRect | null = null;

    function tick(): void {
      if (cancelled) return;
      if (!trackedTarget!.isConnected) {
        rect.value = null;
        if (!disconnectedNotified) {
          disconnectedNotified = true;
          onTargetDisconnected?.();
        }
        return;
      }

      const next = rectFromDomRect(trackedTarget!.getBoundingClientRect());
      if (!rectsEqual(current, next)) {
        current = next;
        rect.value = next;
      }
      rafId = window.requestAnimationFrame(tick);
    }

    rafId = window.requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
    };
  });

  return rect;
}

export function rectToFixedStyle(rect: TrackedElementRect): Record<string, string> {
  return {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  };
}

function editButtonStyle(rect: TrackedElementRect): Record<string, string> {
  const size = 28;
  const inset = 10;
  return {
    left: `${Math.min(window.innerWidth - size - 4, Math.max(4, rect.right - inset))}px`,
    top: `${Math.max(4, rect.top - Math.floor(size / 2))}px`,
  };
}

export function PinnedSelectionOverlay(
  props: Reactive<PinnedSelectionOverlayProps, 'onTargetDisconnected'>,
) {
  getScope().onActivate(() => {
    ensureDomTweakerStyles();
  });

  const rect = trackElementRect(props.target, props.visible, props.onTargetDisconnected);

  return (
    <Show when={computed(() => rect.value !== null)}>
      {() => (
        <div
          aria-hidden="true"
          class="tokenpanel-domtweaker-pinned-box"
          data-zdtp-dom-tweaker-overlay=""
          style={computed(() => (rect.value ? rectToFixedStyle(rect.value) : {}))}
        />
      )}
    </Show>
  );
}

export function EditIconButton(props: Reactive<EditIconButtonProps, 'onOpenEditor' | 'label'>) {
  const { onOpenEditor, label = 'Edit classes for selected element' } = props;
  getScope().onActivate(() => {
    ensureDomTweakerStyles();
  });

  const rect = trackElementRect(props.target, props.visible);

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    onOpenEditor();
  }

  return (
    <Show when={computed(() => rect.value !== null)}>
      {() => (
        <div
          role="button"
          tabindex={0}
          class="tokenpanel-domtweaker-edit-button"
          aria-label={label}
          title={label}
          on:click={onOpenEditor}
          on:keydown={handleKeyDown}
          style={computed(() => (rect.value ? editButtonStyle(rect.value) : {}))}
        >
          ✎
        </div>
      )}
    </Show>
  );
}
