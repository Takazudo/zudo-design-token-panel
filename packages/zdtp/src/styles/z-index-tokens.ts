/**
 * Semantic z-index scale for the design-token panel.
 *
 * Single source of truth shared with panel-tokens.css:
 *   - CSS reads `var(--tokentweak-z-*)` (declared in panel-tokens.css)
 *   - TSX reads the numeric exports here for inline `zIndex` styles
 *
 * Values in the INT32 high band so the panel sits above common host chrome
 * (sticky headers, drawers typically use z-index 100–10000). Ceiling bounded
 * by INT32_MAX = 2147483647; inspector-box and toast claim the two highest
 * practical values so element-path affordances are never obscured.
 *
 * Tier order: overlay < shell < settingsPopover < colorPicker < tooltip
 *             < inspectorBox < toast
 */
export const Z = {
  /** Highlight rings — rendered just below the panel shell. */
  overlay: 2147482990,
  /** Panel shell (position:fixed root-level). */
  shell: 2147482991,
  /** Highlight-settings popover — body-sibling of the shell, competes at root. */
  settingsPopover: 2147482992,
  /**
   * Color-picker card (position:fixed) — DOM child of .tokenpanel-shell,
   * which is a stacking context. This value is shell-local; against host
   * content the picker paints at the shell's root-level z-index.
   */
  colorPicker: 2147482993,
  /** DOM tooltip portaled to document.body. */
  tooltip: 2147482994,
  /** Element-path inspector box (body-mounted). */
  inspectorBox: 2147483000,
  /** Element-path toast (body-mounted). */
  toast: 2147483001,
} as const;
