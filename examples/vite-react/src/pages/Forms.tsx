/**
 * Forms page shell for the Vite + React example.
 *
 * Page heading + intro only. Full form widget demos will be added in a
 * later wave; this shell establishes the route and the vocabulary.
 *
 * Token consumption:
 *   .vr-page         → layout container
 *   .vr-page-title   → page heading (font-size: --vr-text-page-title)
 *   .vr-body         → intro paragraph (font-size: --vr-text-body)
 *   .vr-helper       → metadata note (font-size: --vr-text-helper)
 */

export function Forms() {
  return (
    <div className="vr-page">
      <div>
        <div role="heading" aria-level={1} className="vr-page-title">
          Form controls demo
        </div>
        <div className="vr-body">
          This page will demonstrate all common form widget types with every
          colour, spacing, and shape styled through the{' '}
          <code>--vr-*</code> design token vocabulary. Inputs, selects,
          textareas, checkboxes, radio groups, range sliders, and submit
          buttons — each visually driven by a token so the Design Token Panel
          can update them live.
        </div>
        <div className="vr-helper" style={{ marginTop: 'var(--vr-vsp-sm)' }}>
          Full widget demos coming in a later wave. Use the panel (topbar
          button) to tweak tokens and observe the page update live.
        </div>
      </div>
    </div>
  );
}
