/*
 * Widgets demo page shell — Next.js example (wave 3a #189).
 *
 * Shell only: page heading + intro paragraph. Full widget content
 * will be filled in a later wave when the widgets demo is ported from
 * examples/zfb-tailwind/pages/components/widgets.tsx.
 */

import AppShell from '../../_components/AppShell';

export default function WidgetsPage() {
  return (
    <AppShell activePath="/components/widgets">
      <div className="nx-page">
        <div role="heading" aria-level={1} className="nx-page-title">
          Widgets demo
        </div>
        <p className="nx-body" style={{ marginTop: 'var(--nx-vsp-sm)' }}>
          Interactive widgets demo covering tabs, accordions, modals, and
          avatars — all styled through the frozen <code>nx-*</code> vocabulary.
          Tabs use <code>.nx-tabs</code>, <code>.nx-tabs__list</code>,{' '}
          <code>.nx-tabs__tab</code>, and <code>.nx-tabs__indicator</code>.
          Accordions use <code>.nx-accordion</code>. Modals use{' '}
          <code>.nx-modal</code>. Avatars use <code>.nx-avatar</code> with{' '}
          <code>.sm</code> and <code>.md</code> modifiers. Toggle any token
          in the Design Token Panel to see every widget update live.
        </p>
      </div>
    </AppShell>
  );
}
