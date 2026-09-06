/**
 * ActionsMenuPopover — narrow-panel replacement for the header action links
 * (Export / Load from JSON… / Apply / Reset), collapsed behind the kebab
 * trigger when the header yields through its CSS container query (#787).
 *
 * A PLAIN popover of ordinary action RoleButtons, NOT an ARIA menu:
 * role="menu"/menuitem demands arrow-key navigation and focus management,
 * and RoleButton hardcodes role="button" — so this follows the existing
 * gear-settings popover's dialog + outside-click/Escape wiring instead
 * (usePopoverClose, shared with highlight/highlight-settings-popover.tsx).
 */

import { useRef } from 'preact/compat';
import type { ComponentChildren, JSX } from 'preact';
import { RoleButton } from './role-button';
import { usePopoverClose } from '../components/color-picker/index';

export interface ActionsMenuAction {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

interface ActionsMenuPopoverProps {
  /** The kebab trigger element — excluded from the outside-click close so its
   *  own click-to-toggle isn't raced by the popover's pointerdown listener
   *  (mirrors the gear button / HighlightSettingsPopover pairing). */
  anchorRef: React.RefObject<HTMLElement | null>;
  actions: readonly ActionsMenuAction[];
  onClose: () => void;
  children?: ComponentChildren;
}

export function ActionsMenuPopover({
  anchorRef,
  actions,
  onClose,
  children,
}: ActionsMenuPopoverProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);

  usePopoverClose(containerRef, onClose, anchorRef);

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Panel actions"
      className="tokenpanel-actions-popover"
    >
      {actions.map((action) => (
        <RoleButton
          key={action.label}
          aria-disabled={action.disabled}
          title={action.disabledReason}
          onClick={() => {
            action.onSelect();
            onClose();
          }}
          className="tokenpanel-action-link"
        >
          {action.label}
        </RoleButton>
      ))}
      {children}
    </div>
  );
}
