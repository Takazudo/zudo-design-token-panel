/** @jsxImportSource @takazudo/zfb/zudo-react */
import type { Child, Ref } from '@takazudo/zfb/zudo-react';
import { read, type MaybeSignal } from '../zr/live';

// ---------------------------------------------------------------------------
// RoleButton — chrome-button policy helper (#149)
//
// Every interactive button-like element in the panel MUST be a div with
// role=button + tabindex=0 + Enter/Space keydown handler. Using a native
// <button> is blocked because host apps routinely reset button tag styles
// with aggressive global CSS that bleeds into the panel's chrome.
//
// This helper centralises the keyboard wiring so callers do not repeat the
// keydown boilerplate. It is intentionally minimal — class, onClick,
// aria-disabled, and any extra aria-* attributes flow through as-is.
// ---------------------------------------------------------------------------

type AttributeValue = MaybeSignal<string | number | boolean | null> | undefined;

export interface RoleButtonProps {
  children?: Child;
  onClick: (e: MouseEvent | KeyboardEvent) => void;
  class?: MaybeSignal<string | null>;
  /** When true, visually and semantically disables the control without
   *  removing it from the tab order (unlike the native `disabled` attribute).
   *  Callers should also apply reduced-opacity styling via CSS. */
  'aria-disabled'?: MaybeSignal<boolean | null>;
  /** Arbitrary extra aria-* attributes (e.g. aria-haspopup, aria-expanded). */
  ariaProps?: Record<`aria-${string}`, AttributeValue>;
  tabindex?: MaybeSignal<number>;
  /** Explicit DOM ref for callers that need to anchor a popover. */
  ref?: Ref<HTMLDivElement>;
  id?: MaybeSignal<string | null>;
  title?: MaybeSignal<string | null>;
  'aria-label'?: MaybeSignal<string | null>;
  'data-testid'?: string;
  /** Stable per-action DOM hook for consumer tests (see PORTABLE-CONTRACT §7.6).
   *  Keyed on an action id, never on the display label. */
  'data-zdtp-action'?: string;
}

export function RoleButton(props: RoleButtonProps) {
  const { onClick, ariaProps } = props;
  const disabled = () => read(props['aria-disabled']) === true;

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled()) onClick(e);
    }
  }

  function handleClick(e: MouseEvent) {
    if (!disabled()) onClick(e);
  }

  return (
    <div
      role="button"
      // zudo-react rejects `ref={undefined}`; only pass a ref when given one.
      {...(props.ref ? { ref: props.ref } : {})}
      tabindex={props.tabindex ?? 0}
      class={props.class}
      on:click={handleClick}
      on:keydown={handleKeyDown}
      aria-disabled={props['aria-disabled']}
      id={props.id}
      title={props.title}
      aria-label={props['aria-label']}
      data-testid={props['data-testid']}
      data-zdtp-action={props['data-zdtp-action']}
      {...(ariaProps as Record<string, string>)}
    >
      {props.children}
    </div>
  );
}
