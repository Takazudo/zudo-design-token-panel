# Prose-Token Contract

Internal design document for the **prose demo pages** epic.
Every Wave-2 sub-issue (Astro, Next.js, Vite+React, zfb, zfb-tailwind) must
satisfy this contract so the demo pages share a recognisable look that mirrors
zudo-doc's reference appearance.

---

## Namespace convention

Each demo defines its tokens inside its own `--{prefix}example-*` namespace.
`{prefix}` is the per-demo identifier (e.g. `astro`, `next`, `vite`, `zfb`,
`zfb-tailwind`). The prose tokens below are **in addition to** the base
example tokens already established for each demo.

---

## Required token set

### Vertical spacing scale (flow-space rhythm)

These tokens control the `--flow-space` values assigned to block elements
inside the prose container. All vertical spacing derives from the baseline
rhythm unit so the page never contains arbitrary gap values.

| Token | Purpose |
|---|---|
| `--{prefix}example-vsp-2xs` | Minimum gap — consecutive headings, tight list items |
| `--{prefix}example-vsp-xs` | Tighter paragraph spacing within a sub-section |
| `--{prefix}example-vsp-sm` | Standard heading-to-first-content gap |
| `--{prefix}example-vsp-md` | Default body-level flow gap (baseline rhythm unit) |
| `--{prefix}example-vsp-lg` | Pre-h3 section separation |
| `--{prefix}example-vsp-xl` | Pre-h2 section separation |
| `--{prefix}example-vsp-2xl` | Top-of-page or pre-first-heading clearance |

### Horizontal spacing scale

Used for inline padding, blockquote indent, code block horizontal padding,
and table cell padding.

| Token | Purpose |
|---|---|
| `--{prefix}example-hsp-xs` | Inline code padding, small insets |
| `--{prefix}example-hsp-sm` | Table cell padding, tag padding |
| `--{prefix}example-hsp-md` | Blockquote left indent |
| `--{prefix}example-hsp-lg` | Section-level horizontal gutter |
| `--{prefix}example-hsp-xl` | Outer prose container horizontal padding |

### Type scale (paired with line-heights)

| Token | Purpose |
|---|---|
| `--{prefix}example-text-h2` | `font-size` for `<h2>` headings |
| `--{prefix}example-text-h3` | `font-size` for `<h3>` headings |
| `--{prefix}example-text-h4` | `font-size` for `<h4>` headings |
| `--{prefix}example-text-body` | `font-size` for body paragraphs and list items |
| `--{prefix}example-text-small` | `font-size` for captions, table cells, helper text |
| `--{prefix}example-text-micro` | `font-size` for meta information, code labels |

### Line-height tokens

| Token | Purpose |
|---|---|
| `--{prefix}example-leading-tight` | Heading line-height (compressed) |
| `--{prefix}example-leading-snug` | Sub-heading / list-item line-height |
| `--{prefix}example-leading-relaxed` | Body paragraph line-height (generous) |

### Code surface

| Token | Purpose |
|---|---|
| `--{prefix}example-code-bg` | Background colour for `<pre>` / inline `<code>` |
| `--{prefix}example-code-fg` | Text colour inside code blocks |
| `--{prefix}example-font-mono` | Monospace font-family string (e.g. `ui-monospace, monospace`) |

> `--{prefix}example-font-mono` is a **string token** (font-family value),
> not a size or colour. Wire it directly to `font-family: var(--{prefix}example-font-mono)`.

### Border / accent — reuse existing tokens

Heading top-border gradients and blockquote left-borders intentionally
**reuse** the shared colour tokens already present in each demo's base layer:

- `--{prefix}example-color-fg` — heading gradient start colour (foreground)
- `--color-muted` — blockquote border, muted text, gradient terminus
- `--color-accent` — link colour, highlighted inline code border

No new colour tokens are required for these decorative borders. This keeps
the prose page consistent with the rest of the demo without duplicating the
colour system.

---

## Default values (recommended starting point)

Each demo **may** override these values to match its own design language.
The values below produce a comfortable reading experience that mirrors
zudo-doc's prose pages.

```css
:root {
  /* Vertical spacing — derive from 1.6rem (≈ 25.6 px) rhythm unit */
  --{prefix}example-vsp-2xs: 0.25rem;   /* ~4 px  */
  --{prefix}example-vsp-xs:  0.5rem;    /* ~8 px  */
  --{prefix}example-vsp-sm:  0.75rem;   /* ~12 px */
  --{prefix}example-vsp-md:  1rem;      /* ~16 px — default flow gap */
  --{prefix}example-vsp-lg:  1.75rem;   /* ~28 px */
  --{prefix}example-vsp-xl:  2.5rem;    /* ~40 px */
  --{prefix}example-vsp-2xl: 3.5rem;    /* ~56 px */

  /* Horizontal spacing */
  --{prefix}example-hsp-xs:  0.25rem;
  --{prefix}example-hsp-sm:  0.5rem;
  --{prefix}example-hsp-md:  1rem;
  --{prefix}example-hsp-lg:  1.5rem;
  --{prefix}example-hsp-xl:  2rem;

  /* Type scale */
  --{prefix}example-text-h2:    1.75rem;
  --{prefix}example-text-h3:    1.35rem;
  --{prefix}example-text-h4:    1.1rem;
  --{prefix}example-text-body:  1rem;
  --{prefix}example-text-small: 0.875rem;
  --{prefix}example-text-micro: 0.75rem;

  /* Line-heights */
  --{prefix}example-leading-tight:   1.2;
  --{prefix}example-leading-snug:    1.45;
  --{prefix}example-leading-relaxed: 1.75;

  /* Code surface */
  --{prefix}example-code-bg:   hsl(220 13% 11%);
  --{prefix}example-code-fg:   hsl(220 14% 86%);
  --{prefix}example-font-mono: ui-monospace, "Cascadia Code", "Source Code Pro",
                                Menlo, Consolas, monospace;
}
```

---

## Flow-spacing CSS pattern

Wire the tokens into the prose container with the flow utility pattern
(Strategy 1 from prose-heading-spacing.mdx):

```css
/* Prose container */
.{prefix}-example-prose > * + * {
  margin-block-start: var(--flow-space, var(--{prefix}example-vsp-md));
}

/* Section separation before headings */
.{prefix}-example-prose :where(h2) { --flow-space: var(--{prefix}example-vsp-xl); }
.{prefix}-example-prose :where(h3) { --flow-space: var(--{prefix}example-vsp-lg); }
.{prefix}-example-prose :where(h4) { --flow-space: var(--{prefix}example-vsp-md); }

/* Heading-to-first-content: tight coupling */
.{prefix}-example-prose :where(h2, h3, h4) + :where(p, ul, ol, table, pre, blockquote) {
  --flow-space: var(--{prefix}example-vsp-sm);
}

/* Consecutive headings: tighten */
.{prefix}-example-prose :where(h2, h3, h4, h5, h6) + :where(h2, h3, h4, h5, h6) {
  --flow-space: var(--{prefix}example-vsp-2xs);
}

/* Trim edges */
.{prefix}-example-prose > :first-child { margin-block-start: 0; }
.{prefix}-example-prose > :last-child  { margin-block-end: 0; }
```

This pattern is flex/grid-safe because it uses only `margin-block-start`
(one direction). No margin collapse dependency.
See: typography/text-control/prose-heading-spacing.mdx — Strategy 1.

---

## Rationale

### Why the flow-space pattern?

Markdown-to-HTML produces flat element sequences. If each element owns both
`margin-top` and `margin-bottom`, margin collapse in block flow and its
**absence** in flex/grid containers produce different gaps from identical CSS.
The flow utility assigns spacing to a single direction (`margin-block-start`)
via a CSS custom property (`--flow-space`). Each block element sets its own
`--flow-space` value; the container reads it. This makes spacing predictable
in any layout context and eliminates the consecutive-heading accumulation
problem with one override rule.

Reference: `typography/text-control/prose-heading-spacing.mdx`
Reference: `typography/text-control/vertical-rhythm.mdx`

### Why `:where()` for zero specificity?

The flow-space overrides use `:where(h2)`, `:where(h3, h4)`, etc. Because
`:where()` contributes zero specificity to the selector, later rules (pair
overrides, component-inline styles) can override `--flow-space` without
specificity escalation. Declaration order controls which rule wins, which
makes the system predictable and extensible.

Reference: `interactive/selectors/is-where-selectors.mdx` (see also
prose-heading-spacing.mdx "Fine-Tuning Specific Heading Pairs").

### Why MDX component overrides instead of container-scoped CSS?

In Tailwind v4, `@import "tailwindcss/utilities"` places utility classes
inside a `@layer`. Unlayered CSS (a container rule such as
`.prose :where(h3) { font-size: ... }`) always beats layered utilities
regardless of specificity or source order. This creates an unsolvable cascade
conflict whenever an `<h3>` inside the prose container is also used in an
interactive component (forms, panels).

The component-override pattern replaces container element selectors with
explicit components (`ContentH2`, `ContentH3`, etc.) that carry their own
styles. This eliminates the layering conflict: each context controls its own
heading appearance via the component it chooses to render, not via a CSS rule
that fights all other rules.

For demos that do **not** use MDX or a framework with component-override
support (plain Vite+React without `remark`/`rehype`, zfb), container-scoped
CSS with `:where()` is acceptable because the cascade conflict arises only
when the same HTML elements appear in non-content contexts on the same page.

Reference: `methodology/architecture/mdx-component-architecture.mdx`

### Why per-demo namespace isolation?

Each demo lives in a different tech stack with different CSS scoping
semantics. A shared `--example-*` namespace would let token definitions leak
across demos when bundled together (e.g. in a multi-demo preview page).
Per-demo namespaces (`--astro-example-*`, `--next-example-*`, etc.) keep
each token set self-contained. Shared values (brand colours, font families)
live in a common layer that all namespaces can reference.

Reference: `methodology/design-systems/multi-namespace-token-strategy.mdx`

---

## /css-wisdom articles every Wave-2 sub-issue must cite

| Article path | When to cite |
|---|---|
| `methodology/architecture/mdx-component-architecture.mdx` | When wiring MDX component-override maps in Astro/Next demos |
| `typography/text-control/prose-heading-spacing.mdx` | When implementing the flow-space container CSS |
| `typography/text-control/vertical-rhythm.mdx` | When choosing default token values (spacing scale rationale) |
| `methodology/design-systems/multi-namespace-token-strategy.mdx` | When declaring the per-demo `--{prefix}example-*` tokens |

---

## zudo-doc reference paths (do NOT copy prose verbatim)

These paths are provided for structural reference only. Examine the shapes
and patterns; write your own implementation.

- `src/styles/global.css` lines ~200–400 — pattern for wiring prose tokens
  into a container; mirror using the demo's own `{prefix}`.
- `src/components/content/heading-h2.tsx`, `heading-h3.tsx`, `heading-h4.tsx`
  — gradient-bordered heading component shape.
- `src/components/content/content-link.tsx`, `content-paragraph.tsx`,
  `content-strong.tsx`, `content-blockquote.tsx`, `content-table.tsx`,
  `content-code.tsx`, `content-ol.tsx`, `content-ul.tsx`
  — component-override shape for demos that wire MDX override maps.
