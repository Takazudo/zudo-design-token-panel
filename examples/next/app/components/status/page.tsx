/*
 * Status surfaces demo page shell — Next.js example (wave 3a #189).
 *
 * Shell only: page heading + intro paragraph. Full status-surface content
 * will be filled in a later wave when the status demo is ported from
 * examples/zfb-tailwind/pages/components/status.tsx.
 */

import AppShell from '../../_components/AppShell';

export default function StatusPage() {
  return (
    <AppShell activePath="/components/status">
      <div className="nx-page">
        <div role="heading" aria-level={1} className="nx-page-title">
          Status surfaces demo
        </div>
        <p className="nx-body" style={{ marginTop: 'var(--nx-vsp-sm)' }}>
          Status surfaces cover alerts, badges, tags/chips, and tooltips — all
          driven by semantic color tokens. Alerts use <code>.nx-alert</code>{' '}
          with <code>.is-info</code>, <code>.is-success</code>,{' '}
          <code>.is-warning</code>, and <code>.is-danger</code> modifiers.
          Badges use <code>.nx-badge</code>. Tooltips use{' '}
          <code>.nx-tooltip</code> with an opacity transition referencing{' '}
          <code>--nx-easing-tab-open</code>. Toggle any token in the Design
          Token Panel to see every surface update live.
        </p>
      </div>
    </AppShell>
  );
}
