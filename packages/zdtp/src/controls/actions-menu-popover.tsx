/** @jsxImportSource @takazudo/zfb/zudo-react */
/**
 * ActionsMenuPopover — narrow-panel replacement for the header action links
 * (Export / Load from JSON… / Apply / Reset), collapsed behind the kebab
 * trigger when the header yields through its CSS container query (#787).
 *
 * A PLAIN popover of ordinary action RoleButtons, NOT an ARIA menu:
 * role="menu"/menuitem demands arrow-key navigation and focus management,
 * and RoleButton hardcodes role="button" — so this follows the existing
 * gear-settings popover's dialog + outside-click/Escape wiring instead
 * (bindPopoverClose, shared with highlight/highlight-settings-popover.tsx).
 */

import { getScope, type Child } from '@takazudo/zfb/zudo-react';
import { RoleButton } from './role-button';
import { bindPopoverClose } from '../components/color-picker/popover';

export interface ActionsMenuAction {
  /** Stable action id, emitted as `data-zdtp-action` on the rendered item.
   *  Required so the DOM hook can never silently go missing; labels are
   *  display strings and must not be used as the key (PORTABLE-CONTRACT §7.6). */
  id: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

interface ActionsMenuPopoverProps {
  /** The kebab trigger element — excluded from the outside-click close so its
   *  own click-to-toggle isn't raced by the popover's pointerdown listener
   *  (mirrors the gear button / HighlightSettingsPopover pairing). */
  anchorRef: { readonly current: HTMLElement | null };
  actions: readonly ActionsMenuAction[];
  onClose: () => void;
  children?: Child;
}

export function ActionsMenuPopover({
  anchorRef,
  actions,
  onClose,
  children,
}: ActionsMenuPopoverProps) {
  const containerRef: { current: HTMLDivElement | null } = { current: null };

  getScope().onActivate(() => bindPopoverClose(containerRef, onClose, anchorRef));

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Panel actions"
      class="tokenpanel-actions-popover"
    >
      {actions.map((action) => (
        <RoleButton
          aria-disabled={action.disabled ?? null}
          title={action.disabledReason ?? null}
          data-zdtp-action={action.id}
          onClick={() => {
            action.onSelect();
            onClose();
          }}
          class="tokenpanel-action-link"
        >
          {action.label}
        </RoleButton>
      ))}
      {children}
    </div>
  );
}
