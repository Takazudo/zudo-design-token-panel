import type { JSX, Ref } from 'preact';

// ---------------------------------------------------------------------------
// RoleButton — chrome-button policy helper (#149)
//
// Every interactive button-like element in the panel MUST be a div with
// role=button + tabIndex=0 + Enter/Space keydown handler. Using a native
// <button> is blocked because host apps routinely reset button tag styles
// with aggressive global CSS that bleeds into the panel's chrome.
//
// This helper centralises the keyboard wiring so callers do not repeat the
// onKeyDown boilerplate. It is intentionally minimal — className, onClick,
// aria-disabled, and any extra aria-* attributes flow through as-is.
// ---------------------------------------------------------------------------

export interface RoleButtonProps {
  children: JSX.Element | JSX.Element[] | string;
  onClick: (e: MouseEvent | KeyboardEvent) => void;
  className?: string;
  /** When true, visually and semantically disables the control without
   *  removing it from the tab order (unlike the native `disabled` attribute).
   *  Callers should also apply reduced-opacity styling via CSS. */
  'aria-disabled'?: boolean;
  /** Arbitrary extra aria-* props (e.g. aria-haspopup, aria-expanded). */
  ariaProps?: Record<string, string | boolean | undefined>;
  tabIndex?: number;
  /** Explicit DOM ref for callers that need to anchor a popover. */
  elementRef?: Ref<HTMLDivElement>;
  id?: string;
  title?: string;
  'aria-label'?: string;
  'data-testid'?: string;
}

export function RoleButton({
  children,
  onClick,
  className,
  'aria-disabled': ariaDisabled,
  ariaProps,
  tabIndex = 0,
  elementRef,
  id,
  title,
  'aria-label': ariaLabel,
  'data-testid': testId,
}: RoleButtonProps): JSX.Element {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!ariaDisabled) onClick(e);
    }
  }

  function handleClick(e: MouseEvent) {
    if (!ariaDisabled) onClick(e);
  }

  return (
    <div
      role="button"
      ref={elementRef}
      tabIndex={tabIndex}
      className={className}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-disabled={ariaDisabled}
      id={id}
      title={title}
      aria-label={ariaLabel}
      data-testid={testId}
      {...ariaProps}
    >
      {children}
    </div>
  );
}
