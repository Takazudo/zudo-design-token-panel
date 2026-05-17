/*
 * Widgets demo page — Next.js example (#192).
 *
 * Renders Tabs (client), Accordion (server native <details>), and Modal (client).
 * Each widget uses semantic easing tokens from --nx-easing-* so the Panel's
 * Easing tab updates motion live.
 */

import AppShell from '../../_components/AppShell';
import TabsDemo from '../../_components/widgets/Tabs';
import AccordionDemo from '../../_components/widgets/Accordion';
import ModalDemo from '../../_components/widgets/Modal';

export default function WidgetsPage() {
  return (
    <AppShell activePath="/components/widgets">
      <div className="nx-page">
        <div role="heading" aria-level={1} className="nx-page-title">
          Interactive Widgets
        </div>
        <div className="nx-body" style={{ marginTop: 'var(--nx-vsp-sm)' }}>
          Each widget uses a semantic easing token from the Easing tab. Open
          the panel and change an easing value to see motion update live.
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nx-vsp-sm)', marginTop: 'var(--nx-vsp-lg)' }}>
          <div role="heading" aria-level={2} className="nx-section-title">
            Tabs
          </div>
          <div className="nx-helper">
            Active indicator slides using <code>easing-tab-open</code>{' '}
            (&#8594;&nbsp;<code>--nx-easing-tab-open</code>).
          </div>
          <div style={{
            background: 'var(--nx-color-surface)',
            padding: 'var(--nx-vsp-md) var(--nx-hsp-md)',
            borderRadius: 'var(--nx-radius)',
            border: '1px solid var(--nx-color-muted)',
          }}>
            <TabsDemo />
          </div>
        </section>

        {/* ── Accordion ────────────────────────────────────────────────── */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nx-vsp-sm)', marginTop: 'var(--nx-vsp-lg)' }}>
          <div role="heading" aria-level={2} className="nx-section-title">
            Accordion
          </div>
          <div className="nx-helper">
            Height transitions use <code>easing-tab-open</code> /{' '}
            <code>easing-tab-close</code> for open/close respectively
            (progressive enhancement, Chrome 131+).
          </div>
          <AccordionDemo />
        </section>

        {/* ── Modal ────────────────────────────────────────────────────── */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nx-vsp-sm)', marginTop: 'var(--nx-vsp-lg)' }}>
          <div role="heading" aria-level={2} className="nx-section-title">
            Modal
          </div>
          <div className="nx-helper">
            Fade-and-scale animation uses <code>easing-modal</code>{' '}
            (&#8594;&nbsp;<code>--nx-easing-modal</code>). Close via button or{' '}
            <kbd>Escape</kbd>.
          </div>
          <div>
            <ModalDemo />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
