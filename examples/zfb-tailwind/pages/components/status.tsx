/**
 * Status surfaces demo — zfb-tailwind example, sub-issue #132.
 *
 * Tooltip implementation: `position: absolute` with `transform: translateX(-50%)`
 * on the bubble sibling. Fallback approach chosen over CSS anchor positioning
 * to avoid anchor-name uniqueness issues across multiple tooltip instances on
 * the same page.
 *
 * Badge colors: accent, success, warning, danger — matching the 4 alert variants
 * above them for internal consistency. (§138.1 lists 5 incl. primary; flag to
 * manager for #138 parity decision.)
 *
 * Easing: tooltip opacity transition references `--zfbtw-easing-tab-open`
 * via inline style — the token is not raw px/hex so this is within G4 policy.
 */

import { AppShell } from '../../components/app-shell';

const BASE_PATH = '/pj/zudo-design-token-panel/examples/zfb-tailwind/';

// ── Alerts ────────────────────────────────────────────────────────────────────

function Alerts() {
  return (
    <section class="flex flex-col gap-vsp-md">
      <h2 class="text-section-title font-semibold text-fg">Alerts / callouts</h2>
      <p class="text-body text-fg">
        Each variant uses a semantic color token for background, text, and border.
        Token contract: <code>bg-accent</code> / <code>bg-success</code> /{' '}
        <code>bg-warning</code> / <code>bg-danger</code> with{' '}
        <code>text-bg</code> text and matching <code>border-*</code> outline.
        Padding: <code>px-hsp-md py-vsp-md</code>. Corners: <code>rounded-md</code>.
      </p>

      {/* info */}
      <div class="bg-accent text-bg px-hsp-md py-vsp-md rounded-md border border-accent">
        <strong>Info:</strong> uses <code>bg-accent</code>, <code>text-bg</code>,{' '}
        <code>border-accent</code>. Token: <code>color-accent</code>.
      </div>

      {/* success */}
      <div class="bg-success text-bg px-hsp-md py-vsp-md rounded-md border border-success">
        <strong>Success:</strong> uses <code>bg-success</code>, <code>text-bg</code>,{' '}
        <code>border-success</code>. Token: <code>color-success</code>.
      </div>

      {/* warning */}
      <div class="bg-warning text-bg px-hsp-md py-vsp-md rounded-md border border-warning">
        <strong>Warning:</strong> uses <code>bg-warning</code>, <code>text-bg</code>,{' '}
        <code>border-warning</code>. Token: <code>color-warning</code>.
      </div>

      {/* danger */}
      <div class="bg-danger text-bg px-hsp-md py-vsp-md rounded-md border border-danger">
        <strong>Danger:</strong> uses <code>bg-danger</code>, <code>text-bg</code>,{' '}
        <code>border-danger</code>. Token: <code>color-danger</code>.
      </div>
    </section>
  );
}

// ── Badges ────────────────────────────────────────────────────────────────────

interface BadgeProps {
  color: 'accent' | 'success' | 'warning' | 'danger';
  variant: 'filled' | 'outlined';
  label: string;
}

function Badge({ color, variant, label }: BadgeProps) {
  if (variant === 'filled') {
    return (
      // reason: badge vertical pad is below `spacing-xs`; below-token granularity is local
      <span class={`bg-${color} text-bg px-hsp-xs py-[0.125rem] rounded-md text-helper`}>
        {label}
      </span>
    );
  }
  return (
    // reason: badge vertical pad is below `spacing-xs`; below-token granularity is local
    <span class={`border border-${color} text-${color} px-hsp-xs py-[0.125rem] rounded-md text-helper`}>
      {label}
    </span>
  );
}

function Badges() {
  const colors: Array<'accent' | 'success' | 'warning' | 'danger'> = [
    'accent',
    'success',
    'warning',
    'danger',
  ];

  return (
    <section class="flex flex-col gap-vsp-md">
      <h2 class="text-section-title font-semibold text-fg">Badges</h2>
      <p class="text-body text-fg">
        Filled badges: <code>bg-{'{color}'}</code> + <code>text-bg</code>.
        Outlined badges: <code>border-{'{color}'}</code> + <code>text-{'{color}'}</code>.
        Both use <code>px-hsp-xs</code>, <code>rounded-md</code>, <code>text-helper</code>.
        Vertical padding <code>py-[0.125rem]</code> is below{' '}
        <code>vsp-xs</code> granularity — local exception per G4 row 5.
      </p>

      <div>
        <p class="text-helper text-muted mb-vsp-xs">Filled</p>
        <div class="flex flex-wrap gap-x-hsp-sm gap-y-vsp-sm">
          {colors.map((c) => (
            <Badge key={`filled-${c}`} color={c} variant="filled" label={c} />
          ))}
        </div>
      </div>

      <div>
        <p class="text-helper text-muted mb-vsp-xs">Outlined</p>
        <div class="flex flex-wrap gap-x-hsp-sm gap-y-vsp-sm">
          {colors.map((c) => (
            <Badge key={`outlined-${c}`} color={c} variant="outlined" label={c} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Tags / chips ──────────────────────────────────────────────────────────────

interface TagProps {
  label: string;
}

function Tag({ label }: TagProps) {
  return (
    <span class="inline-flex items-center gap-hsp-xs bg-surface text-fg px-hsp-sm py-vsp-xs rounded-md text-helper border border-muted">
      {label}
      <button
        type="button"
        class="text-muted hover:text-danger border-none bg-transparent cursor-pointer p-0 leading-none"
        aria-label={`Remove ${label}`}
      >
        ×
      </button>
    </span>
  );
}

function Tags() {
  const tags = ['Design', 'Tokens', 'Tailwind', 'CSS Vars'];
  return (
    <section class="flex flex-col gap-vsp-md">
      <h2 class="text-section-title font-semibold text-fg">Tags / chips</h2>
      <p class="text-body text-fg">
        Container: <code>inline-flex items-center gap-hsp-xs bg-surface text-fg</code> +{' '}
        <code>px-hsp-sm py-vsp-xs rounded-md text-helper border border-muted</code>.
        Close button: <code>text-muted hover:text-danger</code>.
      </p>
      <div class="flex flex-wrap gap-x-hsp-sm gap-y-vsp-sm">
        {tags.map((t) => (
          <Tag key={t} label={t} />
        ))}
      </div>
    </section>
  );
}

// ── Tooltips ──────────────────────────────────────────────────────────────────
//
// Implementation: `position: absolute` with `transform: translateX(-50%)`
// on the bubble sibling span. The trigger is `position: relative` so the
// bubble is anchored to it. Opacity is toggled via CSS :hover + transition.
//
// Opacity transition: references `--zfbtw-easing-tab-open` (semantic
// easing token) via inline `style` on the bubble — the token makes this G4-safe.

interface TooltipProps {
  text: string;
  tip: string;
}

function Tooltip({ text, tip }: TooltipProps) {
  return (
    <span class="relative inline-block">
      <span
        class="underline decoration-dotted cursor-help text-accent"
      >
        {text}
      </span>
      {/*
        Fallback tooltip bubble — position: absolute + translateX(-50%) centres the
        bubble over the trigger. Opacity starts at 0, :hover on the parent reveals
        it via the CSS group-hover pattern below (simulated with inline @layer style).
        The transition uses easing-tab-open for a smooth fade-in.
      */}
      <span
        class="
          absolute bottom-full left-1/2
          -translate-x-1/2 mb-vsp-xs
          bg-surface text-fg border border-muted rounded-md
          px-hsp-sm py-vsp-xs
          text-helper
          whitespace-nowrap
          opacity-0
          pointer-events-none
          [.relative:hover_&]:opacity-100
        "
        role="tooltip"
        // reason: tooltip opacity transition references easing-tab-open semantic
        // token via var(); inline style used because Tailwind cannot compose an
        // arbitrary transition-timing-function with a CSS variable reference
        style="transition: opacity 0.2s var(--zfbtw-easing-tab-open);"
      >
        {tip}
      </span>
    </span>
  );
}

function Tooltips() {
  return (
    <section class="flex flex-col gap-vsp-md">
      <h2 class="text-section-title font-semibold text-fg">Tooltips</h2>
      <p class="text-body text-fg">
        Hover over the annotated terms. Bubble: <code>bg-surface</code>,{' '}
        <code>text-fg</code>, <code>border-muted</code>, <code>rounded-md</code>,{' '}
        <code>px-hsp-sm py-vsp-xs</code>, <code>text-helper</code>.{' '}
        Opacity transition uses{' '}
        <code>easing-tab-open</code> (<code>--zfbtw-easing-tab-open</code>).
        Implementation: <code>position: absolute</code> with{' '}
        <code>translateX(-50%)</code> on the sibling bubble span.
      </p>

      <div class="flex flex-wrap gap-x-hsp-lg gap-y-vsp-lg text-body text-fg bg-surface px-hsp-md py-vsp-md rounded-md border border-muted">
        <span>
          Token panel adjusts{' '}
          <Tooltip text="hsp-md / vsp-md" tip="--zfbtw-hsp-md / --zfbtw-vsp-md (default 1rem)" />{' '}
          live in the browser.
        </span>
        <span>
          Colors follow the{' '}
          <Tooltip text="three-tier strategy" tip="palette → semantic → component" />{' '}
          design-token model.
        </span>
        <span>
          Easing uses the{' '}
          <Tooltip text="easing-tab-open" tip="cubic-bezier(0.42, 0, 1, 1)" />{' '}
          semantic role.
        </span>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StatusPage() {
  return (
    <AppShell
      title="Status — zfb + Tailwind v4 — Design Token Panel"
      activePath={`${BASE_PATH}components/status/`}
    >
      {/* reason: page-content max-width is a layout constant for this demo; no structural token covers prose-container widths */}
      <div class="flex flex-col gap-vsp-lg max-w-[56rem] mx-auto">
        <header>
          <h1 class="text-page-title font-bold text-primary">Status surfaces demo</h1>
          <p class="text-body text-fg mt-vsp-sm">
            Status surfaces demo for sub-issue #132. Covers alerts, badges, tags/chips,
            and tooltips — all driven by semantic color tokens{' '}
            <code>color-accent</code>, <code>color-success</code>,{' '}
            <code>color-warning</code>, <code>color-danger</code>.
          </p>
        </header>

        <Alerts />
        <Badges />
        <Tags />
        <Tooltips />
      </div>
    </AppShell>
  );
}
