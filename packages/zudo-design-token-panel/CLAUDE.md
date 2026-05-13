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

## Cross-example cascade verification

After merging changes that affect the tier model, manifest structure, or token namespace (e.g. #147/#148/#153 panel-hardening waves), run the following to confirm the changes cascade correctly across all five example apps.

### Static analysis (automated)

`pnpm -F @takazudo/zudo-design-token-panel test --run` exercises `src/__tests__/manifest-cascade-verification.test.ts`, which asserts:

- **Invariant A** — no `group:` object-key in any example manifest (`TierItem.group` was removed in #148).
- **Invariant B** — no `advancedTiers:` object-key in any example manifest (`TabConfig.advancedTiers` was removed in #148).
- **Invariant C** — the zfb-tailwind Spacing tab has exactly 3 tiers (`spacing-scale` 4 items, `hsp-scale` 5 items, `vsp-scale` 7 items = 16 total), per the #153 Option A 3-tier structure.
- **Invariant D** — the panel tabs source (`packages/zudo-design-token-panel/src/tabs/`) contains no `<h4`, `<details`, or `<summary` elements.
- **Invariant E** — `examples/zfb-tailwind/styles/global.css` still declares all 16 spacing/hsp/vsp CSS variables and re-exports them as Tailwind theme tokens (`--spacing-*`).

The test uses `fs.readFileSync` on each manifest source file rather than dynamic import, to avoid a circular self-reference through the package's own `exports` map → `./dist/...` artifact.

### Build + typecheck (all 5 examples)

```sh
pnpm typecheck                          # 0 errors across all workspaces
pnpm -F zfb-example build              # zfb Preact example
pnpm -F zfb-tailwind-example build     # zfb-tailwind Preact + Tailwind example
pnpm -F vite-react-example build       # Vite + React example
pnpm -F astro-example build            # Astro example
pnpm -F next-example build             # Next.js example
```

### Browser-cascade testing (deferred to manager)

The static checks above cannot verify that CSS variable changes actually reach computed styles in the browser. After this PR lands, the manager should dispatch a one-shot agent with `/verify-ui` to:

1. Open `examples/zfb-tailwind` in a browser and confirm the Spacing tab shows three sections (Spacing scale / Horizontal spacing / Vertical spacing).
2. Tweak a spacing token in the panel and confirm the computed style of a consuming element updates (e.g. a `padding` using `var(--zfbtw-hsp-md)`).
3. Check the Font, Color, Easing, and Size tabs for regressions in all five example apps.

### CSS variable consumer map (zfb-tailwind, Option A)

`examples/zfb-tailwind/styles/global.css` is the bridge between raw panel tokens and Tailwind theme tokens. The three-step cascade for spacing is:

1. Panel writes `--zfbtw-spacing-*` / `--zfbtw-hsp-*` / `--zfbtw-vsp-*` on `:root`.
2. `global.css` re-exports these as `--spacing-spacing-*` / `--spacing-hsp-*` / `--spacing-vsp-*` (used by Tailwind v4 `@theme`).
3. Tailwind generates utility classes (`gap-hsp-md`, `px-hsp-sm`, etc.) from those theme tokens.

#153 Option A only restructured the manifest tiers — it did not modify `global.css`, so step 2 and 3 remain intact.
