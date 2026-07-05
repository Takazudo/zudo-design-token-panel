# zudo-design-token-panel — package rules

Package-level rules for `@takazudo/zdtp`. These supplement the root `CLAUDE.md` which contains the project-wide summary.

## Panel DOM hygiene — no host-stylable semantic tags

### Rule

The panel ships inside a host app. Host apps routinely apply aggressive global CSS resets that target semantic HTML elements by tag name (`h1`–`h6`, `p`, `ul`, `li`, `a`, etc.). Any such element placed inside the panel's markup will inherit those resets and break the panel's layout unpredictably.

**All blocked elements MUST be replaced with `<div>` (or `<span>`) carrying the appropriate ARIA role and a `className` scoped to the `tokenpanel-` BEM namespace.**

### Blocked elements

| Category | Elements |
| --- | --- |
| Headings | `h1`, `h2`, `h3`, `h4`, `h5`, `h6` |
| Text / prose | `p`, `blockquote`, `pre`, `code`, `em`, `strong`, `address` |
| Lists | `ul`, `ol`, `li` |
| Tabular | `table`, `thead`, `tbody`, `tr`, `th`, `td` |
| Links | `a` |
| Sectioning | `article`, `aside`, `main`, `nav`, `header`, `footer`, `section`, `figure`, `figcaption` |
| Misc | `hr`, `details`, `summary` (standalone) |

### Permitted form controls (exempted)

The following elements are legitimately needed for editing controls. They may be used directly:

`input`, `select`, `textarea`, `label`, `form`, `datalist`, `option`, `optgroup`, `fieldset`, `legend`, `dialog`

These are exempted because they carry intrinsic browser behaviour (focus, value, validation, accessibility) that cannot be replicated with `div`. They are also more tightly scoped by the browser UA stylesheet and less often targeted by host resets.

### SVG defensive reset

`svg`, `use`, and `path` are functional rendering elements and stay as-is. However the package's bundled CSS must include a defensive reset so host icon rules cannot repaint panel SVGs:

```css
/* In panel.css — defensive reset for SVGs embedded in the panel */
:where(.tokenpanel-shell) svg {
  /* !important is required to beat a hostile `svg { fill: red !important }`.
   * Both rules land at specificity 0-0-1; the later one (panel CSS, injected
   * at runtime after host CSS) wins at equal specificity + equal !important. */
  fill: currentColor !important;
  pointer-events: none;
  display: inline-block;
  overflow: visible;
}
```

This reset is scoped to `.tokenpanel-shell` so it does not bleed into the host page. Any CSS rule that overrides `fill` for a specific icon class (e.g. `fill: none` for stroke-drawn SVGs like the highlight-toggle) **must also use `!important`**: a non-!important override cannot win over the base `fill: currentColor !important` regardless of its specificity.

The automated gate in `packages/zdtp/src/__tests__/hostile-host-isolation.browser.test.tsx` (F33) verifies that the SVG fill defensive reset survives `svg { fill: red !important }` in a full hostile CSS environment.

### Chrome-button policy

Every interactive button-like element in the panel package MUST be implemented as:

```tsx
<div
  role="button"
  tabIndex={0}
  className="tokenpanel-btn"
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
>
  Label
</div>
```

**Exception — listbox option children**: items inside a listbox container become `<div role="option">`. They do NOT get Enter/Space handlers because the listbox container is responsible for keyboard navigation (arrow keys, Home/End, Enter to select). Adding Enter/Space on individual options creates conflicting handler chains.

```tsx
// Listbox container owns keyboard nav
<div role="listbox" aria-label="..." onKeyDown={handleListboxKeyDown}>
  {options.map((opt) => (
    <div key={opt.value} role="option" aria-selected={isSelected(opt)} onClick={() => select(opt)}>
      {opt.label}
    </div>
  ))}
</div>
```

### No-progressive-disclosure policy

This panel is a **developer tool**. The user is a developer who wants to see all available tokens without hunting through collapsed sections.

- Do NOT use `<details>` / `<summary>` anywhere inside the panel.
- Do NOT implement custom collapse-by-default disclosure (accordions, toggles, "show more" buttons).
- If a tab has many tokens, render them flat in tier-section order.

The `TabConfig.advancedTiers` field (which previously hid tiers behind a disclosure) **is being removed in #148**. Do not add new uses of it. Example manifests must not reference it.

### One-tier-one-heading policy

Each tier renders exactly **one** `<div role="heading" aria-level={3}>` (the tier-section heading). The panel does NOT render a second-level heading inside a tier.

If a tier conceptually needs sub-grouping:

- **Do this**: split the tier into multiple `TierConfig` entries, each with its own `label` and its own section heading.
- **Do not do this**: add an `h4` (or `<div role="heading" aria-level={4}>`) inside a tier's item list.

The `TierItem.group` field **is being removed in #148**. It was used to inject section sub-headings inside a tier. Do not add new uses of it. Example manifests must not use it.

### Before / after recipe

The panel currently uses `aria-level={3}` only. The recipe below shows the general pattern for any heading replacement; apply the same transform for any level:

```tsx
// Before — leaks host h4 resets into the panel
<h4 className="tokenpanel-tab-section-heading">{tier.label}</h4>

// After — self-contained, isolated from host resets
// CSS class carries all visual styling; role+level carry semantics
<div
  role="heading"
  aria-level={3}
  className="tokenpanel-tab-section-heading"
>
  {tier.label}
</div>
```

The companion CSS rule is unchanged — the selector targets the class, not the tag:

```css
.tokenpanel-tab-section-heading {
  /* existing heading styles */
}
```

This swap is purely structural: it removes the tag-level styling hook without touching the class-based visual styling.

## Ramp-native Tier-2 color editor (`semantic` / `referencesRamps`, epic #459)

The tier model (`tokens/tier-model.ts`) gained two additive `TierConfig` fields for the Color tab:

- `semantic?: true` — marks a tier as holding `SemanticValue` mappings (index, literal, per-mode literal, or a cross-tab ramp `{ ref }`) instead of raw palette entries. A tier marked `semantic: true` is NEVER treated as the palette tier, even when its items are `kind: 'color'` — this lets a Color `TabConfig` ship with a **lone semantic tier** and no palette tier at all (issue #458).
- `referencesRamps?: readonly { tab?: string; tier: string }[]` — declares which ramp tier(s) (optionally on another tab) a `semantic: true` tier's `{ ref }` rows may point into. Validated up front by `assertValidPanelConfig`.

Full behavioral documentation (the `SemanticValue` union, the per-mode `light-dark()` emission, the worked cross-tab example) lives in `doc/src/content/docs/reference/color-cluster.mdx` — this section only covers what changed for the panel's OWN DOM-hygiene rules above.

**No new tag exemptions were needed.** The two new interactive pieces this feature added both reuse the existing permitted-form-control exemptions, not new markup:

- The grouped ref-or-literal picker (`controls/tier-ref-selector.tsx`) is a native `<select>` with one `<optgroup>` per declared ramp source and a trailing `"Literal…"` `<option>`.
- The "Per-mode" toggle that expands a literal row into an independently-editable light/dark `ColorField` pair is a native `<label><input type="checkbox"></label>`.

Both `select`/`optgroup`/`option` and `input`/`label` are already on the permitted-form-controls list above. `color-tab.tsx`'s semantic rows (whether `PaletteSelector`, `SemanticLiteralRow`, or the grouped `TierRefSelector`) still render exactly one tier-section heading (`<div role="heading" aria-level={3}>` per the one-tier-one-heading policy) — the new value shapes only change what's inside a row, not the tier's own heading structure.

## Hostile-host test page

A verification harness page lives at `doc/src/content/docs/internal/hostile-host.mdx`. It is marked `unlisted: true` (not indexed, not in sidebar) and documents the hostile-host test scenario for the Panel Hardening epic (#145).

### URL (local dev)

Start the doc site dev server:

```sh
pnpm --filter doc dev
# URL: http://localhost:4321/docs/internal/hostile-host/
```

### What it covers

- The complete hostile CSS block (h1–h6, button, p/ul/li, pre/code, svg/path, universal box-shadow) used to verify CSS isolation.
- Step-by-step instructions for injecting the hostile CSS into any running example app via the DevTools console.
- Static-grep findings table: every banned-tag occurrence in `src/**/*.tsx` (excluding tests) categorised as regression, false positive, or intentional exemption.
- A11y follow-up note: keyboard accessibility under hostile host requires browser verification via /verify-ui.

### Running the harness

1. Start any example app from its sibling repo under `$HOME/repos/zdtp-ex/` (Astro example recommended): `cd $HOME/repos/zdtp-ex/zudo-design-token-panel-example-astro && pnpm dev`. The full list of external example repos is in [`doc/src/content/docs/internal/hostile-host.mdx`](../../doc/src/content/docs/internal/hostile-host.mdx).
2. Paste the hostile `<style>` injection snippet from the harness page into DevTools console.
3. Toggle the panel: `window.astro.toggleDesignPanel()`
4. Exercise every tab and every modal.
5. Confirm no panel element inherits the hostile colours/sizes.

### Known regressions

None as of the Panel Hardening epic merge. The two `<pre>` blocks originally found by #151 (export-modal `__json` and apply-modal `jsonBlock`) were swapped to `<div role="none">` with `white-space: pre; font-family: monospace` carried by the companion CSS.

## Cross-example cascade verification

After merging changes that affect the tier model, manifest structure, or token namespace (e.g. #147/#148/#153 panel-hardening waves), confirm the changes cascade correctly across all five example consumer apps. The example apps now live in dedicated sibling repos — see §15 of `README.md` for the five repo URLs.

### Static analysis (in this repo)

`pnpm -F @takazudo/zdtp test --run` exercises `src/__tests__/manifest-cascade-verification.test.ts`, which asserts the panel-internal invariants:

- **Invariant D** — the panel tabs and `components/color-picker/` source contain no `<h4`, `<details`, `<summary`, `<button`, or `<table` elements (the hostile-host policy above).
- **Invariant F** — the panel CSS sources (`panel-tokens.css` and `panel.css`) do not read host `--color-*` or `--font-mono` vars, and declare their baked-in dark `--tokentweak-*` chrome tokens.
- **Invariant H** (#459/#475) — the ramp-native Tier-2 example manifest (`_example-ramp-native-tier2.ts`) is a real, `configurePanel`-valid `PanelConfig`; `semantic: true`, `referencesRamps`, and every `SemanticValue` shape (index-free `{ ref }`, `{ literal }`, and a runtime-built per-mode `{ literal: { light, dark } }`) resolve and emit correctly.

> **Historical note — Invariants A, B, C, E.** Earlier waves asserted Invariant A (`TierItem.group` removed in #148) and Invariant B (`TabConfig.advancedTiers` removed in #148) by grepping every example manifest source for those object-keys. After the panel types removed those fields, TypeScript at panel-compile time covers both. Invariant C (zfb-tailwind Spacing tab tier count) and Invariant E (`examples/zfb-tailwind/styles/global.css` re-exports spacing variables as Tailwind theme tokens) were exercised by reading example source files directly. After the Wave-2 example-move (epic #202) those files left this monorepo, so Invariants C and E are now exercised in the external [`zudo-design-token-panel-example-zfb-tailwind`](https://github.com/Takazudo/zudo-design-token-panel-example-zfb-tailwind) repo's own CI on each panel SHA bump.

### Build + typecheck (panel + doc, in this repo)

```sh
pnpm typecheck    # 0 errors across the remaining workspaces (panel + doc)
pnpm build        # builds the panel and the doc workspace
```

For cross-example build verification, clone each external example repo under `$HOME/repos/zdtp-ex/` and run its own `pnpm build` (see `README.md` §15 for the five repos).

### Browser-cascade testing (deferred to manager)

The static checks above cannot verify that CSS variable changes actually reach computed styles in the browser. After this PR lands, the manager should dispatch a one-shot agent with `/verify-ui` against each example repo's deployed live demo to:

1. Open the `zfb-tailwind` example live demo and confirm the Spacing tab shows its expected sections (Horizontal spacing / Vertical spacing, post-#161).
2. Tweak a spacing token in the panel and confirm the computed style of a consuming element updates (e.g. a `padding` using `var(--zfbtw-hsp-md)`).
3. Check the Font, Color, Easing, and Size tabs for regressions in all five example apps.

### CSS variable consumer map (zfb-tailwind, post-#161)

The `zfb-tailwind` example's `styles/global.css` (now in the external example repo) is the bridge between raw panel tokens and Tailwind theme tokens. The three-step cascade for spacing is:

1. Panel writes `--zfbtw-hsp-*` and `--zfbtw-vsp-*` on `:root`.
2. `global.css` re-exports these as `--spacing-hsp-*` and `--spacing-vsp-*` (used by Tailwind v4 `@theme`).
3. Tailwind generates utility classes (`gap-hsp-md`, `px-hsp-sm`, etc.) from those theme tokens.
