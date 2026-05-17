/*
 * Forms demo page shell — Next.js example (wave 3a #189).
 *
 * Shell only: page heading + intro paragraph. Full form-widget content
 * will be filled in a later wave when the forms demo is ported from
 * examples/zfb-tailwind/pages/components/forms.tsx.
 */

import AppShell from '../../_components/AppShell';

export default function FormsPage() {
  return (
    <AppShell activePath="/components/forms">
      <div className="nx-page">
        <div role="heading" aria-level={1} className="nx-page-title">
          Form controls demo
        </div>
        <p className="nx-body" style={{ marginTop: 'var(--nx-vsp-sm)' }}>
          Demonstrates common form widget types styled entirely through{' '}
          <code>--nx-*</code> design tokens. Inputs consume{' '}
          <code>.nx-input</code> for padding, corners, border, and focus states.
          Buttons use <code>.nx-button</code> with <code>.is-primary</code> and{' '}
          <code>.is-accent</code> modifiers. Toggle any token in the Design
          Token Panel to see every widget update live.
        </p>
      </div>
    </AppShell>
  );
}
