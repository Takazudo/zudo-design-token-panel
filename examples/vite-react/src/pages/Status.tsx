/**
 * Status page shell for the Vite + React example.
 *
 * Page heading + intro only. Full status surface demos (alerts, badges,
 * tags, tooltips) will be added in a later wave.
 *
 * Token consumption:
 *   .vr-page         → layout container
 *   .vr-page-title   → page heading (font-size: --vr-text-page-title)
 *   .vr-body         → intro paragraph (font-size: --vr-text-body)
 *   .vr-helper       → metadata note (font-size: --vr-text-helper)
 */

export function Status() {
  return (
    <div className="vr-page">
      <div>
        <div role="heading" aria-level={1} className="vr-page-title">
          Status surfaces demo
        </div>
        <div className="vr-body">
          This page will demonstrate alert callouts, badges, tags/chips, and
          tooltips. Each surface uses semantic color tokens —{' '}
          <code>--vr-color-accent</code>, <code>--vr-color-success</code>,{' '}
          <code>--vr-color-warning</code>, <code>--vr-color-danger</code> — so
          the Design Token Panel can update all status surfaces simultaneously.
        </div>
        <div className="vr-helper" style={{ marginTop: 'var(--vr-vsp-sm)' }}>
          Full status surface demos coming in a later wave.
        </div>
      </div>
    </div>
  );
}
