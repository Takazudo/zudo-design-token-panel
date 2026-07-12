import { useEffect, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
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

export function useTrackedElementRect(
  target: Element | null,
  visible = true,
  onTargetDisconnected?: () => void,
): TrackedElementRect | null {
  const [rect, setRect] = useState<TrackedElementRect | null>(null);
  const rectRef = useRef<TrackedElementRect | null>(null);
  const disconnectedNotifiedRef = useRef(false);
  rectRef.current = rect;

  useEffect(() => {
    if (!visible || !target) {
      setRect(null);
      disconnectedNotifiedRef.current = false;
      return;
    }

    const trackedTarget = target;
    let rafId = 0;
    let cancelled = false;
    disconnectedNotifiedRef.current = false;

    function tick(): void {
      if (cancelled) return;
      if (!trackedTarget.isConnected) {
        setRect(null);
        if (!disconnectedNotifiedRef.current) {
          disconnectedNotifiedRef.current = true;
          onTargetDisconnected?.();
        }
        return;
      }

      const next = rectFromDomRect(trackedTarget.getBoundingClientRect());
      if (!rectsEqual(rectRef.current, next)) {
        rectRef.current = next;
        setRect(next);
      }
      rafId = window.requestAnimationFrame(tick);
    }

    rafId = window.requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
    };
  }, [target, visible, onTargetDisconnected]);

  return rect;
}

export function rectToFixedStyle(rect: TrackedElementRect): JSX.CSSProperties {
  return {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  };
}

function editButtonStyle(rect: TrackedElementRect): JSX.CSSProperties {
  const size = 28;
  const inset = 10;
  return {
    left: `${Math.min(window.innerWidth - size - 4, Math.max(4, rect.right - inset))}px`,
    top: `${Math.max(4, rect.top - Math.floor(size / 2))}px`,
  };
}

export function PinnedSelectionOverlay({
  target,
  visible = true,
  onTargetDisconnected,
}: PinnedSelectionOverlayProps): JSX.Element | null {
  useEffect(() => {
    ensureDomTweakerStyles();
  }, []);

  const rect = useTrackedElementRect(target, visible, onTargetDisconnected);
  if (!rect) return null;

  return (
    <div
      aria-hidden="true"
      className="tokenpanel-domtweaker-pinned-box"
      data-zdtp-dom-tweaker-overlay=""
      style={rectToFixedStyle(rect)}
    />
  );
}

export function EditIconButton({
  target,
  visible = true,
  onOpenEditor,
  label = 'Edit classes for selected element',
}: EditIconButtonProps): JSX.Element | null {
  useEffect(() => {
    ensureDomTweakerStyles();
  }, []);

  const rect = useTrackedElementRect(target, visible);
  if (!rect) return null;

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    onOpenEditor();
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className="tokenpanel-domtweaker-edit-button"
      aria-label={label}
      title={label}
      onClick={onOpenEditor}
      onKeyDown={handleKeyDown}
      style={editButtonStyle(rect)}
    >
      ✎
    </div>
  );
}
