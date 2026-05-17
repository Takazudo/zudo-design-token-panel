/**
 * Data page shell for the Vite + React example.
 *
 * Page heading + intro only. Full data and media demos (data table, media
 * card, stat cards, profile cards, avatar rows) will be added in a later wave.
 *
 * Token consumption:
 *   .vr-page         → layout container
 *   .vr-page-title   → page heading (font-size: --vr-text-page-title)
 *   .vr-body         → intro paragraph (font-size: --vr-text-body)
 *   .vr-helper       → metadata note (font-size: --vr-text-helper)
 */

export function Data() {
  return (
    <div className="vr-page">
      <div>
        <div role="heading" aria-level={1} className="vr-page-title">
          Data &amp; media demo
        </div>
        <div className="vr-body">
          This page will demonstrate a data table with row actions, media
          cards, stat cards, profile cards, and an avatar row. Token map:
          table borders use <code>--vr-color-muted</code>, row hover uses{' '}
          <code>--vr-color-surface</code>, stat numbers read{' '}
          <code>--vr-text-page-title</code>, avatars resize via{' '}
          <code>--vr-size-avatar-sm</code> / <code>--vr-size-avatar-md</code>.
        </div>
        <div className="vr-helper" style={{ marginTop: 'var(--vr-vsp-sm)' }}>
          Full data and media demos coming in a later wave.
        </div>
      </div>
    </div>
  );
}
