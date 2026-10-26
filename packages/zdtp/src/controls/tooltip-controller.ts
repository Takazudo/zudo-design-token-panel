/**
 * Framework-free controller for the panel's single shared tooltip element.
 *
 * One controller per mounted panel owns a `.tokenpanel-tooltip` element on
 * `document.body` (so panel overflow clipping cannot hide it), positions it
 * over the current trigger, and hides it on Escape, scroll, and resize.
 * zudo-react triggers drive it through `tooltipTrigger` (`tooltip.ts`).
 */

/**
 * Opt-in tooltip presentation variant. `'help'` applies the wrapped,
 * bounded-width `.tokenpanel-tooltip--help` class (see panel.css) instead of
 * the default token tooltip — used by `controls/help-icon.tsx`
 * for the multi-sentence Literal / Per-mode explainer tips.
 */
export type TooltipVariant = 'help';

/** Opt-in horizontal anchor for triggers whose box is wider than its text. */
export type TooltipAnchor = 'text';

export interface TooltipOptions {
  /** Opt into a presentation variant — see `TooltipVariant` above. */
  variant?: TooltipVariant;
  /** Opt into horizontal centering over the trigger's displayed text area. */
  anchor?: TooltipAnchor;
}

export interface TooltipController {
  /** The shared tooltip element; attached to `document.body` while connected. */
  readonly element: HTMLDivElement;
  show(trigger: HTMLElement, text: string, options?: TooltipOptions): void;
  /** Hide only when `trigger` is the element currently showing the tooltip. */
  hide(trigger: HTMLElement): void;
  hideAll(): void;
  /** Attach the element and global listeners; returns the matching detach. */
  connect(): () => void;
}

/**
 * Return the visible horizontal part of a trigger's first text node.
 *
 * A Range measures the text's full layout extent, including characters hidden
 * by text-overflow. Intersecting it with the trigger's client box gives the
 * displayed text area for both truncated and untruncated labels. The
 * intersection is intentionally horizontal only; the trigger's border box
 * still controls vertical placement and flipping.
 */
function getTextAnchorRect(
  trigger: HTMLElement,
  triggerRect: DOMRect,
): { left: number; right: number } | null {
  const textNode = Array.from(trigger.childNodes).find(
    (node): node is Text => node.nodeType === 3,
  );
  if (!textNode) return null;

  const range = trigger.ownerDocument.createRange();
  range.selectNodeContents(textNode);
  if (typeof range.getBoundingClientRect !== 'function') return null;
  const textRect = range.getBoundingClientRect();
  if (textRect.width <= 0 || textRect.height <= 0) return null;

  const clientLeft = triggerRect.left + trigger.clientLeft;
  const clientRight = clientLeft + trigger.clientWidth;
  const left = Math.max(textRect.left, clientLeft);
  const right = Math.min(textRect.right, clientRight);
  if (right <= left) return null;

  return { left, right };
}

function position(tip: HTMLElement, trigger: HTMLElement, anchor: TooltipAnchor | undefined): void {
  const view = trigger.ownerDocument.defaultView ?? window;
  const r = trigger.getBoundingClientRect();
  const tw = tip.offsetWidth;
  const th = tip.offsetHeight;
  const gap = 6;
  const pad = 6;
  const textAnchor = anchor === 'text' ? getTextAnchorRect(trigger, r) : null;
  const anchorLeft = textAnchor?.left ?? r.left;
  const anchorRight = textAnchor?.right ?? r.left + r.width;
  let left = (anchorLeft + anchorRight) / 2 - tw / 2;
  left = Math.max(pad, Math.min(left, view.innerWidth - tw - pad));
  let top = r.top - th - gap; // prefer above
  if (top < pad) top = r.bottom + gap; // flip below
  // The below branch can itself run past the viewport (for example when a
  // trigger is near the bottom edge), so apply the same vertical clamp after
  // choosing the preferred side. `th` is read above after CSS wrapping has
  // determined the tooltip's actual height.
  top = Math.max(pad, Math.min(top, view.innerHeight - th - pad));
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

export function createTooltipController(doc: Document = document): TooltipController {
  const element = doc.createElement('div');
  element.setAttribute('role', 'tooltip');
  element.className = 'tokenpanel-tooltip';
  element.setAttribute('aria-hidden', 'true');
  element.setAttribute('data-show', 'false');

  let current: HTMLElement | null = null;
  let connected = false;
  let unwatch: (() => void) | null = null;

  // Resize invalidates the cached position, but unlike scroll it has no
  // native capture-phase event that always fires: panel.tsx's grip-drag
  // writes width/height straight onto `.tokenpanel-shell` without a
  // re-render (perf choice — see handleResizeStart), and the debounced
  // window-resize handler there skips setSize/setPosition entirely when no
  // clamping is needed. So mirror the scroll-hide UX with two listeners,
  // both scoped to "a tooltip is currently visible": a ResizeObserver on the
  // trigger's panel shell (fires on the grip-drag's direct style mutation
  // regardless of why the shell resized) and a window 'resize' listener
  // (covers viewport-driven resizes). Do NOT observe document.body — the
  // panel is `position: fixed`, so resizing it never resizes the body, and a
  // body observer would silently never fire.
  function watchResize(trigger: HTMLElement): () => void {
    const view = doc.defaultView;
    if (!view) return () => {};
    view.addEventListener('resize', hideAll);

    let shellObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      const shell = trigger.closest<HTMLElement>('.tokenpanel-shell');
      if (shell) {
        // ResizeObserver always delivers one "initial" callback right after
        // observe() — even when nothing has actually resized — because it
        // has no prior size to diff the newly-observed target against. Skip
        // that first delivery (it fires on every hover, not just a resize)
        // and only hideAll() on a genuine SUBSEQUENT delivery, which means
        // the shell's size changed after observation began.
        let primed = false;
        shellObserver = new ResizeObserver(() => {
          if (!primed) {
            primed = true;
            return;
          }
          hideAll();
        });
        shellObserver.observe(shell);
      }
    }

    return () => {
      view.removeEventListener('resize', hideAll);
      shellObserver?.disconnect();
    };
  }

  function setHidden(): void {
    current = null;
    unwatch?.();
    unwatch = null;
    element.setAttribute('aria-hidden', 'true');
    element.setAttribute('data-show', 'false');
    element.className = 'tokenpanel-tooltip';
    element.textContent = '';
  }

  function show(trigger: HTMLElement, text: string, options: TooltipOptions = {}): void {
    if (current !== trigger) {
      unwatch?.();
      unwatch = connected ? watchResize(trigger) : null;
    }
    current = trigger;
    element.className =
      options.variant === 'help'
        ? 'tokenpanel-tooltip tokenpanel-tooltip--help'
        : 'tokenpanel-tooltip';
    element.textContent = text;
    element.setAttribute('aria-hidden', 'false');
    element.setAttribute('data-show', 'true');
    if (element.isConnected) position(element, trigger, options.anchor);
  }

  function hide(trigger: HTMLElement): void {
    // Only hide if this is the element that triggered us (prevents race conditions).
    if (current === trigger) setHidden();
  }

  function hideAll(): void {
    setHidden();
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') hideAll();
  }

  // Scroll (capture) invalidates the position by hiding the tooltip; the
  // trigger re-shows it on the next mouseenter if still hovered.
  function onScroll(): void {
    if (current) hideAll();
  }

  function connect(): () => void {
    if (connected) return () => {};
    connected = true;
    doc.body?.append(element);
    doc.addEventListener('keydown', onKeyDown);
    doc.defaultView?.addEventListener('scroll', onScroll, true);
    return () => {
      connected = false;
      setHidden();
      doc.removeEventListener('keydown', onKeyDown);
      doc.defaultView?.removeEventListener('scroll', onScroll, true);
      element.remove();
    };
  }

  return { element, show, hide, hideAll, connect };
}
