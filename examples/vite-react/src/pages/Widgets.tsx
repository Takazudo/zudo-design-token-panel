/**
 * Widgets page shell for the Vite + React example.
 *
 * Page heading + intro only. Full interactive widget demos (tabs, accordion,
 * modal) will be added in a later wave.
 *
 * Token consumption:
 *   .vr-page         → layout container
 *   .vr-page-title   → page heading (font-size: --vr-text-page-title)
 *   .vr-body         → intro paragraph (font-size: --vr-text-body)
 *   .vr-helper       → metadata note (font-size: --vr-text-helper)
 */

export function Widgets() {
  return (
    <div className="vr-page">
      <div>
        <div role="heading" aria-level={1} className="vr-page-title">
          Interactive widgets
        </div>
        <div className="vr-body">
          This page will demonstrate tabs with a sliding indicator, an
          accordion with height transitions, and a modal dialog — each widget
          using a semantic easing token from the Easing tab. Open the panel
          and change an easing value to see motion update live.
        </div>
        <div className="vr-helper" style={{ marginTop: 'var(--vr-vsp-sm)' }}>
          Full widget demos coming in a later wave. Easing tokens:{' '}
          <code>--vr-easing-tab-open</code>, <code>--vr-easing-tab-close</code>,{' '}
          <code>--vr-easing-modal</code>.
        </div>
      </div>
    </div>
  );
}
