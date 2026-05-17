/**
 * Widgets page — interactive widget demos for the Vite + React example.
 *
 * Renders Tabs (sliding indicator), Accordion (height transition), and
 * Modal (dialog open/close animation). Each widget consumes semantic
 * easing tokens from the Easing tab so panel tweaks are visible live.
 *
 * Token consumption:
 *   .vr-page            → layout container
 *   .vr-page-title      → page heading
 *   .vr-section-title   → widget section headings
 *   .vr-body            → intro paragraph
 *   .vr-card            → widget demo card wrapper
 */

import { Tabs } from '../components/widgets/Tabs';
import { Accordion } from '../components/widgets/Accordion';
import { Modal } from '../components/widgets/Modal';

export function Widgets() {
  return (
    <div className="vr-page">
      <div>
        <div role="heading" aria-level={1} className="vr-page-title">
          Interactive widgets
        </div>
        <div className="vr-body">
          Tabs with a sliding indicator, an accordion with height transitions,
          and a modal dialog — each widget driven by semantic easing tokens.
          Open the panel and change an easing value to see motion update live.
        </div>
      </div>

      {/* Tabs demo */}
      <div>
        <div role="heading" aria-level={2} className="vr-section-title">
          Tabs
        </div>
        <div className="vr-helper" style={{ marginBottom: 'var(--vr-vsp-sm)' }}>
          Active indicator slides via <code>--vr-easing-tab-open</code>.
        </div>
        <div className="vr-card">
          <Tabs />
        </div>
      </div>

      {/* Accordion demo */}
      <div>
        <div role="heading" aria-level={2} className="vr-section-title">
          Accordion
        </div>
        <div className="vr-helper" style={{ marginBottom: 'var(--vr-vsp-sm)' }}>
          Height transition uses <code>--vr-easing-tab-open</code> (open) and{' '}
          <code>--vr-easing-tab-close</code> (close). Progressive enhancement —
          Chrome 131+.
        </div>
        <Accordion />
      </div>

      {/* Modal demo */}
      <div>
        <div role="heading" aria-level={2} className="vr-section-title">
          Modal
        </div>
        <div className="vr-helper" style={{ marginBottom: 'var(--vr-vsp-sm)' }}>
          Open/close animation uses <code>--vr-easing-modal</code>.
        </div>
        <Modal />
      </div>
    </div>
  );
}
