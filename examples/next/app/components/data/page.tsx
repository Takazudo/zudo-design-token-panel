/*
 * Data components demo page — Next.js example (#192).
 *
 * Renders all 5 data components: StatCard, ProfileCard, MediaCard, AvatarRow,
 * DataTable — all server components styled via the frozen nx-* vocabulary.
 */

import AppShell from '../../_components/AppShell';
import StatCard from '../../_components/data/StatCard';
import ProfileCard from '../../_components/data/ProfileCard';
import MediaCard from '../../_components/data/MediaCard';
import AvatarRow from '../../_components/data/AvatarRow';
import DataTable from '../../_components/data/DataTable';

export default function DataPage() {
  return (
    <AppShell activePath="/components/data">
      <div className="nx-page">
        <div role="heading" aria-level={1} className="nx-page-title">
          Data components demo
        </div>
        <div className="nx-body" style={{ marginTop: 'var(--nx-vsp-sm)' }}>
          Data display components styled through the frozen <code>nx-*</code>{' '}
          vocabulary. Toggle any token in the Design Token Panel to see all
          components update live.
        </div>

        {/* ── Stat cards ───────────────────────────────────────────────── */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nx-vsp-sm)', marginTop: 'var(--nx-vsp-lg)' }}>
          <div role="heading" aria-level={2} className="nx-section-title">
            Stat cards
          </div>
          <div className="nx-helper">
            Big number: <code>.nx-stat-card__value</code> &#8594;{' '}
            <code>--nx-text-page-title</code> + <code>--nx-color-primary</code>.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--nx-hsp-md)' }}>
            <StatCard value="1,284" label="Active users" />
            <StatCard value="94%" label="Uptime" />
            <StatCard value="32ms" label="Avg latency" />
          </div>
        </section>

        {/* ── Profile cards ────────────────────────────────────────────── */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nx-vsp-sm)', marginTop: 'var(--nx-vsp-lg)' }}>
          <div role="heading" aria-level={2} className="nx-section-title">
            Profile cards
          </div>
          <div className="nx-helper">
            Avatar: <code>.nx-profile-card__avatar</code> &#8594;{' '}
            <code>--nx-size-avatar-md</code> + <code>--nx-color-accent</code>.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nx-vsp-sm)', maxWidth: '28rem' }}>
            <ProfileCard name="Alice Martin" role="Admin" />
            <ProfileCard name="Bob Chen" role="Editor" />
          </div>
        </section>

        {/* ── Media card ───────────────────────────────────────────────── */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nx-vsp-sm)', marginTop: 'var(--nx-vsp-lg)' }}>
          <div role="heading" aria-level={2} className="nx-section-title">
            Media card
          </div>
          <div className="nx-helper">
            Thumbnail: <code>.nx-media-card__thumb</code> with 16:9 aspect ratio.
            Width capped at <code>24rem</code> (component-local constraint).
          </div>
          <MediaCard />
        </section>

        {/* ── Avatar row ───────────────────────────────────────────────── */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nx-vsp-sm)', marginTop: 'var(--nx-vsp-lg)' }}>
          <div role="heading" aria-level={2} className="nx-section-title">
            Avatar row
          </div>
          <div className="nx-helper">
            Each avatar reads background from <code>var(--nx-palette-N)</code>{' '}
            (inline style — runtime index). Size from{' '}
            <code>--nx-size-avatar-sm</code>.
          </div>
          <AvatarRow />
        </section>

        {/* ── Data table ───────────────────────────────────────────────── */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--nx-vsp-sm)', marginTop: 'var(--nx-vsp-lg)' }}>
          <div role="heading" aria-level={2} className="nx-section-title">
            Data table
          </div>
          <div className="nx-helper">
            <code>.nx-table</code> — collapsed borders, cell padding from{' '}
            <code>--nx-hsp-xs/sm</code>, header from <code>--nx-code-bg</code>.
          </div>
          <DataTable />
        </section>
      </div>
    </AppShell>
  );
}
