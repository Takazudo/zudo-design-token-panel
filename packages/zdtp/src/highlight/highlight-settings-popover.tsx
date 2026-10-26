/** @jsxImportSource @takazudo/zfb/zudo-react */
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
 * Reads the panel's highlight service. Gracefully renders nothing while the
 * service holds null.
 */

import { computed, getScope, Show, signal, type ReadonlySignal } from '@takazudo/zfb/zudo-react';
import { RoleButton } from '../controls/role-button';
import { bindPopoverClose, getFixedPopoverStyle } from '../components/color-picker/popover';
import { ColorPicker } from '../components/color-picker/color-picker';
import type { HighlightContextValue } from './highlight-context';
import { Z } from '../styles/z-index-tokens';
import { TextInput } from '../zr/form-controls';
import { Rebuild } from '../zr/rebuild';
import { toZrStyle } from '../zr/style';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HighlightSettingsPopoverProps {
  /** The anchor element (gear button) for initial positioning. */
  anchorRef: { readonly current: HTMLElement | null };
  /** Called when the popover requests to close. */
  onClose: () => void;
  highlight: ReadonlySignal<HighlightContextValue | null>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HighlightSettingsPopover(props: HighlightSettingsPopoverProps) {
  const { highlight } = props;
  return (
    <Show when={computed(() => highlight.value !== null)}>
      {() => <SettingsPopover {...props} />}
    </Show>
  );
}

function SettingsPopover({ anchorRef, onClose, highlight }: HighlightSettingsPopoverProps) {
  const ctx = () => highlight.value!;
  const state = computed(() => highlight.value?.state ?? ctx().state);

  // Track which slot's ring is being edited in the ColorPicker.
  const editingSlotIndex = signal<number | null>(null);

  // Each row's ring element — the ColorPicker anchors to the one being edited.
  const ringRefs: (HTMLDivElement | null)[] = Array.from({ length: 10 }, () => null);
  const containerRef: { current: HTMLDivElement | null } = { current: null };
  const colorPickerAnchorRef = {
    get current(): HTMLElement | null {
      const index = editingSlotIndex.value;
      return index === null ? null : ringRefs[index] ?? null;
    },
  };

  // Pass the gear button (anchorRef) so clicking it toggles the popover shut
  // instead of the outside-close racing the gear's click-to-toggle (F11).
  getScope().onActivate(() => bindPopoverClose(containerRef, onClose, anchorRef));

  // Reverse map: slotIndex → cssVar (first match wins).
  const slotToCssVar = computed(() => {
    const out: Record<number, string> = {};
    for (const [cssVar, slotIdx] of Object.entries(state.value.active)) {
      if (!(slotIdx in out)) out[slotIdx] = cssVar;
    }
    return out;
  });

  // Anchored to the gear button. Estimated size: 370px wide, ~520px tall
  // (10 rows × 44px + header + footer).
  const popoverStyle = getFixedPopoverStyle(anchorRef.current ?? null, 370, 520);

  const toggleEditing = (index: number) => {
    editingSlotIndex.value = editingSlotIndex.value === index ? null : index;
  };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Highlight outline settings"
      class="tokenpanel-highlight-settings-popover"
      style={toZrStyle({ ...popoverStyle, zIndex: Z.settingsPopover })}
    >
      {/* Header */}
      <div class="tokenpanel-highlight-settings-header">
        <span class="tokenpanel-highlight-settings-header-label">
          Highlight outline settings
        </span>
        <div class="tokenpanel-highlight-settings-outline-control">
          <TextInput
            type="number"
            value={computed(() => String(state.value.outlineWidth))}
            class="tokenpanel-highlight-settings-outline-input"
            attrs={{ min: 1, max: 20, step: 1, 'aria-label': 'Global highlight outline width in px' }}
            onInput={(raw) => {
              const setOutlineWidth = ctx().setOutlineWidth;
              if (!setOutlineWidth) return;
              const val = Number(raw);
              if (!Number.isNaN(val)) setOutlineWidth(val);
            }}
          />
          <span class="tokenpanel-highlight-settings-outline-px">px</span>
        </div>
      </div>

      {/* Slot grid — 2 columns */}
      <div class="tokenpanel-highlight-settings-list">
        {Array.from({ length: state.value.slots.length }, (_, index) => {
          const cssVar = computed(() => slotToCssVar.value[index]);
          const ring = {
            get current() {
              return ringRefs[index] ?? null;
            },
            set current(element: HTMLDivElement | null) {
              ringRefs[index] = element;
            },
          };
          return (
            <div class="tokenpanel-highlight-settings-row">
              {/* Column 1: slot number */}
              <div class="tokenpanel-highlight-settings-num">
                {String(index + 1)}
              </div>

              {/* Column 2: ring swatch — clicking opens ColorPicker */}
              <div
                ref={ring}
                class="tokenpanel-highlight-settings-ring"
                style={computed(() => toZrStyle({
                  border: `${state.value.outlineWidth}px solid ${state.value.slots[index]?.color ?? ''}`,
                }))}
                role="button"
                tabindex={0}
                aria-label={`Edit color for slot ${index + 1}`}
                on:click={() => toggleEditing(index)}
                on:keydown={(e: KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleEditing(index);
                  }
                }}
              />

              {/* Column 3: token name or "available" */}
              <div
                class={computed(() => (cssVar.value !== undefined
                  ? 'tokenpanel-highlight-settings-name is-active'
                  : 'tokenpanel-highlight-settings-name'))}
              >
                {computed(() => cssVar.value ?? 'available')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div class="tokenpanel-highlight-settings-footer">
        <RoleButton
          onClick={() => ctx().disableAll?.()}
          class="tokenpanel-highlight-settings-reset-btn"
        >
          Disable all highlights
        </RoleButton>
        <RoleButton
          onClick={() => ctx().reset?.()}
          class="tokenpanel-highlight-settings-reset-btn"
        >
          Reset to defaults
        </RoleButton>
      </div>

      {/* ColorPicker for editing a slot color — renders when a slot is being edited */}
      <Rebuild value={editingSlotIndex}>
        {(index) => (index === null ? null : (
          <ColorPicker
            color={computed(() => state.value.slots[index]?.color ?? '#ffffff')}
            onChange={(hex) => ctx().setSlot?.(index, { color: hex })}
            label={`Slot ${index + 1} color`}
            anchorRef={colorPickerAnchorRef}
            onClose={() => {
              editingSlotIndex.value = null;
            }}
          />
        ))}
      </Rebuild>
    </div>
  );
}
