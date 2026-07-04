/**
 * HighlightSettingsPopover — 2-column color-only grid + global outline px input.
 *
 * Header row: "Highlight outline settings" label (left) + global outline-width
 * number input with "px" suffix (right).
 *
 * Slot list: 10 slots in a 2-column grid; each cell = [num] [ring swatch]
 * [token name / "available"]. The ring opens the ColorPicker for per-slot
 * color. Per-row slider and px readout are removed.
 *
 * Footer: "Disable all highlights" and "Reset to defaults" buttons.
 *
 * Must be rendered inside a HighlightContext.Provider. Gracefully returns
 * null if context is absent.
 */

import { useContext, useRef, useState } from 'preact/compat';
import type { JSX } from 'preact';
import { RoleButton } from '../controls/role-button';
import { ColorPicker, getFixedPopoverStyle, usePopoverClose } from '../components/color-picker/index';
import { HighlightContext } from './highlight-toggle-button';
import { Z } from '../styles/z-index-tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HighlightSettingsPopoverProps {
  /** The anchor element (gear button) for initial positioning. */
  anchorRef: React.RefObject<HTMLElement | null>;
  /** Called when the popover requests to close. */
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HighlightSettingsPopover({
  anchorRef,
  onClose,
}: HighlightSettingsPopoverProps): JSX.Element | null {
  const ctx = useContext(HighlightContext);

  // Track which slot's ring is being edited in the ColorPicker.
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);

  // Refs for each row's ring element — used as ColorPicker anchors.
  const ringRefs = useRef<(HTMLDivElement | null)[]>(Array.from({ length: 10 }, () => null));

  // Ref for the popover container (used by usePopoverClose).
  const containerRef = useRef<HTMLDivElement>(null);

  // ColorPicker anchor ref points to the currently-editing ring element.
  // Must be declared here (before any early return) to satisfy Rules of Hooks.
  const colorPickerAnchorRef = useRef<HTMLDivElement | null>(null);

  // Pass the gear button (anchorRef) so clicking it toggles the popover shut
  // instead of the outside-close racing the gear's click-to-toggle (F11).
  usePopoverClose(containerRef, onClose, anchorRef);

  // Graceful null guard: no context = no popover.
  if (!ctx) return null;

  const { state, setSlot, setOutlineWidth, reset, disableAll } = ctx;

  // Build reverse map: slotIndex → cssVar (first match wins).
  const slotToCssVar: Record<number, string> = {};
  for (const [cssVar, slotIdx] of Object.entries(state.active)) {
    if (!(slotIdx in slotToCssVar)) {
      slotToCssVar[slotIdx] = cssVar;
    }
  }

  // Compute the popover position anchored to the gear button.
  // Estimated size: 370px wide, ~520px tall (10 rows × 44px + header + footer).
  const popoverStyle = getFixedPopoverStyle(anchorRef.current ?? null, 370, 520);

  // Point colorPickerAnchorRef at the active ring element (safe here — past the null guard).
  if (editingSlotIndex !== null) {
    colorPickerAnchorRef.current = ringRefs.current[editingSlotIndex] ?? null;
  }

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Highlight outline settings"
      className="tokenpanel-highlight-settings-popover"
      style={{ ...popoverStyle, zIndex: Z.settingsPopover }}
    >
      {/* Header */}
      <div className="tokenpanel-highlight-settings-header">
        <span className="tokenpanel-highlight-settings-header-label">
          Highlight outline settings
        </span>
        <div className="tokenpanel-highlight-settings-outline-control">
          <input
            type="number"
            min={1}
            max={20}
            step={1}
            value={state.outlineWidth}
            aria-label="Global highlight outline width in px"
            className="tokenpanel-highlight-settings-outline-input"
            onInput={(e) => {
              if (setOutlineWidth) {
                const val = Number((e.currentTarget as HTMLInputElement).value);
                if (!Number.isNaN(val)) {
                  setOutlineWidth(val);
                }
              }
            }}
          />
          <span className="tokenpanel-highlight-settings-outline-px">px</span>
        </div>
      </div>

      {/* Slot grid — 2 columns */}
      <div className="tokenpanel-highlight-settings-list">
        {state.slots.map((slot, index) => {
          const cssVar = slotToCssVar[index];
          const isActive = cssVar !== undefined;
          const ringBorder = `${state.outlineWidth}px solid ${slot.color}`;

          return (
            <div
              key={index}
              className="tokenpanel-highlight-settings-row"
            >
              {/* Column 1: slot number */}
              <div className="tokenpanel-highlight-settings-num">
                {index + 1}
              </div>

              {/* Column 2: ring swatch — clicking opens ColorPicker */}
              <div
                ref={(el) => {
                  ringRefs.current[index] = el;
                }}
                className="tokenpanel-highlight-settings-ring"
                style={{ border: ringBorder }}
                role="button"
                tabIndex={0}
                aria-label={`Edit color for slot ${index + 1}`}
                onClick={() => setEditingSlotIndex(editingSlotIndex === index ? null : index)}
                onKeyDown={(e: KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setEditingSlotIndex(editingSlotIndex === index ? null : index);
                  }
                }}
              />

              {/* Column 3: token name or "available" */}
              <div
                className={
                  isActive
                    ? 'tokenpanel-highlight-settings-name is-active'
                    : 'tokenpanel-highlight-settings-name'
                }
              >
                {isActive ? cssVar : 'available'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="tokenpanel-highlight-settings-footer">
        <RoleButton
          onClick={() => disableAll && disableAll()}
          className="tokenpanel-highlight-settings-reset-btn"
        >
          Disable all highlights
        </RoleButton>
        <RoleButton
          onClick={() => reset && reset()}
          className="tokenpanel-highlight-settings-reset-btn"
        >
          Reset to defaults
        </RoleButton>
      </div>

      {/* ColorPicker for editing a slot color — renders when editingSlotIndex is set */}
      {editingSlotIndex !== null && (
        <ColorPicker
          color={state.slots[editingSlotIndex]?.color ?? '#ffffff'}
          onChange={(hex) => {
            if (setSlot && editingSlotIndex !== null) {
              setSlot(editingSlotIndex, { color: hex });
            }
          }}
          label={`Slot ${editingSlotIndex + 1} color`}
          anchorRef={colorPickerAnchorRef as React.RefObject<HTMLElement | null>}
          onClose={() => setEditingSlotIndex(null)}
        />
      )}
    </div>
  );
}
