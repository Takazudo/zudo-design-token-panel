/** @jsxImportSource @takazudo/zfb/zudo-react */
/**
 * AltClickPicker — reusable primitive for DevTools-style Alt+click picking.
 *
 * Behaviour while `enabled`:
 *   - capture-phase Alt keydown arms the picker and requests exclusive
 *     ownership from the arming coordinator.
 *   - mousemove tracks the last cursor and resolves `document.elementFromPoint`
 *     while armed, skipping panel-owned surfaces.
 *   - capture-phase mousedown/click prevent host side effects; click calls
 *     `onElementPicked` with the resolved host element.
 *   - keyup/window-blur disarm the picker.
 *   - a fixed-position box + label track the hovered element with RAF.
 */

import { computed, getScope, Show, signal, type Ref } from '@takazudo/zfb/zudo-react';
import { PANEL_EXCLUSION_SELECTOR } from '../highlight/find-elements';
import { Z } from '../styles/z-index-tokens';
import {
  registerArmingOwner,
  releaseArming,
  requestArming,
} from './arming-coordinator';
import { read, type Reactive } from '../zr/live';

const DEFAULT_LABEL_GAP = 2;

export interface AltClickPickerClassNames {
  /** Highlight box class. */
  box: string;
  /** Label container class. */
  label: string;
  /** Label element-name text class. */
  labelName: string;
  /** Label size text class. */
  labelSize: string;
  /** Class toggled on <html> while armed. */
  inspectingRoot: string;
}

export interface AltClickPickerProps {
  /** Whether this feature is enabled. When false, the picker is fully inert. */
  enabled: boolean;
  /** Stable feature id used by the single-owner arming coordinator. */
  featureId: string;
  /** Called once an armed click picks a host element. */
  onElementPicked: (el: Element) => void;
  /** Disable the owning feature when another real picker takes ownership. */
  onArmingRevoked?: () => void;
  /** Claim coordinator ownership as soon as this feature becomes enabled. */
  claimArmingOnEnable?: boolean;
  /** Label text shown before the element dimensions. */
  getLabelText?: (el: Element) => string;
  /** Hidden live-region text. Kept in the primitive so announcements stay mounted. */
  ariaLiveMessage?: string | null;
  /** Selector for UI surfaces that must not be picked. */
  excludeSelector?: string;
  /** Class-name hooks for feature-specific styling. */
  classNames?: Partial<AltClickPickerClassNames>;
  /** z-index applied inline to the box and label. */
  zIndex?: number;
  /** Gap between the element box and its label tag. */
  labelGap?: number;
  /** Receives the imperative handle while mounted. */
  handle?: { current: AltClickPickerHandle | null };
}

export type AltClickPickerStaticKeys =
  | 'featureId'
  | 'onElementPicked'
  | 'onArmingRevoked'
  | 'claimArmingOnEnable'
  | 'getLabelText'
  | 'excludeSelector'
  | 'classNames'
  | 'zIndex'
  | 'labelGap'
  | 'handle';

export interface AltClickPickerHandle {
  /** Arm this picker without synthesizing an Alt keyboard gesture. */
  arm(): void;
  /** Disarm this picker and release coordinator ownership. */
  disarm(): void;
}

const DEFAULT_CLASS_NAMES: AltClickPickerClassNames = {
  box: 'tokenpanel-picker-box',
  label: 'tokenpanel-picker-label',
  labelName: 'tokenpanel-picker-label-name',
  labelSize: 'tokenpanel-picker-label-size',
  inspectingRoot: 'tokenpanel-picker-inspecting',
};

function defaultLabelText(el: Element): string {
  return el.tagName.toLowerCase();
}

function isExcludedElement(el: Element, selector: string): boolean {
  if (!selector) return false;
  try {
    return el.closest(selector) !== null;
  } catch {
    return false;
  }
}

const VISUALLY_HIDDEN = {
  position: 'fixed',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  'white-space': 'nowrap',
  border: '0',
};

export function AltClickPicker(props: Reactive<AltClickPickerProps, AltClickPickerStaticKeys>) {
  const {
    featureId,
    onElementPicked,
    onArmingRevoked,
    claimArmingOnEnable = false,
    getLabelText = defaultLabelText,
    excludeSelector = PANEL_EXCLUSION_SELECTOR,
    zIndex = Z.inspectorBox,
    labelGap = DEFAULT_LABEL_GAP,
    handle,
  } = props;
  const classes: AltClickPickerClassNames = { ...DEFAULT_CLASS_NAMES, ...props.classNames };
  const enabled = computed(() => read(props.enabled));
  const armed = signal(false);
  const hoverEl = signal<Element | null>(null);
  const box: Ref<HTMLDivElement> = { current: null };
  const label: Ref<HTMLDivElement> = { current: null };
  // Last known pointer position so pressing Alt highlights the element already
  // under the cursor immediately (no need to nudge the mouse first).
  let lastMouse: { x: number; y: number } | null = null;
  let programmaticArming = false;

  const disarm = () => {
    programmaticArming = false;
    armed.value = false;
    hoverEl.value = null;
    releaseArming(featureId);
  };

  const resolveHoverAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y);
    hoverEl.value = !el || isExcludedElement(el, excludeSelector) ? null : el;
  };

  const arm = () => {
    if (!enabled.value) return;
    programmaticArming = true;
    requestArming(featureId);
    armed.value = true;
    if (lastMouse) resolveHoverAt(lastMouse.x, lastMouse.y);
  };

  const scope = getScope();
  scope.onActivate(() => {
    if (handle) handle.current = { arm, disarm };
    const unregister = registerArmingOwner(featureId, {
      onArmingRevoked: () => {
        programmaticArming = false;
        armed.value = false;
        hoverEl.value = null;
        onArmingRevoked?.();
      },
    });
    return () => {
      unregister();
      if (handle?.current?.arm === arm) handle.current = null;
    };
  });

  scope.effect(() => {
    if (enabled.value && claimArmingOnEnable) requestArming(featureId);
  });

  // Reset everything when the feature is disabled.
  scope.effect(() => {
    if (!enabled.value) disarm();
  });

  // Pointer position + Alt arming (active whenever the feature is enabled).
  scope.effect(() => {
    if (!enabled.value) return;

    function onMouseMove(e: MouseEvent) {
      lastMouse = { x: e.clientX, y: e.clientY };
      if (armed.value) resolveHoverAt(e.clientX, e.clientY);
    }

    function onKeyDown(e: KeyboardEvent) {
      // Only do the arm-transition work on the first Alt-down. Without the
      // `!armed` guard, every Alt-modified keystroke (Alt+letter host
      // shortcuts, Alt+Tab attempts) would re-run the layout-querying
      // elementFromPoint for no behavioural benefit — the position is already
      // tracked by the always-on mousemove handler.
      if ((e.key === 'Alt' || e.altKey) && !armed.value) {
        programmaticArming = false;
        requestArming(featureId);
        armed.value = true;
        if (lastMouse) resolveHoverAt(lastMouse.x, lastMouse.y);
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (programmaticArming) return;
      if (e.key === 'Alt' || !e.altKey) disarm();
    }

    // mousemove is passive + non-capture: it only records the pointer position
    // (and resolves a hovered element while armed) — it never preventDefault/
    // stopPropagation, so it has no reason to run in the capture phase ahead of
    // host handlers. keydown/keyup stay in capture so Alt arming is observed
    // before host shortcuts.
    document.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', disarm);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', disarm);
    };
  });

  const active = computed(() => enabled.value && armed.value);

  // Click-to-pick (active only while armed). The click + mousedown listeners
  // are in the capture phase so the interaction is intercepted before any host
  // handler (<a> navigation, button onClick, focus, text selection) can run.
  scope.effect(() => {
    if (!active.value) return;

    // Suppress mousedown side-effects (focus shift, text selection, drag start)
    // so an inspect-click is purely a picker gesture.
    function onMouseDown(e: MouseEvent) {
      if (!hoverEl.value) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }

    function onClick(e: MouseEvent) {
      const el = hoverEl.value;
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      onElementPicked(el);
    }

    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('mousedown', onMouseDown, true);
      document.removeEventListener('click', onClick, true);
    };
  });

  // Crosshair cursor + selection lock while armed. A class on <html> drives a
  // CSS rule so the crosshair wins over host element cursors (links, buttons).
  scope.effect(() => {
    if (!active.value) return;
    const root = document.documentElement;
    root.classList.add(classes.inspectingRoot);
    return () => {
      root.classList.remove(classes.inspectingRoot);
    };
  });

  // Imperative position loop — tracks scroll/reflow without re-rendering.
  scope.effect(() => {
    if (!armed.value || !hoverEl.value) return;
    let rafId = 0;

    function position() {
      const el = hoverEl.value;
      const boxEl = box.current;
      if (el && boxEl) {
        if (!el.isConnected) {
          hoverEl.value = null;
          return;
        }
        const r = el.getBoundingClientRect();
        boxEl.style.top = `${r.top}px`;
        boxEl.style.left = `${r.left}px`;
        boxEl.style.width = `${r.width}px`;
        boxEl.style.height = `${r.height}px`;

        const labelEl = label.current;
        if (labelEl) {
          const lh = labelEl.offsetHeight;
          // Prefer above the box; drop inside the top edge when there's no room.
          let labelTop = r.top - lh - labelGap;
          if (labelTop < 0) labelTop = r.top + labelGap;
          labelEl.style.left = `${Math.max(0, r.left)}px`;
          labelEl.style.top = `${labelTop}px`;
        }
      }
      rafId = requestAnimationFrame(position);
    }

    rafId = requestAnimationFrame(position);
    return () => cancelAnimationFrame(rafId);
  });

  const shown = computed(() => (active.value ? hoverEl.value : null));

  return [
    // Persistent, always-mounted live region. Screen readers reliably announce
    // a live region only when it already exists in the DOM and its text then
    // changes — a region inserted already-populated is frequently NOT announced.
    <div role="status" aria-live="polite" aria-atomic="true" style={VISUALLY_HIDDEN}>
      {computed(() => read(props.ariaLiveMessage) ?? '')}
    </div>,
    <Show when={computed(() => shown.value !== null)}>
      {() => {
        const rect = computed(() => shown.value?.getBoundingClientRect() ?? null);
        const fixed = (r: DOMRect | null, sized: boolean) => ({
          position: 'fixed',
          top: `${r?.top ?? 0}px`,
          left: `${r?.left ?? 0}px`,
          ...(sized ? { width: `${r?.width ?? 0}px`, height: `${r?.height ?? 0}px` } : {}),
          'z-index': String(zIndex),
          'pointer-events': 'none',
        });
        return [
          <div ref={box} class={classes.box} aria-hidden="true" style={fixed(rect.value, true)} />,
          <div ref={label} class={classes.label} aria-hidden="true" style={fixed(rect.value, false)}>
            <span class={classes.labelName}>
              {computed(() => (shown.value ? getLabelText(shown.value) : ''))}
            </span>
            <span class={classes.labelSize}>
              {computed(() => `${Math.round(rect.value?.width ?? 0)} × ${Math.round(rect.value?.height ?? 0)}`)}
            </span>
          </div>,
        ];
      }}
    </Show>,
  ];
}
