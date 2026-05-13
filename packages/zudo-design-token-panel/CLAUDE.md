# zudo-design-token-panel — package rules

Package-level rules for `@takazudo/zudo-design-token-panel`. These supplement the root `CLAUDE.md` which contains the project-wide summary.

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
  fill: currentColor;
  pointer-events: none;
  display: inline-block;
  overflow: visible;
}
```

This reset is scoped to `.tokenpanel-shell` so it does not bleed into the host page.

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

## Hostile-host test page

A verification harness page lives at `doc/src/content/docs/internal/hostile-host.mdx`. It is marked `unlisted: true` (not indexed, not in sidebar) and documents the hostile-host test scenario for the Panel Hardening epic (#145).

### URL (local dev)

Start the doc site dev server:

```sh
pnpm --filter doc dev
# URL: http://localhost:4321/pj/zudo-design-token-panel/docs/internal/hostile-host/
```

### What it covers

- The complete hostile CSS block (h1–h6, button, p/ul/li, pre/code, svg/path, universal box-shadow) used to verify CSS isolation.
- Step-by-step instructions for injecting the hostile CSS into any running example app via the DevTools console.
- Static-grep findings table: every banned-tag occurrence in `src/**/*.tsx` (excluding tests) categorised as regression, false positive, or intentional exemption.
- A11y follow-up note: keyboard accessibility under hostile host requires browser verification via /verify-ui.

### Running the harness

1. Start any example app (Astro example recommended): `pnpm --filter @takazudo/zudo-design-token-panel-astro-example dev`
2. Paste the hostile `<style>` injection snippet from the harness page into DevTools console.
3. Toggle the panel: `window.astro.toggleDesignPanel()`
4. Exercise every tab and every modal.
5. Confirm no panel element inherits the hostile colours/sizes.

### Known regressions (as of Wave 2)

Two `<pre>` elements remain in production markup and will bleed through hostile `pre { font-family: "Comic Sans MS"; background: yellow }` overrides:

- `src/export-modal.tsx` line 202 — JSON display in the export modal.
- `src/apply-modal.tsx` line 766 — JSON snapshot in the apply-modal success view.

Fix recipe: replace `<pre>` with `<div role="none">` styled with `white-space: pre; font-family: monospace` in the companion CSS. Track as a follow-up sub-issue against epic #145.
