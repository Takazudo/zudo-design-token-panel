/*
 * Status surfaces demo page — Next.js example (#192).
 *
 * Covers alerts, badges, and tooltips — all driven by semantic color tokens.
 * Token-to-class reference:
 *   .nx-alert + .is-info/success/warning/danger   → alert variants
 *   .nx-badge + .is-success/warning/danger         → filled badge variants
 *   .nx-badge.is-outlined + .is-*                 → outlined badge variants
 *   .nx-tooltip / .nx-tooltip__bubble             → hover tooltip
 */

import AppShell from '../../_components/AppShell';

// ── Alerts ────────────────────────────────────────────────────────────────────

function Alerts() {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nx-vsp-md)' }}>
      <div role="heading" aria-level={2} className="nx-section-title">
        Alerts / callouts
      </div>
      <div className="nx-body">
        Each variant uses a semantic color token for background and border.
        Token contract: <code>.is-info</code> / <code>.is-success</code> /{' '}
        <code>.is-warning</code> / <code>.is-danger</code> with{' '}
        <code>--nx-bg</code> text. Padding: <code>--nx-vsp-md</code> /{' '}
        <code>--nx-hsp-md</code>. Corners: <code>--nx-radius</code>.
      </div>

      <div className="nx-alert is-info">
        <strong>Info:</strong> uses <code>--nx-color-accent</code>.
      </div>
      <div className="nx-alert is-success">
        <strong>Success:</strong> uses <code>--nx-color-success</code>.
      </div>
      <div className="nx-alert is-warning">
        <strong>Warning:</strong> uses <code>--nx-color-warning</code>.
      </div>
      <div className="nx-alert is-danger">
        <strong>Danger:</strong> uses <code>--nx-color-danger</code>.
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
  const isInfo = color === 'accent';
  const colorClass = isInfo ? '' : ` is-${color}`;
  if (variant === 'filled') {
    return (
      <span className={`nx-badge${colorClass}`}>{label}</span>
    );
  }
  return (
    <span className={`nx-badge is-outlined${colorClass}`}>{label}</span>
  );
}

function Badges() {
  const colors: BadgeColor[] = ['accent', 'success', 'warning', 'danger'];

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nx-vsp-md)' }}>
      <div role="heading" aria-level={2} className="nx-section-title">
        Badges
      </div>
      <div className="nx-body">
        Filled badges: <code>.nx-badge</code> + color modifier.
        Outlined: <code>.nx-badge.is-outlined</code> + color modifier.
        Both use <code>--nx-hsp-xs</code> horizontal padding and{' '}
        <code>--nx-text-helper</code> font size.
      </div>

      <div>
        <div className="nx-helper" style={{ marginBottom: 'var(--nx-vsp-xs)' }}>Filled</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--nx-hsp-sm)' }}>
          {colors.map((c) => (
            <Badge key={`filled-${c}`} color={c} variant="filled" label={c} />
          ))}
        </div>
      </div>

      <div>
        <div className="nx-helper" style={{ marginBottom: 'var(--nx-vsp-xs)' }}>Outlined</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--nx-hsp-sm)' }}>
          {colors.map((c) => (
            <Badge key={`outlined-${c}`} color={c} variant="outlined" label={c} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Tooltips ──────────────────────────────────────────────────────────────────

interface TooltipProps {
  text: string;
  tip: string;
}

function Tooltip({ text, tip }: TooltipProps) {
  return (
    <span className="nx-tooltip">
      <span style={{ textDecoration: 'underline', textDecorationStyle: 'dotted', cursor: 'help', color: 'var(--nx-color-accent)' }}>
        {text}
      </span>
      {/*
        Fallback tooltip bubble — position: absolute + translateX(-50%) centres the
        bubble over the trigger. Opacity starts at 0; .nx-tooltip:hover reveals it.
        Transition timing uses --nx-easing-tab-open.
      */}
      <span className="nx-tooltip__bubble" role="tooltip">
        {tip}
      </span>
    </span>
  );
}

function Tooltips() {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nx-vsp-md)' }}>
      <div role="heading" aria-level={2} className="nx-section-title">
        Tooltips
      </div>
      <div className="nx-body">
        Hover over the annotated terms. Bubble: <code>.nx-tooltip__bubble</code>{' '}
        uses <code>--nx-color-surface</code>, <code>--nx-color-muted</code> border,{' '}
        <code>--nx-radius</code>. Opacity transition references{' '}
        <code>--nx-easing-tab-open</code>.
        Implementation: <code>position: absolute</code> with{' '}
        <code>translateX(-50%)</code> on the sibling bubble span.
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--nx-hsp-lg) var(--nx-vsp-lg)',
        background: 'var(--nx-color-surface)',
        padding: 'var(--nx-vsp-md) var(--nx-hsp-md)',
        borderRadius: 'var(--nx-radius)',
        border: '1px solid var(--nx-color-muted)',
        fontSize: 'var(--nx-text-body)',
        color: 'var(--nx-fg)',
      }}>
        <span>
          Token panel adjusts{' '}
          <Tooltip text="hsp-md / vsp-md" tip="--nx-hsp-md / --nx-vsp-md (default 1rem)" />{' '}
          live in the browser.
        </span>
        <span>
          Colors follow the{' '}
          <Tooltip text="three-tier strategy" tip="palette &#8594; semantic &#8594; component" />{' '}
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
    <AppShell activePath="/components/status">
      <div className="nx-page">
        <div role="heading" aria-level={1} className="nx-page-title">
          Status surfaces demo
        </div>
        <div className="nx-body" style={{ marginTop: 'var(--nx-vsp-sm)' }}>
          Status surfaces cover alerts, badges, and tooltips — all driven by
          semantic color tokens <code>--nx-color-accent</code>,{' '}
          <code>--nx-color-success</code>, <code>--nx-color-warning</code>,{' '}
          <code>--nx-color-danger</code>. Toggle any in the Design Token Panel
          to see every surface update live.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nx-vsp-lg)', marginTop: 'var(--nx-vsp-lg)' }}>
          <Alerts />
          <Badges />
          <Tooltips />
        </div>
      </div>
    </AppShell>
  );
}
