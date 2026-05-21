/**
 * HighlightSettingsPopover — variation-14 design.
 *
 * A 4-column row grid showing 10 highlight slots:
 *   [num] [ring swatch] [token name / "available"] [slider + Npx readout]
 *
 * Footer: "Reset to defaults" button.
 *
 * Must be rendered inside a HighlightContext.Provider. Gracefully returns
 * null if context is absent (pre-#232 worktrees, or during merges).
 */

import { useContext, useRef, useState } from 'preact/compat';
import type { JSX } from 'preact';
import { RoleButton } from '../controls/role-button';
import { ColorPicker, getFixedPopoverStyle, usePopoverClose } from '../components/color-picker/index';
import { HighlightContext } from './highlight-context';

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

  usePopoverClose(containerRef, onClose);

  // Graceful null guard: no context = no popover.
  if (!ctx) return null;

  const { state, setSlot, reset } = ctx;

  // Build reverse map: slotIndex → cssVar (first match wins).
  const slotToCssVar: Record<number, string> = {};
  for (const [cssVar, slotIdx] of Object.entries(state.active)) {
    if (!(slotIdx in slotToCssVar)) {
      slotToCssVar[slotIdx] = cssVar;
    }
  }

  // Compute the popover position anchored to the gear button.
  // Estimated size: 440px wide, ~520px tall (10 rows × 44px + header + footer).
  const popoverStyle = getFixedPopoverStyle(anchorRef.current ?? null, 440, 520);

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
      style={{ ...popoverStyle, zIndex: 65 }}
    >
      {/* Header */}
      <div className="tokenpanel-highlight-settings-header">
        Highlight outline settings
      </div>

      {/* Slot list */}
      <div className="tokenpanel-highlight-settings-list">
        {state.slots.map((slot, index) => {
          const cssVar = slotToCssVar[index];
          const isActive = cssVar !== undefined;
          const ringBorder = `${slot.outlineWidth}px solid ${slot.color}`;

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

              {/* Column 4: width slider + readout */}
              <div className="tokenpanel-highlight-settings-width">
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={slot.outlineWidth}
                  aria-label={`Outline width for slot ${index + 1}`}
                  className="tokenpanel-highlight-settings-slider"
                  onInput={(e) => {
                    if (setSlot) {
                      setSlot(index, { outlineWidth: Number((e.currentTarget as HTMLInputElement).value) });
                    }
                  }}
                />
                <div className="tokenpanel-highlight-settings-px">
                  {slot.outlineWidth}px
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="tokenpanel-highlight-settings-footer">
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
