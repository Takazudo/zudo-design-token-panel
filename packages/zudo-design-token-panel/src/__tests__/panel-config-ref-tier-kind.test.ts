/**
 * Regression coverage for #245 — the strict inter-tier kind-compatibility
 * rule in `assertValidTab` used to throw whenever a tier with
 * `referencesTier` had a `kind` different from its referenced tier. That
 * rule was over-strict and broke every demo's Font tab at host-adapter
 * bootstrap time, because:
 *
 *   - The tier resolver (`apply/tier-resolver.ts`) does NOT read
 *     `TierItem.type.kind` for ref-tier items. Resolution is a pure id
 *     lookup that emits `var(--targetCssVar)`.
 *   - The panel UI (`tabs/generic-tab.tsx`, `tabs/font-tab.tsx`,
 *     `tabs/spacing-tab.tsx`, `tabs/size-tab.tsx`) routes any item whose
 *     tier has `referencesTier` to `TierRefSelector` unconditionally —
 *     the item's `kind` is ignored for editor selection.
 *
 * So a ref-tier item's `kind` field has no runtime effect; demos legitimately
 * encode it as `kind: 'text'` to communicate "the stored value is a string
 * identifier". The validator must therefore allow any kind on a ref-tier
 * item regardless of the referenced tier's kind.
 *
 * The intra-tier rule ("all items in one tier share a kind") and the
 * "referenced tier must exist" rule are still enforced — both catch real
 * encoding bugs and remain backed by runtime behaviour.
 */
import { describe, expect, it } from 'vitest';
import { assertValidPanelConfig } from '../config/panel-config';

const baseHostFields = {
  storagePrefix: 'astro',
  consoleNamespace: 'astro',
  modalClassPrefix: 'tokenpanel-modal',
  schemaId: 'astro/v1',
  exportFilenameBase: 'astro-tokens',
} as const;

describe('panel-config — ref-tier item kind compatibility (issue #245)', () => {
  it('accepts the astro Font-tab shape: semantic(kind:text) referencesTier raw(kind:length)', () => {
    // Exact shape lifted from the astro demo manifest. All 5 demos use this
    // pattern in the Font tab. Previously threw "kind mismatch — tier
    // 'semantic' has kind 'text' but referenced tier 'raw' has kind 'length'".
    const fontTab = {
      id: 'font',
      label: 'Font',
      tiers: [
        {
          id: 'raw',
          label: 'Font scale',
          items: [
            {
              id: 'astro-scale-base',
              cssVar: '--astro-scale-base',
              label: 'Scale Base',
              default: '1rem',
              type: { kind: 'length', min: 0.5, max: 2, step: 0.0625, unit: 'rem' },
            },
            {
              id: 'astro-scale-lg',
              cssVar: '--astro-scale-lg',
              label: 'Scale LG',
              default: '1.25rem',
              type: { kind: 'length', min: 0.5, max: 2, step: 0.0625, unit: 'rem' },
            },
          ],
        },
        {
          id: 'semantic',
          label: 'Font role',
          referencesTier: 'raw',
          items: [
            {
              id: 'astro-text-body',
              cssVar: '--astro-text-body',
              label: 'Body',
              default: 'astro-scale-base',
              type: { kind: 'text' },
            },
            {
              id: 'astro-text-title',
              cssVar: '--astro-text-title',
              label: 'Title',
              default: 'astro-scale-lg',
              type: { kind: 'text' },
            },
          ],
        },
      ],
    };
    expect(() =>
      assertValidPanelConfig({ ...baseHostFields, tabs: [fontTab] }),
    ).not.toThrow();
  });

  it('accepts color(kind:color) referencesTier palette(kind:color) — the color-tab pattern', () => {
    const colorTab = {
      id: 'color',
      label: 'Color',
      tiers: [
        {
          id: 'palette',
          label: 'Palette',
          items: [
            {
              id: 'palette-0',
              cssVar: '--color-palette-0',
              label: 'P0',
              default: '#1e1e1e',
              type: { kind: 'color' },
            },
          ],
        },
        {
          id: 'semantic',
          label: 'Semantic',
          referencesTier: 'palette',
          items: [
            {
              id: 'primary',
              cssVar: '--color-primary',
              label: 'Primary',
              default: 'palette-0',
              type: { kind: 'color' },
            },
          ],
        },
      ],
    };
    expect(() =>
      assertValidPanelConfig({ ...baseHostFields, tabs: [colorTab] }),
    ).not.toThrow();
  });

  it('still rejects a ref to a non-existent tier (referenced-tier-exists rule preserved)', () => {
    const badRefTab = {
      id: 'broken',
      label: 'Broken',
      tiers: [
        {
          id: 'semantic',
          label: 'Semantic',
          referencesTier: 'nonexistent',
          items: [
            {
              id: 'role-a',
              cssVar: '--broken-role-a',
              label: 'Role A',
              default: 'whatever',
              type: { kind: 'text' },
            },
          ],
        },
      ],
    };
    expect(() =>
      assertValidPanelConfig({ ...baseHostFields, tabs: [badRefTab] }),
    ).toThrow(/tier "nonexistent" does not exist/);
  });

  it('still rejects mixed item kinds within a single tier (intra-tier rule preserved)', () => {
    const mixedTab = {
      id: 'mixed',
      label: 'Mixed',
      tiers: [
        {
          id: 'jumble',
          label: 'Jumble',
          items: [
            {
              id: 'a',
              cssVar: '--mixed-a',
              label: 'A',
              default: '#fff',
              type: { kind: 'color' },
            },
            {
              id: 'b',
              cssVar: '--mixed-b',
              label: 'B',
              default: '4px',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              type: { kind: 'length', min: 0, max: 10, step: 1, unit: 'px' } as any,
            },
          ],
        },
      ],
    };
    expect(() =>
      assertValidPanelConfig({ ...baseHostFields, tabs: [mixedTab] }),
    ).toThrow(/mixed item kinds/);
  });
});
