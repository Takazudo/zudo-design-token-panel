/*
 * Data table demo page shell — Next.js example (wave 3a #189).
 *
 * Shell only: page heading + intro paragraph. Full data-table content
 * will be filled in a later wave when the data demo is ported from
 * examples/zfb-tailwind/pages/components/data.tsx.
 */

import AppShell from '../../_components/AppShell';

export default function DataPage() {
  return (
    <AppShell activePath="/components/data">
      <div className="nx-page">
        <div role="heading" aria-level={1} className="nx-page-title">
          Data table demo
        </div>
        <p className="nx-body" style={{ marginTop: 'var(--nx-vsp-sm)' }}>
          Data table demo styled through the frozen <code>nx-*</code> vocabulary.
          The table uses <code>.nx-table</code> for collapsed borders, cell
          padding from <code>--nx-hsp-sm</code>, and header styling with{' '}
          <code>--nx-code-bg</code>. Toggle any token in the Design Token Panel
          to see the table update live.
        </p>
      </div>
    </AppShell>
  );
}
