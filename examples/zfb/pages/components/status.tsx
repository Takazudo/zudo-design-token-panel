/**
 * Status surfaces demo — zfb plain CSS.
 *
 * Plain CSS mirror of zfb-tailwind/pages/components/status.tsx (#138).
 * Tailwind utilities replaced by .zfb-alert*, .zfb-badge*,
 * .zfb-tag*, .zfb-tooltip* classes from global.css.
 *
 * Badge colors: accent, success, warning, danger — 4 variants matching
 * zfb-tailwind (#132 shipped 4 variants; using 4 for consistency).
 *
 * Tooltip implementation: CSS :hover on .zfb-tooltip parent reveals
 * .zfb-tooltip__bubble sibling via opacity transition using
 * easing-tab-open semantic token.
 */

import { AppShell } from '../../components/app-shell';

const BASE_PATH = '/pj/zudo-design-token-panel/examples/zfb/';

// ── Alerts ────────────────────────────────────────────────────────────────────

function Alerts() {
  return (
    <section class="zfb-field-group" style={{ gap: 'var(--zfb-spacing-md)' }}>
      <h2 class="zfb-section-h3">Alerts / callouts</h2>
      <p class="zfb-body-text">
        Each variant uses a semantic color token for background, text, and border.
        Token contract: <code>color-accent</code> / <code>color-success</code> /{' '}
        <code>color-warning</code> / <code>color-danger</code>. Padding:{' '}
        <code>spacing-md</code>. Corners: <code>radius</code>.
      </p>

      <div class="zfb-alert zfb-alert--info">
        <strong>Info:</strong> uses <code>color-accent</code>.
      </div>

      <div class="zfb-alert zfb-alert--success">
        <strong>Success:</strong> uses <code>color-success</code>.
      </div>

      <div class="zfb-alert zfb-alert--warning">
        <strong>Warning:</strong> uses <code>color-warning</code>.
      </div>

      <div class="zfb-alert zfb-alert--danger">
        <strong>Danger:</strong> uses <code>color-danger</code>.
      </div>
    </section>
  );
}

// ── Badges ────────────────────────────────────────────────────────────────────

type BadgeColor = 'accent' | 'success' | 'warning' | 'danger';

interface BadgeProps {
  color: BadgeColor;
  variant: 'filled' | 'outlined';
  label: string;
}

function Badge({ color, variant, label }: BadgeProps) {
  return (
    <span class={`zfb-badge zfb-badge--${variant} zfb-badge--${color}`}>
      {label}
    </span>
  );
}

function Badges() {
  const colors: BadgeColor[] = ['accent', 'success', 'warning', 'danger'];

  return (
    <section class="zfb-field-group" style={{ gap: 'var(--zfb-spacing-md)' }}>
      <h2 class="zfb-section-h3">Badges</h2>
      <p class="zfb-body-text">
        Filled badges: <code>bg: color-{'{color}'}</code> + <code>text: bg</code>.
        Outlined badges: <code>border + text: color-{'{color}'}</code>.
        Both use <code>px-spacing-xs</code>, <code>radius</code>, <code>text-small</code>.
        Vertical padding <code>0.125rem</code> is below <code>spacing-xs</code>{' '}
        granularity — local exception per G4 row 5.
      </p>

      <div>
        <p class="zfb-muted-text" style={{ marginBottom: 'var(--zfb-spacing-xs)' }}>
          Filled
        </p>
        <div class="zfb-flex-wrap">
          {colors.map((c) => (
            <Badge key={`filled-${c}`} color={c} variant="filled" label={c} />
          ))}
        </div>
      </div>

      <div>
        <p class="zfb-muted-text" style={{ marginBottom: 'var(--zfb-spacing-xs)' }}>
          Outlined
        </p>
        <div class="zfb-flex-wrap">
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
    <span class="zfb-tag">
      {label}
      <button
        type="button"
        class="zfb-tag__close"
        aria-label={`Remove ${label}`}
      >
        ×
      </button>
    </span>
  );
}

function Tags() {
  const tags = ['Design', 'Tokens', 'CSS Vars', 'Preact'];
  return (
    <section class="zfb-field-group" style={{ gap: 'var(--zfb-spacing-md)' }}>
      <h2 class="zfb-section-h3">Tags / chips</h2>
      <p class="zfb-body-text">
        Container: <code>.zfb-tag</code> — <code>bg: color-surface</code>,{' '}
        <code>border: color-muted</code>, <code>px: spacing-sm</code>,{' '}
        <code>py: spacing-xs</code>, <code>radius</code>, <code>text-small</code>.
        Close button: <code>color-muted</code> resting, <code>color-danger</code> hover.
      </p>
      <div class="zfb-flex-wrap">
        {tags.map((t) => (
          <Tag key={t} label={t} />
        ))}
      </div>
    </section>
  );
}

// ── Tooltips ──────────────────────────────────────────────────────────────────
//
// CSS :hover on .zfb-tooltip reveals .zfb-tooltip__bubble.
// No JavaScript required. Opacity transitions via easing-tab-open.

interface TooltipProps {
  text: string;
  tip: string;
}

function Tooltip({ text, tip }: TooltipProps) {
  return (
    <span class="zfb-tooltip">
      <span class="zfb-tooltip__trigger">{text}</span>
      <span class="zfb-tooltip__bubble" role="tooltip">{tip}</span>
    </span>
  );
}

function Tooltips() {
  return (
    <section class="zfb-field-group" style={{ gap: 'var(--zfb-spacing-md)' }}>
      <h2 class="zfb-section-h3">Tooltips</h2>
      <p class="zfb-body-text">
        Hover over the annotated terms. Bubble: <code>bg: color-surface</code>,{' '}
        <code>text: fg</code>, <code>border: color-muted</code>, <code>radius</code>,{' '}
        <code>px: spacing-sm, py: spacing-xs</code>, <code>text-small</code>.{' '}
        Opacity transition uses <code>easing-tab-open</code>.
        Implementation: CSS <code>:hover</code> on wrapper reveals the bubble sibling.
      </p>

      <div
        class="zfb-surface-box"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--zfb-spacing-lg)', fontSize: 'var(--zfb-text-body)', color: 'var(--zfb-fg)' }}
      >
        <span>
          Token panel adjusts{' '}
          <Tooltip text="spacing-md" tip="--zfb-spacing-md (default 1rem)" />{' '}
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
      title="Status — zfb — Design Token Panel"
      activePath={`${BASE_PATH}components/status/`}
    >
      {/* reason: page-content max-width is a layout constant for this demo; no structural token covers prose-container widths */}
      <div class="zfb-page-stack">
        <header>
          <h1 class="zfb-section-h2">Status surfaces demo</h1>
          <p class="zfb-body-text" style={{ marginTop: 'var(--zfb-spacing-sm)' }}>
            Covers alerts, badges, tags/chips, and tooltips — all driven by semantic
            color tokens <code>color-accent</code>, <code>color-success</code>,{' '}
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
