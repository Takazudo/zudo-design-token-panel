/**
 * Data page — data and media component demos for the Vite + React example.
 *
 * Renders DataTable, MediaCard, StatCard (×3), ProfileCard (×2), and AvatarRow.
 * Each component is token-driven so panel tweaks (spacing, color, avatar size,
 * etc.) update all instances simultaneously.
 *
 * Token consumption:
 *   .vr-page            → layout container
 *   .vr-page-title      → page heading
 *   .vr-section-title   → section headings
 *   .vr-body            → intro paragraph
 */

import { DataTable } from '../components/data/DataTable';
import { MediaCard } from '../components/data/MediaCard';
import { StatCard } from '../components/data/StatCard';
import { ProfileCard } from '../components/data/ProfileCard';
import { AvatarRow } from '../components/data/AvatarRow';

export function Data() {
  return (
    <div className="vr-page">
      <div>
        <div role="heading" aria-level={1} className="vr-page-title">
          Data &amp; media demo
        </div>
        <div className="vr-body">
          Data table, media cards, stat cards, profile cards, and an avatar row.
          All styled with <code>--vr-*</code> tokens. Change any token in the
          panel to see every component update simultaneously.
        </div>
      </div>

      {/* Data table */}
      <div>
        <div role="heading" aria-level={2} className="vr-section-title">
          Data table
        </div>
        <div className="vr-helper" style={{ marginBottom: 'var(--vr-vsp-sm)' }}>
          Row hover uses <code>--vr-color-surface</code>.
          Borders use <code>--vr-color-muted</code>.
        </div>
        <DataTable />
      </div>

      {/* Media card */}
      <div>
        <div role="heading" aria-level={2} className="vr-section-title">
          Media card
        </div>
        <MediaCard />
      </div>

      {/* Stat cards */}
      <div>
        <div role="heading" aria-level={2} className="vr-section-title">
          Stat cards
        </div>
        <div className="vr-helper" style={{ marginBottom: 'var(--vr-vsp-sm)' }}>
          Large number uses <code>--vr-text-page-title</code> +{' '}
          <code>--vr-color-primary</code>.
        </div>
        <div style={{ display: 'flex', gap: 'var(--vr-hsp-md)', flexWrap: 'wrap' }}>
          <StatCard value="1,248" label="Active users" />
          <StatCard value="94%" label="Uptime" />
          <StatCard value="3.2s" label="Avg. response" />
        </div>
      </div>

      {/* Profile cards */}
      <div>
        <div role="heading" aria-level={2} className="vr-section-title">
          Profile cards
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--vr-vsp-sm)' }}>
          <ProfileCard name="Alice Martin" role="Design Lead" />
          <ProfileCard name="Bob Chen" role="Frontend Engineer" />
        </div>
      </div>

      {/* Avatar row */}
      <div>
        <div role="heading" aria-level={2} className="vr-section-title">
          Avatar row
        </div>
        <div className="vr-helper" style={{ marginBottom: 'var(--vr-vsp-sm)' }}>
          Each avatar reads <code>--vr-size-avatar-sm</code> for dimensions.
          Background colors come from palette slots 1–4.
        </div>
        <AvatarRow />
      </div>
    </div>
  );
}
