/**
 * Status page — status surface demos for the Vite + React example.
 *
 * Demonstrates alerts (info/success/warning/danger), badges (accent/success/
 * warning/danger), and tooltips. All driven by semantic color tokens so panel
 * tweaks update all surfaces simultaneously.
 *
 * Token consumption:
 *   .vr-page            → layout container
 *   .vr-page-title      → page heading
 *   .vr-section-title   → section headings
 *   .vr-body / .vr-helper → text variants
 *   .vr-alert (.is-info, .is-success, .is-warning, .is-danger) → callout blocks
 *   .vr-badge (.is-accent, .is-success, .is-warning, .is-danger) → inline labels
 *   .vr-tooltip + .vr-tooltip__bubble → hover tooltip
 *
 * Tooltip implementation: position: absolute with translateX(-50%) on the
 * bubble sibling. Opacity toggled via CSS :hover + transition in components.css.
 * The easing token (--vr-easing-tab-open) is already wired in components.css.
 */

// ── Alerts ────────────────────────────────────────────────────────────────────

function Alerts() {
  return (
    <div>
      <div role="heading" aria-level={2} className="vr-section-title">
        Alerts / callouts
      </div>
      <div className="vr-body" style={{ marginBottom: 'var(--vr-vsp-sm)' }}>
        Each variant uses a semantic color token for background and text.
        Tokens: <code>--vr-color-accent</code>, <code>--vr-color-success</code>,{' '}
        <code>--vr-color-warning</code>, <code>--vr-color-danger</code>.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--vr-vsp-sm)' }}>
        <div className="vr-alert is-info">
          <strong>Info:</strong> uses <code>--vr-color-accent</code> background.
        </div>
        <div className="vr-alert is-success">
          <strong>Success:</strong> uses <code>--vr-color-success</code> background.
        </div>
        <div className="vr-alert is-warning">
          <strong>Warning:</strong> uses <code>--vr-color-warning</code> background.
        </div>
        <div className="vr-alert is-danger">
          <strong>Danger:</strong> uses <code>--vr-color-danger</code> background.
        </div>
      </div>
    </div>
  );
}

// ── Badges ────────────────────────────────────────────────────────────────────

type BadgeVariant = 'accent' | 'success' | 'warning' | 'danger';

const BADGE_VARIANTS: BadgeVariant[] = ['accent', 'success', 'warning', 'danger'];

function Badges() {
  return (
    <div>
      <div role="heading" aria-level={2} className="vr-section-title">
        Badges
      </div>
      <div className="vr-body" style={{ marginBottom: 'var(--vr-vsp-sm)' }}>
        Inline labels using semantic color tokens. Vertical padding{' '}
        <code>0.125rem</code> is below <code>--vr-vsp-xs</code> granularity —
        component-local exception.
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--vr-hsp-sm)' }}>
        {BADGE_VARIANTS.map((v) => (
          <span key={v} className={`vr-badge is-${v}`}>
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Tooltips ──────────────────────────────────────────────────────────────────
//
// Implementation: position: absolute + translateX(-50%) on the bubble sibling.
// Opacity toggled by CSS :hover on .vr-tooltip wrapper (defined in components.css).
// Transition timing references --vr-easing-tab-open (wired in components.css).

interface TooltipProps {
  text: string;
  tip: string;
}

function Tooltip({ text, tip }: TooltipProps) {
  return (
    <span className="vr-tooltip">
      <span
        style={{
          textDecoration: 'underline',
          textDecorationStyle: 'dotted',
          cursor: 'help',
          color: 'var(--vr-color-accent)',
        }}
      >
        {text}
      </span>
      <span className="vr-tooltip__bubble" role="tooltip">
        {tip}
      </span>
    </span>
  );
}

function Tooltips() {
  return (
    <div>
      <div role="heading" aria-level={2} className="vr-section-title">
        Tooltips
      </div>
      <div className="vr-body" style={{ marginBottom: 'var(--vr-vsp-sm)' }}>
        Hover over the annotated terms. Bubble styled with <code>--vr-color-surface</code>,{' '}
        <code>--vr-color-muted</code> border, <code>--vr-radius</code> corners.
        Opacity transition uses <code>--vr-easing-tab-open</code>.
      </div>
      <div
        className="vr-card"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--vr-hsp-md)' }}
      >
        <span className="vr-body">
          Token panel adjusts{' '}
          <Tooltip
            text="hsp-md / vsp-md"
            tip="--vr-hsp-md / --vr-vsp-md (default 1rem)"
          />{' '}
          live in the browser.
        </span>
        <span className="vr-body">
          Colors follow the{' '}
          <Tooltip
            text="three-tier strategy"
            tip="palette → semantic → component"
          />{' '}
          design-token model.
        </span>
        <span className="vr-body">
          Easing uses the{' '}
          <Tooltip
            text="easing-tab-open"
            tip="cubic-bezier(0.42, 0, 1, 1)"
          />{' '}
          semantic role.
        </span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function Status() {
  return (
    <div className="vr-page">
      <div>
        <div role="heading" aria-level={1} className="vr-page-title">
          Status surfaces demo
        </div>
        <div className="vr-body">
          Alerts, badges, and tooltips — all driven by semantic color tokens{' '}
          <code>--vr-color-accent</code>, <code>--vr-color-success</code>,{' '}
          <code>--vr-color-warning</code>, <code>--vr-color-danger</code>.
          Toggle any token in the Design Token Panel to update all surfaces simultaneously.
        </div>
      </div>

      <Alerts />
      <Badges />
      <Tooltips />
    </div>
  );
}
